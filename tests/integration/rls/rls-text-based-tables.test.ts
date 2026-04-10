import { getTestPool } from '../../db/db-admin.js';
import { queryOne, uuid } from '../../helpers/db-helpers.js';
import { activateRlsRole, setAccountContext } from '../../helpers/rls-helpers.js';

// ============================================================================
// RLS Text-Based Tables Tests — Fase 3c
// Verifica que triage_records, triage_record_versions e scheduling_queue_entries
// tem RLS habilitado com isolamento cross-account.
//
// Estas tabelas foram migradas de account_id text para uuid na Fase 3b
// e receberam RLS na Fase 3c.
// ============================================================================

const ACCOUNT_A = uuid();
const ACCOUNT_B = uuid();
const USER_A = uuid();
const USER_B = uuid();
const OWNER_A = uuid();
const OWNER_B = uuid();
const PATIENT_A = uuid();
const PATIENT_B = uuid();
const ENCOUNTER_A = uuid();
const ENCOUNTER_B = uuid();
const TENANT_ID = '00000000-0000-0000-0000-000000000001';

beforeAll(async () => {
  const pool = getTestPool();
  await pool.query(
    `
      INSERT INTO tenants (id, slug, name, status)
      VALUES ($1, 'rls-text-tenant', 'RLS Text Tenant', 'active')
      ON CONFLICT (id) DO NOTHING
    `,
    [TENANT_ID]
  );

  await pool.query(
    `
      INSERT INTO accounts (id, tenant_id, slug, name)
      VALUES ($1, $3, 'rls-text-a', 'RLS Text Account A'),
             ($2, $3, 'rls-text-b', 'RLS Text Account B')
      ON CONFLICT (id) DO NOTHING
    `,
    [ACCOUNT_A, ACCOUNT_B, TENANT_ID]
  );

  await pool.query(
    `
      INSERT INTO users (id, account_id, email, password_hash, full_name)
      VALUES
        ($1, $3, 'rls-text-a@example.com', 'hash', 'RLS Text User A'),
        ($2, $4, 'rls-text-b@example.com', 'hash', 'RLS Text User B')
      ON CONFLICT (id) DO NOTHING
    `,
    [USER_A, USER_B, ACCOUNT_A, ACCOUNT_B]
  );

  await pool.query(
    `
      INSERT INTO owners (id, account_id, full_name)
      VALUES ($1, $3, 'RLS Owner A'),
             ($2, $4, 'RLS Owner B')
      ON CONFLICT (id) DO NOTHING
    `,
    [OWNER_A, OWNER_B, ACCOUNT_A, ACCOUNT_B]
  );

  await pool.query(
    `
      INSERT INTO patients (id, account_id, owner_id, name, species)
      VALUES ($1, $3, $5, 'RLS Patient A', 'canine'),
             ($2, $4, $6, 'RLS Patient B', 'feline')
      ON CONFLICT (id) DO NOTHING
    `,
    [PATIENT_A, PATIENT_B, ACCOUNT_A, ACCOUNT_B, OWNER_A, OWNER_B]
  );

  await pool.query(
    `
      INSERT INTO encounters (id, account_id, patient_id, owner_id, status, opened_by_user_id)
      VALUES ($1, $3, $5, $7, 'open', $9),
             ($2, $4, $6, $8, 'open', $10)
      ON CONFLICT (id) DO NOTHING
    `,
    [
      ENCOUNTER_A,
      ENCOUNTER_B,
      ACCOUNT_A,
      ACCOUNT_B,
      PATIENT_A,
      PATIENT_B,
      OWNER_A,
      OWNER_B,
      USER_A,
      USER_B
    ]
  );
});

// ============================================================================
// RLS-TXT-001: Tables have RLS enabled
// ============================================================================
describe('RLS-TXT-001 — RLS Enabled on Text-Based Migrated Tables', () => {
  it('triage_records has RLS enabled', async () => {
    const result = await queryOne<{ rowsecurity: boolean }>(
      `SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'triage_records'`
    );
    expect(result?.rowsecurity).toBe(true);
  });

  it('triage_record_versions has RLS enabled', async () => {
    const result = await queryOne<{ rowsecurity: boolean }>(
      `SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'triage_record_versions'`
    );
    expect(result?.rowsecurity).toBe(true);
  });

  it('scheduling_queue_entries has RLS enabled', async () => {
    const result = await queryOne<{ rowsecurity: boolean }>(
      `SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'scheduling_queue_entries'`
    );
    expect(result?.rowsecurity).toBe(true);
  });
});

