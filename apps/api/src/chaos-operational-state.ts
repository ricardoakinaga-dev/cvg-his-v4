import {
  API_LATENCY_ID,
  DATABASE_FAILURE_ID,
  NETWORK_LATENCY_ID,
  REDIS_FAILURE_ID,
  WORKER_FAILURE_ID
} from '@cvg-his-v2/chaos';

import type { AppState, PersistenceMode } from './app-state.js';

export type RateLimiterMode = 'redis' | 'in-memory' | 'fail-closed';

export interface OperationalRuntimeState {
  readonly activeExperimentIds: readonly string[];
  readonly databaseHealthy: boolean;
  readonly databaseDetail: string;
  readonly persistenceMode: PersistenceMode;
  readonly workerReady: boolean;
  readonly workerDetail: string;
  readonly productionReady: boolean;
  readonly redisConfigured: boolean;
  readonly redisHealthy: boolean;
  readonly redisDetail: string;
  readonly runtimeDistributedStateEnabled: boolean;
  readonly rateLimiterMode: RateLimiterMode;
}

export interface ChaosRunbookReference {
  readonly title: string;
  readonly path: string;
}

export interface ChaosExperimentDescriptor {
  readonly runbook: ChaosRunbookReference;
  readonly indicators: readonly string[];
  readonly summary: string;
}

const CHAOS_EXPERIMENT_DESCRIPTORS: Record<string, ChaosExperimentDescriptor> = {
  [DATABASE_FAILURE_ID]: {
    runbook: {
      title: 'Database Failure Runbook',
      path: 'packages/chaos/src/runbooks/database-failure-runbook.md'
    },
    indicators: ['app_database_healthy', 'app_persistence_mode'],
    summary: 'Forca o runtime operacional para modo in-memory e expõe o banco como indisponivel.'
  },
  [REDIS_FAILURE_ID]: {
    runbook: {
      title: 'Redis Failure Runbook',
      path: 'packages/chaos/src/runbooks/redis-failure-runbook.md'
    },
    indicators: ['app_redis_healthy', 'app_rate_limiter_mode'],
    summary: 'Simula indisponibilidade do Redis e derruba o rate limiter distribuido para fallback em memoria.'
  },
  [API_LATENCY_ID]: {
    runbook: {
      title: 'API Failure Runbook',
      path: 'packages/chaos/src/runbooks/api-failure-runbook.md'
    },
    indicators: ['http_request_duration_seconds', 'app_active_requests'],
    summary: 'Introduz degradacao de latencia HTTP para validar triagem e resposta operacional.'
  },
  [NETWORK_LATENCY_ID]: {
    runbook: {
      title: 'API Failure Runbook',
      path: 'packages/chaos/src/runbooks/api-failure-runbook.md'
    },
    indicators: ['http_request_duration_seconds', 'app_active_requests'],
    summary: 'Introduz latencia em operacoes async para validar comportamento degradado da API.'
  },
  [WORKER_FAILURE_ID]: {
    runbook: {
      title: 'Incident Response Runbook',
      path: 'packages/chaos/src/runbooks/incident-response.md'
    },
    indicators: ['readiness', 'worker dependency'],
    summary: 'Marca a trilha operacional do worker como degradada para treinar resposta a falhas de consumo.'
  }
};

export function describeChaosExperiment(experimentId: string): ChaosExperimentDescriptor | undefined {
  return CHAOS_EXPERIMENT_DESCRIPTORS[experimentId];
}

export function resolveOperationalRuntimeState(input: {
  readonly appState: AppState;
  readonly activeExperimentIds: readonly string[];
  readonly runtimeDistributedStateEnabled: boolean;
  readonly redisUrl?: string;
}): OperationalRuntimeState {
  const active = new Set(input.activeExperimentIds);
  const databaseFailureActive = active.has(DATABASE_FAILURE_ID);
  const redisFailureActive = active.has(REDIS_FAILURE_ID);
  const workerFailureActive = active.has(WORKER_FAILURE_ID);
  const redisConfigured = typeof input.redisUrl === 'string' && input.redisUrl.length > 0;

  const persistenceMode = databaseFailureActive
    ? input.appState.persistenceMode === 'not-initialized'
      ? 'not-initialized'
      : 'in-memory'
    : input.appState.persistenceMode;

  const databaseHealthy = databaseFailureActive ? false : input.appState.databaseHealthy;
  const databaseDetail = databaseFailureActive
    ? `Simulated database failure via chaos experiment "${DATABASE_FAILURE_ID}".`
    : input.appState.databaseDetail;

  const workerReady = workerFailureActive ? false : input.appState.workerReady;
  const workerDetail = workerFailureActive
    ? `Simulated worker failure via chaos experiment "${WORKER_FAILURE_ID}".`
    : input.appState.workerDetail;

  const redisHealthy = redisConfigured && !redisFailureActive;
  const distributedStateReady =
    !input.runtimeDistributedStateEnabled || (redisConfigured && redisHealthy);

  const productionReady = (
    input.appState.productionReady
    && databaseHealthy
    && workerReady
    && persistenceMode === 'database'
    && distributedStateReady
  );

  const rateLimiterMode: RateLimiterMode = !input.runtimeDistributedStateEnabled
    ? 'in-memory'
    : redisConfigured && redisHealthy
      ? 'redis'
      : 'fail-closed';

  let redisDetail = 'Redis not configured for this runtime.';
  if (redisConfigured && input.runtimeDistributedStateEnabled) {
    redisDetail = redisFailureActive
      ? `Simulated Redis failure via chaos experiment "${REDIS_FAILURE_ID}".`
      : 'Redis wired and healthy for distributed runtime state.';
  } else if (redisConfigured) {
    redisDetail = 'Redis configured, but distributed runtime state is disabled.';
  }

  return {
    activeExperimentIds: [...input.activeExperimentIds],
    databaseHealthy,
    databaseDetail,
    persistenceMode,
    workerReady,
    workerDetail,
    productionReady,
    redisConfigured,
    redisHealthy,
    redisDetail,
    runtimeDistributedStateEnabled: input.runtimeDistributedStateEnabled,
    rateLimiterMode
  };
}
