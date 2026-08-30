import { loadWorkerConfig } from '@cvg-his-v2/shared-config';
import { createLogger } from '@cvg-his-v2/shared-logging';
import { createCorrelationId } from '@cvg-his-v2/shared-utils';
import { missingProductionConsumers } from '@cvg-his-v2/module-event-bus';
import { runWithTenantContext } from '@cvg-his-v2/tenant-context';
import {
  resolveWorkerReportServicePrincipal,
  resolveWorkerReportsUserId
} from './worker-report-identity.js';

import { bootstrapWorkerServices, shutdownWorkerServices } from './bootstrap.js';
import {
  createWorkerNotifications,
  createWorkerEventBus,
  createWorkerReports,
  runWorkerTick,
  runEventBusTick,
  runWebhookDeliveriesTick,
  runScheduledReportsTick,
  runFailedReportDeliveriesTick
} from './runner.js';

async function main() {
  const config = loadWorkerConfig(process.env);
  const configuredWorkerReportsUserId = resolveWorkerReportsUserId(config.workerReportsUserId);
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
  const workerReportsUserId = await resolveWorkerReportServicePrincipal(
    accountId,
    configuredWorkerReportsUserId
  );
  await runWithTenantContext(
    { tenantId: accountId, accountId, correlationId: createCorrelationId('worker-hydrate') },
    () => bootstrap.eventConsumers?.hydrateAccount(accountId as never)
  );

  await runWithTenantContext(
    { tenantId: accountId, accountId, correlationId: createCorrelationId('worker') },
    () =>
      runWorkerTick(
        logger,
        {
          service: config.appName,
          environment: config.environment,
          correlationId: createCorrelationId('worker'),
          persistenceMode: bootstrap.notificationRepository ? 'database' : 'in-memory',
          databaseHealthy: bootstrap.databaseHealthy,
          databaseDetail: bootstrap.databaseDetail,
          accountId: accountId as never
        },
        notifications
      )
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

  if (!bootstrap.webhookDeliveryExecutor || !bootstrap.webhookDeliverySchemaReady) {
    throw new Error('Worker webhook delivery executor is not ready');
  }
  const webhookDeliveryExecutor = bootstrap.webhookDeliveryExecutor;

  await runWithTenantContext(
    { tenantId: accountId, accountId, correlationId: createCorrelationId('worker') },
    () =>
      runWebhookDeliveriesTick(
        logger,
        {
          service: config.appName,
          environment: config.environment,
          correlationId: createCorrelationId('worker'),
          persistenceMode: 'database',
          databaseHealthy: bootstrap.databaseHealthy,
          databaseDetail: bootstrap.databaseDetail,
          accountId: accountId as never
        },
        webhookDeliveryExecutor,
        process.env.WORKER_INSTANCE_ID?.trim() || `run-once-webhook-${process.pid}`
      )
  );

  const reports = createWorkerReports({
    reportRepository: bootstrap.reportRepository
  });
  const scheduledReportResult = await runWithTenantContext(
    { tenantId: accountId, accountId, correlationId: createCorrelationId('worker') },
    () =>
      runScheduledReportsTick(
        logger,
        {
          service: config.appName,
          environment: config.environment,
          correlationId: createCorrelationId('worker'),
          persistenceMode: 'database',
          databaseHealthy: bootstrap.databaseHealthy,
          databaseDetail: bootstrap.databaseDetail,
          accountId: accountId as never,
          runAsUserId: workerReportsUserId
        },
        reports,
        bootstrap.reportSources,
        bootstrap.audit
      )
  );

  if (process.env.WORKER_REPORTS_RETRY_FAILED === '1') {
    await runWithTenantContext(
      { tenantId: accountId, accountId, correlationId: createCorrelationId('worker') },
      async () => {
        await reports.hydrateFromDatabase(accountId as never);
        await runFailedReportDeliveriesTick(
          logger,
          {
            service: config.appName,
            environment: config.environment,
            correlationId: createCorrelationId('worker'),
            persistenceMode: 'database',
            databaseHealthy: bootstrap.databaseHealthy,
            databaseDetail: bootstrap.databaseDetail,
            accountId: accountId as never,
            runAsUserId: workerReportsUserId
          },
          reports
        );
      }
    );
  }

  if (scheduledReportResult.failures.length > 0) {
    throw new Error(
      `Scheduled report tick completed with ${scheduledReportResult.failures.length} failure(s)`
    );
  }
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await shutdownWorkerServices();
  });
