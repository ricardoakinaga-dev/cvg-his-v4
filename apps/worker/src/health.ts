import type { IncomingMessage } from 'node:http';

import type { HealthResponse } from '@cvg-his-v2/shared-contracts';
import { createCorrelationId, nowIso } from '@cvg-his-v2/shared-utils';

export interface WorkerHealthDeps {
  readonly databaseConfigured: boolean;
  readonly databaseHealthy: boolean;
  readonly databaseDetail: string;
  readonly persistenceMode: 'database' | 'in-memory';
  readonly ticksCompleted: number;
  readonly lastTickAt: string | null;
  readonly lastError: string | null;
  readonly initialized: boolean;
  readonly draining: boolean;
  readonly requiredEventBusConsumers: readonly string[];
  readonly registeredEventBusConsumers: readonly string[];
  readonly deliveryGuaranteesReady: boolean;
  readonly durableConsumerGuardReady: boolean;
  readonly webhookDeliveryExecutorReady: boolean;
  /** When set, a loop without a completed tick for this long is reported as stalled. */
  readonly stalledAfterMs?: number;
  /** Loop start, used as the progress reference until the first tick completes. */
  readonly loopStartedAt?: string;
}

/**
 * A hung tick never sets lastError, so progress must be judged by time: the
 * last completed tick (or the loop start) must be recent enough.
 */
export function isWorkerLoopStalled(
  progress: {
    readonly lastTickAt: string | null;
    readonly loopStartedAt?: string;
    readonly stalledAfterMs?: number;
  },
  now: number = Date.now()
): boolean {
  if (!progress.stalledAfterMs || progress.stalledAfterMs <= 0) return false;
  const reference = progress.lastTickAt ?? progress.loopStartedAt;
  if (!reference) return false;
  const referenceMs = new Date(reference).getTime();
  return Number.isFinite(referenceMs) && now - referenceMs > progress.stalledAfterMs;
}

/**
 * Public health/metrics surfaces must never echo the raw loop error. Runtime
 * failures can contain DSNs, provider payloads or other operational secrets;
 * the correlation id is the safe hand-off to the worker logs.
 */
export const WORKER_LOOP_DEGRADED_MESSAGE =
  'Worker loop degraded; inspect worker logs for the underlying failure.';

export function sanitizeWorkerDiagnostic(lastError: string | null): string | null {
  return lastError === null ? null : WORKER_LOOP_DEGRADED_MESSAGE;
}

function resolveCorrelationId(): string {
  // Health endpoints are public; never echo a caller-selected value into a
  // response body that operators may copy into diagnostics.
  return createCorrelationId('worker');
}

function resolveDatabaseState(
  deps: WorkerHealthDeps
): HealthResponse['dependencies']['database']['state'] {
  if (!deps.databaseConfigured) {
    return 'in-memory-fallback';
  }

  return deps.databaseHealthy ? 'healthy' : 'unhealthy';
}

export function createWorkerHealthResponse(
  appName: string,
  environment: string,
  version: string,
  request: IncomingMessage,
  deps: WorkerHealthDeps
): HealthResponse {
  const databaseState = resolveDatabaseState(deps);
  const repositoriesReady = deps.persistenceMode === 'database' ? deps.databaseHealthy : true;
  const loopStalled = isWorkerLoopStalled(deps);
  const loopHealthy = deps.lastError === null && !loopStalled;
  const missingConsumers = deps.requiredEventBusConsumers.filter(
    (consumer) => !deps.registeredEventBusConsumers.includes(consumer)
  );
  const consumersReady = deps.requiredEventBusConsumers.length > 0 && missingConsumers.length === 0;
  const ready =
    !deps.draining &&
    deps.databaseConfigured &&
    deps.databaseHealthy &&
    deps.persistenceMode === 'database' &&
    deps.initialized &&
    loopHealthy &&
    deps.deliveryGuaranteesReady &&
    deps.durableConsumerGuardReady &&
    deps.webhookDeliveryExecutorReady &&
    consumersReady;

  return {
    ok: ready,
    service: appName,
    version,
    environment,
    timestamp: nowIso(),
    correlationId: resolveCorrelationId(),
    liveness: {
      live: true,
      initialized: deps.initialized
    },
    readiness: {
      ready,
      productionReady: deps.databaseConfigured && ready,
      persistenceMode: deps.persistenceMode
    },
    dependencies: {
      database: {
        state: databaseState,
        detail: deps.databaseConfigured
          ? deps.databaseDetail
          : 'Worker running in degraded in-memory mode because DATABASE_URL is absent'
      },
      repositories: {
        state: repositoriesReady ? 'ready' : 'not-ready',
        detail:
          deps.persistenceMode === 'database'
            ? `Database-backed repositories ${repositoriesReady ? 'ready' : 'not ready'}`
            : 'Worker repositories running in-memory only'
      },
      worker: {
        state:
          !deps.draining && loopHealthy && consumersReady && deps.webhookDeliveryExecutorReady
            ? 'ready'
            : 'degraded',
        detail: deps.draining
          ? 'Worker is draining and no longer accepts readiness traffic'
          : !deps.deliveryGuaranteesReady
          ? 'Worker is not ready: delivery guarantee schema is unavailable'
          : !deps.durableConsumerGuardReady
            ? 'Worker is not ready: durable consumer guard is unavailable'
            : !deps.webhookDeliveryExecutorReady
              ? 'Worker is not ready: durable webhook delivery executor is unavailable'
            : !consumersReady
              ? `Worker is not ready: missing event bus consumers: ${missingConsumers.join(', ') || 'manifest empty'}`
              : loopStalled
                ? `Worker loop stalled: no completed tick within ${deps.stalledAfterMs}ms; lastTickAt=${deps.lastTickAt ?? 'never'}`
                : loopHealthy
                  ? `Loop healthy; ticks=${deps.ticksCompleted}; lastTickAt=${deps.lastTickAt ?? 'never'}`
                  : WORKER_LOOP_DEGRADED_MESSAGE
      }
    },
    eventBus: {
      requiredConsumers: [...deps.requiredEventBusConsumers],
      registeredConsumers: [...deps.registeredEventBusConsumers],
      deliveryGuaranteesReady: deps.deliveryGuaranteesReady,
      durableConsumerGuardReady: deps.durableConsumerGuardReady
    }
  };
}

export function createWorkerReadinessResponse(
  appName: string,
  environment: string,
  version: string,
  request: IncomingMessage,
  deps: WorkerHealthDeps
): HealthResponse {
  return createWorkerHealthResponse(appName, environment, version, request, deps);
}

export function createWorkerLivenessResponse(
  appName: string,
  environment: string,
  version: string,
  request: IncomingMessage,
  initialized: boolean,
  stalled = false
): HealthResponse {
  return {
    ok: !stalled,
    service: appName,
    version,
    environment,
    timestamp: nowIso(),
    correlationId: resolveCorrelationId(),
    liveness: {
      live: !stalled,
      initialized
    },
    readiness: {
      ready: initialized,
      productionReady: false,
      persistenceMode: initialized ? 'in-memory' : 'not-initialized'
    },
    dependencies: {
      database: {
        state: 'not-configured',
        detail: 'Liveness probe does not validate database connectivity'
      },
      repositories: {
        state: initialized ? 'ready' : 'not-ready',
        detail: initialized ? 'Worker process initialized' : 'Worker process still initializing'
      },
      worker: {
        state: initialized && !stalled ? 'ready' : 'degraded',
        detail: stalled
          ? 'Worker loop stalled; restart required'
          : initialized
            ? 'Worker process loop initialized'
            : 'Worker process not initialized'
      }
    }
  };
}
