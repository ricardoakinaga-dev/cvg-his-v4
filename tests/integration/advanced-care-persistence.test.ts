import { randomUUID } from 'node:crypto';

import { DatabaseInpatientProgressRepository } from '../../packages/modules/inpatient/src/repositories/database-inpatient.repository.ts';
import { DatabaseSurgeryCaseRepository } from '../../packages/modules/surgery/src/repositories/database-surgery.repository.ts';
import {
  closeDatabaseClient,
  createDatabaseClient,
  getDatabaseClient
} from '@cvg-his-v2/shared-database';
import type { InpatientProgressSummary, SurgeryCaseSummary } from '@cvg-his-v2/shared-types';
import { runWithTenantContext } from '@cvg-his-v2/tenant-context';

import { getTestPool } from '../db/db-admin.js';
import { activateRlsRole, setAccountContext } from '../helpers/rls-helpers.js';
import { TEST_DB_URL } from '../setup/env.js';

const TENANT_ID = randomUUID();
const ACCOUNT_A = randomUUID();
const ACCOUNT_B = randomUUID();
const USER_A = randomUUID();
const USER_B = randomUUID();
const OWNER_A = randomUUID();
const OWNER_B = randomUUID();
const PATIENT_A = randomUUID();
const PATIENT_B = randomUUID();
const ENCOUNTER_A = randomUUID();
const ENCOUNTER_B = randomUUID();
const WARD_A = randomUUID();
const WARD_B = randomUUID();
const BED_A = randomUUID();
const BED_B = randomUUID();
const SECTOR_A = `advanced-care-sector-${randomUUID()}`;
const SECTOR_B = `advanced-care-sector-${randomUUID()}`;
const STAY_A = randomUUID();
const STAY_B = randomUUID();

const ADVANCED_CARE_TABLES = ['inpatient_progress', 'surgery_cases'] as const;

function inAccount<T>(accountId: string, callback: () => T): T {
  return runWithTenantContext(
    {
      tenantId: TENANT_ID,
      accountId,
      correlationId: randomUUID()
    },
    callback
  );
}

async function tableExists(tableName: string): Promise<boolean> {
  const result = await getTestPool().query<{ exists: boolean }>(
    `SELECT to_regclass('public.' || $1) IS NOT NULL AS exists`,
    [tableName]
  );
  return result.rows[0]?.exists ?? false;
}

