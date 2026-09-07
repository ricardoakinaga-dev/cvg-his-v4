import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, openSync, closeSync, renameSync, symlinkSync, readdirSync, constants, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { acquireCriticalProcessCoverage } from '../infra/scripts/critical-process-coverage.mjs';
import { buildChildEnvironment } from '../infra/scripts/run-critical-process-suite.mjs';

test('coverage is opt-in and rejects paths or invalid environments', () => {
  assert.equal(acquireCriticalProcessCoverage({ NODE_V8_COVERAGE: '/untrusted/path' }), null);
  for (const environment of [
    {}, { NODE_ENV: 'production', NODE_V8_COVERAGE: `/proc/${process.pid}/fd/99999` },
    { NODE_ENV: 'test', NODE_V8_COVERAGE: '/tmp/replaceable' },
    { NODE_ENV: 'test', NODE_V8_COVERAGE: '/proc/self/fd/3' }
  ]) assert.throws(() => acquireCriticalProcessCoverage({ ...environment, CVG_CRITICAL_PROCESS_COVERAGE: '1' }), /requires Linux/);
});

test('suite holds its own directory descriptor and passes it to a real child', () => {
  const root = mkdtempSync(join(tmpdir(), 'cvg-process-coverage-contract-'));
  const raw = join(root, 'raw'), moved = join(root, 'raw-retained'), outside = join(root, 'outside');
  mkdirSync(raw); mkdirSync(outside);
  const descriptor = openSync(raw, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
  let session;
  try {
    session = acquireCriticalProcessCoverage({ NODE_ENV: 'test', CVG_CRITICAL_PROCESS_COVERAGE: '1', NODE_V8_COVERAGE: `/proc/${process.pid}/fd/${descriptor}` });
  } finally { closeSync(descriptor); }
  try {
    // Closing the caller's FD and replacing its original path must not redirect
    // either the suite's descriptor or the Node runtime's coverage output.
    renameSync(raw, moved); symlinkSync(outside, raw, 'dir');
    const env = buildChildEnvironment('fixture', 'postgresql://localhost/cvg_his_v2_test_fixture', session.environment);
    assert.equal(env.NODE_ENV, 'test');
    assert.equal(env.CVG_CRITICAL_PROCESS_COVERAGE, '1');
    assert.equal(env.NODE_V8_COVERAGE, session.environment.NODE_V8_COVERAGE);
    const child = spawnSync(process.execPath, ['-e', "function exercised(){return 42} exercised();require('node:v8').takeCoverage();"], { env, encoding: 'utf8', timeout: 10000 });
    assert.equal(child.status, 0, child.stderr);
    assert.ok(readdirSync(moved).some((name) => name.endsWith('.json')));
    assert.deepEqual(readdirSync(outside), []);
  } finally { session.close(); session.close(); }
  assert.throws(() => statSync(session.environment.NODE_V8_COVERAGE), /ENOENT/);
});

test('regular-file descriptors and closed descriptors are rejected', () => {
  const root = mkdtempSync(join(tmpdir(), 'cvg-process-coverage-invalid-'));
  const file = join(root, 'file'); writeFileSync(file, 'not a directory', { flag: 'wx' });
  const descriptor = openSync(file, constants.O_RDONLY);
  const environment = { NODE_ENV: 'test', CVG_CRITICAL_PROCESS_COVERAGE: '1', NODE_V8_COVERAGE: `/proc/${process.pid}/fd/${descriptor}` };
  try { assert.throws(() => acquireCriticalProcessCoverage(environment), /not a directory/); }
  finally { closeSync(descriptor); }
  assert.throws(() => acquireCriticalProcessCoverage(environment), /ENOENT/);
});
