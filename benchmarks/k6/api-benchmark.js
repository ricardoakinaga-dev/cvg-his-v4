/**
 * k6 API Benchmark Suite — CVG-HIS-V2
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

// Custom metrics
const apiLatency = new Trend('api_latency_ms');
const errorRate = new Rate('api_errors');
const authLatency = new Trend('auth_latency_ms');
const queryLatency = new Trend('query_latency_ms');
const writeLatency = new Trend('write_latency_ms');
const billingLatency = new Trend('billing_latency_ms');
const inventoryLatency = new Trend('inventory_latency_ms');

// Test configuration
const BASE_URL = __ENV.TARGET ?? 'http://localhost:3001';
const ACCOUNT_ID = __ENV.ACCOUNT_ID ?? 'acc_cvg_demo';

// Test credentials — seed users from UsersService
const TEST_USERS = [
  { username: 'admin', password: 'seed_admin', role: 'admin' },
  { username: 'vet', password: 'seed_vet', role: 'veterinarian' },
  { username: 'finance', password: 'seed_finance', role: 'finance' },
  { username: 'inventory', password: 'seed_inventory', role: 'inventory' },
];

// SLO thresholds from slos.json
export const options = {
  stages: [
    { duration: '30s', target: 5 },    // Ramp up (light)
    { duration: '1m', target: 30 },     // Steady load
    { duration: '30s', target: 60 },    // Stress
    { duration: '30s', target: 30 },    // Ramp down
    { duration: '1m', target: 5 },      // Cool down
  ],
  thresholds: {
    'api_latency_ms':    ['p(95)<200', 'p(99)<500'],
    'api_errors':       ['rate<0.001'],          // SLO: 0.1% error rate
    'auth_latency_ms':  ['p(95)<300'],
    'query_latency_ms': ['p(95)<150'],
    'write_latency_ms': ['p(95)<300'],
    'billing_latency_ms': ['p(95)<250'],
    'inventory_latency_ms': ['p(95)<200'],
  },
};

let authToken = '';
let testUser = TEST_USERS[0];

export function setup() {
  testUser = TEST_USERS[0]; // admin user for benchmark
  const loginRes = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
    username: testUser.username,
    password: testUser.password
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  if (loginRes.status === 200) {
    const body = JSON.parse(loginRes.body);
    authToken = body.accessToken ?? '';
  }

  return { token: authToken, testUser };
}

// ========== SCENARIOS ==========

export default function (data) {
  const token = data.token;
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
    'x-account-id': ACCOUNT_ID,
    'X-Correlation-Id': `k6-${__VU}-${__ITER}`,
  };

  // Health check
  group('Health', () => {
    const res = http.get(`${BASE_URL}/health`);
    check(res, {
      'health returns 200': (r) => r.status === 200,
      'health latency < 50ms': (r) => r.timings.duration < 50,
    });
    apiLatency.add(res.timings.duration);
    errorRate.add(res.status !== 200);
  });

  // Authentication flows
  group('Auth - Login', () => {
    const start = Date.now();
    const res = http.post(`${BASE_URL}/auth/login`, JSON.stringify({
      username: testUser.username,
      password: testUser.password
    }), {
      headers: { 'Content-Type': 'application/json' },
    });

    authLatency.add(Date.now() - start);
    check(res, {
      'login returns 200 or 401': (r) => r.status === 200 || r.status === 401,
      'login has reasonable latency': (r) => r.timings.duration < 500,
    });
    errorRate.add(res.status === 500 || res.status === 502);
  });

  // Owners (read)
  group('Owners - List', () => {
    const start = Date.now();
    const res = http.get(`${BASE_URL}/owners`, { headers });

    queryLatency.add(Date.now() - start);
    apiLatency.add(res.timings.duration);
    errorRate.add(res.status !== 200 && res.status !== 404);

    check(res, {
      'owners returns 200': (r) => r.status === 200,
      'owners has valid JSON': (r) => {
        try { JSON.parse(r.body); return true; } catch { return false; }
      },
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
      'patients returns 200': (r) => r.status === 200,
    });
  });

  // Patient detail
  group('Patients - Detail', () => {
    const start = Date.now();
    const listRes = http.get(`${BASE_URL}/patients?page=1&limit=1`, { headers });
    let patientId = 'pat_demo_001';

    if (listRes.status === 200) {
      try {
        const body = JSON.parse(listRes.body);
        if (body.items && body.items.length > 0) {
          patientId = body.items[0].id;
        } else if (body.data && body.data.length > 0) {
          patientId = body.data[0].id;
        }
      } catch {}
    }

    const res = http.get(`${BASE_URL}/patients/${patientId}`, { headers });

    queryLatency.add(Date.now() - start);
    apiLatency.add(res.timings.duration);
    errorRate.add(res.status !== 200 && res.status !== 404);

    check(res, {
      'patient detail returns 200 or 404': (r) => r.status === 200 || r.status === 404,
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
      'staff returns 200': (r) => r.status === 200,
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
      'encounters returns 200': (r) => r.status === 200,
    });
  });

  // Scheduling
  group('Scheduling - Appointments', () => {
    const start = Date.now();
    const today = new Date().toISOString().split('T')[0];
    const res = http.get(`${BASE_URL}/scheduling/appointments?date=${today}`, { headers });

    queryLatency.add(Date.now() - start);
    apiLatency.add(res.timings.duration);
    errorRate.add(res.status !== 200);

    check(res, {
      'appointments returns 200': (r) => r.status === 200,
    });
  });

  // Billing estimate (write scenario)
  group('Billing - Create Estimate', () => {
    const start = Date.now();
    // First find an encounter to bill
    const encRes = http.get(`${BASE_URL}/encounters?page=1&limit=1`, { headers });
    let encounterId = 'enc_demo_001';

    if (encRes.status === 200) {
      try {
        const body = JSON.parse(encRes.body);
        const items = body.items ?? body.data ?? [];
        if (items.length > 0) encounterId = items[0].id;
      } catch {}
    }

    const res = http.post(`${BASE_URL}/billing/estimate`, JSON.stringify({
      encounterId,
      administrativeNotes: 'k6 benchmark billing estimate'
    }), { headers });

    billingLatency.add(Date.now() - start);
    apiLatency.add(res.timings.duration);
    errorRate.add(res.status !== 200 && res.status !== 409 && res.status !== 404);

    check(res, {
      'billing estimate returns 200/409/404': (r) => r.status === 200 || r.status === 409 || r.status === 404,
    });
  });

  // Inventory item read
  group('Inventory - List Items', () => {
    const start = Date.now();
    const res = http.get(`${BASE_URL}/inventory?page=1&limit=20`, { headers });

    queryLatency.add(Date.now() - start);
    inventoryLatency.add(res.timings.duration);
    apiLatency.add(res.timings.duration);
    errorRate.add(res.status !== 200);

    check(res, {
      'inventory returns 200': (r) => r.status === 200,
    });
  });

  // Inventory item creation (write scenario)
  group('Inventory - Create Item', () => {
    const start = Date.now();
    const res = http.post(`${BASE_URL}/inventory`, JSON.stringify({
      sku: `k6-sku-${Date.now()}-${__VU}`,
      name: `k6 benchmark item ${Date.now()}`,
      unit: 'unidade',
      onHandQuantity: 100,
      reorderLevel: 10,
      unitCostAmount: 5.50
    }), { headers });

    writeLatency.add(Date.now() - start);
    inventoryLatency.add(res.timings.duration);
    apiLatency.add(res.timings.duration);
    errorRate.add(res.status !== 201 && res.status !== 400 && res.status !== 409);

    check(res, {
      'inventory create returns 201/400/409': (r) => r.status === 201 || r.status === 400 || r.status === 409,
    });
  });

  // Medical records entries
  group('Medical Records - List Entries', () => {
    const start = Date.now();
    const res = http.get(`${BASE_URL}/medical-records/entries?page=1&limit=10`, { headers });

    queryLatency.add(Date.now() - start);
    apiLatency.add(res.timings.duration);
    errorRate.add(res.status !== 200 && res.status !== 404);

    check(res, {
      'medical records returns 200 or 404': (r) => r.status === 200 || r.status === 404,
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
        } catch { return false; }
      },
    });
  });

  sleep(1);
}

// ========== SUMMARY HANDLER ==========

export function handleSummary(data) {
  const sloResults = evaluateSLOs(data);
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'stdout': '\n### SLO Results\n' + sloSummaryText(sloResults) + '\n',
    'benchmarks/k6/results/performance-report.json': JSON.stringify({
      timestamp: new Date().toISOString(),
      version: '1.0',
      baseUrl: BASE_URL,
      stages: options.stages,
      metrics: extractMetrics(data),
      slo: sloResults,
      thresholds: options.thresholds,
    }, null, 2),
  };
}

function extractMetrics(data) {
  const metrics = {};
  for (const [key, value] of Object.entries(data.metrics)) {
    if (value.type === 'trend') {
      metrics[key] = {
        avg: parseFloat(value.values.avg.toFixed(2)),
        p50: parseFloat(value.values['p(50)'].toFixed(2)),
        p95: parseFloat(value.values['p(95)'].toFixed(2)),
        p99: parseFloat(value.values['p(99)'].toFixed(2)),
        max: parseFloat(value.values.max.toFixed(2)),
      };
    } else if (value.type === 'rate') {
      metrics[key] = {
        rate: parseFloat(value.values.rate.toFixed(4)),
        passes: value.values.passes,
        fails: value.values.fails,
      };
    }
  }
  return metrics;
}

function evaluateSLOs(data) {
  const thresholds = {
    'api_latency_ms': {
      p95: { target: 200, actual: data.metrics['api_latency_ms']?.values['p(95)'] ?? Infinity },
      p99: { target: 500, actual: data.metrics['api_latency_ms']?.values['p(99)'] ?? Infinity },
    },
    'auth_latency_ms': {
      p95: { target: 300, actual: data.metrics['auth_latency_ms']?.values['p(95)'] ?? Infinity },
    },
    'query_latency_ms': {
      p95: { target: 150, actual: data.metrics['query_latency_ms']?.values['p(95)'] ?? Infinity },
    },
    'write_latency_ms': {
      p95: { target: 300, actual: data.metrics['write_latency_ms']?.values['p(95)'] ?? Infinity },
    },
    'billing_latency_ms': {
      p95: { target: 250, actual: data.metrics['billing_latency_ms']?.values['p(95)'] ?? Infinity },
    },
    'inventory_latency_ms': {
      p95: { target: 200, actual: data.metrics['inventory_latency_ms']?.values['p(95)'] ?? Infinity },
    },
    'api_errors': {
      rate: { target: 0.001, actual: data.metrics['api_errors']?.values.rate ?? 1 },
    },
  };

  const results = {};
  let totalPassed = 0;
  let totalEvaluated = 0;

  for (const [key, criterion] of Object.entries(thresholds)) {
    results[key] = {};
    for (const [metric, config] of Object.entries(criterion)) {
      const passed = config.actual < config.target;
      if (passed) totalPassed++;
      totalEvaluated++;
      results[key][metric] = {
        target: config.target,
        actual: parseFloat(config.actual.toFixed(2)),
        passed,
      };
    }
  }

  results._summary = {
    total: totalEvaluated,
    passed: totalPassed,
    failed: totalEvaluated - totalPassed,
    allPassed: totalPassed === totalEvaluated,
  };

  return results;
}

function textSummary(data, opts) {
  const indent = opts.indent ?? '';
  let out = `${indent}k6 Load Test Results — CVG-HIS-V2\n`;
  out += `${indent}${ '═'.repeat(50) }\n\n`;

  const latency = data.metrics['api_latency_ms']?.values;
  const errors = data.metrics['api_errors']?.values;

  if (latency) {
    out += `${indent}API Latency:\n`;
    out += `${indent}  avg:  ${latency.avg.toFixed(2)}ms\n`;
    out += `${indent}  p50:  ${latency['p(50)'].toFixed(2)}ms\n`;
    out += `${indent}  p95:  ${latency['p(95)'].toFixed(2)}ms  ${latency['p(95)'] < 200 ? '✅' : '❌'}\n`;
    out += `${indent}  p99:  ${latency['p(99)'].toFixed(2)}ms  ${latency['p(99)'] < 500 ? '✅' : '❌'}\n`;
    out += `${indent}  max:  ${latency.max.toFixed(2)}ms\n\n`;
  }

  if (errors) {
    const errorPct = (errors.rate * 100).toFixed(3);
    out += `${indent}Error Rate: ${errorPct}%  ${errors.rate < 0.001 ? '✅' : '❌'}\n`;
    out += `${indent}  passes: ${errors.passes} | fails: ${errors.fails}\n\n`;
  }

  const auth = data.metrics['auth_latency_ms']?.values;
  if (auth) {
    out += `${indent}Auth Latency (P95): ${auth['p(95)'].toFixed(2)}ms  ${auth['p(95)'] < 300 ? '✅' : '❌'}\n`;
  }

  const query = data.metrics['query_latency_ms']?.values;
  if (query) {
    out += `${indent}Query Latency (P95): ${query['p(95)'].toFixed(2)}ms  ${query['p(95)'] < 150 ? '✅' : '❌'}\n`;
  }

  return out;
}

function sloSummaryText(sloResults) {
  let out = '';
  const summary = sloResults._summary;
  out += `SLO Summary: ${summary.passed}/${summary.total} passed\n`;
  out += summary.allPassed
    ? '✅ All SLOs met\n'
    : `❌ ${summary.failed} SLO(s) missed:\n`;

  for (const [key, metrics] of Object.entries(sloResults)) {
    if (key === '_summary') continue;
    for (const [metric, result] of Object.entries(metrics)) {
      const icon = result.passed ? '✅' : '❌';
      out += `  ${icon} ${key}.${metric}: target=${result.target}, actual=${result.actual}\n`;
    }
  }
  return out;
}
