import { createHash } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, realpathSync, writeFileSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';

const DEFAULT_OUTPUT_DIR = 'artifacts/release';
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
  ['Helm', 'pnpm', ['validate:helm']],
  ['Supply-chain pins', 'pnpm', ['validate:supply-chain']],
  ['Dependency policy', 'pnpm', ['validate:dependencies']],
  ['Clinical workflow schema', 'pnpm', ['validate:clinical-workflow']],
  ['Secret scan', 'pnpm', ['security:secrets']],
  ['Complexity budget', 'pnpm', ['complexity:check']],
];

const BUILD_CHECKS = [
  ['Typecheck', 'pnpm', ['typecheck']],
  ['Lint', 'pnpm', ['lint']],
  ['Build', 'pnpm', ['build']],
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
}) {
  const producer = artifact?.producer;
  const verification = artifact?.verification;
  const artifactRefs = artifact?.artifacts;
  const validShape = artifact?.schema_version === 1
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
    if (!existsSync(artifactPath) || sha256(artifactPath) !== reference.sha256.slice('sha256:'.length)) {
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
const REQUIRED_CI_JOB_NAMES = [
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
  'Unit Tests',
  'Visual Regression',
];

function imageManifestByComponent(manifest) {
  return new Map(
    (Array.isArray(manifest?.images) ? manifest.images : [])
      .filter((image) => image !== null && typeof image === 'object')
      .map((image) => [image.component, image])
  );
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

function isAttestationJson(value) {
  return (Array.isArray(value) && value.length > 0)
    || (value !== null && typeof value === 'object' && Object.keys(value).length > 0);
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
    if (!image || !expectedReference.test(image.immutable_reference ?? '') || image.immutable_reference !== `${image.immutable_reference?.split('@')[0]}@${image.digest}`) {
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
    try {
      const verification = JSON.parse(result.stdout ?? '');
      if (!isAttestationJson(verification)) throw new Error('resposta JSON vazia');
    } catch (error) {
      return {
        status: 'FAIL',
        path: `oci://${image.immutable_reference}`,
        reason: `gh attestation verify retornou JSON inválido para ${component}: ${error.message}`
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

function envEvidence(rootDir, name, commitSha, outputDir) {
  const value = process.env[name];
  if (!value) return null;
  const declaredCommit = process.env[`${name}_COMMIT_SHA`] ?? process.env.TRIPLE_A_EVIDENCE_COMMIT_SHA;
  if (/^https?:\/\//.test(value)) {
    return declaredCommit === commitSha
      ? { status: 'PARTIAL', path: value, reason: 'Link informado e vinculado ao SHA, mas o conteúdo remoto precisa ser baixado/verificado como artefato.' }
      : {
          status: 'FAIL',
          path: value,
          reason: `Link sem vínculo verificável ao SHA do candidato; informe ${name}_COMMIT_SHA ou TRIPLE_A_EVIDENCE_COMMIT_SHA.`,
        };
  }
  const path = resolve(rootDir, value);
  if (!existsSync(path)) return { status: 'FAIL', path: value, reason: 'Caminho informado não existe.' };
  try {
    const artifact = readJson(path);
    if (name === 'TRIPLE_A_CI_EVIDENCE') {
      return validateCiEvidenceEnvelope({ rootDir, value, artifact, commitSha });
    }
    if (name === 'TRIPLE_A_IMAGE_ATTESTATION_EVIDENCE') {
      return validateImageAttestationEnvelope({ rootDir, outputDir, value, artifact, commitSha });
    }
    const envelope = validateExternalEvidenceEnvelope({ rootDir, value, artifact, commitSha });
    return envelope.status === 'PASS'
      ? {
          ...envelope,
          status: 'PARTIAL',
          reason: 'Envelope e hashes locais conferem, mas este artefato externo ainda precisa de verificação independente no ambiente alvo.'
        }
      : envelope;
  } catch {
    return declaredCommit === commitSha
      ? { status: 'PARTIAL', path: value, reason: 'Artefato não-JSON tem vínculo explícito ao SHA, mas seu conteúdo não foi interpretado pelo gate.' }
      : {
          status: 'FAIL',
          path: value,
          reason: `Artefato não-JSON sem vínculo verificável; informe ${name}_COMMIT_SHA ou TRIPLE_A_EVIDENCE_COMMIT_SHA.`,
        };
  }
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
        image.immutable_reference.endsWith(`@${image.digest}`)
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
    const report = readJson(evidencePath);
    const semgrepPass = Array.isArray(report.semgrepCi)
      && report.semgrepCi.length > 0
      && report.semgrepCi.every((check) => check.status === 'PASS');
    const sbomPath = report.sbom?.path;
    const sbom = typeof sbomPath === 'string'
      ? validateCycloneDxSbom(rootDir, sbomPath)
      : { valid: false, reason: 'Security report does not reference a SBOM.' };
    const valid = report.status === 'PASS'
      && report.securityAudit === 'PASS'
      && semgrepPass
      && report.commit_sha === commitSha
      && sbom.valid
      && report.sbom.components === readJson(resolve(rootDir, sbomPath)).components.length;
    return {
      area: 'Security evidence',
      status: valid ? 'PASS' : 'FAIL',
      evidence: valid
        ? 'Security audit, SAST/SBOM CycloneDX íntegro e commit estão vinculados ao candidato.'
        : `Security evidence existe, mas não prova checks PASS, SBOM CycloneDX íntegro (${sbom.reason}) ou vínculo ao commit atual.`,
      artifacts: [relative(rootDir, evidencePath)],
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
  const total = criteria.length || 1;
  const critical = criteria.filter((criterion) => criterion.priority === 'P0');
  const criticalTotal = critical.length || 1;
  return {
    score: Math.round((criteria.reduce((sum, criterion) => sum + scoreFor(criterion.status), 0) / total) * 100),
    critical_score: Math.round((critical.reduce((sum, criterion) => sum + scoreFor(criterion.status), 0) / criticalTotal) * 100),
    open_p0: criteria.filter((criterion) => criterion.priority === 'P0' && criterion.status !== 'PASS').length,
  };
}

function criterion(id, area, priority, description, status, evidenceRefs, limitations = []) {
  return { id, area, priority, description, status, evidence_refs: evidenceRefs, limitations };
}

export function buildReleaseEvidence({
  rootDir = process.cwd(),
  outputDir = resolve(rootDir, process.env.TRIPLE_A_RELEASE_OUTPUT_DIR ?? DEFAULT_OUTPUT_DIR),
  strict = true,
  executeChecks = true,
  executeBuild = strict,
  executeTests = process.env.TRIPLE_A_RUN_TESTS === '1',
  commitSha = currentCommit(rootDir),
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

  const commandCriteria = checks.map((check, index) => criterion(
    `CMD-${String(index + 1).padStart(2, '0')}`,
    check.area,
    ['Candidate integrity', 'Documentation', 'Namespaces', 'Migration source', 'OpenAPI', 'RLS static coverage', 'Deploy surface', 'Secret scan', 'Complexity budget', 'Typecheck', 'Lint', 'Build', 'Unit tests'].includes(check.area) ? 'P0' : 'P1',
    check.command,
    check.status,
    check.status === 'PASS' ? [check.command] : [],
    check.limitation ? [check.limitation] : [],
  ));

  const artifactCriteria = [
    ...(prepublication ? [] : [
      criterion('RELEASE-MANIFEST', 'Release', 'P0', 'Manifesto de release vinculado ao commit e a imagens por digest.', manifest.status, manifest.artifacts),
    ]),
    criterion('SECURITY-EVIDENCE', 'Security', 'P0', 'Security evidence PASS e vinculado ao commit atual.', security.status, security.artifacts),
  ];

  for (const [id, area, priority, name, envName] of [
    ['BACKUP-DRILL', 'Recovery', 'P0', 'Backup/restore drill atual', 'TRIPLE_A_BACKUP_EVIDENCE'],
    ['PERFORMANCE', 'Performance', 'P1', 'Performance/soak certification atual', 'TRIPLE_A_PERFORMANCE_EVIDENCE'],
    ['CI-REMOTE', 'CI', 'P0', 'CI remoto verde do commit candidato', 'TRIPLE_A_CI_EVIDENCE'],
    ['CRITICAL-TESTS', 'Critical tests', 'P0', 'Testes críticos de banco/processo atuais', 'TRIPLE_A_CRITICAL_EVIDENCE'],
    ['E2E', 'E2E', 'P0', 'E2E/accessibility/visual atuais', 'TRIPLE_A_E2E_EVIDENCE'],
    ['WORKFLOW-POSTGRES', 'Clinical workflow', 'P0', 'Integração PostgreSQL do workflow clínico atual', 'TRIPLE_A_WORKFLOW_POSTGRES_EVIDENCE'],
    ['RLS-RUNTIME', 'Security', 'P0', 'RLS e isolamento por tenant em roles de runtime', 'TRIPLE_A_RLS_RUNTIME_EVIDENCE'],
    ['WORKER-CRASH', 'Worker reliability', 'P0', 'Crash recovery, lease takeover e fencing do worker', 'TRIPLE_A_WORKER_CRASH_EVIDENCE'],
    ['CLINICAL-E2E', 'Clinical safety', 'P0', 'E2E clínico crítico ponta a ponta e invariantes negativas', 'TRIPLE_A_CLINICAL_E2E_EVIDENCE'],
    ['AUDIT-INTEGRITY', 'Clinical safety', 'P0', 'Integridade de auditoria e eventos append-only', 'TRIPLE_A_AUDIT_EVIDENCE'],
    ['HOSPITAL-UAT', 'Usability/UAT', 'P0', 'UAT hospitalar humana, sem autoaprovação', 'TRIPLE_A_UAT_EVIDENCE'],
    ['DEPLOY-TARGET', 'Deploy', 'P1', 'Deploy/rollback no ambiente alvo', 'TRIPLE_A_DEPLOY_EVIDENCE'],
    ['IMAGE-ATTESTATIONS', 'Supply chain', 'P0', 'Attestation, assinatura e verificação das imagens publicadas', 'TRIPLE_A_IMAGE_ATTESTATION_EVIDENCE'],
    ['HELM-TARGET', 'Deploy', 'P1', 'Helm lint/template e identidade por digest no alvo', 'TRIPLE_A_HELM_EVIDENCE'],
    ['BRANCH-PROTECTION', 'Governance', 'P0', 'Branch protection e required checks remotos confirmados', 'TRIPLE_A_BRANCH_PROTECTION_EVIDENCE'],
    ['RELEASE-AUTHORITY', 'Governance', 'P0', 'Aprovação humana/authority record do release candidato', 'TRIPLE_A_AUTHORITY_EVIDENCE'],
  ]) {
    const evidence = envEvidence(rootDir, envName, commitSha, outputDir);
    checks.push(evidence
      ? { area, command: envName, status: evidence.status, exit_code: null, evidence: evidence.reason, limitation: null }
      : skippedCheck(area, envName, `Evidência externa ausente; informe ${envName}.`));
    if (!prepublication) {
      const status = evidence?.status ?? 'NOT_RUN';
      artifactCriteria.push(criterion(id, area, priority, name, status, evidence ? [evidence.path] : [], evidence ? [] : [`Informe ${envName} com artefato/link do candidato.`]));
    }
  }

  const qualityBarHash = qualityBarExists ? sha256(qualityBarPath) : null;
  const externalPromptPath = resolve(rootDir, 'docs/triple-a/MASTER_PROMPT_EXTERNAL_CLOSURE.md');
  const externalPromptSha = existsSync(externalPromptPath) ? sha256(externalPromptPath) : null;
  const criteria = [
    criterion('QUALITY-BAR', 'Baseline', 'P0', 'Quality bar existe no repositório.', qualityBarExists ? 'PASS' : 'FAIL', qualityBarExists ? ['docs/triple-a/QUALITY_BAR_V1.json'] : []),
    criterion('PROMPT-HASH', 'Baseline', 'P0', 'Prompt fonte permanece byte-a-byte preservado.', qualityBarHash && readJson(qualityBarPath).source_prompt_sha256 === sha256(resolve(rootDir, 'docs/triple-a/MASTER_PROMPT.md')) ? 'PASS' : 'FAIL', ['docs/triple-a/MASTER_PROMPT.md']),
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
  const failed = criteria.filter((item) => item.status === 'FAIL');
  const notProven = criteria.filter((item) => item.status === 'NOT_RUN');
  const thresholds = {
    minimum_total_score: qualityBar?.minimum_total_score ?? 97,
    minimum_critical_score: qualityBar?.minimum_critical_score ?? 95,
    maximum_open_p0: qualityBar?.maximum_open_p0 ?? 0,
  };
  const thresholdFailure = score.score < thresholds.minimum_total_score
    || score.critical_score < thresholds.minimum_critical_score
    || score.open_p0 > thresholds.maximum_open_p0;
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
        }
      : null,
    checks,
    criteria,
    limitations: [
      'Evidência externa só é aceita quando informada pelo ambiente do candidato e vinculada por caminho/link.',
      'A decisão PASS exige todos os critérios atuais e não substitui autoridade humana para produção.',
      ...(prepublication ? ['Esta é uma garantia bloqueante pré-publicação; não certifica imagens, deploy, recuperação, E2E ou autoridade humana.'] : []),
    ],
  };
  const outputPath = resolve(outputDir, 'TRIPLE_A_RELEASE_EVIDENCE.json');
  writeFileSync(outputPath, `${JSON.stringify(evidence, null, 2)}\n`);
  return { evidence, outputPath };
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
