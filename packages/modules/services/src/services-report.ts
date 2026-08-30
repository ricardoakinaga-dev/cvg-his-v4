import { getPool } from '@cvg-his-v2/shared-database';
import { AppError } from '@cvg-his-v2/shared-errors';
import type { AccountId } from '@cvg-his-v2/shared-types';
import { withTenantQueryExplicit } from '@cvg-his-v2/tenant-context';
import type { Pool } from 'pg';

export interface ServicesReportFilters {
  readonly dateFrom?: string;
  readonly dateTo?: string;
}

export interface ServicesReportRow extends Record<string, unknown> {
  readonly accountId: AccountId;
  readonly id: string;
  readonly code: string | null;
  readonly name: string;
  readonly description: string | null;
  readonly basePrice: number;
  readonly active: boolean;
  readonly createdAt: string;
}

export interface ServicesReportSource {
  list(
    accountId: AccountId,
    filters?: ServicesReportFilters
  ): Promise<readonly ServicesReportRow[]>;
}

export const MAX_SERVICES_REPORT_ROWS = 10_000;

interface ServicesReportQueryRow extends Record<string, unknown> {
  readonly account_id: unknown;
  readonly id: unknown;
  readonly code: unknown;
  readonly name: unknown;
  readonly description: unknown;
  readonly base_price: unknown;
  readonly active: unknown;
  readonly created_at: unknown;
}

function invalidFilter(field: string, message: string): AppError {
  return new AppError('SERVICES_REPORT_INVALID_FILTER', message, 422, { field });
}

function invalidPersistedState(code: string, field: string): AppError {
  return new AppError(code, 'Persisted services report state is invalid', 500, { field });
}

function normalizeDate(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw invalidFilter(field, field + ' must be an ISO calendar date');
  }

  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(value + 'T00:00:00.000Z');
  if (
    year < 1 ||
    year > 9999 ||
    Number.isNaN(parsed.getTime()) ||
    parsed.getUTCFullYear() !== year ||
    parsed.getUTCMonth() + 1 !== month ||
    parsed.getUTCDate() !== day
  ) {
    throw invalidFilter(field, field + ' must be an ISO calendar date');
  }
  return value;
}

function readRequiredText(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw invalidPersistedState('SERVICES_REPORT_INVALID_TEXT', field);
  }
  return value;
}

function readNullableText(value: unknown, field: string): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') {
    throw invalidPersistedState('SERVICES_REPORT_INVALID_TEXT', field);
  }
  return value;
}

function readAmount(value: unknown, field: string): number {
  if (
    (typeof value !== 'number' && typeof value !== 'string') ||
    (typeof value === 'string' && value.trim().length === 0)
  ) {
    throw invalidPersistedState('SERVICES_REPORT_UNSAFE_AMOUNT', field);
  }
  const amount = typeof value === 'number' ? value : Number(value);
  const cents = Math.round(amount * 100);
  if (
    !Number.isFinite(amount) ||
    amount < 0 ||
    !Number.isSafeInteger(cents) ||
    Math.abs(cents / 100 - amount) > Number.EPSILON * Math.max(1, Math.abs(amount))
  ) {
    throw invalidPersistedState('SERVICES_REPORT_UNSAFE_AMOUNT', field);
  }
  return cents / 100;
}

function readBoolean(value: unknown, field: string): boolean {
  if (typeof value !== 'boolean') {
    throw invalidPersistedState('SERVICES_REPORT_INVALID_ACTIVE', field);
  }
  return value;
}

function readDate(value: unknown, field: string): string {
  if (value === null || value === undefined) {
    throw invalidPersistedState('SERVICES_REPORT_INVALID_DATE', field);
  }
  if (typeof value !== 'string' && !(value instanceof Date)) {
    throw invalidPersistedState('SERVICES_REPORT_INVALID_DATE', field);
  }
  const parsed = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(parsed.getTime())) {
    throw invalidPersistedState('SERVICES_REPORT_INVALID_DATE', field);
  }
  return parsed.toISOString();
}

function mapReportRow(row: ServicesReportQueryRow, accountId: AccountId): ServicesReportRow {
  if (row.account_id !== accountId) {
    throw new AppError(
      'SERVICES_REPORT_TENANT_MISMATCH',
      'Persisted services report row belongs to another account',
      500,
      { field: 'account_id' }
    );
  }

  return {
    accountId,
    id: readRequiredText(row.id, 'id'),
    code: readNullableText(row.code, 'code'),
    name: readRequiredText(row.name, 'name'),
    description: readNullableText(row.description, 'description'),
    basePrice: readAmount(row.base_price, 'base_price'),
    active: readBoolean(row.active, 'active'),
    createdAt: readDate(row.created_at, 'created_at')
  };
}

/** Read-only account-scoped projection shared by scheduled worker consumers. */
export class DatabaseServicesReportSource implements ServicesReportSource {
  private readonly pool: Pool;

  public constructor(pool?: Pool) {
    this.pool = pool ?? getPool();
  }

  public async list(
    accountId: AccountId,
    filters: ServicesReportFilters = {}
  ): Promise<readonly ServicesReportRow[]> {
    const dateFrom = normalizeDate(filters.dateFrom, 'dateFrom');
    const dateTo = normalizeDate(filters.dateTo, 'dateTo');
    if (dateFrom && dateTo && dateFrom > dateTo) {
      throw invalidFilter('dateFrom', 'dateFrom must be before or equal to dateTo');
    }

    const params: unknown[] = [accountId];
    const clauses = ['services.account_id = $1'];
    const createdAtUtcDate = "(services.created_at AT TIME ZONE 'UTC')::date";
    if (dateFrom) {
      params.push(dateFrom);
      clauses.push(createdAtUtcDate + ' >= $' + params.length + '::date');
    }
    if (dateTo) {
      params.push(dateTo);
      clauses.push(createdAtUtcDate + ' <= $' + params.length + '::date');
    }

    return withTenantQueryExplicit(this.pool, accountId, async (client) => {
      const query = [
        'SELECT',
        '  services.account_id,',
        '  services.id,',
        '  services.code,',
        '  services.name,',
        '  services.description,',
        '  services.base_price,',
        '  services.active,',
        '  services.created_at',
        'FROM services',
        'WHERE ' + clauses.join(' AND '),
        'ORDER BY services.created_at ASC, services.id ASC',
        'LIMIT ' + (MAX_SERVICES_REPORT_ROWS + 1)
      ].join('\n');
      const result = await client.query<ServicesReportQueryRow>(query, params);
      if (result.rows.length > MAX_SERVICES_REPORT_ROWS) {
        throw new AppError(
          'SERVICES_REPORT_RESULT_LIMIT',
          'Services report exceeds the maximum exportable page; refine the filters',
          422
        );
      }
      return result.rows.map((row) => mapReportRow(row, accountId));
    });
  }
}
