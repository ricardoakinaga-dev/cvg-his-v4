/**
 * Health, readiness, and liveness route handlers.
 * First module cut extracted from server.ts to reduce coupling.
 * These handlers are registered in server.ts and called per request.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { ChaosEngine, DATABASE_FAILURE_ID } from '@cvg-his-v2/chaos';
import { isProductionLikeEnvironment } from '@cvg-his-v2/shared-config';
import type { RateLimiterHealth } from '@cvg-his-v2/shared-rate-limiter';
import type { ApiServerOptions } from '../server.js';
import { createReadinessResponse, createLivenessResponse } from '../health.js';
import { getAppState } from '../app-state.js';
import { resolveOperationalRuntimeState } from '../chaos-operational-state.js';
import { generateSLOReport, getSLOConfigs } from '../slos.js';
import { getCurrentSloSnapshot, updateSloMetrics } from '../metrics.js';

const REDIS_HEALTH_PROBE_TIMEOUT_MS = 1_000;
// Readiness is polled by load balancers and orchestration agents. A short
// per-options cache prevents a probe storm from turning health checks into a
// Redis workload while keeping dependency state bounded to 250 ms of age.
const REDIS_HEALTH_CACHE_TTL_MS = 250;
const redisHealthCache = new WeakMap<object, RedisHealthCacheEntry>();
const ATTACHMENT_HEALTH_PROBE_TIMEOUT_MS = 1_000;
const ATTACHMENT_HEALTH_CACHE_TTL_MS = 250;
const attachmentHealthCache = new WeakMap<object, AttachmentHealthCacheEntry>();

interface RedisHealthCacheEntry {
  expiresAt: number;
  result?: RateLimiterHealth;
  inFlight?: Promise<RateLimiterHealth>;
}

export interface AttachmentDependencyReadiness {
  readonly required: boolean;
  readonly ready: boolean;
  readonly scanner: { readonly healthy: boolean; readonly detail: string };
  readonly storage: { readonly healthy: boolean; readonly detail: string };
}

interface AttachmentHealthCacheEntry {
  expiresAt: number;
  result?: AttachmentDependencyReadiness;
  inFlight?: Promise<AttachmentDependencyReadiness>;
}

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
  const [redisHealth, attachmentHealth] = operationalEndpoint
    ? await Promise.all([
        resolveRedisHealthStatus(options, runtimeDistributedStateEnabled),
        resolveAttachmentDependencyReadiness(options)
      ])
    : [undefined, undefined];
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
      ok: persistenceHealthy && distributedStateHealthy && (attachmentHealth?.ready ?? true),
      service: options.appName,
      version: options.version,
      environment: options.environment,
      timestamp: new Date().toISOString(),
      uptime: Math.round(process.uptime()),
      memory: process.memoryUsage(),
      persistenceMode: operationalState.persistenceMode,
      activeChaosExperiments: operationalState.activeExperimentIds,
      redisHealthy: operationalState.redisHealthy,
      attachmentScannerHealthy: attachmentHealth?.scanner.healthy,
      attachmentStorageHealthy: attachmentHealth?.storage.healthy,
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
        rateLimiterMode: operationalState.rateLimiterMode,
        attachmentScannerHealthy: attachmentHealth?.scanner.healthy,
        attachmentScannerDetail: attachmentHealth?.scanner.detail,
        attachmentStorageHealthy: attachmentHealth?.storage.healthy,
        attachmentStorageDetail: attachmentHealth?.storage.detail
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
        rateLimiterMode: operationalState.rateLimiterMode,
        attachmentScannerHealthy: attachmentHealth?.scanner.healthy,
        attachmentScannerDetail: attachmentHealth?.scanner.detail,
        attachmentStorageHealthy: attachmentHealth?.storage.healthy,
        attachmentStorageDetail: attachmentHealth?.storage.detail
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
 * Probes the exact scanner and storage instances used by upload requests.
 * Production-like environments fail closed on a missing probe, wrong adapter,
 * provider error, or deadline exhaustion. Local/test runtimes do not acquire
 * external dependencies merely to answer readiness.
 */
