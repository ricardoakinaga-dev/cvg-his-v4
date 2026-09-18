import { createHash } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, writeFileSync } from 'node:fs';
import { basename, relative, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { REQUIRED_CI_JOB_NAMES } from './generate-ci-evidence.mjs';
import { verifySecurityReportAttestation } from './lib/security-evidence-attestation.mjs';

const DEFAULT_OUTPUT_DIR = 'artifacts/release';
const DEFAULT_FINAL_ARTIFACT_DIR = 'artifacts/triple-a';
const DEFAULT_EVIDENCE_MAX_AGE_HOURS = 7 * 24;
const EVIDENCE_CLOCK_SKEW_MS = 5 * 60 * 1000;
const OPERATIONAL_EVIDENCE_TYPE = 'cvg-his-operational-evidence';
const OPERATIONAL_EVIDENCE_SCHEMA_VERSION = 3;
const OPERATIONAL_EVIDENCE_VERIFIER_METHOD = 'github-artifact-attestation';
const OPERATIONAL_EVIDENCE_VERIFIER_ID = 'gh-attestation-verify';
const ATTESTATION_PREDICATE_TYPE = 'https://slsa.dev/provenance/v1';

/**
 * Root of trust for operational evidence. Only workflows listed here may attest
 * an operational envelope. This list is owned by this code and is never read
 * from the candidate envelope or from candidate-provided configuration;
 * extending it is an authorized CI-CONFIG decision, not a runtime option.
 */
export const TRUSTED_OPERATIONAL_SIGNER_WORKFLOWS = [
  '.github/workflows/release-artifacts.yml',
];

/**
 * Gate-owned sufficiency policy for operational evidence, one entry per
 * criterion. This is the single source of truth for the contract version, the
 * approved target set, the required measurements/units and the comparison
 * rules. It is code, never read from an envelope or from candidate-provided
 * configuration.
 *
 * `approval.status` starts as PENDING_AUTHORITY: the intake schema below is
 * frozen so MA-23/25/28 can produce evidence, but the thresholds (`min`/`max`)
 * and the approved targets are operational decisions that still need an
 * authorized sign-off. While a criterion is PENDING_AUTHORITY the gate can
 * validate integrity, authenticity and structure, but it must not emit PASS
 * for that criterion. When authority approves the policy, the same fields are
 * filled in the same table.
 */
export const OPERATIONAL_EVIDENCE_POLICY = {
  'OBSERVABILITY-EVIDENCE': {
    approval: { status: 'PENDING_AUTHORITY', decided_by: null, decided_at: null, reference: null },
    expected_targets: null,
    dimensions: {
      slo: { measurements: { slo_compliance_ratio: { unit: 'ratio', min: null } } },
      alerts: { measurements: { alert_delivery_seconds: { unit: 'seconds', max: null } } },
      tracing: { measurements: { trace_coverage_ratio: { unit: 'ratio', min: null } } },
      retention: { measurements: { retention_days: { unit: 'days', min: null } } },
      oncall: { measurements: { oncall_ack_seconds: { unit: 'seconds', max: null } } },
    },
  },
  PERFORMANCE: {
    approval: { status: 'PENDING_AUTHORITY', decided_by: null, decided_at: null, reference: null },
    expected_targets: null,
    dimensions: {
      targets: { measurements: { p95_latency_ms: { unit: 'ms', max: null } } },
      percentiles: { measurements: { p99_latency_ms: { unit: 'ms', max: null } } },
      saturation: { measurements: { cpu_saturation_ratio: { unit: 'ratio', max: null } } },
    },
  },
  SOAK: {
    approval: { status: 'PENDING_AUTHORITY', decided_by: null, decided_at: null, reference: null },
    expected_targets: null,
    dimensions: {
      duration: { measurements: { duration_hours: { unit: 'hours', min: null } } },
      stability: { measurements: { error_budget_burn_ratio: { unit: 'ratio', max: null } } },
      thresholds: { measurements: { p95_latency_ms: { unit: 'ms', max: null } } },
    },
  },
  ROLLBACK: {
    approval: { status: 'PENDING_AUTHORITY', decided_by: null, decided_at: null, reference: null },
    expected_targets: null,
    dimensions: {
      application_rollback: { measurements: { rollback_duration_seconds: { unit: 'seconds', max: null } } },
      data_consistency: { measurements: { consistency_check_failures: { unit: 'count', max: null } } },
    },
  },
};

/**
 * Criterion-specific result dimensions, derived from the policy so the two
 * never diverge. Names such as `duration`, `thresholds` or `data_consistency`
 * alone do not prove the property was measured; the policy also fixes which
 * measurements, units and comparison rules each dimension must satisfy.
 */
export const OPERATIONAL_EVIDENCE_REQUIREMENTS = Object.fromEntries(
  Object.entries(OPERATIONAL_EVIDENCE_POLICY).map(([id, policy]) => [
    id,
    { dimensions: Object.keys(policy.dimensions) },
  ])
);

const FAMILY_EVIDENCE_TYPE = 'cvg-his-family-evidence';
const FAMILY_EVIDENCE_SCHEMA_VERSION = 1;
const FAMILY_EVIDENCE_VERIFIER_METHOD = OPERATIONAL_EVIDENCE_VERIFIER_METHOD;
const FAMILY_EVIDENCE_VERIFIER_ID = OPERATIONAL_EVIDENCE_VERIFIER_ID;

/**
 * Family contracts for criteria that previously accepted the generic
 * external-envelope path. The dimensions and measurement names are owned by
 * this gate; producer-supplied limits, targets and status fields never become
 * policy. Numeric bounds and approved targets remain PENDING_AUTHORITY until
 * the responsible owners decide them, just like the operational policy above.
 *
 * Multiple criteria can share a family because the family verifier checks the
 * criterion_id as well as the exact contract dimensions. A test envelope
 * therefore cannot be replayed as RLS, deploy or authority evidence.
 */
const familyProfile = (family, issuer, dimensions) => ({
  family,
  issuer,
  producer_kind: issuer,
  dimensions,
});

/**
 * Criterion-specific profiles prevent a valid envelope for one test/deploy
 * claim from being replayed under another claim in the same family. The
 * `family` remains the owner of the producer/trust rules; dimensions and
 * measurement names are intentionally owned by the criterion contract.
 */
const FAMILY_EVIDENCE_PROFILES = {
  'CRITICAL-TESTS': familyProfile('tests', 'github-actions-workflow', {
    execution: { measurements: { test_pass_ratio: { unit: 'ratio', min: null } } },
    scope: { measurements: { required_case_ratio: { unit: 'ratio', min: null } } },
    failures: { measurements: { failed_case_count: { unit: 'count', max: null } } },
  }),
  E2E: familyProfile('tests', 'github-actions-workflow', {
    journeys: { measurements: { journey_pass_ratio: { unit: 'ratio', min: null } } },
    accessibility: { measurements: { required_accessibility_case_ratio: { unit: 'ratio', min: null } } },
    visual: { measurements: { visual_regression_failure_count: { unit: 'count', max: null } } },
  }),
  'WORKFLOW-POSTGRES': familyProfile('tests', 'github-actions-workflow', {
    database: { measurements: { integration_pass_ratio: { unit: 'ratio', min: null } } },
    transactions: { measurements: { rollback_failure_count: { unit: 'count', max: null } } },
    persistence: { measurements: { restart_failure_count: { unit: 'count', max: null } } },
  }),
  'WORKER-CRASH': familyProfile('tests', 'github-actions-workflow', {
    recovery: { measurements: { takeover_success_ratio: { unit: 'ratio', min: null } } },
    fencing: { measurements: { fencing_violation_count: { unit: 'count', max: null } } },
    delivery: { measurements: { unresolved_dlq_count: { unit: 'count', max: null } } },
  }),
  'CLINICAL-E2E': familyProfile('tests', 'github-actions-workflow', {
    safety: { measurements: { invariant_pass_ratio: { unit: 'ratio', min: null } } },
    negative: { measurements: { critical_violation_count: { unit: 'count', max: null } } },
    workflow: { measurements: { clinical_task_success_ratio: { unit: 'ratio', min: null } } },
  }),
  'AUDIT-INTEGRITY': familyProfile('tests', 'github-actions-workflow', {
    chain: { measurements: { append_only_pass_ratio: { unit: 'ratio', min: null } } },
    tamper: { measurements: { tamper_detection_failure_count: { unit: 'count', max: null } } },
    reconciliation: { measurements: { audit_gap_count: { unit: 'count', max: null } } },
  }),
  'RLS-RUNTIME': familyProfile('rls', 'github-actions-workflow', {
    isolation: { measurements: { cross_tenant_leak_count: { unit: 'count', max: null } } },
    authorization: { measurements: { unauthorized_access_count: { unit: 'count', max: null } } },
    force_rls: { measurements: { force_rls_failure_count: { unit: 'count', max: null } } },
  }),
  'BACKUP-DRILL': familyProfile('backup', 'github-actions-workflow', {
    restore: { measurements: { restore_success_ratio: { unit: 'ratio', min: null } } },
    integrity: { measurements: { integrity_failure_count: { unit: 'count', max: null } } },
    objectives: { measurements: { rto_seconds: { unit: 'seconds', max: null } } },
  }),
  'HOSPITAL-UAT': familyProfile('uat', 'human-uat', {
    tasks: { measurements: { task_success_ratio: { unit: 'ratio', min: null } } },
    safety: { measurements: { critical_blocker_count: { unit: 'count', max: null } } },
    profiles: { measurements: { accepted_profile_ratio: { unit: 'ratio', min: null } } },
  }),
  'DEPLOY-TARGET': familyProfile('deploy', 'github-actions-workflow', {
    readiness: { measurements: { readiness_success_ratio: { unit: 'ratio', min: null } } },
    identity: { measurements: { digest_mismatch_count: { unit: 'count', max: null } } },
    recovery: { measurements: { rollback_success_ratio: { unit: 'ratio', min: null } } },
  }),
  'HELM-TARGET': familyProfile('deploy', 'github-actions-workflow', {
    render: { measurements: { template_success_ratio: { unit: 'ratio', min: null } } },
    identity: { measurements: { digest_mismatch_count: { unit: 'count', max: null } } },
    target: { measurements: { target_binding_failure_count: { unit: 'count', max: null } } },
  }),
  'BRANCH-PROTECTION': familyProfile('protection', 'github-api', {
    enforcement: { measurements: { required_checks_ratio: { unit: 'ratio', min: null } } },
    bypass: { measurements: { unauthorized_bypass_count: { unit: 'count', max: null } } },
    binding: { measurements: { head_sha_mismatch_count: { unit: 'count', max: null } } },
  }),
  'RELEASE-AUTHORITY': familyProfile('authority', 'human-authority', {
    decision: { measurements: { approval_ratio: { unit: 'ratio', min: null } } },
    scope: { measurements: { candidate_binding_ratio: { unit: 'ratio', min: null } } },
    exceptions: { measurements: { unresolved_exception_count: { unit: 'count', max: null } } },
  }),
};

/**
 * IDs are deliberately enumerated instead of treating every unknown
 * criterion as a family. This makes a new release criterion fail closed until
 * its verifier and evidence contract are explicitly designed.
 */
export const FAMILY_EVIDENCE_CONTRACTS = Object.fromEntries(
  Object.entries(FAMILY_EVIDENCE_PROFILES).map(([id, profile]) => [id, {
    family: profile.family,
    profile,
  }])
);

export const FAMILY_EVIDENCE_REQUIREMENTS = Object.fromEntries(
  Object.entries(FAMILY_EVIDENCE_CONTRACTS).map(([id, contract]) => [
    id,
    {
      family: contract.family,
      dimensions: Object.keys(contract.profile.dimensions),
    },
  ])
);

export const FAMILY_EVIDENCE_POLICY = Object.fromEntries(
  Object.entries(FAMILY_EVIDENCE_CONTRACTS).map(([id, contract]) => [
    id,
    {
      approval: { status: 'PENDING_AUTHORITY', decided_by: null, decided_at: null, reference: null },
      expected_targets: null,
      dimensions: structuredClone(contract.profile.dimensions),
    },
  ])
);

const REQUIRED_POLICY_FILES = [
  'docs/engineering/GREEN_MAIN_POLICY.md',
  'docs/clinical/CLINICAL_CRITICALITY_MATRIX.md',
  'docs/clinical/CLINICAL_SAFETY_INVARIANTS.md',
  'docs/operations/JOB_RETRY_AND_DLQ_POLICY.md',
  'docs/operations/SLO_SLI_POLICY.md',
  'docs/operations/DISASTER_RECOVERY.md',
  'docs/operations/RPO_RTO_POLICY.md',
  'docs/operations/TRIPLE_A_PRODUCTION_CERTIFICATION.md',
  'docs/operations/FMEA.md',
  'docs/architecture/EVENT_GOVERNANCE.md',
  'docs/architecture/IDEMPOTENCY_MATRIX.md',
  'docs/engineering/DEPENDENCY_POLICY.md',
  'docs/security/SECURITY_TEST_MATRIX.md',
  'docs/operations/CLINICAL_WORKFLOW_TASK_CONTROL_PLANE.md',
  'docs/triple-a/14-external-evidence-baseline.md',
  'docs/engineering/BRANCH_GOVERNANCE.md',
  'docs/security/DATABASE_ROLE_MATRIX.md',
  'docs/operations/HOSPITAL_UAT_PROTOCOL.md',
  'docs/triple-a/security-final-critic.md',
  'docs/triple-a/clinical-final-critic.md',
  'docs/triple-a/operations-final-critic.md',
  'docs/triple-a/ux-final-critic.md',
];

const EXECUTABLE_CHECKS = [
  ['Documentation', 'pnpm', ['docs:validate']],
  ['Namespaces', 'pnpm', ['validate:namespaces']],
  ['Migration source', 'pnpm', ['validate:migration-source']],
  ['OpenAPI', 'pnpm', ['validate:openapi']],
  ['RLS static coverage', 'pnpm', ['validate:rls']],
  ['Deploy surface', 'pnpm', ['validate:deploy-surface']],
  ['Environment/runtime matrix', 'pnpm', ['validate:environment-runtime']],
  ['Identity contract PROD-019', 'pnpm', ['validate:identity-contract']],
  ['P0 registry', 'pnpm', ['validate:p0-registry']],
  ['Loyalty expiration contract PROD-052', 'pnpm', ['validate:loyalty-expiration-contract']],
  ['Behavioral parity contract PROD-027', 'pnpm', ['validate:behavioral-parity-contract']],
  ['Registry contract PROD-063', 'pnpm', ['validate:registry-contract']],
  ['Helm', 'pnpm', ['validate:helm']],
  ['Supply-chain pins', 'pnpm', ['validate:supply-chain']],
  ['Dependency policy', 'pnpm', ['validate:dependencies']],
  ['Clinical workflow schema', 'pnpm', ['validate:clinical-workflow']],
  ['Prompt traceability', 'pnpm', ['validate:prompt-traceability']],
  ['Secret scan', 'pnpm', ['security:secrets']],
  ['Complexity budget', 'pnpm', ['complexity:check']],
];

const BUILD_CHECKS = [
  // Workspace consumers resolve declarations from the packages' build outputs.
  // Materialize them first so assurance also works on a clean checkout.
  ['Build', 'pnpm', ['build']],
  ['Typecheck', 'pnpm', ['typecheck']],
  ['Lint', 'pnpm', ['lint']],
];

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function isIsoTimestamp(value) {
  return typeof value === 'string'
    && /T[^\s]*?(?:Z|[+-]\d{2}:?\d{2})$/.test(value)
    && Number.isFinite(Date.parse(value));
}

export function validateEvidenceFreshness({
  observedAt,
  now = new Date(),
  // Runtime environment cannot widen the gate's freshness window. Tests may
  // pass an explicit bound, but production callers use this gate-owned value.
  maxAgeHours = DEFAULT_EVIDENCE_MAX_AGE_HOURS,
  clockSkewMs = EVIDENCE_CLOCK_SKEW_MS,
}) {
  if (!isIsoTimestamp(observedAt)) {
    return { valid: false, reason: 'Evidence timestamp is not a valid ISO-8601 instant.' };
  }
  const observedMs = Date.parse(observedAt);
  const nowMs = now instanceof Date ? now.getTime() : Date.parse(now);
  if (!Number.isFinite(nowMs)) {
    return { valid: false, reason: 'Reference clock is invalid.' };
  }
  if (observedMs > nowMs + clockSkewMs) {
    return {
      valid: false,
      reason: `Evidence timestamp is in the future beyond the ${Math.round(clockSkewMs / 1000)}s clock-skew allowance.`,
    };
  }
  const ageMs = Math.max(0, nowMs - observedMs);
  const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
  if (!Number.isFinite(maxAgeMs) || maxAgeMs <= 0) {
    return { valid: false, reason: 'Evidence max age must be a positive finite duration.' };
  }
  if (ageMs > maxAgeMs) {
    return {
      valid: false,
      reason: `Evidence is ${Math.round(ageMs / 3_600_000)}h old; the maximum allowed age is ${maxAgeHours}h.`,
    };
  }
  return {
    valid: true,
    age_hours: ageMs / 3_600_000,
    max_age_hours: maxAgeHours,
  };
}

function isSafeEvidencePath(rootDir, candidate) {
  if (typeof candidate !== 'string' || candidate.length === 0) return false;
  try {
    const realRoot = realpathSync(rootDir);
    const resolved = resolve(realRoot, candidate);
    const relativePath = relative(realRoot, resolved);
    if (relativePath === '' || relativePath.startsWith('..') || relativePath.includes('..' + sep)) return false;
    const stat = lstatSync(resolved);
    return stat.isFile() && !stat.isSymbolicLink() && realpathSync(resolved) === resolved;
  } catch {
    return false;
  }
}

function validateCycloneDxSbom(rootDir, relativePath) {
  if (!isSafeEvidencePath(rootDir, relativePath)) {
    return { valid: false, reason: 'SBOM path is missing, outside the repository, or symlinked.' };
  }

  try {
    const sbom = readJson(resolve(rootDir, relativePath));
    const components = sbom?.components;
    const bomRefs = Array.isArray(components)
      ? components.map((component) => component?.['bom-ref']).filter((ref) => typeof ref === 'string')
      : [];
    const uniqueBomRefs = new Set(bomRefs);
    const valid = sbom?.bomFormat === 'CycloneDX'
      && typeof sbom.specVersion === 'string'
      && /^1\.[0-9]+$/.test(sbom.specVersion)
      && typeof sbom.serialNumber === 'string'
      && sbom.serialNumber.startsWith('urn:uuid:')
      && Number.isInteger(sbom.version)
      && sbom.version >= 1
      && sbom.metadata?.component?.type === 'application'
      && typeof sbom.metadata.component.name === 'string'
      && sbom.metadata.component.name.length > 0
      && Array.isArray(components)
      && components.length > 0
      && components.every((component) =>
        component
        && typeof component.type === 'string'
        && typeof component.name === 'string'
        && component.name.length > 0
        && typeof component.version === 'string'
        && component.version.length > 0
        && typeof component['bom-ref'] === 'string'
        && component['bom-ref'].length > 0
      )
      && bomRefs.length === components.length
      && uniqueBomRefs.size === components.length;

    return {
      valid,
      reason: valid
        ? 'CycloneDX SBOM structure and component references are valid.'
        : 'SBOM is not a valid non-empty CycloneDX document with unique component references.'
    };
  } catch (error) {
    return {
      valid: false,
      reason: `SBOM JSON could not be parsed: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

export function validateExternalEvidenceEnvelope({
  rootDir,
  value,
  artifact,
  commitSha,
  expectedEvidenceType = 'cvg-his-external-evidence',
  expectedSchemaVersion = 1,
}) {
  const producer = artifact?.producer;
  const verification = artifact?.verification;
  const artifactRefs = artifact?.artifacts;
  const validShape = artifact?.schema_version === expectedSchemaVersion
    && artifact?.evidence_type === expectedEvidenceType
    && artifact?.commit_sha === commitSha
    && artifact?.status === 'PASS'
    && isIsoTimestamp(artifact?.observed_at)
    && producer && typeof producer.kind === 'string' && producer.kind.length > 0
    && typeof producer.run_id === 'string' && producer.run_id.length > 0
    && verification && verification.verified === true
    && typeof verification.method === 'string' && verification.method.length > 0
    && typeof verification.verifier_id === 'string' && verification.verifier_id.length > 0
    && isIsoTimestamp(verification.verified_at)
    && Array.isArray(artifactRefs) && artifactRefs.length > 0;
  if (!validShape) {
    return {
      status: 'FAIL',
      path: value,
      reason: 'Envelope externo inválido: exige schema, SHA, status PASS, produtor, verificador, timestamps e artefatos.'
    };
  }

  const freshness = validateEvidenceFreshness({ observedAt: artifact.observed_at });
  if (!freshness.valid) {
    return {
      status: 'FAIL',
      path: value,
      reason: `Envelope externo expirado ou com relógio inválido: ${freshness.reason}`,
    };
  }

  for (const reference of artifactRefs) {
    if (!isSafeEvidencePath(rootDir, reference?.path)
      || !/^sha256:[0-9a-f]{64}$/i.test(reference?.sha256 ?? '')) {
      return {
        status: 'FAIL',
        path: value,
        reason: 'Envelope externo contém referência de artefato insegura ou sem SHA-256.'
      };
    }
    const artifactPath = resolve(rootDir, reference.path);
    let bytes;
    try {
      // Read each referenced artifact exactly once: the digest below is
      // computed over the same bytes this call consumed, so a later rewrite of
      // the path cannot change what was validated here.
      bytes = readFileSync(artifactPath);
    } catch {
      return {
        status: 'FAIL',
        path: value,
        reason: `Artefato referenciado ausente ou ilegível: ${reference.path}.`
      };
    }
    if (bytes.length === 0) {
      return {
        status: 'FAIL',
        path: value,
        reason: `Artefato referenciado está vazio: ${reference.path}.`
      };
    }
    const digest = createHash('sha256').update(bytes).digest('hex');
    if (digest !== reference.sha256.slice('sha256:'.length).toLowerCase()) {
      return {
        status: 'FAIL',
        path: value,
        reason: `Digest do artefato externo não confere: ${reference.path}.`
      };
    }
  }

  return {
    status: 'PASS',
    path: value,
    reason: 'Envelope externo validado por SHA do candidato, produtor/verificador e artefatos referenciados.'
  };
}

function currentCommit(rootDir) {
  const result = spawnSync('git', ['rev-parse', 'HEAD'], {
    cwd: rootDir,
    encoding: 'utf8',
    shell: false,
  });
  if (result.status !== 0) {
    throw new Error(result.stderr?.trim() || 'Não foi possível determinar o HEAD atual.');
  }
  return result.stdout.trim();
}

function compactOutput(output) {
  return String(output ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(-8)
    .join(' / ')
    .slice(0, 1200);
}

export function verifyCleanWorktree(rootDir) {
  // `--untracked-files=all` can expand a local evidence archive into hundreds
  // of thousands of paths and make Git's stdout exceed child_process' default
  // buffer before we can report the actual first dirty path. `normal` still
  // rejects tracked changes and untracked files while collapsing untracked
  // directories to one diagnostic line.
  const command = 'git status --porcelain=v1 --untracked-files=normal';
  const result = spawnSync('git', ['status', '--porcelain=v1', '--untracked-files=normal'], {
    cwd: rootDir,
    encoding: 'utf8',
    shell: false,
    maxBuffer: 16 * 1024 * 1024,
  });
  if (result.status !== 0) {
    return {
      area: 'Candidate integrity',
      command,
      status: 'FAIL',
      exit_code: result.status,
      evidence: result.stderr?.trim() || 'Não foi possível verificar o worktree.',
      limitation: 'O candidato não tem estado Git verificável.',
    };
  }
  const dirty = result.stdout.trim();
  return {
    area: 'Candidate integrity',
    command,
    status: dirty ? 'FAIL' : 'PASS',
    exit_code: dirty ? 1 : 0,
    evidence: dirty ? `Worktree sujo; primeira linha: ${dirty.split('\n')[0]}` : 'Worktree limpo.',
    limitation: dirty ? 'Checks locais não podem ser atribuídos ao commit semântico do candidato.' : null,
  };
}

export function runCheck({ rootDir, area, command, args, timeoutMs = 20 * 60 * 1000 }) {
  const startedAt = new Date().toISOString();
  const result = spawnSync(command, args, {
    cwd: rootDir,
    encoding: 'utf8',
    shell: false,
    timeout: timeoutMs,
    maxBuffer: 16 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  const timedOut = result.error?.code === 'ETIMEDOUT';
  const exitCode = timedOut ? null : result.status;
  return {
    area,
    command: [command, ...args].join(' '),
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    status: exitCode === 0 ? 'PASS' : 'FAIL',
    exit_code: exitCode,
    evidence: compactOutput(`${result.stdout ?? ''}\n${result.stderr ?? ''}`),
    limitation: timedOut ? `Comando excedeu o timeout de ${timeoutMs}ms.` : null,
  };
}

function skippedCheck(area, command, reason) {
  return {
    area,
    command,
    started_at: null,
    finished_at: null,
    status: 'NOT_RUN',
    exit_code: null,
    evidence: reason,
    limitation: reason,
  };
}

const RELEASE_IMAGE_COMPONENTS = ['api', 'worker', 'spa'];

function imageManifestByComponent(manifest) {
  return new Map(
    (Array.isArray(manifest?.images) ? manifest.images : [])
      .filter((image) => image !== null && typeof image === 'object')
      .map((image) => [image.component, image])
  );
}

function immutableImageReference(image) {
  const reference = image?.reference;
  const digest = image?.digest;
  if (
    typeof reference !== 'string'
    || reference.length === 0
    || reference.includes('@')
    || typeof digest !== 'string'
    || !/^sha256:[0-9a-f]{64}$/.test(digest)
  ) return null;
  const lastColon = reference.lastIndexOf(':');
  const lastSlash = reference.lastIndexOf('/');
  const repository = lastColon > lastSlash ? reference.slice(0, lastColon) : reference;
  return `${repository}@${digest}`;
}

function readReleaseManifest(outputDir) {
  const manifestPath = resolve(outputDir, 'release-manifest.json');
  if (!existsSync(manifestPath)) return null;
  try {
    return readJson(manifestPath);
  } catch {
    return null;
  }
}

/**
 * Parse the documented `gh attestation verify --format json` output.
 *
 * Contract (GitHub CLI manual, `gh attestation verify`): on success stdout is
 * a JSON array with one entry per verified attestation; each entry has
 * `attestation` and `verificationResult`, and `verificationResult.statement`
 * carries the `subject` array. The subject digest identifies what gh verified,
 * so the caller compares it with the exact bytes it consumed. Empty, malformed,
 * missing-subject or ambiguous output is rejected instead of being accepted as
 * "some non-empty JSON".
 */
export function parseAttestationVerificationOutput(stdout) {
  let parsed;
  try {
    parsed = JSON.parse(stdout ?? '');
  } catch {
    return { valid: false, reason: 'gh attestation verify retornou saída que não é JSON.' };
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    return { valid: false, reason: 'gh attestation verify retornou array JSON vazio.' };
  }
  const digests = new Set();
  for (const entry of parsed) {
    const subjects = entry?.verificationResult?.statement?.subject;
    if (!Array.isArray(subjects) || subjects.length === 0) {
      return { valid: false, reason: 'gh attestation verify não declarou subjects verificados.' };
    }
    for (const subject of subjects) {
      const digest = subject?.digest?.sha256;
      if (typeof digest !== 'string' || !/^[0-9a-f]{64}$/i.test(digest)) {
        return {
          valid: false,
          reason: 'gh attestation verify declarou subject sem digest sha256 válido.',
        };
      }
      digests.add(digest.toLowerCase());
    }
  }
  if (digests.size !== 1) {
    return {
      valid: false,
      reason: `gh attestation verify retornou subjects ambíguos (${digests.size} digests distintos).`,
    };
  }
  return {
    valid: true,
    subject_sha256: [...digests][0],
    verified_attestations: parsed.length,
    reason: 'Saída do gh attestation verify válida, com um único digest de subject.',
  };
}

/**
 * Re-runs the trust-bearing verifier instead of trusting a self-authored
 * evidence envelope. The release workflow sets TRIPLE_A_VERIFY_ATTESTATIONS
 * only after publishing and recording the exact image digests.
 */
export function verifyPublishedImageAttestations({ rootDir, outputDir, commitSha }) {
  if (process.env.TRIPLE_A_VERIFY_ATTESTATIONS !== '1') {
    return {
      status: 'PARTIAL',
      path: 'gh attestation verify',
      reason: 'O gate recebeu um envelope de attestation, mas o verificador gh não foi executado neste ambiente.'
    };
  }

  const manifest = readReleaseManifest(outputDir);
  if (!manifest || manifest.commit_sha !== commitSha) {
    return {
      status: 'FAIL',
      path: 'release-manifest.json',
      reason: 'Manifest ausente ou desvinculado do SHA antes da verificação criptográfica das imagens.'
    };
  }

  const repository = process.env.GITHUB_REPOSITORY;
  const ghToken = process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN;
  if (!repository || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository) || !ghToken) {
    return {
      status: 'FAIL',
      path: 'gh attestation verify',
      reason: 'GITHUB_REPOSITORY e GH_TOKEN são obrigatórios para verificar attestations publicadas.'
    };
  }

  const images = imageManifestByComponent(manifest);
  const signerWorkflow = `${repository}/.github/workflows/release-artifacts.yml`;
  for (const component of RELEASE_IMAGE_COMPONENTS) {
    const image = images.get(component);
    const expectedReference = new RegExp(
      `^ghcr\\.io\\/[^\\s/]+\\/cvg-his-v4-${component}@sha256:[0-9a-f]{64}$`
    );
    if (!image
      || image.immutable_reference !== immutableImageReference(image)
      || !expectedReference.test(image.immutable_reference ?? '')) {
      return {
        status: 'FAIL',
        path: 'release-manifest.json',
        reason: `Manifest não contém uma referência OCI imutável válida para a imagem ${component}.`
      };
    }

    const args = [
      'attestation',
      'verify',
      `oci://${image.immutable_reference}`,
      '--repo',
      repository,
      '--signer-workflow',
      signerWorkflow,
      '--source-ref',
      'main',
      '--source-digest',
      commitSha,
      '--predicate-type',
      ATTESTATION_PREDICATE_TYPE,
      '--format',
      'json'
    ];
    const result = spawnSync('gh', args, {
      cwd: rootDir,
      encoding: 'utf8',
      shell: false,
      env: { ...process.env, GH_TOKEN: ghToken },
      maxBuffer: 16 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    if (result.status !== 0) {
      return {
        status: 'FAIL',
        path: `oci://${image.immutable_reference}`,
        reason: `gh attestation verify falhou para ${component}: ${compactOutput(`${result.stdout ?? ''}\n${result.stderr ?? ''}\n${result.error?.message ?? ''}`)}`
      };
    }
    const verification = parseAttestationVerificationOutput(result.stdout);
    if (!verification.valid) {
      return {
        status: 'FAIL',
        path: `oci://${image.immutable_reference}`,
        reason: `gh attestation verify retornou JSON inválido para ${component}: ${verification.reason}`
      };
    }
    if (verification.subject_sha256 !== image.digest.slice('sha256:'.length).toLowerCase()) {
      return {
        status: 'FAIL',
        path: `oci://${image.immutable_reference}`,
        reason: `gh attestation verify autenticou um subject diferente do digest do manifest para ${component}.`
      };
    }
  }

  return {
    status: 'PASS',
    path: 'gh attestation verify',
    reason: 'As três imagens foram verificadas pelo GitHub CLI contra o repositório, workflow, branch e SHA do candidato.'
  };
}

function validateImageAttestationEnvelope({ rootDir, outputDir, value, artifact, commitSha }) {
  const base = validateExternalEvidenceEnvelope({ rootDir, value, artifact, commitSha });
  if (base.status !== 'PASS') return base;

  if (artifact.verification?.method !== 'github-cli-gh-attestation-verify'
    || artifact.verification?.verifier_id !== 'gh-attestation-verify') {
    return {
      status: 'FAIL',
      path: value,
      reason: 'Envelope de imagem não declara o verificador GitHub CLI obrigatório.'
    };
  }

  const manifest = readReleaseManifest(outputDir);
  const images = imageManifestByComponent(manifest);
  const attestations = artifact.attestations;
  const attestationShapeIsValid = Array.isArray(attestations)
    && attestations.length === RELEASE_IMAGE_COMPONENTS.length
    && RELEASE_IMAGE_COMPONENTS.every((component) => {
      const image = images.get(component);
      const attestation = attestations.find((item) => item?.component === component);
      return image
        && image.immutable_reference === immutableImageReference(image)
        && attestation?.subject_reference === image.reference
        && attestation?.subject_digest === image.digest
        && attestation?.subject_name === image.reference?.split(':')[0]
        && attestation?.attestation === 'actions/attest-build-provenance';
    });
  if (!manifest || manifest.commit_sha !== commitSha || !attestationShapeIsValid) {
    return {
      status: 'FAIL',
      path: value,
      reason: 'Envelope de imagem não corresponde exatamente ao manifest e aos três subjects por digest.'
    };
  }

  const verification = verifyPublishedImageAttestations({ rootDir, outputDir, commitSha });
  if (verification.status !== 'PASS') return verification;
  return {
    ...base,
    status: 'PASS',
    reason: verification.reason
  };
}

/**
 * Re-runs the trust-bearing attestation verifier for an operational envelope.
 * `gh attestation verify` checks the GitHub OIDC-backed provenance against the
 * repository, the code-pinned signer workflow, `main` and the candidate SHA.
 * The trusted workflow list is never taken from the envelope.
 *
 * `envelopeSha256` is the digest of the exact bytes the gate parsed. The
 * documented JSON output of the verifier is parsed and its subject digest must
 * equal that value, so a file swapped between read and verification cannot be
 * consumed under a different attestation. When the verifier cannot run the
 * result is PARTIAL (blocking), never PASS.
 */
export function verifyOperationalEvidenceAttestation({
  rootDir,
  envelopePath,
  envelopeSha256,
  evidenceId,
  commitSha,
  declaredWorkflow,
}) {
  const repository = process.env.GITHUB_REPOSITORY;
  const ghToken = process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN;
  if (!/^[0-9a-f]{64}$/i.test(envelopeSha256 ?? '')) {
    return {
      status: 'FAIL',
      reason: `Verificação de ${evidenceId} sem digest dos bytes consumidos; vínculo byte a byte ausente.`,
    };
  }
  if (!repository || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository) || !ghToken) {
    return {
      status: 'PARTIAL',
      reason: `GITHUB_REPOSITORY e GH_TOKEN são obrigatórios para verificar a attestation operacional de ${evidenceId}; PASS permanece bloqueado sem verificador confiável.`,
    };
  }
  if (!TRUSTED_OPERATIONAL_SIGNER_WORKFLOWS.includes(declaredWorkflow)) {
    return {
      status: 'FAIL',
      reason: `Workflow ${declaredWorkflow ?? 'ausente'} não pertence à raiz de confiança do projeto.`,
    };
  }
  const absolute = resolve(rootDir, envelopePath);
  if (!existsSync(absolute)) {
    return { status: 'FAIL', reason: `Envelope operacional ausente para verificação: ${envelopePath}.` };
  }

  const signerWorkflow = `${repository}/${declaredWorkflow}`;
  const result = spawnSync('gh', [
    'attestation',
    'verify',
    envelopePath,
    '--repo',
    repository,
    '--signer-workflow',
    signerWorkflow,
    '--source-ref',
    'main',
    '--source-digest',
    commitSha,
    '--predicate-type',
    ATTESTATION_PREDICATE_TYPE,
    '--format',
    'json',
  ], {
    cwd: rootDir,
    encoding: 'utf8',
    shell: false,
    env: { ...process.env, GH_TOKEN: ghToken },
    maxBuffer: 16 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.error?.code === 'ENOENT') {
    return {
      status: 'PARTIAL',
      reason: `Verificador gh indisponível neste ambiente; a attestation de ${evidenceId} não pôde ser confirmada e PASS permanece bloqueado.`,
    };
  }
  if (result.status !== 0) {
    return {
      status: 'FAIL',
      reason: `gh attestation verify falhou para ${evidenceId}: ${compactOutput(`${result.stdout ?? ''}\n${result.stderr ?? ''}\n${result.error?.message ?? ''}`)}`
    };
  }
  const verification = parseAttestationVerificationOutput(result.stdout);
  if (!verification.valid) {
    return {
      status: 'FAIL',
      reason: `gh attestation verify retornou JSON inválido para ${evidenceId}: ${verification.reason}`
    };
  }
  if (verification.subject_sha256 !== envelopeSha256.toLowerCase()) {
    return {
      status: 'FAIL',
      reason: `gh attestation verify autenticou um subject diferente dos bytes consumidos de ${evidenceId}.`
    };
  }
  return {
    status: 'PASS',
    workflow: declaredWorkflow,
    provenance: OPERATIONAL_EVIDENCE_VERIFIER_ID,
    subject_sha256: verification.subject_sha256,
    reason: `Attestation confirmada por gh para ${evidenceId} no workflow ${declaredWorkflow}, branch main, SHA do candidato e digest dos bytes consumidos.`,
  };
}

/**
 * Bound semantics for an approved policy rule: `null` and `undefined` mean the
 * side is absent; any present value must be a finite number (no strings,
 * booleans, objects, NaN or ±Infinity); at least one side must be present; and
 * an interval with both sides must not be inverted. Boundaries stay inclusive
 * in the comparison that follows.
 */
function approvedPolicyBoundState(value) {
  if (value === null || value === undefined) return { present: false, valid: true, value: null };
  if (typeof value === 'number' && Number.isFinite(value)) return { present: true, valid: true, value };
  return { present: true, valid: false, value: null };
}

function validateApprovedOperationalPolicy({ policy, evidenceId }) {
  const dimensions = policy?.dimensions;
  if (!dimensions || typeof dimensions !== 'object') {
    return { valid: false, reason: `Política aprovada de ${evidenceId} não define dimensões; configuração inválida.` };
  }
  for (const [dimensionId, dimension] of Object.entries(dimensions)) {
    const measurements = dimension?.measurements;
    if (!measurements || typeof measurements !== 'object' || Object.keys(measurements).length === 0) {
      return { valid: false, reason: `Política aprovada de ${evidenceId} sem medições para ${dimensionId}; configuração inválida.` };
    }
    for (const [name, spec] of Object.entries(measurements)) {
      const minBound = approvedPolicyBoundState(spec?.min);
      const maxBound = approvedPolicyBoundState(spec?.max);
      if (!minBound.valid || !maxBound.valid) {
        return {
          valid: false,
          reason: `Política aprovada de ${evidenceId} com limite não numérico ou não finito em ${dimensionId}.${name}; null/undefined significam lado ausente.`,
        };
      }
      if (!minBound.present && !maxBound.present) {
        return {
          valid: false,
          reason: `Política aprovada de ${evidenceId} sem limite numérico finito em ${dimensionId}.${name}; ao menos um lado (min/max) é obrigatório.`,
        };
      }
      if (minBound.present && maxBound.present && minBound.value > maxBound.value) {
        return {
          valid: false,
          reason: `Política aprovada de ${evidenceId} com intervalo invertido em ${dimensionId}.${name} (min ${minBound.value} > max ${maxBound.value}).`,
        };
      }
    }
  }
  return { valid: true };
}

/**
 * Operational envelope contract (v3).
 *
 * Layers kept separate and reported individually in `layers`:
 *  1. integrity    -> bytes, artifacts, digests, candidate SHA and freshness;
 *  2. authenticity -> externally re-run gh attestation verifier, byte-bound by
 *                     `envelopeSha256` and the subject digest of its output;
 *  3. sufficiency  -> measurements, units, approved target and comparison
 *                     rules owned by OPERATIONAL_EVIDENCE_POLICY;
 *  4. human acceptance -> release authority, outside this function.
 *
 * A signature only authenticates a declaration. PASS also requires measurements
 * that satisfy a gate-owned policy; while that policy is PENDING_AUTHORITY the
 * best result is PARTIAL.
 */
export function validateOperationalEvidenceEnvelope({
  rootDir,
  value,
  artifact,
  commitSha,
  evidenceId,
  envelopeSha256,
  verifyOperationalEvidence = verifyOperationalEvidenceAttestation,
  operationalPolicy = OPERATIONAL_EVIDENCE_POLICY,
}) {
  const layers = { integrity: 'PASS', authenticity: 'NOT_EVALUATED', sufficiency: 'NOT_EVALUATED' };
  const requirements = OPERATIONAL_EVIDENCE_REQUIREMENTS[evidenceId];
  const policy = operationalPolicy?.[evidenceId];
  if (!requirements || !policy) {
    return {
      status: 'FAIL',
      path: value,
      reason: `Critério operacional sem contrato de confiança definido: ${evidenceId}.`,
      layers: { ...layers, integrity: 'FAIL' },
    };
  }
  if (typeof envelopeSha256 !== 'string' || !/^[0-9a-f]{64}$/i.test(envelopeSha256)) {
    return {
      status: 'FAIL',
      path: value,
      reason: `Envelope operacional de ${evidenceId} sem digest dos bytes consumidos; vínculo byte a byte obrigatório.`,
      layers: { ...layers, integrity: 'FAIL' },
    };
  }
  const base = validateExternalEvidenceEnvelope({
    rootDir,
    value,
    artifact,
    commitSha,
    expectedEvidenceType: OPERATIONAL_EVIDENCE_TYPE,
    expectedSchemaVersion: OPERATIONAL_EVIDENCE_SCHEMA_VERSION,
  });
  if (base.status !== 'PASS') {
    return { ...base, layers: { ...layers, integrity: 'FAIL' } };
  }

  const verification = artifact?.verification;
  if (verification?.method !== OPERATIONAL_EVIDENCE_VERIFIER_METHOD
    || verification?.verifier_id !== OPERATIONAL_EVIDENCE_VERIFIER_ID) {
    return {
      status: 'FAIL',
      path: value,
      reason: 'Envelope operacional não declara o verificador de attestation obrigatório (github-artifact-attestation/gh-attestation-verify).',
      layers: { ...layers, authenticity: 'FAIL' },
    };
  }
  const declaredWorkflow = typeof artifact?.producer?.workflow === 'string'
    ? artifact.producer.workflow
    : null;
  if (!declaredWorkflow || !TRUSTED_OPERATIONAL_SIGNER_WORKFLOWS.includes(declaredWorkflow)) {
    return {
      status: 'FAIL',
      path: value,
      reason: `Workflow produtor fora da raiz de confiança do projeto: ${declaredWorkflow ?? 'ausente'}.`,
      layers: { ...layers, authenticity: 'FAIL' },
    };
  }

  const observedMs = Date.parse(artifact.observed_at);
  const verifiedFreshness = validateEvidenceFreshness({ observedAt: verification.verified_at });
  if (!verifiedFreshness.valid) {
    return {
      status: 'FAIL',
      path: value,
      reason: `Envelope operacional com verified_at inválido ou no futuro: ${verifiedFreshness.reason}`,
      layers: { ...layers, integrity: 'FAIL' },
    };
  }
  if (Date.parse(verification.verified_at) < observedMs - EVIDENCE_CLOCK_SKEW_MS) {
    return {
      status: 'FAIL',
      path: value,
      reason: 'Envelope operacional com verified_at anterior à observação declarada.',
      layers: { ...layers, integrity: 'FAIL' },
    };
  }

  const target = artifact?.target;
  if (!target
    || typeof target.environment !== 'string' || target.environment.length === 0
    || typeof target.reference !== 'string' || target.reference.length === 0) {
    return {
      status: 'FAIL',
      path: value,
      reason: 'Envelope operacional sem vínculo de alvo (target.environment e target.reference obrigatórios).',
      layers: { ...layers, sufficiency: 'FAIL' },
    };
  }

  const results = artifact?.results;
  if (!results || results.outcome !== 'PASS' || !Array.isArray(results.dimensions)) {
    return {
      status: 'FAIL',
      path: value,
      reason: 'Envelope operacional sem results.outcome=PASS e results.dimensions.',
      layers: { ...layers, sufficiency: 'FAIL' },
    };
  }
  const declaredArtifacts = new Set((artifact.artifacts ?? []).map((reference) => reference?.path));
  const dimensions = results.dimensions;
  // Duplicate dimension IDs are rejected before any map is built: otherwise a
  // second, favorable entry would overwrite a failed measurement. No
  // first-wins, last-wins or silent deduplication is allowed.
  const seenDimensionIds = new Set();
  const duplicateDimensionIds = new Set();
  for (const dimension of dimensions) {
    const id = dimension?.id;
    if (seenDimensionIds.has(id)) duplicateDimensionIds.add(id);
    else seenDimensionIds.add(id);
  }
  if (duplicateDimensionIds.size > 0) {
    return {
      status: 'FAIL',
      path: value,
      reason: `Envelope operacional de ${evidenceId} contém dimensões duplicadas: ${[...duplicateDimensionIds].map((id) => String(id)).join(', ')}.`,
      layers: { ...layers, sufficiency: 'FAIL' },
    };
  }
  const dimensionIds = new Set(dimensions.map((dimension) => dimension?.id));
  const missingDimensions = requirements.dimensions.filter((id) => !dimensionIds.has(id));
  if (missingDimensions.length > 0) {
    return {
      status: 'FAIL',
      path: value,
      reason: `Envelope operacional incompleto para ${evidenceId}: dimensões ausentes ${missingDimensions.join(', ')}.`,
      layers: { ...layers, sufficiency: 'FAIL' },
    };
  }
  const measurementsById = new Map();
  for (const dimension of dimensions) {
    const dimensionPolicy = policy.dimensions[dimension?.id];
    if (!dimensionPolicy) {
      return {
        status: 'FAIL',
        path: value,
        reason: `Dimensão não prevista no critério ${evidenceId}: ${dimension?.id}.`,
        layers: { ...layers, sufficiency: 'FAIL' },
      };
    }
    if (dimension?.status !== 'PASS') {
      return {
        status: 'FAIL',
        path: value,
        reason: `Dimensão ${dimension?.id} não está PASS em ${evidenceId}.`,
        layers: { ...layers, sufficiency: 'FAIL' },
      };
    }
    if (typeof dimension?.artifact !== 'string' || !declaredArtifacts.has(dimension.artifact)) {
      return {
        status: 'FAIL',
        path: value,
        reason: `Dimensão ${dimension?.id} não referencia um artefato declarado em ${evidenceId}.`,
        layers: { ...layers, sufficiency: 'FAIL' },
      };
    }
    if (!Array.isArray(dimension.measurements) || dimension.measurements.length === 0) {
      return {
        status: 'FAIL',
        path: value,
        reason: `Dimensão ${dimension.id} de ${evidenceId} não declara medições; status=PASS não substitui medição.`,
        layers: { ...layers, sufficiency: 'FAIL' },
      };
    }
    const measurements = new Map();
    for (const measurement of dimension.measurements) {
      const name = measurement?.name;
      if (typeof name !== 'string' || name.length === 0 || measurements.has(name)
        || typeof measurement?.value !== 'number' || !Number.isFinite(measurement.value)
        || typeof measurement?.unit !== 'string' || measurement.unit.length === 0) {
        return {
          status: 'FAIL',
          path: value,
          reason: `Dimensão ${dimension.id} de ${evidenceId} contém medição malformada.`,
          layers: { ...layers, sufficiency: 'FAIL' },
        };
      }
      measurements.set(name, measurement);
    }
    for (const [name, spec] of Object.entries(dimensionPolicy.measurements)) {
      const measurement = measurements.get(name);
      if (!measurement) {
        return {
          status: 'FAIL',
          path: value,
          reason: `Dimensão ${dimension.id} de ${evidenceId} sem a medição obrigatória ${name}.`,
          layers: { ...layers, sufficiency: 'FAIL' },
        };
      }
      if (measurement.unit !== spec.unit) {
        return {
          status: 'FAIL',
          path: value,
          reason: `Medição ${name} de ${evidenceId} usa unidade ${measurement.unit}; esperada ${spec.unit}.`,
          layers: { ...layers, sufficiency: 'FAIL' },
        };
      }
    }
    measurementsById.set(dimension.id, measurements);
  }

  let sufficiency = 'PENDING';
  if (policy.approval?.status !== 'APPROVED') {
    layers.sufficiency = 'PENDING';
  } else {
    const policyValidation = validateApprovedOperationalPolicy({ policy, evidenceId });
    if (!policyValidation.valid) {
      return {
        status: 'FAIL',
        path: value,
        reason: policyValidation.reason,
        layers: { ...layers, sufficiency: 'FAIL' },
      };
    }
    if (!Array.isArray(policy.expected_targets) || policy.expected_targets.length === 0) {
      return {
        status: 'FAIL',
        path: value,
        reason: `Política aprovada de ${evidenceId} não define alvos aprovados; configuração inválida.`,
        layers: { ...layers, sufficiency: 'FAIL' },
      };
    }
    if (!policy.expected_targets.includes(target.environment)) {
      return {
        status: 'FAIL',
        path: value,
        reason: `Alvo ${target.environment} de ${evidenceId} não pertence aos alvos aprovados.`,
        layers: { ...layers, sufficiency: 'FAIL' },
      };
    }
    for (const dimension of dimensions) {
      for (const [name, spec] of Object.entries(policy.dimensions[dimension.id].measurements)) {
        const hasMin = !(spec.min === null || spec.min === undefined);
        const hasMax = !(spec.max === null || spec.max === undefined);
        const measured = measurementsById.get(dimension.id).get(name).value;
        if (hasMin && measured < spec.min) {
          return {
            status: 'FAIL',
            path: value,
            reason: `Medição ${name}=${measured} de ${evidenceId} abaixo do mínimo aprovado ${spec.min}.`,
            layers: { ...layers, sufficiency: 'FAIL' },
          };
        }
        if (hasMax && measured > spec.max) {
          return {
            status: 'FAIL',
            path: value,
            reason: `Medição ${name}=${measured} de ${evidenceId} acima do máximo aprovado ${spec.max}.`,
            layers: { ...layers, sufficiency: 'FAIL' },
          };
        }
      }
    }
    sufficiency = 'PASS';
    layers.sufficiency = 'PASS';
  }

  const verificationResult = verifyOperationalEvidence({
    rootDir,
    envelopePath: value,
    envelopeSha256,
    evidenceId,
    commitSha,
    declaredWorkflow,
  });
  if (!verificationResult) {
    layers.authenticity = 'PARTIAL';
    return {
      status: 'PARTIAL',
      path: value,
      reason: `Verificador confiável não retornou resultado para ${evidenceId}; PASS permanece bloqueado.`,
      layers,
    };
  }
  if (verificationResult.status === 'FAIL') {
    layers.authenticity = 'FAIL';
    return {
      status: 'FAIL',
      path: value,
      reason: verificationResult.reason ?? `Verificador rejeitou a attestation de ${evidenceId}.`,
      layers,
    };
  }
  if (verificationResult.status === 'PARTIAL') {
    layers.authenticity = 'PARTIAL';
    return {
      status: 'PARTIAL',
      path: value,
      reason: verificationResult.reason
        ?? `Verificador indisponível para ${evidenceId}; PASS permanece bloqueado.`,
      layers,
    };
  }
  if (verificationResult.status !== 'PASS') {
    layers.authenticity = 'FAIL';
    return {
      status: 'FAIL',
      path: value,
      reason: `Saída inválida do verificador de ${evidenceId}: um status reconhecível (PASS/FAIL/PARTIAL) é obrigatório.`,
      layers,
    };
  }
  if (verificationResult.workflow && verificationResult.workflow !== declaredWorkflow) {
    return {
      status: 'FAIL',
      path: value,
      reason: `Attestation verificada por workflow divergente do declarado em ${evidenceId}: ${verificationResult.workflow}.`,
      layers: { ...layers, authenticity: 'FAIL' },
    };
  }
  if (verificationResult.subject_sha256 !== envelopeSha256.toLowerCase()) {
    return {
      status: 'FAIL',
      path: value,
      reason: `Verificador autenticou subject diferente dos bytes consumidos de ${evidenceId}.`,
      layers: { ...layers, authenticity: 'FAIL' },
    };
  }
  layers.authenticity = 'PASS';
  if (sufficiency !== 'PASS') {
    return {
      status: 'PARTIAL',
      path: value,
      reason: `Integridade e autenticidade de ${evidenceId} confirmadas, mas a suficiência operacional está pendente de decisão de autoridade (approval=${policy.approval?.status ?? 'ausente'}); PASS permanece bloqueado.`,
      layers,
    };
  }
  return {
    status: 'PASS',
    path: value,
    reason: `Attestation (${verificationResult.provenance ?? OPERATIONAL_EVIDENCE_VERIFIER_ID}) confirmada no workflow ${declaredWorkflow}; medições, alvo e dimensões de ${evidenceId} satisfazem a política aprovada.`,
    verification_provenance: verificationResult.provenance ?? OPERATIONAL_EVIDENCE_VERIFIER_ID,
    verified_workflow: verificationResult.workflow ?? declaredWorkflow,
    layers,
  };
}

function exactKeys(value, expected) {
  const actual = value && typeof value === 'object' ? Object.keys(value) : [];
  return actual.length === expected.length && expected.every((key) => actual.includes(key));
}

function hasUntrustedLimitDeclaration(value) {
  return ['limits', 'thresholds', 'expected_targets', 'policy'].some((key) =>
    Object.prototype.hasOwnProperty.call(value ?? {}, key)
  );
}

function validateFamilyPolicyShape({ evidenceId, contract, policy }) {
  const dimensions = policy?.dimensions;
  const expectedDimensionIds = Object.keys(contract.profile.dimensions);
  if (!dimensions || typeof dimensions !== 'object' || !exactKeys(dimensions, expectedDimensionIds)) {
    return {
      valid: false,
      reason: `Política de ${evidenceId} não corresponde exatamente às dimensões do contrato da família ${contract.family}.`,
    };
  }
  for (const dimensionId of expectedDimensionIds) {
    const expectedMeasurements = contract.profile.dimensions[dimensionId].measurements;
    const measurementNames = Object.keys(expectedMeasurements);
    const actualMeasurements = dimensions[dimensionId]?.measurements;
    if (!actualMeasurements
      || typeof actualMeasurements !== 'object'
      || !exactKeys(actualMeasurements, measurementNames)) {
      return {
        valid: false,
        reason: `Política de ${evidenceId} não corresponde às medições de ${dimensionId}; a régua deve ser gate-owned.`,
      };
    }
    for (const name of measurementNames) {
      if (actualMeasurements[name]?.unit !== expectedMeasurements[name].unit) {
        return {
          valid: false,
          reason: `Política de ${evidenceId} usa unidade divergente em ${dimensionId}.${name}.`,
        };
      }
    }
  }
  return { valid: true };
}

function validateFamilyAuthorityRecord({ artifact, evidenceId, observedAt, value, layers }) {
  const authorization = artifact?.authorization;
  const invalid = !authorization
    || authorization.decision !== 'APPROVED'
    || typeof authorization.approver_id !== 'string'
    || authorization.approver_id.length === 0
    || typeof authorization.approver_role !== 'string'
    || authorization.approver_role.length === 0
    || typeof authorization.reference !== 'string'
    || authorization.reference.length === 0
    || !isIsoTimestamp(authorization.approved_at);
  if (invalid) {
    return {
      status: 'FAIL',
      path: value,
      reason: `Evidência de ${evidenceId} exige registro de autoridade APPROVED com aprovador, papel, referência e approved_at.`,
      layers: { ...layers, sufficiency: 'FAIL' },
    };
  }
  const freshness = validateEvidenceFreshness({ observedAt: authorization.approved_at });
  if (!freshness.valid) {
    return {
      status: 'FAIL',
      path: value,
      reason: `Registro de autoridade de ${evidenceId} expirado ou com relógio inválido: ${freshness.reason}`,
      layers: { ...layers, sufficiency: 'FAIL' },
    };
  }
  if (Date.parse(authorization.approved_at) < Date.parse(observedAt) - EVIDENCE_CLOCK_SKEW_MS) {
    return {
      status: 'FAIL',
      path: value,
      reason: `Registro de autoridade de ${evidenceId} foi aprovado antes da observação declarada.`,
      layers: { ...layers, sufficiency: 'FAIL' },
    };
  }
  return null;
}

/**
 * Family-specific evidence intake (PROD-062).
 *
 * This dispatcher is deliberately stricter than the generic v1 envelope. It
 * binds the exact criterion and family, requires gate-owned measurements and
 * approved target/bounds, and uses the same independently rerun attestation
 * verifier as operational evidence. A producer can declare a PASS, a target
 * or a limit, but none of those declarations are trusted without the family
 * contract, byte-bound verifier and (where applicable) authority record.
 */
export function validateFamilyEvidenceEnvelope({
  rootDir,
  value,
  artifact,
  commitSha,
  evidenceId,
  envelopeSha256,
  verifyOperationalEvidence = verifyOperationalEvidenceAttestation,
  familyEvidencePolicy = FAMILY_EVIDENCE_POLICY,
}) {
  const layers = { integrity: 'PASS', authenticity: 'NOT_EVALUATED', sufficiency: 'NOT_EVALUATED' };
  const contract = FAMILY_EVIDENCE_CONTRACTS[evidenceId];
  const policy = familyEvidencePolicy?.[evidenceId];
  if (!contract || !policy) {
    return {
      status: 'FAIL',
      path: value,
      reason: `Critério sem contrato de família definido para PROD-062: ${evidenceId}.`,
      layers: { ...layers, integrity: 'FAIL' },
    };
  }
  if (!isSafeEvidencePath(rootDir, value)) {
    return {
      status: 'FAIL',
      path: value,
      reason: `Envelope de ${evidenceId} precisa ser um arquivo local seguro dentro do repositório.`,
      layers: { ...layers, integrity: 'FAIL' },
    };
  }
  if (typeof envelopeSha256 !== 'string' || !/^[0-9a-f]{64}$/i.test(envelopeSha256)) {
    return {
      status: 'FAIL',
      path: value,
      reason: `Envelope de ${evidenceId} sem digest dos bytes consumidos; vínculo byte a byte obrigatório.`,
      layers: { ...layers, integrity: 'FAIL' },
    };
  }

  const base = validateExternalEvidenceEnvelope({
    rootDir,
    value,
    artifact,
    commitSha,
    expectedEvidenceType: FAMILY_EVIDENCE_TYPE,
    expectedSchemaVersion: FAMILY_EVIDENCE_SCHEMA_VERSION,
  });
  if (base.status !== 'PASS') return { ...base, layers: { ...layers, integrity: 'FAIL' } };

  if (artifact?.criterion_id !== evidenceId
    || artifact?.family !== contract.family
    || artifact?.contract_version !== FAMILY_EVIDENCE_SCHEMA_VERSION) {
    return {
      status: 'FAIL',
      path: value,
      reason: `Envelope de ${evidenceId} não corresponde exatamente ao critério, família ou versão contratual.`,
      layers: { ...layers, sufficiency: 'FAIL' },
    };
  }
  if (hasUntrustedLimitDeclaration(artifact) || hasUntrustedLimitDeclaration(artifact.results)) {
    return {
      status: 'FAIL',
      path: value,
      reason: `Envelope de ${evidenceId} contém alvo/limite/política declarados pelo produtor; somente a política gate-owned pode decidir suficiência.`,
      layers: { ...layers, sufficiency: 'FAIL' },
    };
  }

  const producer = artifact.producer;
  const expectedProducer = contract.profile.producer_kind;
  if (producer?.kind !== expectedProducer || producer?.issuer !== contract.profile.issuer) {
    return {
      status: 'FAIL',
      path: value,
      reason: `Issuer/produtor inválido para ${evidenceId}: esperado ${contract.profile.issuer}/${expectedProducer}.`,
      layers: { ...layers, authenticity: 'FAIL' },
    };
  }
  const verification = artifact.verification;
  if (verification?.method !== FAMILY_EVIDENCE_VERIFIER_METHOD
    || verification?.verifier_id !== FAMILY_EVIDENCE_VERIFIER_ID) {
    return {
      status: 'FAIL',
      path: value,
      reason: `Envelope de ${evidenceId} não declara o verificador de attestation obrigatório.`,
      layers: { ...layers, authenticity: 'FAIL' },
    };
  }
  const declaredWorkflow = producer.workflow;
  if (!TRUSTED_OPERATIONAL_SIGNER_WORKFLOWS.includes(declaredWorkflow)) {
    return {
      status: 'FAIL',
      path: value,
      reason: `Workflow produtor fora da raiz de confiança para ${evidenceId}: ${declaredWorkflow ?? 'ausente'}.`,
      layers: { ...layers, authenticity: 'FAIL' },
    };
  }

  const observedMs = Date.parse(artifact.observed_at);
  const verifiedFreshness = validateEvidenceFreshness({ observedAt: verification.verified_at });
  if (!verifiedFreshness.valid || Date.parse(verification.verified_at) < observedMs - EVIDENCE_CLOCK_SKEW_MS) {
    return {
      status: 'FAIL',
      path: value,
      reason: `Envelope de ${evidenceId} tem verified_at inválido, futuro ou anterior à observação.`,
      layers: { ...layers, integrity: 'FAIL' },
    };
  }

  const target = artifact.target;
  if (!target
    || typeof target.environment !== 'string' || target.environment.length === 0
    || typeof target.reference !== 'string' || target.reference.length === 0) {
    return {
      status: 'FAIL',
      path: value,
      reason: `Envelope de ${evidenceId} sem vínculo de alvo (environment/reference obrigatórios).`,
      layers: { ...layers, sufficiency: 'FAIL' },
    };
  }

  const results = artifact.results;
  if (!results || results.outcome !== 'PASS' || !Array.isArray(results.dimensions)) {
    return {
      status: 'FAIL',
      path: value,
      reason: `Envelope de ${evidenceId} sem results.outcome=PASS e dimensions.`,
      layers: { ...layers, sufficiency: 'FAIL' },
    };
  }
  const contractDimensionIds = Object.keys(contract.profile.dimensions);
  const dimensions = results.dimensions;
  const seenDimensionIds = new Set();
  const duplicateDimensionIds = new Set();
  for (const dimension of dimensions) {
    if (seenDimensionIds.has(dimension?.id)) duplicateDimensionIds.add(dimension?.id);
    else seenDimensionIds.add(dimension?.id);
  }
  if (duplicateDimensionIds.size > 0) {
    return {
      status: 'FAIL',
      path: value,
      reason: `Envelope de ${evidenceId} contém dimensões duplicadas: ${[...duplicateDimensionIds].map((id) => String(id)).join(', ')}.`,
      layers: { ...layers, sufficiency: 'FAIL' },
    };
  }
  if (!exactKeys(Object.fromEntries(dimensions.map((dimension) => [dimension?.id, true])), contractDimensionIds)) {
    return {
      status: 'FAIL',
      path: value,
      reason: `Envelope de ${evidenceId} não cobre exatamente as dimensões da família ${contract.family}.`,
      layers: { ...layers, sufficiency: 'FAIL' },
    };
  }

  const declaredArtifacts = new Set((artifact.artifacts ?? []).map((reference) => reference?.path));
  const measurementsById = new Map();
  for (const dimension of dimensions) {
    const dimensionPolicy = contract.profile.dimensions[dimension.id];
    if (hasUntrustedLimitDeclaration(dimension)) {
      return {
        status: 'FAIL',
        path: value,
        reason: `Dimensão ${dimension.id} de ${evidenceId} contém alvo/limite/política declarados pelo produtor.`,
        layers: { ...layers, sufficiency: 'FAIL' },
      };
    }
    if (dimension.status !== 'PASS') {
      return {
        status: 'FAIL',
        path: value,
        reason: `Dimensão ${dimension.id} não está PASS em ${evidenceId}.`,
        layers: { ...layers, sufficiency: 'FAIL' },
      };
    }
    if (typeof dimension.artifact !== 'string' || !declaredArtifacts.has(dimension.artifact)) {
      return {
        status: 'FAIL',
        path: value,
        reason: `Dimensão ${dimension.id} de ${evidenceId} não referencia artefato declarado.`,
        layers: { ...layers, sufficiency: 'FAIL' },
      };
    }
    if (!Array.isArray(dimension.measurements) || dimension.measurements.length === 0) {
      return {
        status: 'FAIL',
        path: value,
        reason: `Dimensão ${dimension.id} de ${evidenceId} não declara medições.`,
        layers: { ...layers, sufficiency: 'FAIL' },
      };
    }
    const expectedMeasurementNames = Object.keys(dimensionPolicy.measurements);
    const measurementNames = dimension.measurements.map((measurement) => measurement?.name);
    if (new Set(measurementNames).size !== measurementNames.length
      || !exactKeys(Object.fromEntries(measurementNames.map((name) => [name, true])), expectedMeasurementNames)) {
      return {
        status: 'FAIL',
        path: value,
        reason: `Medições de ${dimension.id} em ${evidenceId} não correspondem exatamente ao contrato gate-owned.`,
        layers: { ...layers, sufficiency: 'FAIL' },
      };
    }
    const measurements = new Map();
    for (const measurement of dimension.measurements) {
      const name = measurement?.name;
      if (typeof name !== 'string'
        || typeof measurement?.value !== 'number'
        || !Number.isFinite(measurement.value)
        || typeof measurement?.unit !== 'string'
        || measurement.unit.length === 0
        || ['min', 'max', 'limit', 'threshold'].some((key) =>
          Object.prototype.hasOwnProperty.call(measurement, key))) {
        return {
          status: 'FAIL',
          path: value,
          reason: `Medição ${name ?? 'ausente'} de ${evidenceId} é inválida ou tenta declarar limite.`,
          layers: { ...layers, sufficiency: 'FAIL' },
        };
      }
      if (measurement.unit !== dimensionPolicy.measurements[name].unit) {
        return {
          status: 'FAIL',
          path: value,
          reason: `Medição ${name} de ${evidenceId} usa unidade ${measurement.unit}; esperada ${dimensionPolicy.measurements[name].unit}.`,
          layers: { ...layers, sufficiency: 'FAIL' },
        };
      }
      measurements.set(name, measurement);
    }
    measurementsById.set(dimension.id, measurements);
  }

  const policyShape = validateFamilyPolicyShape({ evidenceId, contract, policy });
  if (!policyShape.valid) {
    return {
      status: 'FAIL',
      path: value,
      reason: policyShape.reason,
      layers: { ...layers, sufficiency: 'FAIL' },
    };
  }

  let sufficiency = 'PENDING';
  if (policy.approval?.status === 'PENDING_AUTHORITY') {
    layers.sufficiency = 'PENDING';
  } else if (policy.approval?.status !== 'APPROVED') {
    return {
      status: 'FAIL',
      path: value,
      reason: `Política de ${evidenceId} tem estado de autoridade inválido; somente PENDING_AUTHORITY ou APPROVED são aceitos.`,
      layers: { ...layers, sufficiency: 'FAIL' },
    };
  } else {
    const approval = policy.approval;
    if (typeof approval.decided_by !== 'string'
      || approval.decided_by.length === 0
      || typeof approval.reference !== 'string'
      || approval.reference.length === 0
      || !isIsoTimestamp(approval.decided_at)
      || !validateEvidenceFreshness({ observedAt: approval.decided_at }).valid) {
      return {
        status: 'FAIL',
        path: value,
        reason: `Política aprovada de ${evidenceId} não tem decisão de autoridade válida e fresca.`,
        layers: { ...layers, sufficiency: 'FAIL' },
      };
    }
    const policyValidation = validateApprovedOperationalPolicy({ policy, evidenceId });
    if (!policyValidation.valid) {
      return {
        status: 'FAIL',
        path: value,
        reason: policyValidation.reason,
        layers: { ...layers, sufficiency: 'FAIL' },
      };
    }
    if (!Array.isArray(policy.expected_targets)
      || policy.expected_targets.length === 0
      || !policy.expected_targets.every((targetName) => typeof targetName === 'string' && targetName.length > 0)) {
      return {
        status: 'FAIL',
        path: value,
        reason: `Política aprovada de ${evidenceId} não define alvos aprovados válidos.`,
        layers: { ...layers, sufficiency: 'FAIL' },
      };
    }
    if (!policy.expected_targets.includes(target.environment)) {
      return {
        status: 'FAIL',
        path: value,
        reason: `Alvo ${target.environment} de ${evidenceId} não pertence aos alvos aprovados.`,
        layers: { ...layers, sufficiency: 'FAIL' },
      };
    }
    for (const dimension of dimensions) {
      for (const [name, spec] of Object.entries(policy.dimensions[dimension.id].measurements)) {
        const measured = measurementsById.get(dimension.id).get(name).value;
        if (spec.min !== null && spec.min !== undefined && measured < spec.min) {
          return {
            status: 'FAIL',
            path: value,
            reason: `Medição ${name}=${measured} de ${evidenceId} abaixo do mínimo aprovado ${spec.min}.`,
            layers: { ...layers, sufficiency: 'FAIL' },
          };
        }
        if (spec.max !== null && spec.max !== undefined && measured > spec.max) {
          return {
            status: 'FAIL',
            path: value,
            reason: `Medição ${name}=${measured} de ${evidenceId} acima do máximo aprovado ${spec.max}.`,
            layers: { ...layers, sufficiency: 'FAIL' },
          };
        }
      }
    }
    sufficiency = 'PASS';
    layers.sufficiency = 'PASS';
  }

  if (contract.family === 'authority') {
    const authorityResult = validateFamilyAuthorityRecord({
      artifact,
      evidenceId,
      observedAt: artifact.observed_at,
      value,
      layers,
    });
    if (authorityResult) return authorityResult;
  }

  const verificationResult = verifyOperationalEvidence({
    rootDir,
    envelopePath: value,
    envelopeSha256,
    evidenceId,
    commitSha,
    declaredWorkflow,
  });
  if (!verificationResult) {
    layers.authenticity = 'PARTIAL';
    return {
      status: 'PARTIAL',
      path: value,
      reason: `Verificador confiável não retornou resultado para ${evidenceId}; PASS permanece bloqueado.`,
      layers,
    };
  }
  if (verificationResult.status === 'FAIL') {
    layers.authenticity = 'FAIL';
    return {
      status: 'FAIL',
      path: value,
      reason: verificationResult.reason ?? `Verificador rejeitou a attestation de ${evidenceId}.`,
      layers,
    };
  }
  if (verificationResult.status === 'PARTIAL') {
    layers.authenticity = 'PARTIAL';
    return {
      status: 'PARTIAL',
      path: value,
      reason: verificationResult.reason ?? `Verificador indisponível para ${evidenceId}; PASS permanece bloqueado.`,
      layers,
    };
  }
  if (verificationResult.status !== 'PASS') {
    layers.authenticity = 'FAIL';
    return {
      status: 'FAIL',
      path: value,
      reason: `Saída inválida do verificador de ${evidenceId}: status PASS/FAIL/PARTIAL é obrigatório.`,
      layers,
    };
  }
  if (verificationResult.workflow && verificationResult.workflow !== declaredWorkflow) {
    return {
      status: 'FAIL',
      path: value,
      reason: `Attestation verificada por workflow divergente do declarado em ${evidenceId}.`,
      layers: { ...layers, authenticity: 'FAIL' },
    };
  }
  if (verificationResult.subject_sha256 !== envelopeSha256.toLowerCase()) {
    return {
      status: 'FAIL',
      path: value,
      reason: `Verificador autenticou subject diferente dos bytes consumidos de ${evidenceId}.`,
      layers: { ...layers, authenticity: 'FAIL' },
    };
  }
  layers.authenticity = 'PASS';
  if (sufficiency !== 'PASS') {
    return {
      status: 'PARTIAL',
      path: value,
      reason: `Integridade e autenticidade de ${evidenceId} confirmadas, mas a suficiência está pendente de autoridade (approval=${policy.approval?.status ?? 'ausente'}); PASS permanece bloqueado.`,
      layers,
    };
  }
  return {
    status: 'PASS',
    path: value,
    reason: `Attestation (${verificationResult.provenance ?? FAMILY_EVIDENCE_VERIFIER_ID}) confirmada; família ${contract.family}, alvo, medições e política aprovada de ${evidenceId} conferem.`,
    verification_provenance: verificationResult.provenance ?? FAMILY_EVIDENCE_VERIFIER_ID,
    verified_workflow: verificationResult.workflow ?? declaredWorkflow,
    layers,
  };
}

function envEvidence(rootDir, name, commitSha, outputDir, {
  evidenceId = null,
  verifyOperationalEvidence = verifyOperationalEvidenceAttestation,
  operationalPolicy = OPERATIONAL_EVIDENCE_POLICY,
  familyEvidencePolicy = FAMILY_EVIDENCE_POLICY,
} = {}) {
  const value = process.env[name];
  if (!value) return null;
  const declaredCommit = process.env[`${name}_COMMIT_SHA`] ?? process.env.TRIPLE_A_EVIDENCE_COMMIT_SHA;
  const operationalId = evidenceId && OPERATIONAL_EVIDENCE_REQUIREMENTS[evidenceId] ? evidenceId : null;
  if (/^https?:\/\//.test(value)) {
    return declaredCommit === commitSha
      ? { status: 'PARTIAL', path: value, reason: 'Link informado e vinculado ao SHA, mas o conteúdo remoto precisa ser baixado/verificado como artefato attestado.' }
      : {
          status: 'FAIL',
          path: value,
          reason: `Link sem vínculo verificável ao SHA do candidato; informe ${name}_COMMIT_SHA ou TRIPLE_A_EVIDENCE_COMMIT_SHA.`,
        };
  }
  const path = resolve(rootDir, value);
  const familyId = evidenceId && FAMILY_EVIDENCE_REQUIREMENTS[evidenceId] ? evidenceId : null;
  if (familyId && !isSafeEvidencePath(rootDir, value)) {
    return {
      status: 'FAIL',
      path: value,
      reason: `Envelope de ${familyId} precisa ser um arquivo local seguro dentro do repositório.`,
    };
  }
  let bytes;
  try {
    // Single read: the digest and the parsed artifact below come from the same
    // bytes, which are the value the verifier must authenticate.
    bytes = readFileSync(path);
  } catch {
    return { status: 'FAIL', path: value, reason: 'Caminho informado não existe ou não pôde ser lido.' };
  }
  const envelopeSha256 = createHash('sha256').update(bytes).digest('hex');
  let artifact;
  try {
    artifact = JSON.parse(bytes.toString('utf8'));
  } catch {
    if (operationalId) {
      return {
        status: 'FAIL',
        path: value,
        reason: `Evidência operacional ${operationalId} deve ser um envelope JSON attestado; arquivo não interpretável foi rejeitado.`,
      };
    }
    return declaredCommit === commitSha
      ? { status: 'PARTIAL', path: value, reason: 'Artefato não-JSON tem vínculo explícito ao SHA, mas seu conteúdo não foi interpretado pelo gate.' }
      : {
          status: 'FAIL',
          path: value,
          reason: `Artefato não-JSON sem vínculo verificável; informe ${name}_COMMIT_SHA ou TRIPLE_A_EVIDENCE_COMMIT_SHA.`,
        };
  }
  if (operationalId) {
    return validateOperationalEvidenceEnvelope({
      rootDir,
      value,
      artifact,
      commitSha,
      evidenceId: operationalId,
      envelopeSha256,
      verifyOperationalEvidence,
      operationalPolicy,
    });
  }
  if (familyId) {
    return validateFamilyEvidenceEnvelope({
      rootDir,
      value,
      artifact,
      commitSha,
      evidenceId: familyId,
      envelopeSha256,
      verifyOperationalEvidence,
      familyEvidencePolicy,
    });
  }
  if (name === 'TRIPLE_A_CI_EVIDENCE') {
    return validateCiEvidenceEnvelope({ rootDir, value, artifact, commitSha });
  }
  if (name === 'TRIPLE_A_IMAGE_ATTESTATION_EVIDENCE') {
    return validateImageAttestationEnvelope({ rootDir, outputDir, value, artifact, commitSha });
  }
  const envelope = validateExternalEvidenceEnvelope({ rootDir, value, artifact, commitSha });
  if (envelope.status !== 'PASS') return envelope;
  return {
    ...envelope,
    status: 'PARTIAL',
    reason: 'Envelope genérico íntegro, porém sem raiz de confiança própria; PASS exige verificação externa por critério e nunca é promovido por flag de ambiente.'
  };
}

function runGhJson(rootDir, args) {
  const result = spawnSync('gh', ['api', ...args], {
    cwd: rootDir,
    encoding: 'utf8',
    shell: false,
    env: { ...process.env, GH_TOKEN: process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN },
    maxBuffer: 16 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.status !== 0) {
    return {
      value: null,
      reason: `${result.stderr ?? ''} ${result.error?.message ?? ''}`.trim() || `gh exited ${result.status}`,
    };
  }
  try {
    return { value: JSON.parse(result.stdout ?? ''), reason: null };
  } catch (error) {
    return { value: null, reason: `gh retornou JSON inválido: ${error.message}` };
  }
}

export function validateCiEvidenceEnvelope({ rootDir, value, artifact, commitSha }) {
  const base = validateExternalEvidenceEnvelope({
    rootDir,
    value,
    artifact,
    commitSha,
    expectedEvidenceType: 'cvg-his-ci-evidence',
  });
  if (base.status !== 'PASS') return base;

  if (artifact.verification.method !== 'github-api-workflow-run'
    || artifact.verification.verifier_id !== 'release-ci-run-verifier') {
    return {
      status: 'FAIL',
      path: value,
      reason: 'Envelope CI não declara o verificador GitHub API obrigatório.'
    };
  }

  const jobs = Array.isArray(artifact.jobs) ? artifact.jobs : [];
  const jobsByName = new Map(jobs.map((job) => [job?.name, job]));
  const missing = REQUIRED_CI_JOB_NAMES.filter((name) => !jobsByName.has(name));
  const unsuccessful = REQUIRED_CI_JOB_NAMES
    .map((name) => jobsByName.get(name))
    .filter((job) => job?.status !== 'completed' || job?.conclusion !== 'success');
  const runShapeIsValid = artifact.run
    && artifact.run.id?.toString() === artifact.producer.run_id
    && artifact.run.name === 'CI'
    && artifact.run.event === 'push'
    && artifact.run.head_branch === 'main'
    && artifact.run.head_sha === commitSha
    && artifact.run.status === 'completed'
    && artifact.run.conclusion === 'success';
  const expectedRunId = process.env.TRIPLE_A_CI_RUN_ID;
  if (!runShapeIsValid || (expectedRunId && expectedRunId !== artifact.producer.run_id) || missing.length || unsuccessful.length) {
    return {
      status: 'FAIL',
      path: value,
      reason: `Envelope CI inválido: run=${runShapeIsValid ? 'ok' : 'invalid'}; expected_run=${expectedRunId ?? 'none'}; actual_run=${artifact.producer.run_id}; missing=${missing.join(',') || 'none'}; unsuccessful=${unsuccessful.map((job) => `${job?.name ?? 'missing'}:${job?.conclusion ?? job?.status ?? 'absent'}`).join(',') || 'none'}.`
    };
  }

  if (process.env.TRIPLE_A_VERIFY_CI_EVIDENCE !== '1') {
    return {
      status: 'PARTIAL',
      path: value,
      reason: 'Envelope CI e jobs conferem, mas a execução remota precisa ser reconsultada pelo verificador gh neste ambiente.'
    };
  }
  const repository = process.env.GITHUB_REPOSITORY;
  const runId = artifact.producer.run_id;
  const ghToken = process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN;
  if (!repository || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository) || !ghToken || !/^\d+$/.test(runId)) {
    return {
      status: 'FAIL',
      path: value,
      reason: 'GITHUB_REPOSITORY, GH_TOKEN e run_id numérico são obrigatórios para verificar o CI remoto.'
    };
  }
  const remoteRun = runGhJson(rootDir, [
    `repos/${repository}/actions/runs/${runId}`,
    '--header',
    'Accept: application/vnd.github+json',
  ]);
  const remoteJobs = runGhJson(rootDir, [
    `repos/${repository}/actions/runs/${runId}/jobs?per_page=100`,
    '--header',
    'Accept: application/vnd.github+json',
  ]);
  const remoteJobList = Array.isArray(remoteJobs.value)
    ? remoteJobs.value.flatMap((page) => Array.isArray(page?.jobs) ? page.jobs : [])
    : remoteJobs.value?.jobs ?? [];
  const remoteJobsByName = new Map(remoteJobList.map((job) => [job?.name, job]));
  const remoteMatches = remoteRun.value
    && remoteRun.value.id?.toString() === runId
    && remoteRun.value.name === 'CI'
    && remoteRun.value.event === 'push'
    && remoteRun.value.head_branch === 'main'
    && remoteRun.value.head_sha === commitSha
    && remoteRun.value.status === 'completed'
    && remoteRun.value.conclusion === 'success'
    && REQUIRED_CI_JOB_NAMES.every((name) => {
      const job = remoteJobsByName.get(name);
      return job?.status === 'completed' && job?.conclusion === 'success';
    });
  if (!remoteMatches) {
    return {
      status: 'FAIL',
      path: value,
      reason: `A verificação gh do CI remoto falhou: ${remoteRun.reason ?? remoteJobs.reason ?? 'run ou jobs não correspondem ao candidato.'}`
    };
  }
  return {
    status: 'PASS',
    path: value,
    reason: 'CI remoto reconsultado pelo GitHub CLI: run, SHA, branch, evento e todos os jobs obrigatórios conferem.'
  };
}

export function verifyReleaseManifest({ rootDir, outputDir, commitSha }) {
  const manifestPath = resolve(outputDir, 'release-manifest.json');
  if (!existsSync(manifestPath)) {
    return {
      area: 'Release identity',
      status: 'NOT_RUN',
      evidence: 'release-manifest.json não foi encontrado.',
      artifacts: [],
    };
  }

  try {
    const manifest = readJson(manifestPath);
    const imageComponents = new Set((manifest.images ?? []).map((image) => image.component));
    const completeImages = Array.isArray(manifest.images)
      && manifest.images.length === 3
      && imageComponents.size === 3
      && ['api', 'worker', 'spa'].every((component) => imageComponents.has(component))
      && manifest.images.every((image) =>
        /^sha256:[0-9a-f]{64}$/.test(image.digest ?? '') &&
        typeof image.immutable_reference === 'string' &&
        image.immutable_reference === immutableImageReference(image)
      );
    const sbomPath = manifest.sbom;
    const sbom = typeof sbomPath === 'string'
      ? validateCycloneDxSbom(rootDir, sbomPath)
      : { valid: false, reason: 'Manifest does not reference a SBOM.' };
    const sbomFile = typeof sbomPath === 'string'
      ? manifest.files?.find((file) => file?.path === sbomPath)
      : undefined;
    const sbomDigestMatches = typeof sbomPath === 'string'
      && isSafeEvidencePath(rootDir, sbomPath)
      && Boolean(sbomFile)
      && sbomFile?.sha256 === sha256(resolve(rootDir, sbomPath));
    const sbomAliasPath = manifest.sbom_alias;
    const sbomAliasFile = typeof sbomAliasPath === 'string'
      ? manifest.files?.find((file) => file?.path === sbomAliasPath)
      : undefined;
    const sbomAliasMatches = typeof sbomAliasPath === 'string'
      && basename(sbomAliasPath) === 'sbom.cdx.json'
      && isSafeEvidencePath(rootDir, sbomAliasPath)
      && Boolean(sbomAliasFile)
      && sbomAliasFile?.sha256 === sha256(resolve(rootDir, sbomAliasPath))
      && typeof sbomPath === 'string'
      && isSafeEvidencePath(rootDir, sbomPath)
      && readFileSync(resolve(rootDir, sbomAliasPath), 'utf8') === readFileSync(resolve(rootDir, sbomPath), 'utf8');
    const manifestAliasPath = resolve(outputDir, 'enterprise-release-manifest.json');
    const manifestAliasMatches = existsSync(manifestAliasPath)
      && readFileSync(manifestAliasPath, 'utf8') === readFileSync(manifestPath, 'utf8');
    const sourcePath = manifest.source?.path;
    const sourceFile = typeof sourcePath === 'string'
      ? manifest.files?.find((file) => file?.path === sourcePath)
      : undefined;
    const sourceDigestMatches = typeof sourcePath === 'string'
      && isSafeEvidencePath(rootDir, sourcePath)
      && Boolean(sourceFile)
      && sourceFile?.sha256 === sha256(resolve(rootDir, sourcePath))
      && manifest.source?.sha256 === sourceFile.sha256
      && manifest.source_hash === sourceFile.sha256;
    const migrationFiles = Array.isArray(manifest.migration_state?.files)
      ? manifest.migration_state.files
      : [];
    const migrationDirectory = resolve(rootDir, 'packages/db/migrations');
    const actualMigrationNames = existsSync(migrationDirectory)
      ? readdirSync(migrationDirectory, { withFileTypes: true })
          .filter((entry) => entry.isFile() && entry.name.endsWith('.sql'))
          .map((entry) => entry.name)
          .sort()
      : [];
    const declaredMigrationNames = migrationFiles.map((file) => file?.name).sort();
    const migrationHashesValid = migrationFiles.every((file) => {
      const migrationPath = `packages/db/migrations/${file?.name ?? ''}`;
      return typeof file?.name === 'string'
        && isSafeEvidencePath(rootDir, migrationPath)
        && /^[0-9a-f]{64}$/.test(file.sha256 ?? '')
        && sha256(resolve(rootDir, migrationPath)) === file.sha256;
    });
    const migrationSourceHash = createHash('sha256')
      .update(migrationFiles.map((file) => `${file.name}:${file.sha256}`).join('\n'))
      .digest('hex');
    const migrationStateValid = manifest.migration_state?.runner === 'packages/db/src/migrate.ts'
      && manifest.migration_state?.source_directory === 'packages/db/migrations'
      && manifest.migration_state?.count === migrationFiles.length
      && manifest.migration_state?.count === actualMigrationNames.length
      && JSON.stringify(declaredMigrationNames) === JSON.stringify(actualMigrationNames)
      && manifest.migration_state?.latest === actualMigrationNames.at(-1)
      && manifest.migration_state?.source_sha256 === migrationSourceHash
      && migrationHashesValid;
    const manifestFilesByPath = new Map((manifest.files ?? []).map((file) => [file?.path, file]));
    const attestationReferencesValid = Array.isArray(manifest.attestation_references)
      && manifest.attestation_references.length === RELEASE_IMAGE_COMPONENTS.length
      && manifest.attestation_references.every((reference) =>
        isSafeEvidencePath(rootDir, reference?.path)
        && manifestFilesByPath.get(reference.path)?.sha256 === reference.sha256
        && /^[0-9a-f]{64}$/.test(reference.sha256 ?? '')
      );
    const evidenceReferencesValid = Array.isArray(manifest.evidence_references)
      && manifest.evidence_references.every((reference) =>
        isSafeEvidencePath(rootDir, reference?.path)
        && manifestFilesByPath.get(reference.path)?.sha256 === reference.sha256
        && /^[0-9a-f]{64}$/.test(reference.sha256 ?? '')
      );
    const valid = manifest.commit_sha === commitSha
      && completeImages
      && sbom.valid
      && sbomDigestMatches
      && sbomAliasMatches
      && manifestAliasMatches
      && sourceDigestMatches
      && migrationStateValid
      && attestationReferencesValid
      && evidenceReferencesValid;
    return {
      area: 'Release identity',
      status: valid ? 'PASS' : 'FAIL',
      evidence: valid
        ? 'Manifest vinculado ao commit atual, com três imagens por digest e SBOM CycloneDX íntegro.'
        : `Manifest existe, mas não está completo, não prova SBOM CycloneDX íntegro (${sbom.reason}), source/migration/evidências não conferem, ou não está vinculado ao commit atual.`,
      artifacts: [relative(rootDir, manifestPath)],
    };
  } catch (error) {
    return {
      area: 'Release identity',
      status: 'FAIL',
      evidence: `Manifest inválido: ${error.message}`,
      artifacts: [relative(rootDir, manifestPath)],
    };
  }
}

export function verifySecurityEvidence({ rootDir, outputDir, commitSha }) {
  const evidencePath = resolve(outputDir, 'security-evidence.json');
  if (!existsSync(evidencePath)) {
    return {
      area: 'Security evidence',
      status: 'NOT_RUN',
      evidence: 'security-evidence.json não foi encontrado.',
      artifacts: [],
    };
  }
  try {
    const reportRelativePath = relative(rootDir, evidencePath);
    if (!isSafeEvidencePath(rootDir, reportRelativePath)) throw new Error('Unsafe security report path');
    const reportBytes = readFileSync(evidencePath);
    const reportSha256 = createHash('sha256').update(reportBytes).digest('hex');
    const report = JSON.parse(reportBytes.toString('utf8'));
    const freshness = validateEvidenceFreshness({ observedAt: report.generatedAt });
    const semgrepPass = Array.isArray(report.semgrepCi)
      && report.semgrepCi.length > 0
      && report.semgrepCi.every((check) => check.status === 'PASS');
    const sbomPath = report.sbom?.path;
    const sbom = typeof sbomPath === 'string'
      ? validateCycloneDxSbom(rootDir, sbomPath)
      : { valid: false, reason: 'Security report does not reference a SBOM.' };
    const sbomDigestMatches = typeof sbomPath === 'string'
      && /^[0-9a-f]{64}$/i.test(report.sbom?.sha256 ?? '')
      && isSafeEvidencePath(rootDir, sbomPath)
      && sha256(resolve(rootDir, sbomPath)) === report.sbom.sha256.toLowerCase();
    const structurallyValid = report.status === 'PASS'
      && report.securityAudit === 'PASS'
      && semgrepPass
      && report.commit_sha === commitSha
      && freshness.valid
      && sbom.valid
      && sbomDigestMatches
      && report.sbom.components === readJson(resolve(rootDir, sbomPath)).components.length;
    if (!structurallyValid) {
      return {
        area: 'Security evidence', status: 'FAIL',
        evidence: `Security evidence existe, mas não prova checks PASS, frescor, digest/SBOM CycloneDX íntegro (${sbom.reason}) ou vínculo ao commit atual.`,
        artifacts: [reportRelativePath],
      };
    }
    const authenticity = verifySecurityReportAttestation({
      rootDir, reportPath: evidencePath, reportSha256, commitSha,
    });
    if (!isSafeEvidencePath(rootDir, reportRelativePath)
        || sha256(evidencePath) !== reportSha256
        || !isSafeEvidencePath(rootDir, sbomPath)
        || sha256(resolve(rootDir, sbomPath)) !== report.sbom.sha256.toLowerCase()) {
      throw new Error('Security report or SBOM changed during attestation verification');
    }
    return {
      area: 'Security evidence', status: authenticity.status,
      evidence: authenticity.reason, artifacts: [reportRelativePath],
    };
  } catch (error) {
    return {
      area: 'Security evidence',
      status: 'FAIL',
      evidence: `Security evidence inválida: ${error.message}`,
      artifacts: [relative(rootDir, evidencePath)],
    };
  }
}

export function scoreCriteria(criteria) {
  const scoreFor = (status) => ({ PASS: 1, PARTIAL: 0.5 }[status] ?? 0);
  const applicable = criteria.filter((criterion) => criterion.status !== 'NOT_APPLICABLE');
  const total = applicable.length || 1;
  const critical = applicable.filter((criterion) => criterion.priority === 'P0');
  const criticalTotal = critical.length || 1;
  return {
    score: Math.round((applicable.reduce((sum, criterion) => sum + scoreFor(criterion.status), 0) / total) * 100),
    critical_score: Math.round((critical.reduce((sum, criterion) => sum + scoreFor(criterion.status), 0) / criticalTotal) * 100),
    open_p0: applicable.filter((criterion) => criterion.priority === 'P0' && criterion.status !== 'PASS').length,
  };
}

function criterion(id, area, priority, description, status, evidenceRefs, limitations = []) {
  return { id, area, priority, description, status, evidence_refs: evidenceRefs, limitations };
}

function combineStatuses(statuses) {
  if (statuses.some((status) => status === 'FAIL')) return 'FAIL';
  if (statuses.some((status) => status === 'NOT_RUN')) return 'NOT_RUN';
  if (statuses.some((status) => status === 'PARTIAL')) return 'PARTIAL';
  return statuses.length > 0 && statuses.every((status) => status === 'PASS') ? 'PASS' : 'NOT_RUN';
}

function partialWhenIncomplete(statuses) {
  if (statuses.some((status) => status === 'FAIL')) return 'FAIL';
  if (statuses.length > 0 && statuses.every((status) => status === 'PASS')) return 'PASS';
  if (statuses.some((status) => status === 'PARTIAL')) return 'PARTIAL';
  return statuses.length > 0 ? 'PARTIAL' : 'NOT_RUN';
}

function currentCriterion(criteria, id) {
  return criteria.find((item) => item.id === id) ?? null;
}

function currentStatus(criteria, id) {
  return currentCriterion(criteria, id)?.status ?? 'NOT_RUN';
}

function currentAreaStatus(criteria, area) {
  return combineStatuses(criteria.filter((item) => item.area === area).map((item) => item.status));
}

function finalArtifactSection(criteria, ids) {
  const evidence = evidenceFor(criteria, ids);
  return {
    status: combineStatuses(ids.map((id) => currentStatus(criteria, id))),
    evidence_refs: evidence.refs,
    limitations: evidence.limitations,
  };
}

function evidenceFor(criteria, ids) {
  const selected = ids.map((id) => currentCriterion(criteria, id)).filter(Boolean);
  return {
    refs: [...new Set(selected.flatMap((item) => item.evidence_refs ?? []))],
    limitations: [...new Set(selected.flatMap((item) => item.limitations ?? []))],
  };
}

function fileEvidence(rootDir, paths) {
  const existing = paths.filter((path) => existsSync(resolve(rootDir, path)));
  const missing = paths.filter((path) => !existsSync(resolve(rootDir, path)));
  return {
    status: missing.length > 0 ? 'FAIL' : 'PASS',
    refs: existing,
    limitations: missing.map((path) => `Arquivo obrigatório ausente: ${path}.`),
  };
}

const PREPUBLICATION_NOT_APPLICABLE = new Set([
  'MAIN-002',
  'SUPPLY-001',
  'RELEASE-001',
  'CLIN-001',
  'WORKER-001',
  'DATA-001',
  'REC-001',
  'OPS-001',
  'PERF-001',
  'UX-001',
  'FINAL-001',
]);

/**
 * Evaluate the frozen quality-bar criteria from the current candidate evidence.
 * The source QUALITY_BAR_V1.json remains immutable; its stored status is kept as
 * frozen_status and never treated as current evidence.
 */
export function evaluateQualityBar({ rootDir, qualityBar, criteria, phase = 'postpublication' }) {
  const prepublication = phase === 'prepublication';
  const definitions = new Map();
  const add = (id, status, ids = [], extraRefs = [], extraLimitations = []) => {
    const source = evidenceFor(criteria, ids);
    const notApplicable = prepublication && PREPUBLICATION_NOT_APPLICABLE.has(id);
    definitions.set(id, {
      status: notApplicable ? 'NOT_APPLICABLE' : status,
      refs: [...new Set([...source.refs, ...extraRefs])],
      limitations: [...new Set([
        ...source.limitations,
        ...extraLimitations,
        ...(notApplicable ? ['Este critério só é aplicável ao gate pós-publicação.'] : []),
      ])],
    });
  };
  const all = (ids) => combineStatuses(ids.map((id) => currentStatus(criteria, id)));
  const baselineFiles = fileEvidence(rootDir, [
    'docs/engineering/TRIPLE_A_BASELINE.md',
    'docs/triple-a/00-baseline.md',
  ]);
  add('BASE-001', all(['PROMPT-HASH', 'EXTERNAL-PROMPT-HASH']), ['PROMPT-HASH', 'EXTERNAL-PROMPT-HASH']);
  add('BASE-002', combineStatuses([
    baselineFiles.status,
    currentAreaStatus(criteria, 'Candidate integrity'),
  ]), ['CMD-01'], baselineFiles.refs, baselineFiles.limitations);

  add('MAIN-001', currentStatus(criteria, 'CI-REMOTE'), ['CI-REMOTE']);
  const greenMainPolicy = fileEvidence(rootDir, ['docs/engineering/GREEN_MAIN_POLICY.md']);
  const branchStatus = currentStatus(criteria, 'BRANCH-PROTECTION');
  add(
    'MAIN-002',
    greenMainPolicy.status === 'FAIL' ? 'FAIL' : branchStatus === 'PASS' ? 'PASS' : 'PARTIAL',
    ['BRANCH-PROTECTION'],
    greenMainPolicy.refs,
    [...greenMainPolicy.limitations, ...(branchStatus === 'PASS' ? [] : ['Branch protection/required checks não têm evidência autenticada PASS no candidato.'])]
  );

  const supplyChainStatus = currentAreaStatus(criteria, 'Supply-chain pins');
  add('SUPPLY-001', partialWhenIncomplete([
    currentStatus(criteria, 'SECURITY-EVIDENCE'),
    currentStatus(criteria, 'IMAGE-ATTESTATIONS'),
    supplyChainStatus,
  ]), [
    'SECURITY-EVIDENCE', 'IMAGE-ATTESTATIONS'
  ], [], supplyChainStatus === 'PASS' ? [] : ['O validator local de pins não substitui verificação externa de assinatura/proveniência das imagens.']);
  add('RELEASE-001', all([
    'RELEASE-MANIFEST', 'SECURITY-EVIDENCE', 'CI-REMOTE', 'BACKUP-DRILL',
    'PERFORMANCE', 'E2E', 'WORKER-CRASH', 'HOSPITAL-UAT'
  ]), [
    'RELEASE-MANIFEST', 'SECURITY-EVIDENCE', 'CI-REMOTE', 'BACKUP-DRILL',
    'PERFORMANCE', 'E2E', 'WORKER-CRASH', 'HOSPITAL-UAT'
  ]);

  const clinicalFiles = fileEvidence(rootDir, [
    'docs/clinical/CLINICAL_CRITICALITY_MATRIX.md',
    'docs/clinical/CLINICAL_SAFETY_INVARIANTS.md',
  ]);
  add('CLIN-001', combineStatuses([
    clinicalFiles.status,
    currentStatus(criteria, 'CRITICAL-TESTS'),
    currentStatus(criteria, 'CLINICAL-E2E'),
    currentStatus(criteria, 'AUDIT-INTEGRITY'),
  ]), ['CRITICAL-TESTS', 'CLINICAL-E2E', 'AUDIT-INTEGRITY'], clinicalFiles.refs, clinicalFiles.limitations);
  add('WORKER-001', all(['WORKER-CRASH', 'CRITICAL-TESTS']), ['WORKER-CRASH', 'CRITICAL-TESTS']);

  const dataStaticStatus = combineStatuses([
    currentAreaStatus(criteria, 'RLS static coverage'),
    currentAreaStatus(criteria, 'Migration source'),
  ]);
  const dataRuntimeStatus = all(['RLS-RUNTIME', 'AUDIT-INTEGRITY']);
  add('DATA-001', dataStaticStatus === 'FAIL'
    ? 'FAIL'
    : dataRuntimeStatus === 'PASS' && dataStaticStatus === 'PASS'
      ? 'PASS'
      : dataStaticStatus === 'PASS' || dataRuntimeStatus === 'PARTIAL'
        ? 'PARTIAL'
        : combineStatuses([dataStaticStatus, dataRuntimeStatus]), ['RLS-RUNTIME', 'AUDIT-INTEGRITY']);

  const recoveryPolicy = fileEvidence(rootDir, [
    'docs/operations/DISASTER_RECOVERY.md',
    'docs/operations/RPO_RTO_POLICY.md',
  ]);
  add('REC-001', currentStatus(criteria, 'BACKUP-DRILL') === 'PASS'
    ? recoveryPolicy.status
    : currentStatus(criteria, 'BACKUP-DRILL'), ['BACKUP-DRILL'], recoveryPolicy.refs, recoveryPolicy.limitations);
  add('OPS-001', currentStatus(criteria, 'OBSERVABILITY-EVIDENCE'), ['OBSERVABILITY-EVIDENCE']);
  add('PERF-001', all(['PERFORMANCE', 'SOAK']), ['PERFORMANCE', 'SOAK']);
  add('UX-001', all(['E2E', 'HOSPITAL-UAT']), ['E2E', 'HOSPITAL-UAT']);

  const architectureFiles = fileEvidence(rootDir, [
    'docs/architecture/EVENT_GOVERNANCE.md',
    'docs/architecture/IDEMPOTENCY_MATRIX.md',
  ]);
  add('ARCH-001', combineStatuses([
    currentAreaStatus(criteria, 'Namespaces'),
    architectureFiles.status,
  ]), [], architectureFiles.refs, architectureFiles.limitations);

  const policyStatuses = criteria.filter((item) => item.id.startsWith('POLICY-')).map((item) => item.status);
  const docsStatus = currentAreaStatus(criteria, 'Documentation');
  add('DOC-001', docsStatus === 'FAIL' ? 'FAIL' : partialWhenIncomplete(policyStatuses), [], [], [
    'A validação documental não prova, sozinha, sincronização operacional de todos os runbooks com o alvo.'
  ]);

  const finalStatuses = qualityBar?.criteria
    ?.filter((item) => item.id !== 'FINAL-001')
    .map((item) => definitions.get(item.id)?.status ?? 'NOT_RUN') ?? [];
  const authorityStatus = currentStatus(criteria, 'RELEASE-AUTHORITY');
  add('FINAL-001', authorityStatus === 'PASS' && finalStatuses.length > 0 && finalStatuses.every((status) => status === 'PASS')
    ? 'PASS'
    : 'FAIL', ['RELEASE-AUTHORITY'], [], [
    'A certificação final exige todos os critérios anteriores PASS e autoridade de release atual; não há atalho por score parcial.'
  ]);

  const evaluatedCriteria = (qualityBar?.criteria ?? []).map((frozen) => {
    const derived = definitions.get(frozen.id) ?? {
      status: 'NOT_RUN',
      refs: [],
      limitations: ['Critério congelado não possui mapeamento de evidência do candidato.'],
    };
    return {
      ...frozen,
      frozen_status: frozen.status,
      status: derived.status,
      evidence_refs: derived.refs,
      limitations: derived.limitations,
    };
  });
  return {
    quality_bar_id: qualityBar?.quality_bar_id ?? null,
    phase,
    criteria: evaluatedCriteria,
    ...scoreCriteria(evaluatedCriteria),
  };
}

export function buildReleaseEvidence({
  rootDir = process.cwd(),
  outputDir = resolve(rootDir, process.env.TRIPLE_A_RELEASE_OUTPUT_DIR ?? DEFAULT_OUTPUT_DIR),
  strict = true,
  executeChecks = true,
  executeBuild = strict,
  executeTests = process.env.TRIPLE_A_RUN_TESTS === '1',
  commitSha = currentCommit(rootDir),
  verifyOperationalEvidence = verifyOperationalEvidenceAttestation,
  operationalPolicy = OPERATIONAL_EVIDENCE_POLICY,
  familyEvidencePolicy = FAMILY_EVIDENCE_POLICY,
} = {}) {
  mkdirSync(outputDir, { recursive: true });
  const prepublication = process.env.TRIPLE_A_PREPUBLICATION === '1';

  const checks = [verifyCleanWorktree(rootDir)];
  for (const [area, command, args] of EXECUTABLE_CHECKS) {
    checks.push(executeChecks
      ? runCheck({ rootDir, area, command, args })
      : skippedCheck(area, `${command} ${args.join(' ')}`, 'Execução desabilitada; somente agregação de evidência.'));
  }
  for (const [area, command, args] of BUILD_CHECKS) {
    checks.push(executeBuild
      ? runCheck({ rootDir, area, command, args, timeoutMs: 30 * 60 * 1000 })
      : skippedCheck(area, `${command} ${args.join(' ')}`, 'Build checks não executados nesta coleta.'));
  }
  const testEvidence = envEvidence(rootDir, 'TRIPLE_A_TEST_EVIDENCE', commitSha, outputDir);
  checks.push(executeTests
    ? runCheck({ rootDir, area: 'Unit tests', command: 'pnpm', args: ['test'], timeoutMs: 45 * 60 * 1000 })
    : testEvidence
      ? { area: 'Unit tests', command: 'TRIPLE_A_TEST_EVIDENCE', status: testEvidence.status, exit_code: null, evidence: testEvidence.reason, limitation: null }
      : skippedCheck('Unit tests', 'pnpm test', 'Defina TRIPLE_A_RUN_TESTS=1 ou TRIPLE_A_TEST_EVIDENCE para vincular a suíte completa.'));

  const manifest = verifyReleaseManifest({ rootDir, outputDir, commitSha });
  const security = verifySecurityEvidence({ rootDir, outputDir, commitSha });
  const qualityBarPath = resolve(rootDir, 'docs/triple-a/QUALITY_BAR_V1.json');
  const qualityBarExists = existsSync(qualityBarPath);
  const qualityBar = qualityBarExists ? readJson(qualityBarPath) : null;
  const policyCriteria = REQUIRED_POLICY_FILES.map((path) => criterion(
    `POLICY-${path.replaceAll('/', '-').replaceAll('.', '-')}`,
    'Policy',
    path.includes('CLINICAL_') || path.includes('GREEN_MAIN') ? 'P0' : 'P1',
    `Política obrigatória presente: ${path}`,
    existsSync(resolve(rootDir, path)) ? 'PASS' : 'NOT_RUN',
    existsSync(resolve(rootDir, path)) ? [path] : [],
    existsSync(resolve(rootDir, path)) ? [] : ['Documento ainda não foi criado ou não está vinculado a evidência executada.'],
  ));

  const prepublicationExcludedChecks = new Set();

  const artifactCriteria = [
    ...(prepublication ? [] : [
      criterion('RELEASE-MANIFEST', 'Release', 'P0', 'Manifesto de release vinculado ao commit e a imagens por digest.', manifest.status, manifest.artifacts),
    ]),
    criterion('SECURITY-EVIDENCE', 'Security', 'P0', 'Security evidence PASS e vinculado ao commit atual.', security.status, security.artifacts),
  ];

  for (const [id, area, priority, name, envName] of [
    ['BACKUP-DRILL', 'Recovery', 'P0', 'Backup/restore drill atual', 'TRIPLE_A_BACKUP_EVIDENCE'],
    ['PERFORMANCE', 'Performance', 'P1', 'Performance/soak certification atual', 'TRIPLE_A_PERFORMANCE_EVIDENCE'],
    ['SOAK', 'Performance', 'P1', 'Soak de estabilidade prolongada no alvo aprovado', 'TRIPLE_A_SOAK_EVIDENCE'],
    ['CI-REMOTE', 'CI', 'P0', 'CI remoto verde do commit candidato', 'TRIPLE_A_CI_EVIDENCE'],
    ['CRITICAL-TESTS', 'Critical tests', 'P0', 'Testes críticos de banco/processo atuais', 'TRIPLE_A_CRITICAL_EVIDENCE'],
    ['E2E', 'E2E', 'P0', 'E2E/accessibility/visual atuais', 'TRIPLE_A_E2E_EVIDENCE'],
    ['WORKFLOW-POSTGRES', 'Clinical workflow', 'P0', 'Integração PostgreSQL do workflow clínico atual', 'TRIPLE_A_WORKFLOW_POSTGRES_EVIDENCE'],
    ['RLS-RUNTIME', 'Security', 'P0', 'RLS e isolamento por tenant em roles de runtime', 'TRIPLE_A_RLS_RUNTIME_EVIDENCE'],
    ['WORKER-CRASH', 'Worker reliability', 'P0', 'Crash recovery, lease takeover e fencing do worker', 'TRIPLE_A_WORKER_CRASH_EVIDENCE'],
    ['CLINICAL-E2E', 'Clinical safety', 'P0', 'E2E clínico crítico ponta a ponta e invariantes negativas', 'TRIPLE_A_CLINICAL_E2E_EVIDENCE'],
    ['AUDIT-INTEGRITY', 'Clinical safety', 'P0', 'Integridade de auditoria e eventos append-only', 'TRIPLE_A_AUDIT_EVIDENCE'],
    ['HOSPITAL-UAT', 'Usability/UAT', 'P0', 'UAT hospitalar humana, sem autoaprovação', 'TRIPLE_A_UAT_EVIDENCE'],
    ['OBSERVABILITY-EVIDENCE', 'Observability', 'P1', 'SLO, alertas, tracing, retenção e on-call demonstrados no alvo', 'TRIPLE_A_OBSERVABILITY_EVIDENCE'],
    ['DEPLOY-TARGET', 'Deploy', 'P1', 'Deploy/rollback no ambiente alvo', 'TRIPLE_A_DEPLOY_EVIDENCE'],
    ['ROLLBACK', 'Deploy', 'P1', 'Rollback de aplicação e dados exercitado no alvo', 'TRIPLE_A_ROLLBACK_EVIDENCE'],
    ['IMAGE-ATTESTATIONS', 'Supply chain', 'P0', 'Attestation, assinatura e verificação das imagens publicadas', 'TRIPLE_A_IMAGE_ATTESTATION_EVIDENCE'],
    ['HELM-TARGET', 'Deploy', 'P1', 'Helm lint/template e identidade por digest no alvo', 'TRIPLE_A_HELM_EVIDENCE'],
    ['BRANCH-PROTECTION', 'Governance', 'P0', 'Branch protection e required checks remotos confirmados', 'TRIPLE_A_BRANCH_PROTECTION_EVIDENCE'],
    ['RELEASE-AUTHORITY', 'Governance', 'P0', 'Aprovação humana/authority record do release candidato', 'TRIPLE_A_AUTHORITY_EVIDENCE'],
  ]) {
    const evidence = envEvidence(rootDir, envName, commitSha, outputDir, {
      evidenceId: id,
      verifyOperationalEvidence,
      operationalPolicy,
      familyEvidencePolicy,
    });
    const externalCheck = evidence
      ? {
          area,
          command: envName,
          status: evidence.status,
          exit_code: null,
          evidence: evidence.reason,
          limitation: null,
          ...(evidence.layers ? { layers: evidence.layers } : {}),
        }
      : skippedCheck(area, envName, `Evidência externa ausente; informe ${envName}.`);
    checks.push(externalCheck);
    if (prepublication && id !== 'CI-REMOTE') prepublicationExcludedChecks.add(externalCheck);
    if (!prepublication || id === 'CI-REMOTE') {
      const status = evidence?.status ?? 'NOT_RUN';
      artifactCriteria.push(criterion(id, area, priority, name, status, evidence ? [evidence.path] : [], evidence ? [] : [`Informe ${envName} com artefato/link do candidato.`]));
    }
  }

  const commandCriteria = checks
    .filter((check) => !prepublicationExcludedChecks.has(check))
    .map((check, index) => criterion(
      `CMD-${String(index + 1).padStart(2, '0')}`,
      check.area,
      ['Candidate integrity', 'Documentation', 'Namespaces', 'Migration source', 'OpenAPI', 'RLS static coverage', 'Deploy surface', 'Secret scan', 'Complexity budget', 'Typecheck', 'Lint', 'Build', 'Unit tests'].includes(check.area) ? 'P0' : 'P1',
      check.command,
      check.status,
      check.status === 'PASS' ? [check.command] : [],
      check.limitation ? [check.limitation] : [],
    ));

  const qualityBarHash = qualityBarExists ? sha256(qualityBarPath) : null;
  const declaredPromptPath = qualityBar && typeof qualityBar.source_prompt === 'string'
    ? qualityBar.source_prompt
    : null;
  const promptPath = declaredPromptPath ? resolve(rootDir, declaredPromptPath) : null;
  const promptHashMatches = Boolean(
    declaredPromptPath
      && promptPath
      && existsSync(promptPath)
      && typeof qualityBar.source_prompt_sha256 === 'string'
      && qualityBar.source_prompt_sha256 === sha256(promptPath)
  );
  const externalPromptPath = resolve(rootDir, 'docs/triple-a/MASTER_PROMPT_EXTERNAL_CLOSURE.md');
  const externalPromptSha = existsSync(externalPromptPath) ? sha256(externalPromptPath) : null;
  const criteria = [
    criterion('QUALITY-BAR', 'Baseline', 'P0', 'Quality bar existe no repositório.', qualityBarExists ? 'PASS' : 'FAIL', qualityBarExists ? ['docs/triple-a/QUALITY_BAR_V1.json'] : []),
    criterion(
      'PROMPT-HASH',
      'Baseline',
      'P0',
      'A fonte de prompt declarada pelo quality bar permanece byte-a-byte preservada.',
      promptHashMatches ? 'PASS' : 'FAIL',
      declaredPromptPath ? [declaredPromptPath] : ['docs/triple-a/QUALITY_BAR_V1.json'],
      promptHashMatches ? [] : ['A fonte declarada ou seu SHA-256 não corresponde ao arquivo presente no repositório.'],
    ),
    criterion(
      'EXTERNAL-PROMPT-HASH',
      'Baseline',
      'P0',
      'Prompt de fechamento externo está preservado byte-a-byte.',
      externalPromptSha === 'd89a249f9b0b13e0da6fb9e4ee3c0e4728c11760fd435d325d48a9b8d1b5ed59' ? 'PASS' : 'FAIL',
      existsSync(externalPromptPath) ? ['docs/triple-a/MASTER_PROMPT_EXTERNAL_CLOSURE.md'] : []
    ),
    ...commandCriteria,
    ...policyCriteria,
    ...artifactCriteria,
  ];
  const score = scoreCriteria(criteria);
  const qualityBarAssessment = qualityBar
    ? evaluateQualityBar({ rootDir, qualityBar, criteria, phase: prepublication ? 'prepublication' : 'postpublication' })
    : null;
  const applicableCriteria = criteria.filter((item) => item.status !== 'NOT_APPLICABLE');
  const failed = applicableCriteria.filter((item) => item.status === 'FAIL');
  const notProven = applicableCriteria.filter((item) => item.status === 'NOT_RUN');
  const thresholds = {
    minimum_total_score: qualityBar?.minimum_total_score ?? 97,
    minimum_critical_score: qualityBar?.minimum_critical_score ?? 95,
    maximum_open_p0: qualityBar?.maximum_open_p0 ?? 0,
  };
  const thresholdFailure = score.score < thresholds.minimum_total_score
    || score.critical_score < thresholds.minimum_critical_score
    || score.open_p0 > thresholds.maximum_open_p0
    || !qualityBarAssessment
    || qualityBarAssessment.score < thresholds.minimum_total_score
    || qualityBarAssessment.critical_score < thresholds.minimum_critical_score
    || qualityBarAssessment.open_p0 > thresholds.maximum_open_p0;
  const decision = strict
    ? (failed.length || notProven.length || thresholdFailure ? 'BLOCKED' : 'PASS')
    : (failed.length ? 'FAIL' : 'PASS_WITH_CONDITIONS');

  const evidence = {
    schema_version: 1,
    evidence_id: `triple-a-${commitSha.slice(0, 12)}-${Date.now()}`,
    generated_at: new Date().toISOString(),
    repository: 'cvg-his-v4',
    commit_sha: commitSha,
    mode: prepublication ? 'prepublication' : strict ? 'strict' : 'advisory',
    gate_stage: prepublication ? 'prepublication' : 'postpublication',
    decision,
    publication_allowed: prepublication && decision === 'PASS',
    claim: decision === 'PASS' && !prepublication ? 'TRIPLE-A VERIFIED' : 'NOT PROVEN',
    score: score.score,
    critical_score: score.critical_score,
    open_p0: score.open_p0,
    thresholds,
    quality_bar: qualityBar
      ? {
          id: qualityBar.quality_bar_id,
          frozen_at: qualityBar.frozen_at,
          sha256: qualityBarHash,
          source_prompt_sha256: qualityBar.source_prompt_sha256,
          criteria: qualityBar.criteria,
          evaluation: qualityBarAssessment,
        }
      : null,
    quality_bar_assessment: qualityBarAssessment,
    checks,
    criteria,
    limitations: [
      'Evidência externa só é aceita quando informada pelo ambiente do candidato e vinculada por caminho/link.',
      'A decisão PASS exige todos os critérios atuais e não substitui autoridade humana para produção.',
      ...(prepublication ? ['Esta é uma garantia bloqueante pré-publicação; não certifica imagens, deploy, recuperação, E2E ou autoridade humana.'] : []),
    ],
  };
  const outputPath = resolve(outputDir, 'TRIPLE_A_RELEASE_EVIDENCE.json');
  const finalArtifactDir = resolve(
    rootDir,
    process.env.TRIPLE_A_FINAL_ARTIFACT_DIR ?? DEFAULT_FINAL_ARTIFACT_DIR,
  );
  const canonicalOutputPath = resolve(finalArtifactDir, 'TRIPLE_A_RELEASE_EVIDENCE.json');
  Object.assign(evidence, {
    candidate_sha: commitSha,
    final_artifact_path: relative(rootDir, canonicalOutputPath),
    ci: finalArtifactSection(criteria, ['CI-REMOTE']),
    branch_governance: finalArtifactSection(criteria, ['BRANCH-PROTECTION']),
    security: finalArtifactSection(criteria, ['SECURITY-EVIDENCE']),
    clinical: finalArtifactSection(criteria, ['CRITICAL-TESTS', 'CLINICAL-E2E', 'AUDIT-INTEGRITY']),
    workflow: finalArtifactSection(criteria, ['WORKFLOW-POSTGRES', 'CRITICAL-TESTS']),
    rls: finalArtifactSection(criteria, ['RLS-RUNTIME']),
    worker: finalArtifactSection(criteria, ['WORKER-CRASH']),
    e2e: finalArtifactSection(criteria, ['E2E']),
    ux: finalArtifactSection(criteria, ['E2E', 'HOSPITAL-UAT']),
    performance: finalArtifactSection(criteria, ['PERFORMANCE']),
    soak: finalArtifactSection(criteria, ['SOAK']),
    backup_restore: finalArtifactSection(criteria, ['BACKUP-DRILL']),
    deploy: finalArtifactSection(criteria, ['DEPLOY-TARGET', 'HELM-TARGET']),
    rollback: finalArtifactSection(criteria, ['ROLLBACK']),
    supply_chain: finalArtifactSection(criteria, ['SECURITY-EVIDENCE', 'IMAGE-ATTESTATIONS']),
    attestations: finalArtifactSection(criteria, ['IMAGE-ATTESTATIONS']),
    authority: finalArtifactSection(criteria, ['RELEASE-AUTHORITY']),
  });
  writeFileSync(outputPath, `${JSON.stringify(evidence, null, 2)}\n`);
  if (canonicalOutputPath !== outputPath) {
    mkdirSync(finalArtifactDir, { recursive: true });
    writeFileSync(canonicalOutputPath, `${JSON.stringify(evidence, null, 2)}\n`);
  }
  return { evidence, outputPath, canonicalOutputPath };
}

const invokedAsScript = process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname);
if (invokedAsScript) {
  const strict = !process.argv.includes('--advisory') && process.env.TRIPLE_A_ADVISORY !== '1';
  try {
    const { evidence, outputPath } = buildReleaseEvidence({
      strict,
      executeChecks: process.env.TRIPLE_A_SKIP_EXECUTION !== '1',
      executeBuild: process.env.TRIPLE_A_RUN_BUILD !== '0' && process.env.TRIPLE_A_SKIP_EXECUTION !== '1',
    });
    console.log(`Triple-A release evidence: ${relative(process.cwd(), outputPath)}`);
    console.log(`Decision: ${evidence.decision}; score=${evidence.score}; critical=${evidence.critical_score}; open_p0=${evidence.open_p0}`);
    if (strict && evidence.decision !== 'PASS') process.exitCode = 1;
  } catch (error) {
    console.error(`Falha no gate Triple-A: ${error.stack ?? error.message}`);
    process.exitCode = 1;
  }
}
