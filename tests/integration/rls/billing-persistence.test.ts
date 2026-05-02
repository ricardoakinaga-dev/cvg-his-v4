import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { DatabaseBillingRepository } from '@cvg-his-v2/module-billing';
import { closeDatabaseClient, createDatabaseClient } from '@cvg-his-v2/shared-database';
import type {
  AccountId,
  BillingItemSummary,
  BillingRecordSummary,
  EncounterId,
  UserId
} from '@cvg-his-v2/shared-types';
import { runWithTenantContext } from '@cvg-his-v2/tenant-context';

import { getTestPool } from '../../db/db-admin.js';
import { queryOne, uuid } from '../../helpers/db-helpers.js';
import { activateRlsRole, setAccountContext } from '../../helpers/rls-helpers.js';
import { TEST_DB_URL } from '../../setup/env.js';

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
const RLS_ENCOUNTER_B = uuid();
const REPOSITORY_ENCOUNTER_A = uuid();
const BLOCKED_ENCOUNTER_A = uuid();
const RLS_RECORD_A = `bill-rls-${uuid()}`;
const RLS_RECORD_B = `bill-rls-${uuid()}`;
const RLS_ITEM_A = `billitem-rls-${uuid()}`;
const RLS_ITEM_B = `billitem-rls-${uuid()}`;
const REPOSITORY_RECORD_A = `bill-repository-${uuid()}`;
const REPOSITORY_ITEM_A = `billitem-repository-${uuid()}`;

