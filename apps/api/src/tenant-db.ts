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
 * Usage (HTTP API - uses AsyncLocalStorage):
 *   import { withTenantDb } from './tenant-db.js';
 *   import { getPool } from '@cvg-his-v2/shared-database';
 *
 *   // Within a runWithTenantContext block:
 *   const result = await withTenantDb(getPool(), async (client) => {
 *     const res = await client.query('SELECT * FROM owners', []);
 *     return res.rows;
 *   });
 *
 * Usage (Worker/Batch jobs - explicit accountId):
 *   import { withTenantDb } from './tenant-db.js';
 *   import { getPool } from '@cvg-his-v2/shared-database';
 *
 *   const result = await withTenantDb(getPool(), 'account-id-from-job-param', async (client) => {
 *     const res = await client.query('SELECT * FROM owners', []);
 *     return res.rows;
 *   });
 */

import type { Pool, PoolClient } from 'pg';
import { requireAccountId } from '@cvg-his-v2/tenant-context';

/**
 * Executes a function within a PostgreSQL transaction that has
 * `app.current_account_id` set from the current AsyncLocalStorage context.
 *
 * This enables RLS (Row-Level Security) enforcement: all queries executed
 * within `fn` are subject to RLS policies that filter by account_id.
 *
 * Requirements:
 * - Must be called within a `runWithTenantContext()` block (so that
 *   `requireAccountId()` can read the accountId from AsyncLocalStorage)
 * - `pool` must be a PostgreSQL pool (not in-memory)
 *
 * @param pool - The PostgreSQL connection pool
 * @param fn - Function to execute with tenant-scoped transaction
 * @returns The result of `fn`
 * @throws If called outside a tenant context (no accountId in AsyncLocalStorage)
 */
export async function withTenantDb<T>(
  pool: Pool,
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const accountId = requireAccountId();
  return withTenantDbExplicit(pool, accountId, fn);
}

/**
 * Executes a function within a PostgreSQL transaction that has
 * `app.current_account_id` set to the provided accountId.
 *
 * This variant is for background jobs, batch processors, or any code
 * that has an explicit accountId but does not use AsyncLocalStorage.
 *
 * @param pool - The PostgreSQL connection pool
 * @param accountId - The account ID to set for RLS enforcement
 * @param fn - Function to execute with tenant-scoped transaction
 */
export async function withTenantDbExplicit<T>(
  pool: Pool,
  accountId: string,
  fn: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client: PoolClient = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.current_account_id', $1, true)", [accountId]);
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {
      // Ignore rollback errors during error handling
    });
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Synchronous check: throws if called outside a tenant context (no accountId).
 * Use this at the start of repository methods to fail fast when tenant context
 * is missing, rather than letting queries execute without RLS enforcement.
 *
 * @throws Error if no accountId in AsyncLocalStorage
 */
export function assertTenantContext(): void {
  requireAccountId();
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
  const client: PoolClient = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.current_account_id', $1, true)", [accountId]);
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {
      // Ignore rollback errors during error handling
    });
    throw error;
  } finally {
    client.release();
  }
}
