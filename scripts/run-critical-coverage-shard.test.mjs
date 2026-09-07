import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, rmSync, mkdirSync, symlinkSync, chmodSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkCriticalCoverage } from './check-critical-coverage.mjs';
import { finalizeShard, sha256, snapshotInputs } from './run-critical-coverage-shard.mjs';

const source = 'export function f(a) { return a ? 1 : 2; }\n';
const cliScript = fileURLToPath(new URL('./run-critical-coverage-shard.mjs', import.meta.url));

function coverageEntry(path, counts = { statement: 0, function: 0, branches: [0, 0] }) {
  const loc = { start: { line: 1, column: 0 }, end: { line: 1, column: source.trimEnd().length } };
  return {
    [path]: {
      path,
      statementMap: { 0: loc },
      fnMap: { 0: { name: 'f', decl: loc, loc, line: 1 } },
      branchMap: { 0: { type: 'cond-expr', line: 1, loc, locations: [loc, loc] } },
      s: { 0: counts.statement },
      f: { 0: counts.function },
      b: { 0: counts.branches },
    },
  };
}

function fixture({ coverageBytes, resultBytes, beforeInputs, afterInputs } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'coverage-finalizer-'));
  writeFileSync(join(root, 'a.ts'), source);
  const manifestBytes = Buffer.from(JSON.stringify({ files: [{ path: 'a.ts', applicability: 'javascript-metrics' }] }));
  const effectiveBeforeInputs = beforeInputs ?? { 'a.ts': sha256(source) };
  const effectiveAfterInputs = afterInputs ?? { 'a.ts': sha256(source) };
  const defaultCoverageBytes = Buffer.from(`${JSON.stringify(coverageEntry('a.ts'))}\n`);
  const defaultResultBytes = Buffer.from(JSON.stringify({ runId: 'run', shard: 'unit', status: 'passed' }));
  writeFileSync(join(root, 'coverage-final.json'), coverageBytes ?? defaultCoverageBytes);
  writeFileSync(join(root, 'test-result.json'), resultBytes ?? defaultResultBytes);
  return {
    root,
    manifestBytes,
    beforeInputs: effectiveBeforeInputs,
    afterInputs: effectiveAfterInputs,
    cleanup: () => rmSync(root, { recursive: true, force: true }),
    finalize: () => finalizeShard({
      root,
      manifestBytes,
      beforeInputs: effectiveBeforeInputs,
      afterInputs: effectiveAfterInputs,
      headBefore: 'head',
      headAfter: 'head',
      shard: 'unit',
      runId: 'run',
      output: root,
      exitCode: 0,
      signal: null,
    }),
  };
}

function checkerFixture({ executionInput = 'a.ts' } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'coverage-checker-containment-'));
  writeFileSync(join(root, 'a.ts'), source);
  const manifest = {
    head: 'fixture',
    executionInputs: [executionInput],
    requiredShards: ['unit'],
    components: ['auth'],
    thresholds: { lines: 85, statements: 85, functions: 85, branches: 85 },
    files: [{ path: 'a.ts', sha256: sha256(source), components: ['auth'], applicability: 'javascript-metrics' }],
  };
  const manifestBytes = Buffer.from(JSON.stringify(manifest));
  writeFileSync(join(root, 'manifest.json'), manifestBytes);
  mkdirSync(join(root, 'unit'));
  const coverageBytes = Buffer.from(JSON.stringify(coverageEntry('a.ts')));
  const resultBytes = Buffer.from(JSON.stringify({ runId: 'fixture-run', shard: 'unit', status: 'passed' }));
  writeFileSync(join(root, 'unit/coverage.json'), coverageBytes);
  writeFileSync(join(root, 'unit/result.json'), resultBytes);
  writeFileSync(join(root, 'unit/shard.json'), JSON.stringify({
    schemaVersion: 2,
    finalizedAfterExit: true,
    exitCode: 0,
    signal: null,
    runId: 'fixture-run',
    executionInputHashes: { [executionInput]: sha256(source) },
    testResultFile: 'result.json',
    shard: 'unit',
    status: 'passed',
    head: 'fixture',
    manifestSha256: sha256(manifestBytes),
    sourceHashes: { 'a.ts': sha256(source) },
    coverageFile: 'coverage.json',
    coverageSha256: sha256(coverageBytes),
    testResultSha256: sha256(resultBytes),
  }));
  return {
    root,
    check: () => checkCriticalCoverage({ root, manifestPath: join(root, 'manifest.json'), artifactsPath: root, head: 'fixture' }),
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  };
}

