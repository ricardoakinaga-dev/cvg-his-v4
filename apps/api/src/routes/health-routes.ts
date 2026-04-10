/**
 * Health, readiness, and liveness route handlers.
 * First module cut extracted from server.ts to reduce coupling.
 * These handlers are registered in server.ts and called per request.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { ApiServerOptions } from '../server.js';
import { createReadinessResponse, createLivenessResponse } from '../health.js';
import { getAppState } from '../app-state.js';

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
      persistenceMode: appState.persistenceMode
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
        databaseHealthy: appState.databaseHealthy,
        databaseDetail: appState.databaseDetail,
        persistenceMode: appState.persistenceMode,
        repositoriesReady: appState.repositoriesReady,
        repositoryCount: appState.repositoryCount,
        workerReady: appState.workerReady,
        workerDetail: appState.workerDetail,
        productionReady: appState.productionReady,
        initialized: appState.initialized
      }
    );
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
        databaseHealthy: appState.databaseHealthy,
        databaseDetail: appState.databaseDetail,
        persistenceMode: appState.persistenceMode,
        repositoriesReady: appState.repositoriesReady,
        repositoryCount: appState.repositoryCount,
        workerReady: appState.workerReady,
        workerDetail: appState.workerDetail,
        productionReady: appState.productionReady,
        initialized: appState.initialized
      }
    );
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
    response.statusCode = 200;
    response.end(JSON.stringify(payload));
    return true;
  }

  return false;
}