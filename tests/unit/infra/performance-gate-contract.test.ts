import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const root = resolve(import.meta.dirname, '../../..');
const ci = readFileSync(resolve(root, '.github/workflows/ci.yml'), 'utf8');
const certification = readFileSync(
  resolve(root, '.github/workflows/performance-certification.yml'),
  'utf8'
);
const benchmark = readFileSync(resolve(root, 'benchmarks/k6/api-benchmark.js'), 'utf8');
const catalog = JSON.parse(readFileSync(resolve(root, 'benchmarks/k6/slos.json'), 'utf8'));

function job(source: string, name: string) {
  const start = source.indexOf(`  ${name}:`);
  const next = source.slice(start + 3).search(/\n {2}[a-z0-9-]+:\n/);
  return source.slice(start, next === -1 ? undefined : start + 3 + next);
}

describe('performance and SLO gate', () => {
  it('runs the blocking CI profile against PostgreSQL and Redis with deterministic fixtures', () => {
    const performanceJob = job(ci, 'performance-k6');
    expect(performanceJob).toContain('pnpm exec tsx packages/db/src/migrate.ts');
    expect(performanceJob).toContain('pnpm benchmark:k6:seed');
    expect(performanceJob).toContain(
      'DATABASE_URL: postgres://postgres:postgres@localhost:5433/cvg_his_v2_test'
    );
    expect(performanceJob).toContain('REDIS_URL: redis://localhost:6380');
    expect(performanceJob).toContain('curl -fsS http://localhost:3001/ready');
    expect(performanceJob).not.toContain('curl -fsS http://localhost:3001/health');
    expect(performanceJob).toContain('LOAD_PROFILE: operational-minimum-v1');
    expect(performanceJob).not.toContain('continue-on-error: true');
    expect(performanceJob).toContain(
      '47a43a8dbb4c1f5d5bd7b8ed6a1b8c83b35546acf989b78400b4e6ce3adaf628'
    );
  });

  it('fails closed on login and selects a declared load profile', () => {
    expect(benchmark).toContain("JSON.parse(open('./slos.json'))");
    expect(benchmark).toContain(
      'throw new Error(`Benchmark login failed closed with HTTP ${loginRes.status}`)'
    );
    expect(catalog.loadProfiles.map((profile: { id: string }) => profile.id)).toEqual([
      'operational-minimum-v1',
      'endurance-2h-v1'
    ]);
  });

  it('protects target endurance behind approval, HTTPS and explicit disposable-target confirmation', () => {
    expect(certification).toContain('environment: performance-certification');
    expect(certification).toContain('BENCHMARK-DESCARTAVEL');
    expect(certification).toContain("grep -Eq '^https://");
    expect(certification).toContain('git merge-base --is-ancestor');
    expect(certification).toContain('TEST_PASSWORD: ${{ secrets.PERF_PASSWORD }}');
    expect(certification).toContain('if-no-files-found: error');
  });
});
