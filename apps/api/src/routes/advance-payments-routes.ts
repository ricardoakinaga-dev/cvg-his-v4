import type { IncomingMessage, ServerResponse } from 'node:http';

import type { AuditService } from '@cvg-his-v2/module-audit';
import type { JsonValue } from '@cvg-his-v2/shared-database';
import { AppError, ValidationError } from '@cvg-his-v2/shared-errors';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';

import { appendAudit } from '../helpers/audit-helper.js';
import { readJsonBody } from '../helpers/common.js';
import type { TenantCommandRunner } from '../helpers/tenant-command.js';
import type {
  AdvancePaymentReportStatus,
  AdvancePaymentsReportFilters,
  AdvancePaymentsRepository,
  CreateAdvancePaymentAllocationInput,
  CreateAdvancePaymentInput
} from '../repositories/advance-payments-report-source.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const COLLECTION_PATH = '/finance/advance-payments';
const ALLOCATION_PATH = /^\/finance\/advance-payments\/([^/]+)\/allocations$/;
const ADVANCE_PAYMENT_STATUSES: readonly AdvancePaymentReportStatus[] = [
  'available',
  'partially_compensated',
  'compensated'
];

export interface AdvancePaymentsRouteHandlers {
  readonly advancePayments?: AdvancePaymentsRepository;
  readonly audit: AuditService;
  readonly correlationId: string;
  readonly requirePrincipal: (
    request: IncomingMessage,
    permissionCode: string
  ) => AuthenticatedPrincipal | PromiseLike<AuthenticatedPrincipal>;
  readonly runCommand?: TenantCommandRunner;
}

function json(response: ServerResponse, statusCode: number, payload: unknown): true {
  response.statusCode = statusCode;
  response.setHeader('content-type', 'application/json');
  response.end(JSON.stringify(payload));
  return true;
}

function requireRepository(
  handlers: AdvancePaymentsRouteHandlers
): AdvancePaymentsRepository {
  if (!handlers.advancePayments) {
    throw new AppError(
      'ADVANCE_PAYMENT_REPOSITORY_UNAVAILABLE',
      'Advance-payment commands require the canonical database repository',
      503
    );
  }
  return handlers.advancePayments;
}

function requireObject(value: unknown): Readonly<Record<string, unknown>> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new ValidationError('Request body must be a JSON object');
  }
  return value as Readonly<Record<string, unknown>>;
}

function rejectUnknownFields(
  payload: Readonly<Record<string, unknown>>,
  allowedFields: ReadonlySet<string>
): void {
  const unknownField = Object.keys(payload).find((field) => !allowedFields.has(field));
  if (unknownField) throw new ValidationError(`Unknown field '${unknownField}'`);
}

function requireUuid(value: unknown, field: string): string {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) {
    throw new ValidationError(`${field} must be a valid UUID`);
  }
  return value;
}

function requireAmountCents(value: unknown): number {
  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(value) ||
    value <= 0 ||
    value > 100_000_000_000
  ) {
    throw new ValidationError('amountCents must be a positive integer amount in cents');
  }
  return value;
}

function requireText(
  value: unknown,
  field: string,
  maximum: number,
  options: { readonly required?: boolean } = {}
): string | undefined {
  if (value === undefined && !options.required) return undefined;
  if (typeof value !== 'string') throw new ValidationError(`${field} must be a string`);
  const normalized = value.trim();
  if (!normalized) {
    throw new ValidationError(`${field} must contain 1 to ${maximum} characters`);
  }
  if (normalized.length > maximum) {
    throw new ValidationError(`${field} must contain at most ${maximum} characters`);
  }
  return normalized || undefined;
}

function requireIdempotencyKey(request: IncomingMessage): string {
  const header = request.headers?.['idempotency-key'];
  if (Array.isArray(header) && header.length !== 1) {
    throw new ValidationError('Idempotency-Key header must contain exactly one value');
  }
  const value = Array.isArray(header) ? header[0] : header;
  if (typeof value !== 'string') {
    throw new ValidationError('Idempotency-Key header is required');
  }
  const normalized = value.trim();
  if (!normalized || normalized.length > 255) {
    throw new ValidationError(
      'Idempotency-Key header is required and must contain at most 255 characters'
    );
  }
  return normalized;
}

function parseStatus(value: string | null): AdvancePaymentReportStatus | undefined {
  if (value === null || value === '') return undefined;
  if (ADVANCE_PAYMENT_STATUSES.includes(value as AdvancePaymentReportStatus)) {
    return value as AdvancePaymentReportStatus;
  }
  throw new ValidationError(
    'status must be available, partially_compensated or compensated',
    { value }
  );
}

function parseDate(value: string | null, field: string): string | undefined {
  if (value === null || value === '') return undefined;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new ValidationError(`${field} must be an ISO calendar date`, { value });
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new ValidationError(`${field} must be an ISO calendar date`, { value });
  }
  return value;
}

function parseListFilters(request: IncomingMessage): AdvancePaymentsReportFilters {
  const url = new URL(request.url ?? COLLECTION_PATH, 'http://localhost');
  const searchValue = url.searchParams.get('search');
  const search = searchValue?.trim() || undefined;
  if (search && search.length > 200) {
    throw new ValidationError('search must contain at most 200 characters');
  }
  const dateFrom = parseDate(url.searchParams.get('dateFrom'), 'dateFrom');
  const dateTo = parseDate(url.searchParams.get('dateTo'), 'dateTo');
  if (dateFrom && dateTo && dateFrom > dateTo) {
    throw new ValidationError('dateFrom must be before or equal to dateTo');
  }
  const status = parseStatus(url.searchParams.get('status'));
  return {
    ...(search ? { search } : {}),
    ...(status ? { status } : {}),
    ...(dateFrom ? { dateFrom } : {}),
    ...(dateTo ? { dateTo } : {})
  };
}

