import type {
  ReportScheduleSummary,
  ReportsService
} from '@cvg-his-v2/module-reports';
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
  const dueSchedules = reports.listDueSchedules(context.accountId, context.asOf);
  const executions: ScheduledReportJobExecution[] = [];
  const failures: ScheduledReportJobFailure[] = [];
  const executionMetrics: ScheduledReportExecutionMetric[] = [];

  for (const schedule of dueSchedules) {
    let exportId: string | null = null;
    try {
      const rows = await context.resolveRows(schedule);
      const execution = await reports.execute(context.accountId, context.runAsUserId, {
        reportId: schedule.reportId,
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
          context.asOf
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
        ranAt: context.asOf,
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
          deliveredAt: context.asOf,
          error: message
        });
      }
      await reports.recordScheduleExecution(context.accountId, schedule.id, {
        ranAt: context.asOf,
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
