import assert from 'node:assert/strict';
import { Readable, Writable } from 'node:stream';
import test from 'node:test';

import type { AppState } from '../app-state.js';
import { handleMetricsReadRoute } from './metrics-read-route.js';

class MockRequest extends Readable {
  public readonly method: string;
  public readonly url: string;
  public readonly headers: Record<string, string>;

  constructor(method: string, url: string, headers: Record<string, string> = {}) {
    super();
    this.method = method;
    this.url = url;
    this.headers = headers;
  }

  _read(): void {
    this.push(null);
  }
}

class MockResponse extends Writable {
  public statusCode = 200;
  readonly headers = new Map<string, string>();
  readonly #chunks: Buffer[] = [];

  setHeader(name: string, value: string): this {
    this.headers.set(name, value);
    return this;
  }

  _write(
    chunk: string | Buffer,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void
  ): void {
    this.#chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    callback();
  }

  bodyText(): string {
    return Buffer.concat(this.#chunks).toString('utf8');
  }

  bodyJson<T>(): T {
    return JSON.parse(this.bodyText()) as T;
  }
}

const appState: AppState = {
  persistenceMode: 'database',
  databaseConfigured: true,
  databaseHealthy: true,
  databaseDetail: 'Database healthy',
  repositoriesReady: true,
  repositoryCount: 1,
  workerReady: true,
  workerDetail: 'Worker ready',
  productionReady: true,
  initialized: true,
  mlReady: true,
  mlDetail: 'ML ready'
};

function unusedHandlers() {
  return {
    metricsAuthToken: 'collector-secret',
    refreshClinicalMetrics: async () => undefined,
    updateDatabasePoolMetrics: () => undefined,
    getAppState: () => appState,
    resolveRedisHealthStatus: async () => undefined,
    listActiveExperimentIds: () => [],
    runtimeDistributedStateEnabled: false,
    updateAppMetrics: () => undefined,
    getMetricsText: async () => 'app_metric 1',
    getChaosMetricsText: async () => 'chaos_metric 1',
    uptimeSeconds: () => 42
  };
}

test('metrics read route preserves exact path and GET matching', async () => {
  const unmatched = [
    ['/metrics-extra', 'GET'],
    ['/internal/metrics/extra', 'GET'],
    ['/metrics', 'POST'],
    ['/internal/metrics', 'HEAD']
  ] as const;

  for (const [url, method] of unmatched) {
    const request = new MockRequest(method, url);
    const response = new MockResponse();
    const handled = await handleMetricsReadRoute(
      url.split('?')[0] ?? url,
      request as never,
      response as never,
      unusedHandlers()
    );
    assert.equal(handled, false, `${method} ${url} must remain unmatched`);
    assert.equal(response.bodyText(), '');
  }
});

test('metrics read route rejects unauthorized collectors before refresh or operational reads', async () => {
  const calls: string[] = [];
  const handlers = {
    ...unusedHandlers(),
    refreshClinicalMetrics: async () => {
      calls.push('refresh');
    },
    updateDatabasePoolMetrics: () => calls.push('pool'),
    getAppState: () => {
      calls.push('app-state');
      return appState;
    },
    resolveRedisHealthStatus: async () => {
      calls.push('redis');
      return undefined;
    },
    listActiveExperimentIds: () => {
      calls.push('chaos');
      return [];
    },
    updateAppMetrics: () => calls.push('gauges'),
    getMetricsText: async () => {
      calls.push('metrics');
      return '';
    },
    getChaosMetricsText: async () => {
      calls.push('chaos-metrics');
      return '';
    }
  };
  const response = new MockResponse();

  const handled = await handleMetricsReadRoute(
    '/metrics',
    new MockRequest('GET', '/metrics') as never,
    response as never,
    handlers
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 401);
  assert.equal(response.headers.get('www-authenticate'), 'Bearer realm="metrics"');
  assert.deepEqual(response.bodyJson(), {
    code: 'METRICS_AUTH_REQUIRED',
    message: 'Metrics are available only to an authorized collector.'
  });
  assert.deepEqual(calls, []);
});

test('authorized metrics refresh keeps dependency order, operational gauges, and text response', async () => {
  const calls: string[] = [];
  let gaugeInput:
    | {
        readonly uptime: number;
        readonly dbHealthy: boolean;
        readonly persistenceMode: string;
        readonly redisHealthy: boolean;
        readonly rateLimiterMode: string;
        readonly runtimeDistributedStateEnabled: boolean;
      }
    | undefined;
  const handlers = {
    ...unusedHandlers(),
    refreshClinicalMetrics: async () => {
      calls.push('refresh');
    },
    updateDatabasePoolMetrics: () => calls.push('pool'),
    getAppState: () => {
      calls.push('app-state');
      return appState;
    },
    resolveRedisHealthStatus: async () => {
      calls.push('redis');
      return { healthy: true, backend: 'redis' as const, detail: 'Redis healthy' };
    },
    listActiveExperimentIds: () => {
      calls.push('chaos');
      return [];
    },
    runtimeDistributedStateEnabled: true,
    redisUrl: 'redis://configured.invalid',
    updateAppMetrics: (input: typeof gaugeInput & {}) => {
      calls.push('gauges');
      gaugeInput = input;
    },
    getMetricsText: async () => {
      calls.push('metrics');
      return 'app_metric 1';
    },
    getChaosMetricsText: async () => {
      calls.push('chaos-metrics');
      return 'chaos_metric 1';
    },
    uptimeSeconds: () => 42
  };
  const response = new MockResponse();

  const handled = await handleMetricsReadRoute(
    '/internal/metrics',
    new MockRequest('GET', '/internal/metrics', {
      authorization: 'Bearer collector-secret'
    }) as never,
    response as never,
    handlers
  );

  assert.equal(handled, true);
  assert.deepEqual(calls, [
    'refresh',
    'pool',
    'app-state',
    'redis',
    'chaos',
    'gauges',
    'metrics',
    'chaos-metrics'
  ]);
  assert.deepEqual(gaugeInput, {
    uptime: 42,
    dbHealthy: true,
    persistenceMode: 'database',
    redisHealthy: true,
    rateLimiterMode: 'redis',
    runtimeDistributedStateEnabled: true
  });
  assert.equal(response.headers.get('content-type'), 'text/plain; version=0.0.4; charset=utf-8');
  assert.equal(response.statusCode, 200);
  assert.equal(response.bodyText(), 'app_metric 1\nchaos_metric 1');
});
