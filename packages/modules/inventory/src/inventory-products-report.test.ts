import assert from 'node:assert/strict';
import { test } from 'vitest';
import type { Pool } from 'pg';

import { AppError } from '@cvg-his-v2/shared-errors';
import {
  DatabaseInventoryProductsReportSource,
  MAX_INVENTORY_PRODUCTS_REPORT_ROWS
} from './inventory-products-report.js';

interface QueryCall {
  readonly text: string;
  readonly values?: readonly unknown[];
}

function createPool(rows: readonly Record<string, unknown>[]) {
  const calls: QueryCall[] = [];
  const client = {
    query: async (text: string, values?: readonly unknown[]) => {
      calls.push({ text, values });
      if (text === 'BEGIN' || text === 'COMMIT' || text.startsWith('ROLLBACK')) {
        return { rows: [], rowCount: 0 };
      }
      if (text.includes(`set_config('app.current_account_id'`)) {
        return { rows: [], rowCount: 1 };
      }
      return { rows, rowCount: rows.length };
    },
    release: () => undefined
  };

  return {
    pool: { connect: async () => client } as unknown as Pool,
    calls
  };
}

const accountId = '11111111-1111-4111-8111-111111111111';

const persistedRow = {
  account_id: accountId,
  id: 'inventory_item_report_1',
  sku: 'MED-SURG-001',
  name: 'Surgical saline',
  unit: 'bottle',
  on_hand_quantity: '12.50',
  reorder_level: '5.00',
  unit_cost_amount: '4.20',
  created_at: '2026-05-15T23:30:00.000Z',
  updated_at: '2026-05-16T00:00:00.000Z'
};

test('DatabaseInventoryProductsReportSource returns an exact bounded tenant-safe projection', async () => {
  const harness = createPool([persistedRow]);
  const source = new DatabaseInventoryProductsReportSource(harness.pool);

  const rows = await source.list(accountId as never, {
    search: '  SURGICAL  ',
    dateFrom: '2026-05-01',
    dateTo: '2026-05-31'
  });

  assert.deepEqual(rows, [
    {
      accountId,
      id: 'inventory_item_report_1',
      sku: 'MED-SURG-001',
      name: 'Surgical saline',
      unit: 'bottle',
      onHandQuantity: 12.5,
      reorderLevel: 5,
      unitCostAmount: 4.2,
      createdAt: '2026-05-15T23:30:00.000Z',
      updatedAt: '2026-05-16T00:00:00.000Z'
    }
  ]);

  const projection = harness.calls.find((call) => call.text.includes('FROM inventory_items'));
  assert.ok(projection);
  assert.match(projection.text, /inventory_items\.account_id = \$1/);
  assert.match(projection.text, /inventory_items\.sku ILIKE \$2/);
  assert.match(projection.text, /inventory_items\.name ILIKE \$2/);
  assert.match(projection.text, /AT TIME ZONE 'UTC'/);
  assert.match(projection.text, /ORDER BY inventory_items\.name ASC, inventory_items\.id ASC/);
  assert.match(projection.text, /LIMIT 10001/);
  assert.doesNotMatch(projection.text, /SELECT \*/i);
  assert.deepEqual(projection.values, [accountId, '%surgical%', '2026-05-01', '2026-05-31']);
});

test('DatabaseInventoryProductsReportSource rejects invalid filters before querying', async () => {
  const harness = createPool([]);
  const source = new DatabaseInventoryProductsReportSource(harness.pool);

  await assert.rejects(
    source.list(accountId as never, { search: 42 as never }),
    (error: unknown) =>
      error instanceof AppError &&
      error.code === 'INVENTORY_PRODUCTS_REPORT_INVALID_FILTER' &&
      error.statusCode === 422
  );
  await assert.rejects(
    source.list(accountId as never, { dateFrom: '2026-02-30' }),
    (error: unknown) =>
      error instanceof AppError && error.code === 'INVENTORY_PRODUCTS_REPORT_INVALID_FILTER'
  );
  await assert.rejects(
    source.list(accountId as never, { dateFrom: '2026-06-01', dateTo: '2026-05-01' }),
    (error: unknown) =>
      error instanceof AppError && error.code === 'INVENTORY_PRODUCTS_REPORT_INVALID_FILTER'
  );
  assert.equal(harness.calls.length, 0);
});

test('DatabaseInventoryProductsReportSource rejects an oversized result before mapping rows', async () => {
  const harness = createPool(
    Array.from({ length: MAX_INVENTORY_PRODUCTS_REPORT_ROWS + 1 }, () => ({}))
  );
  const source = new DatabaseInventoryProductsReportSource(harness.pool);

  await assert.rejects(
    source.list(accountId as never),
    (error: unknown) =>
      error instanceof AppError &&
      error.code === 'INVENTORY_PRODUCTS_REPORT_RESULT_LIMIT' &&
      error.statusCode === 422
  );
});

test('DatabaseInventoryProductsReportSource rejects foreign and malformed persisted rows', async () => {
  await assert.rejects(
    new DatabaseInventoryProductsReportSource(
      createPool([{ ...persistedRow, account_id: '99999999-9999-4999-8999-999999999999' }]).pool
    ).list(accountId as never),
    (error: unknown) =>
      error instanceof AppError && error.code === 'INVENTORY_PRODUCTS_REPORT_TENANT_MISMATCH'
  );

  for (const [field, value, code] of [
    ['sku', '', 'INVENTORY_PRODUCTS_REPORT_INVALID_TEXT'],
    ['name', '', 'INVENTORY_PRODUCTS_REPORT_INVALID_TEXT'],
    ['unit', null, 'INVENTORY_PRODUCTS_REPORT_INVALID_TEXT'],
    ['on_hand_quantity', 'not-a-number', 'INVENTORY_PRODUCTS_REPORT_UNSAFE_NUMBER'],
    ['reorder_level', -1, 'INVENTORY_PRODUCTS_REPORT_UNSAFE_NUMBER'],
    ['unit_cost_amount', 1.234, 'INVENTORY_PRODUCTS_REPORT_UNSAFE_NUMBER'],
    ['created_at', 'not-a-date', 'INVENTORY_PRODUCTS_REPORT_INVALID_TIMESTAMP'],
    ['updated_at', 0, 'INVENTORY_PRODUCTS_REPORT_INVALID_TIMESTAMP']
  ] as const) {
    await assert.rejects(
      new DatabaseInventoryProductsReportSource(
        createPool([{ ...persistedRow, [field]: value }]).pool
      ).list(accountId as never),
      (error: unknown) => error instanceof AppError && error.code === code
    );
  }
});
