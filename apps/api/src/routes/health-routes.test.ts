import assert from 'node:assert/strict';
import test from 'node:test';
import { Writable } from 'node:stream';

import { getAppState, setAppState } from '../app-state.js';
import { handleHealthRoutes } from './health-routes.js';

class MockResponse extends Writable {
  statusCode = 0;
  readonly headers = new Map<string, string>();
  body = '';

  setHeader(name: string, value: string | number): this {
    this.headers.set(name.toLowerCase(), String(value));
    return this;
  }

  override _write(
    chunk: unknown,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void
  ): void {
    this.body += Buffer.isBuffer(chunk) ? chunk.toString('utf8') : String(chunk);
    callback();
  }
}

interface HealthPayload {
  readonly ok?: boolean;
  readonly persistenceMode?: string;
  readonly liveness?: { readonly live?: boolean };
  readonly readiness?: {
    readonly ready?: boolean;
    readonly productionReady?: boolean;
    readonly persistenceMode?: string;
  };
  readonly dependencies?: {
    readonly database?: { readonly state?: string };
  };
}

function request(url: string) {
  return { url, method: 'GET', headers: {} } as never;
}

function payload(response: MockResponse): HealthPayload {
  return JSON.parse(response.body) as HealthPayload;
}

test('in-memory demo is live but is never advertised as persistently ready', async () => {
  const previousState = getAppState();
  setAppState({
    persistenceMode: 'in-memory',
    databaseConfigured: false,
    databaseHealthy: false,
    databaseDetail: 'No database configured for the local demo',
    repositoriesReady: true,
    repositoryCount: 12,
    workerReady: false,
    workerDetail: 'Worker requires a persistent database runtime',
    productionReady: false,
    initialized: true,
    secretsManagerProvider: 'env',
    mlReady: true,
    mlDetail: 'Local services initialized'
  });

  const options = {
    appName: 'cvg-his-v2-api',
    environment: 'test',
    version: '0.1.0',
    runtimeDistributedStateEnabled: false
  } as never;

  try {
    const liveResponse = new MockResponse();
    assert.equal(await handleHealthRoutes(request('/live'), liveResponse as never, options), true);
    const livePayload = payload(liveResponse);
    assert.equal(liveResponse.statusCode, 200);
    assert.equal(livePayload.liveness?.live, true);

    const healthResponse = new MockResponse();
    assert.equal(
      await handleHealthRoutes(request('/health'), healthResponse as never, options),
      true
    );
    const healthPayload = payload(healthResponse);
    assert.equal(healthResponse.statusCode, 200);
    assert.equal(healthPayload.ok, true);
    assert.equal(healthPayload.persistenceMode, 'in-memory');

    const readyResponse = new MockResponse();
    assert.equal(await handleHealthRoutes(request('/ready'), readyResponse as never, options), true);
    const readyPayload = payload(readyResponse);
    assert.equal(readyResponse.statusCode, 503);
    assert.equal(readyPayload.readiness?.ready, false);
    assert.equal(readyPayload.readiness?.productionReady, false);
    assert.equal(readyPayload.readiness?.persistenceMode, 'in-memory');
    assert.equal(readyPayload.dependencies?.database?.state, 'in-memory-fallback');
  } finally {
    setAppState(previousState);
  }
});
