import { AppError } from '@cvg-his-v2/shared-errors';
import type { AccountId } from '@cvg-his-v2/shared-types';
import {
  DatabaseInventoryProductsReportSource,
  MAX_INVENTORY_PRODUCTS_REPORT_ROWS,
  type InventoryProductsReportFilters,
  type InventoryProductsReportRow,
  type InventoryProductsReportSource
} from './inventory-products-report.js';

export type InventoryStockReportReorderStatus = 'below_reorder_level' | 'adequate';

export interface InventoryStockReportRow extends Record<string, unknown> {
  readonly accountId: AccountId;
  readonly id: string;
  readonly sku: string;
  readonly name: string;
  readonly unit: string;
  readonly onHandQuantity: number;
  readonly reorderLevel: number;
  readonly unitCostAmount: number;
  readonly stockValue: number;
  readonly reorderStatus: InventoryStockReportReorderStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface InventoryStockReportSource {
  list(
    accountId: AccountId,
    filters?: InventoryProductsReportFilters
  ): Promise<readonly InventoryStockReportRow[]>;
}

export type InventoryStockReportFilters = InventoryProductsReportFilters;

export const MAX_INVENTORY_STOCK_REPORT_ROWS = MAX_INVENTORY_PRODUCTS_REPORT_ROWS;

function invalidRow(field: string, message: string): AppError {
  return new AppError('INVENTORY_STOCK_REPORT_INVALID_ROW', message, 500, { field });
}

function unsafeNumber(field: string): AppError {
  return new AppError(
    'INVENTORY_STOCK_REPORT_UNSAFE_NUMBER',
    'Persisted inventory-stock report state is invalid',
    500,
    { field }
  );
}

function readText(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw invalidRow(field, 'Persisted inventory-stock report text is invalid');
  }
  return value;
}

function readTimestamp(value: unknown, field: string): string {
  if (typeof value !== 'string')
    throw invalidRow(field, 'Persisted inventory-stock timestamp is invalid');
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString() !== value) {
    throw invalidRow(field, 'Persisted inventory-stock timestamp is invalid');
  }
  return value;
}

function readNonNegativeAmount(value: unknown, field: string): number {
  if (typeof value !== 'number') throw unsafeNumber(field);
  const cents = Math.round(value * 100);
  if (
    !Number.isFinite(value) ||
    value < 0 ||
    !Number.isSafeInteger(cents) ||
    Math.abs(cents / 100 - value) > Number.EPSILON * Math.max(1, Math.abs(value))
  ) {
    throw unsafeNumber(field);
  }
  return cents / 100;
}

function deriveStockValue(onHandQuantity: number, unitCostAmount: number): number {
  const stockValue = onHandQuantity * unitCostAmount;
  const cents = Math.round(stockValue * 100);
  if (!Number.isFinite(stockValue) || !Number.isSafeInteger(cents)) {
    throw unsafeNumber('stockValue');
  }
  return cents / 100;
}

function mapStockRow(row: unknown, accountId: AccountId): InventoryStockReportRow {
  if (!row || typeof row !== 'object' || Array.isArray(row)) {
    throw invalidRow('row', 'Persisted inventory-stock report row is invalid');
  }
  const candidate = row as Partial<InventoryProductsReportRow>;
  if (candidate.accountId !== accountId) {
    throw new AppError(
      'INVENTORY_STOCK_REPORT_TENANT_MISMATCH',
      'Persisted inventory-stock report row belongs to another account',
      500,
      { field: 'accountId' }
    );
  }

  const onHandQuantity = readNonNegativeAmount(candidate.onHandQuantity, 'onHandQuantity');
  const reorderLevel = readNonNegativeAmount(candidate.reorderLevel, 'reorderLevel');
  const unitCostAmount = readNonNegativeAmount(candidate.unitCostAmount, 'unitCostAmount');
  return {
    accountId,
    id: readText(candidate.id, 'id'),
    sku: readText(candidate.sku, 'sku'),
    name: readText(candidate.name, 'name'),
    unit: readText(candidate.unit, 'unit'),
    onHandQuantity,
    reorderLevel,
    unitCostAmount,
    stockValue: deriveStockValue(onHandQuantity, unitCostAmount),
    reorderStatus: onHandQuantity <= reorderLevel ? 'below_reorder_level' : 'adequate',
    createdAt: readTimestamp(candidate.createdAt, 'createdAt'),
    updatedAt: readTimestamp(candidate.updatedAt, 'updatedAt')
  };
}

/** Read-only current stock projection built from the persisted item source. */
export class DatabaseInventoryStockReportSource implements InventoryStockReportSource {
  private readonly products: InventoryProductsReportSource;

  public constructor(products?: InventoryProductsReportSource) {
    this.products = products ?? new DatabaseInventoryProductsReportSource();
  }

  public async list(
    accountId: AccountId,
    filters: InventoryProductsReportFilters = {}
  ): Promise<readonly InventoryStockReportRow[]> {
    const productRows = await this.products.list(accountId, filters);
    if (!Array.isArray(productRows)) {
      throw invalidRow('rows', 'Inventory-products source returned invalid rows');
    }
    if (productRows.length > MAX_INVENTORY_STOCK_REPORT_ROWS) {
      throw new AppError(
        'INVENTORY_STOCK_REPORT_RESULT_LIMIT',
        'Inventory-stock report exceeds the maximum exportable page; refine the filters',
        422
      );
    }
    return productRows.map((row) => mapStockRow(row, accountId));
  }
}
