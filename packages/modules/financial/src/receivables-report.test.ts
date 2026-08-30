import assert from 'node:assert/strict';
import { test } from 'vitest';
import type { Pool } from 'pg';

import { AppError } from '@cvg-his-v2/shared-errors';
import {
  DatabaseFinancialReceivablesReportSource,
  MAX_FINANCIAL_RECEIVABLE_REPORT_ROWS
} from './receivables-report.js';

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
      if (text.includes("set_config('app.current_account_id'")) {
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
  patient_name: 'Paciente A',
  owner_name: 'Tutor A',
  patient_species: 'Canino',
  encounter_id: '22222222-2222-4222-8222-222222222222',
  installment_number: 1,
  installment_label: 'Consulta',
  issued_at: '2026-05-01T00:00:00.000Z',
  due_at: '2026-05-15T00:00:00.000Z',
  settled_at: null,
  amount_original: '100.00',
  amount_paid: '25.00',
  amount_outstanding: '75.00',
  status: 'open',
  financial_status: 'partial',
  encounter_status: 'open',
  payment_count: 1
};

test('DatabaseFinancialReceivablesReportSource returns a bounded tenant-safe projection', async () => {
  const harness = createPool([persistedRow]);
  const source = new DatabaseFinancialReceivablesReportSource(harness.pool);

  const rows = await source.list(accountId as never, {
    status: 'open',
    search: 'Paciente',
    dateFrom: '2026-05-01',
    dateTo: '2026-05-31'
  });

  assert.deepEqual(rows, [
    {
      accountId,
      patientName: 'Paciente A',
      ownerName: 'Tutor A',
      patientSpecies: 'Canino',
      encounterId: '22222222-2222-4222-8222-222222222222',
      installmentNumber: 1,
      installmentLabel: 'Consulta',
      issuedAt: '2026-05-01T00:00:00.000Z',
      dueAt: '2026-05-15T00:00:00.000Z',
      settledAt: null,
      amountOriginal: 100,
      amountPaid: 25,
      amountOutstanding: 75,
      status: 'open',
      financialStatus: 'partial',
      encounterStatus: 'open',
      paymentCount: 1
    }
  ]);

  const projection = harness.calls.find((call) => call.text.includes('FROM encounter_receivables'));
  assert.ok(projection);
  assert.match(projection.text, /JOIN encounter_financial_accounts/);
  assert.match(projection.text, /JOIN encounters/);
  assert.match(projection.text, /JOIN patients/);
  assert.match(projection.text, /JOIN owners/);
  assert.match(projection.text, /LEFT JOIN encounter_receivable_payments/);
  assert.match(projection.text, /receivable\.account_id = \$1/);
  assert.match(projection.text, /AT TIME ZONE 'UTC'/);
  assert.match(projection.text, /LIMIT 10001/);
  assert.doesNotMatch(projection.text, /SELECT \*/i);
  assert.deepEqual(projection.values, [
    accountId,
    'open',
    '%Paciente%',
    '2026-05-01',
    '2026-05-31'
  ]);
});

test('DatabaseFinancialReceivablesReportSource rejects an oversized result before mapping rows', async () => {
  const harness = createPool(
    Array.from({ length: MAX_FINANCIAL_RECEIVABLE_REPORT_ROWS + 1 }, () => ({}))
  );
  const source = new DatabaseFinancialReceivablesReportSource(harness.pool);

  await assert.rejects(
    source.list(accountId as never),
    (error: unknown) =>
      error instanceof AppError &&
      error.code === 'FINANCIAL_RECEIVABLE_RESULT_LIMIT' &&
      error.statusCode === 422
  );
});

test('DatabaseFinancialReceivablesReportSource rejects invalid persisted state', async () => {
  const harness = createPool([{ ...persistedRow, status: 'cancelled' }]);
  const source = new DatabaseFinancialReceivablesReportSource(harness.pool);

  await assert.rejects(
    source.list(accountId as never),
    (error: unknown) =>
      error instanceof AppError && error.code === 'FINANCIAL_RECEIVABLE_INVALID_STATUS'
  );
});

test('DatabaseFinancialReceivablesReportSource rejects foreign and invalid persisted state', async () => {
  await assert.rejects(
    new DatabaseFinancialReceivablesReportSource(
      createPool([{ ...persistedRow, account_id: '99999999-9999-4999-8999-999999999999' }]).pool
    ).list(accountId as never),
    (error: unknown) =>
      error instanceof AppError && error.code === 'FINANCIAL_RECEIVABLE_TENANT_MISMATCH'
  );

  for (const [field, code] of [
    ['financial_status', 'FINANCIAL_RECEIVABLE_INVALID_FINANCIAL_STATUS'],
    ['encounter_status', 'FINANCIAL_RECEIVABLE_INVALID_ENCOUNTER_STATUS']
  ] as const) {
    await assert.rejects(
      new DatabaseFinancialReceivablesReportSource(
        createPool([{ ...persistedRow, [field]: 'invalid' }]).pool
      ).list(accountId as never),
      (error: unknown) => error instanceof AppError && error.code === code
    );
  }
});
