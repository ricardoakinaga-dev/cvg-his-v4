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
 * SLO Targets:
 *   - API P95 latency < 200ms
 *   - API P99 latency < 500ms
 *   - Error rate < 1%
 *   - Availability > 99.5%
 */

import http from 'k6/http';
import { check, sleep, group } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom metrics
const apiLatency = new Trend('api_latency_ms');
const errorRate = new Rate('api_errors');
const authLatency = new Trend('auth_latency_ms');
const queryLatency = new Trend('query_latency_ms');

// Test configuration
const BASE_URL = __ENV.TARGET ?? 'http://localhost:3000';
const ACCOUNT_ID = __ENV.ACCOUNT_ID ?? 'acc_cvg_demo';

// Test credentials
const TEST_USERS = [
  { username: 'admin@cvg.com', password: 'Admin@123' },
  { username: 'vet@cvg.com', password: 'Vet@123' },
];

// SLO thresholds
export const options = {
  stages: [
    { duration: '30s', target: 10 },   // Ramp up
    { duration: '1m', target: 50 },    // Steady load
    { duration: '30s', target: 100 },  // Stress
    { duration: '30s', target: 50 },   // Ramp down
    { duration: '1m', target: 10 },    // Cool down
  ],
  thresholds: {
    // SLO: P95 < 200ms
    'api_latency_ms': ['p(95)<200'],
    // SLO: P99 < 500ms
    'api_latency_ms': ['p(99)<500'],
    // SLO: Error rate < 1%
    'api_errors': ['rate<0.01'],
    // Auth endpoints P95 < 300ms
    'auth_latency_ms': ['p(95)<300'],
    // Query endpoints P95 < 150ms
    'query_latency_ms': ['p(95)<150'],
  },
};

let authToken = '';
let testUser = TEST_USERS[0];

export function setup() {
  // Login once to get token for authenticated requests
  const loginRes = http.post(`${BASE_URL}/api/v1/auth/login`, JSON.stringify({
    username: testUser.username,
    password: testUser.password
  }), {
    headers: { 'Content-Type': 'application/json' },
  });

  if (loginRes.status === 200) {
    const body = JSON.parse(loginRes.body);
    authToken = body.accessToken;
  }

  return { token: authToken };
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
  });

  // Authentication flows
  group('Auth - Login', () => {
    const start = Date.now();
    const res = http.post(`${BASE_URL}/api/v1/auth/login`, JSON.stringify({
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
  });

  // Owners (read)
  group('Owners - List', () => {
    const start = Date.now();
    const res = http.get(`${BASE_URL}/api/v1/owners`, { headers });

    queryLatency.add(Date.now() - start);
    apiLatency.add(res.timings.duration);
    errorRate.add(res.status !== 200);

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
    const res = http.get(`${BASE_URL}/api/v1/patients?page=1&limit=20`, { headers });

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
    // Try to get first patient ID from list response first
    const listRes = http.get(`${BASE_URL}/api/v1/patients?page=1&limit=1`, { headers });
    let patientId = 'pat_demo_001';

    if (listRes.status === 200) {
      try {
        const body = JSON.parse(listRes.body);
        if (body.data && body.data.length > 0) {
          patientId = body.data[0].id;
        }
      } catch {}
    }

    const res = http.get(`${BASE_URL}/api/v1/patients/${patientId}`, { headers });

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
    const res = http.get(`${BASE_URL}/api/v1/staff`, { headers });

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
    const res = http.get(`${BASE_URL}/api/v1/encounters?page=1&limit=10`, { headers });

    queryLatency.add(Date.now() - start);
    apiLatency.add(res.timings.duration);
    errorRate.add(res.status !== 200);

    check(res, {
      'encounters returns 200': (r) => r.status === 200,
    });
  });

  // Scheduling
  group('Scheduling - List', () => {
    const start = Date.now();
    const res = http.get(`${BASE_URL}/api/v1/scheduling/appointments?date=${new Date().toISOString().split('T')[0]}`, { headers });

    queryLatency.add(Date.now() - start);
    apiLatency.add(res.timings.duration);
    errorRate.add(res.status !== 200);

    check(res, {
      'appointments returns 200': (r) => r.status === 200,
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
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'benchmarks/k6/results/performance-report.json': JSON.stringify({
      timestamp: new Date().toISOString(),
      metrics: extractMetrics(data),
      slo: evaluateSLOs(data),
    }),
  };
}

function extractMetrics(data) {
  const metrics = {};
  for (const [key, value] of Object.entries(data.metrics)) {
    if (value.type === 'trend') {
      metrics[key] = {
        avg: value.values.avg,
        p50: value.values['p(50)'],
        p95: value.values['p(95)'],
        p99: value.values['p(99)'],
        max: value.values.max,
      };
    } else if (value.type === 'rate') {
      metrics[key] = {
        rate: value.values.rate,
        passes: value.values.passes,
        fails: value.values.fails,
      };
    }
  }
  return metrics;
}

function evaluateSLOs(data) {
  const thresholds = {
    'api_latency_ms': { p95: { target: 200, actual: data.metrics['api_latency_ms']?.values['p(95)'] ?? Infinity } },
    'auth_latency_ms': { p95: { target: 300, actual: data.metrics['auth_latency_ms']?.values['p(95)'] ?? Infinity } },
    'api_errors': { rate: { target: 0.01, actual: data.metrics['api_errors']?.values.rate ?? 1 } },
  };

  const results = {};
  for (const [key, criterion] of Object.entries(thresholds)) {
    for (const [metric, config] of Object.entries(criterion)) {
      results[`${key}.${metric}`] = {
        target: config.target,
        actual: config.actual,
        passed: config.actual < config.target,
      };
    }
  }
  return results;
}

function textSummary(data, opts) {
  const indent = opts.indent ?? '';
  let out = `${indent}k6 Load Test Results\n`;
  out += `${indent}==================\n\n`;

  const latency = data.metrics['api_latency_ms']?.values;
  const errors = data.metrics['api_errors']?.values;

  if (latency) {
    out += `${indent}API Latency:\n`;
    out += `${indent}  avg: ${latency.avg.toFixed(2)}ms\n`;
    out += `${indent}  p50: ${latency['p(50)'].toFixed(2)}ms\n`;
    out += `${indent}  p95: ${latency['p(95)'].toFixed(2)}ms\n`;
    out += `${indent}  p99: ${latency['p(99)'].toFixed(2)}ms\n`;
    out += `${indent}  max: ${latency.max.toFixed(2)}ms\n\n`;
  }

  if (errors) {
    out += `${indent}Error Rate: ${(errors.rate * 100).toFixed(2)}%\n`;
    out += `${indent}  passes: ${errors.passes} | fails: ${errors.fails}\n\n`;
  }

  return out;
}