// ============================================================================
// RLS-TXT-002: Policies exist
// ============================================================================
describe('RLS-TXT-002 — RLS Policies Exist', () => {
  it('triage_records has tenant isolation policy', async () => {
    const result = await queryOne<{ count: number }>(
      `SELECT COUNT(*)::int FROM pg_policies 
       WHERE schemaname = 'public' 
       AND tablename = 'triage_records' 
       AND policyname = 'triage_records_tenant_isolation'`
    );
    expect(result?.count).toBe(1);
  });

  it('triage_record_versions has tenant isolation policy', async () => {
    const result = await queryOne<{ count: number }>(
      `SELECT COUNT(*)::int FROM pg_policies 
       WHERE schemaname = 'public' 
       AND tablename = 'triage_record_versions' 
       AND policyname = 'triage_record_versions_tenant_isolation'`
    );
    expect(result?.count).toBe(1);
  });

  it('scheduling_queue_entries has tenant isolation policy', async () => {
    const result = await queryOne<{ count: number }>(
      `SELECT COUNT(*)::int FROM pg_policies 
       WHERE schemaname = 'public' 
       AND tablename = 'scheduling_queue_entries' 
       AND policyname = 'scheduling_queue_entries_tenant_isolation'`
    );
    expect(result?.count).toBe(1);
  });
});

// ============================================================================
// RLS-TXT-003: Policies cover all operations
// ============================================================================
describe('RLS-TXT-003 — Policies Cover All Operations', () => {
  it('triage_records policy is FOR ALL', async () => {
    const result = await queryOne<{ cmd: string }>(
      `SELECT cmd FROM pg_policies 
       WHERE schemaname = 'public' 
       AND tablename = 'triage_records' 
       AND policyname = 'triage_records_tenant_isolation'`
    );
    expect(result?.cmd).toBe('ALL');
  });

  it('triage_record_versions policy is FOR ALL', async () => {
    const result = await queryOne<{ cmd: string }>(
      `SELECT cmd FROM pg_policies 
       WHERE schemaname = 'public' 
       AND tablename = 'triage_record_versions' 
       AND policyname = 'triage_record_versions_tenant_isolation'`
    );
    expect(result?.cmd).toBe('ALL');
  });

  it('scheduling_queue_entries policy is FOR ALL', async () => {
    const result = await queryOne<{ cmd: string }>(
      `SELECT cmd FROM pg_policies 
       WHERE schemaname = 'public' 
       AND tablename = 'scheduling_queue_entries' 
       AND policyname = 'scheduling_queue_entries_tenant_isolation'`
    );
    expect(result?.cmd).toBe('ALL');
  });
});

// ============================================================================
// RLS-TXT-004: account_id is uuid with FK
// ============================================================================
describe('RLS-TXT-004 — account_id is UUID with FK to accounts', () => {
  it('triage_records.account_id is uuid type', async () => {
    const result = await queryOne<{ udt_name: string }>(
      `SELECT udt_name FROM information_schema.columns 
       WHERE table_schema = 'public' AND table_name = 'triage_records' AND column_name = 'account_id'`
    );
    expect(result?.udt_name).toBe('uuid');
  });

  it('triage_record_versions.account_id is uuid type', async () => {
    const result = await queryOne<{ udt_name: string }>(
      `SELECT udt_name FROM information_schema.columns 
       WHERE table_schema = 'public' AND table_name = 'triage_record_versions' AND column_name = 'account_id'`
    );
    expect(result?.udt_name).toBe('uuid');
  });

  it('scheduling_queue_entries.account_id is uuid type', async () => {
    const result = await queryOne<{ udt_name: string }>(
      `SELECT udt_name FROM information_schema.columns 
       WHERE table_schema = 'public' AND table_name = 'scheduling_queue_entries' AND column_name = 'account_id'`
    );
    expect(result?.udt_name).toBe('uuid');
  });

  it('triage_records.account_id has FK to accounts', async () => {
    const result = await queryOne<{ count: number }>(
      `SELECT COUNT(*)::int FROM information_schema.key_column_usage kcu
       JOIN information_schema.referential_constraints rc 
         ON kcu.constraint_name = rc.constraint_name
       WHERE kcu.table_schema = 'public'
         AND kcu.table_name = 'triage_records'
         AND kcu.column_name = 'account_id'`
    );
    expect(result?.count).toBeGreaterThan(0);
  });

  it('triage_record_versions.account_id has FK to accounts', async () => {
    const result = await queryOne<{ count: number }>(
      `SELECT COUNT(*)::int FROM information_schema.key_column_usage kcu
       JOIN information_schema.referential_constraints rc 
         ON kcu.constraint_name = rc.constraint_name
       WHERE kcu.table_schema = 'public'
         AND kcu.table_name = 'triage_record_versions'
         AND kcu.column_name = 'account_id'`
    );
    expect(result?.count).toBeGreaterThan(0);
  });

  it('scheduling_queue_entries.account_id has FK to accounts', async () => {
    const result = await queryOne<{ count: number }>(
      `SELECT COUNT(*)::int FROM information_schema.key_column_usage kcu
       JOIN information_schema.referential_constraints rc 
         ON kcu.constraint_name = rc.constraint_name
       WHERE kcu.table_schema = 'public'
         AND kcu.table_name = 'scheduling_queue_entries'
         AND kcu.column_name = 'account_id'`
    );
    expect(result?.count).toBeGreaterThan(0);
  });
});

