import assert from 'node:assert/strict';
import test from 'node:test';

import { evaluateArea, evaluateAudit } from './lib/vetus-parity-audit.mjs';

const completeEvidence = {
  ui: ['ui'],
  api: ['api'],
  persistence: ['persistence'],
  tests: ['tests'],
  e2e: ['e2e']
};

test('marks an area verified only when every proof layer exists', () => {
  const result = evaluateArea({
    id: 'agenda',
    name: 'Agenda',
    evidence: completeEvidence,
    blockers: []
  }, () => true);

  assert.equal(result.status, 'verified');
  assert.equal(result.score, 100);
  assert.deepEqual(result.missingLayers, []);
});

test('does not award an arbitrary score floor for structural evidence', () => {
  const result = evaluateArea({
    id: 'agenda',
    name: 'Agenda',
    evidence: completeEvidence,
    blockers: []
  }, (proof) => proof !== 'tests' && proof !== 'e2e');

  assert.equal(result.status, 'partial');
  assert.equal(result.score, 60);
  assert.deepEqual(result.missingLayers, ['tests', 'e2e']);
});

test('keeps an area blocked when a known functional gap remains', () => {
  const result = evaluateArea({
    id: 'finance',
    name: 'Financeiro',
    evidence: completeEvidence,
    blockers: ['Formas de pagamento usam dados estaticos.']
  }, () => true);

  assert.equal(result.status, 'blocked');
  assert.equal(result.score, 100);
});

test('fails the audit unless every required area is verified', () => {
  const result = evaluateAudit([
    { id: 'agenda', name: 'Agenda', evidence: completeEvidence, blockers: [] },
    { id: 'finance', name: 'Financeiro', evidence: completeEvidence, blockers: ['Gap real'] }
  ], () => true);

  assert.equal(result.passed, false);
  assert.equal(result.verifiedAreas, 1);
  assert.equal(result.totalAreas, 2);
  assert.equal(result.evidenceScore, 100);
});
