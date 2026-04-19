/**
 * Health, readiness, and liveness route handlers.
 * First module cut extracted from server.ts to reduce coupling.
 * These handlers are registered in server.ts and called per request.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { ChaosEngine } from '@cvg-his-v2/chaos';
import type { ApiServerOptions } from '../server.js';
import { createReadinessResponse, createLivenessResponse } from '../health.js';
import { getAppState } from '../app-state.js';
import { resolveOperationalRuntimeState } from '../chaos-operational-state.js';
import { generateSLOReport, getSLOConfigs } from '../slos.js';
import { getCurrentSloSnapshot } from '../metrics.js';

/**
 * Handle all /health, /ready, /live routes.
 * Returns true if the request was handled, false otherwise.
 */
export function handleHealthRoutes(
  request: IncomingMessage,
  response: ServerResponse,
  options: ApiServerOptions
): boolean {
  const url = request.url ?? '/';
  const method = request.method ?? 'GET';

  if (method !== 'GET') return false;
  const appState = getAppState();
  const activeExperimentIds = ChaosEngine
    .getInstance()
    .listActiveExperiments()
    .map((experiment) => experiment.id);
  const operationalState = resolveOperationalRuntimeState({
    appState,
    activeExperimentIds,
    runtimeDistributedStateEnabled:
      options.runtimeDistributedStateEnabled
      ?? options.featureFlags?.runtimeDistributedStateEnabled
      ?? false,
    redisUrl: options.redisUrl
  });

  // GET /health
  if (url === '/health') {
    const payload = {
      ok: true,
      service: options.appName,
      version: options.version,
      environment: options.environment,
      timestamp: new Date().toISOString(),
      uptime: Math.round(process.uptime()),
      memory: process.memoryUsage(),
      persistenceMode: operationalState.persistenceMode,
      activeChaosExperiments: operationalState.activeExperimentIds,
      redisHealthy: operationalState.redisHealthy,
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
        mlDetail: appState.mlDetail
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
        mlDetail: appState.mlDetail
      }
    );
    response.setHeader('content-type', 'application/json');
    response.statusCode = payload.readiness.ready ? 200 : 503;
    response.end(JSON.stringify(payload));
    return true;
  }

  // GET /live
  if (url === '/live') {
    const payload = createLivenessResponse(
      options.appName,
      options.environment,
      options.version,
      request,
      appState.initialized
    );
    response.setHeader('content-type', 'application/json');
    response.statusCode = 200;
    response.end(JSON.stringify(payload));
    return true;
  }

  // GET /health/live
  if (url === '/health/live') {
    const payload = createLivenessResponse(
      options.appName,
      options.environment,
      options.version,
      request,
      appState.initialized
    );
    response.setHeader('content-type', 'application/json');
    response.statusCode = 200;
    response.end(JSON.stringify(payload));
    return true;
  }

  // GET /slos — SLO compliance report
  if (url === '/slos' && method === 'GET') {
    const snapshot = getCurrentSloSnapshot();
    const report = generateSLOReport({
      p95LatencyMs: snapshot.p95LatencyMs,
      p99LatencyMs: snapshot.p99LatencyMs,
      availabilityPercent: snapshot.availabilityPercent,
      errorRatePercent: snapshot.errorRatePercent
    });
    response.setHeader('content-type', 'application/json');
    response.statusCode = 200;
    response.end(JSON.stringify({ configs: getSLOConfigs(), snapshot, report }, null, 2));
    return true;
  }

  return false;
}
