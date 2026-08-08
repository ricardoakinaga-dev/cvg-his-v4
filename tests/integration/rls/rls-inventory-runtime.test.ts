import { randomUUID } from 'node:crypto';

import { getTestPool } from '../../db/db-admin.js';
import { activateRlsRole } from '../../helpers/rls-helpers.js';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';
const ACCOUNT_A = randomUUID();
const ACCOUNT_B = randomUUID();
const ITEM_A = `inv_${randomUUID()}`;
const ITEM_B = `inv_${randomUUID()}`;

const INVENTORY_TABLES = [
  'inventory_items',
  'inventory_consumptions',
  'inventory_stock_movements'
] as const;

beforeAll(async () => {
  const pool = getTestPool();
  await pool.query(
    `INSERT INTO accounts (id, tenant_id, slug, name)
     VALUES ($1, $3, $4, 'Inventory Account A'),
            ($2, $3, $5, 'Inventory Account B')`,
    [ACCOUNT_A, ACCOUNT_B, TENANT_ID, `inventory-a-${ACCOUNT_A}`, `inventory-b-${ACCOUNT_B}`]
  );
  await pool.query(
    `INSERT INTO inventory_items (
       id, account_id, sku, name, unit, on_hand_quantity, reorder_level, unit_cost_amount
     ) VALUES
       ($1, $2, 'SKU-A', 'Item A', 'un', 10, 2, 5),
       ($3, $4, 'SKU-B', 'Item B', 'un', 20, 3, 7)`,
    [ITEM_A, ACCOUNT_A, ITEM_B, ACCOUNT_B]
  );
  await pool.query(
    `INSERT INTO inventory_consumptions (
       id, account_id, inventory_item_id, encounter_id, patient_id, quantity,
       unit, cost_amount, source_entity_type, recorded_by_user_id
     ) VALUES
       ($1, $2, $3, 'enc-a', 'patient-a', 1, 'un', 5, 'encounter', 'user-a'),
       ($4, $5, $6, 'enc-b', 'patient-b', 1, 'un', 7, 'encounter', 'user-b')`,
    [`cons_${randomUUID()}`, ACCOUNT_A, ITEM_A, `cons_${randomUUID()}`, ACCOUNT_B, ITEM_B]
  );
  await pool.query(
    `INSERT INTO inventory_stock_movements (
       id, account_id, inventory_item_id, movement_type, quantity_delta,
       balance_before, balance_after, unit_cost_amount, reason, recorded_by_user_id
     ) VALUES
       ($1, $2, $3, 'consumption', -1, 10, 9, 5, 'Test A', 'user-a'),
       ($4, $5, $6, 'consumption', -1, 20, 19, 7, 'Test B', 'user-b')`,
    [`stockmov_${randomUUID()}`, ACCOUNT_A, ITEM_A, `stockmov_${randomUUID()}`, ACCOUNT_B, ITEM_B]
  );
});

describe('inventory runtime RLS', () => {
  it('enables tenant policies on all runtime inventory tables', async () => {
    const tables = await getTestPool().query<{ tablename: string; rowsecurity: boolean }>(
      `SELECT tablename, rowsecurity
       FROM pg_tables
       WHERE schemaname = 'public' AND tablename = ANY($1::text[])`,
      [INVENTORY_TABLES]
    );
    expect(tables.rows).toHaveLength(INVENTORY_TABLES.length);
    expect(tables.rows.every((row) => row.rowsecurity)).toBe(true);

    const policies = await getTestPool().query<{ tablename: string }>(
      `SELECT DISTINCT tablename
       FROM pg_policies
       WHERE schemaname = 'public' AND tablename = ANY($1::text[])`,
      [INVENTORY_TABLES]
    );
    expect(new Set(policies.rows.map((row) => row.tablename))).toEqual(
      new Set(INVENTORY_TABLES)
    );
  });

  it('shows only the active account through the restricted role', async () => {
    const client = await getTestPool().connect();
    try {
      await client.query('BEGIN');
      await activateRlsRole(client);
      await client.query("SELECT set_config('app.current_account_id', $1, true)", [ACCOUNT_A]);

      for (const table of INVENTORY_TABLES) {
        const result = await client.query<{ account_id: string }>(
          `SELECT account_id FROM ${table}`
        );
        expect(result.rows).toHaveLength(1);
        expect(result.rows[0]?.account_id).toBe(ACCOUNT_A);
      }
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  });

  it('rejects cross-account item references even when account_id matches the active tenant', async () => {
    const client = await getTestPool().connect();
    try {
      await client.query('BEGIN');
      await activateRlsRole(client);
      await client.query("SELECT set_config('app.current_account_id', $1, true)", [ACCOUNT_A]);

      await expect(
        client.query(
          `INSERT INTO inventory_consumptions (
             id, account_id, inventory_item_id, encounter_id, patient_id, quantity,
             unit, cost_amount, source_entity_type, recorded_by_user_id
           ) VALUES ($1, $2, $3, 'enc-x', 'patient-x', 1, 'un', 1, 'other', 'user-x')`,
          [`cons_${randomUUID()}`, ACCOUNT_A, ITEM_B]
        )
      ).rejects.toThrow();
      await client.query('ROLLBACK');

      await client.query('BEGIN');
      await activateRlsRole(client);
      await client.query("SELECT set_config('app.current_account_id', $1, true)", [ACCOUNT_A]);
      await expect(
        client.query(
          `INSERT INTO inventory_stock_movements (
             id, account_id, inventory_item_id, movement_type, quantity_delta,
             balance_before, balance_after, unit_cost_amount, reason, recorded_by_user_id
           ) VALUES ($1, $2, $3, 'adjustment', 1, 0, 1, 1, 'Cross account', 'user-x')`,
          [`stockmov_${randomUUID()}`, ACCOUNT_A, ITEM_B]
        )
      ).rejects.toThrow();
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  });
});
