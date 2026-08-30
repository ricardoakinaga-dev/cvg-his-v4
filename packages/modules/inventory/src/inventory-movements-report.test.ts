import assert from 'node:assert/strict';
import { test } from 'vitest';
import type { Pool } from 'pg';

import { AppError } from '@cvg-his-v2/shared-errors';
import {
  DatabaseInventoryMovementsReportSource,
  MAX_INVENTORY_MOVEMENTS_REPORT_ROWS,
  type InventoryMovementsReportSourceReader
} from './inventory-movements-report.js';
import { runWithTenantContext } from '@cvg-his-v2/tenant-context';

const accountId = '11111111-1111-4111-8111-111111111111';

const movementA = {
  id: 'movement-a',
  accountId,
  inventoryItemId: 'item-own',
  movementType: 'adjustment' as const,
  quantityDelta: 1,
  balanceBefore: 7,
  balanceAfter: 8,
  unitCostAmount: 12.5,
  reason: 'Ajuste',
  reference: undefined,
  recordedByUserId: 'user-1',
  createdAt: '2026-05-10T10:00:00.000Z'
};

const movementB = {
  ...movementA,
  id: 'movement-b',
  movementType: 'consumption' as const,
  quantityDelta: -2,
  balanceBefore: 10,
  balanceAfter: 8,
  reason: 'Consumo assistencial',
  reference: 'encounter-1'
};

function createReader(
  rows: readonly unknown[],
  options: { readonly stockMovementsEnabled?: boolean } = {}
) {
  const calls: Array<{ readonly accountId: unknown; readonly filters: unknown }> = [];
  const reader: InventoryMovementsReportSourceReader = {
    stockMovementsEnabled: options.stockMovementsEnabled,
    findStockMovementReportRows: async (requestedAccountId, filters) => {
      calls.push({ accountId: requestedAccountId, filters });
      return rows as never;
    }
  };
  return { reader, calls };
}

test('DatabaseInventoryMovementsReportSource returns exact bounded raw-ledger rows', async () => {
  const harness = createReader([
    { movement: movementB, sku: 'MED-001', name: 'Dipirona', unit: 'ampola' },
    { movement: movementA, sku: 'MED-001', name: 'Dipirona', unit: 'ampola' }
  ]);
  const source = new DatabaseInventoryMovementsReportSource(harness.reader);

  const rows = await source.list(accountId as never, {
    search: '  MED-001  ',
    dateFrom: '2026-05-01',
    dateTo: '2026-05-31'
  });

  assert.deepEqual(rows, [
    {
      accountId,
      movementId: 'movement-a',
      occurredAt: '2026-05-10T10:00:00.000Z',
      movementType: 'adjustment',
      sku: 'MED-001',
      name: 'Dipirona',
      unit: 'ampola',
      quantityDelta: 1,
      balanceBefore: 7,
      balanceAfter: 8,
      unitCostAmount: 12.5,
      reason: 'Ajuste',
      reference: '',
      recordedByUserId: 'user-1'
    },
    {
      accountId,
      movementId: 'movement-b',
      occurredAt: '2026-05-10T10:00:00.000Z',
      movementType: 'consumption',
      sku: 'MED-001',
      name: 'Dipirona',
      unit: 'ampola',
      quantityDelta: -2,
      balanceBefore: 10,
      balanceAfter: 8,
      unitCostAmount: 12.5,
      reason: 'Consumo assistencial',
      reference: 'encounter-1',
      recordedByUserId: 'user-1'
    }
  ]);
  assert.deepEqual(harness.calls, [
    {
      accountId,
      filters: {
        search: 'med-001',
        dateFrom: '2026-05-01',
        dateTo: '2026-05-31',
        limit: MAX_INVENTORY_MOVEMENTS_REPORT_ROWS + 1
      }
    }
  ]);
});

