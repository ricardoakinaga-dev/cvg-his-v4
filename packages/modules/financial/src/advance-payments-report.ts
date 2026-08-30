import { getPool } from '@cvg-his-v2/shared-database';
import { AppError } from '@cvg-his-v2/shared-errors';
import type { AccountId } from '@cvg-his-v2/shared-types';
import { withTenantQueryExplicit } from '@cvg-his-v2/tenant-context';
import type { Pool } from 'pg';

export type AdvancePaymentReportStatus = 'available' | 'partially_compensated' | 'compensated';

export interface AdvancePaymentsReportFilters {
  readonly search?: string;
  readonly status?: AdvancePaymentReportStatus;
  readonly dateFrom?: string;
  readonly dateTo?: string;
}

export interface AdvancePaymentReportRow extends Record<string, unknown> {
  readonly paymentId: string;
  readonly ownerName: string;
  readonly documentId: string;
  readonly issuedAt: string;
  readonly originalAmount: number;
  readonly compensatedAmount: number;
  readonly balance: number;
  readonly origin: string;
  readonly status: AdvancePaymentReportStatus;
  readonly notes: string;
}

export interface AdvancePaymentsReportSource {
  list(
    accountId: AccountId,
    filters?: AdvancePaymentsReportFilters
  ): Promise<readonly AdvancePaymentReportRow[]>;
}

export const MAX_ADVANCE_PAYMENT_REPORT_ROWS = 10_000;

interface AdvancePaymentReportQueryRow extends Record<string, unknown> {
  readonly payment_id: string;
  readonly owner_name: string;
  readonly document_id: string | null;
  readonly issued_at: string | Date;
  readonly original_amount_cents: string | number;
  readonly compensated_amount_cents: string | number;
  readonly balance_cents: string | number;
  readonly origin: string;
  readonly status: string;
  readonly notes: string | null;
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
  if (value === 'available' || value === 'partially_compensated' || value === 'compensated') {
    return value;
  }
  throw new AppError(
    'ADVANCE_PAYMENT_INVALID_STATUS',
    'Persisted advance-payment status is invalid',
    500,
    { value }
  );
}

function mapReportRow(row: AdvancePaymentReportQueryRow): AdvancePaymentReportRow {
  const originalAmountCents = readPersistedCents(
    row.original_amount_cents,
    'original_amount_cents'
  );
  const compensatedAmountCents = readPersistedCents(
    row.compensated_amount_cents,
    'compensated_amount_cents'
  );
  const balanceCents = readPersistedCents(row.balance_cents, 'balance_cents');
  return {
    paymentId: String(row.payment_id),
    ownerName: String(row.owner_name),
    documentId: typeof row.document_id === 'string' ? row.document_id : '',
    issuedAt: new Date(row.issued_at).toISOString(),
    originalAmount: originalAmountCents / 100,
    compensatedAmount: compensatedAmountCents / 100,
    balance: balanceCents / 100,
    origin: String(row.origin),
    status: mapStatus(row.status),
    notes: typeof row.notes === 'string' ? row.notes : ''
  };
}

function normalizedSearch(value?: string): string {
  return value?.trim() ?? '';
}

/** Read-only account-scoped projection shared by API and worker consumers. */
export class DatabaseAdvancePaymentsReportSource implements AdvancePaymentsReportSource {
  private readonly pool: Pool;

  public constructor(pool?: Pool) {
    this.pool = pool ?? getPool();
  }

  public async list(
    accountId: AccountId,
    filters: AdvancePaymentsReportFilters = {}
  ): Promise<readonly AdvancePaymentReportRow[]> {
    const params: unknown[] = [accountId];
    const clauses = ['ap.account_id = $1'];
    const search = normalizedSearch(filters.search);

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

    return withTenantQueryExplicit(this.pool, accountId, async (client) => {
      const result = await client.query<AdvancePaymentReportQueryRow>(
        `WITH balances AS (
           SELECT
             ap.account_id,
             ap.id AS payment_id,
             o.full_name AS owner_name,
             o.document AS document_id,
             ap.issued_at,
             ap.amount_cents AS original_amount_cents,
             COALESCE(SUM(apa.amount_cents) FILTER (WHERE apa.allocation_type = 'compensation'), 0)::bigint AS compensated_amount_cents,
             ap.source_type AS origin,
             ap.notes
           FROM advance_payments AS ap
           JOIN owners AS o
             ON o.account_id = ap.account_id
            AND o.id = ap.owner_id
           LEFT JOIN advance_payment_allocations AS apa
             ON apa.account_id = ap.account_id
            AND apa.advance_payment_id = ap.id
           WHERE ${clauses[0]}
           GROUP BY ap.account_id, ap.id, o.full_name, o.document, ap.issued_at,
                    ap.amount_cents, ap.source_type, ap.notes
         ), report_rows AS (
           SELECT *,
             (original_amount_cents - compensated_amount_cents)::bigint AS balance_cents,
             CASE
               WHEN compensated_amount_cents = 0 THEN 'available'
               WHEN compensated_amount_cents < original_amount_cents THEN 'partially_compensated'
               ELSE 'compensated'
             END AS status
           FROM balances
         )
         SELECT *
         FROM report_rows
         WHERE ${clauses.slice(1).length > 0 ? clauses.slice(1).join(' AND ') : 'TRUE'}
         ORDER BY issued_at DESC, payment_id DESC
         LIMIT ${MAX_ADVANCE_PAYMENT_REPORT_ROWS + 1}`,
        params
      );
      if (result.rows.length > MAX_ADVANCE_PAYMENT_REPORT_ROWS) {
        throw new AppError(
          'ADVANCE_PAYMENT_RESULT_LIMIT',
          'Advance-payment list exceeds the maximum exportable page; refine the filters',
          422
        );
      }
      return result.rows.map(mapReportRow);
    });
  }
}
