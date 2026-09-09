import assert from 'node:assert/strict';
import test from 'node:test';

import { inspectClinicalWorkflowSchema } from './validate-clinical-workflow-schema.mjs';

test('clinical workflow control plane has its durable schema and runtime surfaces', () => {
  assert.deepEqual(inspectClinicalWorkflowSchema().failures, []);
});
