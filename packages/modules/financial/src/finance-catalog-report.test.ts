import assert from 'node:assert/strict';
import { test } from 'vitest';
import type { Pool } from 'pg';

import { AppError } from '@cvg-his-v2/shared-errors';
import {
  DatabaseFinanceCatalogReportSource,
  MAX_FINANCE_CATALOG_REPORT_ROWS
} from './finance-catalog-report.js';

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
  id: 'DES-11111111-1111-4111-8111-111111111111',
  name: 'Consulta clínica',
  kind: 'Despesa operacional',
  category: 'Tecnologia',
  cost_center_code: 'CC-ATD',
  cost_center_name: 'Operação de Atendimento',
  description: 'Catálogo persistido para teste',
  created_at: '2026-05-15T23:30:00.000Z',
  updated_at: '2026-05-16T00:00:00.000Z'
};

test('DatabaseFinanceCatalogReportSource returns an exact bounded tenant-safe projection', async () => {
  const harness = createPool([persistedRow]);
  const source = new DatabaseFinanceCatalogReportSource(harness.pool);

  const rows = await source.list(accountId as never, {
    search: '  Consulta  ',
    category: ' Tecnologia ',
    costCenterCode: ' CC-ATD ',
    dateFrom: '2026-05-01',
    dateTo: '2026-05-31'
  });

  assert.deepEqual(rows, [
    {
      accountId,
      id: persistedRow.id,
      name: persistedRow.name,
      kind: persistedRow.kind,
      category: persistedRow.category,
      costCenterCode: persistedRow.cost_center_code,
      costCenterName: persistedRow.cost_center_name,
      description: persistedRow.description,
      createdAt: '2026-05-15T23:30:00.000Z',
      updatedAt: '2026-05-16T00:00:00.000Z'
    }
  ]);

  const projection = harness.calls.find((call) =>
    call.text.includes('FROM finance_expense_catalog_items')
  );
  assert.ok(projection);
  assert.match(projection.text, /item\.account_id = \$1/);
  assert.match(projection.text, /item\.id ILIKE \$2/);
  assert.match(projection.text, /item\.category ILIKE \$3/);
  assert.match(projection.text, /item\.cost_center_code ILIKE \$4/);
  assert.match(projection.text, /AT TIME ZONE 'UTC'/);
  assert.match(projection.text, /ORDER BY item\.name ASC, item\.id ASC/);
  assert.match(projection.text, /LIMIT 10001/);
  assert.doesNotMatch(projection.text, /SELECT \*/i);
  assert.doesNotMatch(projection.text, /created_by_user_id/);
  assert.deepEqual(projection.values, [
    accountId,
    '%consulta%',
    '%tecnologia%',
    '%cc-atd%',
    '2026-05-01',
    '2026-05-31'
  ]);
});

test('DatabaseFinanceCatalogReportSource rejects invalid filters before querying', async () => {
  const harness = createPool([]);
  const source = new DatabaseFinanceCatalogReportSource(harness.pool);

  await assert.rejects(
    source.list(accountId as never, { search: 12 as never }),
    (error: unknown) =>
      error instanceof AppError &&
      error.code === 'FINANCE_CATALOG_REPORT_INVALID_FILTER' &&
      error.statusCode === 422
  );
  await assert.rejects(
    source.list(accountId as never, { dateFrom: '2026-02-30' }),
    (error: unknown) =>
      error instanceof AppError && error.code === 'FINANCE_CATALOG_REPORT_INVALID_FILTER'
  );
  await assert.rejects(
    source.list(accountId as never, { dateFrom: '2026-06-01', dateTo: '2026-05-01' }),
    (error: unknown) =>
      error instanceof AppError && error.code === 'FINANCE_CATALOG_REPORT_INVALID_FILTER'
  );
  assert.equal(harness.calls.filter((call) => call.text.includes('FROM finance_')).length, 0);
});

test('DatabaseFinanceCatalogReportSource rejects an oversized result before mapping rows', async () => {
  const harness = createPool(
    Array.from({ length: MAX_FINANCE_CATALOG_REPORT_ROWS + 1 }, () => ({}))
  );
  const source = new DatabaseFinanceCatalogReportSource(harness.pool);

  await assert.rejects(
    source.list(accountId as never),
    (error: unknown) =>
      error instanceof AppError &&
      error.code === 'FINANCE_CATALOG_REPORT_RESULT_LIMIT' &&
      error.statusCode === 422
  );
});

test('DatabaseFinanceCatalogReportSource rejects foreign and malformed persisted rows', async () => {
  await assert.rejects(
    new DatabaseFinanceCatalogReportSource(
      createPool([{ ...persistedRow, account_id: '99999999-9999-4999-8999-999999999999' }]).pool
    ).list(accountId as never),
    (error: unknown) =>
      error instanceof AppError && error.code === 'FINANCE_CATALOG_REPORT_TENANT_MISMATCH'
  );

  for (const [field, value] of [
    ['name', ''],
    ['kind', null],
    ['category', 42],
    ['cost_center_code', ''],
    ['created_at', 'not-a-date'],
    ['updated_at', 0]
  ] as const) {
    await assert.rejects(
      new DatabaseFinanceCatalogReportSource(
        createPool([{ ...persistedRow, [field]: value }]).pool
      ).list(accountId as never),
      (error: unknown) =>
        error instanceof AppError && error.code === 'FINANCE_CATALOG_REPORT_INVALID_STATE'
    );
  }
});
