import assert from 'node:assert/strict';
import { test } from 'vitest';
import type { Pool } from 'pg';

import { AppError } from '@cvg-his-v2/shared-errors';
import {
  DatabaseCommissionCalculationsReportSource,
  MAX_COMMISSION_CALCULATIONS_REPORT_ROWS
} from './commission-calculations-report.js';

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
  id: 'comm_calc_report_1',
  calculation_number: 'COM-000042',
  period_start: '2026-05-01',
  period_end: '2026-05-28',
  status: 'reviewed',
  total_base_amount: '3000.00',
  total_commission_amount: '450.00',
  line_count: 2
};

test('DatabaseCommissionCalculationsReportSource returns a bounded tenant-safe projection', async () => {
  const harness = createPool([persistedRow]);
  const source = new DatabaseCommissionCalculationsReportSource(harness.pool);

  const rows = await source.list(accountId as never, {
    status: 'reviewed',
    dateFrom: '2026-05-15',
    dateTo: '2026-05-20'
  });

  assert.deepEqual(rows, [
    {
      accountId,
      id: 'comm_calc_report_1',
      number: 'COM-000042',
      periodStart: '2026-05-01',
      periodEnd: '2026-05-28',
      status: 'reviewed',
      totalBaseAmount: 3000,
      totalCommissionAmount: 450,
      lineCount: 2
    }
  ]);

  const projection = harness.calls.find((call) =>
    call.text.includes('FROM commission_calculations')
  );
  assert.ok(projection);
  assert.match(projection.text, /commission_calculations\.account_id = \$1/);
  assert.match(projection.text, /commission_lines\.account_id = \$1/);
  assert.match(projection.text, /commission_calculations\.period_end >=/);
  assert.match(projection.text, /commission_calculations\.period_start <=/);
  assert.match(
    projection.text,
    /ORDER BY commission_calculations\.created_at DESC, commission_calculations\.id DESC/
  );
  assert.match(projection.text, /LIMIT 10001/);
  assert.doesNotMatch(projection.text, /SELECT \*/i);
  assert.deepEqual(projection.values, [accountId, 'reviewed', '2026-05-15', '2026-05-20']);
});

test('DatabaseCommissionCalculationsReportSource rejects an oversized result before mapping rows', async () => {
  const harness = createPool(
    Array.from({ length: MAX_COMMISSION_CALCULATIONS_REPORT_ROWS + 1 }, () => ({}))
  );
  const source = new DatabaseCommissionCalculationsReportSource(harness.pool);

  await assert.rejects(
    source.list(accountId as never),
    (error: unknown) =>
      error instanceof AppError &&
      error.code === 'COMMISSION_CALCULATIONS_REPORT_RESULT_LIMIT' &&
      error.statusCode === 422
  );
});

test('DatabaseCommissionCalculationsReportSource rejects foreign and malformed persisted rows', async () => {
  await assert.rejects(
    new DatabaseCommissionCalculationsReportSource(
      createPool([{ ...persistedRow, account_id: '99999999-9999-4999-8999-999999999999' }]).pool
    ).list(accountId as never),
    (error: unknown) =>
      error instanceof AppError && error.code === 'COMMISSION_CALCULATIONS_REPORT_TENANT_MISMATCH'
  );

  for (const [field, value, code] of [
    ['calculation_number', '', 'COMMISSION_CALCULATIONS_REPORT_INVALID_TEXT'],
    ['status', 'approved', 'COMMISSION_CALCULATIONS_REPORT_INVALID_STATUS'],
    ['period_start', '2026-02-30', 'COMMISSION_CALCULATIONS_REPORT_INVALID_DATE'],
    ['period_end', '2026-04-01', 'COMMISSION_CALCULATIONS_REPORT_INVALID_PERIOD'],
    ['total_base_amount', 'not-a-number', 'COMMISSION_CALCULATIONS_REPORT_UNSAFE_AMOUNT'],
    ['total_commission_amount', -1, 'COMMISSION_CALCULATIONS_REPORT_UNSAFE_AMOUNT'],
    ['line_count', -1, 'COMMISSION_CALCULATIONS_REPORT_INVALID_LINE_COUNT']
  ] as const) {
    const row =
      field === 'period_end'
        ? { ...persistedRow, period_start: '2026-05-01', [field]: value }
        : { ...persistedRow, [field]: value };
    await assert.rejects(
      new DatabaseCommissionCalculationsReportSource(createPool([row]).pool).list(
        accountId as never
      ),
      (error: unknown) => error instanceof AppError && error.code === code
    );
  }
});

test('DatabaseCommissionCalculationsReportSource rejects invalid scheduled filters before querying', async () => {
  const harness = createPool([]);
  const source = new DatabaseCommissionCalculationsReportSource(harness.pool);

  await assert.rejects(
    source.list(accountId as never, { status: 'approved' as never }),
    (error: unknown) =>
      error instanceof AppError &&
      error.code === 'COMMISSION_CALCULATIONS_REPORT_INVALID_FILTER' &&
      error.statusCode === 422
  );
  await assert.rejects(
    source.list(accountId as never, { dateFrom: '2026-02-30' }),
    (error: unknown) =>
      error instanceof AppError &&
      error.code === 'COMMISSION_CALCULATIONS_REPORT_INVALID_FILTER' &&
      error.statusCode === 422
  );
  await assert.rejects(
    source.list(accountId as never, { dateFrom: '2026-06-01', dateTo: '2026-05-31' }),
    (error: unknown) =>
      error instanceof AppError &&
      error.code === 'COMMISSION_CALCULATIONS_REPORT_INVALID_FILTER' &&
      error.statusCode === 422
  );
  assert.equal(harness.calls.length, 0);
});
