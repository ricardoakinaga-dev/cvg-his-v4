import { execFileSync } from 'node:child_process';

const SHA_PATTERN = /^[0-9a-f]{40}$/i;

/**
 * Paths that may advance repository HEAD without changing the runtime
 * candidate represented by a critical coverage artifact. The list is
 * intentionally limited to the documentation tree: source, tests, workflows,
 * package metadata and runtime contracts remain behavior-affecting and make
 * evidence stale.
 */
export const DOCUMENTATION_ONLY_CANDIDATE_PATHS = Object.freeze([
  '.agent/',
  'docs/',
]);

export function isDocumentationOnlyCandidatePath(path) {
  return DOCUMENTATION_ONLY_CANDIDATE_PATHS.some((prefix) =>
    prefix.endsWith('/') ? path.startsWith(prefix) : path === prefix
  );
}

export function classifyCandidateBinding({
  collectionHead,
  candidateHead,
  changedPaths = [],
  isAncestor = true,
}) {
  if (collectionHead === candidateHead) {
    return {
      status: 'EXACT',
      collectionHead,
      candidateHead,
      changedPaths: [],
      disallowedPaths: [],
    };
  }
  if (!SHA_PATTERN.test(collectionHead ?? '') || !SHA_PATTERN.test(candidateHead ?? '')) {
    return {
      status: 'INVALID',
      collectionHead,
      candidateHead,
      changedPaths: [...new Set(changedPaths.filter(Boolean))],
      disallowedPaths: [],
      reason: 'collection and candidate heads must be complete Git SHAs',
    };
  }
  const paths = [...new Set(changedPaths.filter(Boolean))].sort();
  const disallowedPaths = paths.filter((path) => !isDocumentationOnlyCandidatePath(path));
  if (!isAncestor) {
    return {
      status: 'INVALID',
      collectionHead,
      candidateHead,
      changedPaths: paths,
      disallowedPaths,
      reason: 'collection head is not an ancestor of the candidate head',
    };
  }
  if (disallowedPaths.length) {
    return {
      status: 'INVALID',
      collectionHead,
      candidateHead,
      changedPaths: paths,
      disallowedPaths,
      reason: `non-documentation paths changed after collection: ${disallowedPaths.slice(0, 5).join(', ')}${disallowedPaths.length > 5 ? ', ...' : ''}`,
    };
  }
  return {
    status: 'DOCUMENTATION_ONLY_DESCENDANT',
    collectionHead,
    candidateHead,
    changedPaths: paths,
    disallowedPaths: [],
  };
}

export function resolveCandidateBinding({ root, collectionHead, candidateHead }) {
  if (collectionHead === candidateHead)
    return classifyCandidateBinding({ collectionHead, candidateHead });

  if (!SHA_PATTERN.test(collectionHead ?? '') || !SHA_PATTERN.test(candidateHead ?? '')) {
    return classifyCandidateBinding({ collectionHead, candidateHead, isAncestor: false });
  }

  try {
    execFileSync('git', ['merge-base', '--is-ancestor', collectionHead, candidateHead], {
      cwd: root,
      stdio: 'ignore',
    });
    const changed = execFileSync('git', ['diff', '--name-only', `${collectionHead}..${candidateHead}`, '--'], {
      cwd: root,
      encoding: 'utf8',
      maxBuffer: 4 * 1024 * 1024,
    });
    return classifyCandidateBinding({
      collectionHead,
      candidateHead,
      changedPaths: changed.split('\n'),
      isAncestor: true,
    });
  } catch {
    return classifyCandidateBinding({
      collectionHead,
      candidateHead,
      isAncestor: false,
      changedPaths: [],
    });
  }
}

/**
 * A shard may have been collected either at the manifest collection commit or
 * at the current candidate commit. Both are safe only when the complete path
 * between the three commits is documentation-only.
 */
export function resolveEvidenceHeadCompatibility({
  root,
  collectionHead,
  evidenceHead,
  candidateHead,
}) {
  const collectionToEvidence = resolveCandidateBinding({
    root,
    collectionHead,
    candidateHead: evidenceHead,
  });
  if (collectionToEvidence.status === 'INVALID')
    return {
      status: 'INVALID',
      reason: `evidence head is not compatible with the manifest collection: ${collectionToEvidence.reason}`,
      collectionToEvidence,
    };
  const evidenceToCandidate = resolveCandidateBinding({
    root,
    collectionHead: evidenceHead,
    candidateHead,
  });
  if (evidenceToCandidate.status === 'INVALID')
    return {
      status: 'INVALID',
      reason: `evidence head is not compatible with the candidate: ${evidenceToCandidate.reason}`,
      collectionToEvidence,
      evidenceToCandidate,
    };
  return {
    status: collectionToEvidence.status === 'EXACT' && evidenceToCandidate.status === 'EXACT'
      ? 'EXACT'
      : 'DOCUMENTATION_ONLY_COMPATIBLE',
    collectionToEvidence,
    evidenceToCandidate,
  };
}
