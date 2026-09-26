import {
  NotificationsService,
  type NotificationRepository
} from '@cvg-his-v2/module-notifications';
import { EventBusService, TenantUnitOfWorkConsumerGuard } from '@cvg-his-v2/module-event-bus';
import {
  ReportsService,
  type ReportRepository
} from '@cvg-his-v2/module-reports';
import type { Logger } from '@cvg-his-v2/shared-logging';
import type { OutboxRepository } from '@cvg-his-v2/module-event-bus';
import type { AccountId, UserId } from '@cvg-his-v2/shared-types';
import type { TenantUnitOfWork } from '@cvg-his-v2/shared-database';
import type { AuditService } from '@cvg-his-v2/module-audit';
import type { WebhooksService, ProcessWebhookDeliveriesResult } from '@cvg-his-v2/module-webhooks';
import { runScheduledReportJob } from './jobs/scheduled-report-job.js';
import { createWorkerReportDeliveryProvider } from './report-delivery-provider.js';
import {
  resolveScheduledReportRows,
  type AdministrativeExecutiveReportSources
} from './scheduled-report-sources.js';

export { resolveScheduledReportRows };
export type { AdministrativeExecutiveReportSources } from './scheduled-report-sources.js';

export interface WorkerTickContext {
  readonly service: string;
  readonly environment: string;
  readonly correlationId: string;
  readonly persistenceMode: 'database' | 'in-memory';
  readonly databaseHealthy: boolean;
  readonly databaseDetail: string;
  readonly accountId?: AccountId;
}

export interface WorkerOptions {
  readonly notificationRepository?: NotificationRepository;
  readonly eventBusRepository?: OutboxRepository;
  readonly reportRepository?: ReportRepository;
  readonly unitOfWork?: TenantUnitOfWork;
  readonly workerId?: string;
  readonly reportDeliveryProvider?: import('@cvg-his-v2/module-reports').ReportDeliveryProvider;
}

export function createWorkerNotifications(options?: WorkerOptions): NotificationsService {
  return new NotificationsService({
    notificationRepository: options?.notificationRepository
  });
}

export function createWorkerEventBus(options?: WorkerOptions): EventBusService {
  return new EventBusService(options?.eventBusRepository, undefined, {
    workerId: options?.workerId,
    consumerGuard: options?.unitOfWork
      ? new TenantUnitOfWorkConsumerGuard(options.unitOfWork)
      : undefined
  });
}

export function createWorkerReports(options?: WorkerOptions): ReportsService {
  return new ReportsService({
    repository: options?.reportRepository,
    deliveryProvider: options?.reportDeliveryProvider ?? createWorkerReportDeliveryProvider()
  });
}

const defaultNotifications = createWorkerNotifications();
const defaultEventBus = createWorkerEventBus();
const defaultReports = createWorkerReports();

export async function runWorkerTick(
  logger: Logger,
  context: WorkerTickContext & { readonly accountId: AccountId },
  notifications: NotificationsService = defaultNotifications
) {
  const processed = await notifications.processPendingFromRepository(context.accountId, {
    limit: 25
  });

  logger.info('worker notification tick complete', {
    service: context.service,
    environment: context.environment,
    correlationId: context.correlationId,
    processedNotifications: processed.length,
    persistenceMode: context.persistenceMode,
    databaseHealthy: context.databaseHealthy,
    databaseDetail: context.databaseDetail
  });
}

export async function runEventBusTick(
  logger: Logger,
  context: WorkerTickContext,
  eventBus: EventBusService = defaultEventBus
) {
  const processed = await eventBus.processPending(25);

  logger.info('worker event bus tick complete', {
    service: context.service,
    environment: context.environment,
    correlationId: context.correlationId,
    processedEvents: processed.length,
    processedEventIds: processed.map((event) => event.id).slice(0, 10),
    processedCorrelationIds: Array.from(
      new Set(processed.map((event) => event.correlationId))
    ).slice(0, 10),
    persistenceMode: context.persistenceMode,
    databaseHealthy: context.databaseHealthy
  });
}

export async function runWebhookDeliveriesTick(
  logger: Logger,
  context: WorkerTickContext & { readonly accountId: AccountId },
  webhooks: WebhooksService,
  workerId: string,
  limit = 25
): Promise<ProcessWebhookDeliveriesResult> {
  const result = await webhooks.processPendingDeliveries(context.accountId, {
    workerId,
    limit
  });

  logger.info('worker webhook delivery tick complete', {
    service: context.service,
    environment: context.environment,
    correlationId: context.correlationId,
    workerId,
    ...result,
    persistenceMode: context.persistenceMode,
    databaseHealthy: context.databaseHealthy,
    databaseDetail: context.databaseDetail
  });

  return result;
}

export async function runScheduledReportsTick(
  logger: Logger,
  context: WorkerTickContext & { readonly accountId: AccountId; readonly runAsUserId: UserId },
  reports: ReportsService = defaultReports,
  reportSources: AdministrativeExecutiveReportSources = {},
  audit?: Pick<AuditService, 'writeAndWait'>
) {
  const result = await runScheduledReportJob(reports, {
    accountId: context.accountId,
    runAsUserId: context.runAsUserId,
    correlationId: context.correlationId,
    environment: context.environment,
    logger,
    audit,
    resolveRows: (schedule) => resolveScheduledReportRows(schedule, reportSources)
  });

  logger.info('worker scheduled report tick complete', {
    service: context.service,
    environment: context.environment,
    correlationId: context.correlationId,
    dueSchedules: result.dueSchedules,
    executedSchedules: result.executedSchedules,
    exportedSchedules: result.exportedSchedules,
    failures: result.failures.length,
    persistenceMode: context.persistenceMode,
    databaseHealthy: context.databaseHealthy
  });

  return result;
}

export interface FailedReportDeliveryRetryFailure {
  readonly deliveryId: string;
  readonly scheduleId: string;
  readonly error: string;
}

export async function runFailedReportDeliveriesTick(
  logger: Logger,
  context: WorkerTickContext & { readonly accountId: AccountId; readonly runAsUserId: UserId },
  reports: ReportsService,
  limit = 25
): Promise<{
  readonly attempted: number;
  readonly retried: number;
  readonly failures: readonly FailedReportDeliveryRetryFailure[];
}> {
  const retryLimit = Number.isFinite(limit) && limit > 0 ? Math.floor(limit) : 25;
  const claimedDeliveries = await reports.claimFailedScheduleDeliveries(
    context.accountId,
    context.correlationId,
    undefined,
    retryLimit
  );
  const failures: FailedReportDeliveryRetryFailure[] = [];
  let retried = 0;

  for (const claim of claimedDeliveries) {
    try {
      await reports.retryScheduleDelivery(
        context.accountId,
        context.runAsUserId,
        claim.delivery.scheduleId,
        claim.delivery.id,
        claim.claimToken
      );
      retried += 1;
    } catch (error) {
      failures.push({
        deliveryId: claim.delivery.id,
        scheduleId: claim.delivery.scheduleId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  logger.info('worker failed report delivery retry complete', {
    service: context.service,
    environment: context.environment,
    correlationId: context.correlationId,
    attempted: claimedDeliveries.length,
    retried,
    failures: failures.length,
    persistenceMode: context.persistenceMode,
    databaseHealthy: context.databaseHealthy
  });

  return {
    attempted: claimedDeliveries.length,
    retried,
    failures
  };
}
