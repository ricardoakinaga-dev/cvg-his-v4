import type { IncomingMessage, ServerResponse } from 'node:http';

import { AppError, ValidationError } from '@cvg-his-v2/shared-errors';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';

import type { RequestEncounterPixPaymentCommand } from '../commands/request-encounter-pix-payment.js';
import type {
  EncounterPixPaymentAttemptRecord,
  EncounterPixPaymentAttemptRepository,
  EncounterPixPaymentProviderKey
} from '../encounter-pix-payment-attempt-repository.js';
import { readJsonBody } from '../helpers/common.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f-\u009f]/u;
const CREATE_PATH = /^\/encounters\/([^/]+)\/payments\/pix-attempts$/;
const GET_PATH = /^\/payments\/pix-attempts\/([^/]+)$/;

export interface PixPaymentAttemptRouteHandlers {
  readonly command: Pick<RequestEncounterPixPaymentCommand, 'execute'>;
  readonly repository: Pick<EncounterPixPaymentAttemptRepository, 'findById'>;
  readonly providerKey: EncounterPixPaymentProviderKey;
  readonly rateLimiter?: PixPaymentAttemptRateLimiter;
  readonly requirePrincipal: (
    request: IncomingMessage,
    permissionCode: string
  ) => AuthenticatedPrincipal | PromiseLike<AuthenticatedPrincipal>;
}

export interface PixPaymentAttemptRateLimiter {
  check(input: {
    readonly accountId: string;
    readonly userId: string;
    readonly route: string;
  }): Promise<{
    readonly blocked: boolean;
    readonly limit: number;
    readonly remaining: number;
    readonly reset: number;
    readonly retryAfterMs: number;
  }>;
}

function requireUuid(value: string, field: string): string {
  if (!UUID_PATTERN.test(value)) throw new ValidationError(`${field} must be a valid UUID`);
  return value;
}

export function requirePixPaymentAttemptIdempotencyKey(request: IncomingMessage): string {
  const value = request.headers['idempotency-key'];
  const rawHeaderCount =
    Array.isArray(request.rawHeaders) && request.rawHeaders.length > 0
      ? request.rawHeaders.reduce(
          (count, header, index) =>
            index % 2 === 0 && header.toLowerCase() === 'idempotency-key' ? count + 1 : count,
          0
        )
      : undefined;
  if (
    typeof value !== 'string' ||
    (rawHeaderCount !== undefined && rawHeaderCount !== 1) ||
    value.length === 0 ||
    value.length > 255 ||
    value.trim().length === 0 ||
    CONTROL_CHARACTER_PATTERN.test(value)
  ) {
    throw new ValidationError(
      'Idempotency-Key header is required and must contain 1 to 255 characters without controls'
    );
  }
  return value;
}

function requireEmptyObject(value: unknown): void {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ValidationError('Request body must be an empty JSON object');
  }
  const prototype = Object.getPrototypeOf(value);
  if ((prototype !== Object.prototype && prototype !== null) || Object.keys(value).length !== 0) {
    throw new ValidationError('Request body must be an empty JSON object');
  }
}

function publicAttempt(attempt: EncounterPixPaymentAttemptRecord) {
  return Object.freeze({
    id: attempt.id,
    encounterId: attempt.encounterId,
    billingRecordId: attempt.billingRecordId,
    state: attempt.state,
    amountCents: attempt.amountCents,
    currency: attempt.currency,
    qrCodePayload: attempt.qrCodePayload,
    qrCodeBase64: attempt.qrCodeBase64,
    expiresAt: attempt.expiresAt,
    error:
      attempt.lastErrorCode && attempt.lastErrorPublicMessage
        ? Object.freeze({
            code: attempt.lastErrorCode,
            message: attempt.lastErrorPublicMessage
          })
        : null,
    createdAt: attempt.createdAt,
    updatedAt: attempt.updatedAt
  });
}

function json(response: ServerResponse, statusCode: number, payload: unknown): true {
  response.statusCode = statusCode;
  response.setHeader('content-type', 'application/json');
  response.end(JSON.stringify(payload));
  return true;
}

export async function applyPixPaymentAttemptRateLimit(
  response: ServerResponse,
  rateLimiter: PixPaymentAttemptRateLimiter | undefined,
  principal: AuthenticatedPrincipal,
  route: string
): Promise<boolean> {
  const info = await rateLimiter?.check({
    accountId: principal.user.accountId,
    userId: principal.user.id,
    route
  });
  if (!info) return false;
  response.setHeader('X-RateLimit-Limit', String(info.limit));
  response.setHeader('X-RateLimit-Remaining', String(info.remaining));
  response.setHeader('X-RateLimit-Reset', String(info.reset));
  if (!info.blocked) return false;
  response.setHeader('Retry-After', String(Math.ceil(info.retryAfterMs / 1_000)));
  json(response, 429, {
    code: 'RATE_LIMITED',
    message: 'Too many PIX payment attempt requests. Please try again later.',
    retryAfterMs: info.retryAfterMs
  });
  return true;
}

export async function handlePixPaymentAttemptRoutes(
  pathname: string,
  request: IncomingMessage,
  response: ServerResponse,
  handlers: PixPaymentAttemptRouteHandlers
): Promise<boolean> {
  const createMatch = CREATE_PATH.exec(pathname);
  if (createMatch && request.method === 'POST') {
    const principal = await handlers.requirePrincipal(request, 'billing.manage');
    const encounterId = requireUuid(createMatch[1] ?? '', 'encounterId');
    const requestKey = requirePixPaymentAttemptIdempotencyKey(request);
    requireEmptyObject(await readJsonBody(request));

    const attempt = await handlers.command.execute(
      Object.freeze({
        accountId: principal.user.accountId,
        actorUserId: principal.user.id,
        encounterId,
        providerKey: handlers.providerKey,
        requestKey
      })
    );
    response.setHeader('location', `/payments/pix-attempts/${attempt.id}`);
    return json(response, 202, publicAttempt(attempt));
  }

  const getMatch = GET_PATH.exec(pathname);
  if (getMatch && request.method === 'GET') {
    const principal = await handlers.requirePrincipal(request, 'billing.read');
    if (
      await applyPixPaymentAttemptRateLimit(
        response,
        handlers.rateLimiter,
        principal,
        'GET /payments/pix-attempts/:id'
      )
    ) {
      return true;
    }
    const attemptId = requireUuid(getMatch[1] ?? '', 'attemptId');
    const attempt = await handlers.repository.findById(principal.user.accountId, attemptId);
    if (!attempt) {
      throw new AppError('PIX_PAYMENT_ATTEMPT_NOT_FOUND', 'PIX payment attempt not found', 404);
    }
    return json(response, 200, publicAttempt(attempt));
  }

  return false;
}
