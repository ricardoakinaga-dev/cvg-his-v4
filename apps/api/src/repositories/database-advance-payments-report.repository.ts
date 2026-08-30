import { createHash, randomUUID } from 'node:crypto';
import type { PoolClient } from 'pg';

import { getPool, getTenantTransactionContext } from '@cvg-his-v2/shared-database';
import { AppError, ConflictError, NotFoundError, ValidationError } from '@cvg-his-v2/shared-errors';
import { withTenantQueryExplicit } from '@cvg-his-v2/tenant-context';
import { DatabaseAdvancePaymentsReportSource } from '@cvg-his-v2/module-financial';
import type { AccountId } from '@cvg-his-v2/shared-types';

import type {
  AdvancePaymentSummary,
  AdvancePaymentsRepository,
  AdvancePaymentReportRow,
  AdvancePaymentsReportFilters,
  AdvancePaymentReportStatus,
  CreateAdvancePaymentAllocationInput,
  CreateAdvancePaymentInput
} from './advance-payments-report-source.js';

const SUMMARY_COLUMNS = `
  ap.id,
  ap.account_id,
  ap.owner_id,
  o.full_name AS owner_name,
  o.document AS document_id,
  ap.issued_at,
  ap.amount_cents,
  COALESCE(SUM(apa.amount_cents) FILTER (WHERE apa.allocation_type = 'compensation'), 0)::bigint AS compensated_amount_cents,
  (ap.amount_cents - COALESCE(SUM(apa.amount_cents) FILTER (WHERE apa.allocation_type = 'compensation'), 0))::bigint AS balance_cents,
  ap.currency,
  ap.source_type,
  ap.source_id,
  ap.reference,
  ap.notes,
  CASE
    WHEN COALESCE(SUM(apa.amount_cents) FILTER (WHERE apa.allocation_type = 'compensation'), 0) = 0 THEN 'available'
    WHEN COALESCE(SUM(apa.amount_cents) FILTER (WHERE apa.allocation_type = 'compensation'), 0) < ap.amount_cents THEN 'partially_compensated'
    ELSE 'compensated'
  END AS status,
  ap.created_by_user_id,
  ap.created_at`;

interface AdvancePaymentSummaryRow extends Record<string, unknown> {
  readonly id: string;
  readonly account_id: string;
  readonly owner_id: string;
  readonly owner_name: string;
  readonly document_id: string | null;
  readonly issued_at: string | Date;
  readonly amount_cents: string | number;
  readonly compensated_amount_cents: string | number;
  readonly balance_cents: string | number;
  readonly currency: string;
  readonly source_type: string;
  readonly source_id: string;
  readonly reference: string | null;
  readonly notes: string | null;
  readonly status: string;
  readonly created_by_user_id: string;
  readonly created_at: string | Date;
}

function normalizeSearch(value?: string): string {
  return value?.trim() ?? '';
}

function readPersistedCents(value: unknown, field: string): number {
  const cents = typeof value === 'number' ? value : Number(value);
  if (!Number.isSafeInteger(cents) || cents < 0) {
    throw new AppError(
      'ADVANCE_PAYMENT_UNSAFE_AMOUNT',
      'Persisted advance-payment amount cannot be represented exactly',
      500,
      { field }
    );
  }
  return cents;
}

function mapStatus(value: unknown): AdvancePaymentReportStatus {
  if (value === 'partially_compensated' || value === 'compensated') return value;
  return 'available';
}

