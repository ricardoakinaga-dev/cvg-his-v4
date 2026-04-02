import { Pool } from 'pg';
import { ADMIN_DB_URL, TEST_DB_NAME, TEST_DB_URL } from '../setup/env.js';

let adminPool: Pool | null = null;
let testPool: Pool | null = null;

function getAdminPool(): Pool {
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

export async function ensureTestDatabase(): Promise<void> {
  const client = getAdminPool();
  const result = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [TEST_DB_NAME]);
  if (result.rowCount === 0) {
    await client.query(`CREATE DATABASE "${TEST_DB_NAME}"`);
    console.log(`[test-db] Created database ${TEST_DB_NAME}`);
  }
}

export async function resetTestDatabase(): Promise<void> {
  const client = getAdminPool();
  await client.query(`
    SELECT pg_terminate_backend(pg_stat_activity.pid)
    FROM pg_stat_activity
    WHERE pg_stat_activity.datname = '${TEST_DB_NAME}'
      AND pid <> pg_backend_pid()
  `);
  await client.query(`DROP DATABASE IF EXISTS "${TEST_DB_NAME}"`);
  await client.query(`CREATE DATABASE "${TEST_DB_NAME}"`);
  console.log(`[test-db] Reset database ${TEST_DB_NAME}`);
}

export async function closePools(): Promise<void> {
  if (testPool) {
    await testPool.end();
    testPool = null;
  }
  if (adminPool) {
    await adminPool.end();
    adminPool = null;
  }
}
