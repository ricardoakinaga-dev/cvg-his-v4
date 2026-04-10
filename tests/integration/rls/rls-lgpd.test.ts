import { getTestPool } from '../../db/db-admin.js';
import { queryOne, queryMany, uuid } from '../../helpers/db-helpers.js';
import { activateRlsRole, setAccountContext } from '../../helpers/rls-helpers.js';

// ============================================================================
// RLS LGPD Tests — Fase 5b
// Verifica que consent_records e data_subject_requests tem RLS habilitado
// e que o isolamento cross-account funciona.
// ============================================================================

const ACCOUNT_A = uuid();
const ACCOUNT_B = uuid();
const USER_A = uuid();
const USER_B = uuid();
const TENANT_ID = '00000000-0000-0000-0000-000000000001';

beforeAll(async () => {
  const pool = getTestPool();
  await pool.query(
    `
      INSERT INTO tenants (id, slug, name, status)
      VALUES ($1, 'rls-lgpd-tenant', 'RLS LGPD Tenant', 'active')
      ON CONFLICT (id) DO NOTHING
    `,
    [TENANT_ID]
  );

  await pool.query(
    `
      INSERT INTO accounts (id, tenant_id, slug, name)
      VALUES ($1, $3, 'rls-lgpd-a', 'RLS LGPD Account A'),
             ($2, $3, 'rls-lgpd-b', 'RLS LGPD Account B')
      ON CONFLICT (id) DO NOTHING
    `,
    [ACCOUNT_A, ACCOUNT_B, TENANT_ID]
  );

  await pool.query(
    `
      INSERT INTO users (id, account_id, email, password_hash, full_name)
      VALUES
        ($1, $3, 'rls-lgpd-a@example.com', 'hash', 'RLS LGPD User A'),
        ($2, $4, 'rls-lgpd-b@example.com', 'hash', 'RLS LGPD User B')
      ON CONFLICT (id) DO NOTHING
    `,
    [USER_A, USER_B, ACCOUNT_A, ACCOUNT_B]
  );
});

// ============================================================================
// RLS-LGPD-001: Tables have RLS enabled
// ============================================================================
describe('RLS-LGPD-001 — RLS Enabled on LGPD Tables', () => {
  it('consent_records has RLS enabled', async () => {
    const result = await queryOne<{ rowsecurity: boolean }>(
      `SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'consent_records'`
    );
    expect(result?.rowsecurity).toBe(true);
  });

  it('data_subject_requests has RLS enabled', async () => {
    const result = await queryOne<{ rowsecurity: boolean }>(
      `SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'data_subject_requests'`
    );
    expect(result?.rowsecurity).toBe(true);
  });
});

// ============================================================================
// RLS-LGPD-002: Policies exist
// ============================================================================
describe('RLS-LGPD-002 — RLS Policies Exist', () => {
  it('consent_records has tenant isolation policy', async () => {
    const result = await queryOne<{ count: number }>(
      `SELECT COUNT(*)::int FROM pg_policies 
       WHERE schemaname = 'public' 
       AND tablename = 'consent_records' 
       AND policyname = 'consent_records_tenant_isolation'`
    );
    expect(result?.count).toBe(1);
  });

  it('data_subject_requests has tenant isolation policy', async () => {
    const result = await queryOne<{ count: number }>(
      `SELECT COUNT(*)::int FROM pg_policies 
       WHERE schemaname = 'public' 
       AND tablename = 'data_subject_requests' 
       AND policyname = 'data_subject_requests_tenant_isolation'`
    );
    expect(result?.count).toBe(1);
  });
});