async function seedBaseRows(): Promise<void> {
  const pool = getTestPool();
  await pool.query(
    `
      INSERT INTO tenants (id, slug, name, status)
      VALUES ($1, $2, 'Billing RLS Tenant', 'active')
      ON CONFLICT (id) DO NOTHING
    `,
    [TENANT_ID, `billing-rls-${TENANT_ID.slice(0, 8)}`]
  );

  await pool.query(
    `
      INSERT INTO accounts (id, tenant_id, slug, name)
      VALUES ($1, $3, $4, 'Billing Account A'),
             ($2, $3, $5, 'Billing Account B')
      ON CONFLICT (id) DO NOTHING
    `,
    [
      ACCOUNT_A,
      ACCOUNT_B,
      TENANT_ID,
      `billing-a-${ACCOUNT_A.slice(0, 8)}`,
      `billing-b-${ACCOUNT_B.slice(0, 8)}`
    ]
  );

  await pool.query(
    `
      INSERT INTO users (id, account_id, email, password_hash, full_name)
      VALUES ($1, $3, $5, 'hash', 'Billing User A'),
             ($2, $4, $6, 'hash', 'Billing User B')
      ON CONFLICT (id) DO NOTHING
    `,
    [
      USER_A,
      USER_B,
      ACCOUNT_A,
      ACCOUNT_B,
      `billing-a-${USER_A}@example.com`,
      `billing-b-${USER_B}@example.com`
    ]
  );

  await pool.query(
    `
      INSERT INTO owners (id, account_id, full_name)
      VALUES ($1, $3, 'Billing Owner A'),
             ($2, $4, 'Billing Owner B')
      ON CONFLICT (id) DO NOTHING
    `,
    [OWNER_A, OWNER_B, ACCOUNT_A, ACCOUNT_B]
  );

  await pool.query(
    `
      INSERT INTO patients (id, account_id, owner_id, name, species)
      VALUES ($1, $3, $5, 'Billing Patient A', 'canine'),
             ($2, $4, $6, 'Billing Patient B', 'feline')
      ON CONFLICT (id) DO NOTHING
    `,
    [PATIENT_A, PATIENT_B, ACCOUNT_A, ACCOUNT_B, OWNER_A, OWNER_B]
  );

  await pool.query(
    `
      INSERT INTO encounters (id, account_id, patient_id, owner_id, opened_by_user_id, reason)
      VALUES ($1, $5, $7, $9, $11, 'Billing RLS A'),
             ($2, $6, $8, $10, $12, 'Billing RLS B'),
             ($3, $5, $7, $9, $11, 'Billing repository A'),
             ($4, $5, $7, $9, $11, 'Billing blocked A')
      ON CONFLICT (id) DO NOTHING
    `,
    [
      RLS_ENCOUNTER_A,
      RLS_ENCOUNTER_B,
      REPOSITORY_ENCOUNTER_A,
      BLOCKED_ENCOUNTER_A,
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
      INSERT INTO billing_records (
        id, account_id, encounter_id, patient_id, owner_id, status, subtotal_amount, currency
      )
      VALUES ($1, $3, $5, $7, $9, 'estimated', 120, 'BRL'),
             ($2, $4, $6, $8, $10, 'estimated', 210, 'BRL')
      ON CONFLICT (id) DO NOTHING
    `,
    [
      RLS_RECORD_A,
      RLS_RECORD_B,
      ACCOUNT_A,
      ACCOUNT_B,
      RLS_ENCOUNTER_A,
      RLS_ENCOUNTER_B,
      PATIENT_A,
      PATIENT_B,
      OWNER_A,
      OWNER_B
    ]
  );

  await pool.query(
    `
      INSERT INTO billing_items (
        id, account_id, billing_record_id, encounter_id, item_type, description,
        quantity, unit_price_amount, total_amount, created_by_user_id
      )
      VALUES ($1, $3, $5, $7, 'service', 'Consulta A', 1, 120, 120, $9),
             ($2, $4, $6, $8, 'exam', 'Exame B', 1, 210, 210, $10)
      ON CONFLICT (id) DO NOTHING
    `,
    [
      RLS_ITEM_A,
      RLS_ITEM_B,
      ACCOUNT_A,
      ACCOUNT_B,
      RLS_RECORD_A,
      RLS_RECORD_B,
      RLS_ENCOUNTER_A,
      RLS_ENCOUNTER_B,
      USER_A,
      USER_B
    ]
  );
}

async function cleanupRows(): Promise<void> {
  const pool = getTestPool();
  await pool.query('DELETE FROM billing_items WHERE account_id = ANY($1::uuid[])', [
    [ACCOUNT_A, ACCOUNT_B]
  ]);
  await pool.query('DELETE FROM billing_records WHERE account_id = ANY($1::uuid[])', [
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
  await seedBaseRows();
});

afterAll(async () => {
  await cleanupRows();
  await closeDatabaseClient();
});

describe('EP-BILL-1 billing persistence migration', () => {
  it('applies migration 0044 and creates billing tables', async () => {
    const migration = await queryOne<{ count: number }>(
      `SELECT COUNT(*)::int AS count
       FROM drizzle_migrations
       WHERE migration_name = '0044_billing_records_items'`
    );
    const tables = await queryOne<{ count: number }>(
      `SELECT COUNT(*)::int AS count
       FROM information_schema.tables
       WHERE table_schema = 'public'
         AND table_name IN ('billing_records', 'billing_items')`
    );

    expect(migration?.count).toBe(1);
    expect(tables?.count).toBe(2);
  });

  it.each([
    ['billing_records', 'billing_records_tenant_isolation'],
    ['billing_items', 'billing_items_tenant_isolation']
  ])('%s has RLS enabled and exposes tenant policy %s', async (tableName, policyName) => {
    const result = await queryOne<{ rowsecurity: boolean; policy_count: number }>(
      `SELECT t.rowsecurity, COUNT(p.policyname)::int AS policy_count
       FROM pg_tables t
       LEFT JOIN pg_policies p
         ON p.schemaname = t.schemaname
        AND p.tablename = t.tablename
        AND p.policyname = $2
       WHERE t.schemaname = 'public' AND t.tablename = $1
       GROUP BY t.rowsecurity`,
      [tableName, policyName]
    );

    expect(result?.rowsecurity).toBe(true);
    expect(result?.policy_count).toBe(1);
  });
});

describe('EP-BILL-1 billing RLS isolation', () => {
  it.each([
    ['billing_records', RLS_RECORD_A],
    ['billing_items', RLS_ITEM_A]
  ])('account B cannot read account A row from %s', async (tableName, rowId) => {
    const client = await getTestPool().connect();
    try {
      await client.query('BEGIN');
      await activateRlsRole(client);
      await setAccountContext(client, ACCOUNT_B);

      const result = await client.query(
        `SELECT COUNT(*)::int AS count FROM ${tableName} WHERE id = $1`,
        [rowId]
      );

      expect(result.rows[0].count).toBe(0);
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  });

  it.each([
    ['billing_records', RLS_RECORD_B],
    ['billing_items', RLS_ITEM_B]
  ])('account B can read its own row from %s', async (tableName, rowId) => {
    const client = await getTestPool().connect();
    try {
      await client.query('BEGIN');
      await activateRlsRole(client);
      await setAccountContext(client, ACCOUNT_B);

      const result = await client.query(
        `SELECT COUNT(*)::int AS count FROM ${tableName} WHERE id = $1`,
        [rowId]
      );

      expect(result.rows[0].count).toBe(1);
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  });

  it('blocks billing_records inserts for another account', async () => {
    const client = await getTestPool().connect();
    try {
      await client.query('BEGIN');
      await activateRlsRole(client);
      await setAccountContext(client, ACCOUNT_B);

      await expect(
        client.query(
          `INSERT INTO billing_records (
            id, account_id, encounter_id, patient_id, owner_id, status, subtotal_amount, currency
          )
          VALUES ($1, $2, $3, $4, $5, 'draft', 0, 'BRL')`,
          [`bill-blocked-${uuid()}`, ACCOUNT_A, BLOCKED_ENCOUNTER_A, PATIENT_A, OWNER_A]
        )
      ).rejects.toThrow();

      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  });

  it('blocks billing_items inserts for another account', async () => {
    const client = await getTestPool().connect();
    try {
      await client.query('BEGIN');
      await activateRlsRole(client);
      await setAccountContext(client, ACCOUNT_B);

      await expect(
        client.query(
          `INSERT INTO billing_items (
            id, account_id, billing_record_id, encounter_id, item_type, description,
            quantity, unit_price_amount, total_amount, created_by_user_id
          )
          VALUES ($1, $2, $3, $4, 'service', 'Blocked item', 1, 10, 10, $5)`,
          [`billitem-blocked-${uuid()}`, ACCOUNT_A, RLS_RECORD_A, RLS_ENCOUNTER_A, USER_A]
        )
      ).rejects.toThrow();

      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  });
});

describe('EP-BILL-1 database billing repository', () => {
  it('persists records and items and keeps subtotal in billing_records', async () => {
    const repository = new DatabaseBillingRepository();
    const createdAt = '2026-05-01T00:00:00.000Z';
    const record: BillingRecordSummary = {
      id: REPOSITORY_RECORD_A as never,
      accountId: ACCOUNT_A as AccountId,
      encounterId: REPOSITORY_ENCOUNTER_A as EncounterId,
      patientId: PATIENT_A as never,
      ownerId: OWNER_A as never,
      status: 'draft',
      subtotalAmount: 0,
      currency: 'BRL',
      createdAt,
      updatedAt: createdAt
    };
    const item: BillingItemSummary = {
      id: REPOSITORY_ITEM_A as never,
      billingRecordId: REPOSITORY_RECORD_A as never,
      accountId: ACCOUNT_A as AccountId,
      encounterId: REPOSITORY_ENCOUNTER_A as EncounterId,
      itemType: 'service',
      description: 'Consulta persistida',
      quantity: 2,
      unitPriceAmount: 75,
      totalAmount: 150,
      createdByUserId: USER_A as UserId,
      createdAt
    };

    await runWithTenantContext(
      {
        tenantId: TENANT_ID,
        accountId: ACCOUNT_A,
        userId: USER_A,
        correlationId: 'billing-repository-test'
      },
      async () => {
        await repository.createRecord(record);
        await repository.createItem(item);
      }
    );

    const persisted = await runWithTenantContext(
      {
        tenantId: TENANT_ID,
        accountId: ACCOUNT_A,
        userId: USER_A,
        correlationId: 'billing-repository-read-test'
      },
      async () => {
        const foundRecord = await repository.findRecordByEncounter(
          ACCOUNT_A as AccountId,
          REPOSITORY_ENCOUNTER_A as EncounterId
        );
        const foundItems = await repository.findItemsByRecord(
          ACCOUNT_A as AccountId,
          REPOSITORY_RECORD_A as never
        );
        return { foundRecord, foundItems };
      }
    );

    expect(persisted.foundRecord?.id).toBe(REPOSITORY_RECORD_A);
    expect(persisted.foundRecord?.subtotalAmount).toBe(150);
    expect(persisted.foundItems).toHaveLength(1);
    expect(persisted.foundItems[0]?.totalAmount).toBe(150);
  });
});
