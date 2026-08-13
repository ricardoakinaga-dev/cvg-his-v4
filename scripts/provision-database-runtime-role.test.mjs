import assert from 'node:assert/strict';
import test from 'node:test';

import {
  parseRuntimeRoleProvisioningConfig,
  quotePostgresIdentifier,
  validateRuntimeRoleWithRetry
} from './provision-database-runtime-role.mjs';

function databaseUrl({ user, password, host = 'db.internal', database = 'cvg_his' }) {
  const url = new URL(`postgres://${host}:5432/${database}`);
  url.username = user;
  url.password = password;
  return url.toString();
}

test('parseRuntimeRoleProvisioningConfig separates admin and runtime credentials', () => {
  const adminUrl = databaseUrl({ user: 'migration_admin', password: 'admin-secret' });
  const runtimeUrl = databaseUrl({ user: 'cvg_runtime', password: 'runtime secret' });
  const config = parseRuntimeRoleProvisioningConfig({
    DATABASE_ADMIN_URL: adminUrl,
    DATABASE_URL: runtimeUrl
  });

  assert.deepEqual(config, {
    adminUrl,
    runtimeUrl,
    runtimeRole: 'cvg_runtime',
    runtimePassword: 'runtime secret',
    databaseName: 'cvg_his'
  });
});

test('parseRuntimeRoleProvisioningConfig requires both URLs', () => {
  assert.throws(() => parseRuntimeRoleProvisioningConfig({}), /DATABASE_ADMIN_URL/);
  assert.throws(
    () =>
      parseRuntimeRoleProvisioningConfig({
        DATABASE_ADMIN_URL: databaseUrl({ user: 'migration_admin', password: 'secret', host: 'db' })
      }),
    /DATABASE_URL/
  );
});

test('parseRuntimeRoleProvisioningConfig rejects an admin credential reused by runtime', () => {
  assert.throws(
    () =>
      parseRuntimeRoleProvisioningConfig({
        DATABASE_ADMIN_URL: databaseUrl({ user: 'postgres', password: 'secret', host: 'db' }),
        DATABASE_URL: databaseUrl({ user: 'postgres', password: 'secret', host: 'db' })
      }),
    /must use different PostgreSQL roles/i
  );
});

test('parseRuntimeRoleProvisioningConfig rejects different database targets', () => {
  assert.throws(
    () =>
      parseRuntimeRoleProvisioningConfig({
        DATABASE_ADMIN_URL: databaseUrl({ user: 'admin', password: 'secret', host: 'db-a' }),
        DATABASE_URL: databaseUrl({ user: 'runtime', password: 'secret', host: 'db-b' })
      }),
    /same PostgreSQL host/i
  );
  assert.throws(
    () =>
      parseRuntimeRoleProvisioningConfig({
        DATABASE_ADMIN_URL: databaseUrl({
          user: 'admin',
          password: 'secret',
          host: 'db',
          database: 'postgres'
        }),
        DATABASE_URL: databaseUrl({ user: 'runtime', password: 'secret', host: 'db' })
      }),
    /same target database/i
  );
});

test('quotePostgresIdentifier handles reserved and quoted role/database names safely', () => {
  assert.equal(quotePostgresIdentifier('runtime'), '"runtime"');
  assert.equal(quotePostgresIdentifier('role"name'), '"role""name"');
});

test('validateRuntimeRoleWithRetry retries transient startup failures without shell logic', async () => {
  let inspections = 0;
  const waits = [];
  const result = await validateRuntimeRoleWithRetry('postgres://runtime@db/cvg_his', {
    attempts: 3,
    intervalMs: 5,
    inspect: async () => {
      inspections += 1;
      if (inspections < 3) throw new Error('database is still starting');
      return { roleName: 'runtime', validated: true };
    },
    wait: async (milliseconds) => waits.push(milliseconds)
  });

  assert.deepEqual(result, { roleName: 'runtime', validated: true });
  assert.equal(inspections, 3);
  assert.deepEqual(waits, [5, 5]);
});

test('validateRuntimeRoleWithRetry rejects invalid retry configuration', async () => {
  await assert.rejects(
    validateRuntimeRoleWithRetry('postgres://runtime@db/cvg_his', { attempts: 0 }),
    /attempts must be a positive integer/i
  );
});
