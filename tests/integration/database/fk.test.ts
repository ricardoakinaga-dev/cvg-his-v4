import { randomUUID } from 'node:crypto';

import type { PoolClient } from 'pg';

import { getTestPool } from '../../db/db-admin.js';
import { queryOne } from '../../helpers/db-helpers.js';

// ============================================================================
// DB Foreign Key Tests — validates that essential FKs exist and function.
// Based on docs/740 section 4.
// ============================================================================

interface ForeignKeyFixture {
  accountId: string;
  ownerId: string;
  patientId: string;
  userId: string;
}

async function createForeignKeyFixture(client: PoolClient): Promise<ForeignKeyFixture> {
  const tenantId = randomUUID();
  const accountId = randomUUID();
  const ownerId = randomUUID();
  const patientId = randomUUID();
  const userId = randomUUID();

  await client.query(
    `INSERT INTO tenants (id, slug, name, status, activated_at)
     VALUES ($1, $2, $3, 'active', now())`,
    [tenantId, `fk-fixture-${tenantId.slice(0, 8)}`, 'Foreign-key fixture tenant']
  );
  await client.query(
    `INSERT INTO accounts (id, tenant_id, slug, name)
     VALUES ($1, $2, $3, $4)`,
    [accountId, tenantId, `fk-fixture-${accountId.slice(0, 8)}`, 'Foreign-key fixture account']
  );
  await client.query(
    `INSERT INTO owners (id, account_id, full_name)
     VALUES ($1, $2, 'Foreign-key fixture owner')`,
    [ownerId, accountId]
  );
  await client.query(
    `INSERT INTO patients (id, account_id, owner_id, name, species)
     VALUES ($1, $2, $3, 'Foreign-key fixture patient', 'canine')`,
    [patientId, accountId, ownerId]
  );
  await client.query(
    `INSERT INTO users (id, account_id, username, email, password_hash, full_name, is_active)
     VALUES ($1, $2, $3, $4, 'fixture-hash', 'Foreign-key fixture user', true)`,
    [
      userId,
      accountId,
      `fk-fixture-${userId.slice(0, 8)}`,
      `fk-fixture-${userId.slice(0, 8)}@example.test`
    ]
  );

  return { accountId, ownerId, patientId, userId };
}

async function withForeignKeyFixture<T>(
  callback: (client: PoolClient, fixture: ForeignKeyFixture) => Promise<T>
): Promise<T> {
  const client = await getTestPool().connect();
  try {
    await client.query('BEGIN');
    const fixture = await createForeignKeyFixture(client);
    return await callback(client, fixture);
  } finally {
    await client.query('ROLLBACK').catch(() => undefined);
    client.release();
  }
}

async function expectForeignKeyViolation(
  client: PoolClient,
  sql: string,
  params: unknown[]
): Promise<void> {
  let error: unknown = null;
  try {
    await client.query(sql, params);
  } catch (caught) {
    error = caught;
  }
  expect(error).not.toBeNull();
  expect(String(error)).toContain('foreign key');
}

