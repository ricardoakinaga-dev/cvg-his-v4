import { getTableColumns, getTableName } from 'drizzle-orm';
import type { Table } from 'drizzle-orm';
import { Pool } from 'pg';
import { describe, expect, it } from 'vitest';

import * as canonicalSchema from './schema/index.js';

interface DeclaredTable {
  readonly exportName: string;
  readonly tableName: string;
  readonly columnNames: readonly string[];
}

function collectDeclaredTables(): readonly DeclaredTable[] {
  const tables: DeclaredTable[] = [];

  for (const [exportName, candidate] of Object.entries(canonicalSchema)) {
    try {
      const table = candidate as Table;
      const tableName = getTableName(table);
      const columnNames = Object.values(getTableColumns(table))
        .map((column) => column.name)
        .sort();

      if (tableName && columnNames.length > 0) {
        tables.push({ exportName, tableName, columnNames });
      }
    } catch {
      // Enums and helper exports are intentionally not relational tables.
    }
  }

  return tables.sort((left, right) => left.tableName.localeCompare(right.tableName));
}

describe('canonical Drizzle schema parity', () => {
  it('materializes every declared table and column in PostgreSQL', async () => {
    const declaredTables = collectDeclaredTables();
    expect(declaredTables.length).toBeGreaterThan(60);

    const databaseUrl = process.env.DATABASE_URL_TEST ?? process.env.DATABASE_URL;
    expect(databaseUrl, 'DATABASE_URL_TEST or DATABASE_URL must identify the test database').toBeTruthy();
    const pool = new Pool({ connectionString: databaseUrl, max: 1 });
    const result = await pool
      .query<{
        table_name: string;
        column_name: string;
      }>(
        `SELECT table_name, column_name
         FROM information_schema.columns
         WHERE table_schema = 'public'
         ORDER BY table_name, ordinal_position`
      )
      .finally(async () => pool.end());
    const databaseColumns = new Map<string, Set<string>>();

    for (const row of result.rows) {
      const columns = databaseColumns.get(row.table_name) ?? new Set<string>();
      columns.add(row.column_name);
      databaseColumns.set(row.table_name, columns);
    }

    const drift = declaredTables.flatMap((table) => {
      const persistedColumns = databaseColumns.get(table.tableName);
      if (!persistedColumns) {
        return [`${table.exportName}: table ${table.tableName} is absent`];
      }

      return table.columnNames
        .filter((columnName) => !persistedColumns.has(columnName))
        .map(
          (columnName) =>
            `${table.exportName}: column ${table.tableName}.${columnName} is absent`
        );
    });

    expect(drift).toEqual([]);
  });
});
