import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

import {
  ensureTestDatabase,
  closePools,
  dropTestDatabase,
  withTestDatabaseLock,
  withTestClusterSetupLock,
  getAdminPool,
  getTestPool
} from '../db/db-admin.js';
import { applyDrizzleMigration, applySeed } from '../db/db-schema.js';
import { verifyIntegrity } from '../db/db-integrity.js';
import {
  assertDisposableTestDatabaseTarget,
  DEFAULT_TEST_DB_OWNERSHIP_DIRECTORY,
  TEST_DB_IS_EPHEMERAL,
  TEST_DB_NAME,
  TEST_DB_OWNER_COMMENT,
  TEST_DB_OWNER_ROLE,
  TEST_DB_RUN_ID,
  TEST_DB_URL
} from './env.js';
import { RLS_TEST_ROLE } from '../helpers/rls-helpers.js';
import { Pool } from 'pg';

function getOwnershipMarker(): { readonly runId: string; readonly path: string } | null {
  const configuredDirectory = process.env.TEST_DB_OWNERSHIP_DIRECTORY;
  const configuredRunId = process.env.TEST_DB_RUN_ID;
  if (configuredDirectory === undefined && configuredRunId === undefined) {
    if (!TEST_DB_IS_EPHEMERAL) return null;
    const markerName = `${createHash('sha256').update(TEST_DB_NAME).digest('hex')}.json`;
    return {
      runId: TEST_DB_RUN_ID,
      path: join(DEFAULT_TEST_DB_OWNERSHIP_DIRECTORY, markerName)
    };
  }

  const directory = configuredDirectory;
  const runId = configuredRunId;
  if (!directory || !runId || !/^[a-f0-9]{32}$/i.test(runId)) {
    throw new Error('[test-setup] Incomplete or invalid ephemeral database ownership context');
  }

  const markerName = `${createHash('sha256').update(TEST_DB_NAME).digest('hex')}.json`;
  return { runId, path: join(resolve(directory), markerName) };
}

function registerOwnedTestDatabase(ownerRoleName: string, ownerComment: string): void {
  const marker = getOwnershipMarker();
  if (!marker) return;
  if (ownerRoleName !== TEST_DB_OWNER_ROLE || ownerComment !== TEST_DB_OWNER_COMMENT) {
    throw new Error('[test-setup] Refusing to record unexpected ephemeral database ownership');
  }
  const directory = dirname(marker.path);
  const temporaryPath = `${marker.path}.${process.pid}.tmp`;
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  try {
    writeFileSync(
      temporaryPath,
      `${JSON.stringify({
        runId: marker.runId,
        databaseName: TEST_DB_NAME,
        ownerRoleName,
        ownerComment
      })}\n`,
      { flag: 'wx', mode: 0o600 }
    );
    renameSync(temporaryPath, marker.path);
  } catch (error) {
    rmSync(temporaryPath, { force: true });
    throw error;
  }
}

async function removeOwnershipMarker(): Promise<void> {
  const marker = getOwnershipMarker();
  if (!marker) return;
  try {
    const record = JSON.parse(readFileSync(marker.path, 'utf8')) as {
      readonly runId?: unknown;
      readonly databaseName?: unknown;
      readonly ownerRoleName?: unknown;
      readonly ownerComment?: unknown;
    };
    if (
      record.runId !== marker.runId ||
      record.databaseName !== TEST_DB_NAME ||
      record.ownerRoleName !== TEST_DB_OWNER_ROLE ||
      record.ownerComment !== TEST_DB_OWNER_COMMENT
    ) {
      throw new Error(
        '[test-setup] Refusing to remove a database ownership marker from another run'
      );
    }
    await rm(marker.path, { force: true });
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return;
    throw error;
  }
}

