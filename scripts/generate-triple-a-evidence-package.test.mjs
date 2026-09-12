import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import test from 'node:test';
import { join } from 'node:path';
import {
  generateTripleAEvidencePackage,
  PACKAGE_FILES
} from './generate-triple-a-evidence-package.mjs';

function writeValidExternalEvidence(
  root,
  name,
  commitSha,
  evidenceType = 'cvg-his-external-evidence'
) {
  const artifactName = `${name}.log`;
  const artifactPath = join(root, artifactName);
  const evidencePath = join(root, `${name}.json`);
  const observedAt = new Date().toISOString();
  const artifactContents = `evidence for ${name}\n`;
  writeFileSync(artifactPath, artifactContents);
  writeFileSync(
    evidencePath,
    JSON.stringify({
      schema_version: 1,
      evidence_type: evidenceType,
      status: 'PASS',
      commit_sha: commitSha,
      observed_at: observedAt,
      producer: { kind: 'test-runner', run_id: `run-${name}` },
      verification: {
        verified: true,
        method: 'test-verifier',
        verifier_id: 'test-verifier',
        verified_at: observedAt
      },
      artifacts: [
        {
          path: artifactName,
          sha256: `sha256:${createHash('sha256').update(artifactContents).digest('hex')}`
        }
      ]
    })
  );
  return evidencePath;
}

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

test('triple-a evidence package maps every required closure input and requires companions', () => {
  const root = mkdtempSync(join('/tmp', 'cvg-triple-a-required-inputs-'));
  const releaseDirectory = join(root, 'release');
  const outputDirectory = join(root, 'package');
  const commitSha = 'e'.repeat(40);
  const environment = {};
  const requiredInputs = {
    'rls-runtime.json': ['TRIPLE_A_RLS_RUNTIME_EVIDENCE'],
    'clinical-e2e.json': ['TRIPLE_A_CLINICAL_E2E_EVIDENCE', 'TRIPLE_A_AUDIT_EVIDENCE'],
    'workflow-reliability.json': [
      'TRIPLE_A_WORKFLOW_POSTGRES_EVIDENCE',
      'TRIPLE_A_WORKER_CRASH_EVIDENCE'
    ],
    'uat.json': ['TRIPLE_A_UAT_EVIDENCE'],
    'performance.json': ['TRIPLE_A_PERFORMANCE_EVIDENCE'],
    'soak.json': ['TRIPLE_A_SOAK_EVIDENCE'],
    'backup-restore.json': ['TRIPLE_A_BACKUP_EVIDENCE'],
    'deployment.json': ['TRIPLE_A_DEPLOY_EVIDENCE', 'TRIPLE_A_HELM_EVIDENCE'],
    'rollback.json': ['TRIPLE_A_ROLLBACK_EVIDENCE'],
    'attestations.json': ['TRIPLE_A_IMAGE_ATTESTATION_EVIDENCE']
  };

  try {
    mkdirSync(releaseDirectory, { recursive: true });
    for (const names of Object.values(requiredInputs)) {
      for (const name of names) {
        environment[name] = writeValidExternalEvidence(root, name, commitSha);
      }
    }

    const result = generateTripleAEvidencePackage({
      rootDir: root,
      outputDir: outputDirectory,
      releaseOutputDir: releaseDirectory,
      commitSha,
      environment,
      observedAt: new Date().toISOString()
    });

    for (const packageName of Object.keys(requiredInputs)) {
      const artifact = JSON.parse(readFileSync(join(outputDirectory, packageName), 'utf8'));
      assert.equal(artifact.status, 'PASS', packageName);
      assert.equal(artifact.evidence_refs.length, requiredInputs[packageName].length, packageName);
    }
    assert.equal(result.index.status, 'BLOCKED');

    const workflowWorkerPath = environment.TRIPLE_A_WORKER_CRASH_EVIDENCE;
    delete environment.TRIPLE_A_WORKER_CRASH_EVIDENCE;
    writeFileSync(
      join(releaseDirectory, 'worker-crash-evidence.json'),
      readFileSync(workflowWorkerPath)
    );
    const mixedSourceResult = generateTripleAEvidencePackage({
      rootDir: root,
      outputDir: join(root, 'mixed-package'),
      releaseOutputDir: releaseDirectory,
      commitSha,
      environment,
      observedAt: new Date().toISOString()
    });
    assert.equal(
      JSON.parse(readFileSync(join(root, 'mixed-package', 'workflow-reliability.json'), 'utf8'))
        .status,
      'PASS'
    );
    assert.equal(mixedSourceResult.index.status, 'BLOCKED');

    rmSync(join(releaseDirectory, 'worker-crash-evidence.json'));
    const missingCompanionResult = generateTripleAEvidencePackage({
      rootDir: root,
      outputDir: join(root, 'missing-companion-package'),
      releaseOutputDir: releaseDirectory,
      commitSha,
      environment,
      observedAt: new Date().toISOString()
    });
    assert.equal(
      JSON.parse(
        readFileSync(join(root, 'missing-companion-package', 'workflow-reliability.json'), 'utf8')
      ).status,
      'NOT_PROVEN'
    );
    assert.equal(missingCompanionResult.index.status, 'BLOCKED');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('triple-a evidence package does not fall back after an explicit malformed PASS source', () => {
  const root = mkdtempSync(join('/tmp', 'cvg-triple-a-explicit-source-'));
  const releaseDirectory = join(root, 'release');
  const outputDirectory = join(root, 'package');
  const commitSha = 'f'.repeat(40);
  const malformedPath = join(root, 'malformed-backup.json');
  try {
    mkdirSync(releaseDirectory, { recursive: true });
    const validFallback = writeValidExternalEvidence(root, 'valid-backup', commitSha);
    writeFileSync(
      join(releaseDirectory, 'backup-restore-evidence.json'),
      readFileSync(validFallback)
    );
    writeFileSync(
      malformedPath,
      JSON.stringify({
        status: 'PASS',
        commit_sha: commitSha,
        observed_at: new Date().toISOString()
      })
    );

    generateTripleAEvidencePackage({
      rootDir: root,
      outputDir: outputDirectory,
      releaseOutputDir: releaseDirectory,
      commitSha,
      environment: { TRIPLE_A_BACKUP_EVIDENCE: malformedPath },
      observedAt: new Date().toISOString()
    });

    const backup = JSON.parse(readFileSync(join(outputDirectory, 'backup-restore.json'), 'utf8'));
    assert.equal(backup.status, 'NOT_PROVEN');
    assert.match(backup.limitations.join(' '), /envelope verificável|Fonte declarou PASS/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
