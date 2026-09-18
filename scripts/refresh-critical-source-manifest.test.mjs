import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { applyRefresh, assertExecutionInputTargets } from './refresh-critical-source-manifest.mjs';
import { executionInputDigest, sourceSetDigest } from './lib/critical-source-identity.mjs';

function cliFixture() {
  const root = mkdtempSync(join(tmpdir(), 'cvg-native-cli-'));
  for (const directory of ['scripts/lib', 'apps/worker/src', 'apps/api/src', 'docs/engineering']) {
    mkdirSync(join(root, directory), { recursive: true });
  }
  copyFileSync(
    resolve(import.meta.dirname, 'refresh-critical-source-manifest.mjs'),
    join(root, 'scripts/refresh-critical-source-manifest.mjs')
  );
  for (const file of [
    'critical-source-identity.mjs',
    'native-test-inventory.mjs',
    'native-test-evidence-reporter.mjs',
    'root-contained-path.mjs',
    'sql-migration-evidence.mjs',
    'vitest-test-inventory.mjs',
  ]) {
    copyFileSync(resolve(import.meta.dirname, 'lib', file), join(root, 'scripts/lib', file));
  }
  symlinkSync(resolve(import.meta.dirname, '..', 'node_modules'), join(root, 'node_modules'), 'dir');
  const workerTests = ['apps/worker/src/one.test.ts', 'apps/worker/src/two.test.ts'];
  const apiTests = ['apps/api/src/route.test.ts'];
  for (const testPath of [...workerTests, ...apiTests]) {
    writeFileSync(join(root, testPath), "import test from 'node:test';\n");
  }
  const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
  const files = [
    {
      path: workerTests[0],
      sha256: sha256(readFileSync(join(root, workerTests[0]))),
      components: ['auth'],
      applicability: 'javascript-metrics',
    },
  ];
  const manifest = {
    schemaVersion: 1,
    ticket: 'R05-010',
    status: 'frozen-proposal-not-certified',
    head: 'a'.repeat(40),
    thresholds: { lines: 85, statements: 85, functions: 85, branches: 85 },
    requiredShards: ['native-worker', 'native-api'],
    components: ['auth'],
    processTests: [],
    nativeTests: { 'native-worker': [...workerTests], 'native-api': [...apiTests] },
    files,
    vitestTests: [],
    executionInputs: [...workerTests, ...apiTests],
    executionInputsSha256: executionInputDigest([...workerTests, ...apiTests]),
    scopeHistory: [{ reason: 'cli fixture' }],
    manifestRevision: 1,
    sourceSetSha256: sourceSetDigest(files),
  };
  const manifestPath = join(root, 'docs/engineering/critical-coverage-scope.json');
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  return { root, manifest, manifestPath, workerTests, apiTests };
}

function runCliCheck(root) {
  return spawnSync(process.execPath, [join(root, 'scripts/refresh-critical-source-manifest.mjs'), '--check'], {
    cwd: root,
    encoding: 'utf8',
  });
}

function fixtureManifest() {
  const files = [
    { path: 'src/a.ts', sha256: 'a'.repeat(64) },
    { path: 'src/b.ts', sha256: 'b'.repeat(64) },
  ];
  return {
    manifestRevision: 1,
    head: '1'.repeat(40),
    sourceSetSha256: sourceSetDigest(files),
    scopeHistory: [{ manifestRevision: 1, reason: 'previous', changed: [] }],
    files,
  };
}

