import assert from 'node:assert/strict';
import { test } from 'node:test';

import { runDatabaseBootstrap } from './database-bootstrap.mjs';

test('migrates with the admin connection before provisioning the isolated runtime role', async () => {
  const environment = Object.freeze({
    DATABASE_URL: 'postgres://migration_admin@db/cvg_his',
    DATABASE_ADMIN_URL: 'postgres://migration_admin@db/cvg_his',
    DATABASE_RUNTIME_URL: 'postgres://runtime@db/cvg_his'
  });
  const events = [];

  const result = await runDatabaseBootstrap({
    environment,
    migrate: async () => events.push('migrate'),
    parseConfig: (candidate) => {
      events.push(`parse:${candidate.DATABASE_URL}`);
      return Object.freeze({ runtimeRole: 'runtime' });
    },
    provisionRole: async (config) => {
      events.push(`provision:${config.runtimeRole}`);
      return Object.freeze({ roleName: config.runtimeRole });
    }
  });

  assert.deepEqual(events, [
    'migrate',
    'parse:postgres://runtime@db/cvg_his',
    'provision:runtime'
  ]);
  assert.deepEqual(result, { roleName: 'runtime' });
  assert.equal(environment.DATABASE_URL, 'postgres://migration_admin@db/cvg_his');
});

test('fails closed when the runtime URL is absent', async () => {
  await assert.rejects(
    runDatabaseBootstrap({
      environment: { DATABASE_URL: 'postgres://migration_admin@db/cvg_his' },
      migrate: async () => undefined,
      parseConfig: () => ({}),
      provisionRole: async () => ({})
    }),
    /DATABASE_RUNTIME_URL is required/
  );
});
