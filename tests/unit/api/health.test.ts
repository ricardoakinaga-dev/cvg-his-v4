import { describe, it, expect } from 'vitest';
import {
  createHealthResponse,
  createLivenessResponse,
  createReadinessResponse
} from '../../../apps/api/src/health.js';

function createDeps(
  overrides: Partial<{
    databaseConfigured: boolean;
    databaseHealthy: boolean;
    databaseDetail: string;
    persistenceMode: 'database' | 'in-memory' | 'unavailable' | 'not-initialized';
    repositoriesReady: boolean;
    repositoryCount: number;
    workerReady: boolean;
    workerDetail: string;
    productionReady: boolean;
    initialized: boolean;
  }> = {}
) {
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
    ...overrides
  };
}

describe('Health — createHealthResponse', () => {
  it('returns a healthy payload in in-memory mode', () => {
    const response = createHealthResponse(
      'cvg-his-v2-api',
      'test',
      '0.1.0',
      { headers: {} } as never,
      createDeps()
    );

    expect(response.ok).toBe(true);
    expect(response.service).toBe('cvg-his-v2-api');
    expect(response.environment).toBe('test');
    expect(response.dependencies.database.state).toBe('in-memory-fallback');
    expect(response.dependencies.repositories.state).toBe('ready');
    expect(response.dependencies.worker.state).toBe('not-configured');
    expect(response.readiness.ready).toBe(false);
    expect(response.liveness.live).toBe(true);
  });

  it('shows unhealthy when database configured but not healthy', () => {
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
        workerDetail:
          'Worker dependency degraded: notification repository not ready for shared DB processing'
      })
    );

    expect(response.ok).toBe(false);
    expect(response.dependencies.database.state).toBe('unhealthy');
    expect(response.dependencies.worker.state).toBe('degraded');
  });

  it('fails closed when persistence is unavailable after a database failure', () => {
    const response = createHealthResponse(
      'cvg-his-v2-api',
      'test',
      '0.1.0',
      { headers: {} } as never,
      createDeps({
        databaseConfigured: true,
        databaseHealthy: false,
        persistenceMode: 'unavailable',
        repositoriesReady: true,
        workerReady: false,
        productionReady: false
      })
    );

    expect(response.ok).toBe(false);
    expect(response.readiness.ready).toBe(false);
    expect(response.readiness.persistenceMode).toBe('unavailable');
    expect(response.dependencies.database.state).toBe('unhealthy');
  });

  it('does not relabel unavailable persistence as an unconfigured in-memory fallback', () => {
    const response = createHealthResponse(
      'cvg-his-v2-api',
      'test',
      '0.1.0',
      { headers: {} } as never,
      createDeps({
        databaseConfigured: false,
        databaseHealthy: false,
        persistenceMode: 'unavailable',
        repositoriesReady: true
      })
    );

    expect(response.ok).toBe(false);
    expect(response.dependencies.database.state).toBe('unhealthy');
    expect(response.dependencies.database.detail).toBe('Database persistence is unavailable.');
  });

  it('does not expose database connection details', () => {
    const response = createHealthResponse(
      'cvg-his-v2-api',
      'production',
      '0.1.0',
      { headers: {} } as never,
      createDeps({
        databaseConfigured: true,
        databaseHealthy: false,
        databaseDetail: 'postgresql://admin:super-secret@db.internal:5432/cvg'
      })
    );

    expect(response.dependencies.database.detail).toBe('Database is unavailable.');
    expect(JSON.stringify(response)).not.toMatch(/super-secret|db\.internal|5432/);
  });

  it('returns ok when database is healthy and configured', () => {
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

    expect(response.ok).toBe(true);
    expect(response.dependencies.database.state).toBe('healthy');
    expect(response.dependencies.database.detail).toBe('Database connection is healthy.');
    expect(response.dependencies.worker.state).toBe('ready');
    expect(response.readiness.ready).toBe(true);
  });

  it('returns not ok when database healthy but repositories not ready', () => {
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
        workerDetail:
          'Worker dependency degraded: notification repository not ready for shared DB processing',
        productionReady: false
      })
    );

    expect(response.ok).toBe(false);
    expect(response.dependencies.database.state).toBe('healthy');
    expect(response.dependencies.repositories.state).toBe('not-ready');
  });

  it('returns not ok when in-memory mode but repositories not ready', () => {
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

    expect(response.ok).toBe(false);
    expect(response.dependencies.database.state).toBe('in-memory-fallback');
  });

  it('reports unhealthy detail when database configured but connection failed', () => {
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
        workerDetail:
          'Worker dependency degraded: notification repository not ready for shared DB processing'
      })
    );

    expect(response.ok).toBe(false);
    expect(response.dependencies.database.state).toBe('unhealthy');
    expect(response.dependencies.database.detail).toBe('Database is unavailable.');
  });
});

describe('Health — createReadinessResponse', () => {
  it('returns not ready when worker dependency is degraded', () => {
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
        workerDetail:
          'Worker dependency degraded: notification repository not ready for shared DB processing',
        productionReady: false
      })
    );

    expect(response.readiness.ready).toBe(false);
    expect(response.dependencies.worker.state).toBe('degraded');
  });
});

describe('Health — createLivenessResponse', () => {
  it('returns live even before full initialization', () => {
    const response = createLivenessResponse(
      'cvg-his-v2-api',
      'test',
      '0.1.0',
      { headers: {} } as never,
      false
    );

    expect(response.ok).toBe(true);
    expect(response.liveness.live).toBe(true);
    expect(response.liveness.initialized).toBe(false);
    expect(response.readiness.ready).toBe(false);
  });
});
