#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const outputDir = resolve(root, process.env.CI_EVIDENCE_OUTPUT_DIR ?? 'artifacts/release');
const outputPath = resolve(outputDir, 'ci-evidence.json');

export const REQUIRED_CI_JOB_NAMES = [
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

function sha256(path) {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

function runGhJson(args) {
  const result = spawnSync('gh', ['api', ...args], {
    cwd: root,
    encoding: 'utf8',
    shell: false,
    env: { ...process.env, GH_TOKEN: process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN },
    maxBuffer: 16 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  if (result.status !== 0) {
    return {
      value: null,
      error: `${result.stderr ?? ''} ${result.error?.message ?? ''}`.trim() || `gh exited ${result.status}`,
    };
  }
  try {
    return { value: JSON.parse(result.stdout ?? ''), error: null };
  } catch (error) {
    return { value: null, error: `gh returned invalid JSON: ${error.message}` };
  }
}

function flattenJobs(value) {
  if (Array.isArray(value)) {
    return value.flatMap((page) => flattenJobs(page));
  }
  return Array.isArray(value?.jobs) ? value.jobs : [];
}

function safeArtifactReference(rootDir, relativePath) {
  const path = resolve(rootDir, relativePath);
  try {
    if (!existsSync(path) || !statSync(path).isFile()) return null;
    return {
      path: relative(rootDir, path).split('\\').join('/'),
      sha256: `sha256:${sha256(path)}`,
    };
  } catch {
    return null;
  }
}

export function verifyCiRun({ run, jobs, commitSha, runId, requiredJobNames = REQUIRED_CI_JOB_NAMES }) {
  const jobsByName = new Map(jobs.map((job) => [job.name, job]));
  const missing = requiredJobNames.filter((name) => !jobsByName.has(name));
  const unsuccessful = requiredJobNames
    .map((name) => jobsByName.get(name))
    .filter((job) => job?.status !== 'completed' || job?.conclusion !== 'success')
    .map((job) => ({ name: job?.name ?? 'missing', status: job?.status ?? null, conclusion: job?.conclusion ?? null }));
  const valid = Boolean(
    run &&
      run.id?.toString() === runId?.toString() &&
      run.name === 'CI' &&
      run.event === 'push' &&
      run.head_branch === 'main' &&
      run.head_sha === commitSha &&
      run.status === 'completed' &&
      run.conclusion === 'success' &&
      missing.length === 0 &&
      unsuccessful.length === 0
  );

  return {
    valid,
    missing,
    unsuccessful,
    reason: valid
      ? 'CI remoto concluído com sucesso; todos os jobs obrigatórios estão verdes no SHA candidato.'
      : `CI remoto inválido: missing=${missing.join(',') || 'none'}; unsuccessful=${JSON.stringify(unsuccessful)}.`,
  };
}

export function buildCiEvidence({
  rootDir = root,
  outputDirectory = outputDir,
  commitSha = process.env.CI_COMMIT_SHA ?? process.env.GITHUB_SHA,
  runId = process.env.CI_RUN_ID,
  repository = process.env.GITHUB_REPOSITORY,
} = {}) {
  const resolvedOutputDir = resolve(rootDir, outputDirectory);
  mkdirSync(resolvedOutputDir, { recursive: true });
  const observedAt = new Date().toISOString();
  let run = null;
  let jobs = [];
  let verification = { valid: false, missing: [], unsuccessful: [], reason: 'CI evidence inputs are missing.' };

  if (repository && runId && commitSha) {
    const runResult = runGhJson([
      `repos/${repository}/actions/runs/${runId}`,
      '--header',
      'Accept: application/vnd.github+json',
    ]);
    const jobsResult = runGhJson([
      `repos/${repository}/actions/runs/${runId}/jobs?per_page=100`,
      '--header',
      'Accept: application/vnd.github+json',
    ]);
    run = runResult.value;
    jobs = flattenJobs(jobsResult.value);
    verification = runResult.error || jobsResult.error
      ? {
          valid: false,
          missing: [],
          unsuccessful: [],
          reason: `Não foi possível consultar a execução CI: ${runResult.error ?? jobsResult.error}`,
        }
      : verifyCiRun({ run, jobs, commitSha, runId });
  }

  const evidenceArtifacts = [
    ...new Set([
      `artifacts/release/source-${commitSha}.tar.gz`,
      'artifacts/release/security-evidence.json',
      'artifacts/release/sbom.cyclonedx.json',
    ]),
  ]
    .map((path) => safeArtifactReference(rootDir, path))
    .filter(Boolean);
  const valid = Boolean(
    /^[0-9a-f]{40}$/.test(commitSha ?? '') &&
      /^[0-9]+$/.test(runId?.toString() ?? '') &&
      repository &&
      verification.valid &&
      evidenceArtifacts.length > 0
  );
  const artifact = {
    schema_version: 1,
    evidence_type: 'cvg-his-ci-evidence',
    status: valid ? 'PASS' : 'FAIL',
    commit_sha: commitSha ?? null,
    observed_at: observedAt,
    producer: {
      kind: 'github-actions-workflow-run',
      run_id: runId?.toString() ?? '',
    },
    verification: {
      verified: valid,
      method: 'github-api-workflow-run',
      verifier_id: 'release-ci-run-verifier',
      verified_at: new Date().toISOString(),
    },
    run: run
      ? {
          id: run.id,
          name: run.name,
          event: run.event,
          head_branch: run.head_branch,
          head_sha: run.head_sha,
          status: run.status,
          conclusion: run.conclusion,
          html_url: run.html_url ?? null,
        }
      : null,
    required_jobs: REQUIRED_CI_JOB_NAMES,
    jobs: jobs.map((job) => ({
      id: job.id,
      name: job.name,
      status: job.status,
      conclusion: job.conclusion,
      started_at: job.started_at ?? null,
      completed_at: job.completed_at ?? null,
      html_url: job.html_url ?? null,
    })),
    artifacts: evidenceArtifacts,
    generated_at: new Date().toISOString(),
    reason: verification.reason,
  };
  writeFileSync(resolve(resolvedOutputDir, 'ci-evidence.json'), `${JSON.stringify(artifact, null, 2)}\n`);
  return { artifact, outputPath: resolve(resolvedOutputDir, 'ci-evidence.json') };
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  const { artifact, outputPath: writtenPath } = buildCiEvidence();
  console.log(`CI evidence: ${writtenPath}`);
  console.log(`Status: ${artifact.status}; commit=${artifact.commit_sha}; run=${artifact.producer.run_id}`);
  if (artifact.status !== 'PASS') process.exitCode = 1;
}
