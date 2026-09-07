import test from 'node:test';
import assert from 'node:assert/strict';
import { createNativeDatabasePlan } from './lib/native-test-database-plan.mjs';
const runId = '12345678-1234-1234-1234-123456789abc';

test('native database plan isolates all test connections under a unique per-run name', () => {
  const plan = createNativeDatabasePlan('postgres://user:secret@127.0.0.1:5433/postgres', runId);
  assert.equal(plan.databaseName, 'cvg_his_v2_test_native_12345678123412341234123456789abc');
  assert.equal(plan.environment.DATABASE_URL, plan.databaseUrl);
  assert.equal(plan.environment.DATABASE_URL_TEST, plan.databaseUrl);
  assert.equal(plan.environment.E2E_DATABASE_URL, plan.databaseUrl);
  assert.equal(new URL(plan.adminUrl).pathname, '/postgres');
  assert.equal(new URL(plan.databaseUrl).pathname, `/${plan.databaseName}`);
  assert.ok(!JSON.stringify(plan.evidence).includes('secret'));
  assert.ok(!JSON.stringify(plan.evidence).includes('user'));
  assert.notEqual(createNativeDatabasePlan(plan.adminUrl, '22345678-1234-1234-1234-123456789abc').databaseName, plan.databaseName);
});

test('native database plan refuses implicit, remote, application and parameter-overridden targets', () => {
  for (const url of [undefined, '', 'not-a-url', 'https://localhost/postgres', 'postgres://db.example/postgres', 'postgres://127.0.0.1/production', 'postgres://localhost/cvg_his_v2_test', 'postgres://localhost/postgres?host=remote', 'postgres://localhost/postgres?dbname=production', 'postgres://localhost/postgres#fragment', 'postgres://localhost:0/postgres']) {
    assert.throws(() => createNativeDatabasePlan(url, runId));
  }
  for (const id of ['', '../escape', 'run', null]) assert.throws(() => createNativeDatabasePlan('postgres://localhost/postgres', id));
  assert.equal(createNativeDatabasePlan('postgresql://[::1]/postgres', runId).evidence.host, '[::1]');
});