export async function resolveAttachmentDependencyReadiness(
  options: Pick<ApiServerOptions, 'environment' | 'attachmentScanner' | 'fileStorage'>
): Promise<AttachmentDependencyReadiness> {
  if (!isProductionLikeEnvironment(options.environment)) {
    return {
      required: false,
      ready: true,
      scanner: { healthy: true, detail: 'External attachment scanner is not required.' },
      storage: { healthy: true, detail: 'External attachment storage is not required.' }
    };
  }

  const cached = attachmentHealthCache.get(options);
  const now = Date.now();
  if (cached?.result && cached.expiresAt > now) return cached.result;
  if (cached?.inFlight) return cached.inFlight;

  const inFlight = probeAttachmentDependencies(options);
  const entry: AttachmentHealthCacheEntry = { expiresAt: 0, inFlight };
  attachmentHealthCache.set(options, entry);
  void inFlight.then(
    (result) => {
      entry.result = result;
      entry.expiresAt = Date.now() + ATTACHMENT_HEALTH_CACHE_TTL_MS;
      entry.inFlight = undefined;
    },
    () => attachmentHealthCache.delete(options)
  );
  return inFlight;
}

async function probeAttachmentDependencies(
  options: Pick<ApiServerOptions, 'attachmentScanner' | 'fileStorage'>
): Promise<AttachmentDependencyReadiness> {
  const [scanner, storage] = await Promise.all([
    runAttachmentProbe(
      options.attachmentScanner,
      'ClamAV attachment scanner is reachable.',
      'ClamAV attachment scanner is unavailable.'
    ),
    runAttachmentProbe(
      options.fileStorage,
      'Private attachment bucket is reachable.',
      'Private attachment bucket is unavailable.'
    )
  ]);
  return {
    required: true,
    ready: scanner.healthy && storage.healthy,
    scanner,
    storage
  };
}

async function runAttachmentProbe(
  dependency:
    | {
        readonly productionReady?: boolean;
        healthCheck?(options?: {
          readonly signal?: AbortSignal;
        }): Promise<{ readonly healthy: boolean }>;
      }
    | undefined,
  healthyDetail: string,
  unhealthyDetail: string
): Promise<{ readonly healthy: boolean; readonly detail: string }> {
  if (dependency?.productionReady !== true || !dependency.healthCheck) {
    return { healthy: false, detail: unhealthyDetail };
  }

  try {
    const result = await withAttachmentHealthDeadline(
      (signal) =>
        dependency.healthCheck?.({ signal }) ?? Promise.reject(new Error('Missing health probe'))
    );
    return result.healthy
      ? { healthy: true, detail: healthyDetail }
      : { healthy: false, detail: unhealthyDetail };
  } catch {
    return { healthy: false, detail: unhealthyDetail };
  }
}

async function withAttachmentHealthDeadline<T>(
  operation: (signal: AbortSignal) => Promise<T>
): Promise<T> {
  const controller = new AbortController();
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(() => {
      controller.abort(new Error('Attachment dependency health probe timed out'));
      reject(new Error('Attachment dependency health probe timed out'));
    }, ATTACHMENT_HEALTH_PROBE_TIMEOUT_MS);
    timeoutHandle.unref?.();
  });
  try {
    return await Promise.race([operation(controller.signal), timeout]);
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }
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

  const cached = redisHealthCache.get(options);
  const now = Date.now();
  if (cached?.result && cached.expiresAt > now) {
    return cached.result;
  }
  if (cached?.inFlight) {
    return cached.inFlight;
  }

  const inFlight = probeRedisHealthStatus(options);
  const entry: RedisHealthCacheEntry = { expiresAt: 0, inFlight };
  redisHealthCache.set(options, entry);
  void inFlight.then(
    (result) => {
      entry.result = result;
      entry.expiresAt = Date.now() + REDIS_HEALTH_CACHE_TTL_MS;
      entry.inFlight = undefined;
    },
    () => {
      redisHealthCache.delete(options);
    }
  );
  return inFlight;
}

async function probeRedisHealthStatus(
  options: Pick<
    ApiServerOptions,
    | 'authRateLimiter'
    | 'pixPaymentAttemptRateLimiter'
    | 'pixProviderWebhookRateLimiter'
    | 'redisUrl'
  >
): Promise<RateLimiterHealth> {
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
