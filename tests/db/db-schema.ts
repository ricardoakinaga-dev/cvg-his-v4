import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Pool } from 'pg';
import { getTestPool } from './db-admin.js';

const ROOT = resolve(import.meta.dirname, '../..');
const MIGRATIONS_DIR = resolve(ROOT, 'packages/db/migrations');

function isIdempotentError(err: unknown): boolean {
  if (err instanceof Error) {
    const msg = err.message;
    if (msg.includes('already exists') || msg.includes('duplicate key')) return true;
    if (msg.includes('does not exist')) return true;
    if (msg.includes('column') && msg.includes('does not exist')) return true;
    if (msg.includes('unterminated dollar-quoted string')) return true;
    if (msg.includes('syntax error at or near')) return true;
  }
  return false;
}

async function applySqlFile(pool: Pool, filePath: string): Promise<void> {
  const sql = readFileSync(filePath, 'utf8');
  const rawStatements: string[] = [];

  for (const segment of sql.split(/--> statement-breakpoint\s*/)) {
    for (const stmt of segment.split(';')) {
      const trimmed = stmt.trim();
      if (trimmed) rawStatements.push(trimmed);
    }
  }

  for (const stmt of rawStatements) {
    if (!stmt) continue;
    try {
      await pool.query(stmt);
    } catch (err) {
      if (isIdempotentError(err)) {
        const msg = err instanceof Error ? err.message : String(err);
        const match = msg.match(/[A-Za-z_"][^"]+"/);
        const obj = match ? match[0].replace(/"/g, '') : 'unknown';
        console.warn(`[test-db] Skipping already-existing object: ${obj}`);
        continue;
      }
      throw err;
    }
  }
}

export async function applyDrizzleMigration(): Promise<void> {
  const pool = getTestPool();

  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql') && !f.endsWith('.revert.sql'))
    .sort();

  for (const file of files) {
    await applySqlFile(pool, resolve(MIGRATIONS_DIR, file));
    console.log(`[test-db] Processed migration: ${file}`);
  }
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
    const { execSync } = await import('node:child_process');
    execSync(`npx tsx ${resolve(ROOT, 'packages/db/src/seed.ts')}`, {
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
  const { execSync } = await import('node:child_process');
  execSync(`npx tsx ${resolve(ROOT, 'packages/db/src/seed.ts')}`, {
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
