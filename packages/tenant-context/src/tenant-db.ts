/**
 * Tenant-aware database operations.
 *
 * Sets PostgreSQL session variable `app.current_account_id` before executing
 * queries, enabling RLS (Row-Level Security) enforcement at the database level.
 *
 * This module bridges:
 * - AsyncLocalStorage (TenantContext from @cvg-his-v2/tenant-context)
 * - PostgreSQL session (SET LOCAL app.current_account_id)
 *
 * Usage (HTTP API or module code):
 *   import { withTenantQuery } from '@cvg-his-v2/tenant-context';
 *   import { getPool } from '@cvg-his-v2/shared-database';
 *
 *   // Within a runWithTenantContext block:
 *   const result = await withTenantQuery(getPool(), async (client) => {
 *     const res = await client.query('SELECT * FROM owners', []);
 *     return res.rows;
 *   });
 *
 * Usage (Worker/Batch jobs - explicit accountId):
 *   import { withTenantQueryExplicit } from '@cvg-his-v2/tenant-context';
 *   import { getPool } from '@cvg-his-v2/shared-database';
 *
 *   const result = await withTenantQueryExplicit(getPool(), 'account-id-from-job-param', async (client) => {
 *     const res = await client.query('SELECT * FROM owners', []);
 *     return res.rows;
 *   });
 */

import type { Pool, PoolClient } from 'pg';
import {
  createScopedDatabaseClient,
  configureDatabaseTenantAccountResolver,
  getDatabaseTransactionScope,
  getPool,
  type DatabaseClient
} from '@cvg-his-v2/shared-database';
import { requireAccountId } from './context.js';
import { getTenantContext } from './context.js';

configureDatabaseTenantAccountResolver(() => getTenantContext()?.accountId);

/**
 * Executes a single query within a PostgreSQL transaction that has
 * `app.current_account_id` set from the AsyncLocalStorage context.
 *
 * Each call runs in its own BEGIN/SET LOCAL/COMMIT transaction.
 * All queries executed within `fn` are subject to RLS policies filtered by account_id.
 *
 * Requirements:
 * - Must be called within a `runWithTenantContext()` block
 * - `pool` must be a PostgreSQL pool (not in-memory)
 *
 * @param pool - The PostgreSQL connection pool
 * @param fn - Function to execute with tenant-scoped query
 * @returns The result of `fn`
 * @throws If called outside a tenant context (no accountId in AsyncLocalStorage)
 */
export async function withTenantQuery<T>(
  pool: Pool,
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const accountId = requireAccountId();
  return withTenantQueryExplicit(pool, accountId, fn);
}

export async function withTenantDrizzle<T>(
  fn: (database: DatabaseClient) => Promise<T>
): Promise<T> {
  return withTenantQuery(getPool(), async (client) => fn(createScopedDatabaseClient(client)));
}

/**
 * Executes a single query within a PostgreSQL transaction that has
 * `app.current_account_id` set to the provided accountId.
 *
 * This variant is for background jobs, batch processors, or any code
 * that has an explicit accountId but does not use AsyncLocalStorage.
 *
 * @param pool - The PostgreSQL connection pool
 * @param accountId - The account ID to set for RLS enforcement
 * @param fn - Function to execute with tenant-scoped query
 */
export async function withTenantQueryExplicit<T>(
  pool: Pool,
  accountId: string,
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const activeScope = getDatabaseTransactionScope();
  if (activeScope) {
    if (!activeScope.isActive()) throw new Error('Tenant transaction scope is no longer active');
    if (activeScope.pool !== pool) {
      throw new Error('Nested tenant query cannot change database pool');
    }
    if (activeScope.accountId !== accountId) {
      throw new Error('Nested tenant query cannot change account');
    }
    return fn(activeScope.client);
  }
  const client: PoolClient = await pool.connect();
  let transactionStarted = false;
  let commitAttempted = false;
  let releaseError: Error | undefined;
  try {
    await client.query('BEGIN');
    transactionStarted = true;
    await client.query("SELECT set_config('app.current_account_id', $1, true)", [accountId]);
    const result = await fn(client);
    commitAttempted = true;
    await client.query('COMMIT');
    return result;
  } catch (error) {
    if (commitAttempted) {
      releaseError = error instanceof Error ? error : new Error(String(error));
    }
    if (transactionStarted) {
      await client.query('ROLLBACK').catch((rollbackError: unknown) => {
        releaseError = rollbackError instanceof Error
          ? rollbackError
          : new Error(String(rollbackError));
      });
    }
    throw error;
  } finally {
    client.release(releaseError);
  }
}
