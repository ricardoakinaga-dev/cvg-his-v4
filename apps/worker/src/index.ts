import { loadWorkerConfig } from '@cvg-his-v2/shared-config';
import { createLogger } from '@cvg-his-v2/shared-logging';
import { runWithTenantContext } from '@cvg-his-v2/tenant-context';
import { createCorrelationId, sleep } from '@cvg-his-v2/shared-utils';
import { PRODUCTION_EVENT_CONSUMERS } from '@cvg-his-v2/module-event-bus';
import { createServer } from 'node:http';

import { bootstrapWorkerServices, shutdownWorkerServices } from './bootstrap.js';
import { startWorkerObservability, withWorkerSpan } from './observability.js';
import { createWorkerNotifications, createWorkerEventBus, createWorkerReports } from './runner.js';
import { runWorkerTick, runEventBusTick, runScheduledReportsTick } from './runner.js';
import { createWorkerFeatureFlags } from './feature-flags.js';
import {
  createWorkerFeatureFlagMetricsCollector,
  getWorkerMetricsText,
  setPixProviderSettlementReconciliationRequired
} from './worker-metrics.js';
import {
  createWorkerHealthResponse,
  createWorkerLivenessResponse,
  createWorkerReadinessResponse
} from './health.js';
import { refreshWorkerAccounts } from './account-discovery.js';
import { runPixPaymentDispatchTick } from './jobs/local-pix-payment-dispatch-provider.js';
import { runPixProviderSettlementTick } from './jobs/pix-provider-settlement-consumer.js';

const config = loadWorkerConfig(process.env);
const logger = createLogger(config.appName);
let workerObservabilityShutdown: (() => Promise<void>) | null = null;
const configuredWorkerAccountId = process.env.WORKER_ACCOUNT_ID?.trim();
const ACCOUNT_REFRESH_INTERVAL_MS = 60_000;
const PIX_SETTLEMENT_DLQ_REFRESH_INTERVAL_MS = 15_000;

const workerState = {
  startedAt: new Date().toISOString(),
  ticksCompleted: 0,
  lastTickAt: null as string | null,
  lastTickDurationMs: 0,
  errors: 0,
  lastError: null as string | null,
  databaseHealthy: false,
  persistenceMode: 'in-memory' as 'database' | 'in-memory'
};

