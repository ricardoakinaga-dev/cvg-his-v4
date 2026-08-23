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
  readonly requiredEventBusConsumers: readonly string[];
  readonly registeredEventBusConsumers: readonly string[];
  readonly deliveryGuaranteesReady: boolean;
  readonly durableConsumerGuardReady: boolean;
}

function resolveCorrelationId(request: IncomingMessage): string {
  const correlationId = request.headers['x-correlation-id'];
  return typeof correlationId === 'string' ? correlationId : createCorrelationId('worker');
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
  const loopHealthy = deps.lastError === null;
  const missingConsumers = deps.requiredEventBusConsumers.filter(
    (consumer) => !deps.registeredEventBusConsumers.includes(consumer)
  );
  const consumersReady = deps.requiredEventBusConsumers.length > 0 && missingConsumers.length === 0;
  const ready =
    deps.databaseConfigured &&
    deps.databaseHealthy &&
    deps.persistenceMode === 'database' &&
    deps.initialized &&
    loopHealthy &&
    deps.deliveryGuaranteesReady &&
    deps.durableConsumerGuardReady &&
    consumersReady;

  return {
    ok: ready,
    service: appName,
    version,
    environment,
    timestamp: nowIso(),
    correlationId: resolveCorrelationId(request),
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
        state: loopHealthy && consumersReady ? 'ready' : 'degraded',
        detail: !deps.deliveryGuaranteesReady
          ? 'Worker is not ready: delivery guarantee schema is unavailable'
          : !deps.durableConsumerGuardReady
            ? 'Worker is not ready: durable consumer guard is unavailable'
            : !consumersReady
              ? `Worker is not ready: missing event bus consumers: ${missingConsumers.join(', ') || 'manifest empty'}`
              : loopHealthy
                ? `Loop healthy; ticks=${deps.ticksCompleted}; lastTickAt=${deps.lastTickAt ?? 'never'}`
                : `Worker loop degraded: ${deps.lastError ?? 'unknown error'}`
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
  initialized: boolean
): HealthResponse {
  return {
    ok: true,
    service: appName,
    version,
    environment,
    timestamp: nowIso(),
    correlationId: resolveCorrelationId(request),
    liveness: {
      live: true,
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
        state: initialized ? 'ready' : 'degraded',
        detail: initialized ? 'Worker process loop initialized' : 'Worker process not initialized'
      }
    }
  };
}
