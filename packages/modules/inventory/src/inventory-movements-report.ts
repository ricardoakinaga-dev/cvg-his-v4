import { getPool } from '@cvg-his-v2/shared-database';
import { AppError } from '@cvg-his-v2/shared-errors';
import type { AccountId, InventoryStockMovementSummary, UserId } from '@cvg-his-v2/shared-types';
import { getTenantContext, withTenantQueryExplicit } from '@cvg-his-v2/tenant-context';
import type { Pool } from 'pg';

import {
  DatabaseInventoryRepository,
  MAX_INVENTORY_ITEM_READ_ROWS,
  type InventoryItemListFilters,
  type InventoryStockMovementReportSourceRow
} from './repositories/database-inventory.repository.js';

export interface InventoryMovementsReportFilters {
  readonly search?: string;
  readonly dateFrom?: string;
  readonly dateTo?: string;
}

export interface InventoryMovementsReportRow extends Record<string, unknown> {
  readonly accountId: AccountId;
  readonly movementId: string;
  readonly occurredAt: string;
  readonly movementType: InventoryStockMovementSummary['movementType'];
  readonly sku: string;
  readonly name: string;
  readonly unit: string;
  readonly quantityDelta: number;
  readonly balanceBefore: number;
  readonly balanceAfter: number;
  readonly unitCostAmount: number;
  readonly reason: string;
  readonly reference: string;
  readonly recordedByUserId: UserId;
}

export interface InventoryMovementsReportSource {
  list(
    accountId: AccountId,
    filters?: InventoryMovementsReportFilters
  ): Promise<readonly InventoryMovementsReportRow[]>;
}

export interface InventoryMovementsReportSourceReader {
  readonly stockMovementsEnabled?: boolean;
  readonly findStockMovementReportRows?: (
    accountId: AccountId,
    filters?: InventoryItemListFilters
  ) => Promise<readonly InventoryStockMovementReportSourceRow[]>;
}

export const MAX_INVENTORY_MOVEMENTS_REPORT_ROWS = 10_000;

const movementTypes: readonly InventoryStockMovementSummary['movementType'][] = [
  'adjustment',
  'inbound',
  'outbound',
  'transfer',
  'consumption'
];

function invalidFilter(field: string, message: string): AppError {
  return new AppError('INVENTORY_MOVEMENTS_REPORT_INVALID_FILTER', message, 422, { field });
}

function invalidRow(field: string): AppError {
  return new AppError(
    'INVENTORY_MOVEMENTS_REPORT_INVALID_ROW',
    'Persisted inventory-movements report state is invalid',
    500,
    { field }
  );
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

function normalizeFilters(filters: InventoryMovementsReportFilters = {}): InventoryItemListFilters {
  if (filters === null || typeof filters !== 'object' || Array.isArray(filters)) {
    throw invalidFilter('filters', 'filters must be an object');
  }
  const search = normalizeSearch(filters.search);
  const dateFrom = normalizeDate(filters.dateFrom, 'dateFrom');
  const dateTo = normalizeDate(filters.dateTo, 'dateTo');
  if (dateFrom && dateTo && dateFrom > dateTo) {
    throw invalidFilter('dateFrom', 'dateFrom must be before or equal to dateTo');
  }
  return {
    ...(search ? { search } : {}),
    ...(dateFrom ? { dateFrom } : {}),
    ...(dateTo ? { dateTo } : {}),
    limit: MAX_INVENTORY_ITEM_READ_ROWS
  };
}

function readText(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw invalidRow(field);
  }
  return value;
}

function readReference(value: unknown): string {
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string') throw invalidRow('reference');
  return value;
}

function readNumber(value: unknown, field: string, allowNegative = false): number {
  if (typeof value !== 'number') throw invalidRow(field);
  const cents = Math.round(value * 100);
  if (
    !Number.isFinite(value) ||
    (!allowNegative && value < 0) ||
    !Number.isSafeInteger(cents) ||
    Math.abs(cents / 100 - value) > Number.EPSILON * Math.max(1, Math.abs(value))
  ) {
    throw invalidRow(field);
  }
  return cents / 100;
}

function readTimestamp(value: unknown): string {
  if (typeof value !== 'string') throw invalidRow('createdAt');
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString() !== value) {
    throw invalidRow('createdAt');
  }
  return value;
}

function readMovementType(value: unknown): InventoryStockMovementSummary['movementType'] {
  if (typeof value !== 'string' || !movementTypes.includes(value as never)) {
    throw invalidRow('movementType');
  }
  return value as InventoryStockMovementSummary['movementType'];
}

