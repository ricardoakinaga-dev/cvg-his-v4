import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';
import test from 'node:test';

import { buildCurrentEvidenceGraph, importLocalEvidence } from './generate-current-evidence-graph.mjs';
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

test('accepts critical coverage manifest bookkeeping as documentation-only', () => {
  assert.deepEqual(
    validateIdentityDocument({
      identity,
      currentHead: 'd'.repeat(40),
      candidateIsAncestor: true,
      changedPathsSinceCandidate: ['docs/engineering/critical-coverage-scope.json'],
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
  const graph = buildCurrentEvidenceGraph({
    identity,
    observedAt: '2026-09-16T00:00:00Z',
    evidenceDir: 'artifacts/triple-a/no-evidence-fixture',
  });
  assert.equal(graph.status, 'BLOCKED');
  assert.equal(graph.nodes.candidate.status, 'PASS');
  assert.equal(graph.nodes.ci.status, 'NOT_PROVEN');
  assert.equal(graph.nodes.authority.status, 'NOT_PROVEN');
});

const root = process.cwd();
const currentIdentity = JSON.parse(readFileSync(resolve(root, 'docs/triple-a/CURRENT_CANDIDATE_IDENTITY.json'), 'utf8'));
const repositoryHead = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const expectedRepositoryBinding = repositoryHead === currentIdentity.head_sha
  ? 'EXACT'
  : 'DOCUMENTATION_ONLY_DESCENDANT';
const temporaryEvidenceDirectories = [];

test.afterEach(() => {
  for (const directory of temporaryEvidenceDirectories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

function createEvidenceFixture({ commitSha = currentIdentity.head_sha, observedAt = new Date().toISOString(), tamper = false, environment = 'test-disposable-postgres' } = {}) {
  const directory = mkdtempSync(resolve(root, 'artifacts/triple-a/graph-import-test-'));
  temporaryEvidenceDirectories.push(directory);
  const fixturePath = resolve(directory, 'proof.log');
  const fixtureBytes = Buffer.from('candidate-bound local proof\n');
  writeFileSync(fixturePath, fixtureBytes);
  const evidencePath = resolve(directory, 'workflow-postgres-evidence.json');
  const fixtureReference = relative(root, fixturePath);
  const verifierTime = new Date().toISOString();
  writeFileSync(evidencePath, `${JSON.stringify({
    schema_version: 1,
    evidence_type: 'cvg-his-external-evidence',
    status: 'PASS',
    commit_sha: commitSha,
    observed_at: observedAt,
    producer: { kind: 'local-disposable-postgres-runner', run_id: 'graph-import-test' },
    verification: {
      verified: true,
      method: 'local-command-capture',
      verifier_id: 'graph-import-test-verifier',
      verified_at: verifierTime,
    },
    artifacts: [{
      path: fixtureReference,
      sha256: `sha256:${createHash('sha256').update(tamper ? 'different bytes' : fixtureBytes).digest('hex')}`,
    }],
    candidate_integrity: { worktree_clean: true, status: 'PASS' },
    environment,
    scope: 'graph importer contract fixture',
  }, null, 2)}\n`);
  return relative(root, directory);
}

test('imports fresh local evidence as PARTIAL and keeps the graph blocked', () => {
  const evidenceDir = createEvidenceFixture();
  const imported = importLocalEvidence({ rootDir: root, identity: currentIdentity, evidenceDir, now: new Date() });
  assert.equal(imported.nodes.workflow_postgres.status, 'PARTIAL');
  assert.equal(imported.nodes.workflow_postgres.candidate_binding, 'EXACT');
  assert.equal(imported.nodes.workflow_postgres.repository_binding, expectedRepositoryBinding);

  const graph = buildCurrentEvidenceGraph({
    rootDir: root,
    identity: currentIdentity,
    evidenceDir,
    observedAt: new Date().toISOString(),
  });
  assert.equal(graph.status, 'BLOCKED');
  assert.equal(graph.nodes.workflow_postgres.status, 'PARTIAL');
  assert.equal(graph.imported_evidence[0].status, 'PARTIAL');
});

test('accepts evidence collected on the documentation-only descendant but preserves functional candidate binding', () => {
  const evidenceDir = createEvidenceFixture({ commitSha: repositoryHead });
  const imported = importLocalEvidence({ rootDir: root, identity: currentIdentity, evidenceDir, now: new Date() });
  assert.equal(imported.nodes.workflow_postgres.status, 'PARTIAL');
  assert.equal(imported.nodes.workflow_postgres.evidence_sha, repositoryHead);
  assert.equal(imported.nodes.workflow_postgres.candidate_binding, expectedRepositoryBinding);
});

test('rejects stale or tampered evidence instead of silently ignoring it', () => {
  const staleDir = createEvidenceFixture({ observedAt: new Date(Date.now() - 169 * 60 * 60 * 1000).toISOString() });
  const stale = importLocalEvidence({ rootDir: root, identity: currentIdentity, evidenceDir: staleDir, now: new Date() });
  assert.equal(stale.nodes.workflow_postgres.status, 'FAIL');
  assert.match(stale.nodes.workflow_postgres.reason, /stale|clock|old/i);

  const tamperedDir = createEvidenceFixture({ tamper: true });
  const tampered = importLocalEvidence({ rootDir: root, identity: currentIdentity, evidenceDir: tamperedDir, now: new Date() });
  assert.equal(tampered.nodes.workflow_postgres.status, 'FAIL');
  assert.match(tampered.nodes.workflow_postgres.reason, /Digest/i);
});

test('rejects a symlinked evidence envelope instead of treating it as absent', () => {
  const evidenceDir = createEvidenceFixture();
  const directory = resolve(root, evidenceDir);
  const evidencePath = resolve(directory, 'workflow-postgres-evidence.json');
  const targetPath = resolve(directory, 'proof.log');
  unlinkSync(evidencePath);
  symlinkSync(targetPath, evidencePath);
  const imported = importLocalEvidence({ rootDir: root, identity: currentIdentity, evidenceDir, now: new Date() });
  assert.equal(imported.nodes.workflow_postgres.status, 'FAIL');
  assert.match(imported.nodes.workflow_postgres.reason, /regular non-symlink/i);
});
