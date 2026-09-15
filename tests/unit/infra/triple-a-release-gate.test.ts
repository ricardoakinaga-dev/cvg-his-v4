import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import {
  scoreCriteria,
  buildReleaseEvidence,
  evaluateQualityBar,
  parseAttestationVerificationOutput,
  validateCiEvidenceEnvelope,
  validateExternalEvidenceEnvelope,
  validateOperationalEvidenceEnvelope,
  verifyOperationalEvidenceAttestation,
  verifyPublishedImageAttestations,
  verifyCleanWorktree,
  verifyReleaseManifest,
  verifySecurityEvidence,
  validateEvidenceFreshness,
  OPERATIONAL_EVIDENCE_POLICY,
  OPERATIONAL_EVIDENCE_REQUIREMENTS,
  TRUSTED_OPERATIONAL_SIGNER_WORKFLOWS
} from '../../../scripts/run-triple-a-release-gate.mjs';

const repoRoot = process.cwd();
const canonicalArtifactPath = join(repoRoot, 'artifacts', 'triple-a', 'TRIPLE_A_RELEASE_EVIDENCE.json');

function sha256Buffer(buffer: Buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function sha256File(path: string) {
  return sha256Buffer(readFileSync(path));
}

function snapshotCanonicalArtifact() {
  return {
    exists: existsSync(canonicalArtifactPath),
    sha256: existsSync(canonicalArtifactPath) ? sha256File(canonicalArtifactPath) : null
  };
}

let canonicalArtifactBefore = snapshotCanonicalArtifact();
let savedTripleAEnv = new Map<string, string | undefined>();
let tripleAEnvBeforeSuite = new Map<string, string | undefined>();
const isolatedDirs: string[] = [];

// Hermetic isolation: every test starts from a clean TRIPLE_A_* environment
// whose output and final-artifact directories are private temp dirs. Hooks run
// even when a test body fails, so a failing assertion cannot leak into shared
// output paths or leave environment overrides behind.
beforeAll(() => {
  canonicalArtifactBefore = snapshotCanonicalArtifact();
  tripleAEnvBeforeSuite = new Map();
  for (const key of Object.keys(process.env)) {
    if (key.startsWith('TRIPLE_A_')) tripleAEnvBeforeSuite.set(key, process.env[key]);
  }
});

beforeEach(() => {
  savedTripleAEnv = new Map();
  for (const key of Object.keys(process.env)) {
    if (key.startsWith('TRIPLE_A_')) {
      savedTripleAEnv.set(key, process.env[key]);
      delete process.env[key];
    }
  }
  const releaseDir = mkdtempSync(join(tmpdir(), 'cvg-triple-a-release-'));
  const finalDir = mkdtempSync(join(tmpdir(), 'cvg-triple-a-final-'));
  isolatedDirs.push(releaseDir, finalDir);
  process.env.TRIPLE_A_RELEASE_OUTPUT_DIR = releaseDir;
  process.env.TRIPLE_A_FINAL_ARTIFACT_DIR = finalDir;
});

afterEach(() => {
  // Remove every TRIPLE_A_* key, including keys created inside the test that
  // were not present when the hook started, then restore the saved values.
  for (const key of Object.keys(process.env)) {
    if (key.startsWith('TRIPLE_A_')) delete process.env[key];
  }
  for (const [key, value] of savedTripleAEnv) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  savedTripleAEnv.clear();
  for (const dir of isolatedDirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

afterAll(() => {
  // Regression: running this suite must never modify or create the repository
  // canonical artifact. The comparison holds both when the artifact pre-exists
  // (byte-identical) and when it is absent (still absent).
  expect(snapshotCanonicalArtifact()).toEqual(canonicalArtifactBefore);
  // Regression: the suite must leave the process environment exactly as it
  // found it, with no TRIPLE_A_* override surviving the run.
  const tripleAEnvAfterSuite = new Map<string, string | undefined>();
  for (const key of Object.keys(process.env)) {
    if (key.startsWith('TRIPLE_A_')) tripleAEnvAfterSuite.set(key, process.env[key]);
  }
  expect(tripleAEnvAfterSuite).toEqual(tripleAEnvBeforeSuite);
});

function isolatedOutputDir() {
  const dir = mkdtempSync(join(tmpdir(), 'cvg-triple-a-output-'));
  isolatedDirs.push(dir);
  return dir;
}

function createSyntheticRoot() {
  const root = mkdtempSync(join(tmpdir(), 'cvg-triple-a-root-'));
  isolatedDirs.push(root);
  mkdirSync(join(root, 'docs', 'triple-a'), { recursive: true });
  copyFileSync(
    join(repoRoot, 'docs', 'triple-a', 'QUALITY_BAR_V1.json'),
    join(root, 'docs', 'triple-a', 'QUALITY_BAR_V1.json')
  );
  return root;
}

function writePayload(root: string, relativePath: string, contents: string) {
  const absolute = join(root, relativePath);
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, contents);
  return {
    relativePath: relativePath.split('\\').join('/'),
    digest: `sha256:${sha256Buffer(Buffer.from(contents))}`
  };
}

type OperationalId = keyof typeof OPERATIONAL_EVIDENCE_REQUIREMENTS;

function defaultDimensions(root: string, evidenceId: OperationalId, payloadRelativePath: string) {
  return Object.entries(OPERATIONAL_EVIDENCE_POLICY[evidenceId].dimensions).map(([id, spec]) => ({
    id,
    status: 'PASS',
    artifact: payloadRelativePath,
    measurements: Object.entries(spec.measurements).map(([name, measurement]) => ({
      name,
      value: 1,
      unit: measurement.unit
    }))
  }));
}

function writeOperationalEnvelope(
  root: string,
  name: string,
  options: {
    evidenceId: OperationalId;
    commitSha: string;
    workflow?: string;
    producer?: Record<string, unknown>;
    verification?: Record<string, unknown> | null;
    target?: unknown;
    dimensions?: Array<Record<string, unknown>>;
    schemaVersion?: number;
    evidenceType?: string;
    observedAt?: string;
    verifiedAt?: string;
    payload?: string;
    declaredDigest?: string;
    artifactPath?: string;
  }
) {
  const directory = join(root, 'evidence', name);
  mkdirSync(directory, { recursive: true });
  const payload = options.payload
    ?? `${JSON.stringify({ fixture: 'SYNTHETIC-GATE-FIXTURE', name, evidenceId: options.evidenceId })}\n`;
  const payloadLocation = options.artifactPath ?? `evidence/${name}/${name}-payload.json`;
  const written = writePayload(root, payloadLocation, payload);
  const declaredArtifact = options.artifactPath ?? written.relativePath;
  const envelope: Record<string, unknown> = {
    schema_version: options.schemaVersion ?? 3,
    evidence_type: options.evidenceType ?? 'cvg-his-operational-evidence',
    commit_sha: options.commitSha,
    status: 'PASS',
    observed_at: options.observedAt ?? new Date().toISOString(),
    target: options.target ?? { environment: 'approved-target', reference: `run://${name}` },
    producer: options.producer ?? {
      kind: 'github-actions-workflow',
      run_id: `run-${name}`,
      workflow: options.workflow ?? TRUSTED_OPERATIONAL_SIGNER_WORKFLOWS[0]
    },
    verification: options.verification === null
      ? undefined
      : options.verification
        ?? {
          verified: true,
          method: 'github-artifact-attestation',
          verifier_id: 'gh-attestation-verify',
          verified_at: options.verifiedAt ?? new Date().toISOString()
        },
    artifacts: [{
      path: declaredArtifact,
      sha256: options.declaredDigest ?? written.digest
    }],
    results: {
      outcome: 'PASS',
      dimensions: options.dimensions
        ?? defaultDimensions(root, options.evidenceId, written.relativePath)
    }
  };
  if (options.verification === null) delete envelope.verification;
  const envelopePath = join(directory, `${name}-evidence.json`);
  writeFileSync(envelopePath, `${JSON.stringify(envelope, null, 2)}\n`);
  return envelopePath;
}

const passingVerifier = (input: {
  declaredWorkflow: string;
  envelopeSha256: string;
}) => ({
  status: 'PASS',
  workflow: input.declaredWorkflow,
  provenance: 'test-simulated-verifier',
  subject_sha256: input.envelopeSha256,
  reason: 'Simulated isolated attestation verifier; not real homologation.'
});

const digestMismatchVerifier = (input: {
  declaredWorkflow: string;
  envelopeSha256: string;
}) => ({
  ...passingVerifier(input),
  subject_sha256: 'f'.repeat(64)
});

const unavailableVerifier = () => ({
  status: 'PARTIAL',
  reason: 'simulated verifier unavailable; PASS must remain blocked.'
});

const rejectingVerifier = () => ({
  status: 'FAIL',
  reason: 'simulated verifier rejected the attestation.'
});

const invalidOutputVerifier = () => ({
  status: 'UNKNOWN',
  reason: 'simulated verifier output without a recognized status.'
});

function approvedTestPolicy(rules: Record<string, Record<string, Record<string, { min?: number | null; max?: number | null }>>> = {}) {
  const policy = structuredClone(OPERATIONAL_EVIDENCE_POLICY);
  for (const [evidenceId, entry] of Object.entries(policy)) {
    entry.approval = {
      status: 'APPROVED',
      decided_by: 'test-authority',
      decided_at: '2026-09-12T00:00:00.000Z',
      reference: 'test-fixture'
    };
    entry.expected_targets = ['approved-target'];
    for (const [dimensionId, dimension] of Object.entries(entry.dimensions)) {
      for (const [name, measurement] of Object.entries(dimension.measurements)) {
        measurement.min = 0;
        measurement.max = null;
        const override = rules[evidenceId]?.[dimensionId]?.[name];
        if (override) Object.assign(measurement, override);
      }
    }
  }
  return policy;
}

function buildSynthetic(options: {
  root?: string;
  commitSha?: string;
  verifyOperationalEvidence?: (input: {
    rootDir: string;
    envelopePath: string;
    envelopeSha256: string;
    evidenceId: string;
    commitSha: string;
    declaredWorkflow: string;
  }) => { status: string; workflow?: string; provenance?: string; subject_sha256?: string; reason?: string };
  operationalPolicy?: Record<string, unknown>;
  outputDir?: string;
} = {}) {
  const root = options.root ?? createSyntheticRoot();
  const outputDir = options.outputDir ?? isolatedOutputDir();
  return {
    root,
    outputDir,
    result: buildReleaseEvidence({
      rootDir: root,
      outputDir,
      commitSha: options.commitSha ?? 'a'.repeat(40),
      strict: true,
      executeChecks: false,
      executeBuild: false,
      executeTests: false,
      ...(options.verifyOperationalEvidence ? { verifyOperationalEvidence: options.verifyOperationalEvidence } : {}),
      ...(options.operationalPolicy ? { operationalPolicy: options.operationalPolicy as never } : {})
    })
  };
}

function statusMap(evidence: Record<string, unknown>, key: 'criteria' | 'quality_bar_assessment') {
  const source = key === 'criteria'
    ? (evidence.criteria as Array<{ id: string; status: string }>)
    : (evidence.quality_bar_assessment as { criteria: Array<{ id: string; status: string }> }).criteria;
  return new Map(source.map((criterion) => [criterion.id, criterion]));
}

function checkFor(evidence: Record<string, unknown>, envName: string) {
  const checks = evidence.checks as Array<{ command: string; evidence: string; layers?: Record<string, string> }>;
  return checks.find((check) => check.command === envName);
}

describe('Triple-A release gate scoring', () => {
  it('runs every test with private Triple-A output directories', () => {
    expect(process.env.TRIPLE_A_RELEASE_OUTPUT_DIR).toContain(tmpdir());
    expect(process.env.TRIPLE_A_FINAL_ARTIFACT_DIR).toContain(tmpdir());
  });

  it('rejects stale evidence and timestamps beyond the allowed clock skew', () => {
    const now = new Date('2026-09-11T12:00:00.000Z');
    expect(validateEvidenceFreshness({
      observedAt: '2026-09-04T11:59:59.000Z',
      now,
      maxAgeHours: 168,
    }).valid).toBe(false);
    expect(validateEvidenceFreshness({
      observedAt: '2026-09-11T12:06:00.000Z',
      now,
      maxAgeHours: 168,
    }).valid).toBe(false);
  });

  it('accepts current evidence within the configured clock and age bounds', () => {
    const result = validateEvidenceFreshness({
      observedAt: '2026-09-11T11:59:00.000Z',
      now: new Date('2026-09-11T12:00:00.000Z'),
      maxAgeHours: 168,
    });
    expect(result.valid).toBe(true);
    expect(result.max_age_hours).toBe(168);
  });

  it('writes the final artifact only into the isolated directories of the test', () => {
    const root = createSyntheticRoot();
    const outputDir = isolatedOutputDir();
    const canonicalUnderRoot = join(root, 'artifacts', 'triple-a', 'TRIPLE_A_RELEASE_EVIDENCE.json');

    expect(existsSync(canonicalUnderRoot)).toBe(false);
    buildReleaseEvidence({
      rootDir: root,
      outputDir,
      commitSha: 'a'.repeat(40),
      strict: true,
      executeChecks: false,
      executeBuild: false,
      executeTests: false,
    });

    // No canonical artifact is created under a root that had none: the test
    // sandbox redirects TRIPLE_A_FINAL_ARTIFACT_DIR to a private temp dir.
    expect(existsSync(canonicalUnderRoot)).toBe(false);
    expect(existsSync(join(process.env.TRIPLE_A_FINAL_ARTIFACT_DIR as string, 'TRIPLE_A_RELEASE_EVIDENCE.json'))).toBe(true);
    expect(existsSync(join(outputDir, 'TRIPLE_A_RELEASE_EVIDENCE.json'))).toBe(true);
  });

  it('a test that fails after building still leaves shared outputs untouched', () => {
    const root = createSyntheticRoot();
    const outputDir = isolatedOutputDir();
    expect(() => {
      buildReleaseEvidence({
        rootDir: root,
        outputDir,
        commitSha: 'a'.repeat(40),
        strict: true,
        executeChecks: false,
        executeBuild: false,
        executeTests: false,
      });
      throw new Error('simulated assertion failure');
    }).toThrow('simulated assertion failure');
    expect(existsSync(join(root, 'artifacts', 'triple-a', 'TRIPLE_A_RELEASE_EVIDENCE.json'))).toBe(false);
  });

  it('fails closed: a blocked strict decision cannot publish or claim Triple-A', () => {
    const root = createSyntheticRoot();
    const { result } = buildSynthetic({ root });

    expect(result.evidence.decision).not.toBe('PASS');
    expect(result.evidence.claim).toBe('NOT PROVEN');
    expect(result.evidence.publication_allowed).toBe(false);
  });

  it('evaluates frozen quality-bar criteria from current evidence instead of copying frozen statuses', () => {
    const result = evaluateQualityBar({
      rootDir: repoRoot,
      qualityBar: {
        quality_bar_id: 'fixture-quality-bar',
        criteria: [
          { id: 'BASE-001', area: 'baseline', priority: 'P0', description: 'prompt', status: 'NOT_EVALUATED' },
          { id: 'MAIN-001', area: 'main', priority: 'P0', description: 'main', status: 'NOT_EVALUATED' },
        ]
      },
      criteria: [
        { id: 'PROMPT-HASH', area: 'Baseline', priority: 'P0', status: 'PASS', evidence_refs: ['prompt'] },
        { id: 'EXTERNAL-PROMPT-HASH', area: 'Baseline', priority: 'P0', status: 'PASS', evidence_refs: ['external'] },
        { id: 'CI-REMOTE', area: 'CI', priority: 'P0', status: 'NOT_RUN', evidence_refs: [] },
      ]
    });

    expect(result.criteria[0].frozen_status).toBe('NOT_EVALUATED');
    expect(result.criteria[0].status).toBe('PASS');
    expect(result.criteria[1].status).toBe('NOT_RUN');
    expect(result.open_p0).toBe(1);
  });

  it('keeps critical score separate and counts every open P0', () => {
    const result = scoreCriteria([
      { id: 'p0-pass', priority: 'P0', status: 'PASS' },
      { id: 'p0-partial', priority: 'P0', status: 'PARTIAL' },
      { id: 'p1-pass', priority: 'P1', status: 'PASS' },
      { id: 'p1-missing', priority: 'P1', status: 'NOT_RUN' }
    ]);

    expect(result.score).toBe(63);
    expect(result.critical_score).toBe(75);
    expect(result.open_p0).toBe(1);
  });

  it('does not award score to missing or failed evidence', () => {
    const result = scoreCriteria([
      { id: 'p0-fail', priority: 'P0', status: 'FAIL' },
      { id: 'p1-missing', priority: 'P1', status: 'NOT_RUN' }
    ]);

    expect(result.score).toBe(0);
    expect(result.critical_score).toBe(0);
    expect(result.open_p0).toBe(1);
  });

  it('excludes explicitly non-applicable prepublication criteria from scoring', () => {
    const evaluation = evaluateQualityBar({
      rootDir: repoRoot,
      phase: 'prepublication',
      qualityBar: {
        quality_bar_id: 'fixture-quality-bar',
        criteria: [
          { id: 'MAIN-002', area: 'main', priority: 'P0', description: 'branch', status: 'NOT_EVALUATED' },
          { id: 'FINAL-001', area: 'certification', priority: 'P0', description: 'final', status: 'NOT_EVALUATED' },
        ]
      },
      criteria: []
    });
    const statuses = new Map(evaluation.criteria.map((item) => [item.id, item.status]));

    expect(evaluation.phase).toBe('prepublication');
    expect(statuses.get('MAIN-002')).toBe('NOT_APPLICABLE');
    expect(statuses.get('FINAL-001')).toBe('NOT_APPLICABLE');
    expect(evaluation.open_p0).toBe(0);
    expect(scoreCriteria([
      { id: 'applicable', priority: 'P0', status: 'PASS' },
      { id: 'prepublication-only', priority: 'P0', status: 'NOT_APPLICABLE' },
    ])).toEqual({ score: 100, critical_score: 100, open_p0: 0 });
  });

  it('reports a bounded first dirty path without expanding untracked directories', () => {
    const root = mkdtempSync(join(tmpdir(), 'cvg-triple-a-gate-'));
    isolatedDirs.push(root);
    execFileSync('git', ['init', '--quiet', root]);
    writeFileSync(join(root, 'generated-evidence.json'), '{"generated":true}\n');

    const result = verifyCleanWorktree(root);

    expect(result.status).toBe('FAIL');
    expect(result.evidence).toContain('generated-evidence.json');
    expect(result.command).toContain('--untracked-files=normal');
  });

  it('rejects self-authored JSON that lacks an independently verifiable envelope', () => {
    const result = validateExternalEvidenceEnvelope({
      rootDir: repoRoot,
      value: 'fixture.json',
      commitSha: 'a'.repeat(40),
      artifact: { commit_sha: 'a'.repeat(40), status: 'PASS' }
    });

    expect(result.status).toBe('FAIL');
  });

  it('validates envelope metadata and every referenced artifact digest', () => {
    const root = createSyntheticRoot();
    const written = writePayload(root, 'result.json', '{"result":"PASS"}\n');
    const commitSha = 'b'.repeat(40);

    const result = validateExternalEvidenceEnvelope({
      rootDir: root,
      value: 'envelope.json',
      commitSha,
      artifact: {
        schema_version: 1,
        evidence_type: 'cvg-his-external-evidence',
        commit_sha: commitSha,
        status: 'PASS',
        observed_at: new Date().toISOString(),
        producer: { kind: 'github-actions', run_id: '12345' },
        verification: {
          verified: true,
          method: 'github-workflow-run',
          verifier_id: 'release-assurance',
          verified_at: new Date().toISOString()
        },
        artifacts: [{ path: written.relativePath, sha256: written.digest }]
      }
    });

    expect(result.status).toBe('PASS');
  });

  it('rejects referenced artifacts that are empty or changed after declaration', () => {
    const root = createSyntheticRoot();
    const commitSha = 'b'.repeat(40);
    const empty = writePayload(root, 'empty.json', '');
    const changed = writePayload(root, 'changed.json', 'original\n');
    writeFileSync(join(root, 'changed.json'), 'tampered\n');
    const base = {
      schema_version: 1,
      evidence_type: 'cvg-his-external-evidence',
      commit_sha: commitSha,
      status: 'PASS',
      observed_at: new Date().toISOString(),
      producer: { kind: 'github-actions', run_id: '12345' },
      verification: {
        verified: true,
        method: 'github-workflow-run',
        verifier_id: 'release-assurance',
        verified_at: new Date().toISOString()
      }
    };

    const emptyResult = validateExternalEvidenceEnvelope({
      rootDir: root,
      value: 'empty-envelope.json',
      commitSha,
      artifact: { ...base, artifacts: [{ path: empty.relativePath, sha256: empty.digest }] }
    });
    const changedResult = validateExternalEvidenceEnvelope({
      rootDir: root,
      value: 'changed-envelope.json',
      commitSha,
      artifact: { ...base, artifacts: [{ path: changed.relativePath, sha256: changed.digest }] }
    });

    expect(emptyResult.status).toBe('FAIL');
    expect(emptyResult.reason).toContain('vazio');
    expect(changedResult.status).toBe('FAIL');
    expect(changedResult.reason).toContain('Digest');
  });

  it('does not accept a CI envelope with an incomplete required-job set', () => {
    const root = createSyntheticRoot();
    const written = writePayload(root, 'ci-input.txt', 'ci evidence input\n');
    const commitSha = 'f'.repeat(40);
    const jobs = [
      'Secret Scan',
      'Dependency Audit (CVE Scan)',
      'SAST (Semgrep)',
      'Typecheck',
      'Coverage',
      'Validate OpenAPI',
      'Lint',
      'Repository Guards',
      'Build',
      'E2E Tests (SPA)',
      'API Contract Tests',
      'Performance (k6 SLOs)',
      'Integration Tests',
      'Critical Process Runner (Windows contract)',
      'Unit Tests'
    ].map((name) => ({ name, status: 'completed', conclusion: 'success' }));
    const result = validateCiEvidenceEnvelope({
      rootDir: root,
      value: 'ci-evidence.json',
      commitSha,
      artifact: {
        schema_version: 1,
        evidence_type: 'cvg-his-ci-evidence',
        commit_sha: commitSha,
        status: 'PASS',
        observed_at: new Date().toISOString(),
        producer: { kind: 'github-actions-workflow-run', run_id: '12345' },
        verification: {
          verified: true,
          method: 'github-api-workflow-run',
          verifier_id: 'release-ci-run-verifier',
          verified_at: new Date().toISOString()
        },
        run: {
          id: 12345,
          name: 'CI',
          event: 'push',
          head_branch: 'main',
          head_sha: commitSha,
          status: 'completed',
          conclusion: 'success'
        },
        jobs,
        artifacts: [{ path: written.relativePath, sha256: written.digest }]
      }
    });

    expect(result.status).toBe('FAIL');
    expect(result.reason).toContain('Visual Regression');
  });

  it('does not treat an image envelope as attestation proof without gh verification', () => {
    const result = verifyPublishedImageAttestations({
      rootDir: repoRoot,
      outputDir: isolatedOutputDir(),
      commitSha: 'c'.repeat(40)
    });

    expect(result.status).toBe('PARTIAL');
  });

  it('fails release identity when the referenced SBOM is not valid CycloneDX', () => {
    const root = createSyntheticRoot();
    const outputDir = join(root, 'artifacts', 'release');
    mkdirSync(outputDir, { recursive: true });
    const sbomContent = '{}\n';
    writeFileSync(join(outputDir, 'sbom.cyclonedx.json'), sbomContent);
    const digest = `sha256:${'a'.repeat(64)}`;
    writeFileSync(
      join(outputDir, 'release-manifest.json'),
      JSON.stringify({
        commit_sha: 'd'.repeat(40),
        images: ['api', 'worker', 'spa'].map((component) => ({
          component,
          digest,
          immutable_reference: `ghcr.io/example/cvg-his-v4-${component}@${digest}`
        })),
        files: [
          {
            path: 'artifacts/release/sbom.cyclonedx.json',
            sha256: createHash('sha256').update(sbomContent).digest('hex')
          }
        ],
        sbom: 'artifacts/release/sbom.cyclonedx.json'
      })
    );

    const result = verifyReleaseManifest({ rootDir: root, outputDir, commitSha: 'd'.repeat(40) });

    expect(result.status).toBe('FAIL');
    expect(result.evidence).toContain('CycloneDX');
  });

  it('requires security evidence to point at a valid CycloneDX SBOM with matching component count', () => {
    const root = createSyntheticRoot();
    const outputDir = join(root, 'artifacts', 'security');
    mkdirSync(outputDir, { recursive: true });
    const sbom = {
      bomFormat: 'CycloneDX',
      specVersion: '1.5',
      serialNumber: 'urn:uuid:test',
      version: 1,
      metadata: { component: { type: 'application', name: 'cvg-his-v4' } },
      components: [
        { type: 'library', name: 'example', version: '1.0.0', 'bom-ref': 'example@1.0.0' }
      ]
    };
    const sbomContent = `${JSON.stringify(sbom)}\n`;
    writeFileSync(join(outputDir, 'sbom.cyclonedx.json'), sbomContent);
    const generatedAt = new Date().toISOString();
    writeFileSync(
      join(outputDir, 'security-evidence.json'),
      JSON.stringify({
        schema_version: 1,
        evidence_type: 'cvg-his-security-evidence',
        generatedAt,
        status: 'PASS',
        securityAudit: 'PASS',
        commit_sha: 'e'.repeat(40),
        semgrepCi: [{ status: 'PASS' }],
        sbom: {
          path: 'artifacts/security/sbom.cyclonedx.json',
          components: 1,
          sha256: createHash('sha256').update(sbomContent).digest('hex')
        }
      })
    );

    const result = verifySecurityEvidence({
      rootDir: root,
      outputDir,
      commitSha: 'e'.repeat(40)
    });

    expect(result.status).toBe('PARTIAL');
    expect(result.status).not.toBe('PASS');
    expect(result.evidence).toContain('proveniência independente');
  });
});

describe('attestation verifier output contract', () => {
  it('accepts a documented single-subject verification result', () => {
    const digest = 'a'.repeat(64);
    const stdout = JSON.stringify([{
      attestation: { bundle: {} },
      verificationResult: {
        statement: { subject: [{ name: 'envelope.json', digest: { sha256: digest } }] }
      }
    }]);
    const result = parseAttestationVerificationOutput(stdout);

    expect(result.valid).toBe(true);
    expect(result.subject_sha256).toBe(digest);
  });

  it('accepts repeated attestations as long as the subject digest is unique', () => {
    const digest = 'b'.repeat(64);
    const entry = {
      attestation: {},
      verificationResult: { statement: { subject: [{ digest: { sha256: digest } }] } }
    };
    const result = parseAttestationVerificationOutput(JSON.stringify([entry, entry]));

    expect(result.valid).toBe(true);
    expect(result.subject_sha256).toBe(digest);
  });

  it('rejects empty, malformed, ambiguous or subject-less output', () => {
    expect(parseAttestationVerificationOutput('').valid).toBe(false);
    expect(parseAttestationVerificationOutput('not json').valid).toBe(false);
    expect(parseAttestationVerificationOutput('[]').valid).toBe(false);
    expect(parseAttestationVerificationOutput('[{}]').valid).toBe(false);
    expect(parseAttestationVerificationOutput(JSON.stringify([{
      verificationResult: { statement: { subject: [{ digest: { sha256: 'nope' } }] } }
    }])).valid).toBe(false);
    expect(parseAttestationVerificationOutput(JSON.stringify([
      { verificationResult: { statement: { subject: [{ digest: { sha256: 'a'.repeat(64) } }] } } },
      { verificationResult: { statement: { subject: [{ digest: { sha256: 'b'.repeat(64) } }] } } }
    ])).valid).toBe(false);
  });
});

describe('Triple-A operational evidence intake (synthetic fixtures)', () => {
  const commitSha = 'a'.repeat(40);

  it('known-bad: the removed target-verification flag no longer promotes legacy self-declared envelopes', () => {
    const root = createSyntheticRoot();
    writePayload(root, 'legacy-payload.json', 'legacy payload\n');
    const legacy = {
      schema_version: 1,
      evidence_type: 'cvg-his-external-evidence',
      commit_sha: commitSha,
      status: 'PASS',
      observed_at: new Date().toISOString(),
      producer: { kind: 'candidate-self-declared', run_id: 'legacy' },
      verification: {
        verified: true,
        method: 'self-declared',
        verifier_id: 'candidate-self-verifier',
        verified_at: new Date().toISOString()
      },
      artifacts: [{
        path: 'legacy-payload.json',
        sha256: `sha256:${sha256Buffer(Buffer.from('legacy payload\n'))}`
      }]
    };
    const legacyPath = join(root, 'legacy-evidence.json');
    writeFileSync(legacyPath, `${JSON.stringify(legacy, null, 2)}\n`);

    process.env.TRIPLE_A_VERIFY_TARGET_EVIDENCE = '1';
    process.env.TRIPLE_A_OBSERVABILITY_EVIDENCE = legacyPath;
    const withFlag = buildSynthetic({ root }).result;
    delete process.env.TRIPLE_A_VERIFY_TARGET_EVIDENCE;

    const withoutFlag = buildSynthetic({ root }).result;
    for (const evidence of [withFlag, withoutFlag]) {
      const criteria = statusMap(evidence.evidence as Record<string, unknown>, 'criteria');
      expect(criteria.get('OBSERVABILITY-EVIDENCE')?.status).toBe('FAIL');
      expect(criteria.get('OBSERVABILITY-EVIDENCE')?.status).not.toBe('PASS');
    }
  });

  it('known-bad: a well-formed producer workflow outside the code trust root cannot pass', () => {
    const root = createSyntheticRoot();
    const envelopePath = writeOperationalEnvelope(root, 'untrusted-workflow', {
      evidenceId: 'OBSERVABILITY-EVIDENCE',
      commitSha,
      workflow: 'artifacts/evil-observability.yml'
    });
    process.env.TRIPLE_A_OBSERVABILITY_EVIDENCE = envelopePath;

    const { result } = buildSynthetic({ root, verifyOperationalEvidence: passingVerifier });
    const criteria = statusMap(result.evidence as Record<string, unknown>, 'criteria');

    expect(criteria.get('OBSERVABILITY-EVIDENCE')?.status).toBe('FAIL');
    expect(checkFor(result.evidence as Record<string, unknown>, 'TRIPLE_A_OBSERVABILITY_EVIDENCE')?.evidence)
      .not.toContain('test-simulated-verifier');
  });

  it('known-bad: a trust root declared inside the envelope is ignored', () => {
    const root = createSyntheticRoot();
    const envelopePath = writeOperationalEnvelope(root, 'self-rooted', {
      evidenceId: 'OBSERVABILITY-EVIDENCE',
      commitSha,
      workflow: 'artifacts/evil-observability.yml'
    });
    process.env.TRIPLE_A_OBSERVABILITY_EVIDENCE = envelopePath;

    const { result } = buildSynthetic({ root, verifyOperationalEvidence: passingVerifier });
    const criteria = statusMap(result.evidence as Record<string, unknown>, 'criteria');

    expect(criteria.get('OBSERVABILITY-EVIDENCE')?.status).toBe('FAIL');
  });

  it('known-bad: a swapped file cannot be consumed under a different authenticated digest', () => {
    const root = createSyntheticRoot();
    const envelopePath = writeOperationalEnvelope(root, 'swap-window', {
      evidenceId: 'OBSERVABILITY-EVIDENCE',
      commitSha
    });
    const consumedSha256 = sha256File(envelopePath);
    // Simulates a concurrent writer that replaces the file after the gate read
    // the envelope but before the verifier observed it. The verifier reports
    // the digest of the bytes it actually saw; the gate must reject because
    // that digest differs from the bytes it consumed.
    const swappingVerifier = (input: { declaredWorkflow: string; envelopePath: string }) => {
      writeFileSync(envelopePath, `${JSON.stringify({ swapped_after_gate_parse: true })}\n`);
      return {
        status: 'PASS',
        workflow: input.declaredWorkflow,
        provenance: 'test-simulated-swap-verifier',
        subject_sha256: sha256File(envelopePath)
      };
    };
    process.env.TRIPLE_A_OBSERVABILITY_EVIDENCE = envelopePath;

    const { result } = buildSynthetic({ root, verifyOperationalEvidence: swappingVerifier });
    const criteria = statusMap(result.evidence as Record<string, unknown>, 'criteria');
    const check = checkFor(result.evidence as Record<string, unknown>, 'TRIPLE_A_OBSERVABILITY_EVIDENCE');

    expect(consumedSha256).not.toBe(sha256File(envelopePath));
    expect(criteria.get('OBSERVABILITY-EVIDENCE')?.status).toBe('FAIL');
    expect(check?.evidence).toContain('subject diferente');
  });

  it('known-bad: a verifier that reports a different subject digest never yields PASS', () => {
    const root = createSyntheticRoot();
    process.env.TRIPLE_A_OBSERVABILITY_EVIDENCE = writeOperationalEnvelope(root, 'digest-mismatch', {
      evidenceId: 'OBSERVABILITY-EVIDENCE',
      commitSha
    });

    const { result } = buildSynthetic({ root, verifyOperationalEvidence: digestMismatchVerifier });
    const criteria = statusMap(result.evidence as Record<string, unknown>, 'criteria');

    expect(criteria.get('OBSERVABILITY-EVIDENCE')?.status).toBe('FAIL');
  });

  it('known-bad: verifier rejection, unavailability and missing byte binding never yield PASS', () => {
    const root = createSyntheticRoot();
    const envelopePath = writeOperationalEnvelope(root, 'verifier-states', {
      evidenceId: 'OBSERVABILITY-EVIDENCE',
      commitSha
    });
    process.env.TRIPLE_A_OBSERVABILITY_EVIDENCE = envelopePath;

    const rejected = buildSynthetic({ root, verifyOperationalEvidence: rejectingVerifier }).result;
    const unavailable = buildSynthetic({ root, verifyOperationalEvidence: unavailableVerifier }).result;
    const rejectedCriteria = statusMap(rejected.evidence as Record<string, unknown>, 'criteria');
    const unavailableCriteria = statusMap(unavailable.evidence as Record<string, unknown>, 'criteria');

    expect(rejectedCriteria.get('OBSERVABILITY-EVIDENCE')?.status).toBe('FAIL');
    expect(unavailableCriteria.get('OBSERVABILITY-EVIDENCE')?.status).toBe('PARTIAL');
    expect(unavailableCriteria.get('OBSERVABILITY-EVIDENCE')?.status).not.toBe('PASS');

    const withoutBinding = validateOperationalEvidenceEnvelope({
      rootDir: root,
      value: relative(root, envelopePath),
      artifact: JSON.parse(readFileSync(envelopePath, 'utf8')),
      commitSha,
      evidenceId: 'OBSERVABILITY-EVIDENCE',
      verifyOperationalEvidence: passingVerifier
    });
    expect(withoutBinding.status).toBe('FAIL');
    expect(withoutBinding.reason).toContain('vínculo byte a byte');
  });

  it('known-bad: an unrecognized verifier status fails instead of degrading to PARTIAL', () => {
    const root = createSyntheticRoot();
    process.env.TRIPLE_A_OBSERVABILITY_EVIDENCE = writeOperationalEnvelope(root, 'invalid-verifier-output', {
      evidenceId: 'OBSERVABILITY-EVIDENCE',
      commitSha
    });

    const { result } = buildSynthetic({ root, verifyOperationalEvidence: invalidOutputVerifier });
    const criteria = statusMap(result.evidence as Record<string, unknown>, 'criteria');
    const check = checkFor(result.evidence as Record<string, unknown>, 'TRIPLE_A_OBSERVABILITY_EVIDENCE');

    expect(criteria.get('OBSERVABILITY-EVIDENCE')?.status).toBe('FAIL');
    expect(check?.layers).toEqual({
      integrity: 'PASS',
      authenticity: 'FAIL',
      sufficiency: 'PENDING'
    });
    expect(check?.evidence).toContain('Saída inválida do verificador');
  });

  it('known-bad: the default production verifier blocks operational PASS when no trusted verifier can run', () => {
    const previousRepository = process.env.GITHUB_REPOSITORY;
    const previousToken = process.env.GH_TOKEN;
    const previousGithubToken = process.env.GITHUB_TOKEN;
    delete process.env.GITHUB_REPOSITORY;
    delete process.env.GH_TOKEN;
    delete process.env.GITHUB_TOKEN;
    try {
      const result = verifyOperationalEvidenceAttestation({
        rootDir: repoRoot,
        envelopePath: 'never-written.json',
        envelopeSha256: 'a'.repeat(64),
        evidenceId: 'SOAK',
        commitSha,
        declaredWorkflow: TRUSTED_OPERATIONAL_SIGNER_WORKFLOWS[0]
      });
      expect(result.status).toBe('PARTIAL');
      expect(result.status).not.toBe('PASS');
    } finally {
      if (previousRepository === undefined) delete process.env.GITHUB_REPOSITORY;
      else process.env.GITHUB_REPOSITORY = previousRepository;
      if (previousToken === undefined) delete process.env.GH_TOKEN;
      else process.env.GH_TOKEN = previousToken;
      if (previousGithubToken === undefined) delete process.env.GITHUB_TOKEN;
      else process.env.GITHUB_TOKEN = previousGithubToken;
    }
  });

  it('known-bad: a synthetic fixture cannot pass through the production verifier without a real attestation', () => {
    const previousRepository = process.env.GITHUB_REPOSITORY;
    const previousToken = process.env.GH_TOKEN;
    const previousGithubToken = process.env.GITHUB_TOKEN;
    delete process.env.GITHUB_REPOSITORY;
    delete process.env.GH_TOKEN;
    delete process.env.GITHUB_TOKEN;
    try {
      const root = createSyntheticRoot();
      const envelopePath = writeOperationalEnvelope(root, 'synthetic-no-attestation', {
        evidenceId: 'SOAK',
        commitSha
      });
      const envelope = JSON.parse(readFileSync(envelopePath, 'utf8'));
      const direct = validateOperationalEvidenceEnvelope({
        rootDir: root,
        value: relative(root, envelopePath),
        artifact: envelope,
        commitSha,
        evidenceId: 'SOAK',
        envelopeSha256: sha256File(envelopePath)
      });

      expect(direct.status).toBe('PARTIAL');
      expect(direct.status).not.toBe('PASS');
    } finally {
      if (previousRepository === undefined) delete process.env.GITHUB_REPOSITORY;
      else process.env.GITHUB_REPOSITORY = previousRepository;
      if (previousToken === undefined) delete process.env.GH_TOKEN;
      else process.env.GH_TOKEN = previousToken;
      if (previousGithubToken === undefined) delete process.env.GITHUB_TOKEN;
      else process.env.GITHUB_TOKEN = previousGithubToken;
    }
  });

  it('keeps sufficiency pending while the gate policy lacks authority approval', () => {
    const root = createSyntheticRoot();
    process.env.TRIPLE_A_OBSERVABILITY_EVIDENCE = writeOperationalEnvelope(root, 'pending-policy', {
      evidenceId: 'OBSERVABILITY-EVIDENCE',
      commitSha
    });

    const { result } = buildSynthetic({ root, verifyOperationalEvidence: passingVerifier });
    const criteria = statusMap(result.evidence as Record<string, unknown>, 'criteria');
    const check = checkFor(result.evidence as Record<string, unknown>, 'TRIPLE_A_OBSERVABILITY_EVIDENCE');

    expect(criteria.get('OBSERVABILITY-EVIDENCE')?.status).toBe('PARTIAL');
    expect(criteria.get('OBSERVABILITY-EVIDENCE')?.status).not.toBe('PASS');
    expect(check?.layers).toEqual({
      integrity: 'PASS',
      authenticity: 'PASS',
      sufficiency: 'PENDING'
    });
    expect(check?.evidence).toContain('suficiência');
  });

  it('known-good (simulated policy + verifier): approved measurements satisfy OPS/PERF while release stays BLOCKED', () => {
    const root = createSyntheticRoot();
    const policy = approvedTestPolicy();
    process.env.TRIPLE_A_OBSERVABILITY_EVIDENCE = writeOperationalEnvelope(root, 'observability', {
      evidenceId: 'OBSERVABILITY-EVIDENCE',
      commitSha
    });
    process.env.TRIPLE_A_PERFORMANCE_EVIDENCE = writeOperationalEnvelope(root, 'performance', {
      evidenceId: 'PERFORMANCE',
      commitSha
    });
    process.env.TRIPLE_A_SOAK_EVIDENCE = writeOperationalEnvelope(root, 'soak', {
      evidenceId: 'SOAK',
      commitSha
    });
    process.env.TRIPLE_A_ROLLBACK_EVIDENCE = writeOperationalEnvelope(root, 'rollback', {
      evidenceId: 'ROLLBACK',
      commitSha
    });

    const { result } = buildSynthetic({ root, verifyOperationalEvidence: passingVerifier, operationalPolicy: policy });
    const evidence = result.evidence as Record<string, unknown>;
    const criteria = statusMap(evidence, 'criteria');

    for (const id of ['OBSERVABILITY-EVIDENCE', 'PERFORMANCE', 'SOAK', 'ROLLBACK']) {
      expect(criteria.get(id)?.status).toBe('PASS');
    }
    expect(evidence.soak).toMatchObject({ status: 'PASS' });
    expect(evidence.rollback).toMatchObject({ status: 'PASS' });
    expect(evidence.performance).toMatchObject({ status: 'PASS' });
    expect(checkFor(evidence, 'TRIPLE_A_SOAK_EVIDENCE')?.evidence).toContain('test-simulated-verifier');
    expect(checkFor(evidence, 'TRIPLE_A_SOAK_EVIDENCE')?.layers).toEqual({
      integrity: 'PASS',
      authenticity: 'PASS',
      sufficiency: 'PASS'
    });

    const bar = statusMap(evidence, 'quality_bar_assessment');
    expect(bar.get('OPS-001')?.status).toBe('PASS');
    expect(bar.get('PERF-001')?.status).toBe('PASS');
    expect(evidence.thresholds).toEqual({
      minimum_total_score: 97,
      minimum_critical_score: 95,
      maximum_open_p0: 0
    });
    expect(evidence.decision).toBe('BLOCKED');
    expect(evidence.publication_allowed).toBe(false);
    expect(evidence.claim).toBe('NOT PROVEN');
    expect((evidence.quality_bar_assessment as { open_p0: number }).open_p0).toBeGreaterThan(0);
  });

  it('known-bad: an irrelevant declared artifact with the right hash and no measurements fails', () => {
    const root = createSyntheticRoot();
    const irrelevant = writePayload(root, 'irrelevant-doc.md', '# unrelated document\n');
    process.env.TRIPLE_A_OBSERVABILITY_EVIDENCE = writeOperationalEnvelope(root, 'irrelevant-artifact', {
      evidenceId: 'OBSERVABILITY-EVIDENCE',
      commitSha,
      artifactPath: irrelevant.relativePath,
      dimensions: OPERATIONAL_EVIDENCE_REQUIREMENTS['OBSERVABILITY-EVIDENCE'].dimensions.map((id) => ({
        id,
        status: 'PASS',
        artifact: irrelevant.relativePath
      }))
    });

    const { result } = buildSynthetic({
      root,
      verifyOperationalEvidence: passingVerifier,
      operationalPolicy: approvedTestPolicy()
    });
    const criteria = statusMap(result.evidence as Record<string, unknown>, 'criteria');

    expect(criteria.get('OBSERVABILITY-EVIDENCE')?.status).toBe('FAIL');
  });

  it('known-bad: measurements that miss the approved threshold fail even under an approved policy', () => {
    const root = createSyntheticRoot();
    const policy = approvedTestPolicy({
      SOAK: { duration: { duration_hours: { min: 24 } } }
    });
    process.env.TRIPLE_A_SOAK_EVIDENCE = writeOperationalEnvelope(root, 'below-threshold', {
      evidenceId: 'SOAK',
      commitSha,
      dimensions: Object.entries(OPERATIONAL_EVIDENCE_POLICY.SOAK.dimensions).map(([id, spec]) => ({
        id,
        status: 'PASS',
        artifact: `evidence/below-threshold/below-threshold-payload.json`,
        measurements: Object.entries(spec.measurements).map(([name, measurement]) => ({
          name,
          value: name === 'duration_hours' ? 2 : 1,
          unit: measurement.unit
        }))
      }))
    });

    const { result } = buildSynthetic({ root, verifyOperationalEvidence: passingVerifier, operationalPolicy: policy });
    const criteria = statusMap(result.evidence as Record<string, unknown>, 'criteria');

    expect(criteria.get('SOAK')?.status).toBe('FAIL');
    expect(checkFor(result.evidence as Record<string, unknown>, 'TRIPLE_A_SOAK_EVIDENCE')?.evidence)
      .toContain('mínimo aprovado');
  });

  it('known-bad: a target outside the approved set fails under an approved policy', () => {
    const root = createSyntheticRoot();
    process.env.TRIPLE_A_SOAK_EVIDENCE = writeOperationalEnvelope(root, 'unapproved-target', {
      evidenceId: 'SOAK',
      commitSha,
      target: { environment: 'unapproved-datacenter', reference: 'run://wherever' }
    });

    const { result } = buildSynthetic({
      root,
      verifyOperationalEvidence: passingVerifier,
      operationalPolicy: approvedTestPolicy()
    });
    const criteria = statusMap(result.evidence as Record<string, unknown>, 'criteria');

    expect(criteria.get('SOAK')?.status).toBe('FAIL');
    expect(checkFor(result.evidence as Record<string, unknown>, 'TRIPLE_A_SOAK_EVIDENCE')?.evidence)
      .toContain('alvos aprovados');
  });

  it('known-bad: a future or incoherent verified_at blocks', () => {
    const root = createSyntheticRoot();
    const futureVerification = writeOperationalEnvelope(root, 'future-verified-at', {
      evidenceId: 'OBSERVABILITY-EVIDENCE',
      commitSha,
      verifiedAt: new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString()
    });
    process.env.TRIPLE_A_OBSERVABILITY_EVIDENCE = futureVerification;
    const future = buildSynthetic({ root, verifyOperationalEvidence: passingVerifier }).result;
    const futureCriteria = statusMap(future.evidence as Record<string, unknown>, 'criteria');

    expect(futureCriteria.get('OBSERVABILITY-EVIDENCE')?.status).toBe('FAIL');

    const observedAt = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const verifiedAt = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const inverted = writeOperationalEnvelope(root, 'inverted-verified-at', {
      evidenceId: 'OBSERVABILITY-EVIDENCE',
      commitSha,
      observedAt,
      verifiedAt
    });
    process.env.TRIPLE_A_OBSERVABILITY_EVIDENCE = inverted;
    const invertedResult = buildSynthetic({ root, verifyOperationalEvidence: passingVerifier }).result;
    const invertedCriteria = statusMap(invertedResult.evidence as Record<string, unknown>, 'criteria');

    expect(invertedCriteria.get('OBSERVABILITY-EVIDENCE')?.status).toBe('FAIL');
  });

  it('known-bad: missing or malformed measurements and wrong units fail structurally', () => {
    const root = createSyntheticRoot();
    const missing = writeOperationalEnvelope(root, 'missing-measurement', {
      evidenceId: 'SOAK',
      commitSha,
      dimensions: [
        { id: 'duration', status: 'PASS', artifact: 'evidence/missing-measurement/missing-measurement-payload.json', measurements: [] }
      ]
    });
    process.env.TRIPLE_A_SOAK_EVIDENCE = missing;
    const missingCriteria = statusMap(
      buildSynthetic({ root, verifyOperationalEvidence: passingVerifier }).result.evidence as Record<string, unknown>,
      'criteria'
    );
    expect(missingCriteria.get('SOAK')?.status).toBe('FAIL');

    const wrongUnit = writeOperationalEnvelope(root, 'wrong-unit', {
      evidenceId: 'SOAK',
      commitSha,
      dimensions: Object.entries(OPERATIONAL_EVIDENCE_POLICY.SOAK.dimensions).map(([id, spec]) => ({
        id,
        status: 'PASS',
        artifact: 'evidence/wrong-unit/wrong-unit-payload.json',
        measurements: Object.entries(spec.measurements).map(([name]) => ({
          name,
          value: 1,
          unit: 'wrong-unit'
        }))
      }))
    });
    process.env.TRIPLE_A_SOAK_EVIDENCE = wrongUnit;
    const wrongUnitCriteria = statusMap(
      buildSynthetic({ root, verifyOperationalEvidence: passingVerifier }).result.evidence as Record<string, unknown>,
      'criteria'
    );
    expect(wrongUnitCriteria.get('SOAK')?.status).toBe('FAIL');
  });

  it('known-bad: dimension scope, evidence type, schema and target mismatches block', () => {
    const root = createSyntheticRoot();
    const payloadPath = 'evidence/mismatch/mismatch-payload.json';
    writePayload(root, payloadPath, 'mismatch payload\n');
    const mismatches = {
      missingDimension: writeOperationalEnvelope(root, 'missing-dimension', {
        evidenceId: 'OBSERVABILITY-EVIDENCE',
        commitSha,
        dimensions: [{ id: 'slo', status: 'PASS', artifact: payloadPath, measurements: [{ name: 'slo_compliance_ratio', value: 1, unit: 'ratio' }] }]
      }),
      extraDimension: writeOperationalEnvelope(root, 'extra-dimension', {
        evidenceId: 'OBSERVABILITY-EVIDENCE',
        commitSha,
        dimensions: [
          ...OPERATIONAL_EVIDENCE_REQUIREMENTS['OBSERVABILITY-EVIDENCE'].dimensions.map((id) => ({
            id,
            status: 'PASS',
            artifact: payloadPath,
            measurements: Object.entries(OPERATIONAL_EVIDENCE_POLICY['OBSERVABILITY-EVIDENCE'].dimensions[id].measurements).map(([name, measurement]) => ({ name, value: 1, unit: measurement.unit }))
          })),
          { id: 'made_up', status: 'PASS', artifact: payloadPath }
        ]
      }),
      wrongType: writeOperationalEnvelope(root, 'wrong-type', {
        evidenceId: 'SOAK',
        commitSha,
        evidenceType: 'cvg-his-external-evidence'
      }),
      oldSchema: writeOperationalEnvelope(root, 'old-schema', {
        evidenceId: 'SOAK',
        commitSha,
        schemaVersion: 2
      }),
      wrongSha: writeOperationalEnvelope(root, 'wrong-sha', {
        evidenceId: 'SOAK',
        commitSha: 'b'.repeat(40)
      }),
      noTarget: writeOperationalEnvelope(root, 'no-target', {
        evidenceId: 'SOAK',
        commitSha,
        target: {}
      }),
      reuse: writeOperationalEnvelope(root, 'cross-reuse', {
        evidenceId: 'OBSERVABILITY-EVIDENCE',
        commitSha
      })
    };

    process.env.TRIPLE_A_OBSERVABILITY_EVIDENCE = mismatches.missingDimension;
    expect(statusMap(buildSynthetic({ root, verifyOperationalEvidence: passingVerifier }).result.evidence as Record<string, unknown>, 'criteria').get('OBSERVABILITY-EVIDENCE')?.status).toBe('FAIL');

    process.env.TRIPLE_A_OBSERVABILITY_EVIDENCE = mismatches.extraDimension;
    expect(statusMap(buildSynthetic({ root, verifyOperationalEvidence: passingVerifier }).result.evidence as Record<string, unknown>, 'criteria').get('OBSERVABILITY-EVIDENCE')?.status).toBe('FAIL');

    process.env.TRIPLE_A_SOAK_EVIDENCE = mismatches.wrongType;
    expect(statusMap(buildSynthetic({ root, verifyOperationalEvidence: passingVerifier }).result.evidence as Record<string, unknown>, 'criteria').get('SOAK')?.status).toBe('FAIL');

    process.env.TRIPLE_A_SOAK_EVIDENCE = mismatches.oldSchema;
    expect(statusMap(buildSynthetic({ root, verifyOperationalEvidence: passingVerifier }).result.evidence as Record<string, unknown>, 'criteria').get('SOAK')?.status).toBe('FAIL');

    process.env.TRIPLE_A_SOAK_EVIDENCE = mismatches.wrongSha;
    expect(statusMap(buildSynthetic({ root, verifyOperationalEvidence: passingVerifier }).result.evidence as Record<string, unknown>, 'criteria').get('SOAK')?.status).toBe('FAIL');

    process.env.TRIPLE_A_SOAK_EVIDENCE = mismatches.noTarget;
    expect(statusMap(buildSynthetic({ root, verifyOperationalEvidence: passingVerifier }).result.evidence as Record<string, unknown>, 'criteria').get('SOAK')?.status).toBe('FAIL');

    process.env.TRIPLE_A_SOAK_EVIDENCE = mismatches.reuse;
    expect(statusMap(buildSynthetic({ root, verifyOperationalEvidence: passingVerifier }).result.evidence as Record<string, unknown>, 'criteria').get('SOAK')?.status).toBe('FAIL');
  });

  it('known-bad: unsafe or undeclared artifact references and payload tampering block', () => {
    const root = createSyntheticRoot();
    const declaredPath = 'evidence/artifacts/artifacts-payload.json';
    const written = writePayload(root, declaredPath, 'artifact payload\n');
    const outsidePath = join(root, '..', `outside-${Date.now()}.txt`);
    writeFileSync(outsidePath, 'outside\n');
    isolatedDirs.push(outsidePath);
    const symlinkPath = join(root, 'evidence', 'linked-payload.json');
    symlinkSync(outsidePath, symlinkPath);

    const undeclared = writeOperationalEnvelope(root, 'undeclared-artifact', {
      evidenceId: 'ROLLBACK',
      commitSha,
      dimensions: OPERATIONAL_EVIDENCE_REQUIREMENTS.ROLLBACK.dimensions.map((id) => ({
        id,
        status: 'PASS',
        artifact: 'evidence/not-declared.json',
        measurements: Object.entries(OPERATIONAL_EVIDENCE_POLICY.ROLLBACK.dimensions[id].measurements).map(([name, measurement]) => ({ name, value: 1, unit: measurement.unit }))
      }))
    });
    process.env.TRIPLE_A_ROLLBACK_EVIDENCE = undeclared;
    expect(statusMap(buildSynthetic({ root, verifyOperationalEvidence: passingVerifier }).result.evidence as Record<string, unknown>, 'criteria').get('ROLLBACK')?.status).toBe('FAIL');

    const symlinked = writeOperationalEnvelope(root, 'symlinked-artifact', {
      evidenceId: 'ROLLBACK',
      commitSha,
      artifactPath: 'evidence/linked-payload.json',
      declaredDigest: `sha256:${sha256Buffer(Buffer.from('outside\n'))}`
    });
    process.env.TRIPLE_A_ROLLBACK_EVIDENCE = symlinked;
    expect(statusMap(buildSynthetic({ root, verifyOperationalEvidence: passingVerifier }).result.evidence as Record<string, unknown>, 'criteria').get('ROLLBACK')?.status).toBe('FAIL');

    const tampered = writeOperationalEnvelope(root, 'tampered-payload', {
      evidenceId: 'ROLLBACK',
      commitSha,
      payload: 'original payload\n'
    });
    writeFileSync(join(root, 'evidence', 'tampered-payload', 'tampered-payload-payload.json'), 'tampered after envelope\n');
    process.env.TRIPLE_A_ROLLBACK_EVIDENCE = tampered;
    expect(statusMap(buildSynthetic({ root, verifyOperationalEvidence: passingVerifier }).result.evidence as Record<string, unknown>, 'criteria').get('ROLLBACK')?.status).toBe('FAIL');

    expect(written.digest).toContain('sha256:');
  });

  it('blocks OPS-001, soak and rollback when mandatory evidence is absent', () => {
    const root = createSyntheticRoot();
    const { result } = buildSynthetic({ root, verifyOperationalEvidence: passingVerifier });
    const evidence = result.evidence as Record<string, unknown>;
    const criteria = statusMap(evidence, 'criteria');
    const bar = statusMap(evidence, 'quality_bar_assessment');

    expect(criteria.get('OBSERVABILITY-EVIDENCE')?.status).toBe('NOT_RUN');
    expect(criteria.get('SOAK')?.status).toBe('NOT_RUN');
    expect(criteria.get('ROLLBACK')?.status).toBe('NOT_RUN');
    expect(evidence.soak).toMatchObject({ status: 'NOT_RUN' });
    expect(evidence.rollback).toMatchObject({ status: 'NOT_RUN' });
    expect(bar.get('OPS-001')?.status).toBe('NOT_RUN');
  });

  it('keeps human authority and UAT outside automated attestation promotion', () => {
    const root = createSyntheticRoot();
    const payload = writePayload(root, 'authority-payload.json', 'human record\n');
    const genericEnvelope = (name: string) => {
      const path = join(root, `${name}.json`);
      writeFileSync(path, `${JSON.stringify({
        schema_version: 1,
        evidence_type: 'cvg-his-external-evidence',
        commit_sha: commitSha,
        status: 'PASS',
        observed_at: new Date().toISOString(),
        producer: { kind: 'human-authority', run_id: name },
        verification: {
          verified: true,
          method: 'signed-record',
          verifier_id: 'release-board',
          verified_at: new Date().toISOString()
        },
        artifacts: [{ path: payload.relativePath, sha256: payload.digest }]
      }, null, 2)}\n`);
      return path;
    };
    process.env.TRIPLE_A_AUTHORITY_EVIDENCE = genericEnvelope('authority');
    process.env.TRIPLE_A_UAT_EVIDENCE = genericEnvelope('uat');

    const { result } = buildSynthetic({ root, verifyOperationalEvidence: passingVerifier });
    const evidence = result.evidence as Record<string, unknown>;
    const criteria = statusMap(evidence, 'criteria');
    const bar = statusMap(evidence, 'quality_bar_assessment');

    expect(criteria.get('RELEASE-AUTHORITY')?.status).toBe('FAIL');
    expect(criteria.get('HOSPITAL-UAT')?.status).toBe('FAIL');
    expect(bar.get('FINAL-001')?.status).toBe('FAIL');
  });

  it('known-bad: image-attestation and CI envelopes cannot be reused as operational evidence', () => {
    const root = createSyntheticRoot();
    const written = writePayload(root, 'reuse-payload.txt', 'reused\n');
    const imageEnvelope = join(root, 'image-attestation-evidence.json');
    writeFileSync(imageEnvelope, `${JSON.stringify({
      schema_version: 1,
      evidence_type: 'cvg-his-external-evidence',
      commit_sha: commitSha,
      status: 'PASS',
      observed_at: new Date().toISOString(),
      producer: { kind: 'github-actions', run_id: '999' },
      verification: {
        verified: true,
        method: 'github-cli-gh-attestation-verify',
        verifier_id: 'gh-attestation-verify',
        verified_at: new Date().toISOString()
      },
      artifacts: [{ path: written.relativePath, sha256: written.digest }]
    }, null, 2)}\n`);
    process.env.TRIPLE_A_SOAK_EVIDENCE = imageEnvelope;
    process.env.TRIPLE_A_IMAGE_ATTESTATION_EVIDENCE = imageEnvelope;

    const { result } = buildSynthetic({ root, verifyOperationalEvidence: passingVerifier });
    const criteria = statusMap(result.evidence as Record<string, unknown>, 'criteria');

    expect(criteria.get('SOAK')?.status).toBe('FAIL');
    expect(criteria.get('IMAGE-ATTESTATIONS')?.status).not.toBe('PASS');
  });
});

describe('MA-03-R3 sufficiency regressions (R2-F1 duplicate dimensions, R2-F2 approved bounds)', () => {
  const commitSha = 'a'.repeat(40);
  type MutableMeasurement = { min?: unknown; max?: unknown };
  type MutablePolicy = {
    SOAK: { dimensions: Record<string, { measurements: Record<string, MutableMeasurement> }> };
  };

  function soakDimensionsFor(name: string, options: { durationHours?: number } = {}) {
    const payloadPath = `evidence/${name}/${name}-payload.json`;
    return Object.entries(OPERATIONAL_EVIDENCE_POLICY.SOAK.dimensions).map(([id, spec]) => ({
      id,
      status: 'PASS',
      artifact: payloadPath,
      measurements: Object.entries(spec.measurements).map(([measurementName, measurement]) => ({
        name: measurementName,
        value: id === 'duration' && measurementName === 'duration_hours'
          ? (options.durationHours ?? 1)
          : 1,
        unit: measurement.unit
      }))
    }));
  }

  function approvedSoakPolicy() {
    const policy = structuredClone(OPERATIONAL_EVIDENCE_POLICY);
    policy.SOAK.approval = {
      status: 'APPROVED',
      decided_by: 'test-authority',
      decided_at: '2026-09-12T00:00:00.000Z',
      reference: 'test-fixture'
    };
    policy.SOAK.expected_targets = ['approved-target'];
    for (const dimension of Object.values(policy.SOAK.dimensions)) {
      for (const measurement of Object.values(dimension.measurements)) {
        measurement.min = 0;
        measurement.max = null;
      }
    }
    return policy;
  }

  function approvedSoakPolicyWithoutBounds() {
    const policy = structuredClone(OPERATIONAL_EVIDENCE_POLICY);
    policy.SOAK.approval = {
      status: 'APPROVED',
      decided_by: 'test-authority',
      decided_at: '2026-09-12T00:00:00.000Z',
      reference: 'test-fixture'
    };
    policy.SOAK.expected_targets = ['approved-target'];
    return policy;
  }

  function evaluateSoak(
    root: string,
    name: string,
    policy: Record<string, unknown>,
    options: { dimensions?: Array<Record<string, unknown>>; target?: unknown } = {}
  ) {
    const envelopePath = writeOperationalEnvelope(root, name, {
      evidenceId: 'SOAK',
      commitSha,
      ...(options.dimensions ? { dimensions: options.dimensions } : {}),
      ...(options.target ? { target: options.target } : {})
    });
    const bytes = readFileSync(envelopePath);
    return validateOperationalEvidenceEnvelope({
      rootDir: root,
      value: relative(root, envelopePath).split('\\').join('/'),
      artifact: JSON.parse(bytes.toString('utf8')),
      commitSha,
      evidenceId: 'SOAK',
      envelopeSha256: sha256Buffer(bytes),
      operationalPolicy: policy as never,
      verifyOperationalEvidence: passingVerifier
    });
  }

  it('known-bad: a failed dimension followed by a passing duplicate is rejected (R2-F1)', () => {
    const root = createSyntheticRoot();
    const policy = approvedSoakPolicy() as Record<string, unknown>;
    const failing = soakDimensionsFor('failed-then-passing', { durationHours: -1 });
    const passingDuration = soakDimensionsFor('failed-then-passing', { durationHours: 1 })[0];
    const result = evaluateSoak(root, 'failed-then-passing', policy, {
      dimensions: [...failing, passingDuration]
    });

    expect(result.status).toBe('FAIL');
    expect(result.reason).toContain('duplicadas');
  });

  it('known-bad: the same duplicate in reverse order is rejected (R2-F1)', () => {
    const root = createSyntheticRoot();
    const policy = approvedSoakPolicy() as Record<string, unknown>;
    const passing = soakDimensionsFor('passing-then-failed', { durationHours: 1 });
    const failingDuration = soakDimensionsFor('passing-then-failed', { durationHours: -1 })[0];
    const result = evaluateSoak(root, 'passing-then-failed', policy, {
      dimensions: [...passing, failingDuration]
    });

    expect(result.status).toBe('FAIL');
    expect(result.reason).toContain('duplicadas');
  });

  it('known-bad: two identical apparently valid duplicate dimensions are rejected (R2-F1)', () => {
    const root = createSyntheticRoot();
    const policy = approvedSoakPolicy() as Record<string, unknown>;
    const dimensions = soakDimensionsFor('identical-duplicates', { durationHours: 1 });
    const result = evaluateSoak(root, 'identical-duplicates', policy, {
      dimensions: [...dimensions, structuredClone(dimensions[0])]
    });

    expect(result.status).toBe('FAIL');
    expect(result.reason).toContain('duplicadas');
  });

  it('known-bad: duplicates fail even while the real policy is PENDING_AUTHORITY (R2-F1)', () => {
    const root = createSyntheticRoot();
    const dimensions = soakDimensionsFor('duplicates-pending', { durationHours: 1 });
    const result = evaluateSoak(root, 'duplicates-pending', OPERATIONAL_EVIDENCE_POLICY as never, {
      dimensions: [...dimensions, structuredClone(dimensions[0])]
    });

    expect(result.status).toBe('FAIL');
    expect(result.status).not.toBe('PARTIAL');
    expect(result.reason).toContain('duplicadas');
  });

  it('control: unique valid dimensions still satisfy an approved policy (R2-F1)', () => {
    const root = createSyntheticRoot();
    const policy = approvedSoakPolicy() as Record<string, unknown>;
    const result = evaluateSoak(root, 'unique-valid', policy);

    expect(result.status).toBe('PASS');
  });

  it('known-bad: approved policy cloned with only APPROVED and expected_targets is rejected (R2-F2)', () => {
    const root = createSyntheticRoot();
    const policy = approvedSoakPolicyWithoutBounds() as Record<string, unknown>;
    const result = evaluateSoak(root, 'approved-without-any-bound', policy);

    expect(result.status).toBe('FAIL');
    expect(result.reason).toContain('sem limite numérico finito');
  });

  it('known-bad: every null/undefined combination without a finite bound is rejected (R2-F2)', () => {
    const root = createSyntheticRoot();
    const combinations: Array<{ min?: null; max?: null }> = [
      { min: null, max: null },
      { min: null },
      {},
      { max: null }
    ];
    for (const [index, bounds] of combinations.entries()) {
      const policy = approvedSoakPolicy() as unknown as MutablePolicy;
      const spec = policy.SOAK.dimensions.duration.measurements.duration_hours;
      delete spec.min;
      delete spec.max;
      Object.assign(spec, bounds);
      const result = evaluateSoak(root, `bounds-combination-${index}`, policy as never);
      expect(result.status, JSON.stringify(bounds)).toBe('FAIL');
    }
  });

  it('known-bad: invalid bound types, NaN and infinities are rejected (R2-F2)', () => {
    const root = createSyntheticRoot();
    const invalidBounds: Array<Record<string, unknown>> = [
      { min: '1' },
      { max: '10' },
      { min: true },
      { max: false },
      { min: { value: 1 } },
      { max: [1] },
      { min: Number.NaN },
      { max: Number.NaN },
      { min: Number.POSITIVE_INFINITY },
      { max: Number.NEGATIVE_INFINITY }
    ];
    for (const [index, bounds] of invalidBounds.entries()) {
      const policy = approvedSoakPolicy() as unknown as MutablePolicy;
      const spec = policy.SOAK.dimensions.duration.measurements.duration_hours;
      delete spec.min;
      delete spec.max;
      Object.assign(spec, bounds);
      const result = evaluateSoak(root, `invalid-bound-${index}`, policy as never);
      expect(result.status, JSON.stringify(Object.entries(bounds).map(([k, v]) => [k, String(v)]))).toBe('FAIL');
    }
  });

  it('known-bad: an inverted approved interval is rejected (R2-F2)', () => {
    const root = createSyntheticRoot();
    const policy = approvedSoakPolicy() as unknown as MutablePolicy;
    Object.assign(policy.SOAK.dimensions.duration.measurements.duration_hours, { min: 10, max: 5 });
    const result = evaluateSoak(root, 'inverted-interval', policy as never);

    expect(result.status).toBe('FAIL');
    expect(result.reason).toContain('intervalo invertido');
  });

  it('control: unilateral and bounded approved rules still pass with inclusive boundaries (R2-F2)', () => {
    const boundaries: Array<{ bounds: Record<string, number>; value: number; expected: string }> = [
      { bounds: { min: 1 }, value: 1, expected: 'PASS' },
      { bounds: { max: 1 }, value: 1, expected: 'PASS' },
      { bounds: { min: 0, max: 10 }, value: 1, expected: 'PASS' },
      { bounds: { min: 1, max: 1 }, value: 1, expected: 'PASS' },
      { bounds: { min: 10, max: 20 }, value: 1, expected: 'FAIL' },
      { bounds: { min: 0, max: 0 }, value: 1, expected: 'FAIL' }
    ];
    for (const [index, testCase] of boundaries.entries()) {
      const root = createSyntheticRoot();
      const policy = approvedSoakPolicy() as unknown as MutablePolicy;
      const spec = policy.SOAK.dimensions.duration.measurements.duration_hours;
      delete spec.min;
      delete spec.max;
      Object.assign(spec, testCase.bounds);
      const result = evaluateSoak(root, `boundary-${index}`, policy as never, {
        dimensions: soakDimensionsFor(`boundary-${index}`, { durationHours: testCase.value })
      });
      expect(result.status, JSON.stringify(testCase)).toBe(testCase.expected);
    }
  });

  it('control: the real PENDING_AUTHORITY policy remains PARTIAL and never PASS (R2-F2)', () => {
    const root = createSyntheticRoot();
    const result = evaluateSoak(root, 'pending-control', OPERATIONAL_EVIDENCE_POLICY as never);

    expect(result.status).toBe('PARTIAL');
    expect(result.status).not.toBe('PASS');
  });
});
