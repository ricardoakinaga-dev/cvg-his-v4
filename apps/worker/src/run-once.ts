import { loadWorkerConfig } from '@cvg-his-v2/shared-config';
import { createLogger } from '@cvg-his-v2/shared-logging';
import { createCorrelationId } from '@cvg-his-v2/shared-utils';
import { missingProductionConsumers } from '@cvg-his-v2/module-event-bus';
import { runWithTenantContext } from '@cvg-his-v2/tenant-context';

import { bootstrapWorkerServices, shutdownWorkerServices } from './bootstrap.js';
import {
  createWorkerNotifications,
  createWorkerEventBus,
  runWorkerTick,
  runEventBusTick
} from './runner.js';

async function main() {
  const config = loadWorkerConfig(process.env);
  const logger = createLogger(config.appName);
  const bootstrap = await bootstrapWorkerServices({
    databaseUrl: config.databaseUrl
  });

  if (!bootstrap.notificationRepository) {
    throw new Error(`Worker bootstrap failed: ${bootstrap.databaseDetail}`);
  }

  const notifications = createWorkerNotifications({
    notificationRepository: bootstrap.notificationRepository
  });
  const eventBus = createWorkerEventBus({
    eventBusRepository: bootstrap.outboxRepository,
    unitOfWork: bootstrap.unitOfWork,
    workerId: process.env.WORKER_INSTANCE_ID?.trim()
  });
  if (bootstrap.eventConsumers) {
    bootstrap.eventConsumers.register(eventBus);
  }
  const missingConsumers = missingProductionConsumers(eventBus.consumerNames);
  if (!eventBus.deliveryGuaranteesDurable || missingConsumers.length > 0) {
    throw new Error(
      `Worker event bus is not ready: missing durable consumers: ${missingConsumers.join(', ')}`
    );
  }

  const accountId = (process.env.WORKER_ACCOUNT_ID?.trim() ?? bootstrap.accountIds?.[0]) as
    | string
    | undefined;
  if (!accountId) {
    throw new Error('WORKER_ACCOUNT_ID is required for run-once event processing');
  }
  await runWithTenantContext(
    { tenantId: accountId, accountId, correlationId: createCorrelationId('worker-hydrate') },
    () => bootstrap.eventConsumers?.hydrateAccount(accountId as never)
  );

  await runWorkerTick(
    logger,
    {
      service: config.appName,
      environment: config.environment,
      correlationId: createCorrelationId('worker'),
      persistenceMode: bootstrap.notificationRepository ? 'database' : 'in-memory',
      databaseHealthy: bootstrap.databaseHealthy,
      databaseDetail: bootstrap.databaseDetail
    },
    notifications
  );

  await runWithTenantContext(
    { tenantId: accountId, accountId, correlationId: createCorrelationId('worker') },
    () =>
      runEventBusTick(
        logger,
        {
          service: config.appName,
          environment: config.environment,
          correlationId: createCorrelationId('worker'),
          persistenceMode: bootstrap.outboxRepository ? 'database' : 'in-memory',
          databaseHealthy: bootstrap.databaseHealthy,
          databaseDetail: bootstrap.databaseDetail,
          accountId: accountId as never
        },
        eventBus
      )
  );

  await shutdownWorkerServices();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
