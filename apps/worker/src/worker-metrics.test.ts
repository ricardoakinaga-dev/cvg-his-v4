import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getWorkerMetricsText,
  recordWorkerTickMetric,
  updateWorkerRuntimeMetrics
} from './worker-metrics.js';
import {
  assertWorkerMetricsAuthConfigured,
  isWorkerMetricsRequestAuthorized
} from './metrics-auth.js';

test('worker metrics require a collector credential', () => {
  assert.equal(
    isWorkerMetricsRequestAuthorized(
      { authorization: 'Bearer worker-metrics-secret' },
      'worker-metrics-secret'
    ),
    true
  );
  assert.equal(isWorkerMetricsRequestAuthorized({}, 'worker-metrics-secret'), false);
  assert.equal(
    isWorkerMetricsRequestAuthorized(
      { authorization: 'Bearer wrong-secret' },
      'worker-metrics-secret'
    ),
    false
  );
  assert.equal(
    isWorkerMetricsRequestAuthorized(
      { 'x-metrics-token': 'worker-metrics-secret' },
      'worker-metrics-secret'
    ),
    true
  );
});

test('production-like worker startup fails closed without a metrics token', () => {
  assert.throws(
    () => assertWorkerMetricsAuthConfigured('production', undefined),
    /METRICS_AUTH_TOKEN/
  );
  assert.doesNotThrow(() =>
    assertWorkerMetricsAuthConfigured('production', 'worker-metrics-secret')
  );
  assert.doesNotThrow(() => assertWorkerMetricsAuthConfigured('development', undefined));
});

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
