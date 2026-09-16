#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

export const IDENTITY_PATH = 'docs/triple-a/CURRENT_CANDIDATE_IDENTITY.json';
export const QUALITY_BAR_PATH = 'docs/triple-a/QUALITY_BAR_V1.json';
export const PROMPT_PATH = 'docs/triple-a/MASTER_PROMPT.md';
export const ARCHIVED_PROMPT_PATH = 'docs/triple-a/MASTER_EXECUTION_PROMPT_2026-09-15.md';

const SHA_PATTERN = /^[0-9a-f]{40}$/i;
const DIGEST_PATTERN = /^[0-9a-f]{64}$/i;
const DOCUMENTATION_ONLY_PREFIX = 'docs/triple-a/';
const DOCUMENTATION_ONLY_PATHS = new Set([
  'docs/README.md',
  'docs/engineering/TRIPLE_A_BASELINE.md'
]);

function git(rootDir, args, { allowFailure = false } = {}) {
  const result = spawnSync('git', args, {
    cwd: rootDir,
    encoding: 'utf8',
    shell: false,
    maxBuffer: 4 * 1024 * 1024
  });
  if (result.status !== 0 && !allowFailure) {
    throw new Error(result.stderr?.trim() || `git ${args.join(' ')} failed`);
  }
  return result.status === 0 ? result.stdout.trim().toLowerCase() : null;
}

function sha256(rootDir, relativePath) {
  return createHash('sha256')
    .update(readFileSync(resolve(rootDir, relativePath)))
    .digest('hex');
}

function isDocumentationOnlyPath(path) {
  return path.startsWith(DOCUMENTATION_ONLY_PREFIX) || DOCUMENTATION_ONLY_PATHS.has(path);
}

export function validateIdentityDocument({
  identity,
  currentHead,
  candidateIsAncestor = true,
  changedPathsSinceCandidate = [],
  qualityBarSha256,
  promptSha256,
  archivedPromptSha256
}) {
  const errors = [];
  const requiredShaFields = [
    'behavior_sha',
    'assurance_sha',
    'documentation_sha',
    'head_sha',
    'merge_sha'
  ];

  if (!identity || typeof identity !== 'object' || Array.isArray(identity)) {
    return ['candidate identity must be a JSON object'];
  }

  for (const field of requiredShaFields) {
    if (!SHA_PATTERN.test(identity[field] ?? '')) {
      errors.push(`${field} must be a complete Git SHA`);
    }
  }
  for (const field of ['ci_sha', 'release_sha', 'origin_main_sha']) {
    if (identity[field] !== null && identity[field] !== undefined && !SHA_PATTERN.test(identity[field])) {
      errors.push(`${field} must be null or a complete Git SHA`);
    }
  }
  if (!SHA_PATTERN.test(currentHead ?? '')) errors.push('current HEAD must be a complete Git SHA');
  if (identity.status !== 'BLOCKED / NOT PROVEN') {
    errors.push('status must remain BLOCKED / NOT PROVEN until all external gates are proven');
  }
  if (identity.release_state !== 'BLOCKED / NOT PROVEN') {
    errors.push('release_state must remain BLOCKED / NOT PROVEN until release authority exists');
  }
  if (identity.ci_sha !== null) {
    errors.push('ci_sha must be null when no exact current CI envelope is verified');
  }
  if (identity.release_sha !== null) {
    errors.push('release_sha must be null when no exact current release envelope is verified');
  }
  if (typeof identity.quality_bar_sha256 !== 'string' || !DIGEST_PATTERN.test(identity.quality_bar_sha256)) {
    errors.push('quality_bar_sha256 must be a SHA-256 digest');
  } else if (qualityBarSha256 && identity.quality_bar_sha256 !== qualityBarSha256) {
    errors.push('quality_bar_sha256 does not match the repository quality bar');
  }
  if (typeof identity.prompt_source_sha256 !== 'string' || !DIGEST_PATTERN.test(identity.prompt_source_sha256)) {
    errors.push('prompt_source_sha256 must be a SHA-256 digest');
  } else if (promptSha256 && identity.prompt_source_sha256 !== promptSha256) {
    errors.push('prompt_source_sha256 does not match the declared prompt');
  }
  if (typeof identity.archived_prompt_sha256 !== 'string' || !DIGEST_PATTERN.test(identity.archived_prompt_sha256)) {
    errors.push('archived_prompt_sha256 must be a SHA-256 digest');
  } else if (archivedPromptSha256 && identity.archived_prompt_sha256 !== archivedPromptSha256) {
    errors.push('archived_prompt_sha256 does not match the archived prompt');
  }
  if (!candidateIsAncestor) {
    errors.push(`head_sha ${identity.head_sha} is not an ancestor of current HEAD ${currentHead}`);
  }

  const sourceChanges = [...new Set(changedPathsSinceCandidate.filter(Boolean))]
    .filter((path) => !isDocumentationOnlyPath(path));
  if (sourceChanges.length > 0) {
    errors.push(
      `source changes exist after candidate head_sha: ${sourceChanges.slice(0, 5).join(', ')}${sourceChanges.length > 5 ? ', ...' : ''}`
    );
  }

  return [...new Set(errors)].sort();
}

