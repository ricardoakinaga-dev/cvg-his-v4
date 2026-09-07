import assert from 'node:assert/strict';
import test from 'node:test';
import { evaluateExternalDependencies } from './check-external-dependencies.mjs';

test('missing or placeholder provider evidence remains blocked', () => {
  const [payments, fiscal] = evaluateExternalDependencies({
    manifest: { dependencies: [
      { id: 'payments', ticket: 'R05-022', owner: 'FIN', evidenceEnv: 'PAYMENTS', nextAction: 'choose provider' },
      { id: 'fiscal', ticket: 'R05-030', owner: 'FIS', evidenceEnv: 'FISCAL', nextAction: 'choose city' }
    ] },
    environment: { PAYMENTS: 'pending', FISCAL: 'sandbox-run-2026-09-05' }
  });
  assert.equal(payments.status, 'BLOCKED');
  assert.equal(fiscal.status, 'READY_FOR_REVIEW');
});

test('evidence values are preserved as references, never interpreted as secrets', () => {
  const [item] = evaluateExternalDependencies({
    manifest: { dependencies: [{ id: 'github', ticket: 'R05-015', owner: 'OPS', evidenceEnv: 'GITHUB', nextAction: 'provide run' }] },
    environment: { GITHUB: 'https://github.example/runs/123' }
  });
  assert.equal(item.status, 'READY_FOR_REVIEW');
  assert.equal(item.evidence, 'https://github.example/runs/123');
});
