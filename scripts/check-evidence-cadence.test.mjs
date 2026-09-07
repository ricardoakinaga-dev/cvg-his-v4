import assert from 'node:assert/strict';
import test from 'node:test';
import { checkEvidenceCadence } from './check-evidence-cadence.mjs';

test('current cadence manifest has owners and review cycles', () => {
  assert.deepEqual(checkEvidenceCadence(), []);
});

test('future or unowned evidence is rejected', () => {
  const errors = checkEvidenceCadence({ now: new Date('2026-01-01T00:00:00Z'), rootDir: '/tmp', manifest: {
    schema_version: 1, review_cycle_days: 7, owner: 'LT', documents: [{ path: 'missing.md', kind: 'x' }]
  }});
  assert.match(errors[0], /document missing/);
});