function cliFixture() {
  const root = mkdtempSync(join(tmpdir(), 'coverage-cli-'));
  const bin = join(root, 'bin');
  mkdirSync(join(root, 'docs/engineering'), { recursive: true });
  mkdirSync(bin);
  writeFileSync(join(root, 'input.js'), source);
  writeFileSync(join(root, 'docs/engineering/critical-coverage-scope.json'), JSON.stringify({
    executionInputs: ['input.js'],
    files: [{ path: 'input.js', applicability: 'javascript-metrics' }],
  }));
  writeFileSync(join(bin, 'git'), [
    '#!/usr/bin/env node',
    "if (process.argv[2] !== 'rev-parse') process.exit(1);",
    "process.stdout.write('fixture-head\\n');",
  ].join('\n'));
  writeFileSync(join(bin, 'pnpm'), [
    '#!/usr/bin/env node',
    "const fs = require('node:fs');",
    "const path = require('node:path');",
    'const shard = process.env.CRITICAL_COVERAGE_SHARD;',
    'const runId = process.env.CRITICAL_COVERAGE_RUN_ID;',
    "const output = path.resolve(process.cwd(), 'artifacts/consolidacao-2026-09-05/coverage-scope', shard, runId);",
    "fs.mkdirSync(output, { recursive: true });",
    "fs.writeFileSync(path.join(output, 'test-result.json'), JSON.stringify({ runId, shard, status: 'passed' }));",
    "fs.writeFileSync(path.join(output, 'coverage-final.json'), '{}\\n');",
    "if (process.env.STUB_PREVIOUS_COPY_TARGET) fs.symlinkSync(process.env.STUB_PREVIOUS_COPY_TARGET, path.join(output, 'previous-shard.json'));",
  ].join('\n'));
  chmodSync(join(bin, 'git'), 0o755);
  chmodSync(join(bin, 'pnpm'), 0o755);
  const environment = { ...process.env, PATH: `${bin}${process.platform === 'win32' ? ';' : ':'}${process.env.PATH ?? ''}` };
  return {
    root,
    parent: join(root, 'artifacts/consolidacao-2026-09-05/coverage-scope/vitest-unit'),
    run(overrides = {}) {
      try {
        const stdout = execFileSync(process.execPath, [cliScript, 'vitest-unit'], {
          cwd: root,
          env: { ...environment, ...overrides },
          encoding: 'utf8',
          stdio: ['ignore', 'pipe', 'pipe'],
        });
        return { status: 0, stdout, stderr: '' };
      } catch (error) {
        return { status: error.status ?? -1, stdout: error.stdout?.toString() ?? '', stderr: error.stderr?.toString() ?? '' };
      }
    },
    cleanup: () => rmSync(root, { recursive: true, force: true }),
  };
}

test('finalizer accepts valid zero-hit coverage and preserves absolute source identities', () => {
  const x = fixture();
  try {
    const coverageBytes = Buffer.from(`${JSON.stringify(coverageEntry(join(x.root, 'a.ts')))}\n`);
    writeFileSync(join(x.root, 'coverage-final.json'), coverageBytes);
    const result = x.finalize();
    assert.equal(result.status, 'passed');
    assert.deepEqual(result.errors, []);
    assert.equal(result.coverageSha256, sha256(coverageBytes));
  } finally {
    x.cleanup();
  }
});

