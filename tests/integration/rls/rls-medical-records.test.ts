import { getTestPool } from '../../db/db-admin.js';
import { queryOne, uuid } from '../../helpers/db-helpers.js';
import { activateRlsRole, setAccountContext } from '../../helpers/rls-helpers.js';

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
const MEDICAL_RECORD_A = `mr_${uuid()}`;
const MEDICAL_RECORD_B = `mr_${uuid()}`;
const ENTRY_A = `ce_${uuid()}`;
const ENTRY_B = `ce_${uuid()}`;
const TIMELINE_A = `tl_${uuid()}`;
const TIMELINE_B = `tl_${uuid()}`;
const REVISION_A = `rev_${uuid()}`;
const REVISION_B = `rev_${uuid()}`;
const TENANT_ID = '00000000-0000-0000-0000-000000000001';

beforeAll(async () => {
  const pool = getTestPool();

  await pool.query(
    `
      INSERT INTO tenants (id, slug, name, status)
      VALUES ($1, 'rls-medical-tenant', 'RLS Medical Tenant', 'active')
      ON CONFLICT (id) DO NOTHING
    `,
    [TENANT_ID]
  );

  await pool.query(
    `
      INSERT INTO accounts (id, tenant_id, slug, name)
      VALUES ($1, $3, 'rls-medical-a', 'RLS Medical Account A'),
             ($2, $3, 'rls-medical-b', 'RLS Medical Account B')
      ON CONFLICT (id) DO NOTHING
    `,
    [ACCOUNT_A, ACCOUNT_B, TENANT_ID]
  );

  await pool.query(
    `
      INSERT INTO users (id, account_id, email, password_hash, full_name)
      VALUES
        ($1, $3, 'rls-medical-a@example.com', 'hash', 'RLS Medical User A'),
        ($2, $4, 'rls-medical-b@example.com', 'hash', 'RLS Medical User B')
      ON CONFLICT (id) DO NOTHING
    `,
    [USER_A, USER_B, ACCOUNT_A, ACCOUNT_B]
  );

  await pool.query(
    `
      INSERT INTO owners (id, account_id, full_name)
      VALUES ($1, $3, 'RLS Medical Owner A'),
             ($2, $4, 'RLS Medical Owner B')
      ON CONFLICT (id) DO NOTHING
    `,
    [OWNER_A, OWNER_B, ACCOUNT_A, ACCOUNT_B]
  );

  await pool.query(
    `
      INSERT INTO patients (id, account_id, owner_id, name, species)
      VALUES ($1, $3, $5, 'RLS Medical Patient A', 'canine'),
             ($2, $4, $6, 'RLS Medical Patient B', 'feline')
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

  await pool.query(
    `
      INSERT INTO medical_records (id, account_id, encounter_id, patient_id, status, version, created_at, updated_at)
      VALUES
        ($1, $3, $5, $7, 'open', 1, NOW(), NOW()),
        ($2, $4, $6, $8, 'open', 1, NOW(), NOW())
      ON CONFLICT (id) DO NOTHING
    `,
    [MEDICAL_RECORD_A, MEDICAL_RECORD_B, ACCOUNT_A, ACCOUNT_B, ENCOUNTER_A, ENCOUNTER_B, PATIENT_A, PATIENT_B]
  );

  await pool.query(
    `
      INSERT INTO clinical_entries (
        id, account_id, medical_record_id, encounter_id, patient_id, author_user_id,
        entry_type, title, content, version, created_at, updated_at
      )
      VALUES
        ($1, $3, $5, $7, $9, $11, 'soap', 'A', 'entry a', 1, NOW(), NOW()),
        ($2, $4, $6, $8, $10, $12, 'soap', 'B', 'entry b', 1, NOW(), NOW())
      ON CONFLICT (id) DO NOTHING
    `,
    [
      ENTRY_A,
      ENTRY_B,
      ACCOUNT_A,
      ACCOUNT_B,
      MEDICAL_RECORD_A,
      MEDICAL_RECORD_B,
      ENCOUNTER_A,
      ENCOUNTER_B,
      PATIENT_A,
      PATIENT_B,
      USER_A,
      USER_B
    ]
  );

  await pool.query(
    `
      INSERT INTO clinical_timeline (
        id, account_id, medical_record_id, encounter_id, event_type, summary,
        actor_user_id, clinical_entry_id, occurred_at
      )
      VALUES
        ($1, $3, $5, $7, 'clinical-entry.created', 'timeline a', $9, $11, NOW()),
        ($2, $4, $6, $8, 'clinical-entry.created', 'timeline b', $10, $12, NOW())
      ON CONFLICT (id) DO NOTHING
    `,
    [
      TIMELINE_A,
      TIMELINE_B,
      ACCOUNT_A,
      ACCOUNT_B,
      MEDICAL_RECORD_A,
      MEDICAL_RECORD_B,
      ENCOUNTER_A,
      ENCOUNTER_B,
      USER_A,
      USER_B,
      ENTRY_A,
      ENTRY_B
    ]
  );

  await pool.query(
    `
      INSERT INTO entry_revisions (
        id, entry_id, version, title, content, author_user_id, reason, created_at
      )
      VALUES
        ($1, $3, 1, 'A', 'revision a', $5, 'initial', NOW()),
        ($2, $4, 1, 'B', 'revision b', $6, 'initial', NOW())
      ON CONFLICT (id) DO NOTHING
    `,
    [REVISION_A, REVISION_B, ENTRY_A, ENTRY_B, USER_A, USER_B]
  );
});

describe('RLS-MED-001 — RLS Enabled on Medical Record Tables', () => {
  it.each([
    'medical_records',
    'clinical_entries',
    'clinical_timeline',
    'entry_revisions'
  ])('%s has RLS enabled', async (tableName) => {
    const result = await queryOne<{ rowsecurity: boolean }>(
      `SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = $1`,
      [tableName]
    );
    expect(result?.rowsecurity).toBe(true);
  });
});

describe('RLS-MED-002 — Policies Exist on Medical Record Tables', () => {
  it.each([
    ['medical_records', 'medical_records_tenant_isolation'],
    ['clinical_entries', 'clinical_entries_tenant_isolation'],
    ['clinical_timeline', 'clinical_timeline_tenant_isolation'],
    ['entry_revisions', 'entry_revisions_tenant_isolation']
  ])('%s exposes %s', async (tableName, policyName) => {
    const result = await queryOne<{ count: number }>(
      `SELECT COUNT(*)::int FROM pg_policies
       WHERE schemaname = 'public' AND tablename = $1 AND policyname = $2`,
      [tableName, policyName]
    );
    expect(result?.count).toBe(1);
  });
});

describe('RLS-MED-003 — Cross-Account Read Isolation', () => {
  it('account B cannot see medical_records of account A', async () => {
    const client = await getTestPool().connect();
    try {
      await client.query('BEGIN');
      await activateRlsRole(client);
      await setAccountContext(client, ACCOUNT_B);

      const result = await client.query(
        'SELECT COUNT(*)::int AS count FROM medical_records WHERE id = $1',
        [MEDICAL_RECORD_A]
      );

      expect(result.rows[0]?.count).toBe(0);
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  });

  it('account B cannot see clinical_entries of account A', async () => {
    const client = await getTestPool().connect();
    try {
      await client.query('BEGIN');
      await activateRlsRole(client);
      await setAccountContext(client, ACCOUNT_B);

      const result = await client.query(
        'SELECT COUNT(*)::int AS count FROM clinical_entries WHERE id = $1',
        [ENTRY_A]
      );

      expect(result.rows[0]?.count).toBe(0);
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  });

  it('account B cannot see clinical_timeline of account A', async () => {
    const client = await getTestPool().connect();
    try {
      await client.query('BEGIN');
      await activateRlsRole(client);
      await setAccountContext(client, ACCOUNT_B);

      const result = await client.query(
        'SELECT COUNT(*)::int AS count FROM clinical_timeline WHERE id = $1',
        [TIMELINE_A]
      );

      expect(result.rows[0]?.count).toBe(0);
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  });

  it('account B cannot see entry_revisions of account A', async () => {
    const client = await getTestPool().connect();
    try {
      await client.query('BEGIN');
      await activateRlsRole(client);
      await setAccountContext(client, ACCOUNT_B);

      const result = await client.query(
        'SELECT COUNT(*)::int AS count FROM entry_revisions WHERE id = $1',
        [REVISION_A]
      );

      expect(result.rows[0]?.count).toBe(0);
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  });
});

describe('RLS-MED-004 — Cross-Account Write Protection', () => {
  it('account A cannot INSERT medical_records with account B id', async () => {
    const client = await getTestPool().connect();
    try {
      await client.query('BEGIN');
      await activateRlsRole(client);
      await setAccountContext(client, ACCOUNT_A);

      await expect(
        client.query(
          `INSERT INTO medical_records (id, account_id, encounter_id, patient_id, status, version, created_at, updated_at)
           VALUES ($1, $2, $3, $4, 'open', 1, NOW(), NOW())`,
          [`mr_${uuid()}`, ACCOUNT_B, ENCOUNTER_A, PATIENT_A]
        )
      ).rejects.toThrow();

      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  });

  it('account A cannot INSERT clinical_entries linked to account B data', async () => {
    const client = await getTestPool().connect();
    try {
      await client.query('BEGIN');
      await activateRlsRole(client);
      await setAccountContext(client, ACCOUNT_A);

      await expect(
        client.query(
          `INSERT INTO clinical_entries (
             id, account_id, medical_record_id, encounter_id, patient_id, author_user_id,
             entry_type, title, content, version, created_at, updated_at
           )
           VALUES ($1, $2, $3, $4, $5, $6, 'soap', 'cross', 'blocked', 1, NOW(), NOW())`,
          [`ce_${uuid()}`, ACCOUNT_A, MEDICAL_RECORD_B, ENCOUNTER_B, PATIENT_B, USER_A]
        )
      ).rejects.toThrow();

      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  });
});
