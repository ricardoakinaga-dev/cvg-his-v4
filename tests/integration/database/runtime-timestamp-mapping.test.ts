import { afterAll, describe, expect, it } from 'vitest';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { is, sql } from 'drizzle-orm';
import { PgTable, getTableConfig } from 'drizzle-orm/pg-core';
import * as schema from '../../../packages/shared/database/src/schemas/index';
import { TEST_DB_URL } from '../../setup/env';

const pool = new Pool({ connectionString: TEST_DB_URL });
afterAll(() => pool.end());

describe('Runtime timestamp mapping against the canonical PostgreSQL catalog', () => {
  it('selects appointments using only columns present in the canonical database', async () => {
    const rows = await drizzle(pool).select().from(schema.appointments).where(sql`false`);
    expect(rows).toEqual([]);
  });

  it('does not declare timestamp columns absent from the canonical database', async () => {
    const { rows } = await pool.query<{ table_name: string; column_name: string }>(
      "SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public'"
    );
    const catalog = new Set(rows.map((row) => `${row.table_name}.${row.column_name}`));
    for (const value of Object.values(schema)) {
      if (!is(value, PgTable)) continue;
      const table = getTableConfig(value);
      for (const column of table.columns) {
        if (!column.getSQLType().startsWith('timestamp')) continue;
        expect(catalog.has(`${table.name}.${column.name}`), `${table.name}.${column.name}`).toBe(true);
      }
    }
  });

  it('uses timezone-aware decoders for every existing timestamptz column', async () => {
    const { rows } = await pool.query<{ table_name: string; column_name: string }>(
      "SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public' AND data_type = 'timestamp with time zone'"
    );
    const catalog = new Set(rows.map((row) => `${row.table_name}.${row.column_name}`));
    let checked = 0;
    for (const value of Object.values(schema)) {
      if (!is(value, PgTable)) continue;
      const table = getTableConfig(value);
      for (const column of table.columns) {
        if (!catalog.has(`${table.name}.${column.name}`)) continue;
        expect(column.getSQLType(), `${table.name}.${column.name}`).toBe('timestamp with time zone');
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThanOrEqual(91);
  });

  for (const timezone of ['UTC', 'America/Sao_Paulo', 'Asia/Tokyo']) {
    it(`preserves clinical instants when PostgreSQL reports offsets in ${timezone}`, async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        await client.query("SELECT set_config('TimeZone', $1, true)", [timezone]);
        const database = drizzle(client);
        const instant = '2024-02-29T23:59:59.123Z';
        const fields = Object.fromEntries(
          Object.entries(schema).flatMap(([name, value]) => {
            if (!is(value, PgTable)) return [];
            return getTableConfig(value).columns
              .filter((column) => column.getSQLType() === 'timestamp with time zone')
              .map((column) => [
                `${name}_${column.name}`,
                sql`${instant}::timestamptz`.mapWith(column)
              ]);
          })
        );
        const [row] = await database.select(fields).from(sql`(SELECT 1) AS fixture`);
        expect(Object.keys(row).length).toBeGreaterThanOrEqual(91);
        for (const [column, value] of Object.entries(row)) {
          expect(value, column).toBeInstanceOf(Date);
          expect((value as Date).toISOString(), column).toBe(instant);
        }
      } finally {
        await client.query('ROLLBACK');
        client.release();
      }
    });
  }
});
