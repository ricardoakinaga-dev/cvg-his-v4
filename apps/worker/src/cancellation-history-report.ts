import type {
  CounterSaleCancellationReportFilters,
  CounterSaleCancellationReportRow
} from '@cvg-his-v2/module-counter-sales';
import type { ReportScheduleSummary } from '@cvg-his-v2/module-reports';
import type { AccountId } from '@cvg-his-v2/shared-types';
import {
  parseScheduledReportDate,
  parseScheduledReportSearch
} from './scheduled-report-filters.js';

/** Owner: RUNTIME. Resolves the immutable cancellation-event report for scheduled runs. */
export interface ScheduledCancellationHistorySource {
  readonly persistenceMode: 'database' | 'in-memory';
  listCancellationReportRows(
    accountId: AccountId,
    filters?: CounterSaleCancellationReportFilters
  ): Promise<readonly CounterSaleCancellationReportRow[]>;
}

export async function resolveScheduledCancellationHistoryRows(
  schedule: ReportScheduleSummary,
  source: ScheduledCancellationHistorySource | undefined
): Promise<readonly Record<string, unknown>[]> {
  if (
    source?.persistenceMode !== 'database' ||
    typeof source.listCancellationReportRows !== 'function'
  ) {
    throw new Error('Scheduled report requires a database-backed cancellation history source');
  }
  const search = parseScheduledReportSearch(schedule.filters.search);
  const dateFrom = parseScheduledReportDate(schedule.filters.dateFrom, 'dateFrom');
  const dateTo = parseScheduledReportDate(schedule.filters.dateTo, 'dateTo');
  if (dateFrom && dateTo && dateFrom > dateTo) {
    throw new Error('dateFrom must be before or equal to dateTo');
  }
  const rows = await source.listCancellationReportRows(schedule.accountId, {
    ...(search ? { search } : {}),
    ...(dateFrom ? { dateFrom } : {}),
    ...(dateTo ? { dateTo } : {})
  });
  if (!Array.isArray(rows)) {
    throw new Error('Cancellation history source returned malformed rows');
  }
  if (rows.some((row) => !row || typeof row !== 'object' || Array.isArray(row))) {
    throw new Error('Cancellation history source returned malformed rows');
  }
  if (rows.length > 10_000) {
    throw new Error('Cancellation history exceeds the maximum exportable page of 10000 rows');
  }
  if (rows.some((row) => row.accountId !== schedule.accountId)) {
    throw new Error('Cancellation history source returned an invalid account');
  }
  return rows.map((row) => ({ ...row }));
}
