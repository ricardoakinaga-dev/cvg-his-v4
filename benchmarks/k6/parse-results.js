/**
 * k6 Results Parser — CVG-HIS-V2
 *
 * Parse k6 JSON output and print summary.
 *
 * Usage:
 *   node benchmarks/k6/parse-results.js benchmarks/k6/results/performance-report.json
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const resultsPath = resolve(process.argv[2] ?? 'benchmarks/k6/results/performance-report.json');

try {
  const data = JSON.parse(readFileSync(resultsPath, 'utf8'));

  console.log('=== CVG-HIS-V2 Performance Results ===');
  console.log(`Timestamp: ${data.timestamp}\n`);

  console.log('--- SLO Evaluation ---');
  for (const [key, result] of Object.entries(data.slo)) {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`  ${key}: ${status} (target: ${result.target}, actual: ${result.actual.toFixed(2)})`);
  }

  console.log('\n--- API Latency ---');
  const latency = data.metrics['api_latency_ms'];
  if (latency) {
    console.log(`  avg:  ${latency.avg.toFixed(2)}ms`);
    console.log(`  p50:  ${latency.p50.toFixed(2)}ms`);
    console.log(`  p95:  ${latency.p95.toFixed(2)}ms`);
    console.log(`  p99:  ${latency.p99.toFixed(2)}ms`);
    console.log(`  max:  ${latency.max.toFixed(2)}ms`);
  }

  console.log('\n--- Error Rate ---');
  const errors = data.metrics['api_errors'];
  if (errors) {
    console.log(`  rate:  ${(errors.rate * 100).toFixed(2)}%`);
    console.log(`  passes: ${errors.passes} | fails: ${errors.fails}`);
  }

  console.log('\n--- Query Latency (DB) ---');
  const query = data.metrics['query_latency_ms'];
  if (query) {
    console.log(`  avg:  ${query.avg.toFixed(2)}ms`);
    console.log(`  p95:  ${query.p95.toFixed(2)}ms`);
    console.log(`  p99:  ${query.p99.toFixed(2)}ms`);
  }

  console.log('\n--- Auth Latency ---');
  const auth = data.metrics['auth_latency_ms'];
  if (auth) {
    console.log(`  avg:  ${auth.avg.toFixed(2)}ms`);
    console.log(`  p95:  ${auth.p95.toFixed(2)}ms`);
  }
} catch (err) {
  console.error('Failed to parse results:', err.message);
  process.exit(1);
}
