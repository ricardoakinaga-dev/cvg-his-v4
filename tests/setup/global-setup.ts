import {
  ensureTestDatabase,
  resetTestDatabase,
  closePools,
  dropTestDatabase,
  withTestDatabaseLock
} from '../db/db-admin.js';
import { applyDrizzleMigration, applySeed } from '../db/db-schema.js';
import { verifyIntegrity } from '../db/db-integrity.js';
import { TEST_DB_IS_EPHEMERAL, TEST_DB_NAME, TEST_DB_URL } from './env.js';
import { getAdminPool } from '../db/db-admin.js';
import { RLS_TEST_ROLE } from '../helpers/rls-helpers.js';
import { Pool } from 'pg';

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
      `GRANT CONNECT ON DATABASE "${new URL(TEST_DB_URL).pathname.slice(1)}" TO ${RLS_TEST_ROLE}`
    );
    await testPool.query(`GRANT USAGE ON SCHEMA public TO ${RLS_TEST_ROLE}`);
    await testPool.query(`GRANT USAGE ON SCHEMA app TO ${RLS_TEST_ROLE}`);
    await testPool.query(
      `GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ${RLS_TEST_ROLE}`
    );
    await testPool.query(`GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ${RLS_TEST_ROLE}`);
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

  try {
    // Keep every setup path (pool, migrations and seed) on the same resolved
    // database. This matters when test-critical adds a suffix to an explicit
    // DATABASE_URL_TEST so its phases are physically isolated.
    process.env.DATABASE_URL_TEST = TEST_DB_URL;
    process.env.DATABASE_URL = TEST_DB_URL;
    console.log(
      `[test-setup] Using test database ${TEST_DB_NAME}${TEST_DB_IS_EPHEMERAL ? ' (ephemeral)' : ''}`
    );

    await withTestDatabaseLock(async () => {
      await ensureTestDatabase();
      await resetTestDatabase();
      console.log('[test-setup] Test database reset');

      await applyDrizzleMigration();
      console.log('[test-setup] Migrations applied');

      await applySeed();
      console.log('[test-setup] Seed applied');

      await ensureRlsTestRole();
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
    if (requireTestDb) {
      throw new Error(
        `[test-setup] Database setup failed for DB-required suite: ${message}. Start the isolated test database with pnpm test:db:start or run pnpm test:critical:bootstrap.`
      );
    }
    console.warn('[test-setup] Database not available, skipping DB-dependent setup:', message);
  }
}

export async function globalTeardown() {
  console.log('[test-teardown] Cleaning up...');
  await closePools();
  await withTestDatabaseLock(async () => {
    await dropTestDatabase();
  });
  await closePools();
  console.log('[test-teardown] Done');
}
