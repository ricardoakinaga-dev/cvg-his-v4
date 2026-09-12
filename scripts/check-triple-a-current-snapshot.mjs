#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const SHA_PATTERN = /^[0-9a-f]{40}$/i;
const SNAPSHOT_DOCUMENTS = [
  {
    path: 'docs/triple-a/15-current-baseline.md',
    label: '15-current-baseline.md',
    pattern: /\|\s*current_sha\s*\|\s*`([0-9a-f]{40})`/i
  },
  {
    path: 'docs/triple-a/17-current-execution-evidence.md',
    label: '17-current-execution-evidence.md',
    pattern: /SHA de código e documentação:\s*`([0-9a-f]{40})`/i
  },
  {
    path: 'docs/triple-a/13-final-scorecard.md',
    label: '13-final-scorecard.md',
    pattern: /\|\s*CURRENT SNAPSHOT\s*\|[^`\r\n]*`([0-9a-f]{40})`/i
  },
  {
    path: 'docs/triple-a/14-external-evidence-baseline.md',
    label: '14-external-evidence-baseline.md',
    pattern: /\*\*Current snapshot:\*\*\s*`([0-9a-f]{40})`/i
  },
  {
    path: 'docs/triple-a/00-baseline.md',
    label: '00-baseline.md',
    pattern: /baseline autoritativo[^:]*:\s*`([0-9a-f]{40})`/is
  },
  {
    path: 'docs/triple-a/FINAL_REPORT.md',
    label: 'FINAL_REPORT.md',
    pattern: /\*\*Candidate funcional avaliado:\*\*\s*`(?:main@)?([0-9a-f]{40})`/i
  }
];

const DOCUMENTATION_ONLY_PREFIX = 'docs/triple-a/';
const DOCUMENTATION_ONLY_PATHS = new Set(['docs/engineering/TRIPLE_A_BASELINE.md']);

function isDocumentationOnlyPath(path) {
  return path.startsWith(DOCUMENTATION_ONLY_PREFIX) || DOCUMENTATION_ONLY_PATHS.has(path);
}

function git(args, rootDir = root) {
  const result = spawnSync('git', args, {
    cwd: rootDir,
    encoding: 'utf8',
    shell: false,
    maxBuffer: 4 * 1024 * 1024
  });
  if (result.status !== 0) {
    throw new Error(result.stderr?.trim() || `git ${args.join(' ')} failed`);
  }
  return result.stdout.trim();
}

function pathsSinceCandidate({ rootDir = root, candidateSha, headSha }) {
  const ancestor = spawnSync('git', ['merge-base', '--is-ancestor', candidateSha, headSha], {
    cwd: rootDir,
    encoding: 'utf8',
    shell: false
  });
  if (ancestor.status !== 0) return { isAncestor: false, paths: [] };

  const output = git(['log', '--format=', '--name-only', `${candidateSha}..${headSha}`], rootDir);
  return { isAncestor: true, paths: output ? output.split('\n').filter(Boolean) : [] };
}

function extractSha({ content, pattern, label }) {
  const match = pattern.exec(content);
  if (!match) {
    return {
      label,
      sha: null,
      error: `${label}: current candidate SHA is missing or malformed`
    };
  }
  return { label, sha: match[1].toLowerCase(), error: null };
}

export function extractCurrentSnapshotShas({ documents }) {
  return SNAPSHOT_DOCUMENTS.map((entry) => {
    const content = documents?.[entry.path];
    if (typeof content !== 'string') {
      return {
        label: entry.label,
        sha: null,
        error: `${entry.label}: document is missing from the validation input`
      };
    }
    return extractSha({ content, pattern: entry.pattern, label: entry.label });
  });
}

export function validateCurrentSnapshot({
  headSha,
  candidateSha: explicitCandidateSha,
  changedPathsSinceCandidate = [],
  candidateIsAncestor = true,
  documents
}) {
  const errors = [];
  if (!SHA_PATTERN.test(headSha ?? '')) {
    errors.push('HEAD SHA is missing or malformed');
  }

  const snapshots = extractCurrentSnapshotShas({ documents });
  for (const snapshot of snapshots) {
    if (snapshot.error) errors.push(snapshot.error);
  }

  const declaredShas = [...new Set(snapshots.map((snapshot) => snapshot.sha).filter(Boolean))];
  if (declaredShas.length > 1) {
    errors.push(`current snapshot documents disagree on candidate SHA: ${declaredShas.join(', ')}`);
  }

  const candidateSha = explicitCandidateSha ?? (declaredShas.length === 1 ? declaredShas[0] : null);
  if (candidateSha && !SHA_PATTERN.test(candidateSha)) {
    errors.push('current candidate SHA is malformed');
  }

  if (candidateSha && SHA_PATTERN.test(headSha ?? '')) {
    if (!candidateIsAncestor) {
      errors.push(`current snapshot ${candidateSha} is not an ancestor of HEAD ${headSha}`);
    }
    const paths = Array.isArray(changedPathsSinceCandidate)
      ? [...new Set(changedPathsSinceCandidate.filter(Boolean))]
      : [];
    const sourcePaths = paths.filter((path) => !isDocumentationOnlyPath(path));
    if (sourcePaths.length > 0) {
      errors.push(
        `current snapshot ${candidateSha} is stale: source/workflow changes occurred after it (${sourcePaths.slice(0, 5).join(', ')}${sourcePaths.length > 5 ? ', ...' : ''})`
      );
    }
  }

  return [...new Set(errors)].sort();
}

export function validateRepositoryCurrentSnapshot({ rootDir = root } = {}) {
  const headSha = git(['rev-parse', 'HEAD'], rootDir).toLowerCase();
  const documents = Object.fromEntries(
    SNAPSHOT_DOCUMENTS.map((entry) => {
      const path = resolve(rootDir, entry.path);
      return [entry.path, existsSync(path) ? readFileSync(path, 'utf8') : null];
    })
  );
  const snapshots = extractCurrentSnapshotShas({ documents });
  const candidateSha =
    [...new Set(snapshots.map((snapshot) => snapshot.sha).filter(Boolean))][0] ?? null;
  let candidateIsAncestor = false;
  let changedPathsSinceCandidate = [];
  if (candidateSha) {
    const result = pathsSinceCandidate({ rootDir, candidateSha, headSha });
    candidateIsAncestor = result.isAncestor;
    changedPathsSinceCandidate = result.paths;
  }
  return validateCurrentSnapshot({
    headSha,
    candidateSha,
    candidateIsAncestor,
    changedPathsSinceCandidate,
    documents
  });
}

const invokedAsScript = process.argv[1]
  ? import.meta.url === pathToFileURL(resolve(process.argv[1])).href
  : false;

if (invokedAsScript) {
  try {
    const errors = validateRepositoryCurrentSnapshot();
    if (errors.length > 0) {
      console.error(`Triple-A current snapshot invalid (${errors.length} problem(s)):`);
      for (const error of errors) console.error(`- ${error}`);
      process.exitCode = 1;
    } else {
      console.log(
        'Triple-A current snapshot valid: current documents are bound to the candidate commit.'
      );
    }
  } catch (error) {
    console.error(`Triple-A current snapshot could not be validated: ${error.message}`);
    process.exitCode = 1;
  }
}
