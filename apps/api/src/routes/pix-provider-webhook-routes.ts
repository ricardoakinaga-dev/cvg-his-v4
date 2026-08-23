import type { IncomingMessage, ServerResponse } from 'node:http';

import { AppError } from '@cvg-his-v2/shared-errors';
import { getClientIp } from './auth-routes.js';
import {
  readRawRequestBody,
  RawRequestBodyAbortedError,
  RawRequestBodyStreamError,
  RawRequestBodyTooLargeError
} from '../helpers/raw-request-body.js';
import {
  parsePixProviderWebhookPayload,
  PixProviderWebhookPayloadValidationError,
  type PixProviderWebhookClaims
} from '../pix-provider-webhook-payload.js';
import {
  PixProviderWebhookAuthenticationError,
  verifyPixProviderWebhook,
  type PixProviderWebhookKey
} from '../pix-provider-webhook-verifier.js';
import type { PixProviderEventIngressRepository } from '../pix-provider-event-ingress-repository.js';

export type { PixProviderEventIngressRepository } from '../pix-provider-event-ingress-repository.js';

export const PIX_PROVIDER_WEBHOOK_PATH = '/webhooks/pix/synthetic/v1';
export const PIX_PROVIDER_WEBHOOK_MAX_BODY_BYTES = 65_536;

export interface PixProviderWebhookRateLimiter {
  check(input: { readonly ip: string; readonly route: string }): Promise<{
    readonly blocked: boolean;
    readonly limit: number;
    readonly remaining: number;
    readonly reset: number;
    readonly retryAfterMs: number;
  }>;
}

export interface PixProviderWebhookRouteHandlers {
  readonly keyring: ReadonlyMap<string, PixProviderWebhookKey>;
  readonly repository?: PixProviderEventIngressRepository;
  readonly rateLimiter?: PixProviderWebhookRateLimiter;
  readonly trustedProxyCidrs?: readonly string[];
  readonly nowSeconds?: () => number;
  readonly maxAgeSeconds?: number;
}

