import { getPool } from '@cvg-his-v2/shared-database';
import { AppError } from '@cvg-his-v2/shared-errors';
import type { AccountId } from '@cvg-his-v2/shared-types';
import { withTenantQueryExplicit } from '@cvg-his-v2/tenant-context';
import type { Pool } from 'pg';

export interface InventoryProductsReportFilters {
  readonly search?: string;
  readonly dateFrom?: string;
  readonly dateTo?: string;
}

export interface InventoryProductsReportRow extends Record<string, unknown> {
  readonly accountId: AccountId;
  readonly id: string;
  readonly sku: string;
  readonly name: string;
  readonly unit: string;
  readonly onHandQuantity: number;
  readonly reorderLevel: number;
  readonly unitCostAmount: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface InventoryProductsReportSource {
  list(
    accountId: AccountId,
    filters?: InventoryProductsReportFilters
  ): Promise<readonly InventoryProductsReportRow[]>;
}

export const MAX_INVENTORY_PRODUCTS_REPORT_ROWS = 10_000;

interface InventoryProductsReportQueryRow extends Record<string, unknown> {
  readonly account_id: unknown;
  readonly id: unknown;
  readonly sku: unknown;
  readonly name: unknown;
  readonly unit: unknown;
  readonly on_hand_quantity: unknown;
  readonly reorder_level: unknown;
  readonly unit_cost_amount: unknown;
  readonly created_at: unknown;
  readonly updated_at: unknown;
}

function invalidFilter(field: string, message: string): AppError {
  return new AppError('INVENTORY_PRODUCTS_REPORT_INVALID_FILTER', message, 422, { field });
}

function invalidPersistedState(code: string, field: string): AppError {
  return new AppError(code, 'Persisted inventory-products report state is invalid', 500, {
    field
  });
}

function normalizeSearch(value: unknown): string | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') {
    throw invalidFilter('search', 'search must be a string with at most 200 characters');
  }
  const normalized = value.trim().toLowerCase();
  if (Array.from(normalized).length > 200) {
    throw invalidFilter('search', 'search must be a string with at most 200 characters');
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
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw invalidPersistedState('INVENTORY_PRODUCTS_REPORT_INVALID_TEXT', field);
  }
  return value;
}

function readNumber(value: unknown, field: string): number {
  if (
    (typeof value !== 'number' && typeof value !== 'string') ||
    (typeof value === 'string' && value.trim().length === 0)
  ) {
    throw invalidPersistedState('INVENTORY_PRODUCTS_REPORT_UNSAFE_NUMBER', field);
  }
  const normalized = typeof value === 'number' ? value : Number(value);
  const cents = Math.round(normalized * 100);
  if (
    !Number.isFinite(normalized) ||
    normalized < 0 ||
    !Number.isSafeInteger(cents) ||
    Math.abs(cents / 100 - normalized) > Number.EPSILON * Math.max(1, Math.abs(normalized))
  ) {
    throw invalidPersistedState('INVENTORY_PRODUCTS_REPORT_UNSAFE_NUMBER', field);
  }
  return cents / 100;
}

function readTimestamp(value: unknown, field: string): string {
  if (value === null || value === undefined) {
    throw invalidPersistedState('INVENTORY_PRODUCTS_REPORT_INVALID_TIMESTAMP', field);
  }
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      throw invalidPersistedState('INVENTORY_PRODUCTS_REPORT_INVALID_TIMESTAMP', field);
    }
    return value.toISOString();
  }
  if (typeof value !== 'string') {
    throw invalidPersistedState('INVENTORY_PRODUCTS_REPORT_INVALID_TIMESTAMP', field);
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString() !== value) {
    throw invalidPersistedState('INVENTORY_PRODUCTS_REPORT_INVALID_TIMESTAMP', field);
  }
  return value;
}

function escapeIlikePattern(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&');
}

function mapReportRow(
  row: InventoryProductsReportQueryRow,
  accountId: AccountId
): InventoryProductsReportRow {
  if (row.account_id !== accountId) {
    throw new AppError(
      'INVENTORY_PRODUCTS_REPORT_TENANT_MISMATCH',
      'Persisted inventory-products report row belongs to another account',
      500,
      { field: 'account_id' }
    );
  }

  return {
    accountId,
    id: readRequiredText(row.id, 'id'),
    sku: readRequiredText(row.sku, 'sku'),
    name: readRequiredText(row.name, 'name'),
    unit: readRequiredText(row.unit, 'unit'),
    onHandQuantity: readNumber(row.on_hand_quantity, 'on_hand_quantity'),
    reorderLevel: readNumber(row.reorder_level, 'reorder_level'),
    unitCostAmount: readNumber(row.unit_cost_amount, 'unit_cost_amount'),
    createdAt: readTimestamp(row.created_at, 'created_at'),
    updatedAt: readTimestamp(row.updated_at, 'updated_at')
  };
}

/** Read-only account-scoped projection shared by scheduled worker consumers. */
export class DatabaseInventoryProductsReportSource implements InventoryProductsReportSource {
  private readonly pool: Pool;

  public constructor(pool?: Pool) {
    this.pool = pool ?? getPool();
  }

  public async list(
    accountId: AccountId,
    filters: InventoryProductsReportFilters = {}
  ): Promise<readonly InventoryProductsReportRow[]> {
    const search = normalizeSearch(filters.search);
    const dateFrom = normalizeDate(filters.dateFrom, 'dateFrom');
    const dateTo = normalizeDate(filters.dateTo, 'dateTo');
    if (dateFrom && dateTo && dateFrom > dateTo) {
      throw invalidFilter('dateFrom', 'dateFrom must be before or equal to dateTo');
    }

    const params: unknown[] = [accountId];
    const clauses = ['inventory_items.account_id = $1'];
    const createdAtUtcDate = "(inventory_items.created_at AT TIME ZONE 'UTC')::date";
    if (search) {
      params.push(`%${escapeIlikePattern(search)}%`);
      clauses.push(
        `(inventory_items.sku ILIKE $${params.length} ESCAPE E'\\\\' OR inventory_items.name ILIKE $${params.length} ESCAPE E'\\\\')`
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
      const result = await client.query<InventoryProductsReportQueryRow>(
        `SELECT
           inventory_items.account_id,
           inventory_items.id,
           inventory_items.sku,
           inventory_items.name,
           inventory_items.unit,
           inventory_items.on_hand_quantity,
           inventory_items.reorder_level,
           inventory_items.unit_cost_amount,
           inventory_items.created_at,
           inventory_items.updated_at
         FROM inventory_items
         WHERE ${clauses.join(' AND ')}
         ORDER BY inventory_items.name ASC, inventory_items.id ASC
         LIMIT ${MAX_INVENTORY_PRODUCTS_REPORT_ROWS + 1}`,
        params
      );
      if (result.rows.length > MAX_INVENTORY_PRODUCTS_REPORT_ROWS) {
        throw new AppError(
          'INVENTORY_PRODUCTS_REPORT_RESULT_LIMIT',
          'Inventory-products report exceeds the maximum exportable page; refine the filters',
          422
        );
      }
      return result.rows.map((row) => mapReportRow(row, accountId));
    });
  }
}