function mapReportRow(sourceRow: unknown, accountId: AccountId): InventoryMovementsReportRow {
  if (!sourceRow || typeof sourceRow !== 'object' || Array.isArray(sourceRow)) {
    throw invalidRow('row');
  }
  const candidate = sourceRow as Partial<InventoryStockMovementReportSourceRow>;
  const movement = candidate.movement;
  if (!movement || typeof movement !== 'object' || Array.isArray(movement)) {
    throw invalidRow('movement');
  }
  if (movement.accountId !== accountId) {
    throw new AppError(
      'INVENTORY_MOVEMENTS_REPORT_TENANT_MISMATCH',
      'Persisted inventory-movements report row belongs to another account',
      500,
      { field: 'accountId' }
    );
  }

  readText(movement.inventoryItemId, 'inventoryItemId');
  return {
    accountId,
    movementId: readText(movement.id, 'id'),
    occurredAt: readTimestamp(movement.createdAt),
    movementType: readMovementType(movement.movementType),
    sku: readText(candidate.sku, 'sku'),
    name: readText(candidate.name, 'name'),
    unit: readText(candidate.unit, 'unit'),
    quantityDelta: readNumber(movement.quantityDelta, 'quantityDelta', true),
    balanceBefore: readNumber(movement.balanceBefore, 'balanceBefore'),
    balanceAfter: readNumber(movement.balanceAfter, 'balanceAfter'),
    unitCostAmount: readNumber(movement.unitCostAmount, 'unitCostAmount'),
    reason: readText(movement.reason, 'reason'),
    reference: readReference(movement.reference),
    recordedByUserId: readText(movement.recordedByUserId, 'recordedByUserId') as UserId
  };
}

function matchesReportRow(
  row: InventoryMovementsReportRow,
  search: string | undefined,
  dateFrom: string | undefined,
  dateTo: string | undefined
): boolean {
  const occurredOn = row.occurredAt.slice(0, 10);
  if (dateFrom && occurredOn < dateFrom) return false;
  if (dateTo && occurredOn > dateTo) return false;
  if (!search) return true;
  return row.sku.toLowerCase().includes(search) || row.name.toLowerCase().includes(search);
}

function compareIds(left: string, right: string): number {
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

/** Read-only scheduled projection over the persisted inventory movement ledger. */
export class DatabaseInventoryMovementsReportSource implements InventoryMovementsReportSource {
  private readonly reader: InventoryMovementsReportSourceReader;
  private readonly pool?: Pool;

  public constructor(reader?: InventoryMovementsReportSourceReader, pool?: Pool) {
    this.reader = reader ?? new DatabaseInventoryRepository();
    this.pool = pool ?? (reader ? undefined : getPool());
  }

  public async list(
    accountId: AccountId,
    filters: InventoryMovementsReportFilters = {}
  ): Promise<readonly InventoryMovementsReportRow[]> {
    const normalizedFilters = normalizeFilters(filters);
    const activeAccountId = getTenantContext()?.accountId;
    if (activeAccountId && activeAccountId !== accountId) {
      throw new AppError(
        'INVENTORY_MOVEMENTS_REPORT_TENANT_MISMATCH',
        'Inventory movement report account does not match tenant context',
        422,
        { field: 'accountId' }
      );
    }
    if (
      this.reader.stockMovementsEnabled === false ||
      typeof this.reader.findStockMovementReportRows !== 'function'
    ) {
      throw new AppError(
        'INVENTORY_MOVEMENTS_REPORT_SOURCE_UNAVAILABLE',
        'Inventory movement report requires a database-backed stock movement source',
        422
      );
    }

    const read = async (): Promise<readonly InventoryStockMovementReportSourceRow[]> => {
      const rows = await this.reader.findStockMovementReportRows?.(accountId, normalizedFilters);
      if (!Array.isArray(rows)) throw invalidRow('rows');
      if (rows.length > MAX_INVENTORY_MOVEMENTS_REPORT_ROWS) {
        throw new AppError(
          'INVENTORY_MOVEMENTS_REPORT_RESULT_LIMIT',
          'Inventory-movements report exceeds the maximum exportable page; refine the filters',
          422
        );
      }
      return rows;
    };

    const sourceRows = this.pool
      ? await withTenantQueryExplicit(this.pool, accountId, read)
      : await read();
    const search = normalizedFilters.search;
    const mappedRows = sourceRows
      .map((row) => mapReportRow(row, accountId))
      .filter((row) =>
        matchesReportRow(row, search, normalizedFilters.dateFrom, normalizedFilters.dateTo)
      );

    return [...mappedRows].sort(
      (left, right) =>
        right.occurredAt.localeCompare(left.occurredAt) ||
        compareIds(left.movementId, right.movementId)
    );
  }
}
