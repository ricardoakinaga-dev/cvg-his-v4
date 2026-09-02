import { randomUUID } from 'node:crypto';

import { BillingService, DatabaseBillingRepository } from '@cvg-his-v2/module-billing';
import {
  closeDatabaseClient,
  createDatabaseClient,
  createTenantUnitOfWork,
  getPool,
  type JsonValue
} from '@cvg-his-v2/shared-database';
import { runWithTenantContext } from '@cvg-his-v2/tenant-context';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { getTestPool } from '../../db/db-admin.js';
import { TEST_DB_URL } from '../../setup/env.js';

const tenantId = randomUUID();
const accountId = randomUUID();
const userId = randomUUID();
const ownerId = randomUUID();
const patientId = randomUUID();
const encounterId = randomUUID();
const stayId = randomUUID();
const dailyChargeId = randomUUID();

const encounter = {
  id: encounterId,
  accountId,
  patientId,
  ownerId,
  status: 'open'
};

beforeAll(async () => {
  createDatabaseClient(TEST_DB_URL);
  const pool = getTestPool();
  const suffix = accountId.replaceAll('-', '');

  await pool.query(
    `INSERT INTO tenants (id, slug, name, status)
     VALUES ($1, $2, 'Inpatient billing rollback tenant', 'active')`,
    [tenantId, `inpatient-billing-rollback-${suffix}`]
  );
  await pool.query(
    `INSERT INTO accounts (id, tenant_id, slug, name)
     VALUES ($1, $2, $3, 'Inpatient billing rollback account')`,
    [accountId, tenantId, `inpatient-billing-rollback-${suffix}`]
  );
  await pool.query(
    `INSERT INTO users (id, account_id, username, email, password_hash, full_name)
     VALUES ($1, $2, $3, $4, 'hash', 'Inpatient billing rollback operator')`,
    [
      userId,
      accountId,
      `inpatient_billing_rollback_${suffix}`,
      `inpatient-billing-rollback-${suffix}@example.test`
    ]
  );
  await pool.query(
    `INSERT INTO owners (id, account_id, full_name)
     VALUES ($1, $2, 'Inpatient billing rollback owner')`,
    [ownerId, accountId]
  );
  await pool.query(
    `INSERT INTO patients (id, account_id, owner_id, name, species)
     VALUES ($1, $2, $3, 'Inpatient billing rollback patient', 'canine')`,
    [patientId, accountId, ownerId]
  );
  await pool.query(
    `INSERT INTO encounters (id, account_id, patient_id, owner_id, status, opened_by_user_id)
     VALUES ($1, $2, $3, $4, 'open', $5)`,
    [encounterId, accountId, patientId, ownerId, userId]
  );
  await pool.query(
    `INSERT INTO inpatient_stays (
       id, account_id, patient_id, owner_id, encounter_id, status, unit, ward, bed,
       admitted_by_user_id
     ) VALUES ($1, $2, $3, $4, $5, 'admitted', 'Internacao', 'Ala A', 'A-01', $6)`,
    [stayId, accountId, patientId, ownerId, encounterId, userId]
  );
  await pool.query(
    `INSERT INTO inpatient_daily_charges (
       id, account_id, stay_id, encounter_id, patient_id, description, charge_date,
       quantity, unit_amount, total_amount, status, created_by_user_id, created_at, updated_at
     ) VALUES ($1, $2, $3, $4, $5, 'Diaria UTI', CURRENT_DATE, 1, 180, 180,
       'pending', $6, clock_timestamp(), clock_timestamp())`,
    [dailyChargeId, accountId, stayId, encounterId, patientId, userId]
  );
});

afterAll(async () => {
  const pool = getTestPool();
  await pool.query('DELETE FROM billing_items WHERE account_id = $1', [accountId]);
  await pool.query('DELETE FROM billing_records WHERE account_id = $1', [accountId]);
  await pool.query('DELETE FROM inpatient_daily_charges WHERE account_id = $1', [accountId]);
  await pool.query('DELETE FROM inpatient_stays WHERE account_id = $1', [accountId]);
  await pool.query('DELETE FROM encounters WHERE account_id = $1', [accountId]);
  await pool.query('DELETE FROM patients WHERE account_id = $1', [accountId]);
  await pool.query('DELETE FROM owners WHERE account_id = $1', [accountId]);
  await pool.query('DELETE FROM users WHERE account_id = $1', [accountId]);
  await pool.query('DELETE FROM accounts WHERE id = $1', [accountId]);
  await pool.query('DELETE FROM tenants WHERE id = $1', [tenantId]);
  await closeDatabaseClient();
});

describe('atomic inpatient daily-charge billing', () => {
  it('rolls billing artifacts back when the clinical linkage stage fails', async () => {
    const pool = getTestPool();
    const billing = new BillingService(
      {
        getOrThrow(_accountId: string, id: string) {
          if (id !== encounterId) throw new Error('Encounter not found');
          return encounter;
        }
      } as never,
      { repository: new DatabaseBillingRepository() }
    );
    const unitOfWork = createTenantUnitOfWork(getPool());
    const payload = {
      stayId,
      chargeId: dailyChargeId,
      billingRecordId: null
    } as const;

    await expect(
      runWithTenantContext(
        {
          tenantId,
          accountId,
          userId,
          correlationId: 'inpatient-daily-charge-rollback'
        },
        () =>
          unitOfWork.execute(
            {
              accountId,
              actorUserId: userId,
              correlationId: randomUUID(),
              operation: 'inpatient.daily-charges.bill',
              idempotencyKey: randomUUID()
            },
            payload as unknown as JsonValue,
            async () => {
              await billing.addItem(accountId as never, userId as never, {
                encounterId: encounterId as never,
                itemType: 'daily_rate',
                description: 'Diaria UTI',
                quantity: 1,
                unitPriceAmount: 180,
                sourceEntityType: 'inpatient_daily_charge',
                sourceEntityId: dailyChargeId
              });
              throw new Error('injected failure after billing.addItem');
            }
          )
      )
    ).rejects.toThrow('injected failure after billing.addItem');

    const state = await pool.query<{
      readonly billing_items: string;
      readonly billing_records: string;
      readonly billing_record_id: string | null;
      readonly daily_charge_status: string;
    }>(
      `SELECT
         (SELECT COUNT(*)::text FROM billing_items
           WHERE account_id = $1 AND source_entity_type = 'inpatient_daily_charge'
             AND source_entity_id = $2) AS billing_items,
         (SELECT COUNT(*)::text FROM billing_records
           WHERE account_id = $1 AND encounter_id = $3) AS billing_records,
         (SELECT billing_record_id FROM inpatient_daily_charges
           WHERE account_id = $1 AND id = $2) AS billing_record_id,
         (SELECT status FROM inpatient_daily_charges
           WHERE account_id = $1 AND id = $2) AS daily_charge_status`,
      [accountId, dailyChargeId, encounterId]
    );

    expect(state.rows[0]).toEqual({
      billing_items: '0',
      billing_records: '0',
      billing_record_id: null,
      daily_charge_status: 'pending'
    });
    await runWithTenantContext(
      {
        tenantId,
        accountId,
        userId,
        correlationId: 'inpatient-daily-charge-rollback-read'
      },
      async () => {
        await expect(billing.listItems(accountId as never, encounterId as never)).resolves.toEqual(
          []
        );
        await expect(billing.listAuthoritative({ accountId })).resolves.toEqual([]);
      }
    );
  });
});
