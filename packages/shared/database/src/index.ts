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
  configureDatabaseTenantAccountResolver,
  createScopedDatabaseClient,
  getDatabaseClient,
  checkDatabaseRuntimeRole,
  getPool,
  withTenantTransaction,
  closeDatabaseClient,
  checkDatabaseHealth,
  type DatabaseClient
} from './client.js';

export * from './schemas/index.js';
export {
  createTenantUnitOfWork,
  getTenantTransactionContext,
  hashIdempotencyPayload,
  IdempotencyConflictError,
  IdempotencyInProgressError,
  runInTenantTransaction,
  type JsonValue,
  type TenantTransactionContext,
  type TenantUnitOfWork,
  type TenantUnitOfWorkExecutionContext,
  type TenantUnitOfWorkResult,
  type TransactionalAuditInput,
  type TransactionalOutboxInput
} from './tenant-unit-of-work.js';
export {
  getDatabaseTransactionScope,
  type DatabaseTransactionScope
} from './transaction-scope.js';