function optionalPayloadField(
  payload: Readonly<Record<string, unknown>>,
  field: string,
  maximum: number
): string | undefined {
  return requireText(payload[field], field, maximum);
}

function createIssueInput(
  payload: Readonly<Record<string, unknown>>,
  principal: AuthenticatedPrincipal,
  idempotencyKey: string
): { readonly input: CreateAdvancePaymentInput; readonly commandPayload: JsonValue } {
  rejectUnknownFields(payload, new Set(['ownerId', 'amountCents', 'sourceId', 'reference', 'notes']));
  const ownerId = requireUuid(payload.ownerId, 'ownerId');
  const amountCents = requireAmountCents(payload.amountCents);
  const sourceId = requireText(payload.sourceId, 'sourceId', 255, { required: true });
  const requiredSourceId = sourceId as string;
  const reference = optionalPayloadField(payload, 'reference', 255);
  const notes = optionalPayloadField(payload, 'notes', 2000);
  const input: CreateAdvancePaymentInput = {
    accountId: principal.user.accountId,
    actorUserId: principal.user.id,
    ownerId,
    amountCents,
    sourceType: 'manual',
    sourceId: requiredSourceId,
    ...(reference ? { reference } : {}),
    ...(notes ? { notes } : {}),
    idempotencyKey
  };
  return {
    input,
    commandPayload: {
      ownerId,
      amountCents,
      sourceType: 'manual',
      sourceId: requiredSourceId,
      ...(reference ? { reference } : {}),
      ...(notes ? { notes } : {})
    }
  };
}

function createAllocationInput(
  paymentId: string,
  payload: Readonly<Record<string, unknown>>,
  principal: AuthenticatedPrincipal,
  idempotencyKey: string
): { readonly input: CreateAdvancePaymentAllocationInput; readonly commandPayload: JsonValue } {
  rejectUnknownFields(payload, new Set(['amountCents', 'reference', 'notes']));
  const amountCents = requireAmountCents(payload.amountCents);
  const reference = requireText(payload.reference, 'reference', 255, { required: true });
  const requiredReference = reference as string;
  const notes = optionalPayloadField(payload, 'notes', 2000);
  const input: CreateAdvancePaymentAllocationInput = {
    accountId: principal.user.accountId,
    actorUserId: principal.user.id,
    advancePaymentId: paymentId,
    amountCents,
    reference: requiredReference,
    ...(notes ? { notes } : {}),
    idempotencyKey
  };
  return {
    input,
    commandPayload: {
      advancePaymentId: paymentId,
      amountCents,
      reference: requiredReference,
      ...(notes ? { notes } : {})
    }
  };
}

async function runMutation<T>(
  handlers: AdvancePaymentsRouteHandlers,
  request: IncomingMessage,
  principal: AuthenticatedPrincipal,
  idempotencyKey: string,
  operation: string,
  payload: JsonValue,
  command: () => Promise<T>
): Promise<T> {
  if (!handlers.runCommand) return command();
  return handlers.runCommand({
    request,
    idempotencyKey,
    accountId: principal.user.accountId,
    actorUserId: principal.user.id,
    correlationId: handlers.correlationId,
    operation,
    payload,
    command
  });
}

export async function handleAdvancePaymentsRoutes(
  pathname: string,
  request: IncomingMessage,
  response: ServerResponse,
  handlers: AdvancePaymentsRouteHandlers
): Promise<boolean> {
  const method = request.method ?? 'GET';

  if (pathname === COLLECTION_PATH && method === 'GET') {
    const principal = await handlers.requirePrincipal(request, 'billing.read');
    const repository = requireRepository(handlers);
    const filters = parseListFilters(request);
    const items = await repository.listSummaries(principal.user.accountId, filters);
    appendAudit(handlers.audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'financial',
      action: 'advance_payment_list',
      entityType: 'advance_payment',
      entityId: filters.search ?? filters.status ?? 'all',
      payloadSummary: `Advance payments listed (${items.length} item(s))`,
      riskLevel: 'medium',
      correlationId: handlers.correlationId
    });
    return json(response, 200, { items });
  }

  if (pathname === COLLECTION_PATH && method === 'POST') {
    const principal = await handlers.requirePrincipal(request, 'billing.manage');
    const repository = requireRepository(handlers);
    const idempotencyKey = requireIdempotencyKey(request);
    const { input, commandPayload } = createIssueInput(
      requireObject(await readJsonBody(request)),
      principal,
      idempotencyKey
    );
    const item = await runMutation(
      handlers,
      request,
      principal,
      idempotencyKey,
      'finance.advance-payment.issue',
      commandPayload,
      () => repository.create(input)
    );
    return json(response, 201, item);
  }

  const allocationMatch = ALLOCATION_PATH.exec(pathname);
  if (allocationMatch && method === 'POST') {
    const principal = await handlers.requirePrincipal(request, 'billing.manage');
    const repository = requireRepository(handlers);
    // UUIDs contain no reserved URL characters; validating the raw path
    // segment also keeps malformed percent-encoding on the normal 400 path.
    const paymentId = requireUuid(allocationMatch[1] ?? '', 'advancePaymentId');
    const idempotencyKey = requireIdempotencyKey(request);
    const { input, commandPayload } = createAllocationInput(
      paymentId,
      requireObject(await readJsonBody(request)),
      principal,
      idempotencyKey
    );
    const item = await runMutation(
      handlers,
      request,
      principal,
      idempotencyKey,
      'finance.advance-payment.compensate',
      commandPayload,
      () => repository.allocate(input)
    );
    return json(response, 201, item);
  }

  return false;
}
