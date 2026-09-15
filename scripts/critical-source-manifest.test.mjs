import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';
import { resolveContainedPath } from './lib/root-contained-path.mjs';
import { sourceSetDigest, validateCriticalSourceIdentity } from './lib/critical-source-identity.mjs';
import {
  applyExecutionInputChanges,
  applyNativeInventoryChanges,
  executionInputDigest,
  validateExecutionInputDigest,
  validateExecutionInputs,
  validateNativeInventories,
} from './lib/critical-source-identity.mjs';
import {
  applyVitestInventoryChanges,
  validateVitestInventory,
} from './lib/vitest-test-inventory.mjs';

const root = resolve(import.meta.dirname, '..');
const manifest = JSON.parse(readFileSync(resolve(root, 'docs/engineering/critical-coverage-scope.json')));
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

test('every active critical source exists and matches its frozen identity', () => {
  const errors = validateCriticalSourceIdentity({ root, manifest });
  assert.deepEqual(errors, []);
  assert.equal(new Set(manifest.files.map(file => file.path)).size, manifest.files.length);
  assert.equal(sourceSetDigest(manifest.files), manifest.sourceSetSha256);
  assert.ok(manifest.scopeHistory.length > 0);
});

test('retired compiler copies retain their canonical source and every component', () => {
  const active = new Map(manifest.files.map(file => [file.path, file]));
  const retiredPaths = new Set();
  for (const entry of manifest.retiredGeneratedArtifacts ?? []) {
    assert.match(entry.path, /^packages\/db\/src\/schema\/[^/]+\.js$/);
    assert.equal(entry.canonicalPath, entry.path.slice(0, -3) + '.ts');
    assert.equal(active.has(entry.path), false, 'compiler output must not be counted as an original source');
    assert.equal(retiredPaths.has(entry.path), false);
    retiredPaths.add(entry.path);
    const canonical = active.get(entry.canonicalPath);
    assert.ok(canonical, `canonical source lost: ${entry.canonicalPath}`);
    assert.ok(entry.components.length > 0);
    for (const component of entry.components) assert.ok(canonical.components.includes(component));
    assert.equal(canonical.applicability, 'javascript-metrics');
    assert.match(entry.sha256, /^[a-f0-9]{64}$/);
    assert.match(entry.historicalMapSha256, /^[a-f0-9]{64}$/);
    assert.match(entry.historicalHead, /^[a-f0-9]{40}$/);
  }
});

function fixtureManifest({ bytes, recordedSha, revision = 1, sourceSet, head = 'a'.repeat(40) }) {
  return {
    manifestRevision: revision,
    head,
    sourceSetSha256: sourceSet ?? sourceSetDigest([{ path: 'src/example.ts', sha256: hash(bytes) }]),
    scopeHistory: [{ reason: 'synthetic fixture' }],
    files: [{ path: 'src/example.ts', sha256: recordedSha ?? hash(bytes) }],
  };
}

