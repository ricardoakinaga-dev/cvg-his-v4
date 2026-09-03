import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { getTestPool } from './db-admin.js';
import { runTsxFileSync } from '../helpers/run-tsx-file.js';

const ROOT = resolve(import.meta.dirname, '../..');
const MIGRATE_SCRIPT = resolve(ROOT, 'packages/db/src/migrate.ts');

export async function applyDrizzleMigration(): Promise<void> {
  runTsxFileSync(MIGRATE_SCRIPT, [], {
    env: {
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL_TEST || process.env.DATABASE_URL
    },
    stdio: 'inherit'
  });
}

export async function applySeed(): Promise<void> {
  const pool = getTestPool();
  const seedPath = resolve(ROOT, 'packages/db/dist/seed.js');

  let seedContent: string;
  try {
    seedContent = readFileSync(seedPath, 'utf8');
  } catch {
    console.warn(
      '[test-db] packages/db/dist/seed.js not found. Run `pnpm --filter @cvg-his/db build` first.'
    );
    console.warn('[test-db] Attempting to run seed via tsx as fallback...');
    runTsxFileSync(resolve(ROOT, 'packages/db/src/seed.ts'), [], {
      env: {
        ...process.env,
        DATABASE_URL: process.env.DATABASE_URL_TEST || process.env.DATABASE_URL
      },
      stdio: 'inherit'
    });
    return;
  }

  console.log(
    '[test-db] Seed will be applied via compiled dist. If roles/permissions are misaligned, see docs/705.'
  );
  runTsxFileSync(resolve(ROOT, 'packages/db/src/seed.ts'), [], {
    env: {
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL_TEST || process.env.DATABASE_URL
    },
    stdio: 'inherit'
  });
}

export async function truncateAll(): Promise<void> {
  const pool = getTestPool();
  const { rows } = await pool.query(`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename NOT IN ('drizzle_migrations', 'drizzle_migrations_meta')
  `);

  if (rows.length === 0) return;

  const tables = rows.map((r: { tablename: string }) => r.tablename).join(', ');
  await pool.query(`TRUNCATE ${tables} RESTART IDENTITY CASCADE`);
  console.log(`[test-db] Truncated ${rows.length} tables`);
}

export async function verifySchema(): Promise<{ tables: number; enums: number; fks: number }> {
  const pool = getTestPool();

  const tablesResult = await pool.query(`
    SELECT COUNT(*)::int FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  `);
  const tables = tablesResult.rows[0].count;

  const enumsResult = await pool.query(`
    SELECT COUNT(DISTINCT t.typname)::int
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typtype = 'e'
  `);
  const enums = enumsResult.rows[0].count;

  const fksResult = await pool.query(`
    SELECT COUNT(*)::int FROM information_schema.table_constraints
    WHERE constraint_schema = 'public' AND constraint_type = 'FOREIGN KEY'
  `);
  const fks = fksResult.rows[0].count;

  return { tables, enums, fks };
}