// ============================================================================
// RLS-TXT-005: Cross-account isolation via session variable
// ============================================================================
describe('RLS-TXT-005 — Cross-Account Isolation via Session', () => {
  it('account A cannot see triage_records of account B', async () => {
    const pool = getTestPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      await activateRlsRole(client);

      await setAccountContext(client, ACCOUNT_A);

      const triageId = uuid();
      await client.query(
        `INSERT INTO triage_records (id, account_id, encounter_id, patient_id, priority, chief_complaint, alerts_json, destination, triaged_by, triaged_at, created_at)
         VALUES ($1, $2, $3, $4, 'high', 'Chest pain', '[]', 'observation', $5, NOW(), NOW())`,
        [triageId, ACCOUNT_A, ENCOUNTER_A, PATIENT_A, USER_A]
      );

      await setAccountContext(client, ACCOUNT_B);

      const result = await client.query(
        `SELECT COUNT(*) FROM triage_records WHERE account_id = $1`,
        [ACCOUNT_A]
      );

      expect(parseInt(result.rows[0].count, 10)).toBe(0);

      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  });

  it('account A cannot see triage_record_versions of account B', async () => {
    const pool = getTestPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      await activateRlsRole(client);

      await setAccountContext(client, ACCOUNT_A);

      const versionId = uuid();
      await client.query(
        `INSERT INTO triage_record_versions (id, triage_id, account_id, encounter_id, changed_fields_json, previous_snapshot_json, next_snapshot_json, changed_by_user_id, created_at)
         VALUES ($1, $2, $3, $4, '[]', '{}', '{}', $5, NOW())`,
        [versionId, uuid(), ACCOUNT_A, ENCOUNTER_A, USER_A]
      );

      await setAccountContext(client, ACCOUNT_B);

      const result = await client.query(
        `SELECT COUNT(*) FROM triage_record_versions WHERE account_id = $1`,
        [ACCOUNT_A]
      );

      expect(parseInt(result.rows[0].count, 10)).toBe(0);

      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  });

  it('account A cannot see scheduling_queue_entries of account B', async () => {
    const pool = getTestPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      await activateRlsRole(client);

      await setAccountContext(client, ACCOUNT_A);

      const queueId = uuid();
      await client.query(
        `INSERT INTO scheduling_queue_entries (id, account_id, patient_id, owner_id, encounter_id, reason, priority, status, checked_in_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, 'Follow-up', 'medium', 'waiting', NOW(), NOW(), NOW())`,
        [queueId, ACCOUNT_A, PATIENT_A, OWNER_A, ENCOUNTER_A]
      );

      await setAccountContext(client, ACCOUNT_B);

      const result = await client.query(
        `SELECT COUNT(*) FROM scheduling_queue_entries WHERE account_id = $1`,
        [ACCOUNT_A]
      );

      expect(parseInt(result.rows[0].count, 10)).toBe(0);

      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  });

  it('account A can only see its own triage_records', async () => {
    const pool = getTestPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      await activateRlsRole(client);

      await setAccountContext(client, ACCOUNT_A);
      await client.query(
        `INSERT INTO triage_records (id, account_id, encounter_id, patient_id, priority, chief_complaint, alerts_json, destination, triaged_by, triaged_at, created_at)
         VALUES ($1, $2, $3, $4, 'low', 'Headache', '[]', 'home', $5, NOW(), NOW())`,
        [uuid(), ACCOUNT_A, ENCOUNTER_A, PATIENT_A, USER_A]
      );

      await setAccountContext(client, ACCOUNT_B);
      await client.query(
        `INSERT INTO triage_records (id, account_id, encounter_id, patient_id, priority, chief_complaint, alerts_json, destination, triaged_by, triaged_at, created_at)
         VALUES ($1, $2, $3, $4, 'medium', 'Fever', '[]', 'observation', $5, NOW(), NOW())`,
        [uuid(), ACCOUNT_B, ENCOUNTER_B, PATIENT_B, USER_B]
      );

      await setAccountContext(client, ACCOUNT_A);
      const resultA = await client.query(`SELECT COUNT(*) FROM triage_records`);
      expect(parseInt(resultA.rows[0].count, 10)).toBe(1);

      await setAccountContext(client, ACCOUNT_B);
      const resultB = await client.query(`SELECT COUNT(*) FROM triage_records`);
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

      await setAccountContext(client, ACCOUNT_A);
      await client.query(
        `INSERT INTO scheduling_queue_entries (id, account_id, patient_id, owner_id, encounter_id, reason, priority, status, checked_in_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, 'Urgent', 'high', 'waiting', NOW(), NOW(), NOW())`,
        [uuid(), ACCOUNT_A, PATIENT_A, OWNER_A, ENCOUNTER_A]
      );

      await setAccountContext(client, null);
      const result = await client.query(`SELECT COUNT(*) FROM scheduling_queue_entries`);

      expect(parseInt(result.rows[0].count, 10)).toBe(0);

      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  });
});

