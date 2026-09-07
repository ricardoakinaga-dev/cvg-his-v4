import { describe, expect, it } from 'vitest';

import type { ReportExecutionDetail } from '@/services/reports';
import { useCancellationReports } from '../useCancellationReports';

const formatters = {
  formatCurrency: (value: number) => value.toFixed(2),
  formatDateTime: (value: string | null) => value ?? '—'
};

// ReportService projects catalog columns; accountId belongs to the execution envelope.
const cancellation = {
  eventId: 'event-1',
  counterSaleId: 'sale-1',
  number: 'CV-100',
  ownerId: null,
  cancelledAt: '2026-09-04T00:05:00.000Z',
  cancelledByUserId: 'user-gerente',
  reason: 'Lançamento em duplicidade',
  correlationId: 'correlation-1',
  total: 225,
  discountAmount: 25,
  paidAmount: 50,
  balanceDue: 175
};

const snapshot = {
  number: 'CV-100',
  status: 'cancelled',
  ownerId: 'owner-1',
  openedByUserId: 'user-caixa',
  createdAt: '2026-04-07T10:00:00.000Z',
  updatedAt: '2026-09-04T10:30:00.000Z',
  total: 240,
  discountAmount: 10,
  paidAmount: 100,
  balanceDue: 140,
  notes: 'Observação atual'
};

function execution(
  reportId: string,
  rows: readonly Record<string, unknown>[]
): ReportExecutionDetail {
  return {
    id: 'execution-1',
    accountId: 'account-1',
    reportId,
    requestedByUserId: 'user-1',
    status: 'completed',
    filters: {},
    rowCount: rows.length,
    generatedAt: '2026-09-04T12:00:00.000Z',
    expiresAt: '2026-09-05T12:00:00.000Z',
    columns: [],
    rows
  };
}

describe('useCancellationReports', () => {
  it('defaults to history and accepts catalog-projected rows without accountId', () => {
    const report = useCancellationReports(formatters);
    report.acceptExecution(
      execution('commercial-cancellation-history', [
        cancellation,
        { ...cancellation, eventId: 'event-2' }
      ]),
      'history'
    );

    expect(report.view.value).toBe('history');
    expect(report.spec.value.serverReportId).toBe('commercial-cancellation-history');
    expect(report.rows.value.map((row) => row.id)).toEqual(['event-1', 'event-2']);
    expect(report.rows.value[0]).toMatchObject(cancellation);
    expect(report.cards.value.map((card) => card.value)).toEqual([
      '2',
      '450.00',
      '100.00',
      '350.00'
    ]);
  });

  it('keeps opening-date snapshot fields and totals separate from cancellation facts', () => {
    const report = useCancellationReports(formatters);
    report.acceptExecution(execution('commercial-cancellation-history', [cancellation]), 'history');
    report.acceptExecution(execution('commercial-deleted-sales', [snapshot]), 'opening-date');
    report.view.value = 'opening-date';

    expect(report.spec.value.serverReportId).toBe('commercial-deleted-sales');
    expect(report.spec.value.subtitle).toContain('período pela data de abertura');
    expect(report.spec.value.columns.map((column) => column.key)).toContain('openedByUserId');
    expect(report.rows.value).toEqual([{ ...snapshot, id: 'CV-100', status: 'Cancelado' }]);
    expect(report.cards.value.map((card) => card.value)).toEqual(['1', '240.00', '10.00', '1']);

    report.view.value = 'history';
    expect(report.rows.value[0]).toMatchObject({ total: 225, reason: cancellation.reason });
    expect(report.spec.value.columns.map((column) => column.key)).toContain('cancelledByUserId');
    expect(report.cards.value.map((card) => card.value)).toEqual([
      '1',
      '225.00',
      '50.00',
      '175.00'
    ]);
  });

  it('clears both views before a new execution without changing the selected report', () => {
    const report = useCancellationReports(formatters);
    report.acceptExecution(execution('commercial-cancellation-history', [cancellation]), 'history');
    report.acceptExecution(execution('commercial-deleted-sales', [snapshot]), 'opening-date');
    report.view.value = 'opening-date';
    report.reset();

    expect(report.view.value).toBe('opening-date');
    expect(report.rows.value).toEqual([]);
    expect(report.cards.value[0]?.value).toBe('0');
    report.view.value = 'history';
    expect(report.rows.value).toEqual([]);
    expect(report.cards.value[0]?.value).toBe('0');
  });

  it('rejects an entire history response when a cancellation fact is missing', () => {
    const report = useCancellationReports(formatters);
    expect(() =>
      report.acceptExecution(
        execution('commercial-cancellation-history', [
          cancellation,
          { ...cancellation, reason: undefined }
        ]),
        'history'
      )
    ).toThrow('Resposta inválida do histórico de cancelamentos');
    expect(report.rows.value).toEqual([]);
  });

  it('rejects malformed snapshot rows without accepting them as cancellation history', () => {
    const report = useCancellationReports(formatters);
    report.view.value = 'opening-date';
    expect(() =>
      report.acceptExecution(execution('commercial-deleted-sales', [cancellation]), 'opening-date')
    ).toThrow('Resposta inválida do relatório de vendas canceladas');
    expect(report.rows.value).toEqual([]);
  });
});
