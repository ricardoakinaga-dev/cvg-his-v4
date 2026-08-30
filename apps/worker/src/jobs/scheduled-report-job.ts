import {
  ReportScheduleLeaseLostError,
  type ReportScheduleSummary,
  type ReportsService
} from '@cvg-his-v2/module-reports';
import type { AuditService } from '@cvg-his-v2/module-audit';
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
  readonly audit?: Pick<AuditService, 'writeAndWait'>;
  readonly resolveRows: (
    schedule: ReportScheduleSummary
  ) => Promise<readonly Record<string, unknown>[]>;
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
  const dueClaims = await reports.claimDueSchedulesWithLease(
    context.accountId,
    asOf,
    context.workerId ?? context.correlationId
  );
  const executions: ScheduledReportJobExecution[] = [];
  const failures: ScheduledReportJobFailure[] = [];
  const executionMetrics: ScheduledReportExecutionMetric[] = [];

  for (const claim of dueClaims) {
    const schedule = claim.schedule;
    let exportId: string | null = null;
    let executionId: string | null = null;
    let deliveryStarted = false;
    const scheduleClaim = {
      scheduleId: schedule.id,
      claimToken: claim.claimToken
    };
    try {
      const rows = await context.resolveRows(schedule);
      const execution = await reports.executeScheduled(
        context.accountId,
        context.runAsUserId,
        {
          reportId: schedule.reportId,
          executionId: scheduledExecutionId(context.accountId, schedule.id, schedule.nextRunAt),
          filters: schedule.filters,
          rows
        },
        scheduleClaim
      );
      executionId = execution.id;
      await context.audit?.writeAndWait({
        actorId: context.runAsUserId,
        accountId: context.accountId,
        module: 'reports',
        action: 'report_schedule_executed',
        entityType: 'report-schedule',
        entityId: schedule.id,
        correlationId: context.correlationId,
        payloadSummary: `reportId=${schedule.reportId};executionId=${execution.id};rowCount=${execution.rowCount};format=${schedule.format}`,
        riskLevel: 'medium'
      });
      const exported =
        schedule.recipients.length > 0
          ? await reports.exportScheduled(
              context.accountId,
              context.runAsUserId,
              execution.id,
              schedule.format,
              scheduleClaim
            )
          : null;
      let deliveryFailure: string | null = null;
      if (exported) {
        exportId = exported.id;
        await context.audit?.writeAndWait({
          actorId: context.runAsUserId,
          accountId: context.accountId,
          module: 'reports',
          action: 'report_schedule_exported',
          entityType: 'report-schedule',
          entityId: schedule.id,
          correlationId: context.correlationId,
          payloadSummary: `reportId=${schedule.reportId};executionId=${execution.id};exportId=${exported.id};format=${schedule.format};recipientCount=${schedule.recipients.length}`,
          riskLevel: 'medium'
        });
        const delivery = await reports.deliverExport(
          context.accountId,
          schedule.id,
          execution.id,
          exported,
          schedule.recipients,
          asOf,
          undefined,
          undefined,
          scheduleClaim.claimToken
        );
        deliveryStarted = true;
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
        claimToken: scheduleClaim.claimToken,
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
      if (error instanceof ReportScheduleLeaseLostError) {
        continue;
      }
      if (schedule.recipients.length > 0 && !deliveryStarted) {
        try {
          await reports.recordScheduleDeliveries(context.accountId, schedule.id, {
            executionId,
            recipients: schedule.recipients,
            exportId,
            status: 'failed',
            format: schedule.format,
            deliveredAt: asOf,
            error: message,
            scheduleClaimToken: scheduleClaim.claimToken
          });
        } catch (deliveryFinalizationError) {
          if (deliveryFinalizationError instanceof ReportScheduleLeaseLostError) continue;
          throw deliveryFinalizationError;
        }
      }
      try {
        await reports.recordScheduleExecution(context.accountId, schedule.id, {
          claimToken: scheduleClaim.claimToken,
          executionId: executionId ?? undefined,
          ranAt: asOf,
          error: message
        });
      } catch (finalizationError) {
        if (finalizationError instanceof ReportScheduleLeaseLostError) continue;
        throw finalizationError;
      }
    }
  }

  const exportedSchedules = executions.filter((execution) => execution.exported).length;
  recordScheduledReportMetrics({
    dueSchedules: dueClaims.length,
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
    dueSchedules: dueClaims.length,
    executedSchedules: executions.length,
    exportedSchedules,
    failures: failures.length
  });

  return {
    dueSchedules: dueClaims.length,
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
