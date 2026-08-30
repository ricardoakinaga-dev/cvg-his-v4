import assert from 'node:assert/strict';
import { test } from 'vitest';

import { AppError } from '@cvg-his-v2/shared-errors';
import {
  DatabaseInventoryStockReportSource,
  MAX_INVENTORY_STOCK_REPORT_ROWS
} from './inventory-stock-report.js';
import type { InventoryProductsReportSource } from './inventory-products-report.js';

const accountId = '11111111-1111-4111-8111-111111111111' as never;

const persistedProduct = {
  accountId,
  id: 'inventory_item_stock_1',
  sku: 'MED-STOCK-001',
  name: 'Surgical saline',
  unit: 'bottle',
  onHandQuantity: 1.25,
  reorderLevel: 2,
  unitCostAmount: 4.56,
  createdAt: '2026-05-15T23:30:00.000Z',
  updatedAt: '2026-05-16T00:00:00.000Z'
};

function createProductsSource(row = persistedProduct) {
  const calls: Array<{ readonly accountId: unknown; readonly filters: unknown }> = [];
  return {
    source: {
      list: async (requestedAccountId: unknown, filters: unknown) => {
        calls.push({ accountId: requestedAccountId, filters });
        return [row];
      }
    } as InventoryProductsReportSource,
    calls
  };
}

test('DatabaseInventoryStockReportSource derives the exact current stock projection', async () => {
  const harness = createProductsSource();
  const source = new DatabaseInventoryStockReportSource(harness.source);

  const rows = await source.list(accountId as never, {
    search: '  SURGICAL  ',
    dateFrom: '2026-05-01',
    dateTo: '2026-05-31'
  });

  assert.deepEqual(rows, [
    {
      ...persistedProduct,
      stockValue: 5.7,
      reorderStatus: 'below_reorder_level'
    }
  ]);
  assert.deepEqual(harness.calls, [
    {
      accountId,
      filters: {
        search: '  SURGICAL  ',
        dateFrom: '2026-05-01',
        dateTo: '2026-05-31'
      }
    }
  ]);
});

test('DatabaseInventoryStockReportSource marks an equal threshold as below and rounds cents', async () => {
  const harness = createProductsSource({
    ...persistedProduct,
    onHandQuantity: 5,
    reorderLevel: 5,
    unitCostAmount: 4.2
  });
  const source = new DatabaseInventoryStockReportSource(harness.source);

  const [row] = await source.list(accountId as never);

  assert.equal(row?.stockValue, 21);
  assert.equal(row?.reorderStatus, 'below_reorder_level');
});

test('DatabaseInventoryStockReportSource marks healthy stock as adequate', async () => {
  const harness = createProductsSource({
    ...persistedProduct,
    onHandQuantity: 8,
    reorderLevel: 3,
    unitCostAmount: 6.5
  });
  const source = new DatabaseInventoryStockReportSource(harness.source);

  const [row] = await source.list(accountId as never);

  assert.equal(row?.stockValue, 52);
  assert.equal(row?.reorderStatus, 'adequate');
});

test('DatabaseInventoryStockReportSource fails closed for malformed and oversized source results', async () => {
  const malformedSource = new DatabaseInventoryStockReportSource({
    list: async () => 'not-an-array' as never
  });
  await assert.rejects(
    malformedSource.list(accountId as never),
    (error: unknown) =>
      error instanceof AppError &&
      error.code === 'INVENTORY_STOCK_REPORT_INVALID_ROW' &&
      error.statusCode === 500
  );

  const oversizedSource = new DatabaseInventoryStockReportSource({
    list: async () =>
      Array.from({ length: MAX_INVENTORY_STOCK_REPORT_ROWS + 1 }, () => persistedProduct)
  });
  await assert.rejects(
    oversizedSource.list(accountId as never),
    (error: unknown) =>
      error instanceof AppError &&
      error.code === 'INVENTORY_STOCK_REPORT_RESULT_LIMIT' &&
      error.statusCode === 422
  );
});

test('DatabaseInventoryStockReportSource rejects foreign and malformed persisted rows', async () => {
  const cases = [
    {
      row: { ...persistedProduct, accountId: '22222222-2222-4222-8222-222222222222' },
      code: 'INVENTORY_STOCK_REPORT_TENANT_MISMATCH'
    },
    { row: { ...persistedProduct, name: '   ' }, code: 'INVENTORY_STOCK_REPORT_INVALID_ROW' },
    {
      row: { ...persistedProduct, createdAt: 'not-a-timestamp' },
      code: 'INVENTORY_STOCK_REPORT_INVALID_ROW'
    },
    { row: { ...persistedProduct, updatedAt: 42 }, code: 'INVENTORY_STOCK_REPORT_INVALID_ROW' },
    {
      row: { ...persistedProduct, onHandQuantity: '1.25' },
      code: 'INVENTORY_STOCK_REPORT_UNSAFE_NUMBER'
    },
    {
      row: { ...persistedProduct, reorderLevel: -1 },
      code: 'INVENTORY_STOCK_REPORT_UNSAFE_NUMBER'
    }
  ] as const;

  for (const testCase of cases) {
    const source = new DatabaseInventoryStockReportSource({
      list: async () => [testCase.row] as never
    });
    await assert.rejects(
      source.list(accountId as never),
      (error: unknown) => error instanceof AppError && error.code === testCase.code
    );
  }
});

test('DatabaseInventoryStockReportSource rejects unsafe derived stock values', async () => {
  const harness = createProductsSource({
    ...persistedProduct,
    onHandQuantity: Number.MAX_SAFE_INTEGER,
    unitCostAmount: Number.MAX_SAFE_INTEGER
  });
  const source = new DatabaseInventoryStockReportSource(harness.source);

  await assert.rejects(
    source.list(accountId as never),
    (error: unknown) =>
      error instanceof AppError &&
      error.code === 'INVENTORY_STOCK_REPORT_UNSAFE_NUMBER' &&
      error.statusCode === 500
  );
});
