import type { Pool } from 'pg';
import { describe, expect, it } from 'vitest';

import { AppError } from '@cvg-his-v2/shared-errors';

import {
  DatabaseAdvancePaymentsReportSource,
  MAX_ADVANCE_PAYMENT_REPORT_ROWS
} from './advance-payments-report.js';
import {
  DatabaseFinancialReceivablesReportSource,
  MAX_FINANCIAL_RECEIVABLE_REPORT_ROWS
} from './receivables-report.js';

function createPool(rows: readonly Record<string, unknown>[]) {
  const calls: Array<{ text: string; values?: readonly unknown[] }> = [];
  const client = {
    query: async (text: string, values?: readonly unknown[]) => {
      calls.push({ text, values });
      if (text === 'BEGIN' || text === 'COMMIT' || text.startsWith('ROLLBACK')) {
        return { rows: [], rowCount: 0 };
      }
      if (text.includes("set_config('app.current_account_id'")) {
        return { rows: [], rowCount: 1 };
      }
      if (text.includes("current_setting('app.current_account_id'")) {
        return { rows: [{ matches: true }], rowCount: 1 };
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

const advanceRow = {
  payment_id: 'payment-1',
  owner_name: 'Tutor A',
  document_id: '123',
  issued_at: '2026-05-01T00:00:00.000Z',
  original_amount_cents: '10000',
  compensated_amount_cents: 2500,
  balance_cents: '7500',
  origin: 'credit',
  status: 'partially_compensated',
  notes: 'observacao'
};

const receivableRow = {
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

describe('advance-payment report boundary coverage', () => {
  it('builds all optional filters and maps numeric/status variants', async () => {
    const harness = createPool([advanceRow]);
    const source = new DatabaseAdvancePaymentsReportSource(harness.pool);
    await expect(source.list(accountId as never, {
      search: '  Tutor  ',
      dateFrom: '2026-05-01',
      dateTo: '2026-05-31',
      status: 'partially_compensated'
    })).resolves.toEqual([{
      paymentId: 'payment-1',
      ownerName: 'Tutor A',
      documentId: '123',
      issuedAt: '2026-05-01T00:00:00.000Z',
      originalAmount: 100,
      compensatedAmount: 25,
      balance: 75,
      origin: 'credit',
      status: 'partially_compensated',
      notes: 'observacao'
    }]);

    const query = harness.calls.find(call => call.text.includes('FROM report_rows'));
    expect(query?.values).toEqual([accountId, '%Tutor%', '2026-05-01', '2026-05-31', 'partially_compensated']);
  });

  it('normalizes nullable presentation fields and rejects unsafe persisted rows', async () => {
    const nullable = { ...advanceRow, document_id: null, notes: null, status: 'available', compensated_amount_cents: 0, balance_cents: 10000 };
    await expect(new DatabaseAdvancePaymentsReportSource(createPool([nullable]).pool).list(accountId as never)).resolves.toMatchObject({
      0: { documentId: '', notes: '', status: 'available', compensatedAmount: 0, balance: 100 }
    });
    for (const invalid of [
      { original_amount_cents: -1 },
      { compensated_amount_cents: Number.NaN },
      { balance_cents: Number.MAX_SAFE_INTEGER + 1 },
      { status: 'unknown' }
    ]) {
      await expect(new DatabaseAdvancePaymentsReportSource(createPool([{ ...advanceRow, ...invalid }]).pool).list(accountId as never)).rejects.toBeInstanceOf(AppError);
    }
  });

  it('rejects an oversized export and omits blank optional filters', async () => {
    const oversized = Array.from({ length: MAX_ADVANCE_PAYMENT_REPORT_ROWS + 1 }, () => advanceRow);
    await expect(new DatabaseAdvancePaymentsReportSource(createPool(oversized).pool).list(accountId as never)).rejects.toMatchObject({
      code: 'ADVANCE_PAYMENT_RESULT_LIMIT'
    });
    const harness = createPool([]);
    await expect(new DatabaseAdvancePaymentsReportSource(harness.pool).list(accountId as never, { search: '   ' })).resolves.toEqual([]);
    const query = harness.calls.find(call => call.text.includes('FROM report_rows'));
    expect(query?.values).toEqual([accountId]);
  });
});

describe('receivables report filter and persisted-state coverage', () => {
  it('rejects invalid filters before opening a tenant query', async () => {
    const invalidFilters = [
      { search: 42 },
      { search: 'x'.repeat(201) },
      { dateFrom: '2026/05/01' },
      { dateFrom: '2026-02-30' },
      { dateTo: '2026-02-30' },
      { status: 'cancelled' },
      { dateFrom: '2026-06-01', dateTo: '2026-05-01' }
    ];
    for (const filters of invalidFilters) {
      await expect(new DatabaseFinancialReceivablesReportSource(createPool([]).pool).list(accountId as never, filters as never)).rejects.toBeInstanceOf(AppError);
    }
  });

  it('maps alternate date/amount/count representations and validates each persisted field', async () => {
    const alternate = {
      ...receivableRow,
      due_at: new Date('2026-05-15T00:00:00.000Z'),
      amount_original: 100,
      amount_paid: 25,
      amount_outstanding: 75,
      installment_number: '1',
      payment_count: '0',
      status: 'settled',
      financial_status: 'paid',
      encounter_status: 'closed',
      settled_at: '2026-05-16T00:00:00.000Z'
    };
    await expect(new DatabaseFinancialReceivablesReportSource(createPool([alternate]).pool).list(accountId as never, {
      status: 'settled',
      search: '  ',
      dateFrom: '',
      dateTo: ''
    })).resolves.toMatchObject({ 0: { status: 'settled', financialStatus: 'paid', encounterStatus: 'closed', dueAt: '2026-05-15T00:00:00.000Z' } });

    const invalidRows = [
      { patient_name: '' },
      { issued_at: null },
      { due_at: 'not-a-date' },
      { amount_original: -1 },
      { amount_paid: 0.001 },
      { amount_outstanding: Number.POSITIVE_INFINITY },
      { installment_number: -1 },
      { payment_count: -1 }
    ];
    for (const invalid of invalidRows) {
      await expect(new DatabaseFinancialReceivablesReportSource(createPool([{ ...receivableRow, ...invalid }]).pool).list(accountId as never)).rejects.toBeInstanceOf(AppError);
    }
  });

  it('rejects a result exceeding the bounded report page', async () => {
    const rows = Array.from({ length: MAX_FINANCIAL_RECEIVABLE_REPORT_ROWS + 1 }, () => receivableRow);
    await expect(new DatabaseFinancialReceivablesReportSource(createPool(rows).pool).list(accountId as never)).rejects.toMatchObject({
      code: 'FINANCIAL_RECEIVABLE_RESULT_LIMIT'
    });
  });
});
