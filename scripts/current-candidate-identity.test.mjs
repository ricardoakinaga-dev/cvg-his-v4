import assert from 'node:assert/strict';
import test from 'node:test';

import { buildCurrentEvidenceGraph } from './generate-current-evidence-graph.mjs';
import { validateIdentityDocument } from './generate-current-candidate-identity.mjs';

const head = 'a'.repeat(40);
const digest = 'b'.repeat(64);
const identity = {
  schema_version: 1,
  candidate_id: 'CVG-HIS-V4-aaaaaaaaaaaa',
  behavior_sha: head,
  assurance_sha: head,
  documentation_sha: head,
  head_sha: head,
  origin_main_sha: 'c'.repeat(40),
  ci_sha: null,
  release_sha: null,
  merge_sha: head,
  status: 'BLOCKED / NOT PROVEN',
  release_state: 'BLOCKED / NOT PROVEN',
  quality_bar_sha256: digest,
  prompt_source_sha256: digest,
  archived_prompt_sha256: digest
};

test('accepts a candidate followed only by documentation commits', () => {
  assert.deepEqual(
    validateIdentityDocument({
      identity,
      currentHead: 'd'.repeat(40),
      candidateIsAncestor: true,
      changedPathsSinceCandidate: ['docs/triple-a/15-current-baseline.md'],
      qualityBarSha256: digest,
      promptSha256: digest,
      archivedPromptSha256: digest
    }),
    []
  );
});

test('rejects source changes after the candidate without regeneration', () => {
  const errors = validateIdentityDocument({
    identity,
    currentHead: 'd'.repeat(40),
    candidateIsAncestor: true,
    changedPathsSinceCandidate: ['apps/spa/src/main.ts'],
    qualityBarSha256: digest,
    promptSha256: digest,
    archivedPromptSha256: digest
  });
  assert.ok(errors.some((error) => error.includes('source changes')));
});

test('evidence graph remains blocked when external evidence is absent', () => {
  const graph = buildCurrentEvidenceGraph({ identity, observedAt: '2026-09-16T00:00:00Z' });
  assert.equal(graph.status, 'BLOCKED');
  assert.equal(graph.nodes.candidate.status, 'PASS');
  assert.equal(graph.nodes.ci.status, 'NOT_PROVEN');
  assert.equal(graph.nodes.authority.status, 'NOT_PROVEN');
});
