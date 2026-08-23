import { randomUUID } from 'node:crypto';

import { afterAll, describe, expect, it } from 'vitest';

import { getAdminPool, getTestPool } from '../../db/db-admin.js';
import { TEST_DB_NAME, TEST_DB_URL } from '../../setup/env.js';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';

describe('runtime role sensitive-table ACL', () => {
  afterAll(async () => {
    await getTestPool().end();
  });

  it('preserves the API contract and worker read-only principal lookup after repeated reconciliation', async () => {
    process.env.DATABASE_URL ??= TEST_DB_URL;
    const { reconcileRuntimeRoles } =
      await import('../../../packages/db/src/reconcile-runtime-roles.js');
    const suffix = randomUUID().replaceAll('-', '');
    const apiRole = `principal_acl_api_${suffix}`;
    const workerRole = `principal_acl_worker_${suffix}`;
    const donorRole = `principal_acl_donor_${suffix}`;
    const adminPool = getAdminPool();
    const testPool = getTestPool();
    const dbIdentifier = TEST_DB_NAME.replaceAll('"', '""');

    try {
      await adminPool.query(
        `CREATE ROLE "${apiRole}" NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE INHERIT NOREPLICATION NOBYPASSRLS`
      );
      await adminPool.query(
        `CREATE ROLE "${workerRole}" NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE INHERIT NOREPLICATION NOBYPASSRLS`
      );
      await adminPool.query(`CREATE ROLE "${donorRole}" NOLOGIN`);
      await adminPool.query(
        `GRANT CONNECT ON DATABASE "${dbIdentifier}" TO "${apiRole}", "${workerRole}"`
      );
      await testPool.query(`GRANT DELETE ON TABLE public.users TO "${donorRole}"`);
      await adminPool.query(`GRANT "${donorRole}" TO "${apiRole}", "${workerRole}"`);

      const client = await testPool.connect();
      try {
        await reconcileRuntimeRoles(client, { apiRole, workerRole });
        await reconcileRuntimeRoles(client, { apiRole, workerRole });
      } finally {
        client.release();
      }

      const result = await testPool.query<{
        api_users_insert: boolean;
        api_users_update: boolean;
        api_users_delete: boolean;
        api_mapping_select: boolean;
        api_mapping_insert: boolean;
        api_sessions_delete: boolean;
        api_mfa_delete: boolean;
        api_challenge_update: boolean;
        api_challenge_delete: boolean;
        worker_mapping_select: boolean;
        worker_mapping_insert: boolean;
        worker_users_select: boolean;
        worker_user_id_select: boolean;
        worker_user_password_select: boolean;
        worker_sessions_select: boolean;
        worker_sessions_insert: boolean;
        worker_mfa_select: boolean;
        worker_mfa_update: boolean;
        worker_challenge_select: boolean;
        worker_challenge_update: boolean;
        api_inherit: boolean;
        worker_inherit: boolean;
        api_donor_membership: boolean;
        worker_donor_membership: boolean;
        worker_sensitive_dml: boolean;
      }>(
        `SELECT
           has_table_privilege($1, 'public.users', 'INSERT') AS api_users_insert,
           has_table_privilege($1, 'public.users', 'UPDATE') AS api_users_update,
           has_table_privilege($1, 'public.users', 'DELETE') AS api_users_delete,
           has_table_privilege($1, 'public.account_service_principals', 'SELECT') AS api_mapping_select,
           has_table_privilege($1, 'public.account_service_principals', 'INSERT') AS api_mapping_insert,
           has_table_privilege($1, 'public.sessions', 'DELETE') AS api_sessions_delete,
           has_table_privilege($1, 'public.mfa_credentials', 'DELETE') AS api_mfa_delete,
           has_table_privilege($1, 'public.auth_mfa_login_challenges', 'UPDATE') AS api_challenge_update,
           has_table_privilege($1, 'public.auth_mfa_login_challenges', 'DELETE') AS api_challenge_delete,
           has_table_privilege($2, 'public.account_service_principals', 'SELECT') AS worker_mapping_select,
           has_table_privilege($2, 'public.account_service_principals', 'INSERT') AS worker_mapping_insert,
           has_table_privilege($2, 'public.users', 'SELECT') AS worker_users_select,
           has_column_privilege($2, 'public.users', 'id', 'SELECT') AS worker_user_id_select,
           has_column_privilege($2, 'public.users', 'password_hash', 'SELECT') AS worker_user_password_select,
           has_table_privilege($2, 'public.sessions', 'SELECT') AS worker_sessions_select,
           has_table_privilege($2, 'public.sessions', 'INSERT') AS worker_sessions_insert,
           has_table_privilege($2, 'public.mfa_credentials', 'SELECT') AS worker_mfa_select,
           has_table_privilege($2, 'public.mfa_credentials', 'UPDATE') AS worker_mfa_update,
           has_table_privilege($2, 'public.auth_mfa_login_challenges', 'SELECT') AS worker_challenge_select,
           has_table_privilege($2, 'public.auth_mfa_login_challenges', 'UPDATE') AS worker_challenge_update,
           (SELECT rolinherit FROM pg_roles WHERE rolname = $1) AS api_inherit,
           (SELECT rolinherit FROM pg_roles WHERE rolname = $2) AS worker_inherit,
           pg_has_role($1, $3, 'MEMBER') AS api_donor_membership,
           pg_has_role($2, $3, 'MEMBER') AS worker_donor_membership,
           EXISTS (
             SELECT 1
             FROM unnest(ARRAY[
               'users', 'account_service_principals', 'sessions',
               'mfa_credentials', 'auth_mfa_login_challenges'
             ]) AS sensitive_table(table_name)
             CROSS JOIN unnest(ARRAY['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE']) AS dml(privilege_name)
             WHERE has_table_privilege(
               $2,
               format('public.%I', sensitive_table.table_name),
               dml.privilege_name
             )
           ) AS worker_sensitive_dml`,
        [apiRole, workerRole, donorRole]
      );

      expect(result.rows[0]).toEqual({
        api_users_insert: true,
        api_users_update: true,
        api_users_delete: false,
        api_mapping_select: false,
        api_mapping_insert: false,
        api_sessions_delete: true,
        api_mfa_delete: true,
        api_challenge_update: true,
        api_challenge_delete: false,
        worker_mapping_select: true,
        worker_mapping_insert: false,
        worker_users_select: false,
        worker_user_id_select: true,
        worker_user_password_select: false,
        worker_sessions_select: false,
        worker_sessions_insert: false,
        worker_mfa_select: false,
        worker_mfa_update: false,
        worker_challenge_select: false,
        worker_challenge_update: false,
        api_inherit: false,
        worker_inherit: false,
        api_donor_membership: false,
        worker_donor_membership: false,
        worker_sensitive_dml: false
      });

      const accountId = randomUUID();
      const serviceUserId = randomUUID();
      const serviceSuffix = serviceUserId.replaceAll('-', '');
      await testPool.query(
        `INSERT INTO accounts (id, tenant_id, slug, name)
         VALUES ($1, $2, $3, 'Worker principal ACL')`,
        [accountId, TENANT_ID, `worker-principal-${serviceSuffix}`]
      );
      await testPool.query(
        `INSERT INTO users (
           id, account_id, username, email, password_hash, full_name,
           is_active, principal_kind, interactive_login_enabled
         ) VALUES ($1, $2, $3, $4, 'not-readable', 'Worker service', true, 'service', false)`,
        [
          serviceUserId,
          accountId,
          `worker_service_${serviceSuffix}`,
          `worker-service-${serviceSuffix}@example.test`
        ]
      );
      await testPool.query(
        `INSERT INTO account_service_principals (account_id, purpose, user_id)
         VALUES ($1, 'pix-settlement', $2)`,
        [accountId, serviceUserId]
      );

      const workerClient = await testPool.connect();
      try {
        await workerClient.query('BEGIN');
        await workerClient.query(`SET ROLE "${workerRole}"`);
        await workerClient.query("SELECT set_config('app.current_account_id', $1, true)", [
          accountId
        ]);
        const principal = await workerClient.query<{
          readonly user_id: string;
          readonly is_active: boolean;
          readonly principal_kind: string;
          readonly interactive_login_enabled: boolean;
          readonly user_active: boolean;
        }>(
          `SELECT principal.user_id, principal.is_active, users.principal_kind,
                  users.interactive_login_enabled, users.is_active AS user_active
             FROM account_service_principals AS principal
             JOIN users
               ON users.account_id = principal.account_id AND users.id = principal.user_id
            WHERE principal.account_id = $1 AND principal.purpose = 'pix-settlement'
            ORDER BY principal.is_active DESC, principal.created_at DESC`,
          [accountId]
        );
        expect(principal.rows).toEqual([
          {
            user_id: serviceUserId,
            is_active: true,
            principal_kind: 'service',
            interactive_login_enabled: false,
            user_active: true
          }
        ]);
        await expect(
          workerClient.query('SELECT password_hash FROM users WHERE account_id = $1', [accountId])
        ).rejects.toThrow(/permission denied|column/);
        await workerClient.query('ROLLBACK');
      } finally {
        workerClient.release();
      }

      const rls = await testPool.query<{ relname: string; forced: boolean }>(
        `SELECT relname, relforcerowsecurity AS forced
           FROM pg_class
          WHERE oid IN ('public.users'::regclass, 'public.account_service_principals'::regclass)
          ORDER BY relname`
      );
      expect(rls.rows).toEqual([
        { relname: 'account_service_principals', forced: true },
        { relname: 'users', forced: true }
      ]);
    } finally {
      await adminPool
        .query(`REVOKE "${donorRole}" FROM "${apiRole}", "${workerRole}"`)
        .catch(() => undefined);
      await testPool.query(`DROP OWNED BY "${apiRole}"`);
      await testPool.query(`DROP OWNED BY "${workerRole}"`);
      await testPool.query(`DROP OWNED BY "${donorRole}"`);
      await adminPool.query(`DROP ROLE IF EXISTS "${apiRole}"`);
      await adminPool.query(`DROP ROLE IF EXISTS "${workerRole}"`);
      await adminPool.query(`DROP ROLE IF EXISTS "${donorRole}"`);
    }
  });
});