test('applyRefresh increments the revision, updates only changed identities and appends history', () => {
  const manifest = fixtureManifest();
  const before = JSON.parse(JSON.stringify(manifest));
  const next = applyRefresh({
    manifest,
    previousManifestSha256: 'f'.repeat(64),
    preservedManifest: 'artifacts/remediation/MA-02/attempt-1/before.json',
    collectionCommit: '2'.repeat(40),
    reason: 'synthetic refresh',
    changed: [{ path: 'src/a.ts', before: 'a'.repeat(64), after: 'c'.repeat(64) }],
    observedAt: '2026-09-12T00:00:00.000Z',
  });

  assert.deepEqual(manifest, before, 'the input manifest must not be mutated');
  assert.equal(next.manifestRevision, 2);
  assert.equal(next.head, '2'.repeat(40));
  assert.equal(next.files.find((file) => file.path === 'src/a.ts').sha256, 'c'.repeat(64));
  assert.equal(next.files.find((file) => file.path === 'src/b.ts').sha256, 'b'.repeat(64));
  assert.equal(next.sourceSetSha256, sourceSetDigest(next.files));
  assert.notEqual(next.sourceSetSha256, before.sourceSetSha256);
  assert.deepEqual(next.scopeHistory[0], before.scopeHistory[0], 'prior history is preserved');
  assert.deepEqual(next.scopeHistory[1], {
    manifestRevision: 2,
    observedAt: '2026-09-12T00:00:00.000Z',
    collectionCommit: '2'.repeat(40),
    previousManifestSha256: 'f'.repeat(64),
    preservedManifest: 'artifacts/remediation/MA-02/attempt-1/before.json',
    previousSourceSetSha256: sourceSetDigest(before.files),
    sourceSetSha256: next.sourceSetSha256,
    reason: 'synthetic refresh',
    added: [],
    removed: [],
    changed: [{ path: 'src/a.ts', before: 'a'.repeat(64), after: 'c'.repeat(64) }],
  });
});

test('applyRefresh refuses to write an identity for an unknown source path', () => {
  assert.throws(
    () =>
      applyRefresh({
        manifest: fixtureManifest(),
        previousManifestSha256: 'f'.repeat(64),
        preservedManifest: 'before.json',
        collectionCommit: '2'.repeat(40),
        reason: 'synthetic refresh',
        changed: [{ path: 'src/missing.ts', before: null, after: 'd'.repeat(64) }],
      }),
    /unknown source/
  );
});

test('applyRefresh reconciles execution inputs without touching measured sources or test inventories', () => {
  const manifest = {
    ...fixtureManifest(),
    executionInputs: ['src/old.vue', 'src/keep.ts'],
    vitestTests: ['tests/unit/a.test.ts'],
    nativeTests: { 'native-api': ['apps/api/src/a.test.ts'] },
    processTests: ['tests/integration/process/a.test.ts'],
  };
  const filesBefore = JSON.parse(JSON.stringify(manifest.files));
  const next = applyRefresh({
    manifest,
    previousManifestSha256: 'f'.repeat(64),
    preservedManifest: 'artifacts/remediation/MA-02-F-INPUTS/attempt-1/before.json',
    collectionCommit: '2'.repeat(40),
    reason: 'reconcile renamed execution inputs',
    changed: [],
    inputChanges: { replaced: [{ from: 'src/old.vue', to: 'src/new.ts' }], added: [], removed: [] },
    observedAt: '2026-09-12T00:00:00.000Z',
  });

  assert.deepEqual(next.executionInputs, ['src/new.ts', 'src/keep.ts']);
  assert.equal(next.executionInputsSha256, executionInputDigest(['src/new.ts', 'src/keep.ts']));
  assert.deepEqual(next.files, filesBefore, 'measured source identities must not change');
  assert.equal(next.sourceSetSha256, manifest.sourceSetSha256);
  assert.deepEqual(next.vitestTests, ['tests/unit/a.test.ts']);
  assert.deepEqual(next.nativeTests, { 'native-api': ['apps/api/src/a.test.ts'] });
  assert.deepEqual(next.processTests, ['tests/integration/process/a.test.ts']);

  const entry = next.scopeHistory.at(-1);
  assert.deepEqual(entry.inputsReplaced, [{ from: 'src/old.vue', to: 'src/new.ts' }]);
  assert.deepEqual(entry.inputsAdded, []);
  assert.deepEqual(entry.inputsRemoved, []);
  assert.equal(entry.previousExecutionInputsSha256, null);
  assert.equal(entry.executionInputsSha256, next.executionInputsSha256);
});

test('assertExecutionInputTargets rejects an omitted successor and accepts an existing one', () => {
  const fixtureRoot = mkdtempSync(join(tmpdir(), 'cvg-critical-inputs-'));
  try {
    mkdirSync(join(fixtureRoot, 'src'), { recursive: true });
    writeFileSync(join(fixtureRoot, 'src', 'new.ts'), 'export const value = 1;\n');
    assert.doesNotThrow(() =>
      assertExecutionInputTargets({
        root: fixtureRoot,
        inputChanges: { replaced: [{ from: 'src/old.vue', to: 'src/new.ts' }], added: [], removed: [] },
      })
    );
    assert.throws(
      () =>
        assertExecutionInputTargets({
          root: fixtureRoot,
          inputChanges: { replaced: [{ from: 'src/old.vue', to: 'src/missing.ts' }], added: [], removed: [] },
        }),
      /successor unavailable/
    );
    assert.throws(
      () =>
        assertExecutionInputTargets({
          root: fixtureRoot,
          inputChanges: { replaced: [], added: ['src/absent.ts'], removed: [] },
        }),
      /successor unavailable/
    );
  } finally {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }
});

