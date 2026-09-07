import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync, symlinkSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  readControllerInput,
  validateProcessInventory,
  runProcessCriticalCoverage
} from './run-process-critical-coverage.mjs';

test('controller input bytes remain exact and budgets/containment fail closed', () => {
  const root = mkdtempSync(join(tmpdir(), 'cvg-process-controller-input-'));
  const code = '\ufeffconst emoji="😀";\r\n';
  writeFileSync(join(root, 'original.js'), code);
  mkdirSync(join(root, 'folder'));
  symlinkSync('/dev/null', join(root, 'link.js'));
  const before = readdirSync('/proc/self/fd').length;
  assert.deepEqual(readControllerInput(root, 'original.js'), Buffer.from(code));
  for (const path of ['link.js', '../outside.js', 'folder'])
    assert.throws(() => readControllerInput(root, path));
  assert.throws(() => readControllerInput(root, 'original.js', 1), /oversized/);
  for (const size of [0, -1, Infinity, 64 * 1024 * 1024 + 1])
    assert.throws(() => readControllerInput(root, 'original.js', size), /budget/);
  assert.equal(readdirSync('/proc/self/fd').length, before);
});

test('controller requires exact ordered process inventory bound to execution inputs', () => {
  const tests = ['tests/integration/process/one.test.ts', 'tests/integration/process/two.test.ts'];
  const manifest = { processTests: tests, executionInputs: [...tests] };
  assert.deepEqual(validateProcessInventory(manifest, tests), tests);
  for (const actual of [[], [...tests].reverse(), [tests[0]], [...tests, tests[0]]])
    assert.throws(() => validateProcessInventory(manifest, actual));
  assert.throws(() => validateProcessInventory({ ...manifest, executionInputs: [] }, tests));
  assert.throws(() =>
    validateProcessInventory({ ...manifest, processTests: [tests[0], tests[0]] }, [
      tests[0],
      tests[0]
    ])
  );
});

test('controller refuses implicit service tools before any build or artifact creation', async () => {
  const root = mkdtempSync(join(tmpdir(), 'cvg-process-controller-guard-'));
  await assert.rejects(runProcessCriticalCoverage(root), /explicit private tool/);
  assert.deepEqual(readdirSync(root), []);
});
