export interface DatabaseStatus {
  readonly state: 'not-configured' | 'healthy' | 'unhealthy' | 'in-memory-fallback';
  readonly detail: string;
}

export function createNoopDatabaseStatus(): DatabaseStatus {
  return {
    state: 'not-configured',
    detail: 'Database wiring starts in later phases.'
  };
}

export interface DatabaseHealth {
  healthy: boolean;
  detail: string;
}

// Re-export real implementation from client.ts
export {
  createDatabaseClient,
  getDatabaseClient,
  getPool,
  closeDatabaseClient,
  checkDatabaseHealth,
  type DatabaseClient
} from './client.js';

export * from './schemas/index.js';
