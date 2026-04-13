import { readFileSync, readdirSync } from 'node:fs';

import { describe, expect, it } from 'vitest';
import { Pool } from 'pg';

import { TEST_DB_URL } from '../setup/env.ts';

describe('Deploy and Migration Contracts', () => {
  it('cutover script applies the canonical migration before starting application services', () => {
    const cutoverScript = readFileSync('infra/scripts/cutover-v2.sh', 'utf8');

    const migrateCall = 'DATABASE_URL="$db_url" npx tsx packages/db/src/migrate.ts';
    const startAppsCall = 'docker_compose up -d cvg-his-v2-api cvg-his-v2-worker cvg-his-v2-spa';

    expect(cutoverScript).toContain(migrateCall);
    expect(cutoverScript).toContain(startAppsCall);
    expect(cutoverScript.indexOf(migrateCall)).toBeGreaterThan(-1);
    expect(cutoverScript.indexOf(startAppsCall)).toBeGreaterThan(-1);
    expect(cutoverScript.indexOf(migrateCall)).toBeLessThan(cutoverScript.indexOf(startAppsCall));
  });

  it('test bootstrap uses the same canonical migrate-then-seed order', () => {
    const globalSetup = readFileSync('tests/setup/global-setup.ts', 'utf8');

    const migrateCall = 'await applyDrizzleMigration();';
    const seedCall = 'await applySeed();';

    expect(globalSetup).toContain(migrateCall);
    expect(globalSetup).toContain(seedCall);
    expect(globalSetup.indexOf(migrateCall)).toBeLessThan(globalSetup.indexOf(seedCall));
  });

  it('database records every official migration file in drizzle_migrations', async () => {
    const migrationFiles = readdirSync('packages/db/migrations')
      .filter((file) => file.endsWith('.sql') && !file.endsWith('.revert.sql'))
      .map((file) => file.replace(/\.sql$/, ''))
      .sort();

    const pool = new Pool({ connectionString: TEST_DB_URL, max: 1 });

    try {
      const result = await pool.query<{ migration_name: string }>(
        'SELECT migration_name FROM drizzle_migrations ORDER BY migration_name ASC'
      );

      const applied = result.rows.map((row) => row.migration_name).sort();
      expect(applied).toEqual(migrationFiles);
    } finally {
      await pool.end();
    }
  });
});
