import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  ClinicalHandoffsService,
  DatabaseClinicalHandoffRepository,
  DatabaseEncounterRepository,
  EncountersService
} from '@cvg-his-v2/module-encounters';
import { DatabaseOwnerRepository, OwnersService } from '@cvg-his-v2/module-owners';
import { DatabasePatientRepository, PatientsService } from '@cvg-his-v2/module-patients';
import {
  closeDatabaseClient,
  createDatabaseClient,
  getDatabaseClient
} from '@cvg-his-v2/shared-database';
import type { AccountId, ClinicalHandoffId, EncounterId, UserId } from '@cvg-his-v2/shared-types';
import { runWithTenantContext } from '@cvg-his-v2/tenant-context';

import { getTestPool } from '../db/db-admin.js';
import { queryOne, uuid } from '../helpers/db-helpers.js';
import { activateRlsRole, setAccountContext } from '../helpers/rls-helpers.js';
import { TEST_DB_URL } from '../setup/env.js';

const TENANT_ID = uuid();
const ACCOUNT_A = uuid();
const ACCOUNT_B = uuid();
const USER_A = uuid();
const USER_B = uuid();
const OWNER_A = uuid();
const OWNER_B = uuid();
const PATIENT_A = uuid();
const PATIENT_B = uuid();
const RLS_ENCOUNTER_A = uuid();
const ENCOUNTER_B = uuid();
const HYDRATION_ENCOUNTER_A = uuid();

