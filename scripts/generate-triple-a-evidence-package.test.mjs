import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import test from 'node:test';
import { join, relative, sep } from 'node:path';
import {
  generateTripleAEvidencePackage,
  PACKAGE_FILES
} from './generate-triple-a-evidence-package.mjs';
import {
  OPERATIONAL_EVIDENCE_POLICY,
  OPERATIONAL_EVIDENCE_REQUIREMENTS,
  validateOperationalEvidenceEnvelope
} from './run-triple-a-release-gate.mjs';

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

function writeOperationalEvidence(root, name, commitSha, evidenceId = 'SOAK', options = {}) {
  const artifactName = `${name}-raw.txt`;
  writeFileSync(join(root, artifactName), `raw measurement input for ${evidenceId}\n`);
  const observedAt = new Date().toISOString();
  const dimensions = options.dimensions
    ?? OPERATIONAL_EVIDENCE_REQUIREMENTS[evidenceId].dimensions.map((id) => ({
      id,
      status: 'PASS',
      artifact: artifactName,
      measurements: Object.entries(OPERATIONAL_EVIDENCE_POLICY[evidenceId].dimensions[id].measurements)
        .map(([measurementName, measurement]) => ({
          name: measurementName,
          value: 1,
          unit: measurement.unit
        }))
    }));
  const evidencePath = join(root, `${name}.json`);
  writeFileSync(
    evidencePath,
    JSON.stringify({
      schema_version: 3,
      evidence_type: 'cvg-his-operational-evidence',
      status: 'PASS',
      commit_sha: commitSha,
      observed_at: observedAt,
      target: { environment: 'isolated-test-target', reference: `run://${name}` },
      producer: {
        kind: 'github-actions-workflow',
        run_id: `run-${name}`,
        workflow: '.github/workflows/release-artifacts.yml'
      },
      verification: {
        verified: true,
        method: 'github-artifact-attestation',
        verifier_id: 'gh-attestation-verify',
        verified_at: observedAt
      },
      artifacts: [
        {
          path: artifactName,
          sha256: `sha256:${createHash('sha256').update(`raw measurement input for ${evidenceId}\n`).digest('hex')}`
        }
      ],
      results: { outcome: 'PASS', dimensions }
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
    assert.equal(ciEvidence.status, 'FAIL');
    assert.equal(backupEvidence.status, 'FAIL');
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
    // A generic external envelope is not an acceptable family envelope: fail
    // closed instead of claiming a verified PASS or a merely pending family.
    assert.equal(verifiedBackup.status, 'FAIL');
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
    'observability.json': ['TRIPLE_A_OBSERVABILITY_EVIDENCE'],
    'performance.json': ['TRIPLE_A_PERFORMANCE_EVIDENCE'],
    'soak.json': ['TRIPLE_A_SOAK_EVIDENCE'],
    'backup-restore.json': ['TRIPLE_A_BACKUP_EVIDENCE'],
    'deployment.json': ['TRIPLE_A_DEPLOY_EVIDENCE', 'TRIPLE_A_HELM_EVIDENCE'],
    'rollback.json': ['TRIPLE_A_ROLLBACK_EVIDENCE'],
    'attestations.json': ['TRIPLE_A_IMAGE_ATTESTATION_EVIDENCE']
  };
  const expectedStatus = {
    'rls-runtime.json': 'FAIL',
    'clinical-e2e.json': 'FAIL',
    'workflow-reliability.json': 'FAIL',
    'uat.json': 'FAIL',
    'observability.json': 'FAIL',
    'performance.json': 'FAIL',
    'soak.json': 'FAIL',
    'backup-restore.json': 'FAIL',
    'deployment.json': 'FAIL',
    'rollback.json': 'FAIL',
    'attestations.json': 'PARTIAL'
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
      assert.notEqual(artifact.status, 'PASS', `${packageName} must not claim verified PASS`);
      assert.equal(artifact.status, expectedStatus[packageName], packageName);
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
      'FAIL'
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
      'FAIL'
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
    assert.equal(backup.status, 'FAIL');
    assert.match(
      backup.limitations.join(' '),
      /envelope verificável|Fonte declarou PASS|Envelope externo inválido/
    );
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('known-bad: a well-formed v1 operational envelope is not a verified package member', () => {
  const root = mkdtempSync(join('/tmp', 'cvg-triple-a-v1-operational-'));
  const releaseDirectory = join(root, 'release');
  const outputDirectory = join(root, 'package');
  const commitSha = '1'.repeat(40);
  try {
    mkdirSync(releaseDirectory, { recursive: true });
    const soakV1 = writeValidExternalEvidence(root, 'soak-v1', commitSha);
    const result = generateTripleAEvidencePackage({
      rootDir: root,
      outputDir: outputDirectory,
      releaseOutputDir: releaseDirectory,
      commitSha,
      environment: { TRIPLE_A_SOAK_EVIDENCE: soakV1 },
      observedAt: new Date().toISOString()
    });

    const soak = JSON.parse(readFileSync(join(outputDirectory, 'soak.json'), 'utf8'));
    assert.notEqual(soak.status, 'PASS');
    assert.equal(soak.status, 'FAIL');
    assert.equal(soak.declared_status, 'PASS');
    assert.equal(soak.verified_status, 'FAIL');
    assert.match(soak.limitations.join(' '), /canônica/);
    assert.equal(result.index.status, 'BLOCKED');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('coherence: package member status matches the canonical gate evaluation of the same bytes', () => {
  const root = mkdtempSync(join('/tmp', 'cvg-triple-a-coherence-'));
  const releaseDirectory = join(root, 'release');
  const outputDirectory = join(root, 'package');
  const commitSha = '2'.repeat(40);
  const previousRepository = process.env.GITHUB_REPOSITORY;
  const previousGhToken = process.env.GH_TOKEN;
  const previousGithubToken = process.env.GITHUB_TOKEN;
  delete process.env.GITHUB_REPOSITORY;
  delete process.env.GH_TOKEN;
  delete process.env.GITHUB_TOKEN;
  try {
    mkdirSync(releaseDirectory, { recursive: true });
    const soakPath = writeOperationalEvidence(root, 'soak-canonical', commitSha);
    const bytes = readFileSync(soakPath);
    const canonical = validateOperationalEvidenceEnvelope({
      rootDir: root,
      value: relative(root, soakPath).split(sep).join('/'),
      artifact: JSON.parse(bytes.toString('utf8')),
      commitSha,
      evidenceId: 'SOAK',
      envelopeSha256: createHash('sha256').update(bytes).digest('hex')
    });

    const result = generateTripleAEvidencePackage({
      rootDir: root,
      outputDir: outputDirectory,
      releaseOutputDir: releaseDirectory,
      commitSha,
      environment: { TRIPLE_A_SOAK_EVIDENCE: soakPath },
      observedAt: new Date().toISOString()
    });

    const soak = JSON.parse(readFileSync(join(outputDirectory, 'soak.json'), 'utf8'));
    // Production policy is PENDING_AUTHORITY and there is no trusted verifier in
    // this environment, so both engines must agree on a blocking status.
    assert.equal(canonical.status, 'PARTIAL');
    assert.equal(soak.status, canonical.status);
    assert.notEqual(soak.status, 'PASS');
    assert.equal(soak.declared_status, 'PASS');
    assert.equal(soak.verified_status, canonical.status);
    assert.deepEqual(soak.verification_layers, canonical.layers);
    assert.equal(result.index.status, 'BLOCKED');
  } finally {
    if (previousRepository === undefined) delete process.env.GITHUB_REPOSITORY;
    else process.env.GITHUB_REPOSITORY = previousRepository;
    if (previousGhToken === undefined) delete process.env.GH_TOKEN;
    else process.env.GH_TOKEN = previousGhToken;
    if (previousGithubToken === undefined) delete process.env.GITHUB_TOKEN;
    else process.env.GITHUB_TOKEN = previousGithubToken;
    rmSync(root, { recursive: true, force: true });
  }
});

test('known-bad: duplicate dimensions and unbounded approved policy never appear as verified PASS members (MA-03-R3)', () => {
  const root = mkdtempSync(join('/tmp', 'cvg-triple-a-r3-negatives-'));
  const releaseDirectory = join(root, 'release');
  const outputDirectory = join(root, 'package');
  const outputWithoutBounds = join(root, 'package-no-bounds');
  const commitSha = '4'.repeat(40);
  const previousRepository = process.env.GITHUB_REPOSITORY;
  const previousGhToken = process.env.GH_TOKEN;
  const previousGithubToken = process.env.GITHUB_TOKEN;
  delete process.env.GITHUB_REPOSITORY;
  delete process.env.GH_TOKEN;
  delete process.env.GITHUB_TOKEN;
  try {
    mkdirSync(releaseDirectory, { recursive: true });

    // R2-F1: duplicate dimension IDs must be structurally rejected by the
    // canonical evaluation, so the package member is not a verified PASS.
    const baseDimensions = OPERATIONAL_EVIDENCE_REQUIREMENTS.SOAK.dimensions.map((id) => ({
      id,
      status: 'PASS',
      artifact: 'soak-duplicate-raw.txt',
      measurements: Object.entries(OPERATIONAL_EVIDENCE_POLICY.SOAK.dimensions[id].measurements)
        .map(([measurementName, measurement]) => ({
          name: measurementName,
          value: 1,
          unit: measurement.unit
        }))
    }));
    const duplicatePath = writeOperationalEvidence(root, 'soak-duplicate', commitSha, 'SOAK', {
      dimensions: [...baseDimensions, structuredClone(baseDimensions[0])]
    });
    const duplicateResult = generateTripleAEvidencePackage({
      rootDir: root,
      outputDir: outputDirectory,
      releaseOutputDir: releaseDirectory,
      commitSha,
      environment: { TRIPLE_A_SOAK_EVIDENCE: duplicatePath },
      observedAt: new Date().toISOString()
    });
    const duplicateMember = JSON.parse(readFileSync(join(outputDirectory, 'soak.json'), 'utf8'));
    assert.equal(duplicateMember.declared_status, 'PASS');
    assert.equal(duplicateMember.verified_status, 'FAIL');
    assert.notEqual(duplicateMember.verified_status, 'PASS');
    assert.equal(duplicateResult.index.status, 'BLOCKED');

    // R2-F2: an approved policy without any finite bound fails canonically; the
    // package member, evaluated under the production PENDING policy, still must
    // not claim a verified PASS.
    const noBoundsPath = writeOperationalEvidence(root, 'soak-no-bounds', commitSha);
    const bytes = readFileSync(noBoundsPath);
    const approvedWithoutBounds = structuredClone(OPERATIONAL_EVIDENCE_POLICY);
    approvedWithoutBounds.SOAK.approval = {
      status: 'APPROVED',
      decided_by: 'test-authority',
      decided_at: '2026-09-12T00:00:00.000Z',
      reference: 'test-fixture'
    };
    approvedWithoutBounds.SOAK.expected_targets = ['isolated-test-target'];
    const canonical = validateOperationalEvidenceEnvelope({
      rootDir: root,
      value: relative(root, noBoundsPath).split(sep).join('/'),
      artifact: JSON.parse(bytes.toString('utf8')),
      commitSha,
      evidenceId: 'SOAK',
      envelopeSha256: createHash('sha256').update(bytes).digest('hex'),
      operationalPolicy: approvedWithoutBounds,
      verifyOperationalEvidence: (input) => ({
        status: 'PASS',
        subject_sha256: input.envelopeSha256,
        workflow: input.declaredWorkflow,
        provenance: 'I1-SYNTHETIC'
      })
    });
    assert.equal(canonical.status, 'FAIL');
    assert.match(canonical.reason, /sem limite numérico finito/);

    const noBoundsResult = generateTripleAEvidencePackage({
      rootDir: root,
      outputDir: outputWithoutBounds,
      releaseOutputDir: releaseDirectory,
      commitSha,
      environment: { TRIPLE_A_SOAK_EVIDENCE: noBoundsPath },
      observedAt: new Date().toISOString()
    });
    const noBoundsMember = JSON.parse(readFileSync(join(outputWithoutBounds, 'soak.json'), 'utf8'));
    assert.equal(noBoundsMember.declared_status, 'PASS');
    assert.notEqual(noBoundsMember.verified_status, 'PASS');
    assert.equal(noBoundsResult.index.status, 'BLOCKED');
  } finally {
    if (previousRepository === undefined) delete process.env.GITHUB_REPOSITORY;
    else process.env.GITHUB_REPOSITORY = previousRepository;
    if (previousGhToken === undefined) delete process.env.GH_TOKEN;
    else process.env.GH_TOKEN = previousGhToken;
    if (previousGithubToken === undefined) delete process.env.GITHUB_TOKEN;
    else process.env.GITHUB_TOKEN = previousGithubToken;
    rmSync(root, { recursive: true, force: true });
  }
});
