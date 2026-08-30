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
const billingRecordId = `daily-charge-billing-${randomUUID()}`;
const dailyChargeId = `stayday-${randomUUID()}`;
const dailyChargeStayId = randomUUID();

beforeAll(async () => {
  createDatabaseClient(TEST_DB_URL);
  const pool = getTestPool();
  const suffix = accountId.replaceAll('-', '');
  await pool.query(
    `INSERT INTO tenants (id, slug, name, status) VALUES ($1, $2, 'Daily charge tenant', 'active')`,
    [tenantId, `daily-charge-${suffix}`]
  );
  await pool.query(
    `INSERT INTO accounts (id, tenant_id, slug, name) VALUES ($1, $2, $3, 'Daily charge account')`,
    [accountId, tenantId, `daily-charge-${suffix}`]
  );
  await pool.query(
    `INSERT INTO users (id, account_id, username, email, password_hash, full_name)
     VALUES ($1, $2, $3, $4, 'hash', 'Daily charge operator')`,
    [userId, accountId, `daily_charge_${suffix}`, `daily-charge-${suffix}@example.test`]
  );
  await pool.query(
    `INSERT INTO owners (id, account_id, full_name) VALUES ($1, $2, 'Daily charge owner')`,
    [ownerId, accountId]
  );
  await pool.query(
    `INSERT INTO patients (id, account_id, owner_id, name, species)
     VALUES ($1, $2, $3, 'Daily charge patient', 'canine')`,
    [patientId, accountId, ownerId]
  );
  await pool.query(
    `INSERT INTO encounters (id, account_id, patient_id, owner_id, status, opened_by_user_id)
     VALUES ($1, $2, $3, $4, 'open', $5)`,
    [encounterId, accountId, patientId, ownerId, userId]
  );
  await pool.query(
    `INSERT INTO billing_records (id, account_id, encounter_id, patient_id, owner_id, status, subtotal_amount, currency)
     VALUES ($1, $2, $3, $4, $5, 'open', 180, 'BRL')`,
    [billingRecordId, accountId, encounterId, patientId, ownerId]
  );
});

afterAll(async () => {
  const pool = getTestPool();
  await pool.query('DELETE FROM billing_items WHERE account_id = $1', [accountId]);
  await pool.query('DELETE FROM inpatient_daily_charges WHERE account_id = $1', [accountId]);
  await pool.query('DELETE FROM billing_records WHERE account_id = $1', [accountId]);
  await pool.query('DELETE FROM inpatient_stays WHERE account_id = $1', [accountId]);
  await pool.query('DELETE FROM encounters WHERE account_id = $1', [accountId]);
  await pool.query('DELETE FROM patients WHERE account_id = $1', [accountId]);
  await pool.query('DELETE FROM owners WHERE account_id = $1', [accountId]);
  await pool.query('DELETE FROM users WHERE account_id = $1', [accountId]);
  await pool.query('DELETE FROM accounts WHERE id = $1', [accountId]);
  await pool.query('DELETE FROM tenants WHERE id = $1', [tenantId]);
  await closeDatabaseClient();
});

