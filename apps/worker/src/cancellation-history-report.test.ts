import assert from 'node:assert/strict';
import test from 'node:test';
import type { CounterSaleCancellationReportRow } from '@cvg-his-v2/module-counter-sales';
import type { ReportScheduleSummary } from '@cvg-his-v2/module-reports';
import {
  resolveScheduledCancellationHistoryRows,
  type ScheduledCancellationHistorySource
} from './cancellation-history-report.js';

const schedule = {
  accountId: 'account-a',
  filters: { search: ' CLIENTE ', dateFrom: '2026-09-04', dateTo: '2026-09-04' }
} as unknown as ReportScheduleSummary;
const row = {
  accountId: 'account-a',
  eventId: 'event-a',
  number: 'CS-001',
  counterSaleId: 'sale-a',
  cancelledAt: '2026-09-04T23:59:59.999Z',
  cancelledByUserId: 'operator-a',
  reason: 'Cliente desistiu',
  correlationId: 'cancel-a',
  ownerId: null,
  total: 125.5,
  discountAmount: 4.5,
  paidAmount: 25.5,
  balanceDue: 100
} as CounterSaleCancellationReportRow;

test('scheduled history forwards normalized filters and retains event values in independent rows', async () => {
  const source: ScheduledCancellationHistorySource = {
    persistenceMode: 'database',
    async listCancellationReportRows(accountId, filters) {
      assert.equal(accountId, schedule.accountId);
      assert.deepEqual(filters, {
        search: 'cliente',
        dateFrom: '2026-09-04',
        dateTo: '2026-09-04'
      });
      return [row];
    }
  };
  const rows = await resolveScheduledCancellationHistoryRows(schedule, source);
  assert.deepEqual(rows, [row]);
  assert.notEqual(rows[0], row);
});

test('scheduled history rejects missing persistence and inverted periods before querying', async () => {
  await assert.rejects(
    () => resolveScheduledCancellationHistoryRows(schedule, undefined),
    /database-backed/
  );
  let called = false;
  const source: ScheduledCancellationHistorySource = {
    persistenceMode: 'database',
    async listCancellationReportRows() {
      called = true;
      return [];
    }
  };
  await assert.rejects(
    () =>
      resolveScheduledCancellationHistoryRows(schedule, {
        ...source,
        persistenceMode: 'in-memory'
      }),
    /database-backed/
  );
  await assert.rejects(
    () =>
      resolveScheduledCancellationHistoryRows(
        {
          ...schedule,
          filters: { dateFrom: '2026-09-05', dateTo: '2026-09-04' }
        },
        source
      ),
    /before or equal/
  );
  assert.equal(called, false);
});

test('scheduled history preserves the account guard and rejects oversized exports', async () => {
  await assert.rejects(
    () =>
      resolveScheduledCancellationHistoryRows(schedule, {
        persistenceMode: 'database',
        async listCancellationReportRows() {
          return [{ ...row, accountId: 'other' as never }];
        }
      }),
    /invalid account/
  );
  await assert.rejects(
    () =>
      resolveScheduledCancellationHistoryRows(schedule, {
        persistenceMode: 'database',
        async listCancellationReportRows() {
          return Array.from({ length: 10_001 }, () => row);
        }
      }),
    /maximum exportable/
  );
});

test('scheduled history rejects a malformed source result before applying row guards', async () => {
  for (const result of [null, [null], [{}]]) {
    await assert.rejects(
      () =>
        resolveScheduledCancellationHistoryRows(schedule, {
          persistenceMode: 'database',
          async listCancellationReportRows() {
            return result as never;
          }
        }),
      /malformed rows|invalid account/
    );
  }
});
