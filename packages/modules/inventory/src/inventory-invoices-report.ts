import { getPool } from '@cvg-his-v2/shared-database';
import { AppError } from '@cvg-his-v2/shared-errors';
import type { AccountId, UserId } from '@cvg-his-v2/shared-types';
import { getTenantContext, withTenantQueryExplicit } from '@cvg-his-v2/tenant-context';
import type { Pool } from 'pg';

import {
  DatabaseProcurementRepository,
  type InventoryPurchaseReportFilters,
  type InventoryPurchaseReportSourceRow,
  type InventoryPurchaseStatus
} from './procurement.js';

export interface InventoryInvoicesReportFilters {
  readonly search?: string;
  readonly status?: InventoryPurchaseStatus;
  readonly dateFrom?: string;
  readonly dateTo?: string;
}

export interface InventoryInvoicesReportRow extends Record<string, unknown> {
  readonly accountId: AccountId;
  readonly purchaseId: string;
  readonly invoiceNumber: string;
  readonly supplierName: string;
  readonly status: InventoryPurchaseStatus;
  readonly totalAmount: number;
  readonly receivedAmount: number;
  readonly payableId: string | null;
  readonly createdByUserId: UserId;
  readonly approvedByUserId: UserId | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly receivedAt: string | null;
}

export interface InventoryInvoicesReportSource {
  list(
    accountId: AccountId,
    filters?: InventoryInvoicesReportFilters
  ): Promise<readonly InventoryInvoicesReportRow[]>;
}

export interface InventoryInvoicesReportSourceReader {
  readonly findPurchaseReportRows?: (
    accountId: AccountId,
    filters?: InventoryPurchaseReportFilters
  ) => Promise<readonly InventoryPurchaseReportSourceRow[]>;
}

export const MAX_INVENTORY_INVOICES_REPORT_ROWS = 10_000;

const inventoryPurchaseStatuses: readonly InventoryPurchaseStatus[] = [
  'draft',
  'approved',
  'partially_received',
  'received',
  'cancelled'
];

function invalidFilter(field: string, message: string): AppError {
  return new AppError('INVENTORY_INVOICES_REPORT_INVALID_FILTER', message, 422, { field });
}

function invalidRow(field: string): AppError {
  return new AppError(
    'INVENTORY_INVOICES_REPORT_INVALID_ROW',
    'Persisted inventory-invoices report state is invalid',
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

function normalizeStatus(value: unknown): InventoryPurchaseStatus | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') {
    throw invalidFilter(
      'status',
      'status must be draft, approved, partially_received, received or cancelled'
    );
  }
  const normalized = value.trim().toLowerCase();
  if (!inventoryPurchaseStatuses.includes(normalized as InventoryPurchaseStatus)) {
    throw invalidFilter(
      'status',
      'status must be draft, approved, partially_received, received or cancelled'
    );
  }
  return normalized as InventoryPurchaseStatus;
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

function normalizeFilters(
  filters: InventoryInvoicesReportFilters = {}
): InventoryPurchaseReportFilters {
  if (filters === null || typeof filters !== 'object' || Array.isArray(filters)) {
    throw invalidFilter('filters', 'filters must be an object');
  }
  const search = normalizeSearch(filters.search);
  const status = normalizeStatus(filters.status);
  const dateFrom = normalizeDate(filters.dateFrom, 'dateFrom');
  const dateTo = normalizeDate(filters.dateTo, 'dateTo');
  if (dateFrom && dateTo && dateFrom > dateTo) {
    throw invalidFilter('dateFrom', 'dateFrom must be before or equal to dateTo');
  }
  return {
    ...(search ? { search } : {}),
    ...(status ? { status } : {}),
    ...(dateFrom ? { dateFrom } : {}),
    ...(dateTo ? { dateTo } : {}),
    limit: MAX_INVENTORY_INVOICES_REPORT_ROWS + 1
  };
}

function readRequiredText(value: unknown, field: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw invalidRow(field);
  }
  return value;
}

function readNullableText(value: unknown, field: string): string | null {
  if (value === null) return null;
  return readRequiredText(value, field);
}

function readStatus(value: unknown): InventoryPurchaseStatus {
  if (typeof value !== 'string' || !inventoryPurchaseStatuses.includes(value as never)) {
    throw invalidRow('status');
  }
  return value as InventoryPurchaseStatus;
}

function readAmount(value: unknown, field: string): number {
  if (typeof value !== 'number') throw invalidRow(field);
  const cents = Math.round(value * 100);
  if (
    !Number.isFinite(value) ||
    value < 0 ||
    !Number.isSafeInteger(cents) ||
    Math.abs(cents / 100 - value) > Number.EPSILON * Math.max(1, Math.abs(value))
  ) {
    throw invalidRow(field);
  }
  return cents / 100;
}

function readTimestamp(value: unknown, field: string): string {
  if (typeof value !== 'string') throw invalidRow(field);
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString() !== value) {
    throw invalidRow(field);
  }
  return value;
}

