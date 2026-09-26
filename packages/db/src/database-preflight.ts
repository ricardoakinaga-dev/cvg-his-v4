import { isIP } from 'node:net';
import { PgTable, getTableConfig } from 'drizzle-orm/pg-core';
import { Pool, type PoolClient } from 'pg';

import { getMigrationFiles } from './migration-files.js';
import { assessMigrationPreflight } from './migration-preflight.js';
import { createAppliedMigrationsQuery, MIGRATIONS_TABLE } from './migration-query.js';
import * as schema from './schema/index.js';

const CONNECTION_TIMEOUT_MS = 3_000;
const QUERY_TIMEOUT_MS = 5_000;

export interface ExpectedDatabaseTable {
  readonly schema: string;
  readonly name: string;
  readonly columns: readonly string[];
}

export interface ActualDatabaseTable {
  readonly schema: string;
  readonly name: string;
  readonly columns: readonly string[];
}

export interface DatabaseSchemaDifferences {
  readonly missingTables: readonly string[];
  readonly missingColumns: readonly string[];
}

export interface DatabasePreflightResult {
  readonly postgresVersion: 16;
  readonly migrationCount: number;
  readonly schemaTableCount: number;
}

export class DatabasePreflightError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DatabasePreflightError';
  }
}

function isLoopbackHost(hostname: string): boolean {
  const normalized = hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (normalized === 'localhost' || normalized === '::1') return true;

  if (isIP(normalized) !== 4) return false;
  return Number(normalized.split('.')[0]) === 127;
}

/** Reject connection strings that can point the driver away from loopback. */
export function validateLoopbackDatabaseUrl(connectionString: string): void {
  let url: URL;
  try {
    url = new URL(connectionString);
  } catch {
    throw new DatabasePreflightError('A valid PostgreSQL connection URL is required.');
  }

  if (url.protocol !== 'postgres:' && url.protocol !== 'postgresql:') {
    throw new DatabasePreflightError('A PostgreSQL connection URL is required.');
  }

  if (!isLoopbackHost(url.hostname)) {
    throw new DatabasePreflightError('Database preflight only accepts loopback destinations.');
  }

  if (url.hash) {
    throw new DatabasePreflightError('PostgreSQL connection URLs cannot contain fragments.');
  }

  const routingOverrides = ['host', 'hostaddr', 'service', 'servicefile', 'port', 'options'];
  if (routingOverrides.some((parameter) => url.searchParams.has(parameter))) {
    throw new DatabasePreflightError(
      'PostgreSQL connection URL contains a host or session override.'
    );
  }
}

export function assertSupportedPostgresVersion(versionNum: number): void {
  if (!Number.isSafeInteger(versionNum) || versionNum < 160_000 || versionNum >= 170_000) {
    throw new DatabasePreflightError('PostgreSQL 16 is required by the local database preflight.');
  }
}

export function getExpectedDatabaseTables(): ExpectedDatabaseTable[] {
  const tables: ExpectedDatabaseTable[] = [];
  for (const value of Object.values(schema)) {
    if (!(value instanceof PgTable)) continue;
    const tableConfig = getTableConfig(value);
    tables.push({
      schema: tableConfig.schema ?? 'public',
      name: tableConfig.name,
      columns: tableConfig.columns.map((column) => column.name)
    });
  }
  return tables;
}

export function compareDatabaseSchema(
  expectedTables: readonly ExpectedDatabaseTable[],
  actualTables: readonly ActualDatabaseTable[]
): DatabaseSchemaDifferences {
  const actualByName = new Map(
    actualTables.map((table) => [`${table.schema}\u0000${table.name}`, new Set(table.columns)])
  );
  const missingTables: string[] = [];
  const missingColumns: string[] = [];

  for (const expected of expectedTables) {
    const key = `${expected.schema}\u0000${expected.name}`;
    const actualColumns = actualByName.get(key);
    if (!actualColumns) {
      missingTables.push(`${expected.schema}.${expected.name}`);
      continue;
    }

    for (const column of expected.columns) {
      if (!actualColumns.has(column)) {
        missingColumns.push(`${expected.schema}.${expected.name}.${column}`);
      }
    }
  }

  return { missingTables, missingColumns };
}

interface CatalogColumnRow {
  readonly tableSchema: string;
  readonly tableName: string;
  readonly columnName: string | null;
}

function groupCatalogColumns(rows: readonly CatalogColumnRow[]): ActualDatabaseTable[] {
  const tables = new Map<string, { schema: string; name: string; columns: string[] }>();
  for (const row of rows) {
    const key = `${row.tableSchema}\u0000${row.tableName}`;
    const table = tables.get(key) ?? {
      schema: row.tableSchema,
      name: row.tableName,
      columns: []
    };
    if (row.columnName !== null) table.columns.push(row.columnName);
    tables.set(key, table);
  }
  return [...tables.values()];
}

