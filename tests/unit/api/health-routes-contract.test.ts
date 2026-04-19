import { describe, expect, it, vi } from 'vitest';

vi.mock('@cvg-his-v2/chaos', () => ({
  API_LATENCY_ID: 'api-latency',
  DATABASE_FAILURE_ID: 'database-failure',
  NETWORK_LATENCY_ID: 'network-latency',
  REDIS_FAILURE_ID: 'redis-failure',
  WORKER_FAILURE_ID: 'worker-failure',
  ChaosEngine: {
    getInstance: () => ({
      listActiveExperiments: () => []
    })
  }
}));

import { handleHealthRoutes } from '../../../apps/api/src/routes/health-routes.js';

class MockResponse {
  statusCode = 200;
  readonly headers = new Map<string, string>();
  body = '';

  setHeader(name: string, value: string): this {
    this.headers.set(name.toLowerCase(), value);
    return this;
  }

  end(payload?: string): this {
    this.body = payload ?? '';
    return this;
  }
}

describe('health routes operational contract', () => {
  it('returns JSON content type for readiness and liveness aliases', async () => {
    const responseReady = new MockResponse();
    const responseLive = new MockResponse();

    const { setAppState } = await import('../../../apps/api/src/app-state.js');
    setAppState({
      persistenceMode: 'in-memory',
      initialized: true,
      databaseConfigured: false,
      databaseHealthy: false,
      databaseDetail: 'not-configured',
      repositoriesReady: true,
      repositoryCount: 3,
      workerReady: false,
      workerDetail: 'worker disabled in test',
      productionReady: false,
      secretsManagerProvider: 'env',
      mlReady: false,
      mlDetail: 'not-configured'
    });

    const options = {
      appName: 'api',
      version: '0.1.0',
      environment: 'test',
      runtimeDistributedStateEnabled: false
    } as never;

    const readyHandled = handleHealthRoutes(
      { method: 'GET', url: '/health/ready', headers: {} } as never,
      responseReady as never,
      options
    );
    const liveHandled = handleHealthRoutes(
      { method: 'GET', url: '/health/live', headers: {} } as never,
      responseLive as never,
      options
    );

    expect(readyHandled).toBe(true);
    expect(liveHandled).toBe(true);
    expect(responseReady.headers.get('content-type')).toBe('application/json');
    expect(responseLive.headers.get('content-type')).toBe('application/json');
  });
});
