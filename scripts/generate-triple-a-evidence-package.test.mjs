import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import test from 'node:test';
import { join } from 'node:path';
import {
  generateTripleAEvidencePackage,
  PACKAGE_FILES
} from './generate-triple-a-evidence-package.mjs';

test('triple-a evidence package enumerates every closure artifact without inventing PASS', () => {
  const directory = mkdtempSync(join('/tmp', 'cvg-triple-a-package-'));
  const commitSha = 'c'.repeat(40);
  try {
    const result = generateTripleAEvidencePackage({
      rootDir: process.cwd(),
      outputDir: directory,
      releaseOutputDir: join(directory, 'release'),
      commitSha,
      observedAt: '2026-09-12T00:00:00.000Z'
    });

    assert.deepEqual(
      result.entries.map((entry) => entry.path.split('/').at(-1)),
      PACKAGE_FILES
    );
    assert.equal(
      result.entries.every((entry) => entry.status === 'NOT_PROVEN'),
      true
    );
    assert.equal(result.index.status, 'BLOCKED');
    const finalVerdict = JSON.parse(readFileSync(join(directory, 'final-verdict.json'), 'utf8'));
    assert.equal(finalVerdict.commit_sha, commitSha);
    assert.equal(finalVerdict.status, 'NOT_PROVEN');
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