function sendJson(response: ServerResponse, statusCode: number, body: unknown): true {
  response.statusCode = statusCode;
  response.setHeader('content-type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(body));
  return true;
}

function sendInvalidAuthentication(response: ServerResponse, correlationId: string): true {
  return sendJson(response, 401, {
    code: 'PIX_WEBHOOK_UNAUTHORIZED',
    message: 'Invalid PIX webhook authentication',
    correlationId
  });
}

function sendInvalidPayload(response: ServerResponse, correlationId: string): true {
  return sendJson(response, 400, {
    code: 'PIX_WEBHOOK_INVALID_PAYLOAD',
    message: 'Invalid PIX webhook payload',
    correlationId
  });
}

function sendInvalidBody(response: ServerResponse, correlationId: string): true {
  return sendJson(response, 400, {
    code: 'PIX_WEBHOOK_INVALID_REQUEST',
    message: 'Invalid PIX webhook request',
    correlationId
  });
}

function sendUnavailable(response: ServerResponse, correlationId: string): true {
  return sendJson(response, 503, {
    code: 'PIX_WEBHOOK_UNAVAILABLE',
    message: 'PIX webhook ingestion is unavailable',
    correlationId
  });
}

function sendConflict(response: ServerResponse, correlationId: string): true {
  return sendJson(response, 409, {
    code: 'PIX_WEBHOOK_CONFLICT',
    message: 'PIX webhook cannot be accepted',
    correlationId
  });
}

function sendRateLimited(
  response: ServerResponse,
  correlationId: string,
  info: {
    readonly limit: number;
    readonly remaining: number;
    readonly reset: number;
    readonly retryAfterMs: number;
  }
): true {
  response.setHeader('X-RateLimit-Limit', String(info.limit));
  response.setHeader('X-RateLimit-Remaining', String(info.remaining));
  response.setHeader('X-RateLimit-Reset', String(info.reset));
  response.setHeader('Retry-After', String(Math.max(1, Math.ceil(info.retryAfterMs / 1_000))));
  return sendJson(response, 429, {
    code: 'RATE_LIMITED',
    message: 'Too many PIX webhook requests. Please try again later.',
    retryAfterMs: info.retryAfterMs,
    correlationId
  });
}

function isProductionLike(environment: string): boolean {
  return ['production', 'prod', 'staging', 'stage'].includes(environment);
}

/**
 * Public synthetic-provider callback. This handler deliberately runs before
 * tenant resolution and the generic command/idempotency wrapper: the only
 * accepted authority is the authenticated provider key bound to an account.
 */
export async function handlePixProviderWebhookRoutes(
  pathname: string,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  handlers: PixProviderWebhookRouteHandlers
): Promise<boolean> {
  if (pathname !== PIX_PROVIDER_WEBHOOK_PATH) return false;

  if (request.method !== 'POST') {
    response.setHeader('allow', 'POST');
    return sendJson(response, 405, {
      code: 'METHOD_NOT_ALLOWED',
      message: 'Only POST is supported for the PIX provider webhook',
      correlationId
    });
  }

  const nowSeconds = handlers.nowSeconds ?? (() => Math.floor(Date.now() / 1_000));
  const rateLimit = handlers.rateLimiter;
  if (rateLimit) {
    let info;
    try {
      info = await rateLimit.check({
        ip: getClientIp(request, handlers.trustedProxyCidrs),
        route: `POST ${PIX_PROVIDER_WEBHOOK_PATH}`
      });
    } catch {
      return sendUnavailable(response, correlationId);
    }
    if (info.blocked) return sendRateLimited(response, correlationId, info);
    response.setHeader('X-RateLimit-Limit', String(info.limit));
    response.setHeader('X-RateLimit-Remaining', String(info.remaining));
    response.setHeader('X-RateLimit-Reset', String(info.reset));
  }

  let rawBody: Buffer;
  try {
    rawBody = await readRawRequestBody(request, PIX_PROVIDER_WEBHOOK_MAX_BODY_BYTES);
  } catch (error) {
    if (error instanceof RawRequestBodyTooLargeError) {
      return sendJson(response, 413, {
        code: 'PIX_WEBHOOK_BODY_TOO_LARGE',
        message: 'PIX webhook body exceeds the maximum size',
        correlationId
      });
    }
    if (error instanceof RawRequestBodyAbortedError || error instanceof RawRequestBodyStreamError) {
      return sendInvalidBody(response, correlationId);
    }
    return sendUnavailable(response, correlationId);
  }

  let verification;
  try {
    verification = verifyPixProviderWebhook(
      { headers: request.headers, rawHeaders: request.rawHeaders, rawBody },
      {
        keyring: handlers.keyring,
        nowSeconds,
        maxAgeSeconds: handlers.maxAgeSeconds
      }
    );
  } catch (error) {
    if (error instanceof PixProviderWebhookAuthenticationError) {
      return sendInvalidAuthentication(response, correlationId);
    }
    return sendUnavailable(response, correlationId);
  }

  let claims: PixProviderWebhookClaims;
  try {
    claims = parsePixProviderWebhookPayload(rawBody, verification.accountId, {
      nowSeconds,
      maxAgeSeconds: handlers.maxAgeSeconds
    });
  } catch (error) {
    if (error instanceof PixProviderWebhookPayloadValidationError) {
      return sendInvalidPayload(response, correlationId);
    }
    return sendUnavailable(response, correlationId);
  }

  if (!handlers.repository) {
    // A production-like process must never ACK a callback it cannot persist.
    return sendUnavailable(response, correlationId);
  }

  try {
    await handlers.repository.persist({
      rawBody,
      claims,
      providerEventId: verification.eventId,
      correlationId: correlationId.slice(0, 255),
      receivedAt: new Date().toISOString()
    });
  } catch (error) {
    if (error instanceof AppError) {
      if (error.statusCode === 409) return sendConflict(response, correlationId);
      if (error.statusCode === 400) return sendInvalidPayload(response, correlationId);
    }
    return sendUnavailable(response, correlationId);
  }

  // Keep receipt/delivery identifiers internal. The provider only needs an
  // authenticated acceptance signal and can retry safely using its event ID.
  return sendJson(response, 202, { accepted: true });
}

export function assertPixProviderWebhookReadiness(options: {
  readonly environment: string;
  readonly syntheticEnabled?: boolean;
  readonly keyring?: ReadonlyMap<string, PixProviderWebhookKey>;
  readonly repository?: PixProviderEventIngressRepository;
}): void {
  if (isProductionLike(options.environment) && options.syntheticEnabled === true) {
    throw new Error('Production-like API cannot mount the synthetic PIX webhook capability');
  }
  if (!options.syntheticEnabled) return;
  if (!options.keyring || options.keyring.size === 0 || !options.repository) {
    throw new Error(
      'Synthetic PIX webhook capability requires a configured keyring and durable ingress repository'
    );
  }
}
