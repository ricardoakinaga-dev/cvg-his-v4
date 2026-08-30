import { getPool } from '@cvg-his-v2/shared-database';
import { AppError } from '@cvg-his-v2/shared-errors';
import type { AccountId } from '@cvg-his-v2/shared-types';
import { withTenantQueryExplicit } from '@cvg-his-v2/tenant-context';
import type { Pool } from 'pg';

export type CommissionCalculationsReportStatus = 'draft' | 'reviewed' | 'paid' | 'cancelled';

export interface CommissionCalculationsReportFilters {
  readonly status?: CommissionCalculationsReportStatus;
  readonly dateFrom?: string;
  readonly dateTo?: string;
}

export interface CommissionCalculationsReportRow extends Record<string, unknown> {
  readonly accountId: AccountId;
  readonly id: string;
  readonly number: string;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly status: CommissionCalculationsReportStatus;
  readonly totalBaseAmount: number;
  readonly totalCommissionAmount: number;
  readonly lineCount: number;
}

export interface CommissionCalculationsReportSource {
  list(
    accountId: AccountId,
    filters?: CommissionCalculationsReportFilters
  ): Promise<readonly CommissionCalculationsReportRow[]>;
}

export const MAX_COMMISSION_CALCULATIONS_REPORT_ROWS = 10_000;

interface CommissionCalculationsReportQueryRow extends Record<string, unknown> {
  readonly account_id: unknown;
  readonly id: unknown;
  readonly calculation_number: unknown;
  readonly period_start: unknown;
  readonly period_end: unknown;
  readonly status: unknown;
  readonly total_base_amount: unknown;
  readonly total_commission_amount: unknown;
  readonly line_count: unknown;
}

function invalidFilter(field: string, message: string): AppError {
  return new AppError('COMMISSION_CALCULATIONS_REPORT_INVALID_FILTER', message, 422, { field });
}

function invalidPersistedState(code: string, field: string): AppError {
  return new AppError(code, 'Persisted commission-calculations report state is invalid', 500, {
    field
  });
}

function normalizeDate(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw invalidFilter(field, `${field} must be an ISO calendar date`);
  }

  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (
    year < 1 ||
    year > 9999 ||
    Number.isNaN(parsed.getTime()) ||
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() + 1 !== month ||
    parsed.getUTCDate() !== day
  ) {
    throw invalidFilter(field, `${field} must be an ISO calendar date`);
  }
  return value;
}

function readRequiredText(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw invalidPersistedState('COMMISSION_CALCULATIONS_REPORT_INVALID_TEXT', field);
  }
  return value;
}

function readStatus(value: unknown): CommissionCalculationsReportStatus {
  if (value === 'draft' || value === 'reviewed' || value === 'paid' || value === 'cancelled') {
    return value;
  }
  throw invalidPersistedState('COMMISSION_CALCULATIONS_REPORT_INVALID_STATUS', 'status');
}

function readDate(value: unknown, field: string): string {
  let normalized: unknown = value;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw invalidPersistedState('COMMISSION_CALCULATIONS_REPORT_INVALID_DATE', field);
    }
    normalized = value.toISOString().slice(0, 10);
  }
  if (typeof normalized !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    throw invalidPersistedState('COMMISSION_CALCULATIONS_REPORT_INVALID_DATE', field);
  }

  const [year, month, day] = normalized.split('-').map(Number);
  const parsed = new Date(`${normalized}T00:00:00.000Z`);
  if (
    year < 1 ||
    year > 9999 ||
    Number.isNaN(parsed.getTime()) ||
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() + 1 !== month ||
    parsed.getUTCDate() !== day
  ) {
    throw invalidPersistedState('COMMISSION_CALCULATIONS_REPORT_INVALID_DATE', field);
  }
  return normalized;
}

function readAmount(value: unknown, field: string): number {
  if (
    (typeof value !== 'number' && typeof value !== 'string') ||
    (typeof value === 'string' && value.trim().length === 0)
  ) {
    throw invalidPersistedState('COMMISSION_CALCULATIONS_REPORT_UNSAFE_AMOUNT', field);
  }
  const amount = typeof value === 'number' ? value : Number(value);
  const cents = Math.round(amount * 100);
  if (
    !Number.isFinite(amount) ||
    amount < 0 ||
    !Number.isSafeInteger(cents) ||
    Math.abs(cents / 100 - amount) > Number.EPSILON * Math.max(1, Math.abs(amount))
  ) {
    throw invalidPersistedState('COMMISSION_CALCULATIONS_REPORT_UNSAFE_AMOUNT', field);
  }
  return cents / 100;
}

