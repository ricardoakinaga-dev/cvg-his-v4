import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  CANONICAL_PACKAGE_MANAGER,
  inspectDependencyPolicy
} from './validate-dependency-policy.mjs';

test('active repository satisfies dependency policy', () => {
  const result = inspectDependencyPolicy();
  assert.deepEqual(result.failures, []);
  assert.ok(result.manifests.length > 1);
});

test('package manager drift fails closed against the canonical Corepack version', () => {
  const directory = mkdtempSync(join(tmpdir(), 'cvg-dependency-policy-'));
  try {
    mkdirSync(join(directory, 'apps/example'), { recursive: true });
    mkdirSync(join(directory, 'packages/example'), { recursive: true });
    const packageJson = JSON.stringify({
      name: 'fixture',
      packageManager: 'pnpm@10.0.0'
    });
    writeFileSync(join(directory, 'package.json'), packageJson);
    writeFileSync(join(directory, 'apps/example/package.json'), JSON.stringify({ name: 'app' }));
    writeFileSync(join(directory, 'packages/example/package.json'), JSON.stringify({ name: 'package' }));
    writeFileSync(join(directory, 'pnpm-lock.yaml'), 'lockfileVersion: 9.0\n');

    const result = inspectDependencyPolicy({ rootDirectory: directory });
    assert.deepEqual(result.failures, [
      `packageManager must be ${CANONICAL_PACKAGE_MANAGER} (found pnpm@10.0.0)`
    ]);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