function mapSummary(row: AdvancePaymentSummaryRow): AdvancePaymentSummary {
  if (row.currency !== 'BRL') {
    throw new AppError(
      'ADVANCE_PAYMENT_UNSUPPORTED_CURRENCY',
      'Advance payment currency is not supported',
      500
    );
  }
  const amountCents = readPersistedCents(row.amount_cents, 'amount_cents');
  const compensatedAmountCents = readPersistedCents(
    row.compensated_amount_cents,
    'compensated_amount_cents'
  );
  const balanceCents = readPersistedCents(row.balance_cents, 'balance_cents');
  return {
    id: row.id,
    accountId: row.account_id,
    ownerId: row.owner_id,
    ownerName: row.owner_name,
    documentId: row.document_id ?? '',
    issuedAt: new Date(row.issued_at).toISOString(),
    amountCents,
    compensatedAmountCents,
    balanceCents,
    currency: 'BRL',
    sourceType: row.source_type,
    sourceId: row.source_id,
    reference: row.reference,
    notes: row.notes,
    status: mapStatus(row.status),
    createdByUserId: row.created_by_user_id,
    createdAt: new Date(row.created_at).toISOString()
  };
}

function requirePositiveIntegerCents(value: number, field: string): void {
  if (!Number.isSafeInteger(value) || value <= 0 || value > 100_000_000_000) {
    throw new ValidationError(`${field} must be a positive integer amount in cents`);
  }
}

function requireBoundedString(value: string, field: string, maximum: number): string {
  const normalized = value.trim();
  if (!normalized || normalized.length > maximum) {
    throw new ValidationError(`${field} must contain 1 to ${maximum} characters`);
  }
  return normalized;
}

function requireTransaction(accountId: string, actorUserId: string) {
  const transaction = getTenantTransactionContext();
  if (
    !transaction ||
    transaction.accountId !== accountId ||
    transaction.actorUserId !== actorUserId
  ) {
    throw new AppError(
      'ADVANCE_PAYMENT_TRANSACTION_REQUIRED',
      'Advance payment writes require the active tenant transaction context',
      503
    );
  }
  return transaction;
}

function hashIdempotencyKey(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function postgresErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('code' in error)) return undefined;
  const code = (error as { readonly code?: unknown }).code;
  return typeof code === 'string' ? code : undefined;
}

function mapAdvancePaymentWriteError(error: unknown): never {
  const code = postgresErrorCode(error);
  if (code === '23514') {
    throw new ConflictError('Advance payment compensation exceeds the available balance');
  }
  if (code === '23505') {
    throw new ConflictError('Advance payment idempotency key has already been used');
  }
  throw error;
}

export class DatabaseAdvancePaymentsReportRepository implements AdvancePaymentsRepository {
  private readonly reportSource = new DatabaseAdvancePaymentsReportSource();

  private async findSummaryInTransaction(
    accountId: string,
    paymentId: string,
    client: PoolClient
  ): Promise<AdvancePaymentSummary> {
    const result = await client.query<AdvancePaymentSummaryRow>(
      `SELECT ${SUMMARY_COLUMNS}
         FROM advance_payments AS ap
         JOIN owners AS o
           ON o.account_id = ap.account_id AND o.id = ap.owner_id
         LEFT JOIN advance_payment_allocations AS apa
           ON apa.account_id = ap.account_id AND apa.advance_payment_id = ap.id
        WHERE ap.account_id = $1 AND ap.id = $2
        GROUP BY ap.id, ap.account_id, ap.owner_id, o.full_name, o.document,
                 ap.issued_at, ap.amount_cents, ap.currency, ap.source_type,
                 ap.source_id, ap.reference, ap.notes, ap.created_by_user_id,
                 ap.created_at`,
      [accountId, paymentId]
    );
    const row = result.rows[0];
    if (!row) throw new NotFoundError('Advance payment not found', { paymentId });
    return mapSummary(row);
  }

