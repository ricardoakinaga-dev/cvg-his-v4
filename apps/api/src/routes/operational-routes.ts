import type { IncomingMessage, ServerResponse } from 'node:http';

import type { ChaosEngine } from '@cvg-his-v2/chaos';

import { getAppState } from '../app-state.js';
import {
  describeChaosExperiment,
  resolveOperationalRuntimeState
} from '../chaos-operational-state.js';
import { getMetricsText, updateAppMetrics } from '../metrics.js';

export interface OperationalRoutesHandlers {
  chaos: ChaosEngine;
  runtimeDistributedStateEnabled: boolean;
  redisUrl?: string;
  logError: (message: string, context: Record<string, unknown>) => void;
}

function resolveState(handlers: OperationalRoutesHandlers) {
  return resolveOperationalRuntimeState({
    appState: getAppState(),
    activeExperimentIds: handlers.chaos
      .listActiveExperiments()
      .map((experiment) => experiment.id),
    runtimeDistributedStateEnabled: handlers.runtimeDistributedStateEnabled,
    redisUrl: handlers.redisUrl
  });
}

export async function handleOperationalRoutes(
  request: IncomingMessage,
  response: ServerResponse,
  handlers: OperationalRoutesHandlers
): Promise<boolean> {
  const { chaos } = handlers;

  if (request.url === '/metrics' && request.method === 'GET') {
    const state = resolveState(handlers);
    updateAppMetrics({
      uptime: Math.round(process.uptime()),
      activeRequests: 0,
      dbHealthy: state.databaseHealthy,
      persistenceMode: state.persistenceMode,
      redisHealthy: state.redisHealthy,
      rateLimiterMode: state.rateLimiterMode,
      runtimeDistributedStateEnabled: state.runtimeDistributedStateEnabled
    });
    const metricsText = await getMetricsText();
    response.setHeader('content-type', 'text/plain; version=0.0.4; charset=utf-8');
    response.statusCode = 200;
    response.end(metricsText);
    return true;
  }

  const chaosMatch = request.url?.match(/^\/chaos\/experiments\/([^/]+)\/(start|stop)$/);
  if (chaosMatch && request.method === 'POST') {
    const [, experimentId, action] = chaosMatch;
    try {
      if (action === 'start') {
        const chunks: Buffer[] = [];
        for await (const chunk of request) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        const bodyText = Buffer.concat(chunks).toString('utf8');
        const body = bodyText ? JSON.parse(bodyText) : {};
        const result = await chaos.start(experimentId, body);
        response.setHeader('content-type', 'application/json');
        response.statusCode = result.ok ? 200 : 409;
        response.end(JSON.stringify(result));
      } else {
        const result = await chaos.stop(experimentId);
        response.setHeader('content-type', 'application/json');
        response.statusCode = result.ok ? 200 : 409;
        response.end(JSON.stringify(result));
      }
    } catch (error) {
      handlers.logError('Chaos endpoint error', {
        experimentId,
        action,
        error: error instanceof Error ? error.message : String(error)
      });
      response.setHeader('content-type', 'application/json');
      response.statusCode = 500;
      response.end(JSON.stringify({ ok: false, error: 'Internal error' }));
    }
    return true;
  }

  if (request.url === '/chaos/experiments' && request.method === 'GET') {
    const state = resolveState(handlers);
    const experiments = chaos.listExperiments().map((experiment) => ({
      id: experiment.id,
      name: experiment.name,
      description: experiment.description,
      active: chaos.isActive(experiment.id),
      runbook: describeChaosExperiment(experiment.id)?.runbook,
      indicators: describeChaosExperiment(experiment.id)?.indicators ?? [],
      runtimeImpact: {
        summary:
          describeChaosExperiment(experiment.id)?.summary ??
          'No operational summary registered.',
        databaseHealthy:
          experiment.id === 'database-failure' ? false : state.databaseHealthy,
        persistenceMode:
          experiment.id === 'database-failure' ? 'in-memory' : state.persistenceMode,
        workerReady: experiment.id === 'worker-failure' ? false : state.workerReady,
        redisHealthy: experiment.id === 'redis-failure' ? false : state.redisHealthy,
        rateLimiterMode:
          experiment.id === 'redis-failure' ? 'in-memory-fallback' : state.rateLimiterMode
      }
    }));
    response.setHeader('content-type', 'application/json');
    response.statusCode = 200;
    response.end(JSON.stringify({ runtimeState: state, experiments }));
    return true;
  }

  return false;
}
