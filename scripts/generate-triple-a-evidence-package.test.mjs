import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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

test('triple-a evidence package rejects malformed PASS sources and honors mapped evidence inputs', () => {
  const root = mkdtempSync(join('/tmp', 'cvg-triple-a-source-validation-'));
  const releaseDirectory = join(root, 'release');
  const outputDirectory = join(root, 'package');
  const commitSha = 'd'.repeat(40);
  const backupEvidencePath = join(root, 'backup-evidence.json');
  try {
    mkdirSync(releaseDirectory, { recursive: true });
    writeFileSync(
      join(releaseDirectory, 'ci-evidence.json'),
      JSON.stringify({ status: 'PASS', commit_sha: commitSha })
    );
    writeFileSync(
      join(releaseDirectory, 'TRIPLE_A_RELEASE_EVIDENCE.json'),
      JSON.stringify({
        schema_version: 1,
        commit_sha: commitSha,
        decision: 'PASS',
        claim: 'TRIPLE-A VERIFIED'
      })
    );
    writeFileSync(backupEvidencePath, JSON.stringify({ status: 'PASS', commit_sha: commitSha }));

    const result = generateTripleAEvidencePackage({
      rootDir: root,
      outputDir: outputDirectory,
      releaseOutputDir: releaseDirectory,
      commitSha,
      environment: { TRIPLE_A_BACKUP_EVIDENCE: backupEvidencePath },
      observedAt: '2026-09-12T00:00:00.000Z'
    });

    const ciEvidence = JSON.parse(readFileSync(join(outputDirectory, 'ci-evidence.json'), 'utf8'));
    const backupEvidence = JSON.parse(
      readFileSync(join(outputDirectory, 'backup-restore.json'), 'utf8')
    );
    const finalVerdict = JSON.parse(
      readFileSync(join(outputDirectory, 'final-verdict.json'), 'utf8')
    );
    assert.equal(ciEvidence.status, 'NOT_PROVEN');
    assert.equal(backupEvidence.status, 'NOT_PROVEN');
    assert.equal(finalVerdict.status, 'NOT_PROVEN');
    assert.equal(result.index.status, 'BLOCKED');

    const payloadPath = join(root, 'evidence.txt');
    writeFileSync(payloadPath, 'independent evidence\n');
    writeFileSync(
      backupEvidencePath,
      JSON.stringify({
        schema_version: 1,
        evidence_type: 'cvg-his-external-evidence',
        status: 'PASS',
        commit_sha: commitSha,
        observed_at: new Date().toISOString(),
        producer: { kind: 'test-runner', run_id: 'test-1' },
        verification: {
          verified: true,
          method: 'test-verifier',
          verifier_id: 'test-verifier',
          verified_at: new Date().toISOString()
        },
        artifacts: [
          {
            path: 'evidence.txt',
            sha256: `sha256:${createHash('sha256').update('independent evidence\n').digest('hex')}`
          }
        ]
      })
    );
    const verifiedResult = generateTripleAEvidencePackage({
      rootDir: root,
      outputDir: join(root, 'verified-package'),
      releaseOutputDir: releaseDirectory,
      commitSha,
      environment: { TRIPLE_A_BACKUP_EVIDENCE: backupEvidencePath },
      observedAt: new Date().toISOString()
    });
    const verifiedBackup = JSON.parse(
      readFileSync(join(root, 'verified-package', 'backup-restore.json'), 'utf8')
    );
    assert.equal(verifiedBackup.status, 'PASS');
    assert.equal(verifiedResult.index.status, 'BLOCKED');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
