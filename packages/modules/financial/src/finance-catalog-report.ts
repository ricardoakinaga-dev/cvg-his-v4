import { getPool } from '@cvg-his-v2/shared-database';
import { AppError } from '@cvg-his-v2/shared-errors';
import type { AccountId } from '@cvg-his-v2/shared-types';
import { withTenantQueryExplicit } from '@cvg-his-v2/tenant-context';
import type { Pool } from 'pg';

export interface FinanceCatalogReportFilters {
  readonly search?: string;
  readonly category?: string;
  readonly costCenterCode?: string;
  readonly dateFrom?: string;
  readonly dateTo?: string;
}

export interface FinanceCatalogReportRow extends Record<string, unknown> {
  readonly accountId: AccountId;
  readonly id: string;
  readonly name: string;
  readonly kind: string;
  readonly category: string;
  readonly costCenterCode: string;
  readonly costCenterName: string;
  readonly description: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface FinanceCatalogReportSource {
  list(
    accountId: AccountId,
    filters?: FinanceCatalogReportFilters
  ): Promise<readonly FinanceCatalogReportRow[]>;
}

export const MAX_FINANCE_CATALOG_REPORT_ROWS = 10_000;

interface FinanceCatalogReportQueryRow extends Record<string, unknown> {
  readonly account_id: unknown;
  readonly id: unknown;
  readonly name: unknown;
  readonly kind: unknown;
  readonly category: unknown;
  readonly cost_center_code: unknown;
  readonly cost_center_name: unknown;
  readonly description: unknown;
  readonly created_at: unknown;
  readonly updated_at: unknown;
}

function invalidFilter(field: string, message: string): AppError {
  return new AppError('FINANCE_CATALOG_REPORT_INVALID_FILTER', message, 422, { field });
}

function invalidPersistedState(field: string): AppError {
  return new AppError(
    'FINANCE_CATALOG_REPORT_INVALID_STATE',
    'Persisted finance catalog report state is invalid',
    500,
    { field }
  );
}

function normalizeText(value: unknown, field: string): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') {
    throw invalidFilter(field, `${field} must be a string with at most 200 characters`);
  }
  const normalized = value.trim().toLowerCase();
  if (Array.from(normalized).length > 200) {
    throw invalidFilter(field, `${field} must be a string with at most 200 characters`);
  }
  return normalized || undefined;
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
  if (typeof value !== 'string' || value.length === 0) {
    throw invalidPersistedState(field);
  }
  return value;
}

function readDate(value: unknown, field: string): string {
  if (value === null || value === undefined) {
    throw invalidPersistedState(field);
  }
  if (typeof value !== 'string' && !(value instanceof Date)) {
    throw invalidPersistedState(field);
  }
  const parsed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw invalidPersistedState(field);
  }
  return parsed.toISOString();
}

function mapReportRow(
  row: FinanceCatalogReportQueryRow,
  accountId: AccountId
): FinanceCatalogReportRow {
  if (row.account_id !== accountId) {
    throw new AppError(
      'FINANCE_CATALOG_REPORT_TENANT_MISMATCH',
      'Persisted finance catalog report row belongs to another account',
      500,
      { field: 'account_id' }
    );
  }

  return {
    accountId,
    id: readRequiredText(row.id, 'id'),
    name: readRequiredText(row.name, 'name'),
    kind: readRequiredText(row.kind, 'kind'),
    category: readRequiredText(row.category, 'category'),
    costCenterCode: readRequiredText(row.cost_center_code, 'cost_center_code'),
    costCenterName: readRequiredText(row.cost_center_name, 'cost_center_name'),
    description: readRequiredText(row.description, 'description'),
    createdAt: readDate(row.created_at, 'created_at'),
    updatedAt: readDate(row.updated_at, 'updated_at')
  };
}

/** Read-only account-scoped projection shared by scheduled worker consumers. */
export class DatabaseFinanceCatalogReportSource implements FinanceCatalogReportSource {
  private readonly pool: Pool;

  public constructor(pool?: Pool) {
    this.pool = pool ?? getPool();
  }

  public async list(
    accountId: AccountId,
    filters: FinanceCatalogReportFilters = {}
  ): Promise<readonly FinanceCatalogReportRow[]> {
    const search = normalizeText(filters.search, 'search');
    const category = normalizeText(filters.category, 'category');
    const costCenterCode = normalizeText(filters.costCenterCode, 'costCenterCode');
    const dateFrom = normalizeDate(filters.dateFrom, 'dateFrom');
    const dateTo = normalizeDate(filters.dateTo, 'dateTo');
    if (dateFrom && dateTo && dateFrom > dateTo) {
      throw invalidFilter('dateFrom', 'dateFrom must be before or equal to dateTo');
    }

    const params: unknown[] = [accountId];
    const clauses = ['item.account_id = $1'];
    const createdAtUtcDate = "(item.created_at AT TIME ZONE 'UTC')::date";

    if (search) {
      params.push(`%${search}%`);
      const parameter = `$${params.length}`;
      clauses.push(
        `(item.id ILIKE ${parameter} OR item.name ILIKE ${parameter} OR item.description ILIKE ${parameter})`
      );
    }
    if (category) {
      params.push(`%${category}%`);
      clauses.push(`item.category ILIKE $${params.length}`);
    }
    if (costCenterCode) {
      params.push(`%${costCenterCode}%`);
      clauses.push(
        `(item.cost_center_code ILIKE $${params.length} OR item.cost_center_name ILIKE $${params.length})`
      );
    }
    if (dateFrom) {
      params.push(dateFrom);
      clauses.push(`${createdAtUtcDate} >= $${params.length}::date`);
    }
    if (dateTo) {
      params.push(dateTo);
      clauses.push(`${createdAtUtcDate} <= $${params.length}::date`);
    }

    return withTenantQueryExplicit(this.pool, accountId, async (client) => {
      const result = await client.query<FinanceCatalogReportQueryRow>(
        `SELECT
           item.account_id,
           item.id,
           item.name,
           item.kind,
           item.category,
           item.cost_center_code,
           item.cost_center_name,
           item.description,
           item.created_at,
           item.updated_at
         FROM finance_expense_catalog_items AS item
         WHERE ${clauses.join(' AND ')}
         ORDER BY item.name ASC, item.id ASC
         LIMIT ${MAX_FINANCE_CATALOG_REPORT_ROWS + 1}`,
        params
      );
      if (result.rows.length > MAX_FINANCE_CATALOG_REPORT_ROWS) {
        throw new AppError(
          'FINANCE_CATALOG_REPORT_RESULT_LIMIT',
          'Finance catalog report exceeds the maximum exportable page; refine the filters',
          422
        );
      }
      return result.rows.map((row) => mapReportRow(row, accountId));
    });
  }
}