function readLineCount(value: unknown): number {
  if (
    (typeof value !== 'number' && typeof value !== 'string') ||
    (typeof value === 'string' && value.trim().length === 0)
  ) {
    throw invalidPersistedState('COMMISSION_CALCULATIONS_REPORT_INVALID_LINE_COUNT', 'line_count');
  }
  const lineCount = typeof value === 'number' ? value : Number(value);
  if (!Number.isSafeInteger(lineCount) || lineCount < 0) {
    throw invalidPersistedState('COMMISSION_CALCULATIONS_REPORT_INVALID_LINE_COUNT', 'line_count');
  }
  return lineCount;
}

function mapReportRow(
  row: CommissionCalculationsReportQueryRow,
  accountId: AccountId
): CommissionCalculationsReportRow {
  if (row.account_id !== accountId) {
    throw new AppError(
      'COMMISSION_CALCULATIONS_REPORT_TENANT_MISMATCH',
      'Persisted commission-calculations report row belongs to another account',
      500,
      { field: 'account_id' }
    );
  }

  const periodStart = readDate(row.period_start, 'period_start');
  const periodEnd = readDate(row.period_end, 'period_end');
  if (periodStart > periodEnd) {
    throw invalidPersistedState('COMMISSION_CALCULATIONS_REPORT_INVALID_PERIOD', 'period');
  }

  return {
    accountId,
    id: readRequiredText(row.id, 'id'),
    number: readRequiredText(row.calculation_number, 'calculation_number'),
    periodStart,
    periodEnd,
    status: readStatus(row.status),
    totalBaseAmount: readAmount(row.total_base_amount, 'total_base_amount'),
    totalCommissionAmount: readAmount(row.total_commission_amount, 'total_commission_amount'),
    lineCount: readLineCount(row.line_count)
  };
}

/** Read-only account-scoped projection shared by scheduled worker consumers. */
export class DatabaseCommissionCalculationsReportSource implements CommissionCalculationsReportSource {
  private readonly pool: Pool;

  public constructor(pool?: Pool) {
    this.pool = pool ?? getPool();
  }

  public async list(
    accountId: AccountId,
    filters: CommissionCalculationsReportFilters = {}
  ): Promise<readonly CommissionCalculationsReportRow[]> {
    const status = filters.status;
    if (
      status !== undefined &&
      status !== 'draft' &&
      status !== 'reviewed' &&
      status !== 'paid' &&
      status !== 'cancelled'
    ) {
      throw invalidFilter('status', 'status must be one of draft, reviewed, paid, cancelled');
    }
    const dateFrom = normalizeDate(filters.dateFrom, 'dateFrom');
    const dateTo = normalizeDate(filters.dateTo, 'dateTo');
    if (dateFrom && dateTo && dateFrom > dateTo) {
      throw invalidFilter('dateFrom', 'dateFrom must be before or equal to dateTo');
    }

    const params: unknown[] = [accountId];
    const clauses = ['commission_calculations.account_id = $1'];
    if (status) {
      params.push(status);
      clauses.push(`commission_calculations.status = $${params.length}`);
    }
    if (dateFrom) {
      params.push(dateFrom);
      clauses.push(`commission_calculations.period_end >= $${params.length}::date`);
    }
    if (dateTo) {
      params.push(dateTo);
      clauses.push(`commission_calculations.period_start <= $${params.length}::date`);
    }

    return withTenantQueryExplicit(this.pool, accountId, async (client) => {
      const result = await client.query<CommissionCalculationsReportQueryRow>(
        `SELECT
           commission_calculations.account_id,
           commission_calculations.id,
           commission_calculations.calculation_number,
           commission_calculations.period_start,
           commission_calculations.period_end,
           commission_calculations.status,
           commission_calculations.total_base_amount,
           commission_calculations.total_commission_amount,
           COUNT(commission_lines.id)::integer AS line_count
         FROM commission_calculations
         LEFT JOIN commission_lines
           ON commission_lines.account_id = commission_calculations.account_id
          AND commission_lines.account_id = $1
          AND commission_lines.calculation_id = commission_calculations.id
         WHERE ${clauses.join(' AND ')}
         GROUP BY commission_calculations.account_id,
                  commission_calculations.id,
                  commission_calculations.calculation_number,
                  commission_calculations.period_start,
                  commission_calculations.period_end,
                  commission_calculations.status,
                  commission_calculations.total_base_amount,
                  commission_calculations.total_commission_amount,
                  commission_calculations.created_at
         ORDER BY commission_calculations.created_at DESC, commission_calculations.id DESC
         LIMIT ${MAX_COMMISSION_CALCULATIONS_REPORT_ROWS + 1}`,
        params
      );
      if (result.rows.length > MAX_COMMISSION_CALCULATIONS_REPORT_ROWS) {
        throw new AppError(
          'COMMISSION_CALCULATIONS_REPORT_RESULT_LIMIT',
          'Commission-calculations report exceeds the maximum exportable page; refine the filters',
          422
        );
      }
      return result.rows.map((row) => mapReportRow(row, accountId));
    });
  }
}
