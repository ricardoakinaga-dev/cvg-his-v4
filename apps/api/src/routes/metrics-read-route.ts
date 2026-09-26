import type { IncomingMessage, ServerResponse } from 'node:http';

import type { RateLimiterHealth } from '@cvg-his-v2/shared-rate-limiter';

import type { AppState } from '../app-state.js';
import { resolveOperationalRuntimeState } from '../chaos-operational-state.js';
import { isMetricsRequestAuthorized } from '../metrics.js';

const METRICS_PATHS = new Set(['/metrics', '/internal/metrics']);

export interface MetricsReadRouteHandlers {
  readonly metricsAuthToken?: string;
  readonly refreshClinicalMetrics: () => Promise<void>;
  readonly updateDatabasePoolMetrics: () => void;
  readonly getAppState: () => AppState;
  readonly resolveRedisHealthStatus: () => Promise<RateLimiterHealth | undefined>;
  readonly listActiveExperimentIds: () => readonly string[];
  readonly runtimeDistributedStateEnabled: boolean;
  readonly redisUrl?: string;
  readonly updateAppMetrics: (input: {
    readonly uptime: number;
    readonly dbHealthy: boolean;
    readonly persistenceMode: string;
    readonly redisHealthy: boolean;
    readonly rateLimiterMode: string;
    readonly runtimeDistributedStateEnabled: boolean;
  }) => void;
  readonly getMetricsText: () => Promise<string>;
  readonly getChaosMetricsText: () => Promise<string>;
  readonly uptimeSeconds: () => number;
}

function sendMetricsAuthorizationRequired(response: ServerResponse): void {
  response.setHeader('www-authenticate', 'Bearer realm="metrics"');
  response.statusCode = 401;
  response.end(
    JSON.stringify({
      code: 'METRICS_AUTH_REQUIRED',
      message: 'Metrics are available only to an authorized collector.'
    })
  );
}

/**
 * Handle authenticated Prometheus collector routes before tenant/session auth.
 * Returns true when this route owns the response.
 */
export async function handleMetricsReadRoute(
  pathname: string,
  request: IncomingMessage,
  response: ServerResponse,
  handlers: MetricsReadRouteHandlers
): Promise<boolean> {
  if (!METRICS_PATHS.has(pathname) || request.method !== 'GET') {
    return false;
  }

  if (!isMetricsRequestAuthorized(request.headers, handlers.metricsAuthToken)) {
    sendMetricsAuthorizationRequired(response);
    return true;
  }

  await handlers.refreshClinicalMetrics();
  handlers.updateDatabasePoolMetrics();
  const appState = handlers.getAppState();
  const redisHealth = await handlers.resolveRedisHealthStatus();
  const operationalState = resolveOperationalRuntimeState({
    appState,
    activeExperimentIds: handlers.listActiveExperimentIds(),
    runtimeDistributedStateEnabled: handlers.runtimeDistributedStateEnabled,
    redisUrl: handlers.redisUrl,
    redisHealth
  });
  handlers.updateAppMetrics({
    uptime: handlers.uptimeSeconds(),
    dbHealthy: operationalState.databaseHealthy,
    persistenceMode: operationalState.persistenceMode,
    redisHealthy: operationalState.redisHealthy,
    rateLimiterMode: operationalState.rateLimiterMode,
    runtimeDistributedStateEnabled: operationalState.runtimeDistributedStateEnabled
  });

  const [metricsText, chaosMetricsText] = await Promise.all([
    handlers.getMetricsText(),
    handlers.getChaosMetricsText()
  ]);
  response.setHeader('content-type', 'text/plain; version=0.0.4; charset=utf-8');
  response.statusCode = 200;
  response.end(`${metricsText}\n${chaosMetricsText}`);
  return true;
}
