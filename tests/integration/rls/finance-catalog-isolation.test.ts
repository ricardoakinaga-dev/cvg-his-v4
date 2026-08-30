import { describe, expect, it } from 'vitest';

import { getTestPool } from '../../db/db-admin.js';
import { activateRlsRole, setAccountContext } from '../../helpers/rls-helpers.js';

const ACCOUNT_A = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const ACCOUNT_B = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const TENANT_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const EXPENSE_A = 'finance-catalog-isolation-a';
const EXPENSE_B = 'finance-catalog-isolation-b';

describe('finance catalog canonical persistence', () => {
  it('creates both catalog relations with tenant RLS and FORCE RLS', async () => {
    const result = await getTestPool().query<{
      readonly table_name: string;
      readonly rls_enabled: boolean;
      readonly force_rls: boolean;
    }>(`
      SELECT c.relname AS table_name,
             c.relrowsecurity AS rls_enabled,
             c.relforcerowsecurity AS force_rls
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public'
         AND c.relname IN ('finance_cost_centers', 'finance_expense_catalog_items')
       ORDER BY c.relname
    `);

    expect(result.rows).toEqual([
      { table_name: 'finance_cost_centers', rls_enabled: true, force_rls: true },
      { table_name: 'finance_expense_catalog_items', rls_enabled: true, force_rls: true }
    ]);

    const policies = await getTestPool().query<{ readonly tablename: string }>(`
      SELECT tablename
        FROM pg_policies
       WHERE schemaname = 'public'
         AND tablename IN ('finance_cost_centers', 'finance_expense_catalog_items')
       ORDER BY tablename
    `);
    expect(policies.rows).toEqual([
      { tablename: 'finance_cost_centers' },
      { tablename: 'finance_expense_catalog_items' }
    ]);
  });

  it('keeps catalog rows isolated by the active account context', async () => {
    await getTestPool().query(
      `
        INSERT INTO tenants (id, slug, name, status)
        VALUES ($1, $2, 'Finance catalog isolation tenant', 'active')
        ON CONFLICT (id) DO NOTHING
      `,
      [TENANT_ID, `finance-catalog-${TENANT_ID.slice(0, 8)}`]
    );
    await getTestPool().query(
      `
        INSERT INTO accounts (id, tenant_id, slug, name)
        VALUES ($1, $3, $4, 'Finance catalog account A'),
               ($2, $3, $5, 'Finance catalog account B')
        ON CONFLICT (id) DO NOTHING
      `,
      [ACCOUNT_A, ACCOUNT_B, TENANT_ID, 'finance-catalog-a', 'finance-catalog-b']
    );
    await getTestPool().query(
      `
        INSERT INTO finance_cost_centers (account_id, code, name, kind, owner, description)
        VALUES ($1, 'CC-A', 'Centro A', 'Operacional', 'Equipe A', 'Centro A'),
               ($2, 'CC-B', 'Centro B', 'Operacional', 'Equipe B', 'Centro B')
        ON CONFLICT (account_id, code) DO NOTHING
      `,
      [ACCOUNT_A, ACCOUNT_B]
    );
    await getTestPool().query(
      `
        INSERT INTO finance_expense_catalog_items
          (id, account_id, name, kind, category, cost_center_code, cost_center_name, description, created_by_user_id)
        VALUES ($1, $3, 'Registro A', 'Operacional', 'FORNECEDOR', 'CC-A', 'Centro A', 'A', 'system'),
               ($2, $4, 'Registro B', 'Operacional', 'FORNECEDOR', 'CC-B', 'Centro B', 'B', 'system')
        ON CONFLICT (id) DO NOTHING
      `,
      [EXPENSE_A, EXPENSE_B, ACCOUNT_A, ACCOUNT_B]
    );

    const client = await getTestPool().connect();
    try {
      await client.query('BEGIN');
      await activateRlsRole(client);
      await setAccountContext(client, ACCOUNT_A);
      const visible = await client.query<{ readonly id: string }>(
        'SELECT id FROM finance_expense_catalog_items ORDER BY id'
      );
      expect(visible.rows).toEqual([{ id: EXPENSE_A }]);
      const visibleCenters = await client.query<{ readonly code: string }>(
        'SELECT code FROM finance_cost_centers ORDER BY code'
      );
      expect(visibleCenters.rows).toEqual([{ code: 'CC-A' }]);
      await client.query('SAVEPOINT finance_catalog_insert_guard');
      await expect(
        client.query(
          `INSERT INTO finance_expense_catalog_items
             (id, account_id, name, kind, category, cost_center_code, cost_center_name, description, created_by_user_id)
           VALUES ('finance-catalog-cross-tenant', $1, 'Cross tenant', 'Operacional', 'FORNECEDOR', 'CC-B', 'Centro B', 'blocked', 'system')`,
          [ACCOUNT_B]
        )
      ).rejects.toThrow(/row-level security|policy/i);
      await client.query('ROLLBACK TO SAVEPOINT finance_catalog_insert_guard');
      await client.query('SAVEPOINT finance_catalog_update_guard');
      await expect(
        client.query('UPDATE finance_expense_catalog_items SET account_id = $1 WHERE id = $2', [
          ACCOUNT_B,
          EXPENSE_A
        ])
      ).rejects.toThrow(/row-level security|policy/i);
      await client.query('ROLLBACK TO SAVEPOINT finance_catalog_update_guard');
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  });
});
