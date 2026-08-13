import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  evaluateSemgrepReport,
  parseSemgrepReport,
} from './gate-semgrep-results.mjs';

test('parses Semgrep JSON severity from extra.severity', () => {
  const parsed = parseSemgrepReport({
    results: [
      {
        check_id: 'typescript.lang.security.audit.example',
        path: 'src/example.ts',
        start: { line: 7 },
        extra: { severity: 'ERROR', message: 'unsafe operation' },
      },
    ],
    errors: [],
  });

  assert.equal(parsed.format, 'semgrep-json');
  assert.deepEqual(parsed.findings[0], {
    ruleId: 'typescript.lang.security.audit.example',
    severity: 'ERROR',
    path: 'src/example.ts',
    line: 7,
    message: 'unsafe operation',
  });
});

test('parses SARIF and resolves the rule default level', () => {
  const parsed = parseSemgrepReport({
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            rules: [
              {
                id: 'typescript.rule',
                defaultConfiguration: { level: 'warning' },
              },
            ],
          },
        },
        results: [
          {
            ruleId: 'typescript.rule',
            message: { text: 'review this' },
            locations: [
              {
                physicalLocation: {
                  artifactLocation: { uri: 'src/file.ts' },
                  region: { startLine: 11 },
                },
              },
            ],
          },
        ],
      },
    ],
  });

  assert.equal(parsed.format, 'sarif');
  assert.equal(parsed.findings[0].severity, 'WARNING');
  assert.equal(parsed.findings[0].path, 'src/file.ts');
});

test('fails only for configured severities and records every finding', () => {
  const parsed = parseSemgrepReport({
    results: [
      { check_id: 'warn', path: 'a.ts', extra: { severity: 'WARNING' } },
      { check_id: 'info', path: 'b.ts', extra: { severity: 'INFO' } },
    ],
    errors: [],
  });

  const strict = evaluateSemgrepReport(parsed, ['ERROR', 'WARNING']);
  const errorsOnly = evaluateSemgrepReport(parsed, ['ERROR']);

  assert.equal(strict.status, 'FAIL');
  assert.equal(strict.blockingFindings, 1);
  assert.equal(strict.totalFindings, 2);
  assert.equal(errorsOnly.status, 'PASS');
});

test('scanner errors fail closed even without findings', () => {
  const parsed = parseSemgrepReport({
    results: [],
    errors: [{ type: 'SemgrepError', message: 'registry unavailable' }],
  });

  const evaluation = evaluateSemgrepReport(parsed, ['ERROR']);

  assert.equal(evaluation.status, 'FAIL');
  assert.equal(evaluation.scannerErrors, 1);
});

test('records non-fatal parser warnings without treating a successful scan as infrastructure failure', () => {
  const parsed = parseSemgrepReport({
    results: [],
    errors: [{ type: 'PartialParsing', level: 'warn', message: 'generated declaration skipped' }],
  });

  const evaluation = evaluateSemgrepReport(parsed, ['ERROR'], 0);

  assert.equal(evaluation.status, 'PASS');
  assert.equal(evaluation.scannerErrors, 0);
  assert.equal(evaluation.scannerWarnings, 1);
});

test('rejects unknown report structures instead of treating them as clean', () => {
  assert.throws(() => parseSemgrepReport({ findings: [] }), /Semgrep JSON or SARIF/i);
});