async function seedBaseRows(): Promise<void> {
  const pool = getTestPool();
  await pool.query(
    `
      INSERT INTO tenants (id, slug, name, status)
      VALUES ($1, $2, 'Clinical Handoff Tenant', 'active')
      ON CONFLICT (id) DO NOTHING
    `,
    [TENANT_ID, `handoff-${TENANT_ID.slice(0, 8)}`]
  );

  await pool.query(
    `
      INSERT INTO accounts (id, tenant_id, slug, name)
      VALUES ($1, $3, $4, 'Clinical Handoff Account A'),
             ($2, $3, $5, 'Clinical Handoff Account B')
      ON CONFLICT (id) DO NOTHING
    `,
    [
      ACCOUNT_A,
      ACCOUNT_B,
      TENANT_ID,
      `handoff-a-${ACCOUNT_A.slice(0, 8)}`,
      `handoff-b-${ACCOUNT_B.slice(0, 8)}`
    ]
  );

  await pool.query(
    `
      INSERT INTO users (id, account_id, email, password_hash, full_name)
      VALUES ($1, $3, $5, 'hash', 'Clinical Handoff User A'),
             ($2, $4, $6, 'hash', 'Clinical Handoff User B')
      ON CONFLICT (id) DO NOTHING
    `,
    [
      USER_A,
      USER_B,
      ACCOUNT_A,
      ACCOUNT_B,
      `handoff-a-${USER_A}@example.com`,
      `handoff-b-${USER_B}@example.com`
    ]
  );

  await pool.query(
    `
      INSERT INTO owners (id, account_id, full_name)
      VALUES ($1, $3, 'Clinical Handoff Owner A'),
             ($2, $4, 'Clinical Handoff Owner B')
      ON CONFLICT (id) DO NOTHING
    `,
    [OWNER_A, OWNER_B, ACCOUNT_A, ACCOUNT_B]
  );

  await pool.query(
    `
      INSERT INTO patients (id, account_id, owner_id, name, species)
      VALUES ($1, $3, $5, 'Clinical Handoff Patient A', 'canine'),
             ($2, $4, $6, 'Clinical Handoff Patient B', 'feline')
      ON CONFLICT (id) DO NOTHING
    `,
    [PATIENT_A, PATIENT_B, ACCOUNT_A, ACCOUNT_B, OWNER_A, OWNER_B]
  );

  await pool.query(
    `
      INSERT INTO encounters (id, account_id, patient_id, owner_id, opened_by_user_id, reason)
      VALUES ($1, $4, $6, $8, $10, 'Clinical handoff RLS A'),
             ($2, $5, $7, $9, $11, 'Clinical handoff B'),
             ($3, $4, $6, $8, $10, 'Clinical handoff hydration A')
      ON CONFLICT (id) DO NOTHING
    `,
    [
      RLS_ENCOUNTER_A,
      ENCOUNTER_B,
      HYDRATION_ENCOUNTER_A,
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
}

async function cleanupRows(): Promise<void> {
  const pool = getTestPool();
  await pool.query('DELETE FROM clinical_handoffs WHERE account_id = ANY($1::uuid[])', [
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

function createRuntime() {
  const db = getDatabaseClient();
  const owners = new OwnersService({
    ownerRepository: new DatabaseOwnerRepository(db),
    seedOwners: []
  });
  const patients = new PatientsService({
    owners,
    patientRepository: new DatabasePatientRepository(db),
    seedPatients: [],
    seedLinks: []
  });
  const encounters = new EncountersService({
    owners,
    patients,
    encounterRepository: new DatabaseEncounterRepository(db)
  });
  const clinicalHandoffs = new ClinicalHandoffsService(encounters, {
    repository: new DatabaseClinicalHandoffRepository()
  });

  return { owners, patients, encounters, clinicalHandoffs };
}

async function hydrateRuntime(runtime: ReturnType<typeof createRuntime>): Promise<void> {
  await runtime.owners.hydrateFromDatabase(ACCOUNT_A as AccountId);
  await runtime.patients.hydrateFromDatabase(ACCOUNT_A as AccountId);
  await runtime.encounters.hydrateFromDatabase(ACCOUNT_A as AccountId);
  await runtime.clinicalHandoffs.hydrateFromDatabase(ACCOUNT_A as AccountId);
}

beforeAll(async () => {
  createDatabaseClient(TEST_DB_URL);
  await seedBaseRows();
});

afterAll(async () => {
  await cleanupRows();
  await closeDatabaseClient();
});

describe('HOFF-MIN-1 clinical handoff persistence migration', () => {
  it('applies migration 0045 and creates clinical_handoffs with RLS', async () => {
    const migration = await queryOne<{ count: number }>(
      `SELECT COUNT(*)::int AS count
       FROM drizzle_migrations
       WHERE migration_name = '0045_clinical_handoffs'`
    );
    const table = await queryOne<{ count: number }>(
      `SELECT COUNT(*)::int AS count
       FROM information_schema.tables
       WHERE table_schema = 'public'
         AND table_name = 'clinical_handoffs'`
    );
    const rls = await queryOne<{ rowsecurity: boolean; policy_count: number }>(
      `SELECT t.rowsecurity, COUNT(p.policyname)::int AS policy_count
       FROM pg_tables t
       LEFT JOIN pg_policies p
         ON p.schemaname = t.schemaname
        AND p.tablename = t.tablename
        AND p.policyname = 'clinical_handoffs_tenant_isolation'
       WHERE t.schemaname = 'public' AND t.tablename = 'clinical_handoffs'
       GROUP BY t.rowsecurity`
    );

    expect(migration?.count).toBe(1);
    expect(table?.count).toBe(1);
    expect(rls?.rowsecurity).toBe(true);
    expect(rls?.policy_count).toBe(1);
  });

  it('blocks another account from reading a persisted handoff', async () => {
    const handoffId = `handoff-rls-${uuid()}` as ClinicalHandoffId;
    const repository = new DatabaseClinicalHandoffRepository();

    await runWithTenantContext(
      {
        tenantId: TENANT_ID,
        accountId: ACCOUNT_A,
        userId: USER_A,
        correlationId: 'clinical-handoff-rls-write'
      },
      async () => {
        await repository.create({
          id: handoffId,
          accountId: ACCOUNT_A as AccountId,
          encounterId: RLS_ENCOUNTER_A as EncounterId,
          ownerId: OWNER_A as never,
          patientId: PATIENT_A as never,
          originChannel: 'reception',
          fromSector: 'clinic',
          toSector: 'reception',
          fromResponsibleId: USER_A as UserId,
          toResponsibleType: 'sector',
          toResponsibleId: 'reception',
          clinicalSummary: 'RLS handoff summary',
          receptionInstructions: 'RLS handoff instructions',
          priority: 'medium',
          handoffStatus: 'sent_to_reception',
          createdBy: USER_A as UserId,
          sentBy: USER_A as UserId,
          sentAt: '2026-05-01T00:00:00.000Z',
          createdAt: '2026-05-01T00:00:00.000Z',
          updatedAt: '2026-05-01T00:00:00.000Z'
        });
      }
    );

    const client = await getTestPool().connect();
    try {
      await client.query('BEGIN');
      await activateRlsRole(client);
      await setAccountContext(client, ACCOUNT_B);

      const result = await client.query(
        `SELECT COUNT(*)::int AS count FROM clinical_handoffs WHERE id = $1`,
        [handoffId]
      );

      expect(result.rows[0].count).toBe(0);
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  });
});

describe('HOFF-MIN-1 clinical handoff repository hydration', () => {
  it('hydrates sent and acknowledged handoffs after recreating runtime services', async () => {
    let handoffId = '' as ClinicalHandoffId;

    await runWithTenantContext(
      {
        tenantId: TENANT_ID,
        accountId: ACCOUNT_A,
        userId: USER_A,
        correlationId: 'clinical-handoff-hydration-write'
      },
      async () => {
        const firstRuntime = createRuntime();
        await hydrateRuntime(firstRuntime);

        const sent = firstRuntime.clinicalHandoffs.sendToReception(
          ACCOUNT_A as AccountId,
          USER_A as UserId,
          {
            encounterId: HYDRATION_ENCOUNTER_A,
            clinicalSummary: 'Persisted HOFF-MIN-1 summary',
            receptionInstructions: 'Persisted HOFF-MIN-1 instructions',
            priority: 'high'
          }
        );
        handoffId = sent.id;

        firstRuntime.clinicalHandoffs.acknowledge(
          ACCOUNT_A as AccountId,
          USER_A as UserId,
          sent.id,
          { note: 'ACK persisted' }
        );
        await firstRuntime.clinicalHandoffs.waitForPersistence();
      }
    );

    await runWithTenantContext(
      {
        tenantId: TENANT_ID,
        accountId: ACCOUNT_A,
        userId: USER_A,
        correlationId: 'clinical-handoff-hydration-read'
      },
      async () => {
        const restartedRuntime = createRuntime();
        await hydrateRuntime(restartedRuntime);

        const hydrated = restartedRuntime.clinicalHandoffs.getOrThrow(handoffId);
        expect(hydrated.handoffStatus).toBe('acknowledged_by_reception');
        expect(hydrated.clinicalSummary).toBe('Persisted HOFF-MIN-1 summary');
        expect(hydrated.receptionInstructions).toBe('Persisted HOFF-MIN-1 instructions');
        expect(hydrated.acknowledgeNote).toBe('ACK persisted');
      }
    );
  });
});
