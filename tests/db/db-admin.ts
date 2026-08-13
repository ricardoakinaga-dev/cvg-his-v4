import { Pool } from 'pg';
import { ADMIN_DB_URL, TEST_DB_IS_EPHEMERAL, TEST_DB_NAME, TEST_DB_URL } from '../setup/env.js';

let adminPool: Pool | null = null;
let testPool: Pool | null = null;
const RESET_RETRY_ATTEMPTS = 10;
const RESET_RETRY_DELAY_MS = 250;

export function getAdminPool(): Pool {
  if (!adminPool) {
    adminPool = new Pool({ connectionString: ADMIN_DB_URL, max: 2 });
  }
  return adminPool;
}

export function getTestPool(): Pool {
  if (!testPool) {
    testPool = new Pool({ connectionString: TEST_DB_URL, max: 10 });
  }
  return testPool;
}

export async function closeTestPool(): Promise<void> {
  if (testPool) {
    await testPool.end();
    testPool = null;
  }
}

export async function ensureTestDatabase(): Promise<void> {
  const client = getAdminPool();
  const result = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [TEST_DB_NAME]);
  if (result.rowCount === 0) {
    await client.query(`CREATE DATABASE "${TEST_DB_NAME}"`);
    console.log(`[test-db] Created database ${TEST_DB_NAME}`);
  }
}

export async function withTestDatabaseLock<T>(callback: () => Promise<T>): Promise<T> {
  const client = await getAdminPool().connect();
  const lockKey = `cvg_his_v2_test_db:${TEST_DB_NAME}`;

  try {
    await client.query('SELECT pg_advisory_lock(hashtext($1))', [lockKey]);
    return await callback();
  } finally {
    await client.query('SELECT pg_advisory_unlock(hashtext($1))', [lockKey]);
    client.release();
  }
}

async function databaseExists(client: Pool, databaseName: string): Promise<boolean> {
  const result = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [databaseName]);
  return (result.rowCount ?? 0) > 0;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForDatabaseState(
  client: Pool,
  databaseName: string,
  shouldExist: boolean
): Promise<void> {
  for (let attempt = 1; attempt <= RESET_RETRY_ATTEMPTS; attempt += 1) {
    const exists = await databaseExists(client, databaseName);
    if (exists === shouldExist) {
      return;
    }
    await sleep(RESET_RETRY_DELAY_MS);
  }

  throw new Error(
    `[test-db] Database ${databaseName} did not reach expected state exists=${shouldExist}`
  );
}

export async function resetTestDatabase(): Promise<void> {
  await closeTestPool();
  const client = getAdminPool();
  try {
    await client.query(`
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = '${TEST_DB_NAME}'
        AND pid <> pg_backend_pid()
    `);
  } catch {
    // No active connections to terminate — continue
  }

  if (await databaseExists(client, TEST_DB_NAME)) {
    await client.query(`DROP DATABASE "${TEST_DB_NAME}"`);
    await waitForDatabaseState(client, TEST_DB_NAME, false);
  }

  await client.query(`CREATE DATABASE "${TEST_DB_NAME}"`);
  await waitForDatabaseState(client, TEST_DB_NAME, true);
  console.log(`[test-db] Reset database ${TEST_DB_NAME}`);
}

export async function closePools(): Promise<void> {
  await closeTestPool();
  if (adminPool) {
    await adminPool.end();
    adminPool = null;
  }
}

export async function dropTestDatabase(): Promise<void> {
  if (!TEST_DB_IS_EPHEMERAL) {
    return;
  }

  await closeTestPool();
  const client = getAdminPool();
  try {
    await client.query(`
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = '${TEST_DB_NAME}'
        AND pid <> pg_backend_pid()
    `);
  } catch {
    // Best-effort cleanup
  }

  if (await databaseExists(client, TEST_DB_NAME)) {
    await client.query(`DROP DATABASE "${TEST_DB_NAME}"`);
    await waitForDatabaseState(client, TEST_DB_NAME, false);
    console.log(`[test-db] Dropped ephemeral database ${TEST_DB_NAME}`);
  }
}
