import { loadWorkerConfig } from '@cvg-his-v2/shared-config';
import { getPool } from '@cvg-his-v2/shared-database';
import { createLogger } from '@cvg-his-v2/shared-logging';
import { createCorrelationId } from '@cvg-his-v2/shared-utils';

import { loadWorkerAccountConfig } from './account-config.js';
import {
  assertWorkerAccountsAreActive,
  createPostgresTenantTransactionRunner,
  runWorkerAccounts
} from './account-runner.js';
import { bootstrapWorkerServices, shutdownWorkerServices } from './bootstrap.js';
import {
  createWorkerNotifications,
  createWorkerEventBus,
  createWorkerReports,
  runWorkerTick,
  runEventBusTick,
  runScheduledReportsTick
} from './runner.js';

async function main() {
  const config = loadWorkerConfig(process.env);
  const workerAccountConfig = loadWorkerAccountConfig(process.env, config.environment);
  const logger = createLogger(config.appName);
  const bootstrap = await bootstrapWorkerServices({
    databaseUrl: config.databaseUrl,
    environment: config.environment
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
  const reports = createWorkerReports({
    reportRepository: bootstrap.reportRepository
  });

  await assertWorkerAccountsAreActive(getPool(), workerAccountConfig.accountIds);

  await runWorkerAccounts({
    accountIds: workerAccountConfig.accountIds,
    baseContext: {
      service: config.appName,
      environment: config.environment,
      persistenceMode: 'database',
      databaseHealthy: bootstrap.databaseHealthy,
      databaseDetail: bootstrap.databaseDetail
    },
    createCorrelationId: () => createCorrelationId('worker'),
    resolveRunAsUserId: (accountId) =>
      process.env.WORKER_REPORTS_USER_ID?.trim() || accountId,
    transaction: createPostgresTenantTransactionRunner(getPool()),
    operations: {
      notifications: (context) => runWorkerTick(logger, context, notifications),
      eventBus: (context) => runEventBusTick(logger, context, eventBus),
      scheduledReports: async (context) => {
        await reports.hydrateFromDatabase(context.accountId);
        await runScheduledReportsTick(logger, context, reports, bootstrap.reportSources);
      }
    }
  });
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(shutdownWorkerServices);
