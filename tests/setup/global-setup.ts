import { ensureTestDatabase, resetTestDatabase, closePools } from '../db/db-admin.js';
import { applyDrizzleMigration, applySeed } from '../db/db-schema.js';
import { verifyIntegrity } from '../db/db-integrity.js';

export default async function globalSetup() {
  console.log('[test-setup] Initializing test environment...');

  try {
    await ensureTestDatabase();
    await resetTestDatabase();
    console.log('[test-setup] Test database reset');

    await applyDrizzleMigration();
    console.log('[test-setup] Migrations applied');

    await applySeed();
    console.log('[test-setup] Seed applied');

    const { ok, issues, stats } = await verifyIntegrity();
    console.log(
      `[test-setup] Schema: ${stats.tables} tables, ${stats.enums} enums, ${stats.fks} FKs`
    );

    if (!ok) {
      console.warn('[test-setup] Integrity issues:', issues);
    }
  } catch (error) {
    console.warn(
      '[test-setup] Database not available, skipping DB-dependent setup:',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

export async function globalTeardown() {
  console.log('[test-teardown] Cleaning up...');
  await closePools();
  console.log('[test-teardown] Done');
}
