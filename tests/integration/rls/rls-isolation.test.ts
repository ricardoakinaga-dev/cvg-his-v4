import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Pool, type PoolClient } from 'pg';
import { TEST_DB_URL } from '../../setup/env.js';
import { activateRlsRole, setAccountContext } from '../../helpers/rls-helpers.js';

describe('RLS Integration Tests', () => {
  let pool: Pool;
  let adminClient: PoolClient;

  const ACCOUNT_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const ACCOUNT_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  const DEFAULT_TENANT = '00000000-0000-0000-0000-000000000001';
  const OWNER_A = '11111111-1111-4111-8111-111111111111';
  const OWNER_B = '22222222-2222-4222-8222-222222222222';
  const OWNER_UPDATE_A = '33333333-3333-4333-8333-333333333333';
  const OWNER_UPDATE_B = '44444444-4444-4444-8444-444444444444';

  beforeAll(async () => {
    pool = new Pool({ connectionString: TEST_DB_URL });
    adminClient = await pool.connect();

    // Setup: ensure test accounts exist
    await adminClient.query(
      `
      INSERT INTO tenants (id, slug, name, status)
      VALUES ($1, 'test-tenant-a', 'Test Tenant A', 'active')
      ON CONFLICT (id) DO NOTHING
    `,
      [DEFAULT_TENANT]
    );

    await adminClient.query(
      `
      INSERT INTO accounts (id, tenant_id, slug, name)
      VALUES ($1, $2, 'test-a', 'Test Account A'),
             ($3, $2, 'test-b', 'Test Account B')
      ON CONFLICT (id) DO NOTHING
    `,
      [ACCOUNT_A, DEFAULT_TENANT, ACCOUNT_B]
    );
  });

  afterAll(async () => {
    if (adminClient) adminClient.release();
    await pool.end();
  });

  describe('RLS infrastructure', () => {
    it('should have app.current_account_id function', async () => {
      const result = await adminClient.query(`
        SELECT EXISTS (
          SELECT 1 FROM pg_proc
          WHERE proname = 'current_account_id' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'app')
        ) AS exists
      `);
      expect(result.rows[0].exists).toBe(true);
    });

    it('should have app.has_account_context function', async () => {
      const result = await adminClient.query(`
        SELECT EXISTS (
          SELECT 1 FROM pg_proc
          WHERE proname = 'has_account_context' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'app')
        ) AS exists
      `);
      expect(result.rows[0].exists).toBe(true);
    });

    it('should return NULL when no account context is set', async () => {
      await setAccountContext(adminClient, null);
      const result = await adminClient.query('SELECT app.current_account_id() AS account_id');
      expect(result.rows[0].account_id).toBeNull();
    });

    it('should return account_id when context is set', async () => {
      await setAccountContext(adminClient, ACCOUNT_A);
      const result = await adminClient.query('SELECT app.current_account_id() AS account_id');
      expect(result.rows[0].account_id).toBe(ACCOUNT_A);
    });
  });

  describe('RLS on core tables', () => {
    const rlsTables = [
      'owners',
      'patients',
      'encounters',
      'appointments',
      'users',
      'products',
      'services',
      'staff',
      'units',
      'wards',
      'beds',
      'documents',
      'clinical_notes',
      'clinical_note_versions',
      'encounter_documents',
      'encounter_billing_items',
      'encounter_financial_accounts',
      'exam_orders',
      'exam_results',
      'inpatient_stays',
      'medication_orders',
      'payments',
      'cash_registers',
      'cash_movements',
      'counter_sales',
      'quotes',
      'alerts',
      'notifications',
      'protocols',
      'shift_handovers',
      'stock_items',
      'stock_lots',
      'stock_movements',
      'access_teams',
      'access_sectors',
      'triage_records',
      'triage_record_versions',
      'scheduling_queue_entries'
    ];

    it('should have RLS enabled on owners table', async () => {
      const result = await adminClient.query(`
        SELECT rowsecurity FROM pg_tables
        WHERE schemaname = 'public' AND tablename = 'owners'
      `);
      expect(result.rows.length).toBeGreaterThan(0);
      expect(result.rows[0].rowsecurity).toBe(true);
    });

    it('should have policies on owners table', async () => {
      const result = await adminClient.query(`
        SELECT COUNT(*) AS policy_count FROM pg_policies
        WHERE schemaname = 'public' AND tablename = 'owners'
      `);
      expect(parseInt(result.rows[0].policy_count, 10)).toBeGreaterThan(0);
    });

    it('should have RLS enabled on all core tables', async () => {
      for (const table of rlsTables) {
        const result = await adminClient.query(
          `
          SELECT rowsecurity FROM pg_tables
          WHERE schemaname = 'public' AND tablename = $1
        `,
          [table]
        );

        if (result.rows.length === 0) {
          console.warn(`Table ${table} not found in database`);
          continue;
        }

        expect(result.rows[0].rowsecurity).toBe(true);
      }
    });
  });

  describe('Cross-tenant isolation', () => {
    it('should prevent Account A from seeing Account B owners', async () => {
      // Insert test data as admin
      await adminClient.query(
        `
        INSERT INTO owners (id, account_id, full_name)
        VALUES ($3, $1, 'Owner from A'),
               ($4, $2, 'Owner from B')
        ON CONFLICT (id) DO NOTHING
      `,
        [ACCOUNT_A, ACCOUNT_B, OWNER_A, OWNER_B]
      );

      // Set context to Account A
      const clientA = await pool.connect();
      try {
        await clientA.query('BEGIN');
        await activateRlsRole(clientA);
        await setAccountContext(clientA, ACCOUNT_A);

        const result = await clientA.query(
          'SELECT id, full_name FROM owners WHERE account_id = $1',
          [ACCOUNT_B]
        );

        expect(result.rows.length).toBe(0);
        await clientA.query('ROLLBACK');
      } finally {
        clientA.release();
      }
    });

    it('should prevent Account B from seeing Account A owners', async () => {
      const clientB = await pool.connect();
      try {
        await clientB.query('BEGIN');
        await activateRlsRole(clientB);
        await setAccountContext(clientB, ACCOUNT_B);

        const result = await clientB.query(
          'SELECT id, full_name FROM owners WHERE account_id = $1',
          [ACCOUNT_A]
        );

        expect(result.rows.length).toBe(0);
        await clientB.query('ROLLBACK');
      } finally {
        clientB.release();
      }
    });

    it('should allow Account A to see its own owners', async () => {
      const clientA = await pool.connect();
      try {
        await clientA.query('BEGIN');
        await activateRlsRole(clientA);
        await setAccountContext(clientA, ACCOUNT_A);

        const result = await clientA.query(
          'SELECT id, full_name FROM owners WHERE account_id = $1',
          [ACCOUNT_A]
        );

        expect(result.rows.length).toBeGreaterThan(0);
        await clientA.query('ROLLBACK');
      } finally {
        clientA.release();
      }
    });

    it('should prevent INSERT into another account via RLS', async () => {
      const clientA = await pool.connect();
      try {
        await clientA.query('BEGIN');
        await activateRlsRole(clientA);
        await setAccountContext(clientA, ACCOUNT_A);

        // Try to insert data for Account B while context is Account A
        await expect(
          clientA.query('INSERT INTO owners (id, account_id, full_name) VALUES ($1, $2, $3)', [
            '55555555-5555-4555-8555-555555555555',
            ACCOUNT_B,
            'Hacked Owner'
          ])
        ).rejects.toThrow();

        await clientA.query('ROLLBACK');
      } finally {
        clientA.release();
      }
    });

    it('should prevent UPDATE of data belonging to another account', async () => {
      // Insert test data
      await adminClient.query(
        `
        INSERT INTO owners (id, account_id, full_name)
        VALUES ($3, $1, 'Original A'),
               ($4, $2, 'Original B')
        ON CONFLICT (id) DO NOTHING
      `,
        [ACCOUNT_A, ACCOUNT_B, OWNER_UPDATE_A, OWNER_UPDATE_B]
      );

      const clientA = await pool.connect();
      try {
        await clientA.query('BEGIN');
        await activateRlsRole(clientA);
        await setAccountContext(clientA, ACCOUNT_A);

        // Try to update Account B's data
        const result = await clientA.query(
          'UPDATE owners SET full_name = $1 WHERE id = $2 RETURNING id',
          ['Hacked', OWNER_UPDATE_B]
        );

        expect(result.rows.length).toBe(0);
        await clientA.query('ROLLBACK');
      } finally {
        clientA.release();
      }
    });

    it('should prevent DELETE of data belonging to another account', async () => {
      const clientA = await pool.connect();
      try {
        await clientA.query('BEGIN');
        await activateRlsRole(clientA);
        await setAccountContext(clientA, ACCOUNT_A);

        const result = await clientA.query('DELETE FROM owners WHERE id = $1 RETURNING id', [
          OWNER_B
        ]);

        expect(result.rows.length).toBe(0);
        await clientA.query('ROLLBACK');
      } finally {
        clientA.release();
      }
    });
  });

  describe('RLS summary view', () => {
    it('should have rls_status view', async () => {
      const result = await adminClient.query(`
        SELECT EXISTS (
          SELECT 1 FROM pg_views
          WHERE schemaname = 'app' AND viewname = 'rls_status'
        ) AS exists
      `);
      expect(result.rows[0].exists).toBe(true);
    });

    it('should have rls_summary function', async () => {
      const result = await adminClient.query(`
        SELECT EXISTS (
          SELECT 1 FROM pg_proc
          WHERE proname = 'rls_summary' AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'app')
        ) AS exists
      `);
      expect(result.rows[0].exists).toBe(true);
    });
  });
});
