import assert from 'node:assert/strict';
import { test } from 'vitest';
import type { Pool } from 'pg';

import { AppError } from '@cvg-his-v2/shared-errors';
import { runWithTenantContext } from '@cvg-his-v2/tenant-context';
import type { InventoryPurchaseReportSourceRow, InventoryPurchaseStatus } from './procurement.js';
import {
  DatabaseInventoryInvoicesReportSource,
  MAX_INVENTORY_INVOICES_REPORT_ROWS,
  type InventoryInvoicesReportSourceReader
} from './inventory-invoices-report.js';

const accountId = '11111111-1111-4111-8111-111111111111';

const purchaseA: InventoryPurchaseReportSourceRow = {
  purchaseId: 'purchase-a',
  accountId: accountId as never,
  invoiceNumber: 'NF-A-001',
  supplierName: 'Fornecedor Alpha',
  status: 'received',
  totalAmount: 125.5,
  receivedAmount: 125.5,
  payableId: 'payable-a',
  createdByUserId: 'user-a' as never,
  approvedByUserId: 'approver-a' as never,
  createdAt: '2026-05-31T23:59:59.999Z',
  updatedAt: '2026-06-01T00:00:00.000Z',
  receivedAt: '2026-06-01T00:00:00.000Z'
};

const purchaseB: InventoryPurchaseReportSourceRow = {
  ...purchaseA,
  purchaseId: 'purchase-b',
  invoiceNumber: 'NF-A-002',
  totalAmount: 20,
  receivedAmount: 10,
  payableId: null,
  approvedByUserId: null,
  createdAt: '2026-05-31T23:59:59.999Z',
  updatedAt: '2026-05-31T23:59:59.999Z',
  receivedAt: null
};

function createReader(rows: readonly unknown[]) {
  const calls: Array<{ readonly accountId: unknown; readonly filters: unknown }> = [];
  const reader: InventoryInvoicesReportSourceReader = {
    findPurchaseReportRows: async (requestedAccountId, filters) => {
      calls.push({ accountId: requestedAccountId, filters });
      return rows as readonly InventoryPurchaseReportSourceRow[];
    }
  };
  return { reader, calls };
}

test('DatabaseInventoryInvoicesReportSource returns the exact bounded purchase-header projection', async () => {
  const harness = createReader([purchaseB, purchaseA]);
  const source = new DatabaseInventoryInvoicesReportSource(harness.reader);

  const rows = await source.list(accountId as never, {
    search: '  FORNECEDOR  ',
    status: 'received',
    dateFrom: '2026-05-01',
    dateTo: '2026-05-31'
  });

  assert.deepEqual(rows, [
    {
      accountId,
      purchaseId: 'purchase-a',
      invoiceNumber: 'NF-A-001',
      supplierName: 'Fornecedor Alpha',
      status: 'received',
      totalAmount: 125.5,
      receivedAmount: 125.5,
      payableId: 'payable-a',
      createdByUserId: 'user-a',
      approvedByUserId: 'approver-a',
      createdAt: '2026-05-31T23:59:59.999Z',
      updatedAt: '2026-06-01T00:00:00.000Z',
      receivedAt: '2026-06-01T00:00:00.000Z'
    },
    {
      accountId,
      purchaseId: 'purchase-b',
      invoiceNumber: 'NF-A-002',
      supplierName: 'Fornecedor Alpha',
      status: 'received',
      totalAmount: 20,
      receivedAmount: 10,
      payableId: null,
      createdByUserId: 'user-a',
      approvedByUserId: null,
      createdAt: '2026-05-31T23:59:59.999Z',
      updatedAt: '2026-05-31T23:59:59.999Z',
      receivedAt: null
    }
  ]);
  assert.deepEqual(harness.calls, [
    {
      accountId,
      filters: {
        search: 'fornecedor',
        status: 'received',
        dateFrom: '2026-05-01',
        dateTo: '2026-05-31',
        limit: MAX_INVENTORY_INVOICES_REPORT_ROWS + 1
      }
    }
  ]);
});