describe('Foreign Keys — Existence', () => {
  interface FkCheck {
    table: string;
    column: string;
    refTable: string;
  }

  const ESSENTIAL_FKS: FkCheck[] = [
    { table: 'users', column: 'account_id', refTable: 'accounts' },
    { table: 'users', column: 'unit_id', refTable: 'units' },
    { table: 'units', column: 'account_id', refTable: 'accounts' },
    { table: 'owners', column: 'account_id', refTable: 'accounts' },
    { table: 'owners', column: 'unit_id', refTable: 'units' },
    { table: 'patients', column: 'account_id', refTable: 'accounts' },
    { table: 'patients', column: 'owner_id', refTable: 'owners' },
    { table: 'appointments', column: 'account_id', refTable: 'accounts' },
    { table: 'appointments', column: 'patient_id', refTable: 'patients' },
    { table: 'appointments', column: 'owner_id', refTable: 'owners' },
    { table: 'appointments', column: 'professional_user_id', refTable: 'users' },
    { table: 'encounters', column: 'account_id', refTable: 'accounts' },
    { table: 'encounters', column: 'patient_id', refTable: 'patients' },
    { table: 'encounters', column: 'owner_id', refTable: 'owners' },
    { table: 'encounters', column: 'opened_by_user_id', refTable: 'users' },
    { table: 'user_roles', column: 'user_id', refTable: 'users' },
    { table: 'user_roles', column: 'role_id', refTable: 'roles' },
    { table: 'role_permissions', column: 'role_id', refTable: 'roles' },
    { table: 'role_permissions', column: 'permission_id', refTable: 'permissions' },
    { table: 'products', column: 'account_id', refTable: 'accounts' },
    { table: 'stock_items', column: 'account_id', refTable: 'accounts' },
    { table: 'stock_items', column: 'product_id', refTable: 'products' },
    { table: 'wards', column: 'account_id', refTable: 'accounts' },
    { table: 'beds', column: 'account_id', refTable: 'accounts' },
    { table: 'beds', column: 'ward_id', refTable: 'wards' },
    { table: 'inpatient_stays', column: 'encounter_id', refTable: 'encounters' },
    { table: 'inpatient_stays', column: 'patient_id', refTable: 'patients' },
    { table: 'encounter_billing_items', column: 'encounter_id', refTable: 'encounters' },
    { table: 'encounter_financial_accounts', column: 'encounter_id', refTable: 'encounters' },
    { table: 'exam_orders', column: 'patient_id', refTable: 'patients' },
    { table: 'exam_orders', column: 'encounter_id', refTable: 'encounters' },
    { table: 'clinical_notes', column: 'encounter_id', refTable: 'encounters' },
    { table: 'medication_orders', column: 'patient_id', refTable: 'patients' },
    { table: 'medication_orders', column: 'encounter_id', refTable: 'encounters' },
    { table: 'medication_administrations', column: 'order_id', refTable: 'medication_orders' },
    { table: 'audit_events', column: 'account_id', refTable: 'accounts' },
    { table: 'audit_events', column: 'actor_user_id', refTable: 'users' }
  ];

  it.each(ESSENTIAL_FKS)(
    'FK $table.$column → $refTable.id should exist',
    async ({ table, column }) => {
      const result = await queryOne<{ count: number }>(
        `SELECT COUNT(*)::int FROM information_schema.table_constraints
         WHERE constraint_schema = 'public'
           AND constraint_type = 'FOREIGN KEY'
           AND table_name = $1
           AND constraint_name LIKE '%' || $2 || '%'`,
        [table, column]
      );
      expect(result?.count).toBeGreaterThanOrEqual(1);
    }
  );
});

describe('Foreign Keys — Enforcement', () => {
  it('should reject encounter with invalid patient_id', async () => {
    const fakeUuid = '00000000-0000-0000-0000-000000000000';
    await withForeignKeyFixture(async (client, fixture) => {
      await expectForeignKeyViolation(
        client,
        `INSERT INTO encounters (id, account_id, patient_id, owner_id, status, opened_by_user_id)
         VALUES (gen_random_uuid(), $1, $2, $3, 'open', $4)`,
        [fixture.accountId, fakeUuid, fixture.ownerId, fixture.userId]
      );
    });
  });

  it('should reject patient with invalid owner_id', async () => {
    const fakeUuid = '00000000-0000-0000-0000-000000000000';
    await withForeignKeyFixture(async (client, fixture) => {
      await expectForeignKeyViolation(
        client,
        `INSERT INTO patients (id, account_id, owner_id, name, species)
         VALUES (gen_random_uuid(), $1, $2, 'Test', 'canine')`,
        [fixture.accountId, fakeUuid]
      );
    });
  });

  it('should reject appointment with invalid professional_user_id', async () => {
    const fakeUuid = '00000000-0000-0000-0000-000000000000';
    await withForeignKeyFixture(async (client, fixture) => {
      await expectForeignKeyViolation(
        client,
        `INSERT INTO appointments (id, account_id, patient_id, owner_id, professional_user_id, start_at, end_at, status, type, reason)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, NOW(), NOW() + INTERVAL '1 hour', 'scheduled', 'consultation', 'FK enforcement')`,
        [fixture.accountId, fixture.patientId, fixture.ownerId, fakeUuid]
      );
    });
  });

  it('should reject stock_item with invalid product_id', async () => {
    const fakeUuid = '00000000-0000-0000-0000-000000000000';
    await withForeignKeyFixture(async (client, fixture) => {
      await expectForeignKeyViolation(
        client,
        `INSERT INTO stock_items (id, account_id, product_id, quantity, min_quantity, active)
         VALUES (gen_random_uuid(), $1, $2, 10, 5, true)`,
        [fixture.accountId, fakeUuid]
      );
    });
  });

  it('should reject bed with invalid ward_id', async () => {
    const fakeUuid = '00000000-0000-0000-0000-000000000000';
    await withForeignKeyFixture(async (client, fixture) => {
      await expectForeignKeyViolation(
        client,
        `INSERT INTO beds (id, account_id, ward_id, sector_id, code, name)
         VALUES (gen_random_uuid(), $1, $2, $3, 'FK-INVALID', 'Test Bed')`,
        [fixture.accountId, fakeUuid, fakeUuid]
      );
    });
  });
});
