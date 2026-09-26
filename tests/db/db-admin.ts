import { Pool } from 'pg';
import {
  ADMIN_DB_URL,
  assertDisposableTestDatabaseTarget,
  TEST_DB_IS_EPHEMERAL,
  TEST_DB_NAME,
  TEST_DB_OWNER_COMMENT,
  TEST_DB_OWNER_ROLE,
  TEST_DB_URL
} from '../setup/env.js';

let adminPool: Pool | null = null;
let testPool: Pool | null = null;
const RESET_RETRY_ATTEMPTS = 10;
const RESET_RETRY_DELAY_MS = 250;
const TEST_CLUSTER_SETUP_LOCK = 'cvg_his_v2:test-cluster-setup';
let ownedTestDatabaseRole: string | null = null;

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function quoteLiteral(value: string): string {
  return `'${value.replaceAll("'", "''")}'`;
}

export function getAdminPool(): Pool {
  if (!adminPool) {
    // Setup may hold the per-database and cluster-wide advisory locks while
    // issuing one additional administrative query.
    adminPool = new Pool({ connectionString: ADMIN_DB_URL, max: 4 });
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

export async function ensureTestDatabase(
  registerOwnership?: (ownerRoleName: string, ownerComment: string) => void
): Promise<void> {
  if (!TEST_DB_IS_EPHEMERAL) {
    throw new Error(
      `[test-db] Refusing to create or reuse explicit database ${TEST_DB_NAME}; use an ephemeral test database`
    );
  }
  assertDisposableTestDatabaseTarget();
  const client = getAdminPool();
  // A private NOLOGIN role is created for each ephemeral database. The
  // write-ahead marker covers role creation too; the role and its ownership tag
  // commit atomically before CREATE DATABASE can run.
  if (!/^cvg_test_owner_[a-f0-9]{32}_p\d{1,10}$/i.test(TEST_DB_OWNER_ROLE)) {
    throw new Error('[test-db] Refusing an invalid ephemeral database owner role name');
  }
  ownedTestDatabaseRole = TEST_DB_OWNER_ROLE;
  registerOwnership?.(TEST_DB_OWNER_ROLE, TEST_DB_OWNER_COMMENT);
  const roleClient = await client.connect();
  try {
    await roleClient.query('BEGIN');
    await roleClient.query(`CREATE ROLE ${quoteIdentifier(TEST_DB_OWNER_ROLE)} NOLOGIN NOINHERIT`);
    await roleClient.query(
      `COMMENT ON ROLE ${quoteIdentifier(TEST_DB_OWNER_ROLE)} IS ${quoteLiteral(TEST_DB_OWNER_COMMENT)}`
    );
    await roleClient.query('COMMIT');
  } catch (error) {
    try {
      await roleClient.query('ROLLBACK');
    } catch {
      // A lost connection aborts the uncommitted role and comment together.
    }
    throw error;
  } finally {
    roleClient.release();
  }
  // CREATE DATABASE deliberately fails when this generated name already
  // exists. Never reset or drop a database whose owner is not this run's role.
  await client.query(
    `CREATE DATABASE ${quoteIdentifier(TEST_DB_NAME)} OWNER ${quoteIdentifier(TEST_DB_OWNER_ROLE)}`
  );
  console.log(`[test-db] Created database ${TEST_DB_NAME}`);
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

/**
 * Migrations also reconcile PostgreSQL cluster-scoped roles. Ephemeral test
 * databases are isolated by name, but they still share those roles, so setup
 * must serialize that part across Vitest package processes.
 */
export async function withTestClusterSetupLock<T>(callback: () => Promise<T>): Promise<T> {
  const client = await getAdminPool().connect();

  try {
    await client.query('SELECT pg_advisory_lock(hashtext($1))', [TEST_CLUSTER_SETUP_LOCK]);
    return await callback();
  } finally {
    await client.query('SELECT pg_advisory_unlock(hashtext($1))', [TEST_CLUSTER_SETUP_LOCK]);
    client.release();
  }
}

async function databaseExists(client: Pool, databaseName: string): Promise<boolean> {
  const result = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [databaseName]);
  return result.rowCount > 0;
}

async function databaseIsOwnedByRole(
  client: Pool,
  databaseName: string,
  roleName: string
): Promise<boolean> {
  const result = await client.query(
    `SELECT 1
       FROM pg_database AS db
       JOIN pg_roles AS owner ON owner.oid = db.datdba
      WHERE db.datname = $1 AND owner.rolname = $2`,
    [databaseName, roleName]
  );
  return result.rowCount > 0;
}

async function getOwnedDatabaseRole(client: Pool, roleName: string) {
  const result = await client.query(
    `SELECT shobj_description(oid, 'pg_authid') AS owner_comment,
            rolcanlogin, rolsuper, rolcreatedb, rolcreaterole,
            rolreplication, rolbypassrls, rolinherit
       FROM pg_roles WHERE rolname = $1`,
    [roleName]
  );
  return result.rows[0] as
    | {
        owner_comment: string | null;
        rolcanlogin: boolean;
        rolsuper: boolean;
        rolcreatedb: boolean;
        rolcreaterole: boolean;
        rolreplication: boolean;
        rolbypassrls: boolean;
        rolinherit: boolean;
      }
    | undefined;
}

async function dropOwnedDatabaseRole(
  client: Pool,
  roleName: string,
  expectedComment: string
): Promise<void> {
  const attributes = await getOwnedDatabaseRole(client, roleName);
  if (!attributes) return;
  if (attributes.owner_comment !== expectedComment) {
    throw new Error(
      `[test-db] Refusing to drop owner role ${roleName} without this run's ownership tag`
    );
  }

  const dependentDatabase = await client.query(
    `SELECT 1 FROM pg_database WHERE datdba = (SELECT oid FROM pg_roles WHERE rolname = $1)`,
    [roleName]
  );
  if (dependentDatabase.rowCount > 0) {
    throw new Error(`[test-db] Refusing to drop owner role ${roleName} while it owns a database`);
  }

  if (
    attributes.rolcanlogin ||
    attributes.rolsuper ||
    attributes.rolcreatedb ||
    attributes.rolcreaterole ||
    attributes.rolreplication ||
    attributes.rolbypassrls ||
    attributes.rolinherit
  ) {
    throw new Error(`[test-db] Refusing to drop unexpectedly privileged owner role ${roleName}`);
  }
  await client.query(`DROP ROLE ${quoteIdentifier(roleName)}`);
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

export async function closePools(): Promise<void> {
  await closeTestPool();
  if (adminPool) {
    await adminPool.end();
    adminPool = null;
  }
}

export async function dropTestDatabase(): Promise<void> {
  if (!TEST_DB_IS_EPHEMERAL || !ownedTestDatabaseRole) {
    return;
  }

  await closeTestPool();
  const client = getAdminPool();
  const owner = await getOwnedDatabaseRole(client, ownedTestDatabaseRole);
  if (!owner) {
    ownedTestDatabaseRole = null;
    return;
  }
  if (owner.owner_comment !== TEST_DB_OWNER_COMMENT) {
    if (await databaseIsOwnedByRole(client, TEST_DB_NAME, ownedTestDatabaseRole)) {
      throw new Error(
        `[test-db] Refusing to drop ${TEST_DB_NAME}: its owner role no longer has this run's ownership tag`
      );
    }
    console.warn(
      `[test-db] Preserving ${ownedTestDatabaseRole}: its ownership tag does not match this run`
    );
    ownedTestDatabaseRole = null;
    return;
  }
  if (
    owner.rolcanlogin ||
    owner.rolsuper ||
    owner.rolcreatedb ||
    owner.rolcreaterole ||
    owner.rolreplication ||
    owner.rolbypassrls ||
    owner.rolinherit
  ) {
    throw new Error(
      `[test-db] Refusing to drop ${TEST_DB_NAME}: its recorded owner role has unexpected privileges`
    );
  }

  const databaseOwned = await databaseIsOwnedByRole(client, TEST_DB_NAME, ownedTestDatabaseRole);
  if (databaseOwned) {
    try {
      await client.query(
        `
        SELECT pg_terminate_backend(pg_stat_activity.pid)
        FROM pg_stat_activity
        WHERE pg_stat_activity.datname = $1
          AND pid <> pg_backend_pid()
      `,
        [TEST_DB_NAME]
      );
    } catch {
      // Best-effort cleanup
    }
    await client.query(`DROP DATABASE ${quoteIdentifier(TEST_DB_NAME)}`);
    await waitForDatabaseState(client, TEST_DB_NAME, false);
    console.log(`[test-db] Dropped ephemeral database ${TEST_DB_NAME}`);
  } else if (await databaseExists(client, TEST_DB_NAME)) {
    console.warn(`[test-db] Preserving ${TEST_DB_NAME}: this run's owner role does not own it`);
  }
  await dropOwnedDatabaseRole(client, ownedTestDatabaseRole, TEST_DB_OWNER_COMMENT);
  ownedTestDatabaseRole = null;
}