test('DatabaseInventoryMovementsReportSource rejects invalid filters before reading', async () => {
  const harness = createReader([]);
  const source = new DatabaseInventoryMovementsReportSource(harness.reader);

  await assert.rejects(
    source.list(accountId as never, { search: 42 as never }),
    (error: unknown) =>
      error instanceof AppError && error.code === 'INVENTORY_MOVEMENTS_REPORT_INVALID_FILTER'
  );
  await assert.rejects(
    source.list(accountId as never, { search: 'x'.repeat(201) }),
    (error: unknown) =>
      error instanceof AppError &&
      error.code === 'INVENTORY_MOVEMENTS_REPORT_INVALID_FILTER' &&
      error.statusCode === 422
  );
  await assert.rejects(
    source.list(accountId as never, { dateFrom: '2026-02-30' }),
    (error: unknown) =>
      error instanceof AppError && error.code === 'INVENTORY_MOVEMENTS_REPORT_INVALID_FILTER'
  );
  await assert.rejects(
    source.list(accountId as never, { dateFrom: '2026-06-01', dateTo: '2026-05-01' }),
    (error: unknown) =>
      error instanceof AppError && error.code === 'INVENTORY_MOVEMENTS_REPORT_INVALID_FILTER'
  );
  assert.equal(harness.calls.length, 0);
});

test('DatabaseInventoryMovementsReportSource enforces the active tenant and database path', async () => {
  const harness = createReader([]);
  const source = new DatabaseInventoryMovementsReportSource(harness.reader);

  await assert.rejects(
    runWithTenantContext(
      {
        tenantId: 'tenant-other',
        accountId: '99999999-9999-4999-8999-999999999999',
        correlationId: 'corr-inventory-movements-tenant'
      },
      () => source.list(accountId as never)
    ),
    (error: unknown) =>
      error instanceof AppError &&
      error.code === 'INVENTORY_MOVEMENTS_REPORT_TENANT_MISMATCH' &&
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
  const explicitlyScopedSource = new DatabaseInventoryMovementsReportSource(harness.reader, pool);
  assert.deepEqual(await explicitlyScopedSource.list(accountId as never), []);
  assert.deepEqual(clientQueries, [
    'BEGIN',
    "SELECT set_config('app.current_account_id', $1, true)",
    'COMMIT'
  ]);
});

test('DatabaseInventoryMovementsReportSource fails closed for unavailable, oversized and unsafe rows', async () => {
  await assert.rejects(
    new DatabaseInventoryMovementsReportSource(
      createReader([], { stockMovementsEnabled: false }).reader
    ).list(accountId as never),
    (error: unknown) =>
      error instanceof AppError && error.code === 'INVENTORY_MOVEMENTS_REPORT_SOURCE_UNAVAILABLE'
  );

  const validSourceRow = {
    movement: movementA,
    sku: 'MED-001',
    name: 'Dipirona',
    unit: 'ampola'
  };
  await assert.rejects(
    new DatabaseInventoryMovementsReportSource(
      createReader(
        Array.from({ length: MAX_INVENTORY_MOVEMENTS_REPORT_ROWS + 1 }, () => validSourceRow)
      ).reader
    ).list(accountId as never),
    (error: unknown) =>
      error instanceof AppError &&
      error.code === 'INVENTORY_MOVEMENTS_REPORT_RESULT_LIMIT' &&
      error.statusCode === 422
  );

  for (const row of [
    {
      ...validSourceRow,
      movement: { ...movementA, accountId: '99999999-9999-4999-8999-999999999999' }
    },
    { ...validSourceRow, movement: { ...movementA, inventoryItemId: '' } },
    { ...validSourceRow, sku: null },
    { ...validSourceRow, movement: { ...movementA, movementType: 'unknown' } },
    { ...validSourceRow, movement: { ...movementA, quantityDelta: Number.NaN } },
    { ...validSourceRow, movement: { ...movementA, balanceAfter: -1 } },
    { ...validSourceRow, movement: { ...movementA, unitCostAmount: 1.234 } },
    { ...validSourceRow, movement: { ...movementA, createdAt: 'not-a-date' } }
  ]) {
    await assert.rejects(
      new DatabaseInventoryMovementsReportSource(createReader([row]).reader).list(
        accountId as never
      ),
      (error: unknown) =>
        error instanceof AppError &&
        (error.code === 'INVENTORY_MOVEMENTS_REPORT_TENANT_MISMATCH' ||
          error.code === 'INVENTORY_MOVEMENTS_REPORT_INVALID_ROW')
    );
  }
});
