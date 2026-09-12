import assert from 'node:assert/strict';
import test from 'node:test';

import {
  extractCurrentSnapshotShas,
  validateCurrentSnapshot
} from './check-triple-a-current-snapshot.mjs';

const head = 'a'.repeat(40);
const parent = 'b'.repeat(40);
const older = 'c'.repeat(40);

function documents(sha) {
  return {
    'docs/triple-a/15-current-baseline.md': `| current_sha | \`${sha}\` |`,
    'docs/triple-a/17-current-execution-evidence.md': `SHA de código e documentação: \`${sha}\``,
    'docs/triple-a/13-final-scorecard.md': `| CURRENT SNAPSHOT | candidato \`${sha}\` |`,
    'docs/triple-a/14-external-evidence-baseline.md': `**Current snapshot:** \`${sha}\``,
    'docs/triple-a/00-baseline.md': `baseline autoritativo do candidato atual está em: \`${sha}\``,
    'docs/triple-a/FINAL_REPORT.md': `**Candidate funcional avaliado:** \`${sha}\``
  };
}

test('accepts a current snapshot with only documentation commits after its candidate', () => {
  assert.deepEqual(
    validateCurrentSnapshot({
      headSha: head,
      candidateSha: parent,
      candidateIsAncestor: true,
      changedPathsSinceCandidate: ['docs/triple-a/15-current-baseline.md'],
      documents: documents(parent)
    }),
    []
  );
});

test('accepts the canonical engineering baseline reconciliation path', () => {
  assert.deepEqual(
    validateCurrentSnapshot({
      headSha: head,
      candidateSha: parent,
      candidateIsAncestor: true,
      changedPathsSinceCandidate: ['docs/engineering/TRIPLE_A_BASELINE.md'],
      documents: documents(parent)
    }),
    []
  );
});

test('rejects a code commit whose current snapshot still points to its parent', () => {
  const errors = validateCurrentSnapshot({
    headSha: head,
    candidateSha: parent,
    candidateIsAncestor: true,
    changedPathsSinceCandidate: ['.github/workflows/ci.yml'],
    documents: documents(parent)
  });
  assert.ok(errors.some((error) => error.includes('is stale')));
});

test('rejects disagreement between current documents', () => {
  const current = documents(head);
  current['docs/triple-a/17-current-execution-evidence.md'] =
    `SHA de código e documentação: \`${older}\``;
  const errors = validateCurrentSnapshot({
    headSha: head,
    candidateSha: head,
    candidateIsAncestor: true,
    changedPathsSinceCandidate: [],
    documents: current
  });
  assert.ok(errors.some((error) => error.includes('disagree')));
});

test('rejects missing current snapshot declarations', () => {
  const shas = extractCurrentSnapshotShas({ documents: {} });
  assert.equal(shas.length, 6);
  assert.ok(shas.every((entry) => entry.error));
});

test('rejects a mixed documentation and code commit from using the parent snapshot exception', () => {
  const errors = validateCurrentSnapshot({
    headSha: head,
    candidateSha: parent,
    candidateIsAncestor: true,
    changedPathsSinceCandidate: ['docs/triple-a/15-current-baseline.md', 'scripts/check.mjs'],
    documents: documents(parent)
  });
  assert.ok(errors.some((error) => error.includes('is stale')));
});

test('rejects a snapshot SHA outside the current history', () => {
  const errors = validateCurrentSnapshot({
    headSha: head,
    candidateSha: older,
    candidateIsAncestor: false,
    changedPathsSinceCandidate: [],
    documents: documents(older)
  });
  assert.ok(errors.some((error) => error.includes('not an ancestor')));
});
