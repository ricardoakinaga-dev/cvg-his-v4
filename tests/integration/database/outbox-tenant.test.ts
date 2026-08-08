import { Pool, type PoolClient } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { activateRlsRole, setAccountContext } from '../../helpers/rls-helpers.js';
import { TEST_DB_URL } from '../../setup/env.js';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';
const ACCOUNT_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const ACCOUNT_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

describe('outbox tenant isolation', () => {
  let pool: Pool;
  let adminClient: PoolClient;

  beforeAll(async () => {
    pool = new Pool({ connectionString: TEST_DB_URL });
    adminClient = await pool.connect();
    await adminClient.query(
      `INSERT INTO tenants (id, slug, name, status)
       VALUES ($1, 'outbox-test-tenant', 'Outbox Test Tenant', 'active')
       ON CONFLICT (id) DO NOTHING`,
      [TENANT_ID]
    );
    await adminClient.query(
      `INSERT INTO accounts (id, tenant_id, slug, name)
       VALUES ($1, $3, 'outbox-account-a', 'Outbox Account A'),
              ($2, $3, 'outbox-account-b', 'Outbox Account B')
       ON CONFLICT (id) DO NOTHING`,
      [ACCOUNT_A, ACCOUNT_B, TENANT_ID]
    );
  });

  afterAll(async () => {
    adminClient.release();
    await pool.end();
  });

  it('requires account_id and enables an RLS policy', async () => {
    const column = await adminClient.query(
      `SELECT is_nullable
       FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name = 'outbox_events'
         AND column_name = 'account_id'`
    );
    const table = await adminClient.query(
      `SELECT rowsecurity
       FROM pg_tables
       WHERE schemaname = 'public' AND tablename = 'outbox_events'`
    );
    const policy = await adminClient.query(
      `SELECT policyname
       FROM pg_policies
       WHERE schemaname = 'public' AND tablename = 'outbox_events'`
    );

    expect(column.rows).toEqual([{ is_nullable: 'NO' }]);
    expect(table.rows[0]?.rowsecurity).toBe(true);
    expect(policy.rows.map((row) => row.policyname)).toContain('outbox_events_tenant_isolation');
  });

  it('prevents one account from reading another account event', async () => {
    await adminClient.query(
      `INSERT INTO outbox_events
         (id, account_id, correlation_id, module_name, event_type, payload, status,
          attempts, max_attempts, scheduled_at, created_at)
       VALUES
         ('outbox-a', $1, 'corr-a', 'billing', 'billing.a', '{}', 'pending', 0, 3, now(), now()),
         ('outbox-b', $2, 'corr-b', 'billing', 'billing.b', '{}', 'pending', 0, 3, now(), now())
       ON CONFLICT (id) DO UPDATE SET account_id = EXCLUDED.account_id`,
      [ACCOUNT_A, ACCOUNT_B]
    );

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await activateRlsRole(client);
      await setAccountContext(client, ACCOUNT_A);
      const visible = await client.query(
        `SELECT id, account_id::text
         FROM outbox_events
         WHERE id IN ('outbox-a', 'outbox-b')
         ORDER BY id`
      );

      expect(visible.rows).toEqual([{ id: 'outbox-a', account_id: ACCOUNT_A }]);
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  });
});
