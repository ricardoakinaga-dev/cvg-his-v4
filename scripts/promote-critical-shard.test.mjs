import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { verifyCandidate } from './promote-critical-shard.mjs';

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'cvg-promotion-'));
  const shard = 'native-worker';
  const runId = 'run-1';
  const inputPath = 'src/input.ts';
  const inputBytes = Buffer.from('export const value = 1;\n');
  mkdirSync(join(root, 'src'), { recursive: true });
  writeFileSync(join(root, inputPath), inputBytes);
  mkdirSync(join(root, 'docs/engineering'), { recursive: true });
  const manifest = {
    schemaVersion: 1,
    head: 'a'.repeat(40),
    executionInputs: [inputPath],
  };
  const manifestBytes = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`);
  writeFileSync(join(root, 'docs/engineering/critical-coverage-scope.json'), manifestBytes);
  const candidate = join(root, 'artifacts/consolidacao-2026-09-05/coverage-scope', shard, runId);
  mkdirSync(candidate, { recursive: true });
  const coverageBytes = Buffer.from(JSON.stringify({ [join(root, inputPath)]: {} }));
  const resultBytes = Buffer.from(
    JSON.stringify({ schemaVersion: 2, runId, shard, status: 'passed' })
  );
  writeFileSync(join(candidate, 'coverage-final.json'), coverageBytes);
  writeFileSync(join(candidate, 'test-result.json'), resultBytes);
  const metadata = {
    schemaVersion: 2,
    finalizedAfterExit: true,
    runId,
    shard,
    status: 'passed',
    errors: [],
    exitCode: 0,
    signal: null,
    head: 'a'.repeat(40),
    manifestSha256: sha256(manifestBytes),
    executionInputHashes: { [inputPath]: sha256(inputBytes) },
    coverageFile: `${runId}/coverage-final.json`,
    testResultFile: `${runId}/test-result.json`,
    coverageSha256: sha256(coverageBytes),
    testResultSha256: sha256(resultBytes),
  };
  writeFileSync(join(candidate, 'shard.json'), JSON.stringify(metadata, null, 2));
  const verify = (overrides = {}) =>
    verifyCandidate({
      root,
      shard,
      runId,
      manifestBytes,
      head: 'a'.repeat(40),
      readInput: () => Buffer.from('export const value = 1;\n'),
      ...overrides,
    });
  const rewrite = (mutate) => {
    const next = JSON.parse(JSON.stringify(metadata));
    mutate(next);
    writeFileSync(join(candidate, 'shard.json'), JSON.stringify(next, null, 2));
  };
  return { root, shard, runId, manifestBytes, candidate, rewrite, verify };
}

test('promotion verifier accepts a fully bound finalized candidate', () => {
  const f = fixture();
  try {
    assert.deepEqual(f.verify(), []);
  } finally {
    rmSync(f.root, { recursive: true, force: true });
  }
});

test('promotion verifier rejects status, digest, input and identity drift', () => {
  const f = fixture();
  try {
    for (const [label, mutate, pattern] of [
      ['failed status', (m) => { m.status = 'failed'; }, /not a finalized passing shard/],
      ['failed exit', (m) => { m.exitCode = 1; }, /not a finalized passing shard/],
      ['signal after exit', (m) => { m.signal = 'SIGTERM'; }, /not a finalized passing shard/],
      ['head drift', (m) => { m.head = 'b'.repeat(40); }, /HEAD differs/],
      ['manifest drift', (m) => { m.manifestSha256 = 'c'.repeat(64); }, /different manifest revision/],
      ['coverage digest', (m) => { m.coverageSha256 = 'd'.repeat(64); }, /coverage digest mismatch/],
      ['result digest', (m) => { m.testResultSha256 = 'e'.repeat(64); }, /test result digest mismatch/],
      ['input hash', (m) => { m.executionInputHashes['src/input.ts'] = 'f'.repeat(64); }, /execution input hash mismatch/],
      ['input inventory', (m) => { m.executionInputHashes = {}; }, /differ from the frozen manifest inputs/],
      ['escaping reference', (m) => { m.coverageFile = '../escape.json'; }, /invalid coverageFile reference/],
    ]) {
      f.rewrite(mutate);
      assert.match(f.verify().join('\n'), pattern, label);
    }
    f.rewrite((m) => { m.runId = 'other'; });
    assert.match(f.verify().join('\n'), /not a finalized passing shard/);
  } finally {
    rmSync(f.root, { recursive: true, force: true });
  }
});

test('promotion verifier rejects unavailable execution inputs and wrong shard identity', () => {
  const f = fixture();
  try {
    assert.match(
      f.verify({ readInput: () => null }).join('\n'),
      /execution input unavailable/
    );
    assert.match(f.verify({ shard: 'native-api' }).join('\n'), /invalid shard directory/);
    assert.match(f.verify({ runId: '../escape' }).join('\n'), /invalid candidate directory/);
  } finally {
    rmSync(f.root, { recursive: true, force: true });
  }
});

test('promotion verifier rejects corrupted sibling references while accepting canonical files', () => {
  const good = fixture();
  try {
    assert.deepEqual(good.verify(), []);
  } finally {
    rmSync(good.root, { recursive: true, force: true });
  }

  const bad = fixture();
  try {
    const sibling = join(
      bad.root,
      'artifacts/consolidacao-2026-09-05/coverage-scope',
      bad.shard,
      'sibling'
    );
    mkdirSync(sibling, { recursive: true });
    writeFileSync(join(sibling, 'coverage-final.json'), 'CORRUPTED');
    writeFileSync(join(sibling, 'test-result.json'), 'CORRUPTED');
    bad.rewrite((metadata) => {
      metadata.coverageFile = 'sibling/coverage-final.json';
      metadata.testResultFile = 'sibling/test-result.json';
    });

    const errors = bad.verify().join('\n');
    assert.match(errors, /invalid coverageFile reference: does not point to the canonical/);
    assert.match(errors, /invalid testResultFile reference: does not point to the canonical/);
  } finally {
    rmSync(bad.root, { recursive: true, force: true });
  }
});

test('promotion verifier rejects symlinked references even when they stay inside the repository', () => {
  const f = fixture();
  try {
    const alias = join(f.candidate, 'coverage-alias.json');
    symlinkSync(join(f.candidate, 'coverage-final.json'), alias);
    f.rewrite((metadata) => {
      metadata.coverageFile = `${f.runId}/coverage-alias.json`;
    });

    assert.match(f.verify().join('\n'), /invalid coverageFile reference: path contains symlink/);
  } finally {
    rmSync(f.root, { recursive: true, force: true });
  }
});

test('promotion verifier rejects invalid referenced JSON even when its digest is declared', () => {
  for (const [filename, digestField, label] of [
    ['coverage-final.json', 'coverageSha256', 'coverage'],
    ['test-result.json', 'testResultSha256', 'test result'],
  ]) {
    const f = fixture();
    try {
      const invalidBytes = Buffer.from('{ invalid json\n');
      writeFileSync(join(f.candidate, filename), invalidBytes);
      f.rewrite((metadata) => {
        metadata[digestField] = sha256(invalidBytes);
      });

      assert.match(f.verify().join('\n'), new RegExp(`invalid ${label} JSON`), label);
    } finally {
      rmSync(f.root, { recursive: true, force: true });
    }
  }
});
