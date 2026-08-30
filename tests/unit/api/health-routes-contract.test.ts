import { describe, expect, it, vi } from 'vitest';

vi.mock('@cvg-his-v2/chaos', () => ({
  API_LATENCY_ID: 'api-latency',
  DATABASE_FAILURE_ID: 'database-failure',
  NETWORK_LATENCY_ID: 'network-latency',
  REDIS_FAILURE_ID: 'redis-failure',
  WORKER_FAILURE_ID: 'worker-failure',
  ChaosEngine: {
    getInstance: () => ({
      listActiveExperiments: () => [],
      isActive: () => false
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

    expect(await readyHandled).toBe(true);
    expect(await liveHandled).toBe(true);
    expect(responseReady.headers.get('content-type')).toBe('application/json');
    expect(responseLive.headers.get('content-type')).toBe('application/json');
  });

  it('awaits the Redis probe and returns a safe 503 readiness contract on outage', async () => {
    const responseReady = new MockResponse();
    const responseLive = new MockResponse();
    const { setAppState } = await import('../../../apps/api/src/app-state.js');
    setAppState({
      persistenceMode: 'database',
      initialized: true,
      databaseConfigured: true,
      databaseHealthy: true,
      databaseDetail: 'Database connected',
      repositoriesReady: true,
      repositoryCount: 12,
      workerReady: true,
      workerDetail: 'worker ready in test',
      productionReady: true,
      secretsManagerProvider: 'env',
      mlReady: true,
      mlDetail: 'configured in test'
    });

    type RateLimiterHealth = {
      readonly healthy: boolean;
      readonly backend: 'redis' | 'in-memory';
      readonly detail: string;
    };
    let releaseProbe: ((health: RateLimiterHealth) => void) | undefined;
    const redisHealthCheck = vi.fn(
      () =>
        new Promise<RateLimiterHealth>((resolve) => {
          releaseProbe = resolve;
        })
    );
    const secretUrl = 'redis://:super-secret@redis.internal:6379/0';
    const options = {
      appName: 'api',
      version: '0.1.0',
      environment: 'production',
      redisUrl: secretUrl,
      runtimeDistributedStateEnabled: true,
      authRateLimiter: {
        check: vi.fn(),
        healthCheck: redisHealthCheck
      }
    } as never;

    const readyHandling = handleHealthRoutes(
      { method: 'GET', url: '/health/ready', headers: {} } as never,
      responseReady as never,
      options
    );

    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(redisHealthCheck).toHaveBeenCalledTimes(1);
    expect(responseReady.body).toBe('', 'readiness must wait for the Redis probe');

    releaseProbe?.({
      healthy: false,
      backend: 'redis',
      detail: `Redis probe failed for ${secretUrl}`
    });
    expect(await readyHandling).toBe(true);
    expect(responseReady.statusCode).toBe(503);

    const payload = JSON.parse(responseReady.body) as {
      ok: boolean;
      liveness: { live: boolean };
      readiness: { ready: boolean };
      dependencies: {
        redis: { state: string; detail: string };
      };
    };
    expect(payload.ok).toBe(false);
    expect(payload.readiness.ready).toBe(false);
    expect(payload.liveness.live).toBe(true);
    expect(payload.dependencies.redis.state).toBe('unhealthy');
    expect(payload.dependencies.redis.detail).not.toContain('super-secret');
    expect(JSON.stringify(payload)).not.toContain('redis.internal');

    const liveHandled = await handleHealthRoutes(
      { method: 'GET', url: '/health/live', headers: {} } as never,
      responseLive as never,
      options
    );
    expect(liveHandled).toBe(true);
    expect(responseLive.statusCode).toBe(200);
    expect(JSON.parse(responseLive.body).liveness.live).toBe(true);
    expect(redisHealthCheck).toHaveBeenCalledTimes(1);
  });

  it('aggregates every configured distributed limiter before declaring readiness', async () => {
    const responseReady = new MockResponse();
    const healthyRedis = vi.fn(async () => ({
      healthy: true,
      backend: 'redis' as const,
      detail: 'ignored'
    }));
    const unhealthyPixLimiter = vi.fn(async () => ({
      healthy: false,
      backend: 'redis' as const,
      detail: 'ignored'
    }));

    const readyHandling = handleHealthRoutes(
      { method: 'GET', url: '/ready', headers: {} } as never,
      responseReady as never,
      {
        appName: 'api',
        version: '0.1.0',
        environment: 'production',
        redisUrl: 'redis://:secret@redis.internal:6379/0',
        runtimeDistributedStateEnabled: true,
        authRateLimiter: { check: vi.fn(), healthCheck: healthyRedis },
        pixPaymentAttemptRateLimiter: { check: vi.fn(), healthCheck: unhealthyPixLimiter },
        pixProviderWebhookRateLimiter: { check: vi.fn(), healthCheck: healthyRedis }
      } as never
    );

    expect(await readyHandling).toBe(true);
    expect(responseReady.statusCode).toBe(503);
    const payload = JSON.parse(responseReady.body) as {
      readiness: { ready: boolean };
      dependencies: { redis: { state: string; detail: string } };
    };
    expect(payload.readiness.ready).toBe(false);
    expect(payload.dependencies.redis.state).toBe('unhealthy');
    expect(payload.dependencies.redis.detail).not.toContain('secret');
    expect(healthyRedis).toHaveBeenCalledTimes(2);
    expect(unhealthyPixLimiter).toHaveBeenCalledTimes(1);
  });
});
