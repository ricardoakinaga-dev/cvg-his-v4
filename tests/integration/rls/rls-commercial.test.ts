import { getTestPool } from '../../db/db-admin.js';
import { queryOne, uuid } from '../../helpers/db-helpers.js';
import { activateRlsRole, setAccountContext } from '../../helpers/rls-helpers.js';

const ACCOUNT_A = uuid();
const ACCOUNT_B = uuid();
const OWNER_A = uuid();
const OWNER_B = uuid();
const USER_A = uuid();
const USER_B = uuid();
const PROGRAM_A = uuid();
const PROGRAM_B = uuid();
const PRICE_TABLE_A = uuid();
const PRICE_TABLE_B = uuid();
const TENANT_ID = '00000000-0000-0000-0000-000000000001';

beforeAll(async () => {
  const pool = getTestPool();

  await pool.query(
    `
      INSERT INTO tenants (id, slug, name, status)
      VALUES ($1, 'rls-commercial-tenant', 'RLS Commercial Tenant', 'active')
      ON CONFLICT (id) DO NOTHING
    `,
    [TENANT_ID]
  );

  await pool.query(
    `
      INSERT INTO accounts (id, tenant_id, slug, name)
      VALUES ($1, $3, 'rls-commercial-a', 'RLS Commercial Account A'),
             ($2, $3, 'rls-commercial-b', 'RLS Commercial Account B')
      ON CONFLICT (id) DO NOTHING
    `,
    [ACCOUNT_A, ACCOUNT_B, TENANT_ID]
  );

  await pool.query(
    `
      INSERT INTO users (id, account_id, email, password_hash, full_name)
      VALUES
        ($1, $3, 'rls-commercial-a@example.com', 'hash', 'Commercial User A'),
        ($2, $4, 'rls-commercial-b@example.com', 'hash', 'Commercial User B')
      ON CONFLICT (id) DO NOTHING
    `,
    [USER_A, USER_B, ACCOUNT_A, ACCOUNT_B]
  );

  await pool.query(
    `
      INSERT INTO owners (id, account_id, full_name)
      VALUES ($1, $3, 'Commercial Owner A'),
             ($2, $4, 'Commercial Owner B')
      ON CONFLICT (id) DO NOTHING
    `,
    [OWNER_A, OWNER_B, ACCOUNT_A, ACCOUNT_B]
  );

  await pool.query(
    `
      INSERT INTO loyalty_programs (id, account_id, name)
      VALUES ($1, $3, 'Programa A'),
             ($2, $4, 'Programa B')
      ON CONFLICT (id) DO NOTHING
    `,
    [PROGRAM_A, PROGRAM_B, ACCOUNT_A, ACCOUNT_B]
  );

  await pool.query(
    `
      INSERT INTO loyalty_points (account_id, owner_id, program_id, points, created_by)
      VALUES ($1, $2, $3, 100, $4),
             ($5, $6, $7, 200, $8)
    `,
    [ACCOUNT_A, OWNER_A, PROGRAM_A, USER_A, ACCOUNT_B, OWNER_B, PROGRAM_B, USER_B]
  );

  await pool.query(
    `
      INSERT INTO price_tables (id, account_id, legacy_id, description)
      VALUES ($1, $3, 'A', 'Tabela A'),
             ($2, $4, 'B', 'Tabela B')
      ON CONFLICT (id) DO NOTHING
    `,
    [PRICE_TABLE_A, PRICE_TABLE_B, ACCOUNT_A, ACCOUNT_B]
  );

  await pool.query(
    `
      INSERT INTO price_table_items (account_id, price_table_id, item_kind, item_id, price)
      VALUES ($1, $2, 'service', 'svc-a', 100),
             ($3, $4, 'service', 'svc-b', 200)
    `,
    [ACCOUNT_A, PRICE_TABLE_A, ACCOUNT_B, PRICE_TABLE_B]
  );

  await pool.query(
    `
      INSERT INTO pos_sync_jobs (account_id, sync_kind, status, requested_by)
      VALUES ($1, 'stock', 'queued', $2),
             ($3, 'clients', 'queued', $4)
    `,
    [ACCOUNT_A, USER_A, ACCOUNT_B, USER_B]
  );
});

describe('RLS-COM-001 - commercial tables have RLS enabled', () => {
  it.each([
    'loyalty_programs',
    'loyalty_points',
    'loyalty_redemptions',
    'price_tables',
    'price_table_items',
    'pos_sync_jobs'
  ])('%s has RLS enabled', async (tableName) => {
    const result = await queryOne<{ rowsecurity: boolean }>(
      `SELECT rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = $1`,
      [tableName]
    );
    expect(result?.rowsecurity).toBe(true);
  });
});

describe('RLS-COM-002 - commercial policies exist', () => {
  it.each([
    ['loyalty_programs', 'loyalty_programs_tenant_isolation'],
    ['loyalty_points', 'loyalty_points_tenant_isolation'],
    ['loyalty_redemptions', 'loyalty_redemptions_tenant_isolation'],
    ['price_tables', 'price_tables_tenant_isolation'],
    ['price_table_items', 'price_table_items_tenant_isolation'],
    ['pos_sync_jobs', 'pos_sync_jobs_tenant_isolation']
  ])('%s exposes %s', async (tableName, policyName) => {
    const result = await queryOne<{ count: number }>(
      `SELECT COUNT(*)::int FROM pg_policies
       WHERE schemaname = 'public' AND tablename = $1 AND policyname = $2`,
      [tableName, policyName]
    );
    expect(result?.count).toBe(1);
  });
});

describe('RLS-COM-003 - cross-account read isolation', () => {
  it.each([
    ['loyalty_programs', PROGRAM_A],
    ['price_tables', PRICE_TABLE_A],
    ['price_table_items', PRICE_TABLE_A, 'price_table_id'],
    ['pos_sync_jobs', ACCOUNT_A, 'account_id']
  ])('account B cannot see account A rows in %s', async (tableName, value, column = 'id') => {
    const client = await getTestPool().connect();
    try {
      await client.query('BEGIN');
      await activateRlsRole(client);
      await setAccountContext(client, ACCOUNT_B);
      const result = await client.query(
        `SELECT COUNT(*)::int AS count FROM ${tableName} WHERE ${column} = $1`,
        [value]
      );
      expect(result.rows[0].count).toBe(0);
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  });
});
