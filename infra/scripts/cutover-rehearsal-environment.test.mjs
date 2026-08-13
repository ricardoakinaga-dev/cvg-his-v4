import assert from 'node:assert/strict';
import test from 'node:test';

import { buildRehearsalEnvironment } from './cutover-rehearsal-environment.mjs';

test('buildRehearsalEnvironment supplies the restricted runtime database contract', () => {
  const environment = buildRehearsalEnvironment(1234);
  const runtimeUrl = new URL(environment.DATABASE_RUNTIME_URL_DOCKER);
  const adminUrl = new URL(environment.DATABASE_ADMIN_URL);

  assert.equal(runtimeUrl.username, environment.DATABASE_RUNTIME_USER);
  assert.equal(runtimeUrl.password, environment.DATABASE_RUNTIME_PASSWORD);
  assert.equal(runtimeUrl.hostname, 'postgres');
  assert.equal(runtimeUrl.pathname, '/cvg_his_v2_rehearsal');
  assert.equal(adminUrl.username, 'postgres');
  assert.notEqual(adminUrl.password, runtimeUrl.password);
  assert.equal(environment.DATABASE_URL, environment.DATABASE_RUNTIME_URL_DOCKER);
});

test('buildRehearsalEnvironment supplies an explicit worker tenant and production-safe basics', () => {
  const environment = buildRehearsalEnvironment(5678);

  assert.equal(environment.NODE_ENV, 'production');
  assert.match(environment.WORKER_ACCOUNT_IDS, /^[0-9a-f-]{36}$/);
  assert.ok(environment.AUTH_SECRET.length >= 32);
  assert.notEqual(environment.POSTGRES_PASSWORD, environment.DATABASE_RUNTIME_PASSWORD);
});
