#!/usr/bin/env node

/**
 * Create the closure package required by the Triple-A external-assurance
 * prompt. Missing target or human evidence is represented as NOT_PROVEN; this
 * generator never upgrades an absent or stale envelope to PASS.
 */

import { createHash } from 'node:crypto';
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  writeFileSync
} from 'node:fs';
import { relative, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';

import {
  FAMILY_EVIDENCE_REQUIREMENTS,
  validateCiEvidenceEnvelope,
  validateFamilyEvidenceEnvelope,
  validateOperationalEvidenceEnvelope
} from './run-triple-a-release-gate.mjs';

export const PACKAGE_FILES = [
  'release-manifest.json',
  'quality-scorecard.json',
  'ci-evidence.json',
  'branch-governance.json',
  'security-evidence.json',
  'rls-runtime.json',
  'clinical-e2e.json',
  'workflow-reliability.json',
  'uat.json',
  'observability.json',
  'performance.json',
  'soak.json',
  'backup-restore.json',
  'deployment.json',
  'rollback.json',
  'attestations.json',
  'final-verdict.json'
];

const SHA_PATTERN = /^[0-9a-f]{40}$/;
const DIGEST_PATTERN = /^sha256:[0-9a-f]{64}$/i;
const VALID_STATUSES = new Set(['PASS', 'PARTIAL', 'FAIL', 'BLOCKED', 'NOT_EVALUATED', 'NOT_PROVEN']);
const DEFAULT_MAX_AGE_HOURS = 7 * 24;

/**
 * Package members whose source is an operational envelope. These are evaluated
 * with the canonical gate contract (including byte binding, attestation and the
 * gate-owned sufficiency policy) instead of a second, weaker approval engine.
 * Without the trusted verifier and an approved policy the canonical result is
 * PARTIAL, so the package member is not labelled verified PASS.
 */
const OPERATIONAL_PACKAGE_EVIDENCE = {
  'observability.json': 'OBSERVABILITY-EVIDENCE',
  'performance.json': 'PERFORMANCE',
  'soak.json': 'SOAK',
  'rollback.json': 'ROLLBACK'
};

/**
 * Every package input is explicit about its environment override and its
 * release-file fallback. Inputs in the same array are required together. The
 * previous implementation selected either all environment values or all
 * release files, which allowed a valid workflow/deployment envelope to hide a
 * missing companion (for example, worker crash or Helm evidence).
 *
 * A configured environment value always wins for its input, including an
 * invalid value. This is deliberate: an explicit but malformed PASS source
 * must not silently fall back to an older file and become PASS.
 */
const SOURCE_INPUTS_BY_PACKAGE = {
  'release-manifest.json': [{ files: ['release-manifest.json'] }],
  'quality-scorecard.json': [{ files: ['TRIPLE_A_RELEASE_EVIDENCE.json'] }],
  'ci-evidence.json': [{ environment: 'TRIPLE_A_CI_EVIDENCE', files: ['ci-evidence.json'] }],
  'branch-governance.json': [
    {
      environment: 'TRIPLE_A_BRANCH_PROTECTION_EVIDENCE',
      files: ['branch-governance-evidence.json', 'branch-governance.json'],
      evidenceId: 'BRANCH-PROTECTION'
    }
  ],
  'security-evidence.json': [
    { environment: 'TRIPLE_A_SECURITY_EVIDENCE', files: ['security-evidence.json'] }
  ],
  'rls-runtime.json': [
    {
      environment: 'TRIPLE_A_RLS_RUNTIME_EVIDENCE',
      files: ['rls-runtime-evidence.json'],
      evidenceId: 'RLS-RUNTIME'
    }
  ],
  'clinical-e2e.json': [
    {
      environment: 'TRIPLE_A_CLINICAL_E2E_EVIDENCE',
      files: ['clinical-e2e-evidence.json'],
      evidenceId: 'CLINICAL-E2E'
    },
    {
      environment: 'TRIPLE_A_AUDIT_EVIDENCE',
      files: ['audit-evidence.json'],
      evidenceId: 'AUDIT-INTEGRITY'
    }
  ],
  'workflow-reliability.json': [
    {
      environment: 'TRIPLE_A_WORKFLOW_POSTGRES_EVIDENCE',
      files: ['workflow-postgres-evidence.json'],
      evidenceId: 'WORKFLOW-POSTGRES'
    },
    {
      environment: 'TRIPLE_A_WORKER_CRASH_EVIDENCE',
      files: ['worker-crash-evidence.json'],
      evidenceId: 'WORKER-CRASH'
    }
  ],
  'uat.json': [
    {
      environment: 'TRIPLE_A_UAT_EVIDENCE',
      files: ['uat-evidence.json'],
      evidenceId: 'HOSPITAL-UAT'
    }
  ],
  'observability.json': [
    {
      environment: 'TRIPLE_A_OBSERVABILITY_EVIDENCE',
      files: ['observability-evidence.json']
    }
  ],
  'performance.json': [
    { environment: 'TRIPLE_A_PERFORMANCE_EVIDENCE', files: ['performance-evidence.json'] }
  ],
  'soak.json': [{ environment: 'TRIPLE_A_SOAK_EVIDENCE', files: ['soak-evidence.json'] }],
  'backup-restore.json': [
    {
      environment: 'TRIPLE_A_BACKUP_EVIDENCE',
      files: ['backup-restore-evidence.json'],
      evidenceId: 'BACKUP-DRILL'
    }
  ],
  'deployment.json': [
    {
      environment: 'TRIPLE_A_DEPLOY_EVIDENCE',
      files: ['deployment-evidence.json'],
      evidenceId: 'DEPLOY-TARGET'
    },
    {
      environment: 'TRIPLE_A_HELM_EVIDENCE',
      files: ['helm-evidence.json'],
      evidenceId: 'HELM-TARGET'
    }
  ],
  'rollback.json': [
    { environment: 'TRIPLE_A_ROLLBACK_EVIDENCE', files: ['rollback-evidence.json'] }
  ],
  'attestations.json': [
    {
      environment: 'TRIPLE_A_IMAGE_ATTESTATION_EVIDENCE',
      files: ['image-attestation-evidence.json']
    }
  ],
  'final-verdict.json': [{ files: ['TRIPLE_A_RELEASE_EVIDENCE.json'] }]
};

function git(rootDir, args) {
  const result = spawnSync('git', args, {
    cwd: rootDir,
    encoding: 'utf8',
    shell: false,
    timeout: 5_000
  });
  return result.status === 0 ? result.stdout.trim() : null;
}

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function writeAtomic(path, value) {
  mkdirSync(resolve(path, '..'), { recursive: true });
  const temporaryPath = `${path}.tmp-${process.pid}`;
  writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`);
  renameSync(temporaryPath, path);
}

function isoTimestamp(value) {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

function evidenceIsFresh(value, now = Date.now()) {
  if (!isoTimestamp(value)) return false;
  const age = now - Date.parse(value);
  return age >= -5 * 60 * 1000 && age <= DEFAULT_MAX_AGE_HOURS * 60 * 60 * 1000;
}

function safeLocalPath(rootDir, candidate) {
  if (typeof candidate !== 'string' || candidate.length === 0 || /^https?:\/\//i.test(candidate)) {
    return null;
  }
  try {
    const realRoot = realpathSync(rootDir);
    const resolved = resolve(realRoot, candidate);
    const relativePath = relative(realRoot, resolved);
    if (relativePath === '' || relativePath.startsWith('..') || relativePath.includes(`..${sep}`))
      return null;
    const stat = lstatSync(resolved);
    return stat.isFile() && !stat.isSymbolicLink() && realpathSync(resolved) === resolved
      ? resolved
      : null;
  } catch {
    return null;
  }
}

function validArtifactReferences(rootDir, references) {
  if (!Array.isArray(references) || references.length === 0) return false;
  return references.every((reference) => {
    const path = safeLocalPath(rootDir, reference?.path);
    return Boolean(
      path &&
      DIGEST_PATTERN.test(reference?.sha256 ?? '') &&
      sha256(path) === reference.sha256.slice('sha256:'.length)
    );
  });
}

function validateExternalEnvelope({ rootDir, value, commitSha, expectedEvidenceType }) {
  const status = value?.status;
  if (value?.commit_sha !== commitSha) {
    return { status: 'NOT_PROVEN', reason: 'Fonte ausente ou vinculada a outro SHA.' };
  }
  if (!VALID_STATUSES.has(status)) {
    return {
      status: 'NOT_PROVEN',
      reason: 'Fonte não declara um estado de evidência reconhecido.'
    };
  }
  if (status !== 'PASS') {
    return { status, reason: `Fonte vinculada ao SHA, mas declarou ${status}.` };
  }
  const validShape =
    value.schema_version === 1 &&
    (!expectedEvidenceType || value.evidence_type === expectedEvidenceType) &&
    evidenceIsFresh(value.observed_at) &&
    value.producer &&
    typeof value.producer.kind === 'string' &&
    value.producer.kind.length > 0 &&
    typeof value.producer.run_id === 'string' &&
    value.producer.run_id.length > 0 &&
    value.verification?.verified === true &&
    typeof value.verification.method === 'string' &&
    value.verification.method.length > 0 &&
    typeof value.verification.verifier_id === 'string' &&
    value.verification.verifier_id.length > 0 &&
    isoTimestamp(value.verification.verified_at) &&
    validArtifactReferences(rootDir, value.artifacts);
  return validShape
    ? {
        status: 'PARTIAL',
        reason: 'Fonte declarada PASS e íntegra, porém sem raiz de confiança própria; requer avaliação canônica do gate.'
      }
    : {
        status: 'NOT_PROVEN',
        reason: 'Fonte declarou PASS sem envelope verificável e artefatos íntegros.'
      };
}

function validateReleaseManifest({ rootDir, value, commitSha }) {
  if (value?.commit_sha !== commitSha) {
    return { status: 'NOT_PROVEN', reason: 'Manifesto ausente ou vinculado a outro SHA.' };
  }
  const images = Array.isArray(value.images) ? value.images : [];
  const files = Array.isArray(value.files) ? value.files : [];
  const validImages = ['api', 'worker', 'spa'].every((component) => {
    const image = images.find((candidate) => candidate?.component === component);
    return (
      image &&
      typeof image.reference === 'string' &&
      DIGEST_PATTERN.test(image.digest ?? '') &&
      image.immutable_reference === `${image.reference.replace(/:[^/:]+$/, '')}@${image.digest}`
    );
  });
  const validFiles =
    files.length > 0 &&
    files.every((file) => {
      const path = safeLocalPath(rootDir, file?.path);
      return Boolean(
        path && DIGEST_PATTERN.test(`sha256:${file?.sha256 ?? ''}`) && sha256(path) === file.sha256
      );
    });
  return value.schema_version === 1 && validImages && validFiles
    ? {
        status: 'PASS',
        reason: 'Manifesto vinculado ao SHA, imagens imutáveis e arquivos conferidos.'
      }
    : { status: 'NOT_PROVEN', reason: 'Manifesto não contém estrutura e digests verificáveis.' };
}

function validateFinalVerdict({ value, commitSha }) {
  const valid =
    value?.schema_version === 1 &&
    value.commit_sha === commitSha &&
    value.decision === 'PASS' &&
    value.claim === 'TRIPLE-A VERIFIED' &&
    value.score >= 97 &&
    value.critical_score >= 95 &&
    value.open_p0 === 0 &&
    evidenceIsFresh(value.generated_at) &&
    Array.isArray(value.criteria) &&
    value.criteria.length > 0 &&
    value.criteria.every((criterion) => criterion?.status === 'PASS');
  return valid
    ? {
        status: 'PASS',
        reason: 'Veredito strict PASS, score e critérios completos vinculados ao SHA.'
      }
    : value?.commit_sha === commitSha &&
        VALID_STATUSES.has(value?.decision) &&
        value.decision !== 'PASS'
      ? {
          status: value.decision,
          reason: `Veredito vinculado ao SHA, mas declarou ${value.decision}.`
        }
      : {
          status: 'NOT_PROVEN',
          reason: 'Veredito final não prova score, critérios e claim Triple-A.'
        };
}

function assessSource({ rootDir, packageName, value, commitSha, sourcePath, envelopeSha256, evidenceId }) {
  if (!value) return { status: 'NOT_PROVEN', reason: 'Fonte JSON inválida.' };
  const relativeSource = relative(rootDir, sourcePath).split('\\').join('/');
  const operationalId = OPERATIONAL_PACKAGE_EVIDENCE[packageName];
  if (operationalId) {
    const canonical = validateOperationalEvidenceEnvelope({
      rootDir,
      value: relativeSource,
      artifact: value,
      commitSha,
      evidenceId: operationalId,
      envelopeSha256
    });
    return {
      status: canonical.status,
      reason: `Avaliação canônica do gate (${operationalId}): ${canonical.reason}`,
      declared_status: typeof value?.status === 'string' ? value.status : null,
      layers: canonical.layers ?? null
    };
  }
  if (evidenceId && FAMILY_EVIDENCE_REQUIREMENTS[evidenceId]) {
    const canonical = validateFamilyEvidenceEnvelope({
      rootDir,
      value: relativeSource,
      artifact: value,
      commitSha,
      evidenceId,
      envelopeSha256
    });
    return {
      status: canonical.status,
      reason: `Avaliação canônica do gate (${evidenceId}): ${canonical.reason}`,
      declared_status: typeof value?.status === 'string' ? value.status : null,
      layers: canonical.layers ?? null
    };
  }
  if (packageName === 'ci-evidence.json') {
    const canonical = validateCiEvidenceEnvelope({
      rootDir,
      value: relativeSource,
      artifact: value,
      commitSha
    });
    return {
      status: canonical.status,
      reason: `Avaliação canônica do gate (CI): ${canonical.reason}`,
      declared_status: typeof value?.status === 'string' ? value.status : null
    };
  }
  if (packageName === 'release-manifest.json')
    return {
      ...validateReleaseManifest({ rootDir, value, commitSha }),
      declared_status: typeof value?.status === 'string' ? value.status : null
    };
  if (packageName === 'final-verdict.json' || packageName === 'quality-scorecard.json') {
    return {
      ...validateFinalVerdict({ value, commitSha }),
      declared_status: typeof value?.status === 'string' ? value.status : null
    };
  }
  return {
    ...validateExternalEnvelope({
      rootDir,
      value,
      commitSha,
      expectedEvidenceType: 'cvg-his-external-evidence'
    }),
    declared_status: typeof value?.status === 'string' ? value.status : null
  };
}

function sourceFor({
  rootDir,
  releaseOutputDir,
  packageName,
  commitSha,
  environment = process.env
}) {
  const inputs = SOURCE_INPUTS_BY_PACKAGE[packageName] ?? [];
  if (inputs.length === 0) return null;

  const candidates = inputs.map((input) => {
    const hasConfiguredValue =
      input.environment &&
      Object.prototype.hasOwnProperty.call(environment, input.environment) &&
      environment[input.environment] !== undefined &&
      environment[input.environment] !== null;
    if (hasConfiguredValue) {
      return {
        name: input.environment,
        path: environment[input.environment],
        evidenceId: input.evidenceId
      };
    }

    const fallback = (input.files ?? [])
      .map((name) => ({ name, path: resolve(rootDir, releaseOutputDir, name), evidenceId: input.evidenceId }))
      .find((entry) => existsSync(entry.path));
    return (
      fallback ?? {
        name: input.environment ?? input.files?.[0] ?? packageName,
        path: null,
        missing: true,
        evidenceId: input.evidenceId
      }
    );
  });

  const hasAnySource = candidates.some((candidate) => candidate.path !== null);
  if (!hasAnySource) return null;

  const sources = candidates.map(({ name, path, missing, evidenceId }) => {
    if (missing || path === null) {
      return {
        name,
        path: null,
        status: 'NOT_PROVEN',
        reason:
          'Fonte obrigatória não foi fornecida por variável de ambiente nem arquivo de release.'
      };
    }
    const sourcePath = safeLocalPath(rootDir, path);
    if (!sourcePath) {
      return {
        name,
        path,
        status: 'NOT_PROVEN',
        reason: 'Fonte precisa ser um arquivo local seguro dentro do repositório.'
      };
    }
    let bytes;
    try {
      bytes = readFileSync(sourcePath);
    } catch {
      return { name, path: sourcePath, status: 'NOT_PROVEN', reason: 'Fonte não pôde ser lida.' };
    }
    const envelopeSha256 = createHash('sha256').update(bytes).digest('hex');
    let value = null;
    try {
      value = JSON.parse(bytes.toString('utf8'));
    } catch {
      value = null;
    }
    const assessment = assessSource({
      rootDir,
      packageName,
      value,
      commitSha,
      sourcePath,
      envelopeSha256,
      evidenceId
    });
    return { name, path: sourcePath, ...assessment };
  });
  const status = sources.some((source) => source.status === 'FAIL')
    ? 'FAIL'
    : sources.some((source) => source.status === 'NOT_PROVEN')
      ? 'NOT_PROVEN'
      : sources.some((source) => source.status === 'BLOCKED')
        ? 'BLOCKED'
        : sources.some((source) => source.status === 'PARTIAL')
          ? 'PARTIAL'
          : 'PASS';
  const sourcePaths = sources
    .map((source) => source.path)
    .filter((path) => typeof path === 'string');
  const declaredStatuses = sources
    .map((source) => source.declared_status)
    .filter((declared) => typeof declared === 'string');
  const declaredStatus =
    declaredStatuses.length > 0 && declaredStatuses.every((value) => value === declaredStatuses[0])
      ? declaredStatuses[0]
      : null;
  const layers = sources.length === 1 && sources[0].layers ? sources[0].layers : undefined;
  return {
    path: sourcePaths,
    status,
    reason: sources.map((source) => `${source.name}: ${source.reason}`).join(' '),
    ...(declaredStatus === null ? {} : { declared_status: declaredStatus }),
    ...(layers ? { layers } : {})
  };
}

export function generateTripleAEvidencePackage({
  rootDir = process.cwd(),
  outputDir = process.env.TRIPLE_A_EVIDENCE_PACKAGE_DIR ?? 'artifacts/triple-a',
  releaseOutputDir = process.env.TRIPLE_A_RELEASE_OUTPUT_DIR ?? 'artifacts/release',
  commitSha = process.env.TRIPLE_A_EVIDENCE_COMMIT_SHA ?? git(rootDir, ['rev-parse', 'HEAD']),
  observedAt = new Date().toISOString(),
  environment = process.env
} = {}) {
  if (!SHA_PATTERN.test(commitSha ?? '')) {
    throw new Error('TRIPLE_A_EVIDENCE_COMMIT_SHA deve ser um SHA Git completo');
  }
  const resolvedOutputDir = resolve(rootDir, outputDir);
  const packageEntries = [];

  for (const packageName of PACKAGE_FILES) {
    const source = sourceFor({ rootDir, releaseOutputDir, packageName, commitSha, environment });
    const status = source?.status ?? 'NOT_PROVEN';
    const limitations =
      status === 'PASS'
        ? []
        : [source?.reason ?? 'Evidência externa, target ou autoridade humana não foi fornecida.'];
    const sourcePaths = source?.path
      ? Array.isArray(source.path)
        ? source.path
        : [source.path]
      : [];
    const sourceReferences = sourcePaths.map((path) =>
      relative(rootDir, path).split('\\').join('/')
    );
    const artifact = {
      schema_version: 1,
      evidence_type: 'cvg-his-triple-a-evidence',
      artifact_name: packageName,
      // `declared_status` is what the producer wrote in the source envelope;
      // `verified_status` is the canonical gate evaluation of the same bytes.
      // They are kept separate so a self-declared PASS can never be read as an
      // operationally verified PASS.
      declared_status: source?.declared_status ?? null,
      verified_status: status,
      status,
      commit_sha: commitSha,
      observed_at: observedAt,
      issuer: {
        kind: 'repository-generator',
        id: 'scripts/generate-triple-a-evidence-package.mjs'
      },
      source: sourceReferences.length === 1 ? sourceReferences[0] : sourceReferences,
      evidence_refs: sourceReferences,
      limitations,
      ...(source?.layers ? { verification_layers: source.layers } : {})
    };
    const outputPath = resolve(resolvedOutputDir, packageName);
    writeAtomic(outputPath, artifact);
    packageEntries.push({
      path: relative(rootDir, outputPath).split('\\').join('/'),
      sha256: `sha256:${sha256(outputPath)}`,
      status,
      commit_sha: commitSha
    });
  }

  const index = {
    schema_version: 1,
    evidence_type: 'cvg-his-triple-a-evidence-package',
    package_commit_sha: commitSha,
    observed_at: observedAt,
    status: packageEntries.every((entry) => entry.status === 'PASS') ? 'PASS' : 'BLOCKED',
    entries: packageEntries,
    limitations: packageEntries
      .filter((entry) => entry.status !== 'PASS')
      .map((entry) => `${entry.path}: ${entry.status}`)
  };
  writeAtomic(resolve(resolvedOutputDir, 'index.json'), index);
  return { outputDir: resolvedOutputDir, entries: packageEntries, index };
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  try {
    const result = generateTripleAEvidencePackage();
    console.log(
      `Triple-A evidence package: ${result.outputDir}; status=${result.index.status}; entries=${result.entries.length}`
    );
  } catch (error) {
    console.error(`Triple-A evidence package failed: ${error?.message ?? error}`);
    process.exitCode = 1;
  }
}
