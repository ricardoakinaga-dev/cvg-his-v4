import { loadWorkerConfig } from '@cvg-his-v2/shared-config';
import { createLogger } from '@cvg-his-v2/shared-logging';
import { createCorrelationId } from '@cvg-his-v2/shared-utils';

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
    eventBusRepository: bootstrap.outboxRepository
  });

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

  await runEventBusTick(
    logger,
    {
      service: config.appName,
      environment: config.environment,
      correlationId: createCorrelationId('worker'),
      persistenceMode: bootstrap.outboxRepository ? 'database' : 'in-memory',
      databaseHealthy: bootstrap.databaseHealthy,
      databaseDetail: bootstrap.databaseDetail
    },
    eventBus
  );

  await shutdownWorkerServices();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
