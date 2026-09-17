import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getWorkerMetricsText,
  recordWorkerTickMetric,
  updateWorkerRuntimeMetrics
} from './worker-metrics.js';

test('worker runtime metrics expose durable state and processing freshness', async () => {
  updateWorkerRuntimeMetrics({ databaseHealthy: true, persistenceMode: 'database' });
  recordWorkerTickMetric('success', 125, 1_726_000_000);

  const metrics = await getWorkerMetricsText();
  assert.match(metrics, /worker_database_healthy 1/);
  assert.match(metrics, /worker_persistence_mode\{mode="database"\} 1/);
  assert.match(metrics, /worker_ticks_total\{status="success"\} [1-9]\d*/);
  assert.match(metrics, /worker_last_successful_tick_timestamp_seconds 1726000000/);
  assert.match(metrics, /worker_last_tick_timestamp_seconds 1726000000/);
  assert.match(metrics, /worker_tick_duration_seconds_count\{status="success"\} [1-9]\d*/);
});

test('degraded and failed ticks do not advance successful processing freshness', async () => {
  recordWorkerTickMetric('degraded', 50, 1_726_000_060);
  recordWorkerTickMetric('failed', 75, 1_726_000_120);

  const metrics = await getWorkerMetricsText();
  assert.match(metrics, /worker_ticks_total\{status="degraded"\} [1-9]\d*/);
  assert.match(metrics, /worker_ticks_total\{status="failed"\} [1-9]\d*/);
  assert.match(metrics, /worker_last_successful_tick_timestamp_seconds 1726000000/);
  assert.match(metrics, /worker_last_tick_timestamp_seconds 1726000120/);
});