// ============================================================================
// RLS-LGPD-003: Policies cover all operations
// ============================================================================
describe('RLS-LGPD-003 — Policies Cover All Operations', () => {
  it('consent_records policy is FOR ALL', async () => {
    const result = await queryOne<{ cmd: string }>(
      `SELECT cmd FROM pg_policies 
       WHERE schemaname = 'public' 
       AND tablename = 'consent_records' 
       AND policyname = 'consent_records_tenant_isolation'`
    );
    expect(result?.cmd).toBe('ALL');
  });

  it('data_subject_requests policy is FOR ALL', async () => {
    const result = await queryOne<{ cmd: string }>(
      `SELECT cmd FROM pg_policies 
       WHERE schemaname = 'public' 
       AND tablename = 'data_subject_requests' 
       AND policyname = 'data_subject_requests_tenant_isolation'`
    );
    expect(result?.cmd).toBe('ALL');
  });
});

// ============================================================================
// RLS-LGPD-004: Schema has account_id FK
// ============================================================================
describe('RLLS-LGPD-004 — account_id FK Exists', () => {
  it('consent_records.account_id has FK to accounts', async () => {
    const result = await queryOne<{ count: number }>(
      `SELECT COUNT(*)::int FROM information_schema.key_column_usage kcu
       JOIN information_schema.referential_constraints rc 
         ON kcu.constraint_name = rc.constraint_name
       WHERE kcu.table_schema = 'public'
         AND kcu.table_name = 'consent_records'
         AND kcu.column_name = 'account_id'`
    );
    expect(result?.count).toBeGreaterThan(0);
  });

  it('data_subject_requests.account_id has FK to accounts', async () => {
    const result = await queryOne<{ count: number }>(
      `SELECT COUNT(*)::int FROM information_schema.key_column_usage kcu
       JOIN information_schema.referential_constraints rc 
         ON kcu.constraint_name = rc.constraint_name
       WHERE kcu.table_schema = 'public'
         AND kcu.table_name = 'data_subject_requests'
         AND kcu.column_name = 'account_id'`
    );
    expect(result?.count).toBeGreaterThan(0);
  });
});

