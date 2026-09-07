import test from 'node:test';
import assert from 'node:assert/strict';
import { withNativeTestDatabase } from './lib/native-test-database-lifecycle.mjs';

const runId = '12345678-1234-1234-1234-123456789abc';
function fixture(mode) {
  const calls = [];
  let marker = mode === 'premarked' ? 'owned-by-another-run' : null;
  let executed = false;
  const client = {
    async connect() { calls.push('connect'); },
    async end() { calls.push('end'); },
    async query(sql, params) {
      calls.push(sql);
      if (sql.startsWith('CREATE') && mode === 'exists') throw Error('password=secret already exists');
      if (sql.startsWith('COMMENT')) marker = `native-coverage:${runId}`;
      if (sql.startsWith('SELECT')) {
        assert.equal(params[0], 'cvg_his_v2_test_native_12345678123412341234123456789abc');
        return { rows: [{ oid: executed && mode === 'replaced' ? '999' : '123', marker: executed && mode === 'unmarked' ? null : marker }] };
      }
      if (sql.startsWith('DROP') && mode === 'drop-failure') throw Error('password=secret cleanup failed');
      return { rows: [] };
    },
  };
  return {
    calls,
    options: {
      adminUrl: 'postgres://user:secret@localhost:5433/postgres', runId,
      clientFactory: () => client,
      prepare: async (plan) => { calls.push('prepare'); assert.equal(plan.environment.DATABASE_URL, plan.databaseUrl); if (mode === 'prepare-failure') throw Error('secret'); },
      run: async () => { calls.push('run'); executed = true; if (mode === 'run-failure') throw Error('secret'); return 42; },
    },
  };
}

test('new owned database is prepared, used and removed with sanitized evidence', async () => {
  const { calls, options } = fixture('pass');
  const result = await withNativeTestDatabase(options);
  assert.equal(result.value, 42);
  assert.equal(result.evidence.cleanup, 'dropped-owned-database');
  assert.ok(calls.findIndex((sql) => sql.startsWith('CREATE')) < calls.indexOf('prepare'));
  assert.ok(calls.indexOf('prepare') < calls.indexOf('run'));
  assert.equal(calls.at(-1), 'end');
  assert.equal(calls.filter((sql) => sql.startsWith('DROP')).length, 1);
  assert.ok(!JSON.stringify(result.evidence).includes('secret'));
});

for (const mode of ['exists', 'prepare-failure', 'run-failure', 'replaced', 'unmarked', 'drop-failure', 'premarked']) test(`lifecycle ${mode} fails without deleting an unowned database`, async () => {
  const { calls, options } = fixture(mode);
  await assert.rejects(() => withNativeTestDatabase(options), (error) => {
    assert.ok(!String(error).includes('secret'));
    assert.ok(!JSON.stringify(error.evidence).includes('secret'));
    assert.equal(error.evidence.status, 'failed');
    return true;
  });
  assert.equal(calls.at(-1), 'end');
  assert.equal(calls.some((sql) => sql.startsWith('DROP')), ['prepare-failure', 'run-failure', 'drop-failure'].includes(mode));
  if (mode === 'exists') assert.ok(!calls.includes('prepare'));
  if (mode === 'premarked') assert.ok(!calls.some((sql) => sql.startsWith('COMMENT')));
});

test('client factory failures are sanitized with evidence', async () => {
  const { options } = fixture('pass');
  options.clientFactory = () => { throw Error('password=secret'); };
  await assert.rejects(() => withNativeTestDatabase(options), (error) => {
    assert.equal(error.evidence.failedPhase, 'client-factory');
    assert.ok(!String(error).includes('secret'));
    return true;
  });
});

test('a timed-out callback gets an abort signal and does not cause a drop while still pending', async () => {
  const { calls, options } = fixture('pass');
  let signal;
  options.deadlineMs = 20;
  options.run = async (_plan, context) => { signal = context.signal; return new Promise(() => {}); };
  await assert.rejects(() => withNativeTestDatabase(options), (error) => {
    assert.equal(error.evidence.cleanup, 'retained-operation-timeout');
    assert.equal(error.evidence.timedOut, true);
    return true;
  });
  assert.equal(signal.aborted, true);
  assert.ok(!calls.some((sql) => sql.startsWith('DROP')));
});

test('administrator close has a bounded deadline', async () => {
  const { options } = fixture('pass');
  const client = options.clientFactory();
  client.end = async () => new Promise(() => {});
  options.clientFactory = () => client;
  options.cleanupTimeoutMs = 10;
  await assert.rejects(() => withNativeTestDatabase(options), (error) => error.evidence.failedPhase === 'close-administrator');
});
