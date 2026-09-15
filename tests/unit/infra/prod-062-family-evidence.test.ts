import { createHash } from 'node:crypto';
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import {
  FAMILY_EVIDENCE_CONTRACTS,
  FAMILY_EVIDENCE_POLICY,
  FAMILY_EVIDENCE_REQUIREMENTS,
  TRUSTED_OPERATIONAL_SIGNER_WORKFLOWS,
  validateFamilyEvidenceEnvelope
} from '../../../scripts/run-triple-a-release-gate.mjs';

const repoRoot = process.cwd();
const commitSha = 'a'.repeat(40);
const temporaryRoots: string[] = [];

type FamilyEvidenceId = keyof typeof FAMILY_EVIDENCE_CONTRACTS;
type Envelope = Record<string, unknown>;

function createRoot() {
  const root = mkdtempSync(join(tmpdir(), 'cvg-prod-062-family-'));
  temporaryRoots.push(root);
  mkdirSync(join(root, 'evidence'), { recursive: true });
  copyFileSync(
    join(repoRoot, 'docs', 'triple-a', 'QUALITY_BAR_V1.json'),
    join(root, 'QUALITY_BAR_V1.json')
  );
  return root;
}

function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

function approvedFamilyPolicy() {
  const policy = structuredClone(FAMILY_EVIDENCE_POLICY);
  const decidedAt = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  for (const entry of Object.values(policy)) {
    entry.approval = {
      status: 'APPROVED',
      decided_by: 'platform-security-qa-test-authority',
      decided_at: decidedAt,
      reference: 'PROD-062-synthetic-policy'
    };
    entry.expected_targets = ['approved-test-target'];
    for (const dimension of Object.values(entry.dimensions)) {
      for (const measurement of Object.values(dimension.measurements)) {
        measurement.min = 0;
        measurement.max = null;
      }
    }
  }
  return policy;
}

function writeFamilyEnvelope(
  root: string,
  name: string,
  evidenceId: FamilyEvidenceId,
  mutate: (envelope: Envelope) => void = () => {}
) {
  const contract = FAMILY_EVIDENCE_CONTRACTS[evidenceId];
  const payloadPath = `evidence/${name}-measurement.json`;
  const payload = `synthetic PROD-062 payload for ${evidenceId}\n`;
  mkdirSync(join(root, 'evidence'), { recursive: true });
  writeFileSync(join(root, payloadPath), payload);
  const observedAt = new Date().toISOString();
  const envelope: Envelope = {
    schema_version: 1,
    evidence_type: 'cvg-his-family-evidence',
    contract_version: 1,
    criterion_id: evidenceId,
    family: contract.family,
    commit_sha: commitSha,
    status: 'PASS',
    observed_at: observedAt,
    target: { environment: 'approved-test-target', reference: `run://prod-062/${name}` },
    producer: {
      kind: contract.profile.producer_kind,
      issuer: contract.profile.issuer,
      run_id: `prod-062-${name}`,
      workflow: TRUSTED_OPERATIONAL_SIGNER_WORKFLOWS[0]
    },
    verification: {
      verified: true,
      method: 'github-artifact-attestation',
      verifier_id: 'gh-attestation-verify',
      verified_at: observedAt
    },
    artifacts: [{ path: payloadPath, sha256: `sha256:${sha256(payload)}` }],
    results: {
      outcome: 'PASS',
      dimensions: Object.entries(contract.profile.dimensions).map(([id, dimension]) => ({
        id,
        status: 'PASS',
        artifact: payloadPath,
        measurements: Object.entries(dimension.measurements).map(([measurementName, measurement]) => ({
          name: measurementName,
          value: 1,
          unit: measurement.unit
        }))
      }))
    }
  };
  if (contract.family === 'authority') {
    envelope.authorization = {
      decision: 'APPROVED',
      approver_id: 'release-owner-test',
      approver_role: 'release-owner',
      approved_at: observedAt,
      reference: 'authority://prod-062/synthetic'
    };
  }
  mutate(envelope);
  const envelopePath = join(root, 'evidence', `${name}.json`);
  writeFileSync(envelopePath, `${JSON.stringify(envelope, null, 2)}\n`);
  return envelopePath;
}