// ============================================================================
// RLS-TXT-006: Cross-account write protection
// ============================================================================
describe('RLS-TXT-006 — Cross-Account Write Protection', () => {
  it('account A cannot INSERT triage_records with account B ID', async () => {
    const pool = getTestPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      await activateRlsRole(client);

      await setAccountContext(client, ACCOUNT_A);

      await expect(
        client.query(
          `INSERT INTO triage_records (id, account_id, encounter_id, patient_id, priority, chief_complaint, alerts_json, destination, triaged_by, triaged_at, created_at)
           VALUES ($1, $2, $3, $4, 'high', 'Chest pain', '[]', 'observation', $5, NOW(), NOW())`,
          [uuid(), ACCOUNT_B, ENCOUNTER_A, PATIENT_A, USER_A]
        )
      ).rejects.toThrow();

      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  });

  it('account A cannot UPDATE triage_records to belong to account B', async () => {
    const pool = getTestPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      await activateRlsRole(client);

      const triageId = uuid();
      await setAccountContext(client, ACCOUNT_A);
      await client.query(
        `INSERT INTO triage_records (id, account_id, encounter_id, patient_id, priority, chief_complaint, alerts_json, destination, triaged_by, triaged_at, created_at)
         VALUES ($1, $2, $3, $4, 'low', 'Headache', '[]', 'home', $5, NOW(), NOW())`,
        [triageId, ACCOUNT_A, ENCOUNTER_A, PATIENT_A, USER_A]
      );

      await expect(
        client.query(`UPDATE triage_records SET account_id = $1 WHERE id = $2`, [
          ACCOUNT_B,
          triageId
        ])
      ).rejects.toThrow();

      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  });

  it('account A cannot INSERT scheduling_queue_entries with account B ID', async () => {
    const pool = getTestPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      await activateRlsRole(client);

      await setAccountContext(client, ACCOUNT_A);

      await expect(
        client.query(
          `INSERT INTO scheduling_queue_entries (id, account_id, patient_id, owner_id, encounter_id, reason, priority, status, checked_in_at, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, 'Follow-up', 'medium', 'waiting', NOW(), NOW(), NOW())`,
          [uuid(), ACCOUNT_B, PATIENT_A, OWNER_A, ENCOUNTER_A]
        )
      ).rejects.toThrow();

      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  });

  it('account A cannot UPDATE scheduling_queue_entries to belong to account B', async () => {
    const pool = getTestPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      await activateRlsRole(client);

      const queueId = uuid();
      await setAccountContext(client, ACCOUNT_A);
      await client.query(
        `INSERT INTO scheduling_queue_entries (id, account_id, patient_id, owner_id, encounter_id, reason, priority, status, checked_in_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, 'Follow-up', 'medium', 'waiting', NOW(), NOW(), NOW())`,
        [queueId, ACCOUNT_A, PATIENT_A, OWNER_A, ENCOUNTER_A]
      );

      await expect(
        client.query(`UPDATE scheduling_queue_entries SET account_id = $1 WHERE id = $2`, [
          ACCOUNT_B,
          queueId
        ])
      ).rejects.toThrow();

      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  });

  it('account A cannot DELETE triage_records of account B', async () => {
    const pool = getTestPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      await activateRlsRole(client);

      await setAccountContext(client, ACCOUNT_B);
      const triageId = uuid();
      await client.query(
        `INSERT INTO triage_records (id, account_id, encounter_id, patient_id, priority, chief_complaint, alerts_json, destination, triaged_by, triaged_at, created_at)
         VALUES ($1, $2, $3, $4, 'low', 'Headache', '[]', 'home', $5, NOW(), NOW())`,
        [triageId, ACCOUNT_B, ENCOUNTER_B, PATIENT_B, USER_B]
      );

      await setAccountContext(client, ACCOUNT_A);
      const result = await client.query(`DELETE FROM triage_records WHERE id = $1 RETURNING id`, [
        triageId
      ]);

      expect(result.rows.length).toBe(0);

      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  });
});
