import assert from 'node:assert/strict';
import { Readable, Writable } from 'node:stream';
import test from 'node:test';

import type { AppState } from '../app-state.js';
import { handleChaosExperimentListRoute } from './chaos-experiment-list-route.js';

class MockRequest extends Readable {
  public readonly method: string;
  public readonly url: string;

  constructor(method: string, url: string) {
    super();
    this.method = method;
    this.url = url;
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

  bodyJson<T>(): T {
    return JSON.parse(Buffer.concat(this.#chunks).toString('utf8')) as T;
  }
}

const readyAppState: AppState = {
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

test('chaos experiment list authorizes before reading state and retains runtime impact details', async () => {
  const calls: string[] = [];
  const response = new MockResponse();
  const request = new MockRequest('GET', '/chaos/experiments');
  const experiments = [
    { id: 'database-failure', name: 'Database', description: 'Database down' },
    { id: 'worker-failure', name: 'Worker', description: 'Worker down' },
    { id: 'provider-failure', name: 'Provider', description: 'Provider down' },
    { id: 'redis-failure', name: 'Redis', description: 'Redis down' }
  ];
  const handled = await handleChaosExperimentListRoute(request as never, response as never, {
    requireEarlyPrincipal: async (permissionCode) => {
      calls.push(`authorize:${permissionCode}`);
      return {};
    },
    chaos: {
      listActiveExperiments: () => {
        calls.push('active');
        return [{ id: 'database-failure' }];
      },
      listExperiments: () => {
        calls.push('experiments');
        return experiments;
      },
      isActive: (id: string) => id === 'database-failure'
    } as never,
    getAppState: () => {
      calls.push('app-state');
      return readyAppState;
    },
    resolveRedisHealthStatus: async () => {
      calls.push('redis-health');
      return { healthy: true, backend: 'redis', detail: 'Redis healthy' };
    },
    runtimeDistributedStateEnabled: true,
    redisUrl: 'redis://configured.invalid'
  });

  assert.equal(handled, true);
  assert.deepEqual(calls.slice(0, 5), [
    'authorize:users.manage',
    'app-state',
    'active',
    'redis-health',
    'experiments'
  ]);
  assert.equal(response.statusCode, 200);
  assert.equal(response.headers.get('content-type'), 'application/json');

  const payload = response.bodyJson<{
    runtimeState: { productionReady: boolean; persistenceMode: string };
    experiments: Array<{
      id: string;
      active: boolean;
      runbook?: { title: string; path: string };
      indicators: readonly string[];
      runtimeImpact: {
        databaseHealthy: boolean;
        persistenceMode: string;
        workerReady: boolean;
        externalProvidersHealthy: boolean;
        redisHealthy: boolean;
        rateLimiterMode: string;
      };
    }>;
  }>();

  assert.equal(payload.runtimeState.productionReady, false);
  assert.equal(payload.runtimeState.persistenceMode, 'unavailable');
  assert.deepEqual(
    payload.experiments.map((experiment) => experiment.id),
    experiments.map((experiment) => experiment.id)
  );
  assert.equal(payload.experiments[0]?.active, true);
  assert.equal(payload.experiments[0]?.runtimeImpact.databaseHealthy, false);
  assert.equal(payload.experiments[0]?.runtimeImpact.persistenceMode, 'unavailable');
  assert.equal(payload.experiments[1]?.runtimeImpact.workerReady, false);
  assert.equal(payload.experiments[2]?.runtimeImpact.externalProvidersHealthy, false);
  assert.equal(payload.experiments[3]?.runtimeImpact.redisHealthy, false);
  assert.deepEqual(payload.experiments[0]?.indicators, [
    'app_database_healthy',
    'app_persistence_mode'
  ]);
  assert.deepEqual(payload.experiments[0]?.runbook, {
    title: 'Database Failure Runbook',
    path: 'packages/chaos/src/runbooks/database-failure-runbook.md'
  });
});

test('chaos experiment list retains exact raw URL and GET matching', async () => {
  const calls: string[] = [];
  const handlers = {
    requireEarlyPrincipal: async () => {
      calls.push('authorize');
    },
    chaos: {} as never,
    getAppState: () => {
      calls.push('app-state');
      return readyAppState;
    },
    resolveRedisHealthStatus: async () => undefined,
    runtimeDistributedStateEnabled: false
  };
  const unmatched = [
    new MockRequest('GET', '/chaos/experiments?include=runtime'),
    new MockRequest('POST', '/chaos/experiments')
  ];

  for (const request of unmatched) {
    const handled = await handleChaosExperimentListRoute(
      request as never,
      new MockResponse() as never,
      handlers
    );
    assert.equal(handled, false);
  }

  assert.deepEqual(calls, []);
});
