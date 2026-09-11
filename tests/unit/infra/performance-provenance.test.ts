import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

describe('performance runner provenance', () => {
  it('captures identity, sanitized target and before/after duration without secrets', () => {
    const root = mkdtempSync(join(tmpdir(), 'cvg-performance-provenance-'));
    const output = join(root, 'provenance.json');
    const script = join(process.cwd(), 'scripts/capture-performance-provenance.mjs');
    const env = {
      ...process.env,
      TARGET: 'https://user:secret@example.test:8443/api',
      LOAD_PROFILE: 'operational-minimum-v1',
      POSTGRES_POOL_MIN: '8',
      POSTGRES_MAX_CONNECTIONS: '60',
      GITHUB_SHA: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
      GITHUB_ACTIONS: 'true',
      GITHUB_RUN_ID: '123',
      GITHUB_RUN_ATTEMPT: '1',
      RUNNER_NAME: 'runner-test',
      RUNNER_OS: 'Linux',
      RUNNER_ARCH: 'X64',
    };
    try {
      execFileSync(process.execPath, [script, '--phase', 'before', '--output', output], { env });
      execFileSync(process.execPath, [script, '--phase', 'after', '--output', output], {
        env: { ...env, BENCHMARK_OUTCOME: 'failure' },
      });
      const report = JSON.parse(readFileSync(output, 'utf8'));
      expect(report.status).toBe('PASS');
      expect(report.commit_sha).toHaveLength(40);
      expect(report.identity_matches).toBe(true);
      expect(report.workload.target_origin).toBe('https://example.test:8443');
      expect(report.after.benchmark.outcome).toBe('failure');
      expect(report.duration_ms).toBeGreaterThanOrEqual(0);
      expect(JSON.stringify(report)).not.toContain('secret');
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
});
