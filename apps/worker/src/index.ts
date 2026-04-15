import { loadWorkerConfig } from '@cvg-his-v2/shared-config';
import { createLogger } from '@cvg-his-v2/shared-logging';
import { runWithTenantContext } from '@cvg-his-v2/tenant-context';
import { createCorrelationId, sleep } from '@cvg-his-v2/shared-utils';
import { createServer } from 'node:http';

import { bootstrapWorkerServices, shutdownWorkerServices } from './bootstrap.js';
import { startWorkerObservability, withWorkerSpan } from './observability.js';
import { createWorkerNotifications, createWorkerEventBus } from './runner.js';
import { runWorkerTick, runEventBusTick } from './runner.js';
import { createWorkerFeatureFlags } from './feature-flags.js';
import { createWorkerFeatureFlagMetricsCollector, getWorkerMetricsText } from './worker-metrics.js';

const config = loadWorkerConfig(process.env);
const logger = createLogger(config.appName);
let workerObservabilityShutdown: (() => Promise<void>) | null = null;
const workerAccountId =
  process.env.WORKER_ACCOUNT_ID?.trim() ||
  (config.environment === 'development' || config.environment === 'test' ? 'acc_cvg_demo' : '');

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
    databaseUrl: config.databaseUrl
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
    eventBusRepository: bootstrap.outboxRepository
  });

  const healthServer = createServer(async (req, res) => {
    res.setHeader('content-type', 'application/json');
    if (req.url === '/health') {
      res.writeHead(200);
      res.end(JSON.stringify({ ok: true, service: 'worker', uptime: workerState.startedAt }));
    } else if (req.url === '/ready') {
      const ready = workerState.databaseHealthy;
      res.writeHead(ready ? 200 : 503);
      res.end(
        JSON.stringify({
          ready,
          databaseHealthy: workerState.databaseHealthy,
          persistenceMode: workerState.persistenceMode
        })
      );
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
    try {
      const tickContext = {
        service: config.appName,
        environment: config.environment,
        correlationId,
        persistenceMode: workerState.persistenceMode,
        databaseHealthy: workerState.databaseHealthy,
        databaseDetail: 'connected'
      };

      await withWorkerSpan(
        'worker.notifications.tick',
        {
          'worker.correlation_id': correlationId,
          'worker.persistence_mode': workerState.persistenceMode,
          'worker.database_healthy': workerState.databaseHealthy
        },
        async () => {
          await runWithTenantContext(
            {
              tenantId: workerAccountId || correlationId,
              accountId: workerAccountId || undefined,
              correlationId
            },
            () => runWorkerTick(logger, tickContext, notifications)
          );
        }
      );

      await withWorkerSpan(
        'worker.event_bus.tick',
        {
          'worker.correlation_id': correlationId,
          'worker.persistence_mode': workerState.persistenceMode,
          'worker.database_healthy': workerState.databaseHealthy
        },
        async () => {
          await runWithTenantContext(
            {
              tenantId: workerAccountId || correlationId,
              accountId: workerAccountId || undefined,
              correlationId
            },
            () => runEventBusTick(logger, tickContext, eventBus)
          );
        }
      );

      workerState.ticksCompleted++;
      workerState.lastTickAt = new Date().toISOString();
      workerState.lastTickDurationMs = Date.now() - tickStart;
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
