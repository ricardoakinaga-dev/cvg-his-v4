import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createHash } from 'node:crypto';
import {
  mkdtempSync,
  mkdirSync,
  openSync,
  closeSync,
  readFileSync,
  readdirSync,
  constants
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  acquireCriticalProcessCoverage,
  isCriticalProcessRuntimeFixture
} from '../infra/scripts/critical-process-coverage.mjs';
import { requestProcessCoverageCheckpoint } from '../tests/helpers/process-coverage-control.mts';

const root = resolve(import.meta.dirname, '..');
const control = new URL('../tests/helpers/process-coverage-control.mts', import.meta.url).href;
const probeUrl = pathToFileURL(
  join(root, 'apps/worker/test-fixtures/runtime-observation.tsx')
).href;
const probeCode =
  'function runtimeFixtureProbe(value) { return value ? 1 : 2; } runtimeFixtureProbe(true);';
const fixtureFlags = {
  NODE_ENV: 'staging',
  CVG_CRITICAL_PROCESS_RUNNER: '1',
  CVG_CRITICAL_PROCESS_RUNTIME_FIXTURE: 'worker-entrypoint',
  CVG_CRITICAL_PROCESS_COVERAGE: '1',
  CVG_CRITICAL_PROCESS_SOURCE_CAPTURE: '1'
};

test('staging exception requires every explicit fixture flag and numeric procfs descriptor', () => {
  const valid = { ...fixtureFlags, NODE_V8_COVERAGE: `/proc/${process.pid}/fd/123` };
  assert.equal(isCriticalProcessRuntimeFixture(valid), process.platform === 'linux');
  for (const key of Object.keys(valid)) {
    assert.equal(isCriticalProcessRuntimeFixture({ ...valid, [key]: undefined }), false, key);
    assert.equal(isCriticalProcessRuntimeFixture({ ...valid, [key]: 'invalid' }), false, key);
  }
  for (const NODE_ENV of ['test', 'production', 'development', 'stage', 'prod']) {
    assert.equal(isCriticalProcessRuntimeFixture({ ...valid, NODE_ENV }), false, NODE_ENV);
  }
  for (const NODE_V8_COVERAGE of [
    '/tmp/raw',
    '/proc/self/fd/3',
    '/proc/0/fd/3',
    '/proc/123/fd/-1'
  ]) {
    assert.equal(
      isCriticalProcessRuntimeFixture({ ...valid, NODE_V8_COVERAGE }),
      false,
      NODE_V8_COVERAGE
    );
  }
});

async function requestFromTestParent(child, raw) {
  const values = { NODE_ENV: 'test', CVG_CRITICAL_PROCESS_COVERAGE: '1', NODE_V8_COVERAGE: raw };
  const previous = Object.fromEntries(Object.keys(values).map((key) => [key, process.env[key]]));
  try {
    Object.assign(process.env, values);
    await requestProcessCoverageCheckpoint(child);
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

for (const mode of ['capture', 'revoked-runner', 'missing-collector']) {
  test(
    `real staging fixture checkpoint: ${mode}`,
    { timeout: 20000, skip: process.platform !== 'linux' },
    async () => {
      const directory = mkdtempSync(join(tmpdir(), 'cvg-staging-checkpoint-'));
      const raw = join(directory, 'raw');
      mkdirSync(raw);
      const fd = openSync(raw, constants.O_RDONLY | constants.O_DIRECTORY);
      let session;
      try {
        session = acquireCriticalProcessCoverage({
          NODE_ENV: 'test',
          CVG_CRITICAL_PROCESS_COVERAGE: '1',
          NODE_V8_COVERAGE: `/proc/${process.pid}/fd/${fd}`
        });
      } finally {
        closeSync(fd);
      }
      let child;
      let terminal;
      let timer;
      let stderr = '';
      try {
        const env = {
          PATH: process.env.PATH,
          ...session.environment,
          ...fixtureFlags,
          CVG_PROCESS_COVERAGE_CONTROL: '1'
        };
        if (mode === 'missing-collector') delete env.NODE_OPTIONS;
        const program = `
        import { installProcessCoverageControl } from ${JSON.stringify(control)};
        import { Script } from 'node:vm';
        installProcessCoverageControl();
        new Script(${JSON.stringify(probeCode)}, {filename:${JSON.stringify(probeUrl)}}).runInThisContext();
        if (${JSON.stringify(mode)} === 'revoked-runner') delete process.env.CVG_CRITICAL_PROCESS_RUNNER;
        setInterval(() => {}, 1000);
        process.send({type:'fixture-ready', environment:process.env.NODE_ENV});
      `;
        child = spawn(
          process.execPath,
          ['--import', 'tsx/esm', '--input-type=module', '-e', program],
          {
            cwd: root,
            env,
            stdio: ['ignore', 'pipe', 'pipe', 'ipc']
          }
        );
        terminal = once(child, 'close');
        child.stderr.setEncoding('utf8');
        child.stderr.on('data', (chunk) => {
          stderr += chunk;
        });
        const ready = new Promise((done, reject) => {
          timer = setTimeout(
            () => reject(new Error(`fixture did not become ready: ${stderr}`)),
            10000
          );
          child.once('error', reject);
          child.once('exit', () => reject(new Error(`fixture exited before ready: ${stderr}`)));
          child.once('message', (message) => done(message));
        });
        const message = await ready;
        clearTimeout(timer);
        assert.deepEqual(message, { type: 'fixture-ready', environment: 'staging' });
        if (mode !== 'capture') {
          await assert.rejects(
            requestFromTestParent(child, raw),
            /child coverage checkpoint failed/
          );
          return;
        }
        await requestFromTestParent(child, raw);
        assert.equal(child.exitCode, null, 'checkpoint must complete while the worker is alive');
        const names = readdirSync(raw);
        const observations = names
          .filter((name) => name.startsWith(`executed-script-${child.pid}-0-`))
          .map((name) => JSON.parse(readFileSync(join(raw, name))));
        const observation = observations.find((value) => value.url === probeUrl);
        assert.ok(observation, 'actual executed code must be persisted before ACK');
        assert.equal(observation.code, probeCode);
        assert.equal(observation.pid, child.pid);
        assert.equal(observation.threadId, 0);
        assert.equal(observation.sha256, createHash('sha256').update(probeCode).digest('hex'));
        const reports = names.filter(
          (name) => name.startsWith(`coverage-${child.pid}-`) && name.endsWith('-0.json')
        );
        const bound = reports
          .map((name) => ({ name, value: JSON.parse(readFileSync(join(raw, name))) }))
          .find(({ value }) =>
            value.result.some(
              (script) => script.url === probeUrl && script.scriptId === observation.scriptId
            )
          );
        assert.ok(bound, 'V8 interval must be on disk before ACK and SIGKILL');
        const script = bound.value.result.find(
          (value) => value.url === probeUrl && value.scriptId === observation.scriptId
        );
        const probe = script.functions.find(
          (value) => value.functionName === 'runtimeFixtureProbe'
        );
        assert.equal(probe.ranges[0].count, 1);
        assert.ok(
          probe.ranges.some((range) => range.count === 0),
          'unexecuted branch remains uncovered'
        );
        const reportPath = join(raw, bound.name);
        const before = readFileSync(reportPath);
        child.kill('SIGKILL');
        const [code, signal] = await terminal;
        assert.equal(code, null);
        assert.equal(signal, 'SIGKILL');
        assert.deepEqual(readFileSync(reportPath), before);
      } finally {
        clearTimeout(timer);
        if (child && child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
        if (terminal) await terminal;
        session.close();
      }
    }
  );
}