async function seedCanonicalParents(): Promise<void> {
  const pool = getTestPool();
  await pool.query(
    `INSERT INTO tenants (id, slug, name, status)
     VALUES ($1, $2, 'Advanced Care Tenant', 'active')`,
    [TENANT_ID, `advanced-care-${TENANT_ID}`]
  );
  await pool.query(
    `INSERT INTO accounts (id, tenant_id, slug, name)
     VALUES ($1, $3, $4, 'Advanced Care Account A'),
            ($2, $3, $5, 'Advanced Care Account B')`,
    [
      ACCOUNT_A,
      ACCOUNT_B,
      TENANT_ID,
      `advanced-care-a-${ACCOUNT_A}`,
      `advanced-care-b-${ACCOUNT_B}`
    ]
  );
  await pool.query(
    `INSERT INTO users (id, account_id, username, email, password_hash, full_name)
     VALUES ($1, $3, $5, $7, 'hash', 'Advanced Care User A'),
            ($2, $4, $6, $8, 'hash', 'Advanced Care User B')`,
    [
      USER_A,
      USER_B,
      ACCOUNT_A,
      ACCOUNT_B,
      `advanced-care-a-${USER_A}`,
      `advanced-care-b-${USER_B}`,
      `advanced-care-a-${USER_A}@example.com`,
      `advanced-care-b-${USER_B}@example.com`
    ]
  );
  await pool.query(
    `INSERT INTO owners (id, account_id, full_name)
     VALUES ($1, $3, 'Advanced Care Owner A'),
            ($2, $4, 'Advanced Care Owner B')`,
    [OWNER_A, OWNER_B, ACCOUNT_A, ACCOUNT_B]
  );
  await pool.query(
    `INSERT INTO patients (id, account_id, owner_id, name, species)
     VALUES ($1, $3, $5, 'Advanced Care Patient A', 'canine'),
            ($2, $4, $6, 'Advanced Care Patient B', 'feline')`,
    [PATIENT_A, PATIENT_B, ACCOUNT_A, ACCOUNT_B, OWNER_A, OWNER_B]
  );
  await pool.query(
    `INSERT INTO encounters (id, account_id, patient_id, owner_id, opened_by_user_id, reason)
     VALUES ($1, $3, $5, $7, $9, 'Advanced care encounter A'),
            ($2, $4, $6, $8, $10, 'Advanced care encounter B')`,
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
    `INSERT INTO sectors (id, account_id, code, name, kind)
     VALUES ($1, $3, 'AC-A', 'Advanced Care A', 'icu'),
            ($2, $4, 'AC-B', 'Advanced Care B', 'icu')`,
    [SECTOR_A, SECTOR_B, ACCOUNT_A, ACCOUNT_B]
  );
  await pool.query(
    `INSERT INTO wards (id, account_id, name, code)
     VALUES ($1, $3, 'Advanced Care Ward A', 'AC-A'),
            ($2, $4, 'Advanced Care Ward B', 'AC-B')`,
    [WARD_A, WARD_B, ACCOUNT_A, ACCOUNT_B]
  );
  await pool.query(
    `INSERT INTO beds (id, account_id, ward_id, sector_id, name, code)
     VALUES ($1, $3, $5, $7, 'Advanced Care Bed A', 'AC-A'),
            ($2, $4, $6, $8, 'Advanced Care Bed B', 'AC-B')`,
    [BED_A, BED_B, ACCOUNT_A, ACCOUNT_B, WARD_A, WARD_B, SECTOR_A, SECTOR_B]
  );
  await pool.query(
    `INSERT INTO inpatient_stays (
       id, account_id, patient_id, owner_id, encounter_id, ward_id, bed_id,
       status, admitted_by_user_id
     ) VALUES
       ($1, $3, $5, $7, $9, $11, $13, 'active', $15),
       ($2, $4, $6, $8, $10, $12, $14, 'active', $16)`,
    [
      STAY_A,
      STAY_B,
      ACCOUNT_A,
      ACCOUNT_B,
      PATIENT_A,
      PATIENT_B,
      OWNER_A,
      OWNER_B,
      ENCOUNTER_A,
      ENCOUNTER_B,
      WARD_A,
      WARD_B,
      BED_A,
      BED_B,
      USER_A,
      USER_B
    ]
  );
}

async function cleanup(): Promise<void> {
  const pool = getTestPool();
  for (const table of ADVANCED_CARE_TABLES) {
    if (await tableExists(table)) {
      await pool.query(`DELETE FROM ${table} WHERE account_id = ANY($1::uuid[])`, [
        [ACCOUNT_A, ACCOUNT_B]
      ]);
    }
  }
  await pool.query('DELETE FROM inpatient_stays WHERE account_id = ANY($1::uuid[])', [
    [ACCOUNT_A, ACCOUNT_B]
  ]);
  await pool.query('DELETE FROM beds WHERE account_id = ANY($1::uuid[])', [[ACCOUNT_A, ACCOUNT_B]]);
  await pool.query('DELETE FROM wards WHERE account_id = ANY($1::uuid[])', [
    [ACCOUNT_A, ACCOUNT_B]
  ]);
  await pool.query('DELETE FROM sectors WHERE account_id = ANY($1::varchar[])', [
    [ACCOUNT_A, ACCOUNT_B]
  ]);
  await pool.query('DELETE FROM encounters WHERE account_id = ANY($1::uuid[])', [
    [ACCOUNT_A, ACCOUNT_B]
  ]);
  await pool.query('DELETE FROM patients WHERE account_id = ANY($1::uuid[])', [
    [ACCOUNT_A, ACCOUNT_B]
  ]);
  await pool.query('DELETE FROM owners WHERE account_id = ANY($1::uuid[])', [
    [ACCOUNT_A, ACCOUNT_B]
  ]);
  await pool.query('DELETE FROM users WHERE account_id = ANY($1::uuid[])', [
    [ACCOUNT_A, ACCOUNT_B]
  ]);
  await pool.query('DELETE FROM accounts WHERE id = ANY($1::uuid[])', [[ACCOUNT_A, ACCOUNT_B]]);
  await pool.query('DELETE FROM tenants WHERE id = $1', [TENANT_ID]);
}

