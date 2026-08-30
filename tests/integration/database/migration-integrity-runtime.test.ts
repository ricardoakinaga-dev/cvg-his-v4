import { expect, it } from 'vitest';

import { runMigrations } from '../../../packages/db/src/migrate.ts';
import { getTestPool } from '../../db/db-admin.js';

it('fails before applying when a database migration checksum was edited', async () => {
  const pool = getTestPool();
  const original = await pool.query<{ migration_name: string; hash: string }>(
    `SELECT migration_name, hash
       FROM drizzle_migrations
      ORDER BY id ASC
      LIMIT 1`
  );
  const migration = original.rows[0];
  expect(migration).toBeDefined();
  if (!migration) return;

  const replacementHash = migration.hash === 'a'.repeat(64) ? 'b'.repeat(64) : 'a'.repeat(64);
  const countBefore = await pool.query<{ count: string }>(
    'SELECT COUNT(*)::text AS count FROM drizzle_migrations'
  );

  await pool.query(
    'UPDATE drizzle_migrations SET hash = $1 WHERE migration_name = $2',
    [replacementHash, migration.migration_name]
  );
  try {
    await expect(runMigrations()).rejects.toThrow(
      new RegExp(`checksum mismatch.*${migration.migration_name}.*expected=.*recorded=`)
    );
    const countAfter = await pool.query<{ count: string }>(
      'SELECT COUNT(*)::text AS count FROM drizzle_migrations'
    );
    expect(countAfter.rows[0]?.count).toBe(countBefore.rows[0]?.count);
  } finally {
    await pool.query(
      'UPDATE drizzle_migrations SET hash = $1 WHERE migration_name = $2',
      [migration.hash, migration.migration_name]
    );
  }
});