function mapReportRow(sourceRow: unknown, accountId: AccountId): InventoryInvoicesReportRow {
  if (!sourceRow || typeof sourceRow !== 'object' || Array.isArray(sourceRow)) {
    throw invalidRow('row');
  }
  const candidate = sourceRow as Partial<InventoryPurchaseReportSourceRow>;
  if (candidate.accountId !== accountId) {
    if (typeof candidate.accountId === 'string') {
      throw new AppError(
        'INVENTORY_INVOICES_REPORT_TENANT_MISMATCH',
        'Persisted inventory-invoices report row belongs to another account',
        500,
        { field: 'accountId' }
      );
    }
    throw invalidRow('accountId');
  }

  const totalAmount = readAmount(candidate.totalAmount, 'totalAmount');
  const receivedAmount = readAmount(candidate.receivedAmount, 'receivedAmount');
  if (receivedAmount > totalAmount) throw invalidRow('receivedAmount');

  return {
    accountId,
    purchaseId: readRequiredText(candidate.purchaseId, 'purchaseId'),
    invoiceNumber: readRequiredText(candidate.invoiceNumber, 'invoiceNumber'),
    supplierName: readRequiredText(candidate.supplierName, 'supplierName'),
    status: readStatus(candidate.status),
    totalAmount,
    receivedAmount,
    payableId: readNullableText(candidate.payableId, 'payableId'),
    createdByUserId: readRequiredText(candidate.createdByUserId, 'createdByUserId') as UserId,
    approvedByUserId: readNullableText(
      candidate.approvedByUserId,
      'approvedByUserId'
    ) as UserId | null,
    createdAt: readTimestamp(candidate.createdAt, 'createdAt'),
    updatedAt: readTimestamp(candidate.updatedAt, 'updatedAt'),
    receivedAt:
      candidate.receivedAt === null ? null : readTimestamp(candidate.receivedAt, 'receivedAt')
  };
}

function matchesReportRow(
  row: InventoryInvoicesReportRow,
  filters: InventoryPurchaseReportFilters
): boolean {
  if (filters.status && row.status !== filters.status) return false;
  const createdOn = row.createdAt.slice(0, 10);
  if (filters.dateFrom && createdOn < filters.dateFrom) return false;
  if (filters.dateTo && createdOn > filters.dateTo) return false;
  if (!filters.search) return true;
  return (
    row.invoiceNumber.toLowerCase().includes(filters.search) ||
    row.supplierName.toLowerCase().includes(filters.search)
  );
}

function comparePurchaseIds(left: string, right: string): number {
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

/** Read-only scheduled projection over persisted inventory purchase headers. */
export class DatabaseInventoryInvoicesReportSource implements InventoryInvoicesReportSource {
  private readonly reader: InventoryInvoicesReportSourceReader;
  private readonly pool?: Pool;

  public constructor(reader?: InventoryInvoicesReportSourceReader, pool?: Pool) {
    this.reader = reader ?? new DatabaseProcurementRepository();
    this.pool = pool ?? (reader ? undefined : getPool());
  }

  public async list(
    accountId: AccountId,
    filters: InventoryInvoicesReportFilters = {}
  ): Promise<readonly InventoryInvoicesReportRow[]> {
    const normalizedFilters = normalizeFilters(filters);
    const activeAccountId = getTenantContext()?.accountId;
    if (activeAccountId && activeAccountId !== accountId) {
      throw new AppError(
        'INVENTORY_INVOICES_REPORT_TENANT_MISMATCH',
        'Inventory-invoices report account does not match tenant context',
        422,
        { field: 'accountId' }
      );
    }
    if (typeof this.reader.findPurchaseReportRows !== 'function') {
      throw new AppError(
        'INVENTORY_INVOICES_REPORT_SOURCE_UNAVAILABLE',
        'Inventory-invoices report requires a database-backed purchase source',
        422
      );
    }

    const read = async (): Promise<readonly InventoryPurchaseReportSourceRow[]> => {
      const rows = await this.reader.findPurchaseReportRows?.(accountId, normalizedFilters);
      if (!Array.isArray(rows)) throw invalidRow('rows');
      if (rows.length > MAX_INVENTORY_INVOICES_REPORT_ROWS) {
        throw new AppError(
          'INVENTORY_INVOICES_REPORT_RESULT_LIMIT',
          'Inventory-invoices report exceeds the maximum exportable page; refine the filters',
          422
        );
      }
      return rows;
    };

    const sourceRows = this.pool
      ? await withTenantQueryExplicit(this.pool, accountId, read)
      : await read();
    const mappedRows = sourceRows
      .map((row) => mapReportRow(row, accountId))
      .filter((row) => matchesReportRow(row, normalizedFilters));

    return [...mappedRows].sort(
      (left, right) =>
        right.createdAt.localeCompare(left.createdAt) ||
        comparePurchaseIds(left.purchaseId, right.purchaseId)
    );
  }
}
