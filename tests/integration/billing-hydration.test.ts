import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { BillingService } from '@cvg-his-v2/module-billing';
import { DatabaseBillingRepository } from '@cvg-his-v2/module-billing';
import { DatabaseEncounterRepository, EncountersService } from '@cvg-his-v2/module-encounters';
import { DatabaseOwnerRepository, OwnersService } from '@cvg-his-v2/module-owners';
import { DatabasePatientRepository, PatientsService } from '@cvg-his-v2/module-patients';
import {
  closeDatabaseClient,
  createDatabaseClient,
  getDatabaseClient
} from '@cvg-his-v2/shared-database';
import type { AccountId, EncounterId, UserId } from '@cvg-his-v2/shared-types';
import { runWithTenantContext } from '@cvg-his-v2/tenant-context';

import { getTestPool } from '../db/db-admin.js';
import { queryOne, uuid } from '../helpers/db-helpers.js';
import { TEST_DB_URL } from '../setup/env.js';

const TENANT_ID = uuid();
const ACCOUNT_ID = uuid();
const USER_ID = uuid();
const OWNER_ID = uuid();
const PATIENT_ID = uuid();
const ENCOUNTER_ID = uuid();

async function seedEncounterFixture(): Promise<void> {
  const pool = getTestPool();
  await pool.query(
    `
      INSERT INTO tenants (id, slug, name, status)
      VALUES ($1, $2, 'Billing Hydration Tenant', 'active')
      ON CONFLICT (id) DO NOTHING
    `,
    [TENANT_ID, `billing-hydration-${TENANT_ID.slice(0, 8)}`]
  );

  await pool.query(
    `
      INSERT INTO accounts (id, tenant_id, slug, name)
      VALUES ($1, $2, $3, 'Billing Hydration Account')
      ON CONFLICT (id) DO NOTHING
    `,
    [ACCOUNT_ID, TENANT_ID, `billing-hydration-${ACCOUNT_ID.slice(0, 8)}`]
  );

  await pool.query(
    `
      INSERT INTO users (id, account_id, email, password_hash, full_name)
      VALUES ($1, $2, $3, 'hash', 'Billing Hydration User')
      ON CONFLICT (id) DO NOTHING
    `,
    [USER_ID, ACCOUNT_ID, `billing-hydration-${USER_ID}@example.com`]
  );

  await pool.query(
    `
      INSERT INTO owners (id, account_id, full_name)
      VALUES ($1, $2, 'Billing Hydration Owner')
      ON CONFLICT (id) DO NOTHING
    `,
    [OWNER_ID, ACCOUNT_ID]
  );

  await pool.query(
    `
      INSERT INTO patients (id, account_id, owner_id, name, species)
      VALUES ($1, $2, $3, 'Billing Hydration Patient', 'canine')
      ON CONFLICT (id) DO NOTHING
    `,
    [PATIENT_ID, ACCOUNT_ID, OWNER_ID]
  );

  await pool.query(
    `
      INSERT INTO encounters (id, account_id, patient_id, owner_id, opened_by_user_id, reason)
      VALUES ($1, $2, $3, $4, $5, 'Billing hydration restart flow')
      ON CONFLICT (id) DO NOTHING
    `,
    [ENCOUNTER_ID, ACCOUNT_ID, PATIENT_ID, OWNER_ID, USER_ID]
  );
}

async function cleanupFixture(): Promise<void> {
  const pool = getTestPool();
  await pool.query('DELETE FROM billing_items WHERE account_id = $1', [ACCOUNT_ID]);
  await pool.query('DELETE FROM billing_records WHERE account_id = $1', [ACCOUNT_ID]);
  await pool.query('DELETE FROM encounters WHERE account_id = $1', [ACCOUNT_ID]);
  await pool.query('DELETE FROM patients WHERE account_id = $1', [ACCOUNT_ID]);
  await pool.query('DELETE FROM owners WHERE account_id = $1', [ACCOUNT_ID]);
  await pool.query('DELETE FROM users WHERE account_id = $1', [ACCOUNT_ID]);
  await pool.query('DELETE FROM accounts WHERE id = $1', [ACCOUNT_ID]);
  await pool.query('DELETE FROM tenants WHERE id = $1', [TENANT_ID]);
}

function createBillingRuntime() {
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
  const billing = new BillingService(encounters, {
    repository: new DatabaseBillingRepository()
  });

  return { owners, patients, encounters, billing };
}

async function hydrateRuntime(runtime: ReturnType<typeof createBillingRuntime>): Promise<void> {
  await runtime.owners.hydrateFromDatabase(ACCOUNT_ID as AccountId);
  await runtime.patients.hydrateFromDatabase(ACCOUNT_ID as AccountId);
  await runtime.encounters.hydrateFromDatabase(ACCOUNT_ID as AccountId);
  await runtime.billing.hydrateFromDatabase(ACCOUNT_ID as AccountId);
}

async function countBillingRecords(): Promise<number> {
  const row = await queryOne<{ count: number }>(
    `SELECT COUNT(*)::int AS count
     FROM billing_records
     WHERE account_id = $1 AND encounter_id = $2`,
    [ACCOUNT_ID, ENCOUNTER_ID]
  );
  return row?.count ?? 0;
}

beforeAll(async () => {
  createDatabaseClient(TEST_DB_URL);
  await seedEncounterFixture();
});

afterAll(async () => {
  await cleanupFixture();
  await closeDatabaseClient();
});

describe('EP-BILL-1 billing restart hydration', () => {
  it('hydrates persisted billing record and items after recreating runtime services', async () => {
    await runWithTenantContext(
      {
        tenantId: TENANT_ID,
        accountId: ACCOUNT_ID,
        userId: USER_ID,
        correlationId: 'billing-hydration-write'
      },
      async () => {
        const firstRuntime = createBillingRuntime();
        await hydrateRuntime(firstRuntime);

        const estimate = await firstRuntime.billing.createEstimate({
          encounterId: ENCOUNTER_ID
        });
        const item = await firstRuntime.billing.addItem(USER_ID as UserId, {
          encounterId: ENCOUNTER_ID,
          itemType: 'service',
          description: 'Consulta persistida antes do restart',
          quantity: 2,
          unitPriceAmount: 80
        });

        expect(estimate.encounterId).toBe(ENCOUNTER_ID);
        expect(item.totalAmount).toBe(160);
      }
    );

    expect(await countBillingRecords()).toBe(1);

    await runWithTenantContext(
      {
        tenantId: TENANT_ID,
        accountId: ACCOUNT_ID,
        userId: USER_ID,
        correlationId: 'billing-hydration-read'
      },
      async () => {
        const restartedRuntime = createBillingRuntime();
        await hydrateRuntime(restartedRuntime);

        const hydratedRecord = await restartedRuntime.billing.findByEncounter(
          ENCOUNTER_ID as EncounterId
        );
        const hydratedItems = await restartedRuntime.billing.listItems(ENCOUNTER_ID as EncounterId);

        expect(hydratedRecord?.encounterId).toBe(ENCOUNTER_ID);
        expect(hydratedRecord?.status).toBe('estimated');
        expect(hydratedRecord?.subtotalAmount).toBe(160);
        expect(hydratedItems).toHaveLength(1);
        expect(hydratedItems[0]?.description).toBe('Consulta persistida antes do restart');
        expect(hydratedItems[0]?.totalAmount).toBe(160);
      }
    );

    expect(await countBillingRecords()).toBe(1);
  });
});
