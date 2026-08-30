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
  const calls: string[] = [];
  const client = {
    query: async (sql: string) => {
      calls.push(sql);
      if (sql.includes('app.is_initial_setup_required')) statement = sql;
      return { rows: [{ setup_required: true }], rowCount: 1 };
    },
    release: () => undefined
  };
  const pool = {
    connect: async () => client
  };

  assert.equal(await isSetupRequired(pool as never), true);
  assert.deepEqual(calls.slice(0, 2), ['BEGIN', 'SET LOCAL ROLE cvg_installer']);
  assert.equal(calls.at(-1), 'COMMIT');
  assert.match(statement, /app\.is_initial_setup_required\(\)/);
  assert.doesNotMatch(statement, /FROM\s+users/i);
});

test('passes a complete canonical access catalog to one atomic database capability', async () => {
  const calls: { readonly sql: string; readonly values?: readonly unknown[] }[] = [];
  const client = {
    query: async (sql: string, values?: readonly unknown[]) => {
      calls.push({ sql, values });
      return {
        rows: [{ account_id: 'account-1', user_id: 'user-1', clinic_slug: 'clinica-central' }],
        rowCount: 1
      };
    },
    release: () => undefined
  };
  const pool = {
    connect: async () => client
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
  assert.deepEqual(calls.slice(0, 2), [
    { sql: 'BEGIN', values: undefined },
    { sql: 'SET LOCAL ROLE cvg_installer', values: undefined }
  ]);
  assert.match(calls[2]?.sql ?? '', /app\.provision_initial_installation\(/);
  assert.doesNotMatch(calls[2]?.sql ?? '', /INSERT\s+INTO/i);
  assert.deepEqual(calls.at(-1), { sql: 'COMMIT', values: undefined });

  const values = calls[2]?.values ?? [];
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

test('keeps the laboratory provider ingress permission in the first-run catalog', () => {
  assert.ok(
    INITIAL_PERMISSION_SEEDS.some((permission) => permission.key === 'laboratory.results.write')
  );
  assert.ok(INITIAL_ROLE_PERMISSION_MAP.admin?.includes('laboratory.results.write'));
});

test('rolls back the installer capability transaction when the database rejects the probe', async () => {
  const calls: string[] = [];
  const client = {
    query: async (sql: string) => {
      calls.push(sql);
      if (sql.includes('app.is_initial_setup_required')) {
        throw new Error('capability probe failed');
      }
      return { rows: [], rowCount: 0 };
    },
    release: () => undefined
  };
  const pool = { connect: async () => client };

  await assert.rejects(isSetupRequired(pool as never), /capability probe failed/);
  assert.deepEqual(calls, [
    'BEGIN',
    'SET LOCAL ROLE cvg_installer',
    'SELECT app.is_initial_setup_required() AS setup_required',
    'ROLLBACK'
  ]);
});

test('maps the database singleton conflict to the setup domain error', async () => {
  const client = {
    query: async (sql: string) => {
      if (sql.includes('app.provision_initial_installation')) {
        throw Object.assign(new Error('installation already provisioned'), { code: 'CVG01' });
      }
      return { rows: [], rowCount: 0 };
    },
    release: () => undefined
  };
  const pool = {
    connect: async () => client
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