for (const [name, counts] of [
  ['negative branch counter', { statement: 0, function: 0, branches: [7, -1] }],
  ['negative statement counter', { statement: -1, function: 0, branches: [0, 0] }],
  ['fractional function counter', { statement: 0, function: 0.5, branches: [0, 0] }],
  ['unsafe branch counter', { statement: 0, function: 0, branches: [1, Number.MAX_SAFE_INTEGER + 1] }],
]) test(`finalizer rejects ${name}`, () => {
  const coverageBytes = Buffer.from(`${JSON.stringify(coverageEntry('a.ts', counts))}\n`);
  const x = fixture({ coverageBytes });
  try {
    const result = x.finalize();
    assert.equal(result.status, 'failed');
    assert.ok(result.errors.some((error) => error.includes('invalid hit count')), result.errors.join('\n'));
    assert.equal(result.coverageSha256, sha256(coverageBytes));
  } finally {
    x.cleanup();
  }
});

test('finalizer rejects source locations outside the real source', () => {
  const coverage = coverageEntry('a.ts');
  coverage['a.ts'].statementMap[0].end.column = source.trimEnd().length + 1;
  const coverageBytes = Buffer.from(`${JSON.stringify(coverage)}\n`);
  const x = fixture({ coverageBytes });
  try {
    const result = x.finalize();
    assert.equal(result.status, 'failed');
    assert.ok(result.errors.some((error) => error.includes('invalid source location')), result.errors.join('\n'));
  } finally {
    x.cleanup();
  }
});

test('finalizer rejects malformed coverage JSON without throwing and retains its digest', () => {
  const coverageBytes = Buffer.from('{"a.ts":');
  const x = fixture({ coverageBytes });
  try {
    let result;
    assert.doesNotThrow(() => { result = x.finalize(); });
    assert.equal(result.status, 'failed');
    assert.ok(result.errors.some((error) => error.includes('invalid coverage JSON')), result.errors.join('\n'));
    assert.equal(result.coverageSha256, sha256(coverageBytes));
  } finally {
    x.cleanup();
  }
});

for (const serialized of ['null', '[]', '{"a.ts":null}']) test(`finalizer rejects coverage schema ${serialized}`, () => {
  const coverageBytes = Buffer.from(serialized);
  const x = fixture({ coverageBytes });
  try {
    const result = x.finalize();
    assert.equal(result.status, 'failed');
    assert.ok(result.errors.some((error) => /invalid coverage report schema|invalid file coverage schema/.test(error)), result.errors.join('\n'));
  } finally {
    x.cleanup();
  }
});

test('finalizer rejects an empty coverage map instead of certifying by existence', () => {
  const coverageBytes = Buffer.from('{}\n');
  const x = fixture({ coverageBytes });
  try {
    const result = x.finalize();
    assert.equal(result.status, 'failed');
    assert.ok(result.errors.some((error) => error.includes('empty report')), result.errors.join('\n'));
    assert.equal(result.coverageSha256, sha256(coverageBytes));
  } finally {
    x.cleanup();
  }
});