async function ensureRlsTestRole(): Promise<void> {
  const adminPool = getAdminPool();
  const testPool = new Pool({ connectionString: TEST_DB_URL, max: 1 });

  try {
    await adminPool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${RLS_TEST_ROLE}') THEN
          EXECUTE 'CREATE ROLE ${RLS_TEST_ROLE} NOLOGIN';
        END IF;
      END
      $$;
    `);

    await adminPool.query(
      `GRANT CONNECT ON DATABASE "${TEST_DB_NAME.replaceAll('"', '""')}" TO ${RLS_TEST_ROLE}`
    );
    await testPool.query(`GRANT USAGE ON SCHEMA public TO ${RLS_TEST_ROLE}`);
    await testPool.query(`GRANT USAGE ON SCHEMA app TO ${RLS_TEST_ROLE}`);
    await testPool.query(
      `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${RLS_TEST_ROLE}`
    );
    await testPool.query(
      `GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${RLS_TEST_ROLE}`
    );
    await testPool.query(`GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA app TO ${RLS_TEST_ROLE}`);
    await testPool.query(
      `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ${RLS_TEST_ROLE}`
    );
    await testPool.query(
      `ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO ${RLS_TEST_ROLE}`
    );
    await testPool.query(
      `ALTER DEFAULT PRIVILEGES IN SCHEMA app GRANT EXECUTE ON FUNCTIONS TO ${RLS_TEST_ROLE}`
    );
  } finally {
    await testPool.end();
  }
}

export default async function globalSetup() {
  console.log('[test-setup] Initializing test environment...');
  const requireTestDb = process.env.REQUIRE_TEST_DB === '1';
  let cleanupRequired = false;

  try {
    if (TEST_DB_IS_EPHEMERAL) {
      // Validate the configured target and ownership context before the
      // advisory-lock helper opens an administrative connection.
      assertDisposableTestDatabaseTarget();
      getOwnershipMarker();
    }

    // Keep every setup path (pool, migrations and seed) on the same resolved
    // database. This matters when test-critical adds a suffix to an explicit
    // DATABASE_URL_TEST so its phases are physically isolated.
    process.env.DATABASE_URL_TEST = TEST_DB_URL;
    process.env.DATABASE_URL = TEST_DB_URL;
    process.env.TEST_DB_URL_RESOLVED = '1';
    console.log(
      `[test-setup] Using test database ${TEST_DB_NAME}${TEST_DB_IS_EPHEMERAL ? ' (ephemeral)' : ''}`
    );

    await withTestDatabaseLock(async () => {
      if (!TEST_DB_IS_EPHEMERAL) {
        const database = await getAdminPool().query(
          'SELECT 1 FROM pg_database WHERE datname = $1',
          [TEST_DB_NAME]
        );
        if (database.rowCount === 0) {
          throw new Error(
            `[test-setup] Explicit database ${TEST_DB_NAME} does not exist; refusing to create it`
          );
        }
        await getTestPool().query('SELECT 1');
        console.log(
          `[test-setup] Preserving explicit database ${TEST_DB_NAME}; skipped reset, migrations, seed and grants`
        );
        return;
      }

      cleanupRequired = true;
      await ensureTestDatabase(registerOwnedTestDatabase);
      console.log('[test-setup] Fresh ephemeral test database created');

      await withTestClusterSetupLock(async () => {
        await applyDrizzleMigration();
        await ensureRlsTestRole();
      });
      console.log('[test-setup] Migrations applied');

      await applySeed();
      console.log('[test-setup] Seed applied');

      console.log('[test-setup] RLS test role ensured');

      const { ok, issues, stats } = await verifyIntegrity();
      console.log(
        `[test-setup] Schema: ${stats.tables} tables, ${stats.enums} enums, ${stats.fks} FKs`
      );

      if (!ok) {
        const message = `[test-setup] Integrity issues: ${issues.join('; ')}`;
        if (requireTestDb) {
          throw new Error(message);
        }
        console.warn(message);
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    let cleanupMessage = '';
    if (cleanupRequired) {
      try {
        await globalTeardown();
        cleanupRequired = false;
      } catch (cleanupError) {
        cleanupMessage = ` Cleanup also failed: ${cleanupError instanceof Error ? cleanupError.message : 'Unknown cleanup error'}.`;
      }
    }
    if (requireTestDb) {
      throw new Error(
        `[test-setup] Database setup failed for DB-required suite: ${message}.${cleanupMessage} Start the isolated test database with pnpm test:db:start or run pnpm test:critical:bootstrap.`
      );
    }
    if (cleanupMessage) throw new Error(`[test-setup] ${cleanupMessage.trim()}`);
    console.warn('[test-setup] Database not available, skipping DB-dependent setup:', message);
  }

  return cleanupRequired ? globalTeardown : undefined;
}

export async function globalTeardown() {
  console.log('[test-teardown] Cleaning up...');
  await closePools();
  await withTestDatabaseLock(async () => {
    await dropTestDatabase();
  });
  await removeOwnershipMarker();
  await closePools();
  console.log('[test-teardown] Done');
}