test('applyRefresh reconciles native inventories, adds execution inputs and records the delta', () => {
  const manifest = {
    ...fixtureManifest(),
    executionInputs: ['apps/worker/src/a.test.ts'],
    executionInputsSha256: executionInputDigest(['apps/worker/src/a.test.ts']),
    nativeTests: { 'native-worker': ['apps/worker/src/a.test.ts'], 'native-api': [] },
  };
  const next = applyRefresh({
    manifest,
    previousManifestSha256: 'f'.repeat(64),
    preservedManifest: 'artifacts/remediation/MA-02-F-NATIVE/before.json',
    collectionCommit: '2'.repeat(40),
    reason: 'native reconciliation',
    changed: [],
    inputChanges: { replaced: [], added: ['apps/worker/src/b.test.ts'], removed: [] },
    nativeChanges: [{ shard: 'native-worker', added: ['apps/worker/src/b.test.ts'], removed: [] }],
    observedAt: '2026-09-12T00:00:00.000Z',
  });

  assert.deepEqual(next.nativeTests['native-worker'], ['apps/worker/src/a.test.ts', 'apps/worker/src/b.test.ts']);
  assert.equal(next.executionInputs.includes('apps/worker/src/b.test.ts'), true);
  assert.equal(next.executionInputsSha256, executionInputDigest(next.executionInputs));
  assert.deepEqual(next.files, manifest.files, 'measured sources must not change');
  assert.equal(next.sourceSetSha256, manifest.sourceSetSha256);
  const entry = next.scopeHistory.at(-1);
  assert.deepEqual(entry.nativeChanged, [
    { shard: 'native-worker', added: ['apps/worker/src/b.test.ts'], removed: [] },
  ]);
  assert.deepEqual(entry.inputsAdded, ['apps/worker/src/b.test.ts']);
});

test('refresh --check and a no-delta native reconciliation do not write the manifest', () => {
  const script = resolve(import.meta.dirname, 'refresh-critical-source-manifest.mjs');
  const manifestPath = resolve(import.meta.dirname, '..', 'docs/engineering/critical-coverage-scope.json');
  const before = readFileSync(manifestPath);
  const check = spawnSync(process.execPath, [script, '--check'], { encoding: 'utf8' });
  assert.equal(check.status, 0, check.stderr);
  assert.match(check.stdout, /"mode": "check"/);
  assert.ok(before.equals(readFileSync(manifestPath)), '--check must not write');
  const noop = spawnSync(
    process.execPath,
    [script, '--reconcile-native', 'native-worker', '--reconcile-native', 'native-api'],
    { encoding: 'utf8' }
  );
  assert.equal(noop.status, 0, noop.stderr);
  assert.match(noop.stdout, /"mode": "noop"/);
  assert.ok(before.equals(readFileSync(manifestPath)), 'no-delta reconciliation must not write');
});

