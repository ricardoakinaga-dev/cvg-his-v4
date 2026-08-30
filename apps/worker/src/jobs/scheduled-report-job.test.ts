import assert from 'node:assert/strict';
import test from 'node:test';

import { ReportScheduleLeaseLostError, ReportsService } from '@cvg-his-v2/module-reports';
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

function stubScheduledArtifactPersistence(reports: ReportsService): void {
  reports.executeScheduled = async (accountId, requestedByUserId, input) =>
    reports.execute(accountId, requestedByUserId, input);
  reports.exportScheduled = async (accountId, exportedByUserId, executionId, format) =>
    reports.exportExecution(accountId, exportedByUserId, executionId, format);
}

test('runScheduledReportJob executes due schedules and advances recurrence', async () => {
  const reports = new ReportsService({
    deliveryProvider: { deliver: async () => {} }
  });
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

test('runScheduledReportJob writes non-PII audit events for execution and export', async () => {
  const reports = new ReportsService({
    deliveryProvider: { deliver: async () => {} }
  });
  const schedule = await reports.createSchedule(ACCOUNT, USER, {
    reportId: 'financial-receivables',
    name: 'Recebiveis auditados',
    frequency: 'daily',
    format: 'csv',
    recipients: ['finance@example.test']
  });
  const auditEvents: Array<{
    readonly action: string;
    readonly entityType: string;
    readonly entityId: string;
    readonly payloadSummary: string;
  }> = [];

  const result = await runScheduledReportJob(reports, {
    accountId: ACCOUNT,
    runAsUserId: USER,
    asOf: schedule.nextRunAt,
    correlationId: 'corr-worker-report-audit',
    environment: 'test',
    logger,
    audit: {
      writeAndWait: async (input: {
        readonly action: string;
        readonly entityType: string;
        readonly entityId: string;
        readonly payloadSummary: string;
      }) => {
        auditEvents.push({
          action: input.action,
          entityType: input.entityType,
          entityId: input.entityId,
          payloadSummary: input.payloadSummary
        });
      }
    },
    resolveRows: async () => [{ status: 'open', amountOutstanding: 50 }]
  } as never);

  assert.equal(result.failures.length, 0);
  assert.deepEqual(
    auditEvents.map((event) => event.action),
    ['report_schedule_executed', 'report_schedule_exported']
  );
  assert.equal(auditEvents[0]?.entityType, 'report-schedule');
  assert.equal(auditEvents[0]?.entityId, schedule.id);
  assert.equal(auditEvents[1]?.entityType, 'report-schedule');
  assert.equal(auditEvents[1]?.payloadSummary.includes('finance@example.test'), false);
  assert.equal(auditEvents[1]?.payloadSummary.includes('Recebiveis auditados'), false);
});

test('runScheduledReportJob records export-audit failures as retryable delivery history', async () => {
  let providerCalls = 0;
  const reports = new ReportsService({
    deliveryProvider: {
      deliver: async () => {
        providerCalls += 1;
      }
    }
  });
  const schedule = await reports.createSchedule(ACCOUNT, USER, {
    reportId: 'financial-receivables',
    name: 'Recebiveis com auditoria indisponivel',
    frequency: 'daily',
    format: 'csv',
    recipients: ['finance@example.test']
  });

  const result = await runScheduledReportJob(reports, {
    accountId: ACCOUNT,
    runAsUserId: USER,
    asOf: schedule.nextRunAt,
    correlationId: 'corr-worker-report-audit-failure',
    environment: 'test',
    logger,
    audit: {
      writeAndWait: async (input: { readonly action: string }) => {
        if (input.action === 'report_schedule_exported') {
          throw new Error('auditoria indisponivel');
        }
      }
    } as never,
    resolveRows: async () => [{ status: 'open', amountOutstanding: 50 }]
  });

  const delivery = reports.listScheduleDeliveries(ACCOUNT, schedule.id)[0];
  const updated = reports.listSchedules(ACCOUNT).find((item) => item.id === schedule.id);
  assert.equal(result.failures.length, 1);
  assert.equal(result.executions.length, 0);
  assert.equal(providerCalls, 0);
  assert.equal(delivery?.status, 'failed');
  assert.equal(delivery?.executionId, updated?.lastExecutionId);
  assert.ok(delivery?.exportId);
  assert.equal(delivery?.error, 'auditoria indisponivel');
  assert.equal(updated?.lastExecutionId, delivery?.executionId);
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
  assert.equal(deliveries[0]?.executionId, null);
  assert.equal(deliveries[0]?.exportId, null);
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

test('runScheduledReportJob propagates the current schedule claim token', async () => {
  const reports = new ReportsService();
  const schedule = await reports.createSchedule(ACCOUNT, USER, {
    reportId: 'administrative-executive',
    name: 'Diretoria fenced',
    frequency: 'daily'
  });
  const claimedSchedule = {
    schedule,
    claimToken: 'claim-token-current',
    claimUntil: new Date(Date.now() + 60_000).toISOString(),
    claimWorkerId: 'reports-worker-current'
  };
  const reportsWithLease = reports as unknown as {
    claimDueSchedulesWithLease: () => Promise<readonly [typeof claimedSchedule]>;
  };
  reportsWithLease.claimDueSchedulesWithLease = async () => [claimedSchedule];
  stubScheduledArtifactPersistence(reports);

  let recordedInput: Record<string, unknown> | undefined;
  reports.recordScheduleExecution = async (_accountId, _scheduleId, input) => {
    recordedInput = input as unknown as Record<string, unknown>;
    return schedule;
  };

  const result = await runScheduledReportJob(reports, {
    accountId: ACCOUNT,
    runAsUserId: USER,
    asOf: schedule.nextRunAt,
    correlationId: 'corr-worker-report-fenced',
    environment: 'test',
    logger,
    resolveRows: async () => []
  });

  assert.equal(result.failures.length, 0);
  assert.equal(recordedInput?.claimToken, 'claim-token-current');
});

test('runScheduledReportJob propagates the schedule claim into execution and export persistence', async () => {
  const reports = new ReportsService();
  const schedule = await reports.createSchedule(ACCOUNT, USER, {
    reportId: 'administrative-executive',
    name: 'Diretoria artifact fence',
    frequency: 'daily',
    format: 'csv',
    recipients: ['artifact-fenced@example.test']
  });
  const claim = {
    schedule,
    claimToken: 'claim-token-artifact-current',
    claimUntil: new Date(Date.now() + 60_000).toISOString(),
    claimWorkerId: 'reports-worker-artifact-current'
  };
  const reportsWithLease = reports as unknown as {
    claimDueSchedulesWithLease: () => Promise<readonly [typeof claim]>;
  };
  reportsWithLease.claimDueSchedulesWithLease = async () => [claim];
  stubScheduledArtifactPersistence(reports);

  let executeArguments: readonly unknown[] | undefined;
  let exportArguments: readonly unknown[] | undefined;
  const reportsWithScheduledPersistence = reports as unknown as {
    executeScheduled: (
      ...args: readonly unknown[]
    ) => Promise<Awaited<ReturnType<ReportsService['execute']>>>;
    exportScheduled: (
      ...args: readonly unknown[]
    ) => Promise<Awaited<ReturnType<ReportsService['exportExecution']>>>;
  };
  reportsWithScheduledPersistence.executeScheduled = async (...args) => {
    executeArguments = args;
    return reports.execute(ACCOUNT, USER, {
      reportId: schedule.reportId,
      rows: []
    });
  };
  reportsWithScheduledPersistence.exportScheduled = async (...args) => {
    exportArguments = args;
    return reports.exportExecution(ACCOUNT, USER, args[2] as string, 'csv');
  };
  reports.deliverExport = async () => ({ deliveries: [], failures: [] });
  reports.recordScheduleExecution = async () => schedule;

  const result = await runScheduledReportJob(reports, {
    accountId: ACCOUNT,
    runAsUserId: USER,
    asOf: schedule.nextRunAt,
    correlationId: 'corr-worker-report-artifact-fenced',
    environment: 'test',
    logger,
    resolveRows: async () => []
  });

  assert.equal(result.failures.length, 0);
  assert.deepEqual(executeArguments?.[3], {
    scheduleId: schedule.id,
    claimToken: claim.claimToken
  });
  assert.deepEqual(exportArguments?.[4], {
    scheduleId: schedule.id,
    claimToken: claim.claimToken
  });
});

test('runScheduledReportJob does not finalize after scheduled artifact lease loss', async () => {
  const reports = new ReportsService();
  const schedule = await reports.createSchedule(ACCOUNT, USER, {
    reportId: 'administrative-executive',
    name: 'Diretoria artifact lease perdida',
    frequency: 'daily',
    format: 'csv',
    recipients: ['artifact-stale@example.test']
  });
  const claim = {
    schedule,
    claimToken: 'claim-token-artifact-stale',
    claimUntil: new Date(Date.now() + 60_000).toISOString(),
    claimWorkerId: 'reports-worker-artifact-stale'
  };
  const reportsWithLease = reports as unknown as {
    claimDueSchedulesWithLease: () => Promise<readonly [typeof claim]>;
  };
  reportsWithLease.claimDueSchedulesWithLease = async () => [claim];
  reports.executeScheduled = async () => {
    throw new ReportScheduleLeaseLostError(schedule.id);
  };
  let deliveryHistoryCalls = 0;
  let finalizationCalls = 0;
  reports.recordScheduleDeliveries = async () => {
    deliveryHistoryCalls += 1;
    return [];
  };
  reports.recordScheduleExecution = async () => {
    finalizationCalls += 1;
    return schedule;
  };

  const result = await runScheduledReportJob(reports, {
    accountId: ACCOUNT,
    runAsUserId: USER,
    asOf: schedule.nextRunAt,
    correlationId: 'corr-worker-report-artifact-stale',
    environment: 'test',
    logger,
    resolveRows: async () => []
  });

  assert.equal(result.failures.length, 1);
  assert.equal(deliveryHistoryCalls, 0);
  assert.equal(finalizationCalls, 0);
});

test('runScheduledReportJob propagates the schedule claim token into export delivery', async () => {
  const reports = new ReportsService();
  const schedule = await reports.createSchedule(ACCOUNT, USER, {
    reportId: 'administrative-executive',
    name: 'Diretoria delivery fenced',
    frequency: 'daily',
    format: 'csv',
    recipients: ['delivery-fenced@example.test']
  });
  const claim = {
    schedule,
    claimToken: 'claim-token-delivery-current',
    claimUntil: new Date(Date.now() + 60_000).toISOString(),
    claimWorkerId: 'reports-worker-delivery-current'
  };
  const reportsWithLease = reports as unknown as {
    claimDueSchedulesWithLease: () => Promise<readonly [typeof claim]>;
  };
  reportsWithLease.claimDueSchedulesWithLease = async () => [claim];
  stubScheduledArtifactPersistence(reports);

  let deliveryArguments: readonly unknown[] | undefined;
  const reportsWithDelivery = reports as unknown as {
    deliverExport: (...args: readonly unknown[]) => Promise<unknown>;
  };
  reportsWithDelivery.deliverExport = async (...args) => {
    deliveryArguments = args;
    return { deliveries: [], failures: [] };
  };
  reports.recordScheduleExecution = async () => schedule;

  const result = await runScheduledReportJob(reports, {
    accountId: ACCOUNT,
    runAsUserId: USER,
    asOf: schedule.nextRunAt,
    correlationId: 'corr-worker-report-delivery-fenced',
    environment: 'test',
    logger,
    resolveRows: async () => []
  });

  assert.equal(result.failures.length, 0);
  assert.equal(deliveryArguments?.[8], claim.claimToken);
});

test('runScheduledReportJob fences failure delivery history before schedule finalization', async () => {
  const reports = new ReportsService();
  const schedule = await reports.createSchedule(ACCOUNT, USER, {
    reportId: 'administrative-executive',
    name: 'Diretoria failure delivery fenced',
    frequency: 'daily',
    recipients: ['failure-fenced@example.test']
  });
  const claim = {
    schedule,
    claimToken: 'claim-token-failure-current',
    claimUntil: new Date(Date.now() + 60_000).toISOString(),
    claimWorkerId: 'reports-worker-failure-current'
  };
  const reportsWithLease = reports as unknown as {
    claimDueSchedulesWithLease: () => Promise<readonly [typeof claim]>;
  };
  reportsWithLease.claimDueSchedulesWithLease = async () => [claim];

  const events: string[] = [];
  let deliveryInput: Record<string, unknown> | undefined;
  reports.recordScheduleDeliveries = async (_accountId, _scheduleId, input) => {
    events.push('delivery');
    deliveryInput = input as unknown as Record<string, unknown>;
    return [];
  };
  reports.recordScheduleExecution = async (_accountId, _scheduleId, input) => {
    events.push('execution');
    assert.equal(input.claimToken, claim.claimToken);
    return schedule;
  };

  const result = await runScheduledReportJob(reports, {
    accountId: ACCOUNT,
    runAsUserId: USER,
    asOf: schedule.nextRunAt,
    correlationId: 'corr-worker-report-failure-delivery-fenced',
    environment: 'test',
    logger,
    resolveRows: async () => {
      throw new Error('fonte indisponivel');
    }
  });

  assert.equal(result.failures.length, 1);
  assert.deepEqual(events, ['delivery', 'execution']);
  assert.equal(deliveryInput?.scheduleClaimToken, claim.claimToken);
});

test('runScheduledReportJob records delivery setup failures before finalizing the schedule', async () => {
  const reports = new ReportsService();
  const schedule = await reports.createSchedule(ACCOUNT, USER, {
    reportId: 'administrative-executive',
    name: 'Diretoria delivery setup failure',
    frequency: 'daily',
    format: 'csv',
    recipients: ['delivery-setup-failure@example.test']
  });
  const claim = {
    schedule,
    claimToken: 'claim-token-delivery-setup-failure',
    claimUntil: new Date(Date.now() + 60_000).toISOString(),
    claimWorkerId: 'reports-worker-delivery-setup-failure'
  };
  const reportsWithLease = reports as unknown as {
    claimDueSchedulesWithLease: () => Promise<readonly [typeof claim]>;
  };
  reportsWithLease.claimDueSchedulesWithLease = async () => [claim];
  stubScheduledArtifactPersistence(reports);

  const events: string[] = [];
  let deliveryInput: Record<string, unknown> | undefined;
  const reportsWithDelivery = reports as unknown as {
    deliverExport: (...args: readonly unknown[]) => Promise<unknown>;
  };
  reportsWithDelivery.deliverExport = async () => {
    events.push('deliver');
    throw new Error('delivery persistence unavailable');
  };
  reports.recordScheduleDeliveries = async (_accountId, _scheduleId, input) => {
    events.push('delivery-history');
    deliveryInput = input as unknown as Record<string, unknown>;
    return [];
  };
  reports.recordScheduleExecution = async (_accountId, _scheduleId, input) => {
    events.push('execution');
    assert.equal(input.claimToken, claim.claimToken);
    return schedule;
  };

  const result = await runScheduledReportJob(reports, {
    accountId: ACCOUNT,
    runAsUserId: USER,
    asOf: schedule.nextRunAt,
    correlationId: 'corr-worker-report-delivery-setup-failure',
    environment: 'test',
    logger,
    resolveRows: async () => []
  });

  assert.equal(result.failures.length, 1);
  assert.deepEqual(events, ['deliver', 'delivery-history', 'execution']);
  assert.equal(deliveryInput?.scheduleClaimToken, claim.claimToken);
  assert.equal(typeof deliveryInput?.executionId, 'string');
  assert.equal(deliveryInput?.error, 'delivery persistence unavailable');
});

test('runScheduledReportJob does not finalize after delivery lease loss', async () => {
  const reports = new ReportsService();
  const schedule = await reports.createSchedule(ACCOUNT, USER, {
    reportId: 'administrative-executive',
    name: 'Diretoria lease perdida',
    frequency: 'daily',
    recipients: ['stale@example.test']
  });
  const claim = {
    schedule,
    claimToken: 'claim-token-stale',
    claimUntil: new Date(Date.now() + 60_000).toISOString(),
    claimWorkerId: 'reports-worker-stale'
  };
  const reportsWithLease = reports as unknown as {
    claimDueSchedulesWithLease: () => Promise<readonly [typeof claim]>;
  };
  reportsWithLease.claimDueSchedulesWithLease = async () => [claim];

  let deliveryCalls = 0;
  let executionCalls = 0;
  reports.recordScheduleExecution = async () => {
    executionCalls += 1;
    return schedule;
  };
  reports.recordScheduleDeliveries = async (_accountId, _scheduleId, input) => {
    deliveryCalls += 1;
    assert.equal(input.scheduleClaimToken, claim.claimToken);
    throw new ReportScheduleLeaseLostError(schedule.id);
  };

  const result = await runScheduledReportJob(reports, {
    accountId: ACCOUNT,
    runAsUserId: USER,
    asOf: schedule.nextRunAt,
    correlationId: 'corr-worker-report-lease-lost',
    environment: 'test',
    logger,
    resolveRows: async () => {
      throw new Error('fonte indisponivel');
    }
  });

  assert.equal(result.failures.length, 1);
  assert.equal(result.failures[0]?.error, 'fonte indisponivel');
  assert.equal(deliveryCalls, 1);
  assert.equal(executionCalls, 0);
});
