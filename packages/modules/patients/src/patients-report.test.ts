import assert from 'node:assert/strict';
import { test } from 'vitest';
import type { Pool } from 'pg';

import { AppError } from '@cvg-his-v2/shared-errors';
import { DatabasePatientsReportSource, MAX_PATIENTS_REPORT_ROWS } from './patients-report.js';

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
  code: 'VETUS-42',
  name: 'Luna',
  species: 'canine',
  breed: 'SRD',
  sex: 'female',
  microchip: '985141000001234',
  status: 'active',
  created_at: '2026-05-01T00:00:00.000Z'
};

test('DatabasePatientsReportSource returns a bounded tenant-safe exact projection', async () => {
  const harness = createPool([persistedRow]);
  const source = new DatabasePatientsReportSource(harness.pool);

  const rows = await source.list(accountId as never, {
    dateFrom: '2026-05-01',
    dateTo: '2026-05-31'
  });

  assert.deepEqual(rows, [
    {
      accountId,
      id: '22222222-2222-4222-8222-222222222222',
      code: 'VETUS-42',
      name: 'Luna',
      species: 'canine',
      breed: 'SRD',
      sex: 'female',
      microchip: '985141000001234',
      status: 'active',
      createdAt: '2026-05-01T00:00:00.000Z'
    }
  ]);

  const projection = harness.calls.find((call) => call.text.includes('FROM patients'));
  assert.ok(projection);
  assert.match(projection.text, /patients\.account_id = \$1/);
  assert.match(projection.text, /AT TIME ZONE 'UTC'/);
  assert.match(projection.text, /alerts_json/);
  assert.match(projection.text, /ORDER BY patients\.name ASC, patients\.id ASC/);
  assert.match(projection.text, /LIMIT 10001/);
  assert.doesNotMatch(projection.text, /SELECT \*/i);
  assert.doesNotMatch(projection.text, /owners|owner_id/i);
  assert.deepEqual(projection.values, [accountId, '2026-05-01', '2026-05-31']);
});

test('DatabasePatientsReportSource applies safe persisted fallbacks', async () => {
  const harness = createPool([
    {
      ...persistedRow,
      code: null,
      breed: null,
      sex: null,
      microchip: null,
      status: null
    }
  ]);

  const rows = await new DatabasePatientsReportSource(harness.pool).list(accountId as never);

  assert.deepEqual(rows[0], {
    accountId,
    id: '22222222-2222-4222-8222-222222222222',
    code: '22222222-2222-4222-8222-222222222222',
    name: 'Luna',
    species: 'canine',
    breed: null,
    sex: 'unknown',
    microchip: null,
    status: 'active',
    createdAt: '2026-05-01T00:00:00.000Z'
  });
});

test('DatabasePatientsReportSource rejects an oversized result before mapping rows', async () => {
  const harness = createPool(Array.from({ length: MAX_PATIENTS_REPORT_ROWS + 1 }, () => ({})));
  const source = new DatabasePatientsReportSource(harness.pool);

  await assert.rejects(
    source.list(accountId as never),
    (error: unknown) =>
      error instanceof AppError &&
      error.code === 'PATIENTS_REPORT_RESULT_LIMIT' &&
      error.statusCode === 422
  );
});

test('DatabasePatientsReportSource rejects foreign and malformed persisted rows', async () => {
  await assert.rejects(
    new DatabasePatientsReportSource(
      createPool([{ ...persistedRow, account_id: '99999999-9999-4999-8999-999999999999' }]).pool
    ).list(accountId as never),
    (error: unknown) =>
      error instanceof AppError && error.code === 'PATIENTS_REPORT_TENANT_MISMATCH'
  );

  for (const [field, value, code] of [
    ['id', '', 'PATIENTS_REPORT_INVALID_TEXT'],
    ['name', '', 'PATIENTS_REPORT_INVALID_TEXT'],
    ['species', 42, 'PATIENTS_REPORT_INVALID_TEXT'],
    ['sex', 'other', 'PATIENTS_REPORT_INVALID_SEX'],
    ['status', 'deleted', 'PATIENTS_REPORT_INVALID_STATUS'],
    ['created_at', 'not-a-date', 'PATIENTS_REPORT_INVALID_DATE']
  ] as const) {
    await assert.rejects(
      new DatabasePatientsReportSource(createPool([{ ...persistedRow, [field]: value }]).pool).list(
        accountId as never
      ),
      (error: unknown) => error instanceof AppError && error.code === code
    );
  }
});

test('DatabasePatientsReportSource rejects invalid scheduled date filters before querying', async () => {
  const harness = createPool([]);
  const source = new DatabasePatientsReportSource(harness.pool);

  await assert.rejects(
    source.list(accountId as never, { dateFrom: '2026-02-30' }),
    (error: unknown) =>
      error instanceof AppError &&
      error.code === 'PATIENTS_REPORT_INVALID_FILTER' &&
      error.statusCode === 422
  );
  await assert.rejects(
    source.list(accountId as never, { dateFrom: '2026-06-01', dateTo: '2026-05-31' }),
    (error: unknown) =>
      error instanceof AppError &&
      error.code === 'PATIENTS_REPORT_INVALID_FILTER' &&
      error.statusCode === 422
  );
  assert.equal(harness.calls.length, 0);
});