// ============================================================================
// RLS-LGPD-005: Cross-account isolation via session variable
// ============================================================================
describe('RLS-LGPD-005 — Cross-Account Isolation via Session', () => {
  it('account A cannot see consent_records of account B', async () => {
    const pool = getTestPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      await activateRlsRole(client);

      // Set account A context
      await setAccountContext(client, ACCOUNT_A);

      // Insert consent for account A
      await client.query(
        `INSERT INTO consent_records (id, account_id, subject_id, subject_type, purpose, status, origin, granted_by, granted_at, created_at)
         VALUES ($1, $2, $3, 'owner', 'marketing', 'granted', 'api', $4, NOW(), NOW())`,
        [uuid(), ACCOUNT_A, uuid(), USER_A]
      );

      // Set account B context
      await setAccountContext(client, ACCOUNT_B);

      // Account B should NOT see account A's consent
      const result = await client.query(
        `SELECT COUNT(*) FROM consent_records WHERE account_id = $1`,
        [ACCOUNT_A]
      );

      expect(parseInt(result.rows[0].count, 10)).toBe(0);

      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  });

  it('account B cannot see data_subject_requests of account A', async () => {
    const pool = getTestPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      await activateRlsRole(client);

      // Set account A context and insert
      await setAccountContext(client, ACCOUNT_A);

      await client.query(
        `INSERT INTO data_subject_requests (id, account_id, subject_id, subject_type, request_type, status, requested_by, requested_at, created_at, updated_at)
         VALUES ($1, $2, $3, 'owner', 'data_export', 'pending', $4, NOW(), NOW(), NOW())`,
        [uuid(), ACCOUNT_A, uuid(), USER_A]
      );

      // Set account B context
      await setAccountContext(client, ACCOUNT_B);

      // Account B should NOT see account A's request
      const result = await client.query(
        `SELECT COUNT(*) FROM data_subject_requests WHERE account_id = $1`,
        [ACCOUNT_A]
      );

      expect(parseInt(result.rows[0].count, 10)).toBe(0);

      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  });

  it('account A can only see its own consent_records', async () => {
    const pool = getTestPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      await activateRlsRole(client);

      // Insert for both accounts
      await setAccountContext(client, ACCOUNT_A);
      await client.query(
        `INSERT INTO consent_records (id, account_id, subject_id, subject_type, purpose, status, origin, granted_by, granted_at, created_at)
         VALUES ($1, $2, $3, 'owner', 'marketing', 'granted', 'api', $4, NOW(), NOW())`,
        [uuid(), ACCOUNT_A, uuid(), USER_A]
      );

      await setAccountContext(client, ACCOUNT_B);
      await client.query(
        `INSERT INTO consent_records (id, account_id, subject_id, subject_type, purpose, status, origin, granted_by, granted_at, created_at)
         VALUES ($1, $2, $3, 'owner', 'analytics', 'granted', 'api', $4, NOW(), NOW())`,
        [uuid(), ACCOUNT_B, uuid(), USER_B]
      );

      // Account A should only see its own record
      await setAccountContext(client, ACCOUNT_A);
      const resultA = await client.query(`SELECT COUNT(*) FROM consent_records`);
      expect(parseInt(resultA.rows[0].count, 10)).toBe(1);

      // Account B should only see its own record
      await setAccountContext(client, ACCOUNT_B);
      const resultB = await client.query(`SELECT COUNT(*) FROM consent_records`);
      expect(parseInt(resultB.rows[0].count, 10)).toBe(1);

      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  });

  it('without account context, no data is visible', async () => {
    const pool = getTestPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      await activateRlsRole(client);

      // Clear session context
      await setAccountContext(client, null);

      // Insert data for account A
      await setAccountContext(client, ACCOUNT_A);
      await client.query(
        `INSERT INTO consent_records (id, account_id, subject_id, subject_type, purpose, status, origin, granted_by, granted_at, created_at)
         VALUES ($1, $2, $3, 'owner', 'clinical', 'granted', 'api', $4, NOW(), NOW())`,
        [uuid(), ACCOUNT_A, uuid(), USER_A]
      );

      // Clear context and try to read
      await setAccountContext(client, null);
      const result = await client.query(`SELECT COUNT(*) FROM consent_records`);

      expect(parseInt(result.rows[0].count, 10)).toBe(0);

      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  });
});

// ============================================================================
// RLS-LGPD-006: Cross-account write protection
// ============================================================================
describe('RLS-LGPD-006 — Cross-Account Write Protection', () => {
  it('account A cannot INSERT into consent_records with account B ID', async () => {
    const pool = getTestPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      await activateRlsRole(client);

      // Set account A context
      await setAccountContext(client, ACCOUNT_A);

      // Try to insert with account B's ID — should fail due to WITH CHECK
      await expect(
        client.query(
          `INSERT INTO consent_records (id, account_id, subject_id, subject_type, purpose, status, origin, granted_by, granted_at, created_at)
           VALUES ($1, $2, $3, 'owner', 'marketing', 'granted', 'api', $4, NOW(), NOW())`,
          [uuid(), ACCOUNT_B, uuid(), USER_A]
        )
      ).rejects.toThrow();

      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  });

  it('account A cannot UPDATE consent_records to belong to account B', async () => {
    const pool = getTestPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      await activateRlsRole(client);

      // Insert as account A
      await setAccountContext(client, ACCOUNT_A);
      const consentId = uuid();
      await client.query(
        `INSERT INTO consent_records (id, account_id, subject_id, subject_type, purpose, status, origin, granted_by, granted_at, created_at)
         VALUES ($1, $2, $3, 'owner', 'marketing', 'granted', 'api', $4, NOW(), NOW())`,
        [consentId, ACCOUNT_A, uuid(), USER_A]
      );

      // Try to update to account B — should fail due to WITH CHECK
      await expect(
        client.query(`UPDATE consent_records SET account_id = $1 WHERE id = $2`, [
          ACCOUNT_B,
          consentId
        ])
      ).rejects.toThrow();

      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  });
});
