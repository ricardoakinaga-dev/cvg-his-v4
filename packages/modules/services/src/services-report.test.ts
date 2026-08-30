import assert from 'node:assert/strict';
import { test } from 'vitest';
import type { Pool } from 'pg';

import { AppError } from '@cvg-his-v2/shared-errors';
import { DatabaseServicesReportSource, MAX_SERVICES_REPORT_ROWS } from './services-report.js';

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
  id: '22222222-2222-4222-8222-222222222222',
  code: 'SRV-001',
  name: 'Consulta clínica',
  description: 'Atendimento clínico padrão',
  base_price: '120.50',
  active: true,
  created_at: '2026-05-01T00:00:00.000Z'
};

test('DatabaseServicesReportSource returns a bounded tenant-safe projection', async () => {
  const harness = createPool([persistedRow]);
  const source = new DatabaseServicesReportSource(harness.pool);

  const rows = await source.list(accountId as never, {
    dateFrom: '2026-05-01',
    dateTo: '2026-05-31'
  });

  assert.deepEqual(rows, [
    {
      accountId,
      id: '22222222-2222-4222-8222-222222222222',
      code: 'SRV-001',
      name: 'Consulta clínica',
      description: 'Atendimento clínico padrão',
      basePrice: 120.5,
      active: true,
      createdAt: '2026-05-01T00:00:00.000Z'
    }
  ]);

  const projection = harness.calls.find((call) => call.text.includes('FROM services'));
  assert.ok(projection);
  assert.match(projection.text, /services\.account_id = \$1/);
  assert.match(projection.text, /AT TIME ZONE 'UTC'/);
  assert.match(projection.text, /ORDER BY services\.created_at ASC, services\.id ASC/);
  assert.match(projection.text, /LIMIT 10001/);
  assert.doesNotMatch(projection.text, /SELECT \*/i);
  assert.deepEqual(projection.values, [accountId, '2026-05-01', '2026-05-31']);
});

test('DatabaseServicesReportSource rejects an oversized result before mapping rows', async () => {
  const harness = createPool(Array.from({ length: MAX_SERVICES_REPORT_ROWS + 1 }, () => ({})));
  const source = new DatabaseServicesReportSource(harness.pool);

  await assert.rejects(
    source.list(accountId as never),
    (error: unknown) =>
      error instanceof AppError &&
      error.code === 'SERVICES_REPORT_RESULT_LIMIT' &&
      error.statusCode === 422
  );
});

test('DatabaseServicesReportSource rejects foreign and malformed persisted rows', async () => {
  await assert.rejects(
    new DatabaseServicesReportSource(
      createPool([{ ...persistedRow, account_id: '99999999-9999-4999-8999-999999999999' }]).pool
    ).list(accountId as never),
    (error: unknown) =>
      error instanceof AppError && error.code === 'SERVICES_REPORT_TENANT_MISMATCH'
  );

  for (const [field, value, code] of [
    ['active', 'yes', 'SERVICES_REPORT_INVALID_ACTIVE'],
    ['base_price', 'not-a-number', 'SERVICES_REPORT_UNSAFE_AMOUNT'],
    ['base_price', null, 'SERVICES_REPORT_UNSAFE_AMOUNT'],
    ['created_at', 'not-a-date', 'SERVICES_REPORT_INVALID_DATE'],
    ['created_at', 0, 'SERVICES_REPORT_INVALID_DATE']
  ] as const) {
    await assert.rejects(
      new DatabaseServicesReportSource(createPool([{ ...persistedRow, [field]: value }]).pool).list(
        accountId as never
      ),
      (error: unknown) => error instanceof AppError && error.code === code
    );
  }
});

test('DatabaseServicesReportSource rejects years outside the scheduled date contract', async () => {
  await assert.rejects(
    new DatabaseServicesReportSource(createPool([]).pool).list(accountId as never, {
      dateFrom: '0000-01-01'
    }),
    (error: unknown) =>
      error instanceof AppError &&
      error.code === 'SERVICES_REPORT_INVALID_FILTER' &&
      error.statusCode === 422
  );
});
