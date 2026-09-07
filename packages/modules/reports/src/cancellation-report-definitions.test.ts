import { expect, test } from 'vitest';
import { cancellationReportDefinitions } from './cancellation-report-definitions.js';
import { ReportsService } from './index.js';

test('cancellation catalog preserves separate snapshot and history contracts in the engine', () => {
  const createdAt = '2026-05-28T00:00:00.000Z';
  const definitions = cancellationReportDefinitions(createdAt);
  const [snapshot, history] = definitions;
  expect(snapshot?.id).toBe('commercial-deleted-sales');
  expect(history?.id).toBe('commercial-cancellation-history');
  expect(snapshot?.columns.map((column) => column.key)).toContain('createdAt');
  expect(snapshot?.columns.map((column) => column.key)).not.toContain('cancelledAt');
  expect(history?.columns.map((column) => column.key)).toEqual(
    expect.arrayContaining([
      'cancelledAt',
      'cancelledByUserId',
      'reason',
      'eventId',
      'correlationId'
    ])
  );
  expect(history?.columns.map((column) => column.key)).not.toContain('createdAt');
  const catalog = new ReportsService().listDefinitions('catalog-account' as never);
  for (const definition of definitions) {
    expect(definition.requiredPermission).toBe('counter_sale.read');
    expect(definition.supportedFormats).toEqual(['json', 'csv', 'xlsx', 'pdf']);
    expect(definition.createdAt).toBe(createdAt);
    expect(catalog.find((item) => item.id === definition.id)).toEqual(definition);
  }
});