  public async create(input: CreateAdvancePaymentInput): Promise<AdvancePaymentSummary> {
    const transaction = requireTransaction(input.accountId, input.actorUserId);
    requirePositiveIntegerCents(input.amountCents, 'amountCents');
    if (input.sourceType !== 'manual') {
      throw new ValidationError('sourceType must be manual for this command boundary');
    }
    const sourceId = requireBoundedString(input.sourceId, 'sourceId', 255);
    const idempotencyKey = requireBoundedString(input.idempotencyKey, 'Idempotency-Key', 255);
    const reference = input.reference
      ? requireBoundedString(input.reference, 'reference', 255)
      : null;
    const notes = input.notes ? requireBoundedString(input.notes, 'notes', 2000) : null;

    const owner = await transaction.client.query<{ readonly id: string }>(
      `SELECT id
         FROM owners
        WHERE account_id = $1 AND id = $2
        FOR SHARE`,
      [input.accountId, input.ownerId]
    );
    if (!owner.rows[0]) throw new NotFoundError('Owner not found', { ownerId: input.ownerId });

    const paymentId = randomUUID();
    const inserted = await transaction.client
      .query<{ readonly id: string }>(
        `INSERT INTO advance_payments (
           id, account_id, owner_id, amount_cents, currency, source_type, source_id,
           reference, notes, issued_at, created_by_user_id, idempotency_key_hash, created_at
         ) VALUES ($1, $2, $3, $4, 'BRL', $5, $6, $7, $8, clock_timestamp(), $9, $10, clock_timestamp())
         RETURNING id`,
        [
          paymentId,
          input.accountId,
          input.ownerId,
          input.amountCents,
          input.sourceType,
          sourceId,
          reference,
          notes,
          input.actorUserId,
          hashIdempotencyKey(idempotencyKey)
        ]
      )
      .catch((error: unknown) => mapAdvancePaymentWriteError(error));
    if (!inserted.rows[0]) {
      throw new AppError(
        'ADVANCE_PAYMENT_PERSISTENCE_FAILED',
        'Advance payment was not persisted',
        500
      );
    }

    const summary = await this.findSummaryInTransaction(
      input.accountId,
      inserted.rows[0].id,
      transaction.client
    );
    await transaction.audit.append({
      entityType: 'advance_payment',
      entityId: summary.id,
      action: 'advance_payment_issued',
      metadata: {
        ownerId: summary.ownerId,
        amountCents: summary.amountCents,
        currency: summary.currency,
        sourceType: summary.sourceType,
        sourceId: summary.sourceId
      }
    });
    await transaction.outbox.append({
      moduleName: 'financial',
      eventType: 'finance.advance-payment.issued.v1',
      payload: {
        advancePaymentId: summary.id,
        ownerId: summary.ownerId,
        amountCents: summary.amountCents,
        currency: summary.currency,
        sourceType: summary.sourceType,
        sourceId: summary.sourceId
      }
    });
    return summary;
  }

  public async listSummaries(
    accountId: string,
    filters: AdvancePaymentsReportFilters = {}
  ): Promise<readonly AdvancePaymentSummary[]> {
    const params: unknown[] = [accountId];
    const clauses = ['ap.account_id = $1'];
    const search = normalizeSearch(filters.search);

    if (search) {
      params.push(`%${search}%`);
      clauses.push(`(owner_name ILIKE $${params.length} OR document_id ILIKE $${params.length})`);
    }
    if (filters.dateFrom) {
      params.push(filters.dateFrom);
      clauses.push(`issued_at >= $${params.length}::date`);
    }
    if (filters.dateTo) {
      params.push(filters.dateTo);
      clauses.push(`issued_at < ($${params.length}::date + INTERVAL '1 day')`);
    }
    if (filters.status) {
      params.push(filters.status);
      clauses.push(`status = $${params.length}`);
    }

    return withTenantQueryExplicit(getPool(), accountId, async (client) => {
      const result = await client.query<AdvancePaymentSummaryRow>(
        `WITH summaries AS (
           SELECT ${SUMMARY_COLUMNS}
             FROM advance_payments AS ap
             JOIN owners AS o
               ON o.account_id = ap.account_id AND o.id = ap.owner_id
             LEFT JOIN advance_payment_allocations AS apa
               ON apa.account_id = ap.account_id AND apa.advance_payment_id = ap.id
            WHERE ${clauses[0]}
            GROUP BY ap.id, ap.account_id, ap.owner_id, o.full_name, o.document,
                     ap.issued_at, ap.amount_cents, ap.currency, ap.source_type,
                     ap.source_id, ap.reference, ap.notes, ap.created_by_user_id,
                     ap.created_at
         )
         SELECT *
           FROM summaries
          WHERE ${clauses.slice(1).length > 0 ? clauses.slice(1).join(' AND ') : 'TRUE'}
          ORDER BY issued_at DESC, id DESC
          LIMIT 10001`,
        params
      );
      if (result.rows.length > 10000) {
        throw new AppError(
          'ADVANCE_PAYMENT_RESULT_LIMIT',
          'Advance-payment list exceeds the maximum exportable page; refine the filters',
          422
        );
      }
      return result.rows.map(mapSummary);
    });
  }

