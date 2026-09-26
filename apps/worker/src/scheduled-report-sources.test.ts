import assert from 'node:assert/strict';
import test from 'node:test';

import type { ReportScheduleSummary } from '@cvg-his-v2/module-reports';
import type { AccountId, UserId } from '@cvg-his-v2/shared-types';

import { resolveScheduledReportRows } from './scheduled-report-sources.js';

const ACCOUNT = 'acc-scheduled-report-sources' as AccountId;
const USER = 'user-scheduled-report-sources' as UserId;

function schedule(filters: Record<string, unknown> = {}): ReportScheduleSummary {
  return {
    id: 'schedule-sources-focal',
    accountId: ACCOUNT,
    reportId: 'financial-cheques',
    name: 'Cheques focal',
    frequency: 'daily',
    format: 'csv',
    filters,
    recipients: [],
    isActive: true,
    nextRunAt: '2026-06-01T10:00:00.000Z',
    lastRunAt: null,
    lastExecutionId: null,
    lastError: null,
    createdByUserId: USER,
    createdAt: '2026-05-28T10:00:00.000Z',
    updatedAt: '2026-05-28T10:00:00.000Z'
  };
}

test('scheduled report source boundary forwards tenant/date filters and maps persisted rows', async () => {
  let receivedAccountId: AccountId | undefined;
  let receivedFilters: { readonly dateFrom?: string; readonly dateTo?: string } | undefined;

  const rows = await resolveScheduledReportRows(
    schedule({ dateFrom: '2026-05-01', dateTo: '2026-05-28' }),
    {
      cheques: {
        listChequePayments: async (accountId, filters) => {
          receivedAccountId = accountId;
          receivedFilters = filters;
          return [
            {
              id: 'payment-focal-1',
              counterSaleId: 'sale-focal-1',
              accountId,
              method: 'check',
              amount: 125.5,
              installments: 2,
              reference: 'CHK-FOCAL-001',
              notes: 'focal',
              createdAt: '2026-05-12T14:30:00.000Z',
              saleNumber: 'COM-FOCAL-001',
              saleStatus: 'closed'
            }
          ];
        }
      }
    }
  );

  assert.equal(receivedAccountId, ACCOUNT);
  assert.deepEqual(receivedFilters, { dateFrom: '2026-05-01', dateTo: '2026-05-28' });
  assert.deepEqual(rows, [
    {
      paymentId: 'payment-focal-1',
      counterSaleId: 'sale-focal-1',
      saleNumber: 'COM-FOCAL-001',
      saleStatus: 'closed',
      reference: 'CHK-FOCAL-001',
      amount: 125.5,
      installments: 2,
      recordedAt: '2026-05-12T14:30:00.000Z',
      notes: 'focal'
    }
  ]);
});

test('scheduled report source boundary validates before querying and rejects foreign rows', async () => {
  let queried = false;
  const source = {
    cheques: {
      listChequePayments: async () => {
        queried = true;
        return [];
      }
    }
  };

  await assert.rejects(
    resolveScheduledReportRows(
      schedule({ dateFrom: '2026-06-01', dateTo: '2026-05-01' }),
      source
    ),
    /dateFrom must be before or equal to dateTo/
  );
  assert.equal(queried, false);

  await assert.rejects(
    resolveScheduledReportRows(schedule(), {
      cheques: {
        listChequePayments: async () => [
          {
            id: 'payment-foreign',
            counterSaleId: 'sale-foreign',
            accountId: 'foreign-account' as AccountId,
            method: 'check',
            amount: 10,
            installments: 1,
            reference: 'CHK-FOREIGN',
            notes: null,
            createdAt: '2026-05-12T14:30:00.000Z',
            saleNumber: 'COM-FOREIGN',
            saleStatus: 'closed'
          }
        ]
      }
    }),
    /Cheque report source returned a foreign account row/
  );
});
