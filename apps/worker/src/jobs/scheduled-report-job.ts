import type {
  ReportExecutionDetail,
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
    try {
      const rows = await context.resolveRows(schedule);
      const execution = await reports.execute(context.accountId, context.runAsUserId, {
        reportId: schedule.reportId,
        filters: schedule.filters,
        rows
      });
      const exported = await exportForRecipients(reports, context.runAsUserId, schedule, execution);
      if (exported) {
        await reports.recordScheduleDeliveries(context.accountId, schedule.id, {
          executionId: execution.id,
          recipients: schedule.recipients,
          status: 'sent',
          format: schedule.format,
          deliveredAt: context.asOf
        });
      }
      await reports.recordScheduleExecution(context.accountId, schedule.id, {
        executionId: execution.id,
        ranAt: context.asOf
      });
      executions.push({
        scheduleId: schedule.id,
        reportId: schedule.reportId,
        executionId: execution.id,
        rowCount: execution.rowCount,
        exported
      });
      executionMetrics.push({
        reportId: schedule.reportId,
        outcome: exported ? 'exported' : 'executed',
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
      if (schedule.recipients.length > 0) {
        await reports.recordScheduleDeliveries(context.accountId, schedule.id, {
          recipients: schedule.recipients,
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

async function exportForRecipients(
  reports: ReportsService,
  userId: UserId,
  schedule: ReportScheduleSummary,
  execution: ReportExecutionDetail
): Promise<boolean> {
  if (schedule.recipients.length === 0) return false;
  await reports.exportExecution(schedule.accountId, userId, execution.id, schedule.format);
  return true;
}