  public async allocate(
    input: CreateAdvancePaymentAllocationInput
  ): Promise<AdvancePaymentSummary> {
    const transaction = requireTransaction(input.accountId, input.actorUserId);
    requirePositiveIntegerCents(input.amountCents, 'amountCents');
    const reference = requireBoundedString(input.reference, 'reference', 255);
    const idempotencyKey = requireBoundedString(input.idempotencyKey, 'Idempotency-Key', 255);
    const notes = input.notes ? requireBoundedString(input.notes, 'notes', 2000) : null;

    const parent = await transaction.client.query<{ readonly amount_cents: string | number }>(
      `SELECT amount_cents
         FROM advance_payments
        WHERE account_id = $1 AND id = $2
        FOR UPDATE`,
      [input.accountId, input.advancePaymentId]
    );
    if (!parent.rows[0]) {
      throw new NotFoundError('Advance payment not found', {
        advancePaymentId: input.advancePaymentId
      });
    }

    const allocationId = randomUUID();
    const inserted = await transaction.client
      .query<{ readonly id: string }>(
        `INSERT INTO advance_payment_allocations (
           id, account_id, advance_payment_id, amount_cents, allocation_type,
           reference, notes, allocated_at, created_by_user_id, idempotency_key_hash, created_at
         ) VALUES ($1, $2, $3, $4, 'compensation', $5, $6, clock_timestamp(), $7, $8, clock_timestamp())
         RETURNING id`,
        [
          allocationId,
          input.accountId,
          input.advancePaymentId,
          input.amountCents,
          reference,
          notes,
          input.actorUserId,
          hashIdempotencyKey(idempotencyKey)
        ]
      )
      .catch((error: unknown) => mapAdvancePaymentWriteError(error));
    if (!inserted.rows[0]) {
      throw new AppError(
        'ADVANCE_PAYMENT_ALLOCATION_PERSISTENCE_FAILED',
        'Advance payment compensation was not persisted',
        500
      );
    }

    const summary = await this.findSummaryInTransaction(
      input.accountId,
      input.advancePaymentId,
      transaction.client
    );
    await transaction.audit.append({
      entityType: 'advance_payment_allocation',
      entityId: inserted.rows[0].id,
      action: 'advance_payment_compensated',
      metadata: {
        advancePaymentId: summary.id,
        ownerId: summary.ownerId,
        amountCents: input.amountCents,
        reference
      }
    });
    await transaction.outbox.append({
      moduleName: 'financial',
      eventType: 'finance.advance-payment.compensated.v1',
      payload: {
        advancePaymentId: summary.id,
        allocationId: inserted.rows[0].id,
        ownerId: summary.ownerId,
        amountCents: input.amountCents,
        reference
      }
    });
    return summary;
  }

  public list(
    accountId: string,
    filters: AdvancePaymentsReportFilters = {}
  ): Promise<readonly AdvancePaymentReportRow[]> {
    return this.reportSource.list(accountId as AccountId, filters);
  }
}