test('accepts a consistent synthetic identity fixture and rejects unreported source changes', () => {
  const fixtureRoot = mkdtempSync(join(tmpdir(), 'cvg-critical-identity-'));
  try {
    mkdirSync(join(fixtureRoot, 'src'), { recursive: true });
    const bytes = Buffer.from('export const value = 1;\n');
    writeFileSync(join(fixtureRoot, 'src/example.ts'), bytes);

    assert.deepEqual(
      validateCriticalSourceIdentity({ root: fixtureRoot, manifest: fixtureManifest({ bytes }) }),
      []
    );

    writeFileSync(join(fixtureRoot, 'src/example.ts'), 'export const value = 2;\n');
    assert.deepEqual(
      validateCriticalSourceIdentity({ root: fixtureRoot, manifest: fixtureManifest({ bytes }) }),
      ['src/example.ts: hash mismatch']
    );
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test('rejects stale set digests, malformed identities, missing revisions and wrong collection commit', () => {
  const fixtureRoot = mkdtempSync(join(tmpdir(), 'cvg-critical-identity-'));
  try {
    mkdirSync(join(fixtureRoot, 'src'), { recursive: true });
    const bytes = Buffer.from('export const value = 1;\n');
    writeFileSync(join(fixtureRoot, 'src/example.ts'), bytes);

    assert.deepEqual(
      validateCriticalSourceIdentity({
        root: fixtureRoot,
        manifest: fixtureManifest({ bytes, sourceSet: 'b'.repeat(64) }),
      }),
      ['sourceSetSha256 does not match the recorded source identities']
    );
    assert.deepEqual(
      validateCriticalSourceIdentity({
        root: fixtureRoot,
        manifest: fixtureManifest({
          bytes,
          recordedSha: 'not-a-hash',
          sourceSet: sourceSetDigest([{ path: 'src/example.ts', sha256: 'not-a-hash' }]),
        }),
      }),
      ['src/example.ts: recorded sha256 is malformed']
    );
    assert.deepEqual(
      validateCriticalSourceIdentity({
        root: fixtureRoot,
        manifest: fixtureManifest({ bytes, revision: 0 }),
      }),
      ['manifestRevision must be a positive integer']
    );
    assert.deepEqual(
      validateCriticalSourceIdentity({
        root: fixtureRoot,
        manifest: fixtureManifest({ bytes, head: 'main' }),
      }),
      ['head must be the 40-hex collection commit']
    );
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test('rejects manifest paths that escape the repository root', () => {
  const fixtureRoot = mkdtempSync(join(tmpdir(), 'cvg-critical-identity-'));
  try {
    const digest = hash('outside');
    const errors = validateCriticalSourceIdentity({
      root: fixtureRoot,
      manifest: {
        manifestRevision: 1,
        head: 'a'.repeat(40),
        sourceSetSha256: sourceSetDigest([{ path: '../outside.ts', sha256: digest }]),
        scopeHistory: [{ reason: 'synthetic fixture' }],
        files: [{ path: '../outside.ts', sha256: digest }],
      },
    });
    assert.deepEqual(errors, ['../outside.ts: path escapes root']);
    assert.equal(resolveContainedPath(fixtureRoot, '../outside.ts').ok, false);
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test('rejects missing, duplicated and escaping execution inputs', () => {
  const fixtureRoot = mkdtempSync(join(tmpdir(), 'cvg-critical-inputs-'));
  try {
    mkdirSync(join(fixtureRoot, 'src'), { recursive: true });
    writeFileSync(join(fixtureRoot, 'src', 'a.ts'), 'export const a = 1;\n');
    writeFileSync(join(fixtureRoot, 'src', 'b.ts'), 'export const b = 1;\n');
    const base = { executionInputs: undefined };

    assert.deepEqual(
      validateExecutionInputs({
        root: fixtureRoot,
        manifest: { ...base, executionInputs: ['src/a.ts', 'src/b.ts'] },
      }),
      []
    );
    assert.deepEqual(
      validateExecutionInputs({
        root: fixtureRoot,
        manifest: { ...base, executionInputs: ['src/a.ts', 'src/missing.ts'] },
      }),
      ['src/missing.ts: path does not exist']
    );
    assert.deepEqual(
      validateExecutionInputs({
        root: fixtureRoot,
        manifest: { ...base, executionInputs: ['src/a.ts', 'src/a.ts'] },
      }),
      ['src/a.ts: duplicate execution input']
    );
    assert.deepEqual(
      validateExecutionInputs({
        root: fixtureRoot,
        manifest: { ...base, executionInputs: ['../outside.ts'] },
      }),
      ['../outside.ts: path escapes root']
    );
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test('rejects an unregistered execution input inventory change', () => {
  assert.deepEqual(
    validateExecutionInputDigest({
      executionInputs: ['src/a.ts', 'src/b.ts'],
      executionInputsSha256: executionInputDigest(['src/a.ts', 'src/b.ts']),
    }),
    []
  );
  assert.deepEqual(
    validateExecutionInputDigest({
      executionInputs: ['src/a.ts', 'src/c.ts'],
      executionInputsSha256: executionInputDigest(['src/a.ts', 'src/b.ts']),
    }),
    ['executionInputsSha256 does not match the recorded execution inputs']
  );
  assert.deepEqual(
    validateExecutionInputDigest({ executionInputs: ['src/a.ts'], executionInputsSha256: 'stale' }),
    ['executionInputsSha256 is malformed']
  );
});

test('rejects scope history that disagrees with the current revision or input digest', () => {
  const fixtureRoot = mkdtempSync(join(tmpdir(), 'cvg-critical-inputs-'));
  try {
    mkdirSync(join(fixtureRoot, 'src'), { recursive: true });
    const bytes = Buffer.from('export const value = 1;\n');
    writeFileSync(join(fixtureRoot, 'src', 'example.ts'), bytes);
    const digest = hash(bytes);
    const base = {
      manifestRevision: 2,
      head: 'a'.repeat(40),
      sourceSetSha256: sourceSetDigest([{ path: 'src/example.ts', sha256: digest }]),
      files: [{ path: 'src/example.ts', sha256: digest }],
      executionInputs: ['src/example.ts'],
      executionInputsSha256: executionInputDigest(['src/example.ts']),
    };

    assert.deepEqual(
      validateCriticalSourceIdentity({
        root: fixtureRoot,
        manifest: {
          ...base,
          scopeHistory: [
            { manifestRevision: 2, executionInputsSha256: base.executionInputsSha256 },
            { manifestRevision: 1, executionInputsSha256: base.executionInputsSha256 },
          ],
        },
      }),
      ['scopeHistory revision does not match manifestRevision']
    );
    assert.deepEqual(
      validateCriticalSourceIdentity({
        root: fixtureRoot,
        manifest: {
          ...base,
          scopeHistory: [
            { manifestRevision: 1, executionInputsSha256: base.executionInputsSha256 },
            { manifestRevision: 2, executionInputsSha256: executionInputDigest(['src/other.ts']) },
          ],
        },
      }),
      ['scopeHistory execution input digest does not match the recorded execution inputs']
    );
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test('rejects omitted successors, duplicates and unknown input mutations', () => {
  assert.deepEqual(
    applyExecutionInputChanges({
      inputs: ['src/old.vue', 'src/keep.ts'],
      replaced: [{ from: 'src/old.vue', to: 'src/new.ts' }],
    }),
    ['src/new.ts', 'src/keep.ts']
  );
  assert.throws(
    () =>
      applyExecutionInputChanges({
        inputs: ['src/old.vue'],
        replaced: [{ from: 'src/missing.vue', to: 'src/new.ts' }],
      }),
    /unknown execution input/
  );
  assert.throws(
    () =>
      applyExecutionInputChanges({
        inputs: ['src/old.vue', 'src/new.ts'],
        replaced: [{ from: 'src/old.vue', to: 'src/new.ts' }],
      }),
    /already present/
  );
  assert.throws(
    () => applyExecutionInputChanges({ inputs: ['src/a.ts'], added: ['src/a.ts'] }),
    /already present/
  );
  assert.throws(
    () => applyExecutionInputChanges({ inputs: ['src/a.ts'], removed: ['src/absent.ts'] }),
    /unknown execution input/
  );
});

test('native inventories must match discovery, shard placement and execution inputs', () => {
  const fixtureRoot = mkdtempSync(join(tmpdir(), 'cvg-native-inventory-'));
  try {
    mkdirSync(join(fixtureRoot, 'apps/worker/src'), { recursive: true });
    mkdirSync(join(fixtureRoot, 'apps/api/src'), { recursive: true });
    const workerTest = 'apps/worker/src/one.test.ts';
    const apiTest = 'apps/api/src/route.test.ts';
    writeFileSync(join(fixtureRoot, workerTest), "import test from 'node:test';\n");
    writeFileSync(join(fixtureRoot, apiTest), "import test from 'node:test';\n");
    const base = {
      requiredShards: ['native-worker', 'native-api'],
      executionInputs: [workerTest, apiTest],
      nativeTests: { 'native-worker': [workerTest], 'native-api': [apiTest] },
    };
    assert.deepEqual(validateNativeInventories({ root: fixtureRoot, manifest: base }), []);

    const omitted = {
      ...base,
      nativeTests: { 'native-worker': [], 'native-api': [apiTest] },
    };
    assert.match(validateNativeInventories({ root: fixtureRoot, manifest: omitted }).join('\n'), /non-empty list/);

    const wrongShard = {
      ...base,
      nativeTests: { 'native-worker': [apiTest], 'native-api': [apiTest] },
    };
    assert.match(validateNativeInventories({ root: fixtureRoot, manifest: wrongShard }).join('\n'), /does not belong to the shard/);

    const duplicate = {
      ...base,
      nativeTests: { 'native-worker': [workerTest, workerTest], 'native-api': [apiTest] },
    };
    assert.match(validateNativeInventories({ root: fixtureRoot, manifest: duplicate }).join('\n'), /duplicate native test/);

    const missingFile = {
      ...base,
      nativeTests: { 'native-worker': ['apps/worker/src/missing.test.ts'], 'native-api': [apiTest] },
    };
    assert.match(validateNativeInventories({ root: fixtureRoot, manifest: missingFile }).join('\n'), /path does not exist/);

    const missingInput = { ...base, executionInputs: [apiTest] };
    assert.match(validateNativeInventories({ root: fixtureRoot, manifest: missingInput }).join('\n'), /missing from executionInputs/);

    const unsupported = {
      ...base,
      nativeTests: { ...base.nativeTests, 'native-spa': ['apps/api/src/route.test.ts'] },
    };
    assert.match(validateNativeInventories({ root: fixtureRoot, manifest: unsupported }).join('\n'), /unsupported shard/);
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test('applyNativeInventoryChanges enforces shard, uniqueness and deterministic order', () => {
  const nativeTests = {
    'native-worker': ['apps/worker/src/b.test.ts', 'apps/worker/src/a.test.ts'],
    'native-api': ['apps/api/src/route.test.ts'],
  };
  const next = applyNativeInventoryChanges({
    nativeTests,
    shard: 'native-worker',
    added: ['apps/worker/src/c.test.ts'],
    removed: ['apps/worker/src/b.test.ts'],
  });
  assert.deepEqual(next['native-worker'], ['apps/worker/src/a.test.ts', 'apps/worker/src/c.test.ts']);
  assert.deepEqual(next['native-api'], ['apps/api/src/route.test.ts']);
  assert.deepEqual(nativeTests['native-worker'], ['apps/worker/src/b.test.ts', 'apps/worker/src/a.test.ts'], 'input is not mutated');
  assert.throws(
    () => applyNativeInventoryChanges({ nativeTests, shard: 'native-worker', added: ['apps/api/src/route.test.ts'] }),
    /does not belong to native-worker/
  );
  assert.throws(
    () => applyNativeInventoryChanges({ nativeTests, shard: 'native-worker', added: ['apps/worker/src/a.test.ts'] }),
    /already present/
  );
  assert.throws(
    () => applyNativeInventoryChanges({ nativeTests, shard: 'native-spa', added: [] }),
    /unsupported native shard/
  );
});

test('native inventory presence is mandatory when requiredShards demands native shards', () => {
  const fixtureRoot = mkdtempSync(join(tmpdir(), 'cvg-native-required-'));
  try {
    mkdirSync(join(fixtureRoot, 'apps/worker/src'), { recursive: true });
    mkdirSync(join(fixtureRoot, 'apps/api/src'), { recursive: true });
    const workerTest = 'apps/worker/src/one.test.ts';
    const apiTest = 'apps/api/src/route.test.ts';
    writeFileSync(join(fixtureRoot, workerTest), "import test from 'node:test';\n");
    writeFileSync(join(fixtureRoot, apiTest), "import test from 'node:test';\n");

    assert.match(
      validateNativeInventories({ root: fixtureRoot, manifest: { requiredShards: ['native-worker'] } }).join('\n'),
      /nativeTests is required when requiredShards includes: native-worker/
    );
    assert.match(
      validateNativeInventories({ root: fixtureRoot, manifest: { requiredShards: ['native-api'] } }).join('\n'),
      /nativeTests is required when requiredShards includes: native-api/
    );
    for (const value of [null, [], 'none', 42]) {
      assert.match(
        validateNativeInventories({
          root: fixtureRoot,
          manifest: { requiredShards: ['native-worker', 'native-api'], nativeTests: value },
        }).join('\n'),
        /nativeTests must be an object/
      );
    }
    assert.match(
      validateNativeInventories({
        root: fixtureRoot,
        manifest: {
          requiredShards: ['native-worker', 'native-api'],
          executionInputs: [apiTest],
          nativeTests: { 'native-api': [apiTest] },
        },
      }).join('\n'),
      /nativeTests\[native-worker\] is required by requiredShards/
    );
    assert.match(
      validateNativeInventories({
        root: fixtureRoot,
        manifest: {
          requiredShards: ['native-worker', 'native-api'],
          executionInputs: [workerTest],
          nativeTests: { 'native-worker': [workerTest] },
        },
      }).join('\n'),
      /nativeTests\[native-api\] is required by requiredShards/
    );
    assert.deepEqual(
      validateNativeInventories({
        root: fixtureRoot,
        manifest: { requiredShards: ['vitest-unit', 'critical-process'] },
      }),
      [],
      'legacy manifests without a native obligation keep being accepted'
    );
    assert.deepEqual(
      validateNativeInventories({
        root: fixtureRoot,
        manifest: {
          requiredShards: ['vitest-unit'],
          executionInputs: [workerTest, apiTest],
          nativeTests: { 'native-worker': [workerTest], 'native-api': [apiTest] },
        },
      }),
      [],
      'present native inventories are still validated when no native shard is required'
    );
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test('validateCriticalSourceIdentity fails closed when a required native inventory is absent', () => {
  const fixtureRoot = mkdtempSync(join(tmpdir(), 'cvg-native-identity-'));
  try {
    mkdirSync(join(fixtureRoot, 'src'), { recursive: true });
    const bytes = Buffer.from('export const value = 1;\n');
    writeFileSync(join(fixtureRoot, 'src', 'example.ts'), bytes);
    const digest = hash(bytes);
    const base = {
      manifestRevision: 1,
      head: 'a'.repeat(40),
      sourceSetSha256: sourceSetDigest([{ path: 'src/example.ts', sha256: digest }]),
      files: [{ path: 'src/example.ts', sha256: digest }],
      scopeHistory: [{ reason: 'synthetic fixture' }],
    };
    assert.deepEqual(validateCriticalSourceIdentity({ root: fixtureRoot, manifest: base }), []);
    assert.match(
      validateCriticalSourceIdentity({
        root: fixtureRoot,
        manifest: { ...base, requiredShards: ['native-api'] },
      }).join('\n'),
      /nativeTests is required when requiredShards includes: native-api/
    );
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

function vitestFixture() {
  const fixtureRoot = mkdtempSync(join(tmpdir(), 'cvg-vitest-inventory-'));
  mkdirSync(join(fixtureRoot, 'src'), { recursive: true });
  mkdirSync(join(fixtureRoot, 'tests/unit'), { recursive: true });
  writeFileSync(join(fixtureRoot, 'src/example.ts'), 'export const value = 1;\n');
  const testPath = 'tests/unit/example.test.ts';
  writeFileSync(
    join(fixtureRoot, testPath),
    "import { describe, expect, it } from 'vitest';\nimport { value } from '../../src/example.js';\n"
  );
  return {
    fixtureRoot,
    testPath,
    manifest: {
      files: [{ path: 'src/example.ts', applicability: 'javascript-metrics' }],
      requiredShards: ['vitest-unit'],
      executionInputs: [testPath],
      vitestTests: [testPath],
    },
  };
}

test('vitest inventory must match discovery, execution inputs and shard family', () => {
  const { fixtureRoot, testPath, manifest } = vitestFixture();
  try {
    assert.deepEqual(validateVitestInventory({ root: fixtureRoot, manifest }), []);

    assert.match(
      validateVitestInventory({ root: fixtureRoot, manifest: { ...manifest, vitestTests: [] } }).join('\n'),
      /vitestTests is missing discovered test files that import frozen critical sources/
    );
    assert.match(
      validateVitestInventory({
        root: fixtureRoot,
        manifest: { ...manifest, executionInputs: [] },
      }).join('\n'),
      /vitest test is missing from executionInputs/
    );
    assert.match(
      validateVitestInventory({
        root: fixtureRoot,
        manifest: { ...manifest, vitestTests: [testPath, testPath] },
      }).join('\n'),
      /duplicate vitest test/
    );
    assert.match(
      validateVitestInventory({
        root: fixtureRoot,
        manifest: { ...manifest, vitestTests: ['tests/integration/process/example.test.ts'] },
      }).join('\n'),
      /process suites belong to processTests/
    );
    writeFileSync(
      join(fixtureRoot, 'tests/unit/native.test.ts'),
      "import test from 'node:test';\n"
    );
    assert.match(
      validateVitestInventory({
        root: fixtureRoot,
        manifest: {
          ...manifest,
          executionInputs: [testPath, 'tests/unit/native.test.ts'],
          vitestTests: [testPath, 'tests/unit/native.test.ts'],
        },
      }).join('\n'),
      /native suite belongs to nativeTests/
    );
    assert.match(
      validateVitestInventory({ root: fixtureRoot, manifest: { requiredShards: ['vitest-unit'] } }).join('\n'),
      /vitestTests is required when requiredShards includes: vitest-unit/
    );
    assert.deepEqual(
      validateVitestInventory({ root: fixtureRoot, manifest: { requiredShards: ['critical-process'] } }),
      [],
      'legacy manifests without a Vitest obligation keep being accepted'
    );
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test('frontend suites importing critical sources through the spa alias are mandatory', () => {
  const fixtureRoot = mkdtempSync(join(tmpdir(), 'cvg-vitest-spa-'));
  try {
    mkdirSync(join(fixtureRoot, 'apps/spa/src/services'), { recursive: true });
    mkdirSync(join(fixtureRoot, 'apps/spa/src/pages/__tests__'), { recursive: true });
    writeFileSync(join(fixtureRoot, 'apps/spa/src/services/critical.ts'), 'export const value = 1;\n');
    writeFileSync(
      join(fixtureRoot, 'vitest.alias.ts'),
      "export function createWorkspaceAliases() { const from = (path: string) => path; return { '@': from('apps/spa/src') }; }\n"
    );
    const testPath = 'apps/spa/src/pages/__tests__/page.test.ts';
    writeFileSync(
      join(fixtureRoot, testPath),
      "import { describe } from 'vitest';\nimport { value } from '@/services/critical';\n"
    );
    const manifest = {
      files: [{ path: 'apps/spa/src/services/critical.ts', applicability: 'javascript-metrics' }],
      requiredShards: ['vitest-unit'],
      executionInputs: [testPath],
      vitestTests: [testPath],
    };
    assert.deepEqual(validateVitestInventory({ root: fixtureRoot, manifest }), []);
    assert.match(
      validateVitestInventory({ root: fixtureRoot, manifest: { ...manifest, vitestTests: [] } }).join('\n'),
      /vitestTests is missing discovered test files that import frozen critical sources/
    );
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test('applyVitestInventoryChanges enforces uniqueness, family and removal', () => {
  const inventory = ['tests/unit/a.test.ts', 'tests/unit/b.test.ts'];
  const next = applyVitestInventoryChanges({
    vitestTests: inventory,
    added: ['tests/unit/c.test.ts'],
    removed: ['tests/unit/a.test.ts'],
  });
  assert.deepEqual(next, ['tests/unit/b.test.ts', 'tests/unit/c.test.ts']);
  assert.deepEqual(inventory, ['tests/unit/a.test.ts', 'tests/unit/b.test.ts'], 'input is not mutated');
  assert.throws(
    () => applyVitestInventoryChanges({ vitestTests: inventory, added: ['tests/unit/a.test.ts'] }),
    /already present/
  );
  assert.throws(
    () => applyVitestInventoryChanges({ vitestTests: inventory, removed: ['tests/unit/missing.test.ts'] }),
    /unknown vitest test/
  );
  assert.throws(
    () =>
      applyVitestInventoryChanges({
        vitestTests: inventory,
        added: ['tests/integration/process/a.test.ts'],
      }),
    /does not belong to the frozen inventory/
  );
});