test('DatabaseInventoryInvoicesReportSource rejects invalid filters before reading', async () => {
  const harness = createReader([]);
  const source = new DatabaseInventoryInvoicesReportSource(harness.reader);

  for (const filters of [
    { search: 42 },
    { search: 'x'.repeat(201) },
    { status: 'unknown' },
    { dateFrom: '2026-02-30' },
    { dateFrom: '2026-06-01', dateTo: '2026-05-01' },
    null
  ]) {
    await assert.rejects(
      source.list(accountId as never, filters as never),
      (error: unknown) =>
        error instanceof AppError &&
        error.code === 'INVENTORY_INVOICES_REPORT_INVALID_FILTER' &&
        error.statusCode === 422
    );
  }
  assert.equal(harness.calls.length, 0);
});

test('DatabaseInventoryInvoicesReportSource enforces tenant scope and explicit database context', async () => {
  const harness = createReader([]);
  const source = new DatabaseInventoryInvoicesReportSource(harness.reader);

  await assert.rejects(
    runWithTenantContext(
      {
        tenantId: 'tenant-other',
        accountId: '99999999-9999-4999-8999-999999999999',
        correlationId: 'corr-inventory-invoices-tenant'
      },
      () => source.list(accountId as never)
    ),
    (error: unknown) =>
      error instanceof AppError &&
      error.code === 'INVENTORY_INVOICES_REPORT_TENANT_MISMATCH' &&
      error.statusCode === 422
  );
  assert.equal(harness.calls.length, 0);

  const clientQueries: string[] = [];
  const pool = {
    connect: async () => ({
      query: async (query: string) => {
        clientQueries.push(query);
        return { rows: [] };
      },
      release: () => undefined
    })
  } as unknown as Pool;
  const explicitlyScopedSource = new DatabaseInventoryInvoicesReportSource(harness.reader, pool);
  assert.deepEqual(await explicitlyScopedSource.list(accountId as never), []);
  assert.deepEqual(clientQueries, [
    'BEGIN',
    "SELECT set_config('app.current_account_id', $1, true)",
    'COMMIT'
  ]);
});

test('DatabaseInventoryInvoicesReportSource fails closed for unavailable, oversized and unsafe rows', async () => {
  await assert.rejects(
    new DatabaseInventoryInvoicesReportSource({}).list(accountId as never),
    (error: unknown) =>
      error instanceof AppError && error.code === 'INVENTORY_INVOICES_REPORT_SOURCE_UNAVAILABLE'
  );

  const oversized = createReader(
    Array.from({ length: MAX_INVENTORY_INVOICES_REPORT_ROWS + 1 }, () => purchaseA)
  );
  await assert.rejects(
    new DatabaseInventoryInvoicesReportSource(oversized.reader).list(accountId as never),
    (error: unknown) =>
      error instanceof AppError &&
      error.code === 'INVENTORY_INVOICES_REPORT_RESULT_LIMIT' &&
      error.statusCode === 422
  );

  const malformedRows: readonly [string, unknown][] = [
    ['foreign account', { ...purchaseA, accountId: '99999999-9999-4999-8999-999999999999' }],
    ['purchase id', { ...purchaseA, purchaseId: '' }],
    ['invoice number', { ...purchaseA, invoiceNumber: '   ' }],
    ['status', { ...purchaseA, status: 'unknown' as InventoryPurchaseStatus }],
    ['total amount', { ...purchaseA, totalAmount: '125.50' }],
    ['received amount', { ...purchaseA, receivedAmount: 126 }],
    ['created timestamp', { ...purchaseA, createdAt: 'not-a-date' }],
    ['received timestamp', { ...purchaseA, receivedAt: 'not-a-date' }]
  ];
  for (const [, row] of malformedRows) {
    await assert.rejects(
      new DatabaseInventoryInvoicesReportSource(createReader([row]).reader).list(
        accountId as never
      ),
      (error: unknown) =>
        error instanceof AppError &&
        (error.code === 'INVENTORY_INVOICES_REPORT_TENANT_MISMATCH' ||
          error.code === 'INVENTORY_INVOICES_REPORT_INVALID_ROW')
    );
  }
});
