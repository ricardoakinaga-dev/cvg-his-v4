import { AsyncLocalStorage } from 'node:async_hooks';
import type { Pool, PoolClient } from 'pg';

export interface DatabaseTransactionScope {
  readonly accountId: string;
  readonly pool: Pool;
  readonly client: PoolClient;
  readonly isActive: () => boolean;
}

const transactionStorage = new AsyncLocalStorage<DatabaseTransactionScope>();

export function getDatabaseTransactionScope(): DatabaseTransactionScope | undefined {
  return transactionStorage.getStore();
}

export function runWithDatabaseTransactionScope<T>(
  scope: DatabaseTransactionScope,
  operation: () => Promise<T>
): Promise<T> {
  return transactionStorage.run(scope, operation);
}
