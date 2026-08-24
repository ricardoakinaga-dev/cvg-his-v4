import type {
  ReportScheduleSummary,
  ReportsService
} from '@cvg-his-v2/module-reports';
import { createHash } from 'node:crypto';
import type { Logger } from '@cvg-his-v2/shared-logging';
import type { AccountId, UserId } from '@cvg-his-v2/shared-types';
import {
  recordScheduledReportMetrics,
  type ScheduledReportExecutionMetric
} from '../worker-metrics.js';

export interface ScheduledReportJobContext {
  readonly accountId: AccountId;
  readonly runAsUserId: UserId;
  readonly asOf?: string;
  readonly correlationId: string;
  readonly environment: string;
  readonly workerId?: string;
  readonly logger?: Logger;
  readonly resolveRows: (schedule: ReportScheduleSummary) => Promise<readonly Record<string, unknown>[]>;
}

export interface ScheduledReportJobFailure {
  readonly scheduleId: string;
  readonly reportId: string;
  readonly error: string;
}

export interface ScheduledReportJobExecution {
  readonly scheduleId: string;
  readonly reportId: string;
  readonly executionId: string;
  readonly rowCount: number;
  readonly exported: boolean;
}

export interface ScheduledReportJobResult {
  readonly dueSchedules: number;
  readonly executedSchedules: number;
  readonly exportedSchedules: number;
  readonly executions: readonly ScheduledReportJobExecution[];
  readonly failures: readonly ScheduledReportJobFailure[];
}

export async function runScheduledReportJob(
  reports: ReportsService,
  context: ScheduledReportJobContext
): Promise<ScheduledReportJobResult> {
  const startedAt = Date.now();
  const asOf = context.asOf ?? new Date().toISOString();
  const dueSchedules = await reports.claimDueSchedules(
    context.accountId,
    asOf,
    context.workerId ?? context.correlationId
  );
  const executions: ScheduledReportJobExecution[] = [];
  const failures: ScheduledReportJobFailure[] = [];
  const executionMetrics: ScheduledReportExecutionMetric[] = [];

  for (const schedule of dueSchedules) {
    let exportId: string | null = null;
    try {
      const rows = await context.resolveRows(schedule);
      const execution = await reports.execute(context.accountId, context.runAsUserId, {
        reportId: schedule.reportId,
        executionId: scheduledExecutionId(context.accountId, schedule.id, schedule.nextRunAt),
        filters: schedule.filters,
        rows
      });
      const exported = schedule.recipients.length > 0
        ? await reports.exportExecution(context.accountId, context.runAsUserId, execution.id, schedule.format)
        : null;
      let deliveryFailure: string | null = null;
      if (exported) {
        exportId = exported.id;
        const delivery = await reports.deliverExport(
          context.accountId,
          schedule.id,
          execution.id,
          exported,
          schedule.recipients,
          asOf
        );
        if (delivery.failures.length > 0) {
          deliveryFailure = delivery.failures
            .map((failure) => `${failure.recipient}: ${failure.error}`)
            .join('; ');
          failures.push({
            scheduleId: schedule.id,
            reportId: schedule.reportId,
            error: deliveryFailure
          });
        }
      }
      await reports.recordScheduleExecution(context.accountId, schedule.id, {
        executionId: execution.id,
        ranAt: asOf,
        error: deliveryFailure
      });
      executions.push({
        scheduleId: schedule.id,
        reportId: schedule.reportId,
        executionId: execution.id,
        rowCount: execution.rowCount,
        exported: Boolean(exported)
      });
      executionMetrics.push({
        reportId: schedule.reportId,
        outcome: deliveryFailure ? 'failed' : exported ? 'exported' : 'executed',
        rowState: execution.rowCount > 0 ? 'filled' : 'empty'
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push({
        scheduleId: schedule.id,
        reportId: schedule.reportId,
        error: message
      });
      executionMetrics.push({
        reportId: schedule.reportId,
        outcome: 'failed',
        rowState: 'not_executed'
      });
      if (schedule.recipients.length > 0 && !exportId) {
        await reports.recordScheduleDeliveries(context.accountId, schedule.id, {
          recipients: schedule.recipients,
          exportId,
          status: 'failed',
          format: schedule.format,
          deliveredAt: asOf,
          error: message
        });
      }
      await reports.recordScheduleExecution(context.accountId, schedule.id, {
        ranAt: asOf,
        error: message
      });
    }
  }

  const exportedSchedules = executions.filter((execution) => execution.exported).length;
  recordScheduledReportMetrics({
    dueSchedules: dueSchedules.length,
    executedSchedules: executions.length,
    exportedSchedules,
    failedSchedules: failures.length,
    durationMs: Date.now() - startedAt,
    executions: executionMetrics
  });

  context.logger?.info('scheduled report job complete', {
    correlationId: context.correlationId,
    environment: context.environment,
    accountId: context.accountId,
    dueSchedules: dueSchedules.length,
    executedSchedules: executions.length,
    exportedSchedules,
    failures: failures.length
  });

  return {
    dueSchedules: dueSchedules.length,
    executedSchedules: executions.length,
    exportedSchedules,
    executions,
    failures
  };
}

function scheduledExecutionId(accountId: string, scheduleId: string, nextRunAt: string): string {
  const digest = createHash('sha256')
    .update(`${accountId}\u001f${scheduleId}\u001f${nextRunAt}`)
    .digest('hex')
    .slice(0, 40);
  return `rep_sched_exec_${digest}`;
}
