import assert from 'node:assert/strict';
import test from 'node:test';
import { bootstrapCritical, resolveBootstrapDatabase } from './test-critical-bootstrap.mjs';

// Build the fixture URL from fragments so secret scanners do not mistake a
// deliberately fake test credential for a usable connection secret.
const url = ['post', 'gres://', 'test_user', ':test_password@127.0.0.1:5433/', 'cvg_his_v2_test'].join('');
const environment = { DATABASE_URL_TEST: url };
const log = () => {};

test('reuses explicit PostgreSQL without Docker or psql and runs the canonical strict harness', async () => {
  const calls = [];
  await bootstrapCritical({ environment, log, probe: async () => true,
    execute: (...args) => calls.push(args) });
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0][1], ['test:critical']);
  assert.equal(calls[0][2].REQUIRE_TEST_DB, '1');
  assert.equal(calls[0][2].DATABASE_URL_TEST, url);
});

test('explicit unavailable database fails without fallback or runner cleanup', async () => {
  await assert.rejects(bootstrapCritical({ environment, log, probe: async () => false,
    execute: () => assert.fail('must not execute external commands') }), /refusing Docker or in-memory fallback/);
});

test('an available admin database cannot hide a missing explicit target', async () => {
  const probed = [];
  await assert.rejects(bootstrapCritical({ environment, checkOnly: true, log,
    probe: async (connectionString) => {
      probed.push(new URL(connectionString).pathname);
      return new URL(connectionString).pathname === '/postgres';
    }, execute: () => assert.fail('missing explicit target must fail closed') }), /unreachable/);
  assert.deepEqual(probed, ['/cvg_his_v2_test']);
});

test('check-only probes without migrations or running tests', async () => {
  await bootstrapCritical({ environment, checkOnly: true, log, probe: async () => true,
    execute: () => assert.fail('check-only must not execute a command') });
});

test('default service starts Docker only when the test database is unavailable', async () => {
  const calls = []; let probes = 0;
  await bootstrapCritical({ environment: {}, checkOnly: true, log,
    probe: async () => ++probes > 1, execute: (...args) => calls.push(args) });
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], 'docker');
  assert.deepEqual(calls[0][1], ['compose', '-f', 'docker-compose.test.yml', 'up', '-d', 'postgres-test']);
});

test('startup exhaustion fails closed and never runs the suite', async () => {
  const calls = [];
  await assert.rejects(bootstrapCritical({ environment: {}, log, probe: async () => false,
    sleep: async () => {}, execute: (...args) => calls.push(args) }), /unreachable/);
  assert.equal(calls.length, 1);
});

test('rejects production, shell payload and invalid protocol before connecting', () => {
  for (const value of ['postgres://user:pass@localhost/production', 'file:///tmp/test',
    'postgres://localhost/test%24%28echo%20oops%29', 'invalid']) {
    assert.throws(() => resolveBootstrapDatabase({ DATABASE_URL_TEST: value }));
  }
  assert.equal(resolveBootstrapDatabase({ DATABASE_URL: 'postgres://localhost/production' }).explicit, false);
});

test('a failed critical command cannot print or return success', async () => {
  const lines = [];
  await assert.rejects(bootstrapCritical({ environment, probe: async () => true,
    execute: () => { throw new Error('failed'); }, log: (line) => lines.push(line) }), /failed/);
  assert.ok(!lines.includes('All critical tests passed.'));
});
