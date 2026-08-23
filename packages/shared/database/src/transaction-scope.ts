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

/**
 * Runs work after a transaction has unwound without inheriting its inactive
 * AsyncLocalStorage scope. This is used by cache rehydration scheduled from a
 * command catch handler: the next query must open a fresh tenant transaction,
 * never reuse the client that has already rolled back.
 */
export function runWithoutDatabaseTransactionScope<T>(operation: () => T): T {
  return transactionStorage.exit(operation);
}
