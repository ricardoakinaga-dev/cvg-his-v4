import { getTestPool } from '../../db/db-admin.js';
import { queryOne } from '../../helpers/db-helpers.js';

function requireFixture<T>(value: T | undefined, label: string): T {
  if (value === undefined) throw new Error(`Required database fixture is missing: ${label}`);
  return value;
}

async function createForeignKeyFixtures() {
  const pool = getTestPool();
  const account = requireFixture(
    await queryOne<{ id: string }>(`SELECT id FROM accounts LIMIT 1`),
    'account',
  );
  const userResult = await pool.query<{ id: string }>(
    `INSERT INTO users (id, account_id, email, password_hash, full_name, is_active)
     VALUES (
       gen_random_uuid(), $1, gen_random_uuid()::text || '@fk-test.invalid',
       'hash', 'FK Test User', true
     ) RETURNING id`,
    [account.id],
  );
  const ownerResult = await pool.query<{ id: string }>(
    `INSERT INTO owners (id, account_id, full_name)
     VALUES (gen_random_uuid(), $1, 'FK Test Owner') RETURNING id`,
    [account.id],
  );
  const user = requireFixture(userResult.rows[0], 'user');
  const owner = requireFixture(ownerResult.rows[0], 'owner');
  const patientResult = await pool.query<{ id: string }>(
    `INSERT INTO patients (id, account_id, owner_id, name, species)
     VALUES (gen_random_uuid(), $1, $2, 'FK Test Patient', 'canine') RETURNING id`,
    [account.id, owner.id],
  );
  const patient = requireFixture(patientResult.rows[0], 'patient');

  return Object.freeze({ account, owner, patient, user });
}

// ============================================================================
// DB Foreign Key Tests — validates that essential FKs exist and function.
// Based on docs/740 section 4.
// ============================================================================

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
    'FK $table / $column → $refTable / id should exist',
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
    const pool = getTestPool();
    const { account, owner, user } = await createForeignKeyFixtures();

    try {
      await pool.query(
        `INSERT INTO encounters (id, account_id, patient_id, owner_id, status, opened_by_user_id)
         VALUES (gen_random_uuid(), $1, $2, $3, 'open', $4)`,
        [account.id, fakeUuid, owner.id, user.id]
      );
      expect.unreachable('Should have thrown FK violation');
    } catch (error) {
      expect(String(error)).toContain('foreign key');
    }
  });

  it('should reject patient with invalid owner_id', async () => {
    const fakeUuid = '00000000-0000-0000-0000-000000000000';
    const pool = getTestPool();
    const { account } = await createForeignKeyFixtures();

    try {
      await pool.query(
        `INSERT INTO patients (id, account_id, owner_id, name, species)
         VALUES (gen_random_uuid(), $1, $2, 'Test', 'canine')`,
        [account.id, fakeUuid]
      );
      expect.unreachable('Should have thrown FK violation');
    } catch (error) {
      expect(String(error)).toContain('foreign key');
    }
  });

  it('should reject appointment with invalid professional_user_id', async () => {
    const fakeUuid = '00000000-0000-0000-0000-000000000000';
    const pool = getTestPool();
    const { account, patient, owner } = await createForeignKeyFixtures();

    try {
      await pool.query(
        `INSERT INTO appointments (
           id, account_id, patient_id, owner_id, professional_user_id, start_at,
           end_at, status, type, duration, visit_type, reason
         ) VALUES (
           gen_random_uuid(), $1, $2, $3, $4, NOW(), NOW() + INTERVAL '1 hour',
           'scheduled', 'consultation', 60, 'scheduled', 'Foreign key enforcement test'
         )`,
        [account.id, patient.id, owner.id, fakeUuid]
      );
      expect.unreachable('Should have thrown FK violation');
    } catch (error) {
      expect(String(error)).toContain('foreign key');
    }
  });

  it('should reject stock_item with invalid product_id', async () => {
    const fakeUuid = '00000000-0000-0000-0000-000000000000';
    const pool = getTestPool();
    const { account } = await createForeignKeyFixtures();

    try {
      await pool.query(
        `INSERT INTO stock_items (id, account_id, product_id, quantity, min_quantity, active)
         VALUES (gen_random_uuid(), $1, $2, 10, 5, true)`,
        [account.id, fakeUuid]
      );
      expect.unreachable('Should have thrown FK violation');
    } catch (error) {
      expect(String(error)).toContain('foreign key');
    }
  });

  it('should reject bed with invalid tenant references', async () => {
    const fakeUuid = '00000000-0000-0000-0000-000000000000';
    const pool = getTestPool();
    const { account } = await createForeignKeyFixtures();

    try {
      await pool.query(
        `INSERT INTO beds (id, account_id, ward_id, sector_id, code, name)
         VALUES (gen_random_uuid(), $1, $2, $3, 'FK-INVALID', 'Test Bed')`,
        [account.id, fakeUuid, fakeUuid]
      );
      expect.unreachable('Should have thrown a tenant reference or FK violation');
    } catch (error) {
      expect(String(error)).toMatch(/foreign key|tenant reference violation/i);
    }
  });
});
