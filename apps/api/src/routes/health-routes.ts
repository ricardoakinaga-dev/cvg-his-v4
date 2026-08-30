/**
 * Health, readiness, and liveness route handlers.
 * First module cut extracted from server.ts to reduce coupling.
 * These handlers are registered in server.ts and called per request.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { ChaosEngine, DATABASE_FAILURE_ID } from '@cvg-his-v2/chaos';
import type { RateLimiterHealth } from '@cvg-his-v2/shared-rate-limiter';
import type { ApiServerOptions } from '../server.js';
import { createReadinessResponse, createLivenessResponse } from '../health.js';
import { getAppState } from '../app-state.js';
import { resolveOperationalRuntimeState } from '../chaos-operational-state.js';
import { generateSLOReport, getSLOConfigs } from '../slos.js';
import { getCurrentSloSnapshot, updateSloMetrics } from '../metrics.js';

const REDIS_HEALTH_PROBE_TIMEOUT_MS = 1_000;

/**
 * Handle all /health, /ready, /live routes.
 * Returns true if the request was handled, false otherwise.
 */
export async function handleHealthRoutes(
  request: IncomingMessage,
  response: ServerResponse,
  options: ApiServerOptions
): Promise<boolean> {
  const url = request.url ?? '/';
  const method = request.method ?? 'GET';

  if (method !== 'GET') return false;

  // Liveness must remain independent from Redis, the database, and every
  // other dependency so an orchestrator can restart a degraded instance.
  if (url === '/live' || url === '/health/live') {
    const appState = getAppState();
    const payload = createLivenessResponse(
      options.appName,
      options.environment,
      options.version,
      request,
      appState.initialized,
      ChaosEngine.getInstance().isActive(DATABASE_FAILURE_ID)
        ? 'unavailable'
        : appState.persistenceMode
    );
    response.setHeader('content-type', 'application/json');
    response.statusCode = 200;
    response.end(JSON.stringify(payload));
    return true;
  }

  const appState = getAppState();
  const activeExperimentIds = ChaosEngine.getInstance()
    .listActiveExperiments()
    .map((experiment) => experiment.id);
  const runtimeDistributedStateEnabled =
    options.runtimeDistributedStateEnabled ??
    options.featureFlags?.runtimeDistributedStateEnabled ??
    false;
  const operationalEndpoint = url === '/health' || url === '/ready' || url === '/health/ready';
  const redisHealth = operationalEndpoint
    ? await resolveRedisHealthStatus(options, runtimeDistributedStateEnabled)
    : undefined;
  const operationalState = resolveOperationalRuntimeState({
    appState,
    activeExperimentIds,
    runtimeDistributedStateEnabled,
    redisUrl: options.redisUrl,
    redisHealth
  });

  // GET /health
  if (url === '/health') {
    const persistenceHealthy = appState.databaseConfigured
      ? operationalState.persistenceMode === 'database' &&
        operationalState.databaseHealthy &&
        appState.repositoriesReady
      : operationalState.persistenceMode === 'in-memory' && appState.repositoriesReady;
    const distributedStateHealthy =
      !operationalState.runtimeDistributedStateEnabled ||
      (operationalState.redisConfigured && operationalState.redisHealthy);
    const payload = {
      ok: persistenceHealthy && distributedStateHealthy,
      service: options.appName,
      version: options.version,
      environment: options.environment,
      timestamp: new Date().toISOString(),
      uptime: Math.round(process.uptime()),
      memory: process.memoryUsage(),
      persistenceMode: operationalState.persistenceMode,
      activeChaosExperiments: operationalState.activeExperimentIds,
      redisHealthy: operationalState.redisHealthy,
      rateLimiterMode: operationalState.rateLimiterMode
    };
    response.setHeader('content-type', 'application/json');
    response.statusCode = 200;
    response.end(JSON.stringify(payload));
    return true;
  }

  // GET /ready
  if (url === '/ready') {
    const payload = createReadinessResponse(
      options.appName,
      options.environment,
      options.version,
      request,
      {
        databaseConfigured: appState.databaseConfigured,
        databaseHealthy: operationalState.databaseHealthy,
        databaseDetail: operationalState.databaseDetail,
        persistenceMode: operationalState.persistenceMode,
        repositoriesReady: appState.repositoriesReady,
        repositoryCount: appState.repositoryCount,
        workerReady: operationalState.workerReady,
        workerDetail: operationalState.workerDetail,
        productionReady: operationalState.productionReady,
        initialized: appState.initialized,
        secretsManagerProvider: appState.secretsManagerProvider,
        mlReady: appState.mlReady,
        mlDetail: appState.mlDetail,
        redisConfigured: operationalState.redisConfigured,
        redisHealthy: operationalState.redisHealthy,
        redisDetail: operationalState.redisDetail,
        runtimeDistributedStateEnabled: operationalState.runtimeDistributedStateEnabled,
        rateLimiterMode: operationalState.rateLimiterMode
      }
    );
    response.setHeader('content-type', 'application/json');
    response.statusCode = payload.readiness.ready ? 200 : 503;
    response.end(JSON.stringify(payload));
    return true;
  }

  // GET /health/ready
  if (url === '/health/ready') {
    const payload = createReadinessResponse(
      options.appName,
      options.environment,
      options.version,
      request,
      {
        databaseConfigured: appState.databaseConfigured,
        databaseHealthy: operationalState.databaseHealthy,
        databaseDetail: operationalState.databaseDetail,
        persistenceMode: operationalState.persistenceMode,
        repositoriesReady: appState.repositoriesReady,
        repositoryCount: appState.repositoryCount,
        workerReady: operationalState.workerReady,
        workerDetail: operationalState.workerDetail,
        productionReady: operationalState.productionReady,
        initialized: appState.initialized,
        secretsManagerProvider: appState.secretsManagerProvider,
        mlReady: appState.mlReady,
        mlDetail: appState.mlDetail,
        redisConfigured: operationalState.redisConfigured,
        redisHealthy: operationalState.redisHealthy,
        redisDetail: operationalState.redisDetail,
        runtimeDistributedStateEnabled: operationalState.runtimeDistributedStateEnabled,
        rateLimiterMode: operationalState.rateLimiterMode
      }
    );
    response.setHeader('content-type', 'application/json');
    response.statusCode = payload.readiness.ready ? 200 : 503;
    response.end(JSON.stringify(payload));
    return true;
  }

  // GET /slos — SLO compliance report
  if ((url === '/slos' || url === '/health/slos') && method === 'GET') {
    const snapshot = getCurrentSloSnapshot();
    const report = generateSLOReport({
      p95LatencyMs: snapshot.p95LatencyMs,
      p99LatencyMs: snapshot.p99LatencyMs,
      availabilityPercent: snapshot.availabilityPercent,
      errorRatePercent: snapshot.errorRatePercent
    });
    updateSloMetrics(report.slos);
    response.setHeader('content-type', 'application/json');
    response.statusCode = 200;
    response.end(
      JSON.stringify(
        {
          generatedAt: snapshot.generatedAt,
          configs: getSLOConfigs(),
          snapshot,
          report,
          runbook: {
            metrics: '/metrics',
            readiness: '/ready',
            liveness: '/live'
          }
        },
        null,
        2
      )
    );
    return true;
  }

  return false;
}

