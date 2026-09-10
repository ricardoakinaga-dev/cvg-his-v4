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

/**
 * Serializes authorization decisions with other protected writes for one
 * tenant account. PostgreSQL releases transaction advisory locks on commit or
 * rollback, so callers must already be inside the canonical tenant UoW.
 */
export async function acquireTenantAuthorizationLock(accountId: string): Promise<void> {
  const scope = requireActiveAuthorizationScope(accountId);
  await scope.client.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [accountId]);
}

/**
 * Acquires the shared side of the authorization linearization barrier.
 *
 * Ordinary tenant commands only need to be ordered against access-control
 * mutations, not against each other. PostgreSQL shared transaction advisory
 * locks let concurrent commands keep their own transaction while an access
 * control mutation takes the exclusive lock below.
 */
export async function acquireTenantAuthorizationSharedLock(accountId: string): Promise<void> {
  const scope = requireActiveAuthorizationScope(accountId);
  await scope.client.query('SELECT pg_advisory_xact_lock_shared(hashtextextended($1, 0))', [
    accountId
  ]);
}

/**
 * Explicit name for the exclusive lock used by access-control and other
 * authorization writers. The legacy export remains exclusive for existing
 * worker/repository callers that depend on that contract.
 */
export async function acquireTenantAuthorizationMutationLock(accountId: string): Promise<void> {
  return acquireTenantAuthorizationLock(accountId);
}

function requireActiveAuthorizationScope(accountId: string): DatabaseTransactionScope {
  const scope = getDatabaseTransactionScope();
  if (!scope || !scope.isActive()) {
    throw new Error('Tenant authorization linearization requires an active database transaction');
  }
  if (scope.accountId !== accountId) {
    throw new Error('Tenant authorization linearization account mismatch');
  }
  return scope;
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
