import {
  NotificationsService,
  type NotificationRepository
} from '@cvg-his-v2/module-notifications';
import type { Logger } from '@cvg-his-v2/shared-logging';

export interface WorkerTickContext {
  readonly service: string;
  readonly environment: string;
  readonly correlationId: string;
  readonly persistenceMode: 'database' | 'in-memory';
  readonly databaseHealthy: boolean;
  readonly databaseDetail: string;
}

export interface WorkerOptions {
  readonly notificationRepository?: NotificationRepository;
}

export function createWorkerNotifications(options?: WorkerOptions): NotificationsService {
  return new NotificationsService({
    notificationRepository: options?.notificationRepository
  });
}

const defaultNotifications = createWorkerNotifications();

export async function runWorkerTick(
  logger: Logger,
  context: WorkerTickContext,
  notifications: NotificationsService = defaultNotifications
) {
  const processed = await notifications.processPendingFromRepository({ limit: 25 });

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
