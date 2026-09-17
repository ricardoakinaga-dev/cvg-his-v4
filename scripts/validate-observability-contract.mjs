#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const REQUIRED_API_METRICS = [
  'app_database_healthy',
  'app_redis_healthy',
  'app_runtime_distributed_state_enabled',
  'app_database_pool_waiting_count',
  'app_database_pool_total_count',
  'app_database_pool_max_connections'
];

const REQUIRED_WORKER_METRICS = [
  'worker_ticks_total',
  'worker_tick_duration_seconds',
  'worker_last_successful_tick_timestamp_seconds',
  'worker_last_tick_timestamp_seconds',
  'worker_database_healthy',
  'worker_persistence_mode',
  'cvg_job_dead_letter_total'
];

const REQUIRED_ALERTS = [
  ['CVG_HIS_API_Redis_Unhealthy', 'app_redis_healthy', 'observability-alerts.md#redis-unhealthy'],
  [
    'CVG_HIS_API_DatabasePoolExhaustion',
    'app_database_pool_waiting_count',
    'observability-alerts.md#database-pool-exhaustion'
  ],
  ['CVG_HIS_Worker_Unavailable', 'job="cvg-worker"', 'observability-alerts.md#worker-unavailable'],
  [
    'CVG_HIS_Worker_ProcessingStale',
    'worker_last_successful_tick_timestamp_seconds',
    'observability-alerts.md#worker-processing-stale'
  ],
  [
    'CVG_HIS_Worker_DatabaseUnhealthy',
    'worker_database_healthy',
    'observability-alerts.md#worker-database-unhealthy'
  ],
  [
    'CVG_HIS_Worker_InMemoryMode',
    'worker_persistence_mode',
    'observability-alerts.md#worker-in-memory-mode'
  ],
  [
    'CVG_HIS_Worker_JobDeadLettered',
    'cvg_job_dead_letter_total',
    'observability-alerts.md#worker-job-dead-lettered'
  ]
];

const REQUIRED_DASHBOARD_TITLES = [
  'Worker processing freshness',
  'Worker outcomes and DLQ',
  'Runtime dependencies'
];

function readText(rootDirectory, relativePath) {
  return readFileSync(join(rootDirectory, relativePath), 'utf8');
}

export function inspectObservabilityContract({ rootDirectory = process.cwd() } = {}) {
  const findings = [];
  const requiredFiles = [
    'apps/api/src/metrics.ts',
    'apps/worker/src/worker-metrics.ts',
    'apps/worker/src/index.ts',
    'infra/observability/prometheus.yml',
    'infra/observability/prometheus-alerts.yml',
    'infra/observability/README.md',
    'infra/observability/grafana/cvg-his-v2-api-dashboard.json',
    'docs/runbooks/observability-alerts.md'
  ];

  for (const relativePath of requiredFiles) {
    if (!existsSync(join(rootDirectory, relativePath))) {
      findings.push(`missing observability contract file: ${relativePath}`);
    }
  }
  if (findings.length > 0) return findings;

  const apiMetrics = readText(rootDirectory, 'apps/api/src/metrics.ts');
  const workerMetrics = readText(rootDirectory, 'apps/worker/src/worker-metrics.ts');
  const worker = readText(rootDirectory, 'apps/worker/src/index.ts');
  const prometheus = readText(rootDirectory, 'infra/observability/prometheus.yml');
  const alerts = readText(rootDirectory, 'infra/observability/prometheus-alerts.yml');
  const readme = readText(rootDirectory, 'infra/observability/README.md');
  const runbook = readText(rootDirectory, 'docs/runbooks/observability-alerts.md');

  for (const metric of REQUIRED_API_METRICS) {
    if (!apiMetrics.includes(`'${metric}'`)) {
      findings.push(`API metric is not declared: ${metric}`);
    }
  }
  for (const metric of REQUIRED_WORKER_METRICS) {
    if (!workerMetrics.includes(`'${metric}'`)) {
      findings.push(`worker metric is not declared: ${metric}`);
    }
    if (!readme.includes(`\`${metric}\``)) {
      findings.push(`worker metric is not documented: ${metric}`);
    }
  }

  if (!worker.includes('updateWorkerRuntimeMetrics(')) {
    findings.push('worker bootstrap does not publish runtime dependency metrics');
  }
  if (!worker.includes('recordWorkerTickMetric(')) {
    findings.push('worker loop does not publish tick freshness metrics');
  }
  for (const marker of [
    "job_name: 'cvg-api'",
    "job_name: 'cvg-worker'",
    "metrics_path: '/metrics'",
    'cvg-his-v2-worker:3002'
  ]) {
    if (!prometheus.includes(marker)) {
      findings.push(`Prometheus scrape contract is missing marker: ${marker}`);
    }
  }

  for (const [alertName, metric, runbookReference] of REQUIRED_ALERTS) {
    const alertIndex = alerts.indexOf(`alert: ${alertName}`);
    if (alertIndex < 0) {
      findings.push(`observability alert is missing: ${alertName}`);
      continue;
    }
    const nextAlertIndex = alerts.indexOf('\n      - alert:', alertIndex + 1);
    const block = alerts.slice(alertIndex, nextAlertIndex < 0 ? undefined : nextAlertIndex);
    if (!block.includes(metric)) {
      findings.push(`${alertName} does not reference expected signal: ${metric}`);
    }
    if (!block.includes(`runbook: 'docs/runbooks/${runbookReference}'`)) {
      findings.push(`${alertName} does not link its runbook: ${runbookReference}`);
    }
    const runbookAnchor = runbookReference.split('#')[1];
    if (!runbook.includes(`<a id="${runbookAnchor}"></a>`)) {
      findings.push(`${alertName} runbook anchor is missing: ${runbookAnchor}`);
    }
  }

  let dashboard;
  try {
    dashboard = JSON.parse(
      readText(rootDirectory, 'infra/observability/grafana/cvg-his-v2-api-dashboard.json')
    );
  } catch (error) {
    findings.push(`Grafana dashboard is not valid JSON: ${error.message}`);
    dashboard = null;
  }
  const titles = new Set((dashboard?.panels ?? []).map((panel) => panel.title));
  for (const title of REQUIRED_DASHBOARD_TITLES) {
    if (!titles.has(title)) findings.push(`Grafana dashboard panel is missing: ${title}`);
  }
  for (const signal of [
    'worker_last_successful_tick_timestamp_seconds',
    'worker_ticks_total',
    'cvg_job_dead_letter_total',
    'app_redis_healthy',
    'app_database_pool_waiting_count',
    'worker_database_healthy',
    'worker_persistence_mode'
  ]) {
    if (!readme.includes(`\`${signal}\``) && !JSON.stringify(dashboard).includes(signal)) {
      findings.push(`observability signal is neither documented nor dashboarded: ${signal}`);
    }
  }

  return findings;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const findings = inspectObservabilityContract();
  if (findings.length > 0) {
    console.error('# Observability Contract: FAIL');
    for (const finding of findings) console.error(`- ${finding}`);
    process.exitCode = 1;
  } else {
    console.log('# Observability Contract: PASS');
    console.log('Metrics, scrape targets, alerts, dashboard panels and runbooks are connected.');
  }
}
