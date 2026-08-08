import { randomUUID } from 'node:crypto';

import { getTestPool } from '../../db/db-admin.js';
import { activateRlsRole } from '../../helpers/rls-helpers.js';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';
const ACCOUNT_A = randomUUID();
const ACCOUNT_B = randomUUID();
const USER_A = randomUUID();
const USER_B = randomUUID();
const PERMISSION_ID = randomUUID();
const TEAM_A = `team_${randomUUID()}`;
const TEAM_B = `team_${randomUUID()}`;
const SECTOR_A = `sector_${randomUUID()}`;
const SECTOR_B = `sector_${randomUUID()}`;

const ACCESS_TABLES = [
  'access_teams',
  'access_sectors',
  'access_team_memberships',
  'access_sector_memberships',
  'access_user_permissions',
  'access_team_permissions',
  'access_sector_permissions'
] as const;

beforeAll(async () => {
  const pool = getTestPool();
  await pool.query(
    `INSERT INTO tenants (id, slug, name, status)
     VALUES ($1, 'access-rls-tenant', 'Access RLS Tenant', 'active')
     ON CONFLICT (id) DO NOTHING`,
    [TENANT_ID]
  );
  await pool.query(
    `INSERT INTO accounts (id, tenant_id, slug, name)
     VALUES ($1, $3, $4, 'Access Account A'),
            ($2, $3, $5, 'Access Account B')`,
    [ACCOUNT_A, ACCOUNT_B, TENANT_ID, `access-a-${ACCOUNT_A}`, `access-b-${ACCOUNT_B}`]
  );
  await pool.query(
    `INSERT INTO users (id, account_id, username, email, password_hash, full_name)
     VALUES ($1, $3, $4, $5, 'hash', 'Access User A'),
            ($2, $6, $7, $8, 'hash', 'Access User B')`,
    [
      USER_A,
      USER_B,
      ACCOUNT_A,
      `access-a-${USER_A}`,
      `access-a-${USER_A}@example.test`,
      ACCOUNT_B,
      `access-b-${USER_B}`,
      `access-b-${USER_B}@example.test`
    ]
  );
  await pool.query(
    `INSERT INTO permissions (id, key, description)
     VALUES ($1, $2, 'Access governance RLS test')`,
    [PERMISSION_ID, `access.test.${PERMISSION_ID}`]
  );
  await pool.query(
    `INSERT INTO access_teams (id, account_id, code, name)
     VALUES ($1, $2, 'TEAM_A', 'Team A'), ($3, $4, 'TEAM_B', 'Team B')`,
    [TEAM_A, ACCOUNT_A, TEAM_B, ACCOUNT_B]
  );
  await pool.query(
    `INSERT INTO access_sectors (id, account_id, code, name)
     VALUES ($1, $2, 'SECTOR_A', 'Sector A'), ($3, $4, 'SECTOR_B', 'Sector B')`,
    [SECTOR_A, ACCOUNT_A, SECTOR_B, ACCOUNT_B]
  );
  await pool.query(
    `INSERT INTO access_team_memberships (account_id, user_id, team_id)
     VALUES ($1, $2, $3), ($4, $5, $6)`,
    [ACCOUNT_A, USER_A, TEAM_A, ACCOUNT_B, USER_B, TEAM_B]
  );
  await pool.query(
    `INSERT INTO access_sector_memberships (account_id, user_id, sector_id)
     VALUES ($1, $2, $3), ($4, $5, $6)`,
    [ACCOUNT_A, USER_A, SECTOR_A, ACCOUNT_B, USER_B, SECTOR_B]
  );
  await pool.query(
    `INSERT INTO access_user_permissions (account_id, user_id, permission_id, effect)
     VALUES ($1, $2, $3, 'allow'), ($4, $5, $3, 'deny')`,
    [ACCOUNT_A, USER_A, PERMISSION_ID, ACCOUNT_B, USER_B]
  );
  await pool.query(
    `INSERT INTO access_team_permissions (account_id, team_id, permission_id, effect)
     VALUES ($1, $2, $3, 'allow'), ($4, $5, $3, 'deny')`,
    [ACCOUNT_A, TEAM_A, PERMISSION_ID, ACCOUNT_B, TEAM_B]
  );
  await pool.query(
    `INSERT INTO access_sector_permissions (account_id, sector_id, permission_id, effect)
     VALUES ($1, $2, $3, 'allow'), ($4, $5, $3, 'deny')`,
    [ACCOUNT_A, SECTOR_A, PERMISSION_ID, ACCOUNT_B, SECTOR_B]
  );
});

describe('access governance RLS', () => {
  it('enables RLS and a tenant policy on all access tables', async () => {
    const result = await getTestPool().query<{ tablename: string; rowsecurity: boolean }>(
      `SELECT tablename, rowsecurity
       FROM pg_tables
       WHERE schemaname = 'public' AND tablename = ANY($1::text[])`,
      [ACCESS_TABLES]
    );
    expect(result.rows).toHaveLength(ACCESS_TABLES.length);
    expect(result.rows.every((row) => row.rowsecurity)).toBe(true);

    const policies = await getTestPool().query<{ tablename: string }>(
      `SELECT DISTINCT tablename
       FROM pg_policies
       WHERE schemaname = 'public' AND tablename = ANY($1::text[])`,
      [ACCESS_TABLES]
    );
    expect(new Set(policies.rows.map((row) => row.tablename))).toEqual(new Set(ACCESS_TABLES));
  });

  it('shows only the active account through the restricted role', async () => {
    const client = await getTestPool().connect();
    try {
      await client.query('BEGIN');
      await activateRlsRole(client);
      await client.query("SELECT set_config('app.current_account_id', $1, true)", [ACCOUNT_A]);

      for (const table of ACCESS_TABLES) {
        const result = await client.query<{ account_id: string }>(
          `SELECT account_id FROM ${table}`
        );
        expect(result.rows).toHaveLength(1);
        expect(result.rows[0]?.account_id).toBe(ACCOUNT_A);
      }

      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  });

  it('rejects cross-account writes through policy and composite foreign keys', async () => {
    const client = await getTestPool().connect();
    try {
      await client.query('BEGIN');
      await activateRlsRole(client);
      await client.query("SELECT set_config('app.current_account_id', $1, true)", [ACCOUNT_A]);

      await expect(
        client.query(
          `INSERT INTO access_teams (id, account_id, code, name)
           VALUES ($1, $2, 'FORBIDDEN', 'Forbidden')`,
          [`team_${randomUUID()}`, ACCOUNT_B]
        )
      ).rejects.toThrow();
      await client.query('ROLLBACK');

      await client.query('BEGIN');
      await activateRlsRole(client);
      await client.query("SELECT set_config('app.current_account_id', $1, true)", [ACCOUNT_A]);
      await expect(
        client.query(
          `INSERT INTO access_team_memberships (account_id, user_id, team_id)
           VALUES ($1, $2, $3)`,
          [ACCOUNT_A, USER_A, TEAM_B]
        )
      ).rejects.toThrow();
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  });
});
