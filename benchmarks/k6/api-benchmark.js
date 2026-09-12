/**
 * k6 API Benchmark Suite — CVG-HIS V4
 *
 * Load testing for CVG-HIS-V2 API.
 * Covers critical endpoints with SLO thresholds.
 *
 * Run with:
 *   k6 run benchmarks/k6/api-benchmark.js
 *   k6 run benchmarks/k6/api-benchmark.js --env TARGET=https://api.staging.cvg.com
 *
 * SLO Targets (from benchmarks/k6/slos.json):
 *   - API P95 latency < 200ms
 *   - API P99 latency < 500ms
 *   - Error rate < 0.1%
 *   - Availability > 99.5%
 *   - Auth P95 latency < 300ms
 *   - Query P95 latency < 150ms
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';
import { evaluateThreshold } from './slo-evaluator.js';

const SLO_CATALOG = JSON.parse(open('./slos.json'));
const LOAD_PROFILE_ID = __ENV.LOAD_PROFILE ?? 'operational-minimum-v1';
const LOAD_PROFILE = SLO_CATALOG.loadProfiles.find((profile) => profile.id === LOAD_PROFILE_ID);
if (!LOAD_PROFILE) {
  throw new Error(`Unknown LOAD_PROFILE: ${LOAD_PROFILE_ID}`);
}

// Custom metrics
const apiLatency = new Trend('api_latency_ms');
const errorRate = new Rate('api_errors');
const authLatency = new Trend('auth_latency_ms');
const queryLatency = new Trend('query_latency_ms');
const writeLatency = new Trend('write_latency_ms');
const billingLatency = new Trend('billing_latency_ms');
const inventoryLatency = new Trend('inventory_latency_ms');
const healthLatency = new Trend('health_latency_ms');
// Endpoint-level diagnostics keep the blocking aggregate SLOs comparable while
// making a tail attributable to a concrete read or write path.
const queryPatientsListLatency = new Trend('query_patients_list_latency_ms');
const queryPatientDetailLatency = new Trend('query_patient_detail_latency_ms');
const inventoryReadLatency = new Trend('inventory_read_latency_ms');
const inventoryCreateLatency = new Trend('inventory_create_latency_ms');

// Test configuration
const BASE_URL = __ENV.TARGET ?? 'http://localhost:3001';
const FALLBACK_ACCOUNT_ID = __ENV.ACCOUNT_ID ?? 'acc_cvg_demo';

// Test credentials — seed users from UsersService
const TEST_USER = {
  username: __ENV.TEST_USERNAME ?? 'admin@cvg-his.local',
  password: __ENV.TEST_PASSWORD ?? 'seed_admin',
  role: 'admin'
};

// The performance seed creates these rows in the disposable tenant. Keeping the
// IDs deterministic lets every VU exercise detail and encounter-scoped routes
// without manufacturing a not-found response that would fail http_req_failed.
const BENCHMARK_PATIENT_ID = __ENV.BENCHMARK_PATIENT_ID ?? '00000000-0000-4000-8000-000000000402';
const BENCHMARK_ENCOUNTER_ID =
  __ENV.BENCHMARK_ENCOUNTER_ID ?? '00000000-0000-4000-8000-000000000403';

// SLO thresholds from slos.json
export const options = {
  stages: LOAD_PROFILE.stages,
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(50)', 'p(90)', 'p(95)', 'p(99)'],
  thresholds: {
    api_latency_ms: ['p(95)<200', 'p(99)<500'],
    api_errors: ['rate<0.001'], // SLO: 0.1% error rate
    http_req_failed: ['rate<0.005'], // SLO: availability > 99.5%
    auth_latency_ms: ['p(95)<300'],
    query_latency_ms: ['p(95)<150'],
    write_latency_ms: ['p(95)<300'],
    billing_latency_ms: ['p(95)<250'],
    inventory_latency_ms: ['p(95)<200']
  }
};

export function setup() {
  const loginRes = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({
      username: TEST_USER.username,
      password: TEST_USER.password
    }),
    {
      headers: { 'Content-Type': 'application/json' }
    }
  );

  // Authentication is measured once here. Repeating login from every VU and
  // iteration self-triggers the production-equivalent IP rate limiter.
  authLatency.add(loginRes.timings.duration);

  if (loginRes.status === 200) {
    const body = JSON.parse(loginRes.body);
    const token = body.accessToken ?? '';
    const accountId = body.principal?.user?.accountId ?? FALLBACK_ACCOUNT_ID;
    return { token, testUser: TEST_USER, accountId };
  }

  throw new Error(`Benchmark login failed closed with HTTP ${loginRes.status}`);
}

// ========== SCENARIOS ==========

export default function (data) {
  const token = data.token;
  const accountId = data.accountId ?? FALLBACK_ACCOUNT_ID;
  // Keep detail and encounter-scoped requests bound to the rows prepared by
  // the benchmark seed. List endpoints intentionally remain part of the
  // workload, but their first row is not a stable fixture: a dirty database
  // may return an older patient or a closed encounter first.
  const patientId = BENCHMARK_PATIENT_ID;
  const encounterId = BENCHMARK_ENCOUNTER_ID;
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    'x-account-id': accountId,
    'X-Correlation-Id': `k6-${__VU}-${__ITER}`
  };

  // Health check
  group('Health', () => {
    const res = http.get(`${BASE_URL}/health`);
    healthLatency.add(res.timings.duration);
    check(res, {
      'health returns 200': (r) => r.status === 200,
      'health latency < 50ms': (r) => r.timings.duration < 50
    });
    apiLatency.add(res.timings.duration);
    errorRate.add(res.status !== 200);
  });

  // Owners (read)
  group('Owners - List', () => {
    const start = Date.now();
    const res = http.get(`${BASE_URL}/owners`, { headers });

    queryLatency.add(Date.now() - start);
    apiLatency.add(res.timings.duration);
    errorRate.add(res.status !== 200);

    check(res, {
      'owners returns 200': (r) => r.status === 200,
      'owners has valid JSON': (r) => {
        try {
          JSON.parse(r.body);
          return true;
        } catch {
          return false;
        }
      }
    });
  });

  // Patients (read with pagination)
  group('Patients - List', () => {
    const start = Date.now();
    const res = http.get(`${BASE_URL}/patients?page=1&limit=20`, { headers });

    queryLatency.add(Date.now() - start);
    apiLatency.add(res.timings.duration);
    errorRate.add(res.status !== 200);

    check(res, {
      'patients returns 200': (r) => r.status === 200
    });
  });

  // Patient detail
  group('Patients - Detail', () => {
    const start = Date.now();
    const listStart = Date.now();
    const listRes = http.get(`${BASE_URL}/patients?page=1&limit=1`, { headers });
    queryPatientsListLatency.add(Date.now() - listStart);
    const detailStart = Date.now();
    const res = http.get(`${BASE_URL}/patients/${patientId}`, { headers });

    queryPatientDetailLatency.add(Date.now() - detailStart);
    queryLatency.add(Date.now() - start);
    apiLatency.add(res.timings.duration);
    errorRate.add(res.status !== 200);

    check(res, {
      'patient detail returns 200': (r) => r.status === 200
    });
  });

  // Staff listing
  group('Staff - List', () => {
    const start = Date.now();
    const res = http.get(`${BASE_URL}/staff`, { headers });

    queryLatency.add(Date.now() - start);
    apiLatency.add(res.timings.duration);
    errorRate.add(res.status !== 200);

    check(res, {
      'staff returns 200': (r) => r.status === 200
    });
  });

  // Encounters (recent)
  group('Encounters - List', () => {
    const start = Date.now();
    const res = http.get(`${BASE_URL}/encounters?page=1&limit=10`, { headers });

    queryLatency.add(Date.now() - start);
    apiLatency.add(res.timings.duration);
    errorRate.add(res.status !== 200);

    check(res, {
      'encounters returns 200': (r) => r.status === 200
    });
  });

  // Scheduling
  group('Scheduling - Appointments', () => {
    const start = Date.now();
    const startAt = new Date();
    const endAt = new Date(startAt.getTime() + 24 * 60 * 60 * 1000);
    const res = http.get(
      `${BASE_URL}/appointments?startAt=${encodeURIComponent(startAt.toISOString())}&endAt=${encodeURIComponent(endAt.toISOString())}`,
      { headers }
    );

    queryLatency.add(Date.now() - start);
    apiLatency.add(res.timings.duration);
    errorRate.add(res.status !== 200);

    check(res, {
      'appointments returns 200': (r) => r.status === 200
    });
  });

  // Billing estimate (write scenario)
  group('Billing - Create Estimate', () => {
    // First find an encounter to bill
    const encounterStart = Date.now();
    const encRes = http.get(`${BASE_URL}/encounters?page=1&limit=1`, { headers });
    queryLatency.add(Date.now() - encounterStart);
    errorRate.add(encRes.status !== 200);
    check(encRes, {
      'billing encounter lookup returns 200': (r) => r.status === 200
    });
    // Keep the lookup in the query SLO; the billing metric covers the mutation only.
    const billingStart = Date.now();
    const res = http.post(
      `${BASE_URL}/billing/estimate`,
      JSON.stringify({
        encounterId,
        administrativeNotes: 'k6 benchmark billing estimate'
      }),
      { headers }
    );

    billingLatency.add(Date.now() - billingStart);
    apiLatency.add(res.timings.duration);
    errorRate.add(res.status !== 200);

    check(res, {
      'billing estimate returns 200': (r) => r.status === 200
    });
  });

  // Inventory item read
  group('Inventory - List Items', () => {
    const start = Date.now();
    const res = http.get(`${BASE_URL}/inventory?page=1&limit=20`, { headers });

    queryLatency.add(Date.now() - start);
    inventoryLatency.add(res.timings.duration);
    inventoryReadLatency.add(res.timings.duration);
    apiLatency.add(res.timings.duration);
    errorRate.add(res.status !== 200);

    check(res, {
      'inventory returns 200': (r) => r.status === 200
    });
  });

  // Inventory item creation (write scenario)
  group('Inventory - Create Item', () => {
    const start = Date.now();
    const res = http.post(
      `${BASE_URL}/inventory`,
      JSON.stringify({
        sku: `k6-sku-${Date.now()}-${__VU}-${__ITER}`,
        name: `k6 benchmark item ${Date.now()}-${__VU}-${__ITER}`,
        unit: 'unidade',
        onHandQuantity: 100,
        reorderLevel: 10,
        unitCostAmount: 5.5
      }),
      { headers }
    );

    writeLatency.add(Date.now() - start);
    inventoryLatency.add(res.timings.duration);
    inventoryCreateLatency.add(res.timings.duration);
    apiLatency.add(res.timings.duration);
    errorRate.add(res.status !== 201);

    check(res, {
      'inventory create returns 201': (r) => r.status === 201
    });
  });

  // Medical records entries
  group('Medical Records - List Entries', () => {
    const start = Date.now();
    const res = http.get(
      `${BASE_URL}/medical-records/entries?encounterId=${encodeURIComponent(encounterId)}`,
      { headers }
    );

    queryLatency.add(Date.now() - start);
    apiLatency.add(res.timings.duration);
    errorRate.add(res.status !== 200);

    check(res, {
      'medical records returns 200': (r) => r.status === 200
    });
  });

  // OpenAPI spec
  group('OpenAPI - Spec', () => {
    const start = Date.now();
    const res = http.get(`${BASE_URL}/openapi.json`);

    apiLatency.add(res.timings.duration);
    errorRate.add(res.status !== 200);

    check(res, {
      'openapi returns 200': (r) => r.status === 200,
      'openapi has paths': (r) => {
        try {
          const body = JSON.parse(r.body);
          return body.paths && Object.keys(body.paths).length > 0;
        } catch {
          return false;
        }
      }
    });
  });

  sleep(1);
}

// ========== SUMMARY HANDLER ==========

export function handleSummary(data) {
  const sloResults = evaluateSLOs(data);
  return {
    stdout:
      textSummary(data, { indent: ' ', enableColors: true }) +
      '\n\n### SLO Results\n' +
      sloSummaryText(sloResults) +
      '\n',
    'benchmarks/k6/results/performance-report.json': JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        version: '1.0',
        baseUrl: BASE_URL,
        profile: LOAD_PROFILE,
        stages: options.stages,
        metrics: extractMetrics(data),
        slo: sloResults,
        thresholds: options.thresholds
      },
      null,
      2
    )
  };
}

function extractMetrics(data) {
  const metrics = {};
  for (const [key, value] of Object.entries(data.metrics)) {
    if (value.type === 'trend') {
      const p50 = value.values['p(50)'] ?? value.values.med ?? value.values.avg;
      const p95 = value.values['p(95)'] ?? value.values['p(90)'] ?? value.values.avg;
      const p99 =
        value.values['p(99)'] ?? value.values['p(95)'] ?? value.values['p(90)'] ?? value.values.max;
      metrics[key] = {
        avg: parseFloat(value.values.avg.toFixed(2)),
        p50: parseFloat(p50.toFixed(2)),
        p95: parseFloat(p95.toFixed(2)),
        p99: parseFloat(p99.toFixed(2)),
        max: parseFloat(value.values.max.toFixed(2))
      };
    } else if (value.type === 'rate') {
      metrics[key] = {
        rate: parseFloat(value.values.rate.toFixed(4)),
        passes: value.values.passes,
        fails: value.values.fails
      };
    }
  }
  return metrics;
}

function evaluateSLOs(data) {
  const thresholds = {
    api_latency_ms: {
      p95: { target: 200, actual: data.metrics['api_latency_ms']?.values['p(95)'] ?? Infinity },
      p99: { target: 500, actual: data.metrics['api_latency_ms']?.values['p(99)'] ?? Infinity }
    },
    auth_latency_ms: {
      p95: { target: 300, actual: data.metrics['auth_latency_ms']?.values['p(95)'] ?? Infinity }
    },
    query_latency_ms: {
      p95: { target: 150, actual: data.metrics['query_latency_ms']?.values['p(95)'] ?? Infinity }
    },
    write_latency_ms: {
      p95: { target: 300, actual: data.metrics['write_latency_ms']?.values['p(95)'] ?? Infinity }
    },
    billing_latency_ms: {
      p95: { target: 250, actual: data.metrics['billing_latency_ms']?.values['p(95)'] ?? Infinity }
    },
    inventory_latency_ms: {
      p95: {
        target: 200,
        actual: data.metrics['inventory_latency_ms']?.values['p(95)'] ?? Infinity
      }
    },
    api_errors: {
      rate: { target: 0.001, actual: data.metrics['api_errors']?.values.rate ?? 1 }
    },
    api_availability: {
      percent: {
        target: 99.5,
        direction: 'gte',
        actual:
          data.metrics['http_req_failed']?.values?.rate === undefined
            ? 0
            : (1 - data.metrics['http_req_failed'].values.rate) * 100
      }
    }
  };

  const results = {};
  let totalPassed = 0;
  let totalEvaluated = 0;

  for (const [key, criterion] of Object.entries(thresholds)) {
    results[key] = {};
    for (const [metric, config] of Object.entries(criterion)) {
      const passed = evaluateThreshold(config.actual, config.target, config.direction);
      if (passed) totalPassed++;
      totalEvaluated++;
      results[key][metric] = {
        target: config.target,
        actual: parseFloat(config.actual.toFixed(2)),
        direction: config.direction ?? 'lt',
        passed
      };
    }
  }

  results._summary = {
    total: totalEvaluated,
    passed: totalPassed,
    failed: totalEvaluated - totalPassed,
    allPassed: totalPassed === totalEvaluated
  };

  return results;
}

function textSummary(data, opts) {
  const indent = opts.indent ?? '';
  let out = `${indent}k6 Load Test Results — CVG-HIS-V2\n`;
  out += `${indent}${'═'.repeat(50)}\n\n`;

  const latency = data.metrics['api_latency_ms']?.values;
  const errors = data.metrics['api_errors']?.values;

  if (latency) {
    const p50 = latency['p(50)'] ?? latency.med ?? latency.avg;
    const p95 = latency['p(95)'] ?? latency['p(90)'] ?? latency.avg;
    const p99 = latency['p(99)'] ?? latency['p(95)'] ?? latency['p(90)'] ?? latency.max;
    out += `${indent}API Latency:\n`;
    out += `${indent}  avg:  ${latency.avg.toFixed(2)}ms\n`;
    out += `${indent}  p50:  ${p50.toFixed(2)}ms\n`;
    out += `${indent}  p95:  ${p95.toFixed(2)}ms  ${p95 < 200 ? '✅' : '❌'}\n`;
    out += `${indent}  p99:  ${p99.toFixed(2)}ms  ${p99 < 500 ? '✅' : '❌'}\n`;
    out += `${indent}  max:  ${latency.max.toFixed(2)}ms\n\n`;
  }

  if (errors) {
    const errorPct = (errors.rate * 100).toFixed(3);
    out += `${indent}Error Rate: ${errorPct}%  ${errors.rate < 0.001 ? '✅' : '❌'}\n`;
    out += `${indent}  passes: ${errors.passes} | fails: ${errors.fails}\n\n`;
  }

  const requestFailures = data.metrics['http_req_failed']?.values;
  if (requestFailures) {
    const availability = (1 - requestFailures.rate) * 100;
    out += `${indent}Availability: ${availability.toFixed(3)}%  ${availability >= 99.5 ? '✅' : '❌'}\n\n`;
  }

  const auth = data.metrics['auth_latency_ms']?.values;
  if (auth) {
    const authP95 = auth['p(95)'] ?? auth['p(90)'] ?? auth.avg;
    out += `${indent}Auth Latency (P95): ${authP95.toFixed(2)}ms  ${authP95 < 300 ? '✅' : '❌'}\n`;
  }

  const query = data.metrics['query_latency_ms']?.values;
  if (query) {
    const queryP95 = query['p(95)'] ?? query['p(90)'] ?? query.avg;
    out += `${indent}Query Latency (P95): ${queryP95.toFixed(2)}ms  ${queryP95 < 150 ? '✅' : '❌'}\n`;
  }

  return out;
}

function sloSummaryText(sloResults) {
  let out = '';
  const summary = sloResults._summary;
  out += `SLO Summary: ${summary.passed}/${summary.total} passed\n`;
  out += summary.allPassed ? '✅ All SLOs met\n' : `❌ ${summary.failed} SLO(s) missed:\n`;

  for (const [key, metrics] of Object.entries(sloResults)) {
    if (key === '_summary') continue;
    for (const [metric, result] of Object.entries(metrics)) {
      const icon = result.passed ? '✅' : '❌';
      out += `  ${icon} ${key}.${metric}: target=${result.target}, actual=${result.actual}\n`;
    }
  }
  return out;
}