/**
 * Check a loopback PostgreSQL instance without changing persistent state.
 * The only database work is a short read-only transaction over catalog rows.
 */
export async function runDatabasePreflight(
  connectionString: string
): Promise<DatabasePreflightResult> {
  validateLoopbackDatabaseUrl(connectionString);

  const expectedTables = getExpectedDatabaseTables();
  const migrations = getMigrationFiles();
  const pool = new Pool({
    connectionString,
    max: 1,
    connectionTimeoutMillis: CONNECTION_TIMEOUT_MS,
    statement_timeout: QUERY_TIMEOUT_MS,
    query_timeout: QUERY_TIMEOUT_MS,
    idleTimeoutMillis: 0,
    allowExitOnIdle: true
  });

  let client: PoolClient | undefined;
  let transactionOpen = false;

  try {
    client = await pool.connect();
    await client.query('BEGIN READ ONLY');
    transactionOpen = true;

    const versionResult = await client.query<{ server_version_num: string }>(
      "SELECT current_setting('server_version_num') AS server_version_num"
    );
    const serverVersionNum = Number(versionResult.rows[0]?.server_version_num);
    assertSupportedPostgresVersion(serverVersionNum);

    const ledgerResult = await client.query<{
      ledgerPresent: boolean;
      schemaName: string | null;
    }>(
      `SELECT to_regclass(format('%I.%I', current_schema(), $1::text)) IS NOT NULL AS "ledgerPresent",
               current_schema() AS "schemaName"`,
      [MIGRATIONS_TABLE]
    );
    const migrationSchema = ledgerResult.rows[0]?.schemaName;
    if (!ledgerResult.rows[0]?.ledgerPresent || !migrationSchema) {
      throw new DatabasePreflightError(
        'The migration ledger is missing; preflight never creates or applies migrations.'
      );
    }

    let appliedMigrations: Array<{ migrationName: string; hash: string }> = [];
    let assessment: ReturnType<typeof assessMigrationPreflight>;
    try {
      const appliedResult = await client.query<{ migrationName: string; hash: string }>(
        createAppliedMigrationsQuery(migrationSchema)
      );
      appliedMigrations = appliedResult.rows;
      assessment = assessMigrationPreflight({
        postgresVersionNum: serverVersionNum,
        migrationLedgerPresent: true,
        localMigrations: migrations,
        appliedMigrations
      });
    } catch {
      throw new DatabasePreflightError(
        'The migration ledger does not match this release or contains unknown migrations.'
      );
    }

    if (assessment.status !== 'ready') {
      const pendingCount = assessment.pendingMigrationNames.length;
      throw new DatabasePreflightError(
        `${pendingCount} release migration(s) are pending; preflight never applies them.`
      );
    }

    const schemaNames = [...new Set(expectedTables.map((table) => table.schema))];
    const tableNames = [...new Set(expectedTables.map((table) => table.name))];
    const columnsResult = await client.query<CatalogColumnRow>(
      `SELECT namespaces.nspname AS "tableSchema",
              tables.relname AS "tableName",
              columns.attname AS "columnName"
         FROM pg_catalog.pg_class AS tables
         JOIN pg_catalog.pg_namespace AS namespaces ON namespaces.oid = tables.relnamespace
         LEFT JOIN pg_catalog.pg_attribute AS columns
           ON columns.attrelid = tables.oid
          AND columns.attnum > 0
          AND NOT columns.attisdropped
        WHERE tables.relkind IN ('r', 'p')
          AND namespaces.nspname = ANY($1::text[])
          AND tables.relname = ANY($2::text[])
        ORDER BY namespaces.nspname, tables.relname, columns.attnum`,
      [schemaNames, tableNames]
    );
    const differences = compareDatabaseSchema(
      expectedTables,
      groupCatalogColumns(columnsResult.rows)
    );
    if (differences.missingTables.length > 0 || differences.missingColumns.length > 0) {
      const examples = [
        ...differences.missingTables.slice(0, 5),
        ...differences.missingColumns.slice(0, 5)
      ];
      const remaining =
        differences.missingTables.length
        + differences.missingColumns.length
        - examples.length;
      throw new DatabasePreflightError(
        `Drizzle schema is missing ${examples.join(', ')}${remaining > 0 ? ` and ${remaining} more` : ''}.`
      );
    }

    await client.query('COMMIT');
    transactionOpen = false;
    return {
      postgresVersion: 16,
      migrationCount: migrations.length,
      schemaTableCount: expectedTables.length
    };
  } catch (error) {
    if (error instanceof DatabasePreflightError) throw error;
    throw new DatabasePreflightError(
      'Could not complete the bounded read-only database check; connection details were omitted.'
    );
  } finally {
    if (client) {
      if (transactionOpen) await client.query('ROLLBACK').catch(() => undefined);
      client.release();
    }
    await pool.end().catch(() => undefined);
  }
}