/**
 * Resolves a sanitized Redis health result for operational endpoints. Health
 * payloads are public, so provider details and connection URLs never cross
 * this boundary, even when an injected probe returns an unsafe error string.
 */
export async function resolveRedisHealthStatus(
  options: Pick<
    ApiServerOptions,
    | 'authRateLimiter'
    | 'pixPaymentAttemptRateLimiter'
    | 'pixProviderWebhookRateLimiter'
    | 'redisUrl'
  >,
  runtimeDistributedStateEnabled: boolean
): Promise<RateLimiterHealth | undefined> {
  if (!runtimeDistributedStateEnabled) return undefined;

  if (!options.redisUrl) {
    return {
      healthy: false,
      backend: 'redis',
      detail: 'Redis not configured for this runtime.'
    };
  }

  const rateLimiters = [
    options.authRateLimiter,
    options.pixPaymentAttemptRateLimiter,
    options.pixProviderWebhookRateLimiter
  ].filter((rateLimiter): rateLimiter is NonNullable<typeof rateLimiter> => Boolean(rateLimiter));
  if (rateLimiters.length === 0) {
    return {
      healthy: false,
      backend: 'redis',
      detail: 'Redis health probe is unavailable.'
    };
  }

  const healthResults = await Promise.all(
    rateLimiters.map(async (rateLimiter) => {
      if (!rateLimiter.healthCheck) {
        return { healthy: false, backend: 'redis' as const };
      }

      try {
        const result = await withRedisHealthDeadline(rateLimiter.healthCheck());
        return {
          healthy: result.healthy && result.backend === 'redis',
          backend: 'redis' as const
        };
      } catch {
        return { healthy: false, backend: 'redis' as const };
      }
    })
  );

  const healthy = healthResults.every((result) => result.healthy);
  return {
    healthy,
    backend: 'redis',
    detail: healthy
      ? 'Redis rate limiter backend is healthy.'
      : 'Redis rate limiter backend is unavailable.'
  };
}

async function withRedisHealthDeadline<T>(operation: Promise<T>): Promise<T> {
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(
      () => reject(new Error('Redis health probe timed out')),
      REDIS_HEALTH_PROBE_TIMEOUT_MS
    );
  });

  try {
    return await Promise.race([operation, timeout]);
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }
}
