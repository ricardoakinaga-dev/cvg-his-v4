import assert from 'node:assert/strict';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import test from 'node:test';

import { inspectObservabilityContract } from './validate-observability-contract.mjs';

const rootDirectory = process.cwd();

test('accepts the connected metrics, alerts, dashboard and runbook contract', () => {
  assert.deepEqual(inspectObservabilityContract({ rootDirectory }), []);
});

test('worker scrape and runtime are bound to the collector credential', () => {
  const root = process.cwd();
  const worker = readFileSync(join(root, 'apps/worker/src/index.ts'), 'utf8');
  const prometheus = readFileSync(join(root, 'infra/observability/prometheus.yml'), 'utf8');
  const workerScrape = prometheus.slice(prometheus.indexOf("job_name: 'cvg-worker'"));
  assert.match(worker, /isWorkerMetricsRequestAuthorized/);
  assert.match(worker, /assertWorkerMetricsAuthConfigured/);
  assert.match(workerScrape, /authorization:/);
  assert.match(workerScrape, /credentials_file: \/etc\/prometheus\/secrets\/api-metrics-token/);
});

test('fails closed when an alert loses its runbook reference', () => {
  const fixtureDirectory = mkdtempSync(join(tmpdir(), 'cvg-observability-'));
  try {
    for (const relativePath of [
      'apps/api/src/metrics.ts',
      'apps/worker/src/worker-metrics.ts',
      'apps/worker/src/index.ts',
      'infra/observability/prometheus.yml',
      'infra/observability/prometheus-alerts.yml',
      'infra/observability/README.md',
      'infra/observability/grafana/cvg-his-v2-api-dashboard.json',
      'docs/runbooks/observability-alerts.md'
    ]) {
      const destination = join(fixtureDirectory, relativePath);
      mkdirSync(dirname(destination), { recursive: true });
      cpSync(join(rootDirectory, relativePath), destination);
    }
    const alertsPath = join(fixtureDirectory, 'infra/observability/prometheus-alerts.yml');
    writeFileSync(
      alertsPath,
      readFileSync(alertsPath, 'utf8').replace(
        "runbook: 'docs/runbooks/observability-alerts.md#redis-unhealthy'",
        ''
      )
    );
    const findings = inspectObservabilityContract({ rootDirectory: fixtureDirectory });
    assert.ok(findings.some((finding) => finding.includes('CVG_HIS_API_Redis_Unhealthy')));
  } finally {
    assert.equal(existsSync(fixtureDirectory), true);
    rmSync(fixtureDirectory, { recursive: true, force: true });
  }
});
