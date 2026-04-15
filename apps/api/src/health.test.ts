import assert from 'node:assert/strict';
import test from 'node:test';

import { createHealthResponse, createLivenessResponse, createReadinessResponse } from './health.js';

function createDeps(overrides: Partial<Parameters<typeof createHealthResponse>[4]> = {}) {
  return {
    databaseConfigured: false,
    databaseHealthy: false,
    databaseDetail: 'Using in-memory repositories',
    persistenceMode: 'in-memory' as const,
    repositoriesReady: true,
    repositoryCount: 7,
    workerReady: false,
    workerDetail: 'Worker dependency not configured because DATABASE_URL is absent',
    productionReady: false,
    initialized: true,
    mlReady: true,
    mlDetail: 'SmartSchedulingService, ModelRegistryService, FeatureStoreService wired',
    ...overrides
  };
}

test('createHealthResponse returns a healthy payload in in-memory mode', () => {
  const response = createHealthResponse(
    'cvg-his-v2-api',
    'test',
    '0.1.0',
    { headers: {} } as never,
    createDeps()
  );

  assert.equal(response.ok, true);
  assert.equal(response.service, 'cvg-his-v2-api');
  assert.equal(response.environment, 'test');
  assert.equal(response.dependencies.database.state, 'in-memory-fallback');
  assert.equal(response.dependencies.repositories.state, 'ready');
  assert.equal(response.dependencies.worker.state, 'not-configured');
  assert.equal(response.readiness.ready, false);
  assert.equal(response.liveness.live, true);
});

test('createHealthResponse shows unhealthy when database configured but not healthy', () => {
  const response = createHealthResponse(
    'cvg-his-v2-api',
    'test',
    '0.1.0',
    { headers: {} } as never,
    createDeps({
      databaseHealthy: false,
      databaseDetail: 'Connection refused',
      databaseConfigured: true,
      persistenceMode: 'in-memory',
      workerReady: false,
      workerDetail: 'Worker dependency degraded: notification repository not ready for shared DB processing'
    })
  );

  assert.equal(response.ok, false);
  assert.equal(response.dependencies.database.state, 'unhealthy');
  assert.equal(response.dependencies.worker.state, 'degraded');
});

test('createHealthResponse returns ok when database is healthy and configured', () => {
  const response = createHealthResponse(
    'cvg-his-v2-api',
    'production',
    '0.1.0',
    { headers: {} } as never,
    createDeps({
      databaseHealthy: true,
      databaseConfigured: true,
      databaseDetail: 'Database connected',
      persistenceMode: 'database',
      repositoriesReady: true,
      repositoryCount: 11,
      workerReady: true,
      workerDetail: 'Worker can consume notification jobs via shared database repository',
      productionReady: true
    })
  );

  assert.equal(response.ok, true);
  assert.equal(response.dependencies.database.state, 'healthy');
  assert.equal(response.dependencies.database.detail, 'Database connected');
  assert.equal(response.dependencies.worker.state, 'ready');
  assert.equal(response.readiness.ready, true);
});

test('createHealthResponse returns not ok when database healthy but repositories not ready', () => {
  const response = createHealthResponse(
    'cvg-his-v2-api',
    'production',
    '0.1.0',
    { headers: {} } as never,
    createDeps({
      databaseHealthy: true,
      databaseConfigured: true,
      databaseDetail: 'Database connected',
      persistenceMode: 'database',
      repositoriesReady: false,
      repositoryCount: 0,
      workerReady: false,
      workerDetail: 'Worker dependency degraded: notification repository not ready for shared DB processing',
      productionReady: false
    })
  );

  assert.equal(response.ok, false);
  assert.equal(response.dependencies.database.state, 'healthy');
  assert.equal(response.dependencies.repositories.state, 'not-ready');
});

test('createHealthResponse returns not ok when in-memory mode but repositories not ready', () => {
  const response = createHealthResponse(
    'cvg-his-v2-api',
    'test',
    '0.1.0',
    { headers: {} } as never,
    createDeps({
      repositoriesReady: false,
      repositoryCount: 0
    })
  );

  assert.equal(response.ok, false);
  assert.equal(response.dependencies.database.state, 'in-memory-fallback');
});

test('createHealthResponse reports unhealthy detail when database configured but connection failed', () => {
  const response = createHealthResponse(
    'cvg-his-v2-api',
    'production',
    '0.1.0',
    { headers: {} } as never,
    createDeps({
      databaseHealthy: false,
      databaseConfigured: true,
      databaseDetail: 'Connection refused: ECONNREFUSED 127.0.0.1:5432',
      persistenceMode: 'in-memory',
      repositoryCount: 11,
      workerReady: false,
      workerDetail: 'Worker dependency degraded: notification repository not ready for shared DB processing'
    })
  );

  assert.equal(response.ok, false);
  assert.equal(response.dependencies.database.state, 'unhealthy');
  assert.equal(
    response.dependencies.database.detail,
    'Connection refused: ECONNREFUSED 127.0.0.1:5432'
  );
});

test('createReadinessResponse returns  not ready when worker dependency is degraded', () => {
  const response = createReadinessResponse(
    'cvg-his-v2-api',
    'production',
    '0.1.0',
    { headers: {} } as never,
    createDeps({
      databaseHealthy: true,
      databaseConfigured: true,
      databaseDetail: 'Database connected',
      persistenceMode: 'database',
      repositoryCount: 11,
      workerReady: false,
      workerDetail: 'Worker dependency degraded: notification repository not ready for shared DB processing',
      productionReady: false
    })
  );

  assert.equal(response.readiness.ready, false);
  assert.equal(response.dependencies.worker.state, 'degraded');
});

test('createLivenessResponse returns live even before full initialization', () => {
  const response = createLivenessResponse(
    'cvg-his-v2-api',
    'test',
    '0.1.0',
    { headers: {} } as never,
    false
  );

  assert.equal(response.ok, true);
  assert.equal(response.liveness.live, true);
  assert.equal(response.liveness.initialized, false);
  assert.equal(response.readiness.ready, false);
});