beforeAll(async () => {
  createDatabaseClient(TEST_DB_URL);
  await seedCanonicalParents();
});

afterAll(async () => {
  await cleanup();
  await closeDatabaseClient();
});

describe('advanced care canonical persistence contract', () => {
  it.each([
    ['inpatient_progress', ['id', 'account_id', 'stay_id', 'encounter_id', 'authored_by_user_id']],
    ['surgery_cases', ['id', 'account_id', 'encounter_id', 'patient_id', 'surgeon_user_id']]
  ] as const)('uses UUID identifiers and tenant references in %s', async (table, uuidColumns) => {
    const columns = await getTestPool().query<{
      column_name: string;
      data_type: string;
      is_nullable: 'YES' | 'NO';
    }>(
      `SELECT column_name, data_type, is_nullable
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1`,
      [table]
    );
    const byName = new Map(columns.rows.map((column) => [column.column_name, column]));

    expect(columns.rows.length).toBeGreaterThan(0);
    for (const column of uuidColumns) {
      expect(byName.get(column)?.data_type, `${table}.${column}`).toBe('uuid');
    }
    expect(byName.get('account_id')?.is_nullable).toBe('NO');
  });

  it.each(ADVANCED_CARE_TABLES)('enables a complete tenant RLS policy on %s', async (table) => {
    const result = await getTestPool().query<{
      rowsecurity: boolean;
      qual: string | null;
      with_check: string | null;
    }>(
      `SELECT tables.rowsecurity, policies.qual, policies.with_check
       FROM pg_tables tables
       LEFT JOIN pg_policies policies
         ON policies.schemaname = tables.schemaname
        AND policies.tablename = tables.tablename
       WHERE tables.schemaname = 'public'
         AND tables.tablename = $1`,
      [table]
    );

    expect(result.rows.some((row) => row.rowsecurity)).toBe(true);
    expect(
      result.rows.some(
        (row) =>
          row.qual?.includes('app.current_account_id') &&
          row.with_check?.includes('app.current_account_id')
      )
    ).toBe(true);
  });

  it.each([
    ['inpatient_progress', 'stay_id', 'inpatient_stays'],
    ['inpatient_progress', 'encounter_id', 'encounters'],
    ['inpatient_progress', 'authored_by_user_id', 'users'],
    ['surgery_cases', 'encounter_id', 'encounters'],
    ['surgery_cases', 'patient_id', 'patients'],
    ['surgery_cases', 'surgeon_user_id', 'users']
  ] as const)(
    'enforces a composite tenant FK from %s.account_id + %s to %s',
    async (table, referencedColumn, referencedTable) => {
      const result = await getTestPool().query<{ definition: string }>(
        `SELECT pg_get_constraintdef(constraint_row.oid) AS definition
         FROM pg_constraint constraint_row
         JOIN pg_class table_row ON table_row.oid = constraint_row.conrelid
         JOIN pg_namespace namespace_row ON namespace_row.oid = table_row.relnamespace
         WHERE namespace_row.nspname = 'public'
           AND table_row.relname = $1
           AND constraint_row.contype = 'f'`,
        [table]
      );
      const definitions = result.rows.map((row) => row.definition.replace(/[\s"]/g, ''));
      const expected = `FOREIGNKEY(account_id,${referencedColumn})REFERENCES${referencedTable}(account_id,id)`;

      expect(definitions.some((definition) => definition.includes(expected))).toBe(true);
    }
  );
});

describe('advanced care repository tenant isolation', () => {
  it('round-trips inpatient progress and hides it from another account', async () => {
    const repository = new DatabaseInpatientProgressRepository(getDatabaseClient());
    const progress: InpatientProgressSummary = {
      id: randomUUID() as never,
      accountId: ACCOUNT_A as never,
      stayId: STAY_A as never,
      encounterId: ENCOUNTER_A as never,
      note: 'Paciente estavel e aceitou dieta.',
      authoredByUserId: USER_A as never,
      createdAt: '2026-07-11T12:00:00.000Z'
    };

    await inAccount(ACCOUNT_A, () => repository.create(progress));
    const loaded = await inAccount(ACCOUNT_A, () => repository.findByStayId(progress.stayId));
    expect(loaded).toEqual([progress]);

    const hidden = await inAccount(ACCOUNT_B, () => repository.findByStayId(progress.stayId));
    expect(hidden).toEqual([]);
  });

  it('round-trips a surgery case and hides it from another account', async () => {
    const repository = new DatabaseSurgeryCaseRepository(getDatabaseClient());
    const surgeryCase: SurgeryCaseSummary = {
      id: randomUUID() as never,
      accountId: ACCOUNT_A as never,
      encounterId: ENCOUNTER_A as never,
      patientId: PATIENT_A as never,
      procedureName: 'Ovariohisterectomia',
      status: 'requested',
      surgeonUserId: USER_A,
      surgicalTeam: [USER_A],
      preparationNotes: 'Jejum confirmado.',
      scheduledAt: '2026-07-12T12:00:00.000Z',
      createdAt: '2026-07-11T12:00:00.000Z',
      updatedAt: '2026-07-11T12:00:00.000Z'
    };

    await inAccount(ACCOUNT_A, () => repository.create(surgeryCase));
    const loaded = await inAccount(ACCOUNT_A, () => repository.findById(surgeryCase.id));
    expect(loaded).toEqual(surgeryCase);

    const hidden = await inAccount(ACCOUNT_B, () => repository.findById(surgeryCase.id));
    expect(hidden).toBeNull();
  });

  it.each([
    ['inpatient_progress', STAY_B, ENCOUNTER_B, PATIENT_B, USER_B],
    ['surgery_cases', STAY_B, ENCOUNTER_B, PATIENT_B, USER_B]
  ] as const)('rejects a coherent account B %s payload under account A context', async (kind) => {
    if (kind === 'inpatient_progress') {
      const repository = new DatabaseInpatientProgressRepository(getDatabaseClient());
      await expect(
        inAccount(ACCOUNT_A, () =>
          repository.create({
            id: randomUUID() as never,
            accountId: ACCOUNT_B as never,
            stayId: STAY_B as never,
            encounterId: ENCOUNTER_B as never,
            note: 'Payload de outra conta.',
            authoredByUserId: USER_B as never,
            createdAt: '2026-07-11T12:00:00.000Z'
          })
        )
      ).rejects.toThrow();
      return;
    }

    const repository = new DatabaseSurgeryCaseRepository(getDatabaseClient());
    await expect(
      inAccount(ACCOUNT_A, () =>
        repository.create({
          id: randomUUID() as never,
          accountId: ACCOUNT_B as never,
          encounterId: ENCOUNTER_B as never,
          patientId: PATIENT_B as never,
          procedureName: 'Payload de outra conta',
          status: 'requested',
          surgeonUserId: USER_B,
          createdAt: '2026-07-11T12:00:00.000Z',
          updatedAt: '2026-07-11T12:00:00.000Z'
        })
      )
    ).rejects.toThrow();
  });

  it('filters direct SQL reads through the restricted RLS role', async () => {
    const client = await getTestPool().connect();
    try {
      await client.query('BEGIN');
      await activateRlsRole(client);
      await setAccountContext(client, ACCOUNT_A);

      for (const table of ADVANCED_CARE_TABLES) {
        const result = await client.query<{ account_id: string }>(
          `SELECT account_id FROM ${table}`
        );
        expect(result.rows.every((row) => row.account_id === ACCOUNT_A)).toBe(true);
      }
    } finally {
      await client.query('ROLLBACK').catch(() => undefined);
      client.release();
    }
  });
});
