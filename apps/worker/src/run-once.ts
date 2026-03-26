import { loadWorkerConfig } from '@cvg-his-v2/shared-config';
import { createLogger } from '@cvg-his-v2/shared-logging';
import { createCorrelationId } from '@cvg-his-v2/shared-utils';

import { bootstrapWorkerServices, shutdownWorkerServices } from './bootstrap.js';
import { createWorkerNotifications, runWorkerTick } from './runner.js';

async function main() {
  const config = loadWorkerConfig(process.env);
  const logger = createLogger(config.appName);
  const bootstrap = await bootstrapWorkerServices({
    databaseUrl: process.env.DATABASE_URL
  });

  if (!bootstrap.notificationRepository) {
    throw new Error(`Worker bootstrap failed: ${bootstrap.databaseDetail}`);
  }

  const notifications = createWorkerNotifications({
    notificationRepository: bootstrap.notificationRepository
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

  await shutdownWorkerServices();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
