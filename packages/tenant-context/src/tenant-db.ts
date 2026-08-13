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
  getActiveDatabaseContext,
  getPool,
  runWithDatabaseClient
} from '@cvg-his-v2/shared-database';
import { requireAccountId } from './context.js';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function assertDatabaseAccountId(accountId: string): void {
  if (!UUID_PATTERN.test(accountId)) {
    throw new Error('Database tenant accountId must be a valid UUID');
  }
}

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
  assertDatabaseAccountId(accountId);
  const activeContext = getActiveDatabaseContext();
  if (activeContext) {
    if (activeContext.accountId !== accountId) {
      throw new Error(
        `A database transaction cannot switch from tenant ${activeContext.accountId ?? 'unknown'} to tenant ${accountId}`
      );
    }
    return fn(activeContext.client);
  }

  const client: PoolClient = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.current_account_id', $1, true)", [accountId]);
    const result = await runWithDatabaseClient(client, { accountId }, () => fn(client));
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      const originalMessage = error instanceof Error ? error.message : String(error);
      const rollbackMessage =
        rollbackError instanceof Error ? rollbackError.message : String(rollbackError);
      throw new AggregateError(
        [error, rollbackError],
        `${originalMessage}; rollback also failed: ${rollbackMessage}`
      );
    }
    throw error;
  } finally {
    client.release();
  }
}
