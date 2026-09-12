import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import test from 'node:test';
import { join } from 'node:path';
import {
  capturePerformanceDiagnostics,
  collectPerformanceSnapshot,
  redactConnectionString
} from './capture-performance-diagnostics.mjs';

test('performance diagnostics redact credentials while preserving the target', () => {
  const connectionString = [
    'postgres://benchmark_user',
    'benchmark_secret@localhost:5433/cvg_his_v2_test?sslmode=disable'
  ].join(':');
  const redacted = redactConnectionString(connectionString);

  const expected = [
    'postgres://%3Credacted%3E',
    '%3Credacted%3E@localhost:5433/cvg_his_v2_test?sslmode=disable'
  ].join(':');
  assert.equal(redacted, expected);
  assert.equal(redacted.includes('benchmark_secret'), false);
});

test('performance snapshot is bounded when PostgreSQL is unavailable', async () => {
  const snapshot = await collectPerformanceSnapshot({
    rootDir: process.cwd(),
    env: {
      TARGET: 'http://localhost:3001',
      LOAD_PROFILE: 'operational-minimum-v1'
    },
    phase: 'test',
    now: new Date('2026-09-12T00:00:00.000Z'),
    detailed: false
  });

  assert.equal(snapshot.phase, 'test');
  assert.equal(snapshot.captured_at, '2026-09-12T00:00:00.000Z');
  assert.equal(snapshot.database.status, 'SKIPPED');
  assert.match(snapshot.commit_sha ?? '', /^[0-9a-f]{40}$/);
  assert.equal(snapshot.workload.target_origin, 'http://localhost:3001');
  assert.ok(snapshot.system.runner.cpu_count > 0);
});

test('performance snapshot fails closed on an invalid database URL without leaking it', async () => {
  const snapshot = await collectPerformanceSnapshot({
    env: { DATABASE_URL: 'postgres://user:secret@[%invalid]' },
    phase: 'invalid-url',
    detailed: false
  });

  assert.equal(snapshot.database.status, 'PARTIAL');
  assert.match(JSON.stringify(snapshot), /invalid-connection-string|ENOTFOUND|Invalid/);
  assert.equal(JSON.stringify(snapshot).includes('secret'), false);
});

test('terminal diagnostics append an after-boundary sample to a partial watch report', async () => {
  const directory = mkdtempSync(join('/tmp', 'cvg-performance-diagnostics-'));
  const outputPath = join(directory, 'performance-diagnostics.json');
  const env = {
    TARGET: 'http://localhost:3001',
    LOAD_PROFILE: 'operational-minimum-v1'
  };

  try {
    await capturePerformanceDiagnostics({
      rootDir: process.cwd(),
      outputPath,
      env,
      phase: 'watch',
      watch: false
    });
    await capturePerformanceDiagnostics({
      rootDir: process.cwd(),
      outputPath,
      env,
      phase: 'after',
      appendExisting: true,
      watch: false
    });

    const report = JSON.parse(readFileSync(outputPath, 'utf8'));
    assert.deepEqual(
      report.samples.map((sample) => sample.phase),
      ['watch', 'after']
    );
    assert.equal(report.samples.at(-1).phase, 'after');
    assert.equal(report.samples.at(-1).system.commands.note, undefined);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
