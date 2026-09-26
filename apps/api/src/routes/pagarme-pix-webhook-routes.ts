import type { IncomingMessage, ServerResponse } from 'node:http';

import { AppError } from '@cvg-his-v2/shared-errors';

import { getClientIp } from './auth-routes.js';
import {
  readRawRequestBody,
  RawRequestBodyTooLargeError
} from '../helpers/raw-request-body.js';
import { canonicalizePixProviderWebhookClaims } from '../pix-provider-event-fingerprints.js';
import type { PixProviderEventIngressRepository } from '../pix-provider-event-ingress-repository.js';
import type { PixProviderWebhookClaims } from '../pix-provider-webhook-payload.js';
import {
  PagarMePixChargeLookupError,
  type PagarMePixChargeClient
} from '../pagarme-pix-charge-client.js';
import type { PixProviderWebhookRateLimiter } from './pix-provider-webhook-routes.js';

export const PAGARME_PIX_WEBHOOK_PATH = '/webhooks/pix/pagarme/v1';
const MAX_BODY_BYTES = 65_536;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Metadata written on the charge by the worker dispatcher at creation time. */
export const PAGARME_ACCOUNT_METADATA_KEY = 'cvg_account_id';
export const PAGARME_ATTEMPT_METADATA_KEY = 'cvg_attempt_id';

export interface PagarMePixWebhookRouteHandlers {
  readonly client: Pick<PagarMePixChargeClient, 'getCharge'>;
  readonly repository: PixProviderEventIngressRepository;
  readonly rateLimiter?: PixProviderWebhookRateLimiter;
  readonly trustedProxyCidrs?: readonly string[];
}

function sendJson(response: ServerResponse, statusCode: number, body: unknown): true {
  response.statusCode = statusCode;
  response.setHeader('content-type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(body));
  return true;
}

/** Pagar.me notifications carry the charge id in `data.id` (or `id`). */
export function extractPagarMeChargeId(rawBody: Buffer): string | null {
  try {
    const parsed = JSON.parse(rawBody.toString('utf8')) as Record<string, unknown>;
    const data = parsed?.data as Record<string, unknown> | undefined;
    const candidate = typeof data?.id === 'string' ? data.id : parsed?.id;
    return typeof candidate === 'string' && candidate.length > 0 && candidate.length <= 255
      ? candidate
      : null;
  } catch {
    return null;
  }
}

/**
 * Public, unauthenticated endpoint. The body is only a hint: the charge is
 * re-read from Pagar.me with this API's credentials, and only a paid charge
 * carrying our account/attempt metadata becomes a provider receipt. Amount,
 * provider transaction id and attempt binding are re-checked by settlement.
 */
export async function handlePagarMePixWebhookRoutes(
  pathname: string,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  handlers: PagarMePixWebhookRouteHandlers
): Promise<boolean> {
  if (pathname !== PAGARME_PIX_WEBHOOK_PATH) return false;
  if (request.method !== 'POST') {
    response.setHeader('allow', 'POST');
    return sendJson(response, 405, { code: 'METHOD_NOT_ALLOWED', correlationId });
  }

  if (handlers.rateLimiter) {
    let info;
    try {
      info = await handlers.rateLimiter.check({
        ip: getClientIp(request, handlers.trustedProxyCidrs),
        route: `POST ${PAGARME_PIX_WEBHOOK_PATH}`
      });
    } catch {
      return sendJson(response, 503, { code: 'PIX_WEBHOOK_UNAVAILABLE', correlationId });
    }
    if (info.blocked) {
      response.setHeader('retry-after', String(Math.max(1, Math.ceil(info.retryAfterMs / 1_000))));
      return sendJson(response, 429, { code: 'PIX_WEBHOOK_RATE_LIMITED', correlationId });
    }
  }

  let rawBody: Buffer;
  try {
    rawBody = await readRawRequestBody(request, MAX_BODY_BYTES);
  } catch (error) {
    return sendJson(response, error instanceof RawRequestBodyTooLargeError ? 413 : 400, {
      code: 'PIX_WEBHOOK_INVALID_REQUEST',
      correlationId
    });
  }
  const chargeId = extractPagarMeChargeId(rawBody);
  if (!chargeId) {
    return sendJson(response, 400, { code: 'PIX_WEBHOOK_INVALID_REQUEST', correlationId });
  }

  let charge;
  try {
    charge = await handlers.client.getCharge(chargeId);
  } catch (error) {
    // 502 lets the provider retry the notification later.
    const retryable = error instanceof PagarMePixChargeLookupError ? error.retryable : true;
    return sendJson(response, retryable ? 502 : 422, {
      code: 'PIX_WEBHOOK_PROVIDER_LOOKUP_FAILED',
      correlationId
    });
  }
  // Unknown or unpaid charges are acknowledged without effect, and without
  // telling the caller whether the id exists.
  if (!charge || charge.status !== 'paid') {
    return sendJson(response, 202, { status: 'ignored', correlationId });
  }

  const accountId = charge.metadata[PAGARME_ACCOUNT_METADATA_KEY];
  const attemptId = charge.metadata[PAGARME_ATTEMPT_METADATA_KEY];
  const confirmedAt = charge.paidAt ? new Date(charge.paidAt) : null;
  if (
    typeof accountId !== 'string' ||
    !UUID_PATTERN.test(accountId) ||
    typeof attemptId !== 'string' ||
    !UUID_PATTERN.test(attemptId) ||
    charge.amountCents === null ||
    charge.amountCents < 1 ||
    !confirmedAt ||
    !Number.isFinite(confirmedAt.getTime())
  ) {
    return sendJson(response, 202, { status: 'ignored', correlationId });
  }

  const claims: PixProviderWebhookClaims = {
    type: 'pix.payment.confirmed.v1',
    accountId: accountId.toLowerCase(),
    attemptId: attemptId.toLowerCase(),
    providerTransactionId: charge.id,
    amountCents: charge.amountCents,
    currency: 'BRL',
    confirmedAt: confirmedAt.toISOString()
  };
  try {
    const result = await handlers.repository.persist({
      provider: 'pagarme',
      rawBody: Buffer.from(canonicalizePixProviderWebhookClaims(claims), 'utf8'),
      claims,
      providerEventId: `pagarme-paid-${charge.id}`.slice(0, 255),
      correlationId
    });
    return sendJson(response, 202, { status: result.status, correlationId });
  } catch (error) {
    if (error instanceof AppError && error.statusCode === 409) {
      return sendJson(response, 409, { code: 'PIX_WEBHOOK_CONFLICT', correlationId });
    }
    if (error instanceof AppError && error.statusCode === 400) {
      return sendJson(response, 202, { status: 'ignored', correlationId });
    }
    return sendJson(response, 503, { code: 'PIX_WEBHOOK_UNAVAILABLE', correlationId });
  }
}
