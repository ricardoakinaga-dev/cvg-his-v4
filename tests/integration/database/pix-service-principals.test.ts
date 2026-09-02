import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import type { PoolClient } from 'pg';

import { getTestPool } from '../../db/db-admin.js';
import { activateRlsRole, setAccountContext } from '../../helpers/rls-helpers.js';

const servicePrincipalMigration = readFileSync(
  resolve(process.cwd(), 'packages/db/migrations/0112_pix_service_principals.sql'),
  'utf8'
);

async function insertAccount(client: PoolClient, label: string): Promise<string> {
  const tenantId = randomUUID();
  const id = randomUUID();
  await client.query(
    `INSERT INTO tenants (id, slug, name, status, activated_at)
     VALUES ($1, $2, $3, 'active', now())`,
    [tenantId, `pix-tenant-${label}-${tenantId.slice(0, 8)}`, `PIX tenant ${label}`]
  );
  await client.query(
    `INSERT INTO accounts (id, tenant_id, slug, name)
     VALUES ($1, $2, $3, $4)`,
    [id, tenantId, `pix-${label}-${id.slice(0, 8)}`, `PIX principal ${label}`]
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
    const client = await getTestPool().connect();
    try {
      await client.query('BEGIN');
      await client.query('DROP TABLE account_service_principals');
      await client.query('DROP TRIGGER IF EXISTS users_authorization_write_lock ON users');
      await client.query(
        `ALTER TABLE users
           DROP CONSTRAINT users_principal_kind_chk,
           DROP CONSTRAINT users_service_principal_interactive_login_chk,
           DROP COLUMN principal_kind,
           DROP COLUMN interactive_login_enabled`
      );

      const accountId = await insertAccount(client, 'human-default');
      const legacyUserId = await insertUser(client, accountId, 'legacy-human');

      await client.query(servicePrincipalMigration);

      const backfilled = await client.query<{
        principal_kind: string;
        interactive_login_enabled: boolean;
      }>(
        `SELECT principal_kind, interactive_login_enabled
           FROM users
          WHERE id = $1`,
        [legacyUserId]
      );
      expect(backfilled.rows[0]).toEqual({
        principal_kind: 'human',
        interactive_login_enabled: true
      });

      const defaultedUserId = await insertUser(client, accountId, 'default-human');
      const defaulted = await client.query<{
        principal_kind: string;
        interactive_login_enabled: boolean;
      }>(
        `SELECT principal_kind, interactive_login_enabled
           FROM users
          WHERE id = $1`,
        [defaultedUserId]
      );
      expect(defaulted.rows[0]).toEqual({
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
      await client.query('ROLLBACK TO SAVEPOINT cross_tenant');

      await expect(
        client.query(
          `INSERT INTO account_service_principals (account_id, purpose, user_id)
           VALUES ($1, 'report-execution', $2)`,
          [firstAccountId, firstUserId]
        )
      ).resolves.toBeDefined();
    } finally {
      await client.query('ROLLBACK').catch(() => undefined);
      client.release();
    }
  });

  it('binds report audit actors to the owning account with composite foreign keys', async () => {
    const client = await getTestPool().connect();
    try {
      await client.query('BEGIN');
      const firstAccountId = await insertAccount(client, 'report-fk-a');
      const secondAccountId = await insertAccount(client, 'report-fk-b');
      const firstUserId = await insertUser(client, firstAccountId, 'report-fk-a');
      const foreignUserId = await insertUser(client, secondAccountId, 'report-fk-b');

      const constraints = await client.query<{ readonly conname: string }>(
        `SELECT conname
           FROM pg_constraint
          WHERE conname = ANY($1::text[])
          ORDER BY conname`,
        [
          [
            'report_executions_account_requested_by_user_fk',
            'report_exports_account_exported_by_user_fk',
            'report_schedules_account_created_by_user_fk'
          ]
        ]
      );
      expect(constraints.rows.map((row) => row.conname)).toEqual([
        'report_executions_account_requested_by_user_fk',
        'report_exports_account_exported_by_user_fk',
        'report_schedules_account_created_by_user_fk'
      ]);

      await client.query('SAVEPOINT cross_account_report_actor');
      await expect(
        client.query(
          `INSERT INTO report_executions (
             id, account_id, report_id, requested_by_user_id, status,
             filters, row_count, generated_at, expires_at, columns, rows
           ) VALUES ($1, $2, 'administrative-executive', $3, 'completed',
             '{}'::jsonb, 0, now(), now() + interval '1 day', '[]'::jsonb, '[]'::jsonb)`,
          [`report-cross-account-${randomUUID()}`, firstAccountId, foreignUserId]
        )
      ).rejects.toMatchObject({ code: '23503' });
      await client.query('ROLLBACK TO SAVEPOINT cross_account_report_actor');

      const sameAccountExecutionId = `report-same-account-${randomUUID()}`;
      await expect(
        client.query(
          `INSERT INTO report_executions (
             id, account_id, report_id, requested_by_user_id, status,
             filters, row_count, generated_at, expires_at, columns, rows
           ) VALUES ($1, $2, 'administrative-executive', $3, 'completed',
             '{}'::jsonb, 0, now(), now() + interval '1 day', '[]'::jsonb, '[]'::jsonb)`,
          [sameAccountExecutionId, firstAccountId, firstUserId]
        )
      ).resolves.toBeDefined();

      await client.query('SAVEPOINT cross_account_report_export_actor');
      await expect(
        client.query(
          `INSERT INTO report_exports (
             id, account_id, execution_id, format, filename, content_type,
             content, exported_by_user_id
           ) VALUES ($1, $2, $3, 'csv', 'report.csv', 'text/csv', '', $4)`,
          [
            `report-export-cross-account-${randomUUID()}`,
            firstAccountId,
            sameAccountExecutionId,
            foreignUserId
          ]
        )
      ).rejects.toMatchObject({ code: '23503' });
      await client.query('ROLLBACK TO SAVEPOINT cross_account_report_export_actor');

      await client.query('SAVEPOINT cross_account_report_schedule_actor');
      await expect(
        client.query(
          `INSERT INTO report_schedules (
             id, account_id, report_id, name, frequency, format, filters,
             recipients, created_by_user_id
           ) VALUES ($1, $2, 'administrative-executive', 'Foreign actor schedule',
             'daily', 'csv', '{}'::jsonb, '[]'::jsonb, $3)`,
          [`report-schedule-cross-account-${randomUUID()}`, firstAccountId, foreignUserId]
        )
      ).rejects.toMatchObject({ code: '23503' });
      await client.query('ROLLBACK TO SAVEPOINT cross_account_report_schedule_actor');
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

      const visibleUsers = await client.query<{ id: string }>(
        `SELECT id FROM users WHERE id IN ($1, $2) ORDER BY id`,
        [firstUserId, secondUserId]
      );
      expect(visibleUsers.rows).toEqual([{ id: firstUserId }]);

      await client.query('SAVEPOINT cross_tenant_user_insert');
      await expect(
        insertUser(client, secondAccountId, 'cross-tenant-user', 'service', false)
      ).rejects.toMatchObject({ code: '42501' });
      await client.query('ROLLBACK TO SAVEPOINT cross_tenant_user_insert');

      await client.query('SAVEPOINT cross_tenant_mapping_insert');
      await expect(
        client.query(
          `INSERT INTO account_service_principals (account_id, purpose, user_id, is_active)
           VALUES ($1, 'pix-settlement', $2, false)`,
          [secondAccountId, secondUserId]
        )
      ).rejects.toMatchObject({ code: '42501' });
      await client.query('ROLLBACK TO SAVEPOINT cross_tenant_mapping_insert');
    } finally {
      await client.query('ROLLBACK').catch(() => undefined);
      client.release();
    }
  });
});