function passingVerifier(input: { declaredWorkflow: string; envelopeSha256: string }) {
  return {
    status: 'PASS',
    workflow: input.declaredWorkflow,
    provenance: 'prod-062-simulated-verifier',
    subject_sha256: input.envelopeSha256
  };
}

function evaluate(
  root: string,
  envelopePath: string,
  evidenceId: FamilyEvidenceId,
  familyEvidencePolicy = approvedFamilyPolicy(),
  verifier: typeof passingVerifier | null = passingVerifier
) {
  const bytes = readFileSync(envelopePath);
  const input = {
    rootDir: root,
    value: relative(root, envelopePath),
    artifact: JSON.parse(bytes.toString('utf8')),
    commitSha,
    evidenceId,
    envelopeSha256: sha256(bytes.toString('utf8')),
    familyEvidencePolicy
  };
  return validateFamilyEvidenceEnvelope(verifier
    ? { ...input, verifyOperationalEvidence: verifier }
    : input);
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('PROD-062 family-specific release evidence', () => {
  it('known-good: every formerly generic criterion passes with approved policy and injected verifier', () => {
    const root = createRoot();
    const policy = approvedFamilyPolicy();
    const criterionIds = Object.keys(FAMILY_EVIDENCE_REQUIREMENTS) as FamilyEvidenceId[];

    for (const evidenceId of criterionIds) {
      const envelopePath = writeFamilyEnvelope(root, `known-good-${evidenceId}`, evidenceId);
      const result = evaluate(root, envelopePath, evidenceId, policy);
      expect(result.status, evidenceId).toBe('PASS');
      expect(result.layers, evidenceId).toEqual({
        integrity: 'PASS',
        authenticity: 'PASS',
        sufficiency: 'PASS'
      });
    }
  });

  it('known-bad: generic v1, hash, issuer, target, status, limit and authority lies fail closed', () => {
    const root = createRoot();
    const policy = approvedFamilyPolicy();
    const cases: Array<{ name: string; evidenceId: FamilyEvidenceId; mutate: (envelope: Envelope) => void; expected: RegExp }> = [
      {
        name: 'wrong-hash',
        evidenceId: 'CRITICAL-TESTS',
        mutate: (envelope) => {
          (envelope.artifacts as Array<Envelope>)[0].sha256 = `sha256:${'f'.repeat(64)}`;
        },
        expected: /Digest/
      },
      {
        name: 'wrong-issuer',
        evidenceId: 'CRITICAL-TESTS',
        mutate: (envelope) => {
          (envelope.producer as Envelope).issuer = 'candidate-self-declared';
        },
        expected: /Issuer\/produtor inválido/
      },
      {
        name: 'wrong-target',
        evidenceId: 'CRITICAL-TESTS',
        mutate: (envelope) => {
          (envelope.target as Envelope).environment = 'unapproved-target';
        },
        expected: /alvos aprovados/
      },
      {
        name: 'wrong-status',
        evidenceId: 'CRITICAL-TESTS',
        mutate: (envelope) => {
          envelope.status = 'PARTIAL';
        },
        expected: /Envelope externo inválido/
      },
      {
        name: 'wrong-criterion',
        evidenceId: 'CRITICAL-TESTS',
        mutate: (envelope) => {
          envelope.criterion_id = 'E2E';
        },
        expected: /critério, família ou versão/
      },
      {
        name: 'wrong-family',
        evidenceId: 'CRITICAL-TESTS',
        mutate: (envelope) => {
          envelope.family = 'rls';
        },
        expected: /critério, família ou versão/
      },
      {
        name: 'wrong-unit',
        evidenceId: 'CRITICAL-TESTS',
        mutate: (envelope) => {
          const dimensions = (envelope.results as Envelope).dimensions as Array<Envelope>;
          const measurements = dimensions[0].measurements as Array<Envelope>;
          measurements[0].unit = 'count';
        },
        expected: /unidade count/
      },
      {
        name: 'producer-limit',
        evidenceId: 'CRITICAL-TESTS',
        mutate: (envelope) => {
          envelope.limits = { required_case_ratio: 0 };
        },
        expected: /limite\/política declarados/
      },
      {
        name: 'dimension-limit',
        evidenceId: 'CRITICAL-TESTS',
        mutate: (envelope) => {
          const dimensions = (envelope.results as Envelope).dimensions as Array<Envelope>;
          dimensions[0].thresholds = { test_pass_ratio: 0 };
        },
        expected: /alvo\/limite\/política declarados/
      },
      {
        name: 'authority-rejected',
        evidenceId: 'RELEASE-AUTHORITY',
        mutate: (envelope) => {
          envelope.authorization = {
            decision: 'REJECTED',
            approver_id: 'release-owner-test',
            approver_role: 'release-owner',
            approved_at: new Date().toISOString(),
            reference: 'authority://rejected'
          };
        },
        expected: /registro de autoridade/
      }
    ];

    for (const testCase of cases) {
      const envelopePath = writeFamilyEnvelope(root, testCase.name, testCase.evidenceId, testCase.mutate);
      const result = evaluate(root, envelopePath, testCase.evidenceId, policy);
      expect(result.status, testCase.name).toBe('FAIL');
      expect(result.reason, testCase.name).toMatch(testCase.expected);
    }

    const genericPath = join(root, 'evidence', 'generic.json');
    writeFileSync(genericPath, JSON.stringify({
      schema_version: 1,
      evidence_type: 'cvg-his-external-evidence',
      commit_sha: commitSha,
      status: 'PASS'
    }));
    const genericResult = evaluate(root, genericPath, 'CRITICAL-TESTS', policy);
    expect(genericResult.status).toBe('FAIL');
  });

  it('known-bad: stale evidence, duplicate measurements, byte mismatch and malformed authority fail', () => {
    const root = createRoot();
    const policy = approvedFamilyPolicy();

    const stalePath = writeFamilyEnvelope(root, 'stale', 'BACKUP-DRILL', (envelope) => {
      envelope.observed_at = '2020-01-01T00:00:00.000Z';
    });
    const stale = evaluate(root, stalePath, 'BACKUP-DRILL', policy);
    expect(stale.status).toBe('FAIL');
    expect(stale.reason).toContain('expirado');

    const duplicatePath = writeFamilyEnvelope(root, 'duplicate-measurement', 'RLS-RUNTIME', (envelope) => {
      const dimensions = (envelope.results as Envelope).dimensions as Array<Envelope>;
      const measurements = dimensions[0].measurements as Array<Envelope>;
      measurements.push(structuredClone(measurements[0]));
    });
    const duplicate = evaluate(root, duplicatePath, 'RLS-RUNTIME', policy);
    expect(duplicate.status).toBe('FAIL');
    expect(duplicate.reason).toContain('não correspondem exatamente');

    const mismatchPath = writeFamilyEnvelope(root, 'subject-mismatch', 'HOSPITAL-UAT');
    const mismatch = evaluate(root, mismatchPath, 'HOSPITAL-UAT', policy, (input) => ({
      ...passingVerifier(input),
      subject_sha256: 'b'.repeat(64)
    }));
    expect(mismatch.status).toBe('FAIL');
    expect(mismatch.reason).toContain('subject diferente');

    const malformedAuthorityPath = writeFamilyEnvelope(root, 'malformed-authority', 'RELEASE-AUTHORITY', (envelope) => {
      envelope.authorization = { decision: 'APPROVED' };
    });
    const malformedAuthority = evaluate(root, malformedAuthorityPath, 'RELEASE-AUTHORITY', policy);
    expect(malformedAuthority.status).toBe('FAIL');
    expect(malformedAuthority.reason).toContain('registro de autoridade');
  });

  it('keeps policy authority and production attestation outside local auto-PASS', () => {
    const root = createRoot();
    const envelopePath = writeFamilyEnvelope(root, 'pending', 'DEPLOY-TARGET');
    const pending = evaluate(root, envelopePath, 'DEPLOY-TARGET', FAMILY_EVIDENCE_POLICY);
    expect(pending.status).toBe('PARTIAL');
    expect(pending.layers).toEqual({
      integrity: 'PASS',
      authenticity: 'PASS',
      sufficiency: 'PENDING'
    });

    const previous = {
      repository: process.env.GITHUB_REPOSITORY,
      ghToken: process.env.GH_TOKEN,
      githubToken: process.env.GITHUB_TOKEN,
      removedFlag: process.env.TRIPLE_A_VERIFY_TARGET_EVIDENCE
    };
    delete process.env.GITHUB_REPOSITORY;
    delete process.env.GH_TOKEN;
    delete process.env.GITHUB_TOKEN;
    process.env.TRIPLE_A_VERIFY_TARGET_EVIDENCE = '1';
    try {
      const noVerifier = evaluate(root, envelopePath, 'DEPLOY-TARGET', approvedFamilyPolicy(), null);
      expect(noVerifier.status).toBe('PARTIAL');
      expect(noVerifier.status).not.toBe('PASS');
      expect(noVerifier.reason).toContain('obrigatórios');
    } finally {
      if (previous.repository === undefined) delete process.env.GITHUB_REPOSITORY;
      else process.env.GITHUB_REPOSITORY = previous.repository;
      if (previous.ghToken === undefined) delete process.env.GH_TOKEN;
      else process.env.GH_TOKEN = previous.ghToken;
      if (previous.githubToken === undefined) delete process.env.GITHUB_TOKEN;
      else process.env.GITHUB_TOKEN = previous.githubToken;
      if (previous.removedFlag === undefined) delete process.env.TRIPLE_A_VERIFY_TARGET_EVIDENCE;
      else process.env.TRIPLE_A_VERIFY_TARGET_EVIDENCE = previous.removedFlag;
    }
  });

  it('does not let an ambient age variable widen the gate-owned freshness window', () => {
    const root = createRoot();
    const envelopePath = writeFamilyEnvelope(root, 'ambient-age-override', 'E2E', (envelope) => {
      envelope.observed_at = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
      (envelope.verification as Envelope).verified_at = envelope.observed_at;
    });
    const previous = process.env.TRIPLE_A_EVIDENCE_MAX_AGE_HOURS;
    process.env.TRIPLE_A_EVIDENCE_MAX_AGE_HOURS = '999999';
    try {
      const result = evaluate(root, envelopePath, 'E2E', approvedFamilyPolicy());
      expect(result.status).toBe('FAIL');
      expect(result.reason).toContain('expirado');
    } finally {
      if (previous === undefined) delete process.env.TRIPLE_A_EVIDENCE_MAX_AGE_HOURS;
      else process.env.TRIPLE_A_EVIDENCE_MAX_AGE_HOURS = previous;
    }
  });

  it('rejects an approved family policy with false authority or no finite limit', () => {
    const root = createRoot();
    const envelopePath = writeFamilyEnvelope(root, 'invalid-policy', 'CRITICAL-TESTS');

    const falseAuthority = approvedFamilyPolicy();
    falseAuthority['CRITICAL-TESTS'].approval = {
      status: 'APPROVED',
      decided_by: '',
      decided_at: '2020-01-01T00:00:00.000Z',
      reference: ''
    };
    const authorityResult = evaluate(root, envelopePath, 'CRITICAL-TESTS', falseAuthority);
    expect(authorityResult.status).toBe('FAIL');
    expect(authorityResult.reason).toContain('decisão de autoridade');

    const noLimit = approvedFamilyPolicy();
    const measurement = noLimit['CRITICAL-TESTS'].dimensions.execution.measurements.test_pass_ratio;
    measurement.min = null;
    measurement.max = null;
    const limitResult = evaluate(root, envelopePath, 'CRITICAL-TESTS', noLimit);
    expect(limitResult.status).toBe('FAIL');
    expect(limitResult.reason).toContain('sem limite numérico finito');
  });

  it('exposes all family dimensions from the immutable contract inventory', () => {
    for (const [evidenceId, requirement] of Object.entries(FAMILY_EVIDENCE_REQUIREMENTS)) {
      const contract = FAMILY_EVIDENCE_CONTRACTS[evidenceId as FamilyEvidenceId];
      expect(requirement.family).toBe(contract.family);
      expect(requirement.dimensions).toEqual(Object.keys(contract.profile.dimensions));
      expect(requirement.dimensions.length).toBeGreaterThan(0);
    }
    expect(Object.keys(FAMILY_EVIDENCE_REQUIREMENTS)).toHaveLength(13);
  });
});
