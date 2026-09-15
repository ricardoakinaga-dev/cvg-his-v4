import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import {
  MATRIX_PATH,
  validateEnvironmentRuntimeMatrix
} from './validate-environment-runtime-matrix.mjs';

const rootDir = process.cwd();

test('accepts the current environment/runtime matrix', () => {
  const errors = validateEnvironmentRuntimeMatrix(rootDir);
  assert.deepEqual(errors, []);
});

test('rejects production Compose as the primary target and authority drift', async () => {
  const matrix = JSON.parse(await readFile(MATRIX_PATH, 'utf8'));
  const mutated = JSON.parse(JSON.stringify(matrix));
  const production = mutated.environments.find((environment) => environment.id === 'production');
  production.primaryRuntime = 'COMPOSE';
  production.helm.role = 'OPTIONAL_PARITY_DRY_RUN';
  production.target.authority = 'LOCAL_ONLY';
  production.target.name = 'named-production-cluster';
  production.target.owner = 'Release owner';
  const errors = validateEnvironmentRuntimeMatrix(rootDir, mutated);
  assert.ok(errors.some((error) => error.includes('production.primaryRuntime must be HELM')));
  assert.ok(errors.some((error) => error.includes('production Helm role must be PRIMARY_TARGET')));
  assert.ok(errors.some((error) => error.includes('production.target.authority must be PENDING_AUTHORITY')));
  assert.ok(errors.some((error) => error.includes('production target.name must remain UNASSIGNED_*')));
});