async function main() {
  const observability = await startWorkerObservability({
    enabled: config.otelEnabled,
    serviceName: config.otelServiceName,
    environment: config.environment,
    serviceVersion: '0.1.0',
    otlpProtocol: config.otlpProtocol,
    otlpTracesEndpoint: config.otlpTracesEndpoint,
    otlpHeaders: config.otlpHeaders
  });
  workerObservabilityShutdown = observability.shutdown;

  const shutdownObservability = () =>
    observability.shutdown().catch((error) => {
      logger.error('failed to shutdown worker observability', {
        error: error instanceof Error ? error.message : String(error)
      });
    });

  process.once('SIGTERM', () => {
    void shutdownObservability().finally(() => process.exit(0));
  });
  process.once('SIGINT', () => {
    void shutdownObservability().finally(() => process.exit(0));
  });

  const bootstrap = await bootstrapWorkerServices({
    databaseUrl: config.databaseUrl,
    environment: config.environment,
    allowSyntheticPixProvider: process.env.WORKER_PIX_SYNTHETIC_ENABLED === '1',
    pixDispatcherWorkerId: process.env.WORKER_INSTANCE_ID,
    pixProviderSettlementEnabled: process.env.WORKER_PIX_SETTLEMENT_ENABLED === '1',
    pixSettlementWorkerId: process.env.WORKER_INSTANCE_ID
  });
  workerState.databaseHealthy = bootstrap.databaseHealthy;
  workerState.persistenceMode = bootstrap.notificationRepository ? 'database' : 'in-memory';

  // Feature flags — evaluated once at startup with Prometheus metrics collector (PR-FF-13, GAP-12)
  const workerFeatureFlags = createWorkerFeatureFlags({
    environment: config.environment,
    enabledKeys: config.workerFeatureFlags,
    metrics: createWorkerFeatureFlagMetricsCollector()
  });

  logger.info('worker feature flags initialized', {
    service: config.appName,
    providerName: workerFeatureFlags.providerName,
    runtimeDistributedStateEnabled: workerFeatureFlags.runtimeDistributedStateEnabled,
    notificationsWhatsappProviderEnabled: workerFeatureFlags.notificationsWhatsappProviderEnabled
  });

  logger.info('worker dependency state', {
    service: config.appName,
    databaseHealthy: bootstrap.databaseHealthy,
    databaseDetail: bootstrap.databaseDetail,
    persistenceMode: workerState.persistenceMode
  });
  logger.info('worker observability state', {
    enabled: observability.enabled,
    exporter: observability.exporter,
    endpoint: observability.endpoint
  });

  const notifications = createWorkerNotifications({
    notificationRepository: bootstrap.notificationRepository
  });

  const eventBus = createWorkerEventBus({
    eventBusRepository: bootstrap.outboxRepository,
    unitOfWork: bootstrap.unitOfWork,
    workerId: process.env.WORKER_INSTANCE_ID?.trim()
  });

  const reports = createWorkerReports({
    reportRepository: bootstrap.reportRepository
  });

  const loadAccountIds = bootstrap.loadAccountIds ?? (async () => bootstrap.accountIds ?? []);
  let workerAccountIds: readonly string[] = [];
  let lastAccountRefreshAt = 0;
  let lastPixSettlementDlqRefreshAt = 0;

  const refreshAccounts = async (tolerateLoadFailure: boolean): Promise<void> => {
    const refresh = await refreshWorkerAccounts({
      currentAccountIds: workerAccountIds,
      configuredAccountId: configuredWorkerAccountId,
      loadAccountIds,
      environment: config.environment,
      tolerateLoadFailure
    });

    for (const accountId of refresh.discoveredAccountIds) {
      await runWithTenantContext(
        { tenantId: accountId, accountId, correlationId: createCorrelationId('worker-hydrate') },
        () => reports.hydrateFromDatabase(accountId as never)
      );
    }

    workerAccountIds = refresh.accountIds;
    lastAccountRefreshAt = Date.now();
    if (refresh.loadError) {
      logger.warn('worker account refresh failed; retaining last known accounts', {
        error: refresh.loadError,
        accountCount: workerAccountIds.length
      });
    }
  };

  await refreshAccounts(false);

  const refreshPixSettlementDlqBacklog = async (): Promise<void> => {
    const pixProviderSettlement = bootstrap.pixProviderSettlement;
    if (!pixProviderSettlement) return;
    try {
      const counts = await Promise.all(
        workerAccountIds.map((accountId) =>
          pixProviderSettlement.countReconciliationRequired(accountId)
        )
      );
      setPixProviderSettlementReconciliationRequired(
        counts.reduce((total, count) => total + count, 0)
      );
      lastPixSettlementDlqRefreshAt = Date.now();
    } catch (error) {
      logger.warn('worker PIX settlement DLQ backlog refresh failed', {
        error: error instanceof Error ? error.message : String(error),
        accountCount: workerAccountIds.length
      });
    }
  };

  await refreshPixSettlementDlqBacklog();

  const healthServer = createServer(async (req, res) => {
    res.setHeader('content-type', 'application/json');
    if (req.url === '/health') {
      const payload = {
        ...createWorkerHealthResponse('worker', config.environment, '0.1.0', req, {
          databaseConfigured: Boolean(config.databaseUrl),
          databaseHealthy: workerState.databaseHealthy,
          databaseDetail: workerState.databaseHealthy
            ? 'database connected'
            : 'database unavailable',
          persistenceMode: workerState.persistenceMode,
          ticksCompleted: workerState.ticksCompleted,
          lastTickAt: workerState.lastTickAt,
          lastError: workerState.lastError,
          initialized: true,
          requiredEventBusConsumers: PRODUCTION_EVENT_CONSUMERS,
          registeredEventBusConsumers: eventBus.consumerNames,
          deliveryGuaranteesReady: Boolean(bootstrap.unitOfWork),
          durableConsumerGuardReady: eventBus.deliveryGuaranteesDurable
        }),
        worker: {
          startedAt: workerState.startedAt,
          lastTickDurationMs: workerState.lastTickDurationMs,
          errors: workerState.errors,
          memory: process.memoryUsage(),
          uptime: process.uptime(),
          pixProviderSettlementEnabled: Boolean(bootstrap.pixProviderSettlement)
        }
      };
      res.writeHead(200);
      res.end(JSON.stringify(payload));
    } else if (req.url === '/live' || req.url === '/health/live') {
      const payload = createWorkerLivenessResponse(
        'worker',
        config.environment,
        '0.1.0',
        req,
        true
      );
      res.writeHead(200);
      res.end(JSON.stringify(payload));
    } else if (req.url === '/ready') {
      const payload = createWorkerReadinessResponse('worker', config.environment, '0.1.0', req, {
        databaseConfigured: Boolean(config.databaseUrl),
        databaseHealthy: workerState.databaseHealthy,
        databaseDetail: workerState.databaseHealthy ? 'database connected' : 'database unavailable',
        persistenceMode: workerState.persistenceMode,
        ticksCompleted: workerState.ticksCompleted,
        lastTickAt: workerState.lastTickAt,
        lastError: workerState.lastError,
        initialized: true,
        requiredEventBusConsumers: PRODUCTION_EVENT_CONSUMERS,
        registeredEventBusConsumers: eventBus.consumerNames,
        deliveryGuaranteesReady: Boolean(bootstrap.unitOfWork),
        durableConsumerGuardReady: eventBus.deliveryGuaranteesDurable
      });
      res.writeHead(payload.readiness.ready ? 200 : 503);
      res.end(JSON.stringify(payload));
    } else if (req.url === '/health/ready') {
      const payload = createWorkerReadinessResponse('worker', config.environment, '0.1.0', req, {
        databaseConfigured: Boolean(config.databaseUrl),
        databaseHealthy: workerState.databaseHealthy,
        databaseDetail: workerState.databaseHealthy ? 'database connected' : 'database unavailable',
        persistenceMode: workerState.persistenceMode,
        ticksCompleted: workerState.ticksCompleted,
        lastTickAt: workerState.lastTickAt,
        lastError: workerState.lastError,
        initialized: true,
        requiredEventBusConsumers: PRODUCTION_EVENT_CONSUMERS,
        registeredEventBusConsumers: eventBus.consumerNames,
        deliveryGuaranteesReady: Boolean(bootstrap.unitOfWork),
        durableConsumerGuardReady: eventBus.deliveryGuaranteesDurable
      });
      res.writeHead(payload.readiness.ready ? 200 : 503);
      res.end(JSON.stringify(payload));
    } else if (req.url === '/metrics') {
      // Return Prometheus text format for scraping
      const acceptHeader = req.headers.accept ?? '';
      if (acceptHeader.includes('text/plain')) {
        const metricsText = await getWorkerMetricsText();
        res.setHeader('content-type', 'text/plain; version=0.0.4; charset=utf-8');
        res.writeHead(200);
        res.end(metricsText);
      } else {
        // Fallback JSON for human inspection
        res.setHeader('content-type', 'application/json');
        res.writeHead(200);
        res.end(
          JSON.stringify({
            service: 'worker',
            startedAt: workerState.startedAt,
            ticksCompleted: workerState.ticksCompleted,
            lastTickAt: workerState.lastTickAt,
            lastTickDurationMs: workerState.lastTickDurationMs,
            errors: workerState.errors,
            lastError: workerState.lastError,
            databaseHealthy: workerState.databaseHealthy,
            persistenceMode: workerState.persistenceMode,
            memory: process.memoryUsage(),
            uptime: process.uptime()
          })
        );
      }
    } else {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'not found' }));
    }
  });

  healthServer.listen(config.healthPort, () => {
    logger.info('worker health endpoint listening', { port: config.healthPort });
  });

  while (true) {
    const correlationId = createCorrelationId('worker');
    const tickStart = Date.now();
    let isolatedTickError: string | null = null;
    try {
      if (Date.now() - lastAccountRefreshAt >= ACCOUNT_REFRESH_INTERVAL_MS) {
        await refreshAccounts(true);
      }
      if (
        bootstrap.pixProviderSettlement &&
        Date.now() - lastPixSettlementDlqRefreshAt >= PIX_SETTLEMENT_DLQ_REFRESH_INTERVAL_MS
      ) {
        await refreshPixSettlementDlqBacklog();
      }

      const tickContext = {
        service: config.appName,
        environment: config.environment,
        correlationId,
        persistenceMode: workerState.persistenceMode,
        databaseHealthy: workerState.databaseHealthy,
        databaseDetail: 'connected'
      };

      for (const accountId of workerAccountIds) {
        const tenantContext = { tenantId: accountId, accountId, correlationId };
        const pixPaymentDispatch = bootstrap.pixPaymentDispatch;
        if (pixPaymentDispatch) {
          await withWorkerSpan(
            'worker.pix_payment.dispatch.tick',
            {
              'worker.correlation_id': correlationId,
              'worker.account_id': accountId,
              'worker.persistence_mode': workerState.persistenceMode,
              'worker.database_healthy': workerState.databaseHealthy
            },
            async () => {
              const [outcome] = await runPixPaymentDispatchTick(pixPaymentDispatch.dispatcher, [
                accountId
              ]);
              if (!outcome || outcome.status === 'failed') {
                const error = outcome?.error;
                isolatedTickError = error instanceof Error ? error.message : String(error);
                workerState.errors++;
                logger.error('worker PIX payment dispatch tick failed', {
                  accountId,
                  error: isolatedTickError
                });
                return;
              }
              const result = outcome.result;
              logger.info('worker PIX payment dispatch tick complete', {
                accountId,
                status: result?.status ?? 'idle',
                attemptId: result && 'attemptId' in result ? result.attemptId : undefined
              });
            }
          );
        }
        const pixProviderSettlement = bootstrap.pixProviderSettlement;
        if (pixProviderSettlement) {
          await withWorkerSpan(
            'worker.pix_provider.settlement.tick',
            {
              'worker.correlation_id': correlationId,
              'worker.account_id': accountId,
              'worker.persistence_mode': workerState.persistenceMode,
              'worker.database_healthy': workerState.databaseHealthy
            },
            async () => {
              const [outcome] = await runPixProviderSettlementTick(pixProviderSettlement.consumer, [
                accountId
              ]);
              if (!outcome || outcome.error) {
                isolatedTickError = outcome?.error?.message ?? 'PIX settlement tick failed';
                workerState.errors++;
                logger.error('worker PIX provider settlement tick failed', {
                  accountId,
                  error: isolatedTickError
                });
                return;
              }
              logger.info('worker PIX provider settlement tick complete', {
                event: 'pix_provider_settlement.delivery_outcome',
                accountId,
                status: outcome.result?.status ?? 'idle',
                deliveryId:
                  outcome.result && 'deliveryId' in outcome.result
                    ? outcome.result.deliveryId
                    : undefined,
                failureClass:
                  outcome.result && 'failureClass' in outcome.result
                    ? outcome.result.failureClass
                    : undefined,
                failureCode:
                  outcome.result && 'failureCode' in outcome.result
                    ? outcome.result.failureCode
                    : undefined,
                reconciliationRequiredPromotions:
                  outcome.result && outcome.result.reconciliationRequiredPromotions
                    ? outcome.result.reconciliationRequiredPromotions
                    : undefined
              });
            }
          );
        }
        await withWorkerSpan(
          'worker.notifications.tick',
          {
            'worker.correlation_id': correlationId,
            'worker.account_id': accountId,
            'worker.persistence_mode': workerState.persistenceMode,
            'worker.database_healthy': workerState.databaseHealthy
          },
          () =>
            runWithTenantContext(tenantContext, () =>
              runWorkerTick(
                logger,
                { ...tickContext, accountId: accountId as never },
                notifications
              )
            )
        );

        await withWorkerSpan(
          'worker.event_bus.tick',
          {
            'worker.correlation_id': correlationId,
            'worker.account_id': accountId,
            'worker.persistence_mode': workerState.persistenceMode,
            'worker.database_healthy': workerState.databaseHealthy
          },
          () =>
            runWithTenantContext(tenantContext, () =>
              runEventBusTick(logger, tickContext, eventBus)
            )
        );

        await withWorkerSpan(
          'worker.reports.scheduled.tick',
          {
            'worker.correlation_id': correlationId,
            'worker.persistence_mode': workerState.persistenceMode,
            'worker.database_healthy': workerState.databaseHealthy
          },
          async () => {
            await runWithTenantContext(
              {
                tenantId: accountId,
                accountId,
                correlationId
              },
              () =>
                runScheduledReportsTick(
                  logger,
                  {
                    ...tickContext,
                    accountId: accountId as never,
                    runAsUserId: (process.env.WORKER_REPORTS_USER_ID?.trim() || accountId) as never
                  },
                  reports,
                  bootstrap.reportSources
                )
            );
          }
        );
      }

      workerState.ticksCompleted++;
      workerState.lastTickAt = new Date().toISOString();
      workerState.lastTickDurationMs = Date.now() - tickStart;
      workerState.lastError = isolatedTickError;
    } catch (error) {
      workerState.errors++;
      workerState.lastError = error instanceof Error ? error.message : String(error);
      logger.error('worker tick failed', { error: workerState.lastError });
    }
    await sleep(config.intervalMs);
  }
}

main()
  .catch((error) => {
    logger.error('worker crashed', {
      service: config.appName,
      error: error.message,
      stack: error.stack
    });
    process.exitCode = 1;
  })
  .finally(async () => {
    if (workerObservabilityShutdown) {
      await workerObservabilityShutdown();
    }
    await shutdownWorkerServices();
  });
