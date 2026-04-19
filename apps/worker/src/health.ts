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

  return {
    ok: deps.databaseConfigured ? deps.databaseHealthy : repositoriesReady,
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
      ready: deps.databaseHealthy,
      productionReady: deps.databaseConfigured && deps.databaseHealthy,
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
        state: loopHealthy ? 'ready' : 'degraded',
        detail: loopHealthy
          ? `Loop healthy; ticks=${deps.ticksCompleted}; lastTickAt=${deps.lastTickAt ?? 'never'}`
          : `Worker loop degraded: ${deps.lastError ?? 'unknown error'}`
      }
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
