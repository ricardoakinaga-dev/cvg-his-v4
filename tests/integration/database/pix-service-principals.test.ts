import { randomUUID } from 'node:crypto';

import type { PoolClient } from 'pg';

import { getTestPool } from '../../db/db-admin.js';
import { activateRlsRole, setAccountContext } from '../../helpers/rls-helpers.js';

async function insertAccount(client: PoolClient, label: string): Promise<string> {
  const id = randomUUID();
  await client.query(
    `INSERT INTO accounts (id, tenant_id, slug, name)
     VALUES ($1, '00000000-0000-0000-0000-000000000001', $2, $3)`,
    [id, `pix-${label}-${id.slice(0, 8)}`, `PIX principal ${label}`]
  );
  return id;
}

async function insertUser(
  client: PoolClient,
  accountId: string,
  label: string,
  principalKind?: 'human' | 'service',
  interactiveLoginEnabled?: boolean
): Promise<string> {
  const id = randomUUID();
  const columns = ['id', 'account_id', 'username', 'email', 'password_hash', 'full_name'];
  const values: unknown[] = [
    id,
    accountId,
    `pix-principal-${label}-${id}`,
    `pix-principal-${label}-${id}@example.test`,
    'test-only-hash',
    `PIX principal ${label}`
  ];

  if (principalKind !== undefined) {
    columns.push('principal_kind');
    values.push(principalKind);
  }
  if (interactiveLoginEnabled !== undefined) {
    columns.push('interactive_login_enabled');
    values.push(interactiveLoginEnabled);
  }

  const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
  await client.query(`INSERT INTO users (${columns.join(', ')}) VALUES (${placeholders})`, values);
  return id;
}

