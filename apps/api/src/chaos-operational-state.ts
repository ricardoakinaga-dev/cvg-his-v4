import {
  API_LATENCY_ID,
  DATABASE_FAILURE_ID,
  NETWORK_LATENCY_ID,
  PROVIDER_FAILURE_ID,
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
  readonly externalProvidersHealthy: boolean;
  readonly externalProvidersDetail: string;
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
    summary:
      'Marks database persistence unavailable, blocks readiness and requires containment before recovery.'
  },
  [REDIS_FAILURE_ID]: {
    runbook: {
      title: 'Redis Failure Runbook',
      path: 'packages/chaos/src/runbooks/redis-failure-runbook.md'
    },
    indicators: ['app_redis_healthy', 'app_rate_limiter_mode'],
    summary: 'Simula indisponibilidade do Redis e faz o rate limiter distribuido falhar fechado.'
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
    summary:
      'Marca a trilha operacional do worker como degradada para treinar resposta a falhas de consumo.'
  },
  [PROVIDER_FAILURE_ID]: {
    runbook: {
      title: 'External Provider Failure Runbook',
      path: 'packages/chaos/src/runbooks/provider-failure-runbook.md'
    },
    indicators: [
      'chaos_experiment_active{experiment="provider-failure"}',
      'readiness.productionReady'
    ],
    summary:
      'Marca provedores externos obrigatorios como indisponiveis e bloqueia a prontidao de producao.'
  }
};

export function describeChaosExperiment(
  experimentId: string
): ChaosExperimentDescriptor | undefined {
  return CHAOS_EXPERIMENT_DESCRIPTORS[experimentId];
}

export function resolveOperationalRuntimeState(input: {
  readonly appState: AppState;
  readonly activeExperimentIds: readonly string[];
  readonly runtimeDistributedStateEnabled: boolean;
  readonly redisUrl?: string;
  /** Actual backend probe result. Omitted only for backwards-compatible pure-state callers. */
  readonly redisHealth?: {
    readonly healthy: boolean;
    readonly detail: string;
  };
}): OperationalRuntimeState {
  const active = new Set(input.activeExperimentIds);
  const databaseFailureActive = active.has(DATABASE_FAILURE_ID);
  const redisFailureActive = active.has(REDIS_FAILURE_ID);
  const workerFailureActive = active.has(WORKER_FAILURE_ID);
  const providerFailureActive = active.has(PROVIDER_FAILURE_ID);
  const redisConfigured = typeof input.redisUrl === 'string' && input.redisUrl.length > 0;

  const persistenceMode: PersistenceMode = databaseFailureActive
    ? input.appState.persistenceMode === 'not-initialized'
      ? 'not-initialized'
      : 'unavailable'
    : input.appState.persistenceMode;

  const databaseHealthy = databaseFailureActive ? false : input.appState.databaseHealthy;
  const databaseDetail = databaseFailureActive
    ? `Simulated database failure via chaos experiment "${DATABASE_FAILURE_ID}".`
    : input.appState.databaseDetail;

  const workerReady = workerFailureActive ? false : input.appState.workerReady;
  const workerDetail = workerFailureActive
    ? `Simulated worker failure via chaos experiment "${WORKER_FAILURE_ID}".`
    : input.appState.workerDetail;

  const externalProvidersHealthy = !providerFailureActive;
  const externalProvidersDetail = providerFailureActive
    ? `Simulated external provider failure via chaos experiment "${PROVIDER_FAILURE_ID}".`
    : 'No required external provider failure is active.';

  const redisHealthy =
    redisConfigured && !redisFailureActive && (input.redisHealth?.healthy ?? true);
  const distributedStateReady =
    !input.runtimeDistributedStateEnabled || (redisConfigured && redisHealthy);

  const productionReady =
    input.appState.productionReady &&
    databaseHealthy &&
    workerReady &&
    externalProvidersHealthy &&
    persistenceMode === 'database' &&
    distributedStateReady;

  const rateLimiterMode: RateLimiterMode = !input.runtimeDistributedStateEnabled
    ? 'in-memory'
    : redisConfigured && redisHealthy
      ? 'redis'
      : 'fail-closed';

  let redisDetail = 'Redis not configured for this runtime.';
  if (redisConfigured && input.runtimeDistributedStateEnabled) {
    redisDetail = redisFailureActive
      ? `Simulated Redis failure via chaos experiment "${REDIS_FAILURE_ID}".`
      : input.redisHealth?.healthy === false
        ? input.redisHealth.detail
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
    externalProvidersHealthy,
    externalProvidersDetail,
    productionReady,
    redisConfigured,
    redisHealthy,
    redisDetail,
    runtimeDistributedStateEnabled: input.runtimeDistributedStateEnabled,
    rateLimiterMode
  };
}
