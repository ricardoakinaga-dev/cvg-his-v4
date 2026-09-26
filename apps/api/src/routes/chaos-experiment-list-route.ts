import type { IncomingMessage, ServerResponse } from 'node:http';

import type { ChaosEngine } from '@cvg-his-v2/chaos';
import type { RateLimiterHealth } from '@cvg-his-v2/shared-rate-limiter';

import type { AppState } from '../app-state.js';
import {
  describeChaosExperiment,
  resolveOperationalRuntimeState
} from '../chaos-operational-state.js';

export interface ChaosExperimentListRouteHandlers {
  readonly requireEarlyPrincipal: (permissionCode: string) => Promise<unknown>;
  readonly chaos: Pick<ChaosEngine, 'listActiveExperiments' | 'listExperiments' | 'isActive'>;
  readonly getAppState: () => AppState;
  readonly resolveRedisHealthStatus: () => Promise<RateLimiterHealth | undefined>;
  readonly runtimeDistributedStateEnabled: boolean;
  readonly redisUrl?: string;
}

export async function handleChaosExperimentListRoute(
  request: IncomingMessage,
  response: ServerResponse,
  handlers: ChaosExperimentListRouteHandlers
): Promise<boolean> {
  if (request.url !== '/chaos/experiments' || request.method !== 'GET') {
    return false;
  }

  const {
    requireEarlyPrincipal,
    chaos,
    getAppState,
    resolveRedisHealthStatus,
    runtimeDistributedStateEnabled,
    redisUrl
  } = handlers;

  await requireEarlyPrincipal('users.manage');
  const appState = getAppState();
  const activeExperimentIds = chaos.listActiveExperiments().map((experiment) => experiment.id);
  const redisHealth = await resolveRedisHealthStatus();
  const operationalState = resolveOperationalRuntimeState({
    appState,
    activeExperimentIds,
    runtimeDistributedStateEnabled,
    redisUrl,
    redisHealth
  });
  const experiments = chaos.listExperiments().map((experiment) => ({
    id: experiment.id,
    name: experiment.name,
    description: experiment.description,
    active: chaos.isActive(experiment.id),
    runbook: describeChaosExperiment(experiment.id)?.runbook,
    indicators: describeChaosExperiment(experiment.id)?.indicators ?? [],
    runtimeImpact: {
      summary:
        describeChaosExperiment(experiment.id)?.summary ?? 'No operational summary registered.',
      databaseHealthy:
        experiment.id === 'database-failure' ? false : operationalState.databaseHealthy,
      persistenceMode:
        experiment.id === 'database-failure' && chaos.isActive(experiment.id)
          ? 'unavailable'
          : operationalState.persistenceMode,
      workerReady: experiment.id === 'worker-failure' ? false : operationalState.workerReady,
      externalProvidersHealthy:
        experiment.id === 'provider-failure' ? false : operationalState.externalProvidersHealthy,
      redisHealthy: experiment.id === 'redis-failure' ? false : operationalState.redisHealthy,
      rateLimiterMode: operationalState.rateLimiterMode
    }
  }));

  response.setHeader('content-type', 'application/json');
  response.statusCode = 200;
  response.end(JSON.stringify({ runtimeState: operationalState, experiments }));
  return true;
}