describe('PIX service principal persistence', () => {
  it('forces tenant isolation on users as well as service-principal mappings', async () => {
    const catalog = await getTestPool().query<{
      relname: string;
      relrowsecurity: boolean;
      relforcerowsecurity: boolean;
    }>(
      `SELECT relname, relrowsecurity, relforcerowsecurity
         FROM pg_class
        WHERE oid IN ('users'::regclass, 'account_service_principals'::regclass)
        ORDER BY relname`
    );

    expect(catalog.rows).toEqual([
      {
        relname: 'account_service_principals',
        relrowsecurity: true,
        relforcerowsecurity: true
      },
      { relname: 'users', relrowsecurity: true, relforcerowsecurity: true }
    ]);
  });

  it('backfills and defaults existing and new users to interactive human principals', async () => {
    const pool = getTestPool();
    const existing = await pool.query<{
      principal_kind: string | null;
      interactive_login_enabled: boolean | null;
    }>(
      `SELECT principal_kind, interactive_login_enabled
         FROM users`
    );

    expect(existing.rows.every((row) => row.principal_kind === 'human')).toBe(true);
    expect(existing.rows.every((row) => row.interactive_login_enabled === true)).toBe(true);

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const accountId = await insertAccount(client, 'human-default');
      const userId = await insertUser(client, accountId, 'human-default');
      const inserted = await client.query<{
        principal_kind: string;
        interactive_login_enabled: boolean;
      }>(
        `SELECT principal_kind, interactive_login_enabled
           FROM users
          WHERE id = $1`,
        [userId]
      );

      expect(inserted.rows[0]).toEqual({
        principal_kind: 'human',
        interactive_login_enabled: true
      });
    } finally {
      await client.query('ROLLBACK').catch(() => undefined);
      client.release();
    }
  });

  it('rejects service principals with interactive login enabled', async () => {
    const client = await getTestPool().connect();
    try {
      await client.query('BEGIN');
      const accountId = await insertAccount(client, 'service-constraint');

      await expect(
        insertUser(client, accountId, 'invalid-service', 'service', true)
      ).rejects.toMatchObject({ code: '23514' });
      await client.query('ROLLBACK');
      await client.query('BEGIN');

      const validAccountId = await insertAccount(client, 'valid-service');
      await expect(
        insertUser(client, validAccountId, 'valid-service', 'service', false)
      ).resolves.toBeDefined();
    } finally {
      await client.query('ROLLBACK').catch(() => undefined);
      client.release();
    }
  });

  it('enforces the purpose allowlist, tenant-local user FK, and one active mapping per purpose', async () => {
    const client = await getTestPool().connect();
    try {
      await client.query('BEGIN');
      const firstAccountId = await insertAccount(client, 'mapping-a');
      const secondAccountId = await insertAccount(client, 'mapping-b');
      const firstUserId = await insertUser(client, firstAccountId, 'service-a', 'service', false);
      const secondUserId = await insertUser(client, firstAccountId, 'service-b', 'service', false);
      const foreignUserId = await insertUser(
        client,
        secondAccountId,
        'service-c',
        'service',
        false
      );

      await client.query(
        `INSERT INTO account_service_principals (account_id, purpose, user_id)
         VALUES ($1, 'pix-settlement', $2)`,
        [firstAccountId, firstUserId]
      );

      await client.query('SAVEPOINT duplicate_active');
      await expect(
        client.query(
          `INSERT INTO account_service_principals (account_id, purpose, user_id)
           VALUES ($1, 'pix-settlement', $2)`,
          [firstAccountId, secondUserId]
        )
      ).rejects.toMatchObject({ code: '23505' });
      await client.query('ROLLBACK TO SAVEPOINT duplicate_active');

      await expect(
        client.query(
          `INSERT INTO account_service_principals (account_id, purpose, user_id, is_active)
           VALUES ($1, 'pix-settlement', $2, false)`,
          [firstAccountId, secondUserId]
        )
      ).resolves.toBeDefined();

      await client.query('SAVEPOINT invalid_purpose');
      await expect(
        client.query(
          `INSERT INTO account_service_principals (account_id, purpose, user_id, is_active)
           VALUES ($1, 'unsupported', $2, false)`,
          [firstAccountId, secondUserId]
        )
      ).rejects.toMatchObject({ code: '23514' });
      await client.query('ROLLBACK TO SAVEPOINT invalid_purpose');

      await client.query('SAVEPOINT cross_tenant');
      await expect(
        client.query(
          `INSERT INTO account_service_principals (account_id, purpose, user_id, is_active)
           VALUES ($1, 'pix-settlement', $2, false)`,
          [firstAccountId, foreignUserId]
        )
      ).rejects.toMatchObject({ code: '23503' });
    } finally {
      await client.query('ROLLBACK').catch(() => undefined);
      client.release();
    }
  });

  it('forces tenant isolation for service-principal mappings', async () => {
    const client = await getTestPool().connect();
    try {
      await client.query('BEGIN');
      const firstAccountId = await insertAccount(client, 'rls-a');
      const secondAccountId = await insertAccount(client, 'rls-b');
      const firstUserId = await insertUser(client, firstAccountId, 'rls-a', 'service', false);
      const secondUserId = await insertUser(client, secondAccountId, 'rls-b', 'service', false);
      await client.query(
        `INSERT INTO account_service_principals (account_id, purpose, user_id)
         VALUES ($1, 'pix-settlement', $2), ($3, 'pix-settlement', $4)`,
        [firstAccountId, firstUserId, secondAccountId, secondUserId]
      );

      const catalog = await client.query<{
        relrowsecurity: boolean;
        relforcerowsecurity: boolean;
      }>(
        `SELECT relrowsecurity, relforcerowsecurity
           FROM pg_class
          WHERE oid = 'account_service_principals'::regclass`
      );
      expect(catalog.rows[0]).toEqual({ relrowsecurity: true, relforcerowsecurity: true });

      await activateRlsRole(client);
      await setAccountContext(client, firstAccountId);
      const visible = await client.query<{ account_id: string }>(
        `SELECT account_id FROM account_service_principals ORDER BY account_id`
      );
      expect(visible.rows).toEqual([{ account_id: firstAccountId }]);
    } finally {
      await client.query('ROLLBACK').catch(() => undefined);
      client.release();
    }
  });
});
