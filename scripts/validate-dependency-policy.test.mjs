import assert from 'node:assert/strict';
import test from 'node:test';

import { inspectDependencyPolicy } from './validate-dependency-policy.mjs';

test('active repository satisfies dependency policy', () => {
  const result = inspectDependencyPolicy();
  assert.deepEqual(result.failures, []);
  assert.ok(result.manifests.length > 1);
});
