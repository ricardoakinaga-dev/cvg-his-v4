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
const benchmarkSeed = readFileSync(
  resolve(root, 'benchmarks/k6/seed-benchmark-fixtures.ts'),
  'utf8'
);
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
    expect(performanceJob).toContain('mkdir -p benchmarks/k6/results');
    expect(performanceJob).toContain('Capture performance runner provenance');
    expect(performanceJob).toContain('Finalize performance runner provenance');
    expect(performanceJob).toContain('performance-provenance.json');
    expect(performanceJob).toContain('BENCHMARK_OUTCOME: ${{ steps.k6-benchmark.outcome }}');
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
    expect(benchmark).toContain("http_req_failed: ['rate<0.005']");
    expect(benchmark).toContain('api_availability:');
    expect(benchmark).toContain("data.metrics['http_req_failed']");
    expect(benchmark).toContain("direction: 'gte'");
    expect(benchmark).toContain('evaluateThreshold(config.actual, config.target, config.direction)');
    expect(benchmark).toContain('authLatency.add(loginRes.timings.duration)');
    expect(benchmark).toContain("new Trend('query_patients_list_latency_ms')");
    expect(benchmark).toContain("new Trend('query_patient_detail_latency_ms')");
    expect(benchmark).toContain("new Trend('inventory_read_latency_ms')");
    expect(benchmark).toContain("new Trend('inventory_create_latency_ms')");
    expect(benchmark).not.toContain("group('Auth - Login'");
    expect(benchmark).toContain('${BASE_URL}/appointments?startAt=');
    expect(benchmark).not.toContain('/scheduling/appointments');
    expect(benchmark).toContain('/medical-records/entries?encounterId=');
    expect(benchmark).not.toContain('/medical-records/entries?page=1&limit=10');
    expect(catalog.loadProfiles.map((profile: { id: string }) => profile.id)).toEqual([
      'operational-minimum-v1',
      'endurance-2h-v1'
    ]);
  });

  it('seeds valid UUID domain rows for detail and encounter-scoped workload paths', () => {
    expect(benchmarkSeed).toContain(
      "const BENCHMARK_OWNER_ID = '00000000-0000-4000-8000-000000000401'"
    );
    expect(benchmarkSeed).toContain(
      "const BENCHMARK_PATIENT_ID = '00000000-0000-4000-8000-000000000402'"
    );
    expect(benchmarkSeed).toContain(
      "const BENCHMARK_ENCOUNTER_ID = '00000000-0000-4000-8000-000000000403'"
    );
    expect(benchmarkSeed).toContain('INSERT INTO owners');
    expect(benchmarkSeed).toContain('INSERT INTO patients');
    expect(benchmarkSeed).toContain('INSERT INTO encounters');
    expect(benchmarkSeed).toContain("status: 'active'");
  });

  it('protects target endurance behind approval, HTTPS and explicit disposable-target confirmation', () => {
    expect(certification).toContain('environment: performance-certification');
    expect(certification).toContain('BENCHMARK-DESCARTAVEL');
    expect(certification).toContain("grep -Eq '^https://");
    expect(certification).toContain('git merge-base --is-ancestor');
    expect(certification).toContain('TEST_PASSWORD: ${{ secrets.PERF_PASSWORD }}');
    expect(certification).toContain('mkdir -p benchmarks/k6/results');
    expect(certification).toContain('if-no-files-found: error');
  });
});