export function validateCurrentCandidateIdentity({ rootDir = process.cwd() } = {}) {
  const identityPath = resolve(rootDir, IDENTITY_PATH);
  if (!existsSync(identityPath)) return [`missing ${IDENTITY_PATH}`];

  let identity;
  try {
    identity = JSON.parse(readFileSync(identityPath, 'utf8'));
  } catch (error) {
    return [`cannot parse ${IDENTITY_PATH}: ${error instanceof Error ? error.message : String(error)}`];
  }

  const currentHead = git(rootDir, ['rev-parse', 'HEAD']);
  const candidateIsAncestor = identity?.head_sha
    ? git(rootDir, ['merge-base', '--is-ancestor', identity.head_sha, currentHead], { allowFailure: true }) !== null
    : false;
  const changedPathsSinceCandidate = identity?.head_sha && candidateIsAncestor
    ? (git(rootDir, ['log', '--format=', '--name-only', `${identity.head_sha}..${currentHead}`]) ?? '')
      .split('\n')
      .filter(Boolean)
    : [];

  return validateIdentityDocument({
    identity,
    currentHead,
    candidateIsAncestor,
    changedPathsSinceCandidate,
    qualityBarSha256: existsSync(resolve(rootDir, QUALITY_BAR_PATH)) ? sha256(rootDir, QUALITY_BAR_PATH) : null,
    promptSha256: existsSync(resolve(rootDir, PROMPT_PATH)) ? sha256(rootDir, PROMPT_PATH) : null,
    archivedPromptSha256: existsSync(resolve(rootDir, ARCHIVED_PROMPT_PATH))
      ? sha256(rootDir, ARCHIVED_PROMPT_PATH)
      : null
  });
}

export function generateCurrentCandidateIdentity({ rootDir = process.cwd() } = {}) {
  const headSha = git(rootDir, ['rev-parse', 'HEAD']);
  const originMainSha = git(rootDir, ['rev-parse', 'origin/main'], { allowFailure: true });
  const identity = {
    schema_version: 1,
    candidate_id: `CVG-HIS-V4-${headSha.slice(0, 12)}`,
    behavior_sha: headSha,
    assurance_sha: headSha,
    documentation_sha: headSha,
    head_sha: headSha,
    origin_main_sha: originMainSha,
    ci_sha: null,
    release_sha: null,
    merge_sha: headSha,
    status: 'BLOCKED / NOT PROVEN',
    release_state: 'BLOCKED / NOT PROVEN',
    ci_status: 'NOT_FOUND',
    quality_bar: QUALITY_BAR_PATH,
    quality_bar_sha256: sha256(rootDir, QUALITY_BAR_PATH),
    prompt_source: PROMPT_PATH,
    prompt_source_sha256: sha256(rootDir, PROMPT_PATH),
    archived_prompt: ARCHIVED_PROMPT_PATH,
    archived_prompt_sha256: sha256(rootDir, ARCHIVED_PROMPT_PATH),
    generated_at: new Date().toISOString(),
    generated_by: 'scripts/generate-current-candidate-identity.mjs',
    limitations: [
      'Exact-candidate remote CI is not available at generation time.',
      'Target, UAT, recovery, attestation, branch governance and release authority remain unproven.',
      'Documentation-only commits after head_sha are allowed; source changes require regeneration.'
    ]
  };
  writeFileSync(resolve(rootDir, IDENTITY_PATH), `${JSON.stringify(identity, null, 2)}\n`);
  return identity;
}

const invokedAsScript = process.argv[1]
  ? resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)
  : false;

if (invokedAsScript) {
  if (process.argv.includes('--check')) {
    const errors = validateCurrentCandidateIdentity();
    if (errors.length > 0) {
      console.error(`Current candidate identity invalid (${errors.length} problem(s)):`);
      for (const error of errors) console.error(`- ${error}`);
      process.exitCode = 1;
    } else {
      console.log('Current candidate identity valid.');
    }
  } else {
    const identity = generateCurrentCandidateIdentity();
    console.log(`Current candidate identity generated for ${identity.head_sha}.`);
  }
}
