/**
 * Operator-facing PIX settlement delivery queue.
 *
 * This boundary deliberately exposes only the terminal reconciliation queue.
 * Financial artifacts are never mutated by the HTTP handler; the repository
 * performs one tenant-scoped, audited state transition in PostgreSQL.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';

import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';
import { ValidationError } from '@cvg-his-v2/shared-errors';

import { readJsonBody } from '../helpers/common.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TERMINAL_STATE = 'reconciliation_required' as const;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
const MAX_REASON_LENGTH = 500;

export interface PixProviderSettlementDlqDelivery {
  readonly id: string;
  readonly eventId: string;
  readonly state: typeof TERMINAL_STATE;
  readonly attempts: number;
  readonly maxAttempts: number;
  readonly nextAttemptAt: string | null;
  readonly lastErrorCode: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface PixProviderSettlementDlqListInput {
  readonly accountId: string;
  readonly state: typeof TERMINAL_STATE;
  readonly limit: number;
}

export interface PixProviderSettlementDlqRedriveInput {
  readonly accountId: string;
  readonly deliveryId: string;
  readonly eventId: string;
  readonly actorUserId: string;
  readonly correlationId: string;
  readonly reason: string;
}

export interface PixProviderSettlementDlqRepository {
  list(input: PixProviderSettlementDlqListInput): Promise<readonly PixProviderSettlementDlqDelivery[]>;
  /** Returns false for missing, cross-tenant, or non-terminal deliveries. */
  redrive(input: PixProviderSettlementDlqRedriveInput): Promise<boolean>;
}

export interface PixProviderSettlementRouteHandlers {
  readonly repository?: PixProviderSettlementDlqRepository;
  readonly requirePrincipal: (
    request: IncomingMessage,
    permissionCode: string
  ) => AuthenticatedPrincipal | PromiseLike<AuthenticatedPrincipal>;
}

function sendJson(response: ServerResponse, statusCode: number, body: unknown): void {
  response.statusCode = statusCode;
  response.setHeader('content-type', 'application/json');
  response.end(JSON.stringify(body));
}

function parseLimit(raw: string | null): number {
  if (raw === null || raw === '') return DEFAULT_LIMIT;
  if (!/^[0-9]+$/.test(raw)) {
    throw new ValidationError(`limit must be an integer between 1 and ${MAX_LIMIT}`);
  }
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 1 || value > MAX_LIMIT) {
    throw new ValidationError(`limit must be an integer between 1 and ${MAX_LIMIT}`);
  }
  return value;
}

function assertUuid(value: unknown, field: string): asserts value is string {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) {
    throw new ValidationError(`${field} must be a valid UUID`);
  }
}

function assertReason(value: unknown): asserts value is string {
  if (typeof value !== 'string') throw new ValidationError('reason is required');
  const reason = value.trim();
  if (reason.length < 1 || reason.length > MAX_REASON_LENGTH) {
    throw new ValidationError(`reason must contain 1 to ${MAX_REASON_LENGTH} characters`);
  }
  if (/[\u0000-\u001f\u007f]/.test(reason)) {
    throw new ValidationError('reason contains unsupported control characters');
  }
}

function sanitizeDelivery(delivery: PixProviderSettlementDlqDelivery) {
  return {
    id: delivery.id,
    eventId: delivery.eventId,
    state: delivery.state,
    attempts: delivery.attempts,
    maxAttempts: delivery.maxAttempts,
    nextAttemptAt: delivery.nextAttemptAt,
    lastErrorCode: delivery.lastErrorCode,
    createdAt: delivery.createdAt,
    updatedAt: delivery.updatedAt
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export async function handlePixProviderSettlementRoutes(
  pathname: string,
  request: IncomingMessage,
  response: ServerResponse,
  _correlationId: string,
  handlers: PixProviderSettlementRouteHandlers
): Promise<boolean> {
  const { repository, requirePrincipal: rp } = handlers;

  if (pathname === '/internal/pix-settlement/deliveries' && request.method === 'GET') {
    const principal = await rp(request, 'audit.read');
    if (!repository) {
      sendJson(response, 503, {
        code: 'PIX_SETTLEMENT_DLQ_UNAVAILABLE',
        message: 'PIX settlement operations are unavailable',
        correlationId: _correlationId
      });
      return true;
    }

    const url = new globalThis.URL(request.url ?? pathname, 'http://localhost');
    const state = url.searchParams.get('state') ?? TERMINAL_STATE;
    if (state !== TERMINAL_STATE) {
      throw new ValidationError('state must be reconciliation_required');
    }
    const limit = parseLimit(url.searchParams.get('limit'));
    const items = await repository.list({
      accountId: String(principal.user.accountId),
      state: TERMINAL_STATE,
      limit
    });
    sendJson(response, 200, {
      items: items.map(sanitizeDelivery),
      count: items.length
    });
    return true;
  }

  const redriveMatch = pathname.match(/^\/internal\/pix-settlement\/deliveries\/([^/]+)\/redrive$/);
  if (redriveMatch && request.method === 'POST') {
    const principal = await rp(request, 'audit.write');
    assertUuid(redriveMatch[1], 'deliveryId');
    if (!repository) {
      sendJson(response, 503, {
        code: 'PIX_SETTLEMENT_DLQ_UNAVAILABLE',
        message: 'PIX settlement operations are unavailable',
        correlationId: _correlationId
      });
      return true;
    }

    const payload = await readJsonBody(request);
    if (!isRecord(payload)) throw new ValidationError('Request body must be an object');
    const unknownKeys = Object.keys(payload).filter((key) => key !== 'eventId' && key !== 'reason');
    if (unknownKeys.length > 0) {
      throw new ValidationError('Request body contains unsupported fields', { fields: unknownKeys });
    }
    assertUuid(payload.eventId, 'eventId');
    assertReason(payload.reason);

    const redriven = await repository.redrive({
      accountId: String(principal.user.accountId),
      deliveryId: redriveMatch[1],
      eventId: payload.eventId,
      actorUserId: String(principal.user.id),
      correlationId: _correlationId,
      reason: payload.reason.trim()
    });
    if (!redriven) {
      sendJson(response, 404, {
        code: 'NOT_FOUND',
        message: 'Settlement delivery not found',
        correlationId: _correlationId
      });
      return true;
    }
    sendJson(response, 202, {
      id: redriveMatch[1],
      eventId: payload.eventId,
      status: 'redrive_scheduled'
    });
    return true;
  }

  return false;
}
