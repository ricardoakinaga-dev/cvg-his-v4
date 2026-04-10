import {
  NotificationsService,
  type NotificationRepository
} from '@cvg-his-v2/module-notifications';
import { EventBusService } from '@cvg-his-v2/module-event-bus';
import type { Logger } from '@cvg-his-v2/shared-logging';
import type { OutboxRepository } from '@cvg-his-v2/module-event-bus';

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
  readonly eventBusRepository?: OutboxRepository;
}

export function createWorkerNotifications(options?: WorkerOptions): NotificationsService {
  return new NotificationsService({
    notificationRepository: options?.notificationRepository
  });
}

export function createWorkerEventBus(options?: WorkerOptions): EventBusService {
  return new EventBusService(options?.eventBusRepository);
}

const defaultNotifications = createWorkerNotifications();
const defaultEventBus = createWorkerEventBus();

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
    persistenceMode: context.persistenceMode,
    databaseHealthy: context.databaseHealthy
  });
}