test('public CLI --check rejects incomplete required native inventories without writing', () => {
  const fixture = cliFixture();
  try {
    const before = readFileSync(fixture.manifestPath);
    const valid = runCliCheck(fixture.root);
    assert.equal(valid.status, 0, valid.stderr + valid.stdout);
    assert.match(valid.stdout, /"status": "PASS"/);
    assert.ok(before.equals(readFileSync(fixture.manifestPath)), 'valid --check must not write');

    const cases = [
      ['missing nativeTests', (m) => { delete m.nativeTests; }, /nativeTests is required/],
      ['null nativeTests', (m) => { m.nativeTests = null; }, /nativeTests must be an object/],
      ['array nativeTests', (m) => { m.nativeTests = []; }, /nativeTests must be an object/],
      ['string nativeTests', (m) => { m.nativeTests = 'none'; }, /nativeTests must be an object/],
      ['missing required worker shard', (m) => { delete m.nativeTests['native-worker']; }, /nativeTests\[native-worker\] is required by requiredShards/],
      ['empty required worker shard', (m) => { m.nativeTests['native-worker'] = []; }, /nativeTests\[native-worker\] must be a non-empty list/],
      ['omitted discovered test', (m) => { m.nativeTests['native-worker'] = [fixture.workerTests[0]]; }, /differs from discovered sources/],
      ['duplicate native test', (m) => { m.nativeTests['native-worker'] = [fixture.workerTests[0], fixture.workerTests[0], fixture.workerTests[1]]; }, /duplicate native test/],
      ['nonexistent native test', (m) => { m.nativeTests['native-worker'] = [...fixture.workerTests, 'apps/worker/src/missing.test.ts']; }, /path does not exist/],
      ['wrong shard', (m) => { m.nativeTests['native-worker'] = [...fixture.workerTests, fixture.apiTests[0]]; }, /does not belong to the shard/],
      ['native test missing from executionInputs', (m) => { m.executionInputs = m.executionInputs.filter((p) => p !== fixture.workerTests[1]); }, /missing from executionInputs/],
    ];
    for (const [label, mutate, pattern] of cases) {
      const manifest = JSON.parse(JSON.stringify(fixture.manifest));
      mutate(manifest);
      writeFileSync(fixture.manifestPath, JSON.stringify(manifest, null, 2) + '\n');
      const caseBytes = readFileSync(fixture.manifestPath);
      const result = runCliCheck(fixture.root);
      assert.notEqual(result.status, 0, `${label}: expected non-zero exit`);
      assert.match(result.stdout, pattern, label);
      assert.ok(caseBytes.equals(readFileSync(fixture.manifestPath)), `${label}: --check must not write`);
      writeFileSync(fixture.manifestPath, before);
    }

    const legacy = JSON.parse(JSON.stringify(fixture.manifest));
    legacy.requiredShards = ['vitest-unit'];
    delete legacy.nativeTests;
    writeFileSync(fixture.manifestPath, JSON.stringify(legacy, null, 2) + '\n');
    const legacyBytes = readFileSync(fixture.manifestPath);
    const legacyResult = runCliCheck(fixture.root);
    assert.equal(legacyResult.status, 0, legacyResult.stderr + legacyResult.stdout);
    assert.ok(legacyBytes.equals(readFileSync(fixture.manifestPath)), 'legacy --check must not write');
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

function vitestCliFixture() {
  const root = mkdtempSync(join(tmpdir(), 'cvg-vitest-cli-'));
  for (const directory of ['scripts/lib', 'src', 'tests/unit', 'docs/engineering']) {
    mkdirSync(join(root, directory), { recursive: true });
  }
  copyFileSync(
    resolve(import.meta.dirname, 'refresh-critical-source-manifest.mjs'),
    join(root, 'scripts/refresh-critical-source-manifest.mjs')
  );
  for (const file of [
    'critical-source-identity.mjs',
    'native-test-inventory.mjs',
    'native-test-evidence-reporter.mjs',
    'root-contained-path.mjs',
    'sql-migration-evidence.mjs',
    'vitest-test-inventory.mjs',
  ]) {
    copyFileSync(resolve(import.meta.dirname, 'lib', file), join(root, 'scripts/lib', file));
  }
  symlinkSync(resolve(import.meta.dirname, '..', 'node_modules'), join(root, 'node_modules'), 'dir');
  const source = 'export const value = 1;\n';
  const testPath = 'tests/unit/example.test.ts';
  writeFileSync(join(root, 'src/example.ts'), source);
  writeFileSync(
    join(root, testPath),
    "import { describe, expect, it } from 'vitest';\nimport { value } from '../../src/example.js';\n"
  );
  const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
  const files = [
    {
      path: 'src/example.ts',
      sha256: sha256(readFileSync(join(root, 'src/example.ts'))),
      components: ['auth'],
      applicability: 'javascript-metrics',
    },
  ];
  const manifest = {
    schemaVersion: 1,
    ticket: 'R05-010',
    status: 'frozen-proposal-not-certified',
    head: 'a'.repeat(40),
    thresholds: { lines: 85, statements: 85, functions: 85, branches: 85 },
    requiredShards: ['vitest-unit'],
    components: ['auth'],
    processTests: [],
    files,
    vitestTests: [],
    executionInputs: [],
    executionInputsSha256: executionInputDigest([]),
    scopeHistory: [{ reason: 'vitest cli fixture' }],
    manifestRevision: 1,
    sourceSetSha256: sourceSetDigest(files),
  };
  const manifestPath = join(root, 'docs/engineering/critical-coverage-scope.json');
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  return { root, manifest, manifestPath, testPath };
}

test('applyRefresh reconciles the Vitest inventory, adds inputs and records the delta', () => {
  const manifest = {
    ...fixtureManifest(),
    executionInputs: ['tests/unit/a.test.ts'],
    executionInputsSha256: executionInputDigest(['tests/unit/a.test.ts']),
    vitestTests: ['tests/unit/a.test.ts'],
  };
  const next = applyRefresh({
    manifest,
    previousManifestSha256: 'f'.repeat(64),
    preservedManifest: 'artifacts/remediation/MA-02-F-DISPATCH/before.json',
    collectionCommit: '2'.repeat(40),
    reason: 'vitest reconciliation',
    changed: [],
    inputChanges: { replaced: [], added: ['tests/unit/b.test.ts'], removed: [] },
    vitestChanges: [{ added: ['tests/unit/b.test.ts'], removed: [] }],
    observedAt: '2026-09-12T00:00:00.000Z',
  });

  assert.deepEqual(next.vitestTests, ['tests/unit/a.test.ts', 'tests/unit/b.test.ts']);
  assert.equal(next.executionInputs.includes('tests/unit/b.test.ts'), true);
  assert.equal(next.executionInputsSha256, executionInputDigest(next.executionInputs));
  assert.deepEqual(next.files, manifest.files, 'measured sources must not change');
  assert.equal(next.sourceSetSha256, manifest.sourceSetSha256);
  const entry = next.scopeHistory.at(-1);
  assert.deepEqual(entry.vitestAdded, ['tests/unit/b.test.ts']);
  assert.deepEqual(entry.vitestRemoved, []);
  assert.deepEqual(entry.inputsAdded, ['tests/unit/b.test.ts']);
});

test('public CLI --reconcile-vitest adds discovered tests and inputs atomically', () => {
  const fixture = vitestCliFixture();
  try {
    const script = join(fixture.root, 'scripts/refresh-critical-source-manifest.mjs');
    const before = readFileSync(fixture.manifestPath);
    const initial = runCliCheck(fixture.root);
    assert.notEqual(initial.status, 0, 'missing Vitest inventory must fail closed');
    assert.match(initial.stdout, /vitestTests is missing discovered test files/);

    const refused = spawnSync(
      process.execPath,
      [script, '--add-vitest-test', 'tests/integration/process/nope.test.ts', '--reason', 'invalid'],
      { cwd: fixture.root, encoding: 'utf8' }
    );
    assert.notEqual(refused.status, 0);
    assert.ok(before.equals(readFileSync(fixture.manifestPath)), 'invalid addition must not write');

    const refreshed = spawnSync(
      process.execPath,
      [
        script,
        '--reconcile-vitest',
        '--reason',
        'synthetic vitest reconciliation',
        '--head',
        'a'.repeat(40),
        '--preserve-dir',
        'artifacts/rem',
      ],
      { cwd: fixture.root, encoding: 'utf8' }
    );
    assert.equal(refreshed.status, 0, refreshed.stderr + refreshed.stdout);
    assert.match(refreshed.stdout, /"mode": "refresh"/);
    const next = JSON.parse(readFileSync(fixture.manifestPath));
    assert.equal(next.manifestRevision, 2);
    assert.deepEqual(next.vitestTests, [fixture.testPath]);
    assert.equal(next.executionInputs.includes(fixture.testPath), true);
    assert.equal(next.executionInputsSha256, executionInputDigest(next.executionInputs));
    assert.deepEqual(next.scopeHistory.at(-1).vitestAdded, [fixture.testPath]);
    const after = runCliCheck(fixture.root);
    assert.equal(after.status, 0, after.stderr + after.stdout);
    assert.match(after.stdout, /"status": "PASS"/);
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});

test('SQL expansion preserves the frozen scope and accounts for a new forward migration', () => {
  const fixture = cliFixture();
  try {
    const path = 'packages/db/migrations/0002_evidence_guard.sql';
    mkdirSync(join(fixture.root, 'packages/db/migrations'), { recursive: true });
    writeFileSync(join(fixture.root, path), 'SELECT 1;\n');
    const baselinePath = 'packages/db/migrations/0001_base.sql';
    writeFileSync(join(fixture.root, baselinePath), 'SELECT 0;\n');
    fixture.manifest.files.push({ path: baselinePath, components: ['roles-rls'],
      applicability: 'sql-migration-evidence', justification: 'fixture baseline', review: null,
      sha256: createHash('sha256').update('SELECT 0;\n').digest('hex') });
    fixture.manifest.sourceSetSha256 = sourceSetDigest(fixture.manifest.files);
    fixture.manifest.specializedEvidence = { sql: {
      schemaVersion: 1, sourceDirectory: 'packages/db/migrations',
      acceptedArtifactPath: 'artifacts/sql.json', historicalArtifactCount: 0,
      requiredPhases: ['cleanApply', 'upgrade', 'reexecution', 'failureRecovery', 'invariants'],
      expectedMigrationCount: 1, expectedArtifactCount: 1,
      contractualMigrationCount: 1, forwardOnlyAdditions: []
    } };
    fixture.manifest.thresholds = { branches: 85, lines: 85, statements: 85, functions: 85 };
    const before = JSON.stringify(fixture.manifest, null, 2) + '\n';
    writeFileSync(fixture.manifestPath, before);
    const args = [join(fixture.root, 'scripts/refresh-critical-source-manifest.mjs'),
      '--add-sql-migration', path, '--reason', 'new append-only invariant', '--head', 'a'.repeat(40)];
    const result = spawnSync(process.execPath, args, { cwd: fixture.root, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr + result.stdout);
    const next = JSON.parse(readFileSync(fixture.manifestPath));
    assert.deepEqual(next.files.slice(0, -1), fixture.manifest.files);
    assert.deepEqual(next.thresholds, fixture.manifest.thresholds);
    assert.equal(next.files.at(-1).path, path);
    assert.equal(next.files.at(-1).sha256, createHash('sha256').update('SELECT 1;\n').digest('hex'));
    assert.equal(next.specializedEvidence.sql.expectedMigrationCount, 2);
    assert.equal(next.specializedEvidence.sql.expectedArtifactCount, 2);
    assert.equal(next.specializedEvidence.sql.contractualMigrationCount, 1);
    assert.deepEqual(next.specializedEvidence.sql.forwardOnlyAdditions, [path]);
    assert.deepEqual(next.scopeHistory.slice(0, -1), fixture.manifest.scopeHistory);
    assert.deepEqual(next.scopeHistory.at(-1).added, [path]);
    assert.equal(readFileSync(join(fixture.root, next.scopeHistory.at(-1).preservedManifest), 'utf8'), before);
    assert.equal(runCliCheck(fixture.root).status, 0);
    const accepted = readFileSync(fixture.manifestPath, 'utf8');
    const duplicate = spawnSync(process.execPath, args, { cwd: fixture.root, encoding: 'utf8' });
    assert.notEqual(duplicate.status, 0);
    assert.match(duplicate.stderr, /duplicate SQL source/);
    assert.equal(readFileSync(fixture.manifestPath, 'utf8'), accepted);
    for (const invalid of ['../escape.sql', 'packages/db/migrations/0177_evidence_guard.revert.sql', 'packages/db/migrations/0999_missing.sql']) {
      const rejected = spawnSync(process.execPath, [args[0], '--add-sql-migration', invalid, '--reason', 'invalid', '--head', 'a'.repeat(40)], { cwd: fixture.root, encoding: 'utf8' });
      assert.notEqual(rejected.status, 0);
      assert.equal(readFileSync(fixture.manifestPath, 'utf8'), accepted);
    }
    const prefix = 'packages/db/migrations/0000_non_forward.sql';
    writeFileSync(join(fixture.root, prefix), 'SELECT -1;\n');
    const nonForward = spawnSync(process.execPath, [args[0], '--add-sql-migration', prefix,
      '--reason', 'invalid prefix', '--head', 'a'.repeat(40)], { cwd: fixture.root, encoding: 'utf8' });
    assert.notEqual(nonForward.status, 0);
    assert.match(nonForward.stderr, /forwardOnlyAdditions does not match canonical suffix/);
    assert.equal(readFileSync(fixture.manifestPath, 'utf8'), accepted);
  } finally {
    rmSync(fixture.root, { recursive: true, force: true });
  }
});
