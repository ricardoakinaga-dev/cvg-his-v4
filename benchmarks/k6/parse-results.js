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
const asMarkdown = process.argv.includes('--markdown');

function flattenSloResults(slo) {
  const flattened = [];

  for (const [metricName, criteria] of Object.entries(slo ?? {})) {
    if (metricName === '_summary') continue;
    for (const [criterionName, result] of Object.entries(criteria ?? {})) {
      flattened.push({
        metricName,
        criterionName,
        target: result.target,
        actual: result.actual,
        passed: result.passed
      });
    }
  }

  return flattened;
}

try {
  const data = JSON.parse(readFileSync(resultsPath, 'utf8'));
  const flattenedSloResults = flattenSloResults(data.slo);
  const summary = data.slo?._summary ?? {
    total: flattenedSloResults.length,
    passed: flattenedSloResults.filter((result) => result.passed).length,
    failed: flattenedSloResults.filter((result) => !result.passed).length,
    allPassed: flattenedSloResults.every((result) => result.passed)
  };

  if (asMarkdown) {
    console.log('### k6 SLO Results');
    if (data.profile?.id) {
      console.log(`- Profile: \`${data.profile.id}\``);
    }
    if (data.timestamp) {
      console.log(`- Timestamp: \`${data.timestamp}\``);
    }
    if (data.baseUrl) {
      console.log(`- Target: \`${data.baseUrl}\``);
    }
    console.log(`- SLO summary: \`${summary.passed}/${summary.total}\` passed`);
    console.log('');
    console.log('| Metric | Criterion | Target | Actual | Status |');
    console.log('| --- | --- | --- | --- | --- |');
    for (const result of flattenedSloResults) {
      console.log(
        `| ${result.metricName} | ${result.criterionName} | ${result.target} | ${result.actual} | ${result.passed ? 'PASS' : 'FAIL'} |`
      );
    }
    process.exit(summary.allPassed ? 0 : 1);
  }

  console.log('=== CVG-HIS-V2 Performance Results ===');
  console.log(`Timestamp: ${data.timestamp}\n`);
  if (data.profile?.id) {
    console.log(`Profile: ${data.profile.id}`);
    console.log(`Description: ${data.profile.description}\n`);
  }

  console.log('--- SLO Evaluation ---');
  for (const result of flattenedSloResults) {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(
      `  ${result.metricName}.${result.criterionName}: ${status} (target: ${result.target}, actual: ${result.actual})`
    );
  }
  console.log(`  Summary: ${summary.passed}/${summary.total} passed`);

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

  process.exit(summary.allPassed ? 0 : 1);
} catch (err) {
  console.error('Failed to parse results:', err.message);
  process.exit(1);
}
