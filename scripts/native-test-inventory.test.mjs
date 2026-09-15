import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  discoverNativeTestSources,
  snapshotNativeInventory,
  validateNativeObservation,
} from './lib/native-test-inventory.mjs';

function fixtureRoot() {
  const root = mkdtempSync(join(tmpdir(), 'native-inventory-'));
  mkdirSync(join(root, 'apps/worker/src'), { recursive: true });
  mkdirSync(join(root, 'apps/api/src'), { recursive: true });
  return root;
}

test('discoverNativeTestSources finds supported AST forms and ignores comments and strings', () => {
  const root = fixtureRoot();
  try {
    const write = (path, body) => writeFileSync(join(root, path), body);
    write('apps/worker/src/import.test.ts', "import test from 'node:test';\n");
    write('apps/worker/src/import-equals.test.ts', "import test = require('node:test');\n");
    write('apps/worker/src/require.test.ts', "const { test } = require('node:test');\n");
    write('apps/worker/src/dynamic.test.ts', "const { test } = await import('node:test', {});\n");
    write('apps/worker/src/comment.test.ts', "// import test from 'node:test';\nconst label = 'node:test';\nexport {};\n");
    write('apps/api/src/route.test.ts', "import test from 'node:test';\n");
    assert.deepEqual(discoverNativeTestSources(root, 'worker'), [
      'apps/worker/src/dynamic.test.ts',
      'apps/worker/src/import-equals.test.ts',
      'apps/worker/src/import.test.ts',
      'apps/worker/src/require.test.ts',
    ]);
    assert.deepEqual(discoverNativeTestSources(root, 'api'), ['apps/api/src/route.test.ts']);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('discoverNativeTestSources rejects invalid syntax and symlinked sources', () => {
  const root = fixtureRoot();
  try {
    writeFileSync(join(root, 'apps/worker/src/broken.test.ts'), 'import { from ;\n');
    assert.throws(() => discoverNativeTestSources(root, 'worker'), /cannot be parsed/);
    rmSync(join(root, 'apps/worker/src/broken.test.ts'));
    writeFileSync(join(root, 'apps/worker/src/real.test.ts'), "import test from 'node:test';\n");
    symlinkSync(join(root, 'apps/worker/src/real.test.ts'), join(root, 'apps/worker/src/link.test.ts'));
    assert.throws(() => discoverNativeTestSources(root, 'worker'), /symlinks are not allowed/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('snapshot rejects an omitted native test and a source map pointing elsewhere', () => {
  const root = fixtureRoot();
  try {
    mkdirSync(join(root, 'apps/worker/dist'), { recursive: true });
    const path = 'apps/worker/src/one.test.ts';
    writeFileSync(join(root, path), "import test from 'node:test'; test('one', () => {});\n");
    writeFileSync(join(root, 'apps/worker/dist/one.test.js'), "import test from 'node:test'; test('one', () => {});\n");
    const mapPath = join(root, 'apps/worker/dist/one.test.js.map');
    writeFileSync(mapPath, JSON.stringify({ version: 3, sourceRoot: '', sources: ['../src/one.test.ts'], names: [], mappings: '' }));
    assert.equal(snapshotNativeInventory(root, 'worker', [path]).length, 1);

    writeFileSync(join(root, 'apps/worker/src/omitted.test.ts'), "import test from 'node:test';\n");
    assert.throws(() => snapshotNativeInventory(root, 'worker', [path]), /differs from discovered/);

    writeFileSync(join(root, 'apps/worker/dist/omitted.test.js'), "import test from 'node:test';\n");
    writeFileSync(
      join(root, 'apps/worker/dist/omitted.test.js.map'),
      JSON.stringify({ version: 3, sourceRoot: '', sources: ['../src/omitted.test.ts'], names: [], mappings: '' })
    );
    writeFileSync(join(root, 'apps/worker/src/other.test.ts'), 'export {};\n');
    writeFileSync(mapPath, JSON.stringify({ version: 3, sourceRoot: '', sources: ['../src/other.test.ts'], names: [], mappings: '' }));
    assert.throws(
      () => snapshotNativeInventory(root, 'worker', [path, 'apps/worker/src/omitted.test.ts']),
      /map points to a different source/
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('snapshot binds every native test to emitted code, original source and map', () => {
  const root = mkdtempSync(join(tmpdir(), 'native-inventory-'));
  try {
    mkdirSync(join(root, 'apps/worker/src'), { recursive: true });
    mkdirSync(join(root, 'apps/worker/dist'), { recursive: true });
    const path = 'apps/worker/src/one.test.ts';
    writeFileSync(join(root, path), "import test from 'node:test'; test('one', () => {});\n");
    writeFileSync(join(root, 'apps/worker/dist/one.test.js'), "import test from 'node:test'; test('one', () => {});\n");
    const map = join(root, 'apps/worker/dist/one.test.js.map');
    writeFileSync(map, JSON.stringify({ version: 3, sourceRoot: '', sources: ['../src/one.test.ts'], names: [], mappings: '' }));
    const first = snapshotNativeInventory(root, 'worker', [path]);
    assert.equal(first.length, 1);
    assert.match(first[0].generatedSha256, /^[0-9a-f]{64}$/);
    assert.deepEqual(snapshotNativeInventory(root, 'worker', [path]), first);
    writeFileSync(join(root, 'apps/worker/src/comment.test.ts'), "// import test from 'node:test';\nexport {};\n");
    assert.deepEqual(snapshotNativeInventory(root, 'worker', [path]), first);
    writeFileSync(join(root, 'apps/worker/dist/one.test.js'), 'changed();');
    assert.notEqual(snapshotNativeInventory(root, 'worker', [path])[0].generatedSha256, first[0].generatedSha256);
    writeFileSync(join(root, 'apps/worker/src/two.test.ts'), "import test from 'node\\u003atest';");
    assert.throws(() => snapshotNativeInventory(root, 'worker', [path]), /differs from discovered/);
    for (const source of [
      "import test = require('node:test');",
      'const {test} = require(`node:test`);',
      "const {test} = await import('node:test', {});",
    ]) {
      writeFileSync(join(root, 'apps/worker/src/two.test.ts'), source);
      assert.throws(() => snapshotNativeInventory(root, 'worker', [path]), /differs from discovered/);
    }
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('native observation must match exact inventory and successful process exit', async () => {
  const counts = { tests: 1, passed: 1, failed: 0, cancelled: 0, skipped: 0, todo: 0, suites: 0, topLevel: 1 };
  const summary = { success: true, counts };
  const observation = { schemaVersion: 1, kind: 'native-test-observation', status: 'passed', errors: [], summary, files: [{ file: '/one.test.js', ...summary }] };
  const inventory = [{ executedFile: '/one.test.js' }];
  const exit = { exitCode: 0, signal: null };
  assert.equal((await validateNativeObservation(observation, inventory, exit)).status, 'passed');
  for (const [value, expected, termination] of [
    [observation, [...inventory, { executedFile: '/two.test.js' }], exit],
    [observation, inventory, { exitCode: 1, signal: null }],
    [observation, inventory, { exitCode: 0, signal: 'SIGTERM' }],
    [{ ...observation, files: [] }, inventory, exit],
    [{ ...observation, summary: { ...summary, counts: { ...counts, passed: 0 } } }, inventory, exit],
    [{ ...observation, status: 'failed' }, inventory, exit],
  ]) assert.equal((await validateNativeObservation(value, expected, termination)).status, 'failed');
});
