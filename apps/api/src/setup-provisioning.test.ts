import assert from 'node:assert/strict';
import test from 'node:test';

import {
  INITIAL_PERMISSION_SEEDS,
  INITIAL_ROLE_PERMISSION_MAP,
  INITIAL_ROLE_SEEDS,
  InstallationAlreadyProvisionedError,
  isSetupRequired,
  provisionInitialInstallation
} from './setup-provisioning.js';

test('reads setup state through the global installation capability, not tenant-scoped users', async () => {
  let statement = '';
  const pool = {
    query: async (sql: string) => {
      statement = sql;
      return { rows: [{ setup_required: true }], rowCount: 1 };
    }
  };

  assert.equal(await isSetupRequired(pool as never), true);
  assert.match(statement, /app\.is_initial_setup_required\(\)/);
  assert.doesNotMatch(statement, /FROM\s+users/i);
});

test('passes a complete canonical access catalog to one atomic database capability', async () => {
  const calls: { readonly sql: string; readonly values?: readonly unknown[] }[] = [];
  const pool = {
    query: async (sql: string, values?: readonly unknown[]) => {
      calls.push({ sql, values });
      return {
        rows: [{ account_id: 'account-1', user_id: 'user-1', clinic_slug: 'clinica-central' }],
        rowCount: 1
      };
    }
  };

  const result = await provisionInitialInstallation(pool as never, {
    clinicName: 'Clínica Central',
    adminUsername: 'admin',
    adminEmail: 'admin@example.com',
    adminPassword: 'SenhaForte2026!',
    adminFullName: 'Admin CVG',
    correlationId: 'corr-setup-db'
  });

  assert.deepEqual(result, {
    accountId: 'account-1',
    userId: 'user-1',
    clinicSlug: 'clinica-central'
  });
  assert.equal(calls.length, 1);
  assert.match(calls[0]?.sql ?? '', /app\.provision_initial_installation\(/);
  assert.doesNotMatch(calls[0]?.sql ?? '', /INSERT\s+INTO/i);

  const values = calls[0]?.values ?? [];
  assert.equal(values.length, 13);
  assert.match(String(values[7]), /^[0-9a-f]{32}:[0-9a-f]{128}$/);
  assert.deepEqual(JSON.parse(String(values[9])), INITIAL_ROLE_SEEDS);
  assert.deepEqual(JSON.parse(String(values[10])), INITIAL_PERMISSION_SEEDS);
  assert.deepEqual(JSON.parse(String(values[11])), INITIAL_ROLE_PERMISSION_MAP);
  assert.equal(values[12], 'corr-setup-db');

  const adminPermissions = INITIAL_ROLE_PERMISSION_MAP.admin ?? [];
  assert.equal(new Set(adminPermissions).size, INITIAL_PERMISSION_SEEDS.length);
  assert.deepEqual(
    [...adminPermissions].sort(),
    INITIAL_PERMISSION_SEEDS.map((permission) => permission.key).sort()
  );
});

test('maps the database singleton conflict to the setup domain error', async () => {
  const pool = {
    query: async () => {
      throw Object.assign(new Error('installation already provisioned'), { code: 'CVG01' });
    }
  };

  await assert.rejects(
    provisionInitialInstallation(pool as never, {
      clinicName: 'Clínica Central',
      adminUsername: 'admin',
      adminEmail: 'admin@example.com',
      adminPassword: 'SenhaForte2026!',
      correlationId: 'corr-setup-conflict'
    }),
    InstallationAlreadyProvisionedError
  );
});
