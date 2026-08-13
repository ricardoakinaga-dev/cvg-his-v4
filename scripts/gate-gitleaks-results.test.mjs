import assert from 'node:assert/strict';
import test from 'node:test';

import { evaluateGitleaksReports } from './gate-gitleaks-results.mjs';

const finding = (fingerprint) => ({
  Fingerprint: fingerprint,
  RuleID: 'generic-api-key',
  File: 'docs/example.md',
  StartLine: 10
});

const approval = (fingerprint) => ({
  fingerprint,
  classification: 'historical-test-fixture',
  reason: 'Reviewed non-production fixture retained in immutable Git history.'
});

test('passes only when the working tree is clean and every historical finding is reviewed', () => {
  assert.deepEqual(evaluateGitleaksReports([finding('known')], [], [approval('known')]), {
    status: 'PASS',
    historicalFindings: 1,
    reviewedHistoricalFindings: 1,
    newHistoricalFindings: 0,
    workingTreeFindings: 0,
    staleBaselineEntries: 0,
    newHistorical: [],
    workingTree: [],
    staleBaseline: []
  });
});

test('fails closed for a new history finding', () => {
  const result = evaluateGitleaksReports(
    [finding('known'), finding('new')],
    [],
    [approval('known')]
  );
  assert.equal(result.status, 'FAIL');
  assert.equal(result.newHistoricalFindings, 1);
});

test('fails closed for any current working-tree finding', () => {
  const result = evaluateGitleaksReports(
    [finding('known')],
    [finding('current')],
    [approval('known')]
  );
  assert.equal(result.status, 'FAIL');
  assert.equal(result.workingTreeFindings, 1);
});

test('fails closed when a baseline entry is stale or lacks review rationale', () => {
  const stale = evaluateGitleaksReports([], [], [approval('stale')]);
  assert.equal(stale.status, 'FAIL');
  assert.equal(stale.staleBaselineEntries, 1);

  assert.throws(
    () => evaluateGitleaksReports([finding('known')], [], [{ ...approval('known'), reason: '' }]),
    /review reason/i
  );
});
