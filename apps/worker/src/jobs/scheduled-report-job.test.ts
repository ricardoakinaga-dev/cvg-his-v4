import assert from 'node:assert/strict';
import test from 'node:test';

import { ReportsService } from '@cvg-his-v2/module-reports';
import type { Logger } from '@cvg-his-v2/shared-logging';
import type { AccountId, UserId } from '@cvg-his-v2/shared-types';

import { runScheduledReportJob } from './scheduled-report-job.js';
import { getWorkerMetricsText } from '../worker-metrics.js';

const ACCOUNT = 'acc-worker-reports' as AccountId;
const USER = 'user-worker-reports' as UserId;

const logger: Logger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
  fatal: () => {},
  child: () => logger
};

test('runScheduledReportJob executes due schedules and advances recurrence', async () => {
  const reports = new ReportsService();
  const schedule = await reports.createSchedule(ACCOUNT, USER, {
    reportId: 'administrative-executive',
    name: 'Diretoria diaria',
    frequency: 'daily',
    format: 'csv',
    recipients: ['diretoria@cvg.local']
  });

  const result = await runScheduledReportJob(reports, {
    accountId: ACCOUNT,
    runAsUserId: USER,
    asOf: schedule.nextRunAt,
    correlationId: 'corr-worker-report',
    environment: 'test',
    logger,
    resolveRows: async (dueSchedule) => [
      { domain: 'financial', metric: dueSchedule.name, value: 250, status: 'tracked' }
    ]
  });

  const updated = reports.listSchedules(ACCOUNT)[0];
  assert.equal(result.dueSchedules, 1);
  assert.equal(result.executedSchedules, 1);
  assert.equal(result.exportedSchedules, 1);
  assert.equal(result.failures.length, 0);
  assert.equal(updated?.lastExecutionId, result.executions[0]?.executionId);
  assert.equal(updated?.lastRunAt, schedule.nextRunAt);
  assert.notEqual(updated?.nextRunAt, schedule.nextRunAt);
  const deliveries = reports.listScheduleDeliveries(ACCOUNT, schedule.id);
  assert.equal(deliveries.length, 1);
  assert.equal(deliveries[0]?.recipient, 'diretoria@cvg.local');
  assert.equal(deliveries[0]?.status, 'sent');
  assert.equal(deliveries[0]?.executionId, result.executions[0]?.executionId);

  const metrics = await getWorkerMetricsText();
  assert.match(metrics, /worker_scheduled_report_schedules_total\{outcome="due"\}/);
  assert.match(metrics, /worker_scheduled_report_schedules_total\{outcome="executed"\}/);
  assert.match(metrics, /worker_scheduled_report_schedules_total\{outcome="exported"\}/);
  assert.match(
    metrics,
    /worker_scheduled_report_executions_total\{report_id="administrative-executive",outcome="exported",row_state="filled"\}/
  );
  assert.match(metrics, /worker_scheduled_report_tick_duration_ms_bucket\{le=/);
});

test('runScheduledReportJob records failures without stopping the batch', async () => {
  const reports = new ReportsService();
  const schedule = await reports.createSchedule(ACCOUNT, USER, {
    reportId: 'administrative-executive',
    name: 'Diretoria diaria com falha',
    frequency: 'daily',
    recipients: ['diretoria@cvg.local']
  });

  const result = await runScheduledReportJob(reports, {
    accountId: ACCOUNT,
    runAsUserId: USER,
    asOf: schedule.nextRunAt,
    correlationId: 'corr-worker-report-error',
    environment: 'test',
    logger,
    resolveRows: async () => {
      throw new Error('fonte indisponivel');
    }
  });

  const updated = reports.listSchedules(ACCOUNT).find((item) => item.id === schedule.id);
  assert.equal(result.dueSchedules, 1);
  assert.equal(result.executedSchedules, 0);
  assert.equal(result.failures.length, 1);
  assert.equal(updated?.lastError, 'fonte indisponivel');
  assert.equal(updated?.lastRunAt, schedule.nextRunAt);
  const deliveries = reports.listScheduleDeliveries(ACCOUNT, schedule.id);
  assert.equal(deliveries.length, 1);
  assert.equal(deliveries[0]?.recipient, 'diretoria@cvg.local');
  assert.equal(deliveries[0]?.status, 'failed');
  assert.equal(deliveries[0]?.error, 'fonte indisponivel');

  const metrics = await getWorkerMetricsText();
  assert.match(metrics, /worker_scheduled_report_schedules_total\{outcome="failed"\}/);
  assert.match(
    metrics,
    /worker_scheduled_report_executions_total\{report_id="administrative-executive",outcome="failed",row_state="not_executed"\}/
  );
});
