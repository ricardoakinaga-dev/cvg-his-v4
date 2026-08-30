import type { IncomingMessage } from 'node:http';

import type { HealthResponse } from '@cvg-his-v2/shared-contracts';
import { createCorrelationId, nowIso } from '@cvg-his-v2/shared-utils';

import type { PersistenceMode } from './app-state.js';

type RateLimiterMode = 'redis' | 'in-memory' | 'fail-closed';

export interface HealthDependencies {
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
  /** Redis is required only when distributed runtime state is enabled. */
  redisConfigured?: boolean;
  redisHealthy?: boolean;
  redisDetail?: string;
  runtimeDistributedStateEnabled?: boolean;
  rateLimiterMode?: RateLimiterMode;
}

export function createHealthResponse(
  appName: string,
  environment: string,
  version: string,
  request: IncomingMessage,
  deps: HealthDependencies
): HealthResponse {
  const correlationId = request.headers['x-correlation-id'];

  let dbState: 'healthy' | 'unhealthy' | 'not-configured' | 'in-memory-fallback';
  let dbDetail: string;

  // An unavailable operational mode is fail-closed even when the process was
  // initialized with local repositories. Never describe this state as a
  // healthy in-memory fallback.
  if (deps.persistenceMode === 'unavailable') {
    dbState = 'unhealthy';
    dbDetail = 'Database persistence is unavailable.';
  } else if (deps.databaseConfigured) {
    if (deps.databaseHealthy) {
      dbState = 'healthy';
      dbDetail = 'Database connection is healthy.';
    } else {
      dbState = 'unhealthy';
      dbDetail = 'Database is unavailable.';
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

  const runtimeDistributedStateEnabled = deps.runtimeDistributedStateEnabled === true;
  const redisConfigured = deps.redisConfigured === true;
  const redisHealthy = deps.redisHealthy === true;
  const redisReady = !runtimeDistributedStateEnabled || (redisConfigured && redisHealthy);
  const redisState: 'healthy' | 'unhealthy' | 'not-configured' | 'disabled' =
    !runtimeDistributedStateEnabled
      ? 'disabled'
      : !redisConfigured
        ? 'not-configured'
        : redisHealthy
          ? 'healthy'
          : 'unhealthy';
  const redisDetail = !runtimeDistributedStateEnabled
    ? 'Distributed runtime state is disabled.'
    : !redisConfigured
      ? 'Redis not configured for this runtime.'
      : redisHealthy
        ? 'Redis rate limiter backend is healthy.'
        : 'Redis rate limiter backend is unavailable.';

  if (runtimeDistributedStateEnabled && !redisReady) {
    ok = false;
  }

  const readinessReady = deps.productionReady && deps.workerReady && redisReady;

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
      redis: {
        state: redisState,
        detail: redisDetail
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
  deps: HealthDependencies
): HealthResponse {
  return createHealthResponse(appName, environment, version, request, deps);
}

export function createLivenessResponse(
  appName: string,
  environment: string,
  version: string,
  request: IncomingMessage,
  initialized: boolean,
  persistenceMode: PersistenceMode = 'not-initialized'
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
      persistenceMode
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
