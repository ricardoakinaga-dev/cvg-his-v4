import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PoolClient } from 'pg';

import { closeDbConnection, pool } from './connection.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsFolder = resolve(__dirname, '../migrations');
const MIGRATIONS_TABLE = 'drizzle_migrations';
const OPTIONAL_RLS_TABLES = [
  'counter_sales',
  'counter_sale_items',
  'counter_sale_payments',
  'quotes',
  'quote_items',
  'access_teams',
  'access_sectors'
];

interface MigrationFile {
  name: string;
  path: string;
  checksum: string;
}

function getMigrationFiles(): MigrationFile[] {
  return readdirSync(migrationsFolder)
    .filter(
      (file) =>
        file.endsWith('.sql') &&
        !file.endsWith('.revert.sql') &&
        !file.endsWith('.seed.sql')
    )
    .sort()
    .map((file) => {
      const path = resolve(migrationsFolder, file);
      const sql = readFileSync(path, 'utf8');
      return {
        name: file.replace(/\.sql$/, ''),
        path,
        checksum: createHash('sha256').update(sql).digest('hex')
      };
    });
}

async function ensureMigrationsTable(client: PoolClient): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      id integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      migration_name text NOT NULL UNIQUE,
      hash text NOT NULL,
      created_at bigint NOT NULL
    )
  `);
}

async function getAppliedMigrations(client: PoolClient): Promise<Set<string>> {
  const result = await client.query<{ migration_name: string }>(
    `SELECT migration_name FROM ${MIGRATIONS_TABLE} ORDER BY id ASC`
  );
  return new Set(result.rows.map((row) => row.migration_name));
}

function splitSqlStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = '';
  let singleQuote = false;
  let doubleQuote = false;
  let lineComment = false;
  let blockComment = false;
  let dollarTag: string | null = null;

  for (let index = 0; index < sql.length; index += 1) {
    const char = sql[index];
    const next = sql[index + 1] ?? '';

    if (lineComment) {
      current += char;
      if (char === '\n') {
        lineComment = false;
      }
      continue;
    }

    if (blockComment) {
      current += char;
      if (char === '*' && next === '/') {
        current += next;
        index += 1;
        blockComment = false;
      }
      continue;
    }

    if (!singleQuote && !doubleQuote && !dollarTag && char === '-' && next === '-') {
      lineComment = true;
      current += char + next;
      index += 1;
      continue;
    }

    if (!singleQuote && !doubleQuote && !dollarTag && char === '/' && next === '*') {
      blockComment = true;
      current += char + next;
      index += 1;
      continue;
    }

    if (!singleQuote && !doubleQuote && char === '$') {
      const remainder = sql.slice(index);
      const match = remainder.match(/^\$[A-Za-z0-9_]*\$/);
      if (match) {
        const tag = match[0];
        current += tag;
        index += tag.length - 1;
        if (dollarTag === tag) {
          dollarTag = null;
        } else if (!dollarTag) {
          dollarTag = tag;
        }
        continue;
      }
    }

    if (!doubleQuote && !dollarTag && char === "'" && sql[index - 1] !== '\\') {
      singleQuote = !singleQuote;
      current += char;
      continue;
    }

    if (!singleQuote && !dollarTag && char === '"' && sql[index - 1] !== '\\') {
      doubleQuote = !doubleQuote;
      current += char;
      continue;
    }

    if (!singleQuote && !doubleQuote && !dollarTag && char === ';') {
      const statement = current.trim();
      if (statement) {
        statements.push(statement);
      }
      current = '';
      continue;
    }

    current += char;
  }

  const trailing = current.trim();
  if (trailing) {
    statements.push(trailing);
  }

  return statements;
}

function shouldIgnoreStatementError(statement: string, error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  if (!/relation ".*" does not exist/i.test(message)) {
    return false;
  }

  return OPTIONAL_RLS_TABLES.some((table) => statement.includes(table));
}

async function applyMigration(client: PoolClient, file: MigrationFile): Promise<void> {
  const sql = readFileSync(file.path, 'utf8');
  const statements = splitSqlStatements(sql);

  await client.query('BEGIN');
  try {
    for (const statement of statements) {
      await client.query('SAVEPOINT migration_statement');
      try {
        await client.query(statement);
        await client.query('RELEASE SAVEPOINT migration_statement');
      } catch (error) {
        if (shouldIgnoreStatementError(statement, error)) {
          await client.query('ROLLBACK TO SAVEPOINT migration_statement');
          await client.query('RELEASE SAVEPOINT migration_statement');
          console.warn(`Skipping optional statement in ${file.name}: ${statement.split('\n')[0]}`);
          continue;
        }
        throw error;
      }
    }

    await client.query(
      `INSERT INTO ${MIGRATIONS_TABLE} (migration_name, hash, created_at) VALUES ($1, $2, $3)
       ON CONFLICT (migration_name) DO NOTHING`,
      [file.name, file.checksum, Date.now()]
    );
    await client.query('COMMIT');
    console.info(`Applied migration ${file.name}.`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

export async function runMigrations(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("SELECT pg_advisory_lock(hashtext('cvg-his-v2:migrations'))");
    await ensureMigrationsTable(client);
    const files = getMigrationFiles();
    const appliedMigrations = await getAppliedMigrations(client);

    for (const file of files) {
      if (appliedMigrations.has(file.name)) {
        console.info(`Skipping already applied migration ${file.name}.`);
        continue;
      }

      await applyMigration(client, file);
    }

    console.info('Migrations applied successfully.');
  } finally {
    await client.query("SELECT pg_advisory_unlock(hashtext('cvg-his-v2:migrations'))").catch(() => undefined);
    client.release();
    await closeDbConnection();
  }
}

if (import.meta.url === new URL(process.argv[1], 'file://').href) {
  void runMigrations().catch((error) => {
    console.error('Failed to run migrations.', error);
    process.exitCode = 1;
  });
}