describe('inpatient daily charge -> billing idempotency', () => {
  it('accepts the source type, resolves the existing item, and rejects a duplicate source', async () => {
    const pool = getTestPool();
    const itemId = randomUUID();
    await pool.query(
      `INSERT INTO billing_items (
         id, account_id, billing_record_id, encounter_id, item_type, description,
         quantity, unit_price_amount, total_amount, source_entity_type, source_entity_id,
         created_by_user_id
       ) VALUES ($1, $2, $3, $4, 'daily_rate', 'Diaria UTI', 1, 180, 180,
                 'inpatient_daily_charge', $5, $6)`,
      [itemId, accountId, billingRecordId, encounterId, dailyChargeId, userId]
    );

    const repository = new DatabaseBillingRepository();
    const existing = await runWithTenantContext(
      {
        tenantId,
        accountId,
        userId,
        correlationId: 'daily-charge-idempotency-read'
      },
      () =>
        repository.findItemBySource!(accountId as never, 'inpatient_daily_charge', dailyChargeId)
    );
    expect(existing?.id).toBe(itemId);
    expect(existing?.sourceEntityType).toBe('inpatient_daily_charge');

    await expect(
      pool.query(
        `INSERT INTO billing_items (
           id, account_id, billing_record_id, encounter_id, item_type, description,
           quantity, unit_price_amount, total_amount, source_entity_type, source_entity_id,
           created_by_user_id
         ) VALUES ($1, $2, $3, $4, 'daily_rate', 'Diaria UTI', 1, 180, 180,
                   'inpatient_daily_charge', $5, $6)`,
        [randomUUID(), accountId, billingRecordId, encounterId, dailyChargeId, userId]
      )
    ).rejects.toMatchObject({ code: '23505' });

    const count = await pool.query<{ readonly count: string }>(
      `SELECT COUNT(*)::text AS count
         FROM billing_items
        WHERE account_id = $1 AND source_entity_type = 'inpatient_daily_charge'
          AND source_entity_id = $2`,
      [accountId, dailyChargeId]
    );
    expect(count.rows[0]?.count).toBe('1');
  });

  it('converges two API instances racing to bill the same source item', async () => {
    const pool = getTestPool();
    await pool.query('DELETE FROM billing_items WHERE account_id = $1', [accountId]);
    await pool.query('DELETE FROM billing_records WHERE account_id = $1', [accountId]);
    const repository = new DatabaseBillingRepository();
    const encounters = {
      getOrThrow(id: string) {
        return {
          id,
          accountId,
          patientId,
          ownerId
        };
      }
    };
    const firstRuntime = new BillingService(encounters as never, { repository });
    const secondRuntime = new BillingService(encounters as never, {
      repository: new DatabaseBillingRepository()
    });
    const payload = {
      encounterId,
      itemType: 'daily_rate' as const,
      description: 'Diaria UTI',
      quantity: 1,
      unitPriceAmount: 180,
      sourceEntityType: 'inpatient_daily_charge' as const,
      sourceEntityId: dailyChargeId
    };

    const [first, second] = await runWithTenantContext(
      {
        tenantId,
        accountId,
        userId,
        correlationId: 'daily-charge-idempotency-race'
      },
      () =>
        Promise.all([
          firstRuntime.addItem(accountId as never, userId as never, payload),
          secondRuntime.addItem(accountId as never, userId as never, payload)
        ])
    );

    expect(first.id).toBe(second.id);
    const count = await pool.query<{ readonly count: string }>(
      `SELECT COUNT(*)::text AS count
         FROM billing_items
        WHERE account_id = $1 AND source_entity_type = 'inpatient_daily_charge'
          AND source_entity_id = $2`,
      [accountId, dailyChargeId]
    );
    expect(count.rows[0]?.count).toBe('1');
  });

  it('converges distinct-key billing races inside independent tenant unit-of-work transactions', async () => {
    const pool = getTestPool();
    await pool.query('DELETE FROM billing_items WHERE account_id = $1', [accountId]);
    await pool.query('DELETE FROM billing_records WHERE account_id = $1', [accountId]);

    const pauseFunction = `daily_charge_outer_uow_race_pause_${accountId.replaceAll('-', '')}`;
    const pauseTrigger = `daily_charge_outer_uow_race_trigger_${accountId.replaceAll('-', '')}`;
    await pool.query(
      `CREATE OR REPLACE FUNCTION ${pauseFunction}()
       RETURNS trigger
       LANGUAGE plpgsql
       AS $$
       BEGIN
         PERFORM pg_sleep(0.5);
         RETURN NEW;
       END;
       $$`
    );
    await pool.query(
      `CREATE TRIGGER ${pauseTrigger}
         BEFORE INSERT ON billing_records
         FOR EACH ROW
         WHEN (NEW.encounter_id = '${encounterId}'::uuid)
         EXECUTE FUNCTION ${pauseFunction}()`
    );

    const repository = new DatabaseBillingRepository();
    const encounters = {
      getOrThrow(id: string) {
        return {
          id,
          accountId,
          patientId,
          ownerId
        };
      }
    };
    const firstRuntime = new BillingService(encounters as never, { repository });
    const secondRuntime = new BillingService(encounters as never, {
      repository: new DatabaseBillingRepository()
    });
    const payload = {
      encounterId,
      itemType: 'daily_rate' as const,
      description: 'Diaria UTI outer UoW',
      quantity: 1,
      unitPriceAmount: 180,
      sourceEntityType: 'inpatient_daily_charge' as const,
      sourceEntityId: dailyChargeId
    };
    const unitOfWork = createTenantUnitOfWork(getPool());
    const execute = (service: BillingService, idempotencyKey: string, correlationId: string) =>
      unitOfWork.execute(
        {
          accountId,
          actorUserId: userId,
          correlationId,
          operation: 'billing.daily-charge.outer-uow-race',
          idempotencyKey
        },
        payload as JsonValue,
        async () =>
          (await service.addItem(
            accountId as never,
            userId as never,
            payload
          )) as unknown as JsonValue
      );

    try {
      const outcomes = await runWithTenantContext(
        {
          tenantId,
          accountId,
          userId,
          correlationId: 'daily-charge-outer-uow-race'
        },
        () =>
          Promise.allSettled([
            execute(firstRuntime, randomUUID(), 'daily-charge-outer-uow-first'),
            execute(secondRuntime, randomUUID(), 'daily-charge-outer-uow-second')
          ])
      );
      const executions = outcomes.map((outcome) => {
        if (outcome.status === 'rejected') throw outcome.reason;
        return outcome.value;
      });
      const [first, second] = executions;

      expect((first.value as { readonly id: string }).id).toBe(
        (second.value as { readonly id: string }).id
      );
    } finally {
      await pool.query(`DROP TRIGGER IF EXISTS ${pauseTrigger} ON billing_records`);
      await pool.query(`DROP FUNCTION IF EXISTS ${pauseFunction}()`);
    }

    const count = await pool.query<{ readonly count: string }>(
      `SELECT COUNT(*)::text AS count
         FROM billing_items
        WHERE account_id = $1 AND source_entity_type = 'inpatient_daily_charge'
          AND source_entity_id = $2`,
      [accountId, dailyChargeId]
    );
    expect(count.rows[0]?.count).toBe('1');
  });

  it('keeps divergent source values as a typed conflict inside the outer tenant transaction', async () => {
    const pool = getTestPool();
    await pool.query('DELETE FROM billing_items WHERE account_id = $1', [accountId]);
    await pool.query('DELETE FROM billing_records WHERE account_id = $1', [accountId]);
    await pool.query(
      `INSERT INTO billing_records (
         id, account_id, encounter_id, patient_id, owner_id, status, subtotal_amount, currency
       ) VALUES ($1, $2, $3, $4, $5, 'open', 0, 'BRL')`,
      [billingRecordId, accountId, encounterId, patientId, ownerId]
    );
    await pool.query(
      `INSERT INTO inpatient_stays (
         id, account_id, patient_id, owner_id, encounter_id, status, unit, ward, bed,
         admitted_by_user_id
       ) VALUES ($1, $2, $3, $4, $5, 'admitted', 'Internacao', 'Ala A', $6, $7)`,
      [dailyChargeStayId, accountId, patientId, ownerId, encounterId, 'A-race', userId]
    );
    await pool.query(
      `INSERT INTO inpatient_daily_charges (
         id, account_id, stay_id, encounter_id, patient_id, description, charge_date,
         quantity, unit_amount, total_amount, status, created_by_user_id, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, 'Diaria UTI original', CURRENT_DATE, 1, 180, 180,
         'pending', $6, clock_timestamp(), clock_timestamp())`,
      [dailyChargeId, accountId, dailyChargeStayId, encounterId, patientId, userId]
    );

    const pauseFunction = `daily_charge_outer_uow_item_pause_${accountId.replaceAll('-', '')}`;
    const pauseTrigger = `daily_charge_outer_uow_item_trigger_${accountId.replaceAll('-', '')}`;
    await pool.query(
      `CREATE OR REPLACE FUNCTION ${pauseFunction}()
       RETURNS trigger
       LANGUAGE plpgsql
       AS $$
       BEGIN
         PERFORM pg_sleep(0.5);
         RETURN NEW;
       END;
       $$`
    );
    await pool.query(
      `CREATE TRIGGER ${pauseTrigger}
         BEFORE INSERT ON billing_items
         FOR EACH ROW
         WHEN (NEW.source_entity_id = '${dailyChargeId}')
         EXECUTE FUNCTION ${pauseFunction}()`
    );

    const repository = new DatabaseBillingRepository();
    const encounters = {
      getOrThrow(id: string) {
        return {
          id,
          accountId,
          patientId,
          ownerId
        };
      }
    };
    const firstRuntime = new BillingService(encounters as never, { repository });
    const secondRuntime = new BillingService(encounters as never, {
      repository: new DatabaseBillingRepository()
    });
    const firstPayload = {
      encounterId,
      itemType: 'daily_rate' as const,
      description: 'Diaria UTI valor original',
      quantity: 1,
      unitPriceAmount: 180,
      sourceEntityType: 'inpatient_daily_charge' as const,
      sourceEntityId: dailyChargeId
    };
    const secondPayload = {
      ...firstPayload,
      description: 'Diaria UTI valor divergente'
    };
    const unitOfWork = createTenantUnitOfWork(getPool());
    const execute = (
      service: BillingService,
      payload: typeof firstPayload,
      idempotencyKey: string,
      correlationId: string
    ) =>
      unitOfWork.execute(
        {
          accountId,
          actorUserId: userId,
          correlationId,
          operation: 'billing.daily-charge.outer-uow-divergent-source',
          idempotencyKey
        },
        payload as JsonValue,
        async () =>
          (await service.addItem(
            accountId as never,
            userId as never,
            payload
          )) as unknown as JsonValue
      );

    try {
      const outcomes = await runWithTenantContext(
        {
          tenantId,
          accountId,
          userId,
          correlationId: 'daily-charge-outer-uow-divergent-source'
        },
        () =>
          Promise.allSettled([
            execute(firstRuntime, firstPayload, randomUUID(), 'daily-charge-divergent-first'),
            execute(secondRuntime, secondPayload, randomUUID(), 'daily-charge-divergent-second')
          ])
      );

      expect(outcomes.filter((outcome) => outcome.status === 'fulfilled')).toHaveLength(1);
      const rejected = outcomes.filter(
        (outcome): outcome is PromiseRejectedResult => outcome.status === 'rejected'
      );
      expect(rejected).toHaveLength(1);
      expect(rejected[0]?.reason).toMatchObject({ code: 'CONFLICT', statusCode: 409 });
    } finally {
      await pool.query(`DROP TRIGGER IF EXISTS ${pauseTrigger} ON billing_items`);
      await pool.query(`DROP FUNCTION IF EXISTS ${pauseFunction}()`);
    }

    const count = await pool.query<{ readonly count: string }>(
      `SELECT COUNT(*)::text AS count
         FROM billing_items
        WHERE account_id = $1 AND source_entity_type = 'inpatient_daily_charge'
          AND source_entity_id = $2`,
      [accountId, dailyChargeId]
    );
    expect(count.rows[0]?.count).toBe('1');

    const persistedDailyCharge = await pool.query<{
      readonly status: string;
      readonly billingRecordId: string | null;
    }>(
      `SELECT status, billing_record_id::text AS "billingRecordId"
         FROM inpatient_daily_charges
        WHERE account_id = $1 AND id = $2`,
      [accountId, dailyChargeId]
    );
    expect(persistedDailyCharge.rows).toEqual([{ status: 'pending', billingRecordId: null }]);
  });
});