test('containment rejects outside frozen inputs and report symlinks before content reads', () => {
  const root = mkdtempSync(join(tmpdir(), 'coverage-containment-'));
  const outsideRoot = mkdtempSync(join(tmpdir(), 'coverage-containment-outside-'));
  const finalizer = fixture();
  const checkerInput = checkerFixture({ executionInput: 'linked-input.ts' });
  const checkerCoverage = checkerFixture();
  const checkerResult = checkerFixture();
  try {
    const outsideSource = join(outsideRoot, 'outside.ts');
    writeFileSync(outsideSource, source);
    assert.throws(() => snapshotInputs(root, { executionInputs: [outsideSource] }), /path escapes root/);
    assert.throws(() => snapshotInputs(root, { executionInputs: [relative(root, outsideSource)] }), /path escapes root/);
    symlinkSync(outsideSource, join(root, 'linked-input.ts'));
    assert.throws(() => snapshotInputs(root, { executionInputs: ['linked-input.ts'] }), /path escapes root/);

    const outsideCoverage = join(outsideRoot, 'coverage.json');
    const outsideResult = join(outsideRoot, 'result.json');
    const coverageBytes = Buffer.from(`${JSON.stringify(coverageEntry('a.ts'))}\n`);
    const resultBytes = Buffer.from(JSON.stringify({ runId: 'run', shard: 'unit', status: 'passed' }));
    writeFileSync(outsideCoverage, coverageBytes);
    writeFileSync(outsideResult, resultBytes);

    rmSync(join(finalizer.root, 'coverage-final.json'));
    symlinkSync(outsideCoverage, join(finalizer.root, 'coverage-final.json'));
    let result = finalizer.finalize();
    assert.equal(result.status, 'failed');
    assert.ok(result.errors.some((error) => error.includes('coverage output path invalid: path escapes root via symlink')), result.errors.join('\n'));

    rmSync(join(finalizer.root, 'coverage-final.json'));
    writeFileSync(join(finalizer.root, 'coverage-final.json'), coverageBytes);
    rmSync(join(finalizer.root, 'test-result.json'));
    symlinkSync(outsideResult, join(finalizer.root, 'test-result.json'));
    result = finalizer.finalize();
    assert.equal(result.status, 'failed');
    assert.ok(result.errors.some((error) => error.includes('test result path invalid: path escapes root via symlink')), result.errors.join('\n'));

    symlinkSync(outsideSource, join(checkerInput.root, 'linked-input.ts'));
    result = checkerInput.check();
    assert.equal(result.status, 'FAIL');
    assert.ok(result.errors.some((error) => error.includes('execution input path escapes root: unit:linked-input.ts')), result.errors.join('\n'));

    rmSync(join(checkerCoverage.root, 'unit/coverage.json'));
    symlinkSync(outsideCoverage, join(checkerCoverage.root, 'unit/coverage.json'));
    result = checkerCoverage.check();
    assert.equal(result.status, 'FAIL');
    assert.ok(result.errors.some((error) => error.includes('coverage path escapes root via symlink')), result.errors.join('\n'));

    rmSync(join(checkerResult.root, 'unit/result.json'));
    symlinkSync(outsideResult, join(checkerResult.root, 'unit/result.json'));
    result = checkerResult.check();
    assert.equal(result.status, 'FAIL');
    assert.ok(result.errors.some((error) => error.includes('test result path escapes root via symlink')), result.errors.join('\n'));
  } finally {
    finalizer.cleanup();
    checkerInput.cleanup();
    checkerCoverage.cleanup();
    checkerResult.cleanup();
    rmSync(root, { recursive: true, force: true });
    rmSync(outsideRoot, { recursive: true, force: true });
  }
});

test('CLI guards artifact parent, previous-shard reads, and publication symlinks', () => {
  const parentSymlink = cliFixture();
  const parentOutside = mkdtempSync(join(tmpdir(), 'coverage-cli-parent-outside-'));
  const previousShard = cliFixture();
  const previousOutside = mkdtempSync(join(tmpdir(), 'coverage-cli-previous-outside-'));
  const previousCopy = cliFixture();
  const copyOutside = mkdtempSync(join(tmpdir(), 'coverage-cli-copy-outside-'));
  try {
    const parentSentinel = join(parentOutside, 'sentinel.txt');
    writeFileSync(parentSentinel, 'parent sentinel');
    mkdirSync(join(parentSymlink.root, 'artifacts/consolidacao-2026-09-05/coverage-scope'), { recursive: true });
    symlinkSync(parentOutside, parentSymlink.parent);
    let run = parentSymlink.run();
    assert.equal(run.status, 1, run.stderr);
    assert.match(run.stderr, /artifact directory .*path escapes root via symlink/);
    assert.deepEqual(readdirSync(parentOutside).sort(), ['sentinel.txt']);

    const previousSentinel = join(previousOutside, 'shard.json');
    writeFileSync(previousSentinel, 'previous sentinel');
    mkdirSync(previousShard.parent, { recursive: true });
    symlinkSync(previousSentinel, join(previousShard.parent, 'shard.json'));
    run = previousShard.run();
    assert.equal(run.status, 1, run.stderr);
    assert.match(run.stderr, /previous shard .*path escapes root via symlink/);
    assert.equal(readFileSync(previousSentinel, 'utf8'), 'previous sentinel');

    const copySentinel = join(copyOutside, 'previous-shard.json');
    writeFileSync(copySentinel, 'copy sentinel');
    mkdirSync(previousCopy.parent, { recursive: true });
    writeFileSync(join(previousCopy.parent, 'shard.json'), 'previous shard');
    run = previousCopy.run({ STUB_PREVIOUS_COPY_TARGET: copySentinel });
    assert.equal(run.status, 1, run.stderr);
    assert.match(run.stderr, /previous shard copy .*path escapes root via symlink/);
    assert.equal(readFileSync(copySentinel, 'utf8'), 'copy sentinel');
  } finally {
    parentSymlink.cleanup();
    previousShard.cleanup();
    previousCopy.cleanup();
    rmSync(parentOutside, { recursive: true, force: true });
    rmSync(previousOutside, { recursive: true, force: true });
    rmSync(copyOutside, { recursive: true, force: true });
  }
});

