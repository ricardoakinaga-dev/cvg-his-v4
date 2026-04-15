import type { IncomingMessage } from 'node:http';

import type { HealthResponse } from '@cvg-his-v2/shared-contracts';
import { createCorrelationId, nowIso } from '@cvg-his-v2/shared-utils';

import type { PersistenceMode } from './app-state.js';

export function createHealthResponse(
  appName: string,
  environment: string,
  version: string,
  request: IncomingMessage,
  deps: {
    databaseConfigured: boolean;
    databaseHealthy: boolean;
    databaseDetail: string;
    persistenceMode: PersistenceMode;
    repositoriesReady: boolean;
    repositoryCount: number;
    workerReady: boolean;
    workerDetail: string;
    productionReady: boolean;
    initialized: boolean;
    secretsManagerProvider?: 'vault' | 'env';
    /** GAP-09: ML services wired to runtime */
    mlReady: boolean;
    mlDetail: string;
  }
): HealthResponse {
  const correlationId = request.headers['x-correlation-id'];

  let dbState: 'healthy' | 'unhealthy' | 'not-configured' | 'in-memory-fallback';
  let dbDetail = deps.databaseDetail;

  // Priority: if DB is configured, show its actual state
  if (deps.databaseConfigured) {
    if (deps.databaseHealthy) {
      dbState = 'healthy';
    } else {
      dbState = 'unhealthy';
    }
  } else {
    // No DB configured - using in-memory fallback
    dbState = 'in-memory-fallback';
    dbDetail = `In-memory mode: ${deps.repositoriesReady ? 'repositories ready' : 'no repositories'}`;
  }

  // ok = system is functional for its configured mode
  // If DB is configured but unhealthy, system is NOT ok even if in-memory fallback works
  let ok: boolean;
  if (deps.databaseConfigured && !deps.databaseHealthy) {
    ok = false; // DB configured but not healthy = not ok
  } else if (deps.persistenceMode === 'in-memory') {
    ok = deps.repositoriesReady; // In-memory mode, check repositories
  } else {
    ok = deps.databaseHealthy && deps.repositoriesReady; // Database mode
  }

  const readinessReady = deps.productionReady && deps.workerReady;

  return {
    ok,
    service: appName,
    version,
    environment,
    timestamp: nowIso(),
    correlationId: typeof correlationId === 'string' ? correlationId : createCorrelationId('api'),
    liveness: {
      live: true,
      initialized: deps.initialized
    },
    readiness: {
      ready: readinessReady,
      productionReady: deps.productionReady,
      persistenceMode: deps.persistenceMode
    },
    dependencies: {
      database: {
        state: dbState,
        detail: dbDetail
      },
      repositories: {
        state: deps.repositoriesReady ? 'ready' : 'not-ready',
        detail: `${deps.repositoryCount} repositories wired`
      },
      worker: {
        state: deps.databaseConfigured
          ? deps.workerReady
            ? 'ready'
            : 'degraded'
          : 'not-configured',
        detail: deps.workerDetail
      },
      secretsManager: {
        state: deps.secretsManagerProvider ? 'configured' : 'not-configured',
        detail: deps.secretsManagerProvider ?? 'using env vars'
      },
      // GAP-09: AI/ML module — SmartSchedulingService (primary), ModelRegistryService, FeatureStoreService
      ml: {
        state: deps.mlReady ? 'ready' : 'not-configured',
        detail: deps.mlDetail
      }
    }
  };
}

export function createReadinessResponse(
  appName: string,
  environment: string,
  version: string,
  request: IncomingMessage,
  deps: {
    databaseConfigured: boolean;
    databaseHealthy: boolean;
    databaseDetail: string;
    persistenceMode: PersistenceMode;
    repositoriesReady: boolean;
    repositoryCount: number;
    workerReady: boolean;
    workerDetail: string;
    productionReady: boolean;
    initialized: boolean;
    secretsManagerProvider?: 'vault' | 'env';
    mlReady: boolean;
    mlDetail: string;
  }
): HealthResponse {
  return createHealthResponse(appName, environment, version, request, deps);
}

export function createLivenessResponse(
  appName: string,
  environment: string,
  version: string,
  request: IncomingMessage,
  initialized: boolean
): HealthResponse {
  const correlationId = request.headers['x-correlation-id'];

  return {
    ok: true,
    service: appName,
    version,
    environment,
    timestamp: nowIso(),
    correlationId: typeof correlationId === 'string' ? correlationId : createCorrelationId('api'),
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
        detail: 'Liveness probe does not validate dependencies'
      },
      repositories: {
        state: initialized ? 'ready' : 'not-ready',
        detail: initialized ? 'Application initialized' : 'Application still initializing'
      },
      worker: {
        state: 'not-configured',
        detail: 'Liveness probe does not validate worker dependency'
      },
      secretsManager: {
        state: 'not-configured',
        detail: 'Liveness probe does not validate secrets manager'
      }
    }
  };
}
