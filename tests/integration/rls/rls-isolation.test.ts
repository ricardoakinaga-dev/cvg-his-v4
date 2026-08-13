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
    it('uses a restricted test role without privilege or ownership bypass', async () => {
      const role = await adminClient.query(
        `SELECT rolsuper, rolbypassrls, rolcreaterole, rolcreatedb
         FROM pg_roles
         WHERE rolname = $1`,
        ['cvg_test_rls']
      );
      const ownership = await adminClient.query(
        `SELECT COUNT(*)::int AS owned_tables
         FROM pg_class c
         JOIN pg_roles r ON r.oid = c.relowner
         JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = 'public' AND c.relkind = 'r' AND r.rolname = $1`,
        ['cvg_test_rls']
      );

      expect(role.rows).toEqual([
        {
          rolsuper: false,
          rolbypassrls: false,
          rolcreaterole: false,
          rolcreatedb: false
        }
      ]);
      expect(ownership.rows[0].owned_tables).toBe(0);
    });

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
      'sessions',
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

    it('protects every materialized account_id table with enabled and forced RLS plus a policy', async () => {
      const result = await adminClient.query<{
        table_name: string;
        rowsecurity: boolean;
        forcerowsecurity: boolean;
        policy_count: number;
      }>(`
        SELECT
          tables.table_name,
          class.relrowsecurity AS rowsecurity,
          class.relforcerowsecurity AS forcerowsecurity,
          COUNT(policies.policyname)::int AS policy_count
        FROM information_schema.tables tables
        JOIN information_schema.columns columns
          ON columns.table_schema = tables.table_schema
         AND columns.table_name = tables.table_name
         AND columns.column_name = 'account_id'
        JOIN pg_namespace namespace ON namespace.nspname = tables.table_schema
        JOIN pg_class class
          ON class.relnamespace = namespace.oid
         AND class.relname = tables.table_name
        LEFT JOIN pg_policies policies
          ON policies.schemaname = tables.table_schema
         AND policies.tablename = tables.table_name
        WHERE tables.table_schema = 'public'
          AND tables.table_type = 'BASE TABLE'
        GROUP BY tables.table_name, class.relrowsecurity, class.relforcerowsecurity
        ORDER BY tables.table_name
      `);

      expect(result.rows.length).toBeGreaterThan(100);
      expect(
        result.rows.filter(
          (row) => !row.rowsecurity || !row.forcerowsecurity || row.policy_count === 0
        )
      ).toEqual([]);
    });

    it('protects relationship tables whose tenant is derived from a parent row', async () => {
      const derivedTenantTables = [
        'access_team_memberships',
        'access_sector_memberships',
        'access_user_permissions',
        'access_team_permissions',
        'access_sector_permissions',
        'counter_sale_items',
        'counter_sale_payments',
        'quote_items',
        'api_key_usage',
        'api_key_rate_limits',
        'encounter_timeline',
        'entry_revisions',
        'mfa_credentials',
        'user_roles',
        'webhook_deliveries'
      ];
      const result = await adminClient.query<{
        table_name: string;
        rowsecurity: boolean;
        forcerowsecurity: boolean;
        policy_count: number;
      }>(
        `SELECT
           class.relname AS table_name,
           class.relrowsecurity AS rowsecurity,
           class.relforcerowsecurity AS forcerowsecurity,
           COUNT(policies.policyname)::int AS policy_count
         FROM pg_class class
         JOIN pg_namespace namespace ON namespace.oid = class.relnamespace
         LEFT JOIN pg_policies policies
           ON policies.schemaname = namespace.nspname
          AND policies.tablename = class.relname
         WHERE namespace.nspname = 'public' AND class.relname = ANY($1::text[])
         GROUP BY class.relname, class.relrowsecurity, class.relforcerowsecurity
         ORDER BY class.relname`,
        [derivedTenantTables]
      );

      expect(result.rows).toHaveLength(derivedTenantTables.length);
      expect(
        result.rows.filter(
          (row) => !row.rowsecurity || !row.forcerowsecurity || row.policy_count === 0
        )
      ).toEqual([]);
    });

    it('keeps the inventory of public tables without RLS explicit', async () => {
      const platformOrReferenceTables = [
        'accounts',
        'cfop_entries',
        'cofins_tables',
        'drizzle_migrations',
        'ibs_cbs_tables',
        'icms_rules',
        'icms_tables',
        'ipi_tables',
        'ncm_entries',
        'nfse_layouts',
        'permissions',
        'pis_cofins_rules',
        'pis_tables',
        'role_permissions',
        'roles',
        'tenants'
      ];
      const result = await adminClient.query<{ table_name: string }>(`
        SELECT class.relname AS table_name
        FROM pg_class class
        JOIN pg_namespace namespace ON namespace.oid = class.relnamespace
        WHERE namespace.nspname = 'public'
          AND class.relkind IN ('r', 'p')
          AND class.relrowsecurity = false
        ORDER BY class.relname
      `);

      expect(result.rows.map((row) => row.table_name)).toEqual(platformOrReferenceTables);
    });

    it('should have RLS enabled on all core tables', async () => {
      for (const table of rlsTables) {
        const result = await adminClient.query(
          `
          SELECT c.relrowsecurity AS rowsecurity, c.relforcerowsecurity AS forcerowsecurity
          FROM pg_class c
          JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE n.nspname = 'public' AND c.relname = $1
        `,
          [table]
        );

        expect(result.rows, `${table} must exist in the canonical schema`).toHaveLength(1);
        expect(result.rows[0].rowsecurity, `${table} must have RLS enabled`).toBe(true);
        expect(result.rows[0].forcerowsecurity, `${table} must force RLS`).toBe(true);
      }
    });
  });

  describe('Cross-tenant isolation', () => {
    it('should isolate persisted auth sessions and reject cross-account writes', async () => {
      await adminClient.query(
        `
        INSERT INTO sessions (
          id, account_id, user_id, token_hash, expires_at, refresh_expires_at, created_at, updated_at
        ) VALUES
          ('rls-session-a', $1, 'rls-user-a', 'hash-a', NOW() + INTERVAL '1 hour', NOW() + INTERVAL '7 days', NOW(), NOW()),
          ('rls-session-b', $2, 'rls-user-b', 'hash-b', NOW() + INTERVAL '1 hour', NOW() + INTERVAL '7 days', NOW(), NOW())
        ON CONFLICT (id) DO NOTHING
      `,
        [ACCOUNT_A, ACCOUNT_B]
      );

      const clientA = await pool.connect();
      try {
        await clientA.query('BEGIN');
        await activateRlsRole(clientA);
        await setAccountContext(clientA, ACCOUNT_A);

        const visibleForeignSessions = await clientA.query(
          'SELECT id FROM sessions WHERE account_id = $1',
          [ACCOUNT_B]
        );
        expect(visibleForeignSessions.rows).toHaveLength(0);

        await expect(
          clientA.query(
            `
            INSERT INTO sessions (
              id, account_id, user_id, token_hash, expires_at, refresh_expires_at, created_at, updated_at
            ) VALUES ('rls-session-cross-account', $1, 'rls-user-b', 'hash-cross', NOW() + INTERVAL '1 hour', NOW() + INTERVAL '7 days', NOW(), NOW())
          `,
            [ACCOUNT_B]
          )
        ).rejects.toThrow();

        await clientA.query('ROLLBACK');
      } finally {
        clientA.release();
      }
    });

    it('isolates outbox, API-key telemetry and webhook deliveries derived by tenant', async () => {
      await adminClient.query(
        `INSERT INTO api_keys (
           id, account_id, name, key_prefix, key_hash, permissions,
           rate_limit, rate_limit_window, is_active, created_by, created_at, updated_at
         ) VALUES
           ('rls-api-key-a', $1, 'Key A', 'keya', 'hash-a', '[]'::jsonb, 10, 60, true, 'test', NOW(), NOW()),
           ('rls-api-key-b', $2, 'Key B', 'keyb', 'hash-b', '[]'::jsonb, 10, 60, true, 'test', NOW(), NOW())
         ON CONFLICT (id) DO NOTHING`,
        [ACCOUNT_A, ACCOUNT_B]
      );
      await adminClient.query(
        `INSERT INTO api_key_usage (
           id, api_key_id, endpoint, method, status_code, response_time_ms, created_at
         ) VALUES
           ('rls-api-usage-a', 'rls-api-key-a', '/a', 'GET', 200, 10, NOW()),
           ('rls-api-usage-b', 'rls-api-key-b', '/b', 'GET', 200, 10, NOW())
         ON CONFLICT (id) DO NOTHING`
      );
      await adminClient.query(
        `INSERT INTO api_key_rate_limits (api_key_id, window_start, request_count)
         VALUES
           ('rls-api-key-a', '2026-08-12T10:00:00Z', 1),
           ('rls-api-key-b', '2026-08-12T10:00:00Z', 1)
         ON CONFLICT DO NOTHING`
      );
      await adminClient.query(
        `INSERT INTO webhooks (id, account_id, url, events, is_active, created_at, updated_at)
         VALUES
           ('rls-webhook-a', $1, 'https://a.invalid/hook', '["event.a"]'::jsonb, true, NOW(), NOW()),
           ('rls-webhook-b', $2, 'https://b.invalid/hook', '["event.b"]'::jsonb, true, NOW(), NOW())
         ON CONFLICT (id) DO NOTHING`,
        [ACCOUNT_A, ACCOUNT_B]
      );
      await adminClient.query(
        `INSERT INTO webhook_deliveries (
           id, webhook_id, event, payload, status, attempts, created_at
         ) VALUES
           ('rls-delivery-a', 'rls-webhook-a', 'event.a', '{}'::jsonb, 'pending', 0, NOW()),
           ('rls-delivery-b', 'rls-webhook-b', 'event.b', '{}'::jsonb, 'pending', 0, NOW())
         ON CONFLICT (id) DO NOTHING`
      );
      await adminClient.query(
        `INSERT INTO outbox_events (
           id, account_id, correlation_id, module_name, event_type, payload,
           status, attempts, max_attempts, scheduled_at, created_at
         ) VALUES
           ('rls-outbox-a', $1::uuid, 'corr-a', 'audit', 'event.a', jsonb_build_object('accountId', $1::uuid::text), 'pending', 0, 3, NOW(), NOW()),
           ('rls-outbox-b', $2::uuid, 'corr-b', 'audit', 'event.b', jsonb_build_object('accountId', $2::uuid::text), 'pending', 0, 3, NOW(), NOW())
         ON CONFLICT (id) DO NOTHING`,
        [ACCOUNT_A, ACCOUNT_B]
      );

      const clientA = await pool.connect();
      try {
        await clientA.query('BEGIN');
        await activateRlsRole(clientA);
        await setAccountContext(clientA, ACCOUNT_A);

        const apiUsage = await clientA.query('SELECT id FROM api_key_usage ORDER BY id');
        expect(apiUsage.rows.map((row) => row.id)).toEqual(['rls-api-usage-a']);

        const rateLimits = await clientA.query(
          'SELECT api_key_id FROM api_key_rate_limits ORDER BY api_key_id'
        );
        expect(rateLimits.rows.map((row) => row.api_key_id)).toEqual(['rls-api-key-a']);

        const deliveries = await clientA.query(
          'SELECT id FROM webhook_deliveries ORDER BY id'
        );
        expect(deliveries.rows.map((row) => row.id)).toEqual(['rls-delivery-a']);

        const outbox = await clientA.query('SELECT id FROM outbox_events ORDER BY id');
        expect(outbox.rows.map((row) => row.id)).toEqual(['rls-outbox-a']);

        await expect(
          clientA.query(
            `INSERT INTO outbox_events (
               id, account_id, correlation_id, module_name, event_type, payload,
               status, attempts, max_attempts, scheduled_at, created_at
             ) VALUES (
               'rls-outbox-cross-account', $1, 'corr-cross', 'audit', 'event.cross',
               '{}'::jsonb, 'pending', 0, 3, NOW(), NOW()
             )`,
            [ACCOUNT_B]
          )
        ).rejects.toThrow();

        await clientA.query('ROLLBACK');
      } finally {
        clientA.release();
      }
    });

    it('rejects a tenant-owned link that points to a parent from another account', async () => {
      const ownerA = '61111111-1111-4111-8111-111111111111';
      const ownerB = '62222222-2222-4222-8222-222222222222';
      const patientA = '63333333-3333-4333-8333-333333333333';
      const patientB = '64444444-4444-4444-8444-444444444444';

      await adminClient.query(
        `INSERT INTO owners (id, account_id, full_name)
         VALUES ($1, $3, 'Constraint Owner A'), ($2, $4, 'Constraint Owner B')
         ON CONFLICT (id) DO NOTHING`,
        [ownerA, ownerB, ACCOUNT_A, ACCOUNT_B]
      );
      await adminClient.query(
        `INSERT INTO patients (id, account_id, owner_id, name, species)
         VALUES
           ($1, $3, $5, 'Constraint Patient A', 'canine'),
           ($2, $4, $6, 'Constraint Patient B', 'feline')
         ON CONFLICT (id) DO NOTHING`,
        [patientA, patientB, ACCOUNT_A, ACCOUNT_B, ownerA, ownerB]
      );

      const clientA = await pool.connect();
      try {
        await clientA.query('BEGIN');
        await activateRlsRole(clientA);
        await setAccountContext(clientA, ACCOUNT_A);

        await expect(
          clientA.query(
            `INSERT INTO owner_patient_links (
               id, account_id, owner_id, patient_id, relationship, is_primary, created_at
             ) VALUES ('rls-cross-parent-link', $1, $2, $3, 'guardian', false, NOW())`,
            [ACCOUNT_A, ownerA, patientB]
          )
        ).rejects.toThrow(/foreign key constraint/i);

        await clientA.query('ROLLBACK');
      } finally {
        clientA.release();
      }
    });

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