test('finalizer rejects escaping and unexpected source identities without reading outside root', () => {
  const x = fixture();
  const outsideRoot = mkdtempSync(join(tmpdir(), 'coverage-outside-'));
  try {
    const outsideSource = join(outsideRoot, 'outside.ts');
    writeFileSync(outsideSource, source);
    const escapingPath = relative(x.root, outsideSource);
    const escapingBytes = Buffer.from(`${JSON.stringify(coverageEntry(escapingPath))}\n`);
    writeFileSync(join(x.root, 'coverage-final.json'), escapingBytes);
    let result = x.finalize();
    assert.equal(result.status, 'failed');
    assert.ok(result.errors.some((error) => error.includes('raw coverage path escapes root')), result.errors.join('\n'));

    const unexpectedPath = 'unexpected.ts';
    writeFileSync(join(x.root, unexpectedPath), source);
    const unexpectedBytes = Buffer.from(`${JSON.stringify(coverageEntry(unexpectedPath))}\n`);
    writeFileSync(join(x.root, 'coverage-final.json'), unexpectedBytes);
    result = x.finalize();
    assert.equal(result.status, 'failed');
    assert.ok(result.errors.some((error) => error.includes('unexpected raw coverage source')), result.errors.join('\n'));

    const outsideEntry = coverageEntry('a.ts');
    outsideEntry['a.ts'].path = escapingPath;
    writeFileSync(join(x.root, 'coverage-final.json'), Buffer.from(`${JSON.stringify(outsideEntry)}\n`));
    result = x.finalize();
    assert.equal(result.status, 'failed');
    assert.ok(result.errors.some((error) => error.includes('coverage source path escapes root')), result.errors.join('\n'));
  } finally {
    x.cleanup();
    rmSync(outsideRoot, { recursive: true, force: true });
  }
});

for (const kind of ['changed-input', 'failed-exit', 'missing-output', 'foreign-result']) {
  test(`post-exit finalizer ${kind}`, () => {
    const root = mkdtempSync(join(tmpdir(), 'coverage-finalizer-'));
    try {
      writeFileSync(join(root, 'a.ts'), source);
      const coverageBytes = Buffer.from(`${JSON.stringify(coverageEntry('a.ts'))}\n`);
      if (kind !== 'missing-output') writeFileSync(join(root, 'coverage-final.json'), coverageBytes);
      writeFileSync(join(root, 'test-result.json'), JSON.stringify({ runId: kind === 'foreign-result' ? 'other' : 'run', shard: 'unit', status: 'passed' }));
      const beforeInputs = { 'a.ts': sha256(source) };
      const result = finalizeShard({
        root,
        manifestBytes: Buffer.from(JSON.stringify({ files: [{ path: 'a.ts', applicability: 'javascript-metrics' }] })),
        beforeInputs,
        afterInputs: kind === 'changed-input' ? { 'a.ts': 'changed' } : beforeInputs,
        headBefore: 'head',
        headAfter: 'head',
        shard: 'unit',
        runId: 'run',
        output: root,
        exitCode: kind === 'failed-exit' ? 1 : 0,
        signal: null,
      });
      assert.equal(result.status, 'failed');
      if (kind !== 'missing-output') assert.equal(result.coverageSha256, sha256(coverageBytes));
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  });
}
