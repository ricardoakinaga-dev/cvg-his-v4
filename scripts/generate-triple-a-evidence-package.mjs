#!/usr/bin/env node

/**
 * Create the closure package required by the Triple-A external-assurance
 * prompt. Missing target or human evidence is represented as NOT_PROVEN; this
 * generator never upgrades an absent or stale envelope to PASS.
 */

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

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
  'performance.json',
  'soak.json',
  'backup-restore.json',
  'deployment.json',
  'rollback.json',
  'attestations.json',
  'final-verdict.json'
];

const SHA_PATTERN = /^[0-9a-f]{40}$/;
const VALID_STATUSES = new Set(['PASS', 'FAIL', 'BLOCKED', 'NOT_EVALUATED', 'NOT_PROVEN']);

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

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

function writeAtomic(path, value) {
  mkdirSync(resolve(path, '..'), { recursive: true });
  const temporaryPath = `${path}.tmp-${process.pid}`;
  writeFileSync(temporaryPath, `${JSON.stringify(value, null, 2)}\n`);
  renameSync(temporaryPath, path);
}

function statusFromSource(source, commitSha) {
  if (!source || source.commit_sha !== commitSha) return null;
  const status = source.status ?? source.decision;
  return VALID_STATUSES.has(status) ? status : null;
}

function sourceFor({ rootDir, releaseOutputDir, packageName, commitSha }) {
  const candidates = {
    'release-manifest.json': 'release-manifest.json',
    'ci-evidence.json': 'ci-evidence.json',
    'security-evidence.json': 'security-evidence.json',
    'attestations.json': 'image-attestation-evidence.json',
    'final-verdict.json': 'TRIPLE_A_RELEASE_EVIDENCE.json',
    'quality-scorecard.json': 'TRIPLE_A_RELEASE_EVIDENCE.json'
  };
  const sourceName = candidates[packageName];
  if (!sourceName) return null;
  const sourcePath = resolve(rootDir, releaseOutputDir, sourceName);
  if (!existsSync(sourcePath)) return null;
  const value = readJson(sourcePath);
  if (!value) return { path: sourcePath, status: 'NOT_PROVEN', reason: 'Fonte JSON inválida.' };
  const status = statusFromSource(value, commitSha);
  if (!status) {
    return {
      path: sourcePath,
      status: 'NOT_PROVEN',
      reason: 'Fonte ausente, inválida ou vinculada a outro SHA.'
    };
  }
  return { path: sourcePath, status, reason: 'Fonte atual vinculada ao SHA do candidato.' };
}

export function generateTripleAEvidencePackage({
  rootDir = process.cwd(),
  outputDir = process.env.TRIPLE_A_EVIDENCE_PACKAGE_DIR ?? 'artifacts/triple-a',
  releaseOutputDir = process.env.TRIPLE_A_RELEASE_OUTPUT_DIR ?? 'artifacts/release',
  commitSha = process.env.TRIPLE_A_EVIDENCE_COMMIT_SHA ?? git(rootDir, ['rev-parse', 'HEAD']),
  observedAt = new Date().toISOString()
} = {}) {
  if (!SHA_PATTERN.test(commitSha ?? '')) {
    throw new Error('TRIPLE_A_EVIDENCE_COMMIT_SHA deve ser um SHA Git completo');
  }
  const resolvedOutputDir = resolve(rootDir, outputDir);
  const packageEntries = [];

  for (const packageName of PACKAGE_FILES) {
    const source = sourceFor({ rootDir, releaseOutputDir, packageName, commitSha });
    const status = source?.status ?? 'NOT_PROVEN';
    const limitations =
      status === 'PASS'
        ? []
        : [source?.reason ?? 'Evidência externa, target ou autoridade humana não foi fornecida.'];
    const artifact = {
      schema_version: 1,
      evidence_type: 'cvg-his-triple-a-evidence',
      artifact_name: packageName,
      status,
      commit_sha: commitSha,
      observed_at: observedAt,
      issuer: {
        kind: 'repository-generator',
        id: 'scripts/generate-triple-a-evidence-package.mjs'
      },
      source: source ? relative(rootDir, source.path).split('\\').join('/') : null,
      evidence_refs: source?.path ? [relative(rootDir, source.path).split('\\').join('/')] : [],
      limitations
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
