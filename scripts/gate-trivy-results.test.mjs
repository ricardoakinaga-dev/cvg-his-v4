import assert from 'node:assert/strict';
import { test } from 'node:test';

import { evaluateTrivyReport, parseTrivyReport } from './gate-trivy-results.mjs';

test('collects vulnerabilities, misconfigurations and secrets from Trivy JSON', () => {
  const parsed = parseTrivyReport({
    Results: [
      {
        Target: 'cvg-his-api',
        Vulnerabilities: [{ VulnerabilityID: 'CVE-1', Severity: 'CRITICAL', Title: 'critical' }],
        Misconfigurations: [{ ID: 'CFG-1', Severity: 'HIGH', Title: 'unsafe config' }],
        Secrets: [{ RuleID: 'SECRET-1', Severity: 'HIGH', Title: 'embedded secret' }],
      },
    ],
  });

  assert.equal(parsed.findings.length, 3);
  assert.deepEqual(
    parsed.findings.map((finding) => finding.kind),
    ['vulnerability', 'misconfiguration', 'secret'],
  );
});

test('blocks configured Critical and High findings', () => {
  const parsed = parseTrivyReport({
    Results: [
      {
        Target: 'image',
        Vulnerabilities: [
          { VulnerabilityID: 'CVE-H', Severity: 'HIGH' },
          { VulnerabilityID: 'CVE-M', Severity: 'MEDIUM' },
        ],
      },
    ],
  });

  const evaluation = evaluateTrivyReport(parsed, ['CRITICAL', 'HIGH']);

  assert.equal(evaluation.status, 'FAIL');
  assert.equal(evaluation.blockingFindings, 1);
  assert.equal(evaluation.totalFindings, 2);
});

test('fails closed on scanner errors and malformed reports', () => {
  const evaluation = evaluateTrivyReport(
    parseTrivyReport({ Results: [], SchemaVersion: 2, ArtifactName: 'image', Metadata: {}, Errors: ['db error'] }),
    ['CRITICAL', 'HIGH'],
  );

  assert.equal(evaluation.status, 'FAIL');
  assert.throws(() => parseTrivyReport({}), /Trivy JSON/i);
});
