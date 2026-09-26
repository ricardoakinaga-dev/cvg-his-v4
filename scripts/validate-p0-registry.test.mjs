import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve } from 'node:path';
import test from 'node:test';

import {
  validateP0Registry,
  validateP0RegistryForCurrentCandidate,
} from './validate-p0-registry.mjs';

const candidateSha = 'a'.repeat(40);
const identity = {
  candidate_id: 'CVG-HIS-V4-aaaaaaaaaaaa',
  behavior_sha: candidateSha,
  assurance_sha: candidateSha,
  documentation_sha: candidateSha,
  head_sha: candidateSha,
};

function makeRegistry(overrides = {}) {
  return {
    schema_version: 1,
    registry_id: 'CVG-HIS-P0-REGISTRY-V1',
    generated_at: '2026-01-01T00:00:00.000Z',
    generated_by: 'test',
    candidate: {
      candidate_id: identity.candidate_id,
      identity_path: 'docs/triple-a/CURRENT_CANDIDATE_IDENTITY.json',
      candidate_head_sha: candidateSha,
      behavior_sha: candidateSha,
      assurance_sha: candidateSha,
      documentation_sha: candidateSha,
    },
    items: [{
      id: 'P0-CI-CANDIDATE-FREEZE',
      title: 'Candidate identity is frozen',
      status: 'CLOSED',
      classification: 'AUTOMATABLE_LOCAL',
      closure_policy: 'AUTOMATIC',
      owner: 'release-engineering',
      dedupe_key: 'candidate-identity',
      behavior_sha: candidateSha,
      dependencies: [],
      acceptance_criteria: [{
        id: 'P0-CI-CANDIDATE-FREEZE-01',
        description: 'Identity fields match the current candidate',
        status: 'PASS',
        required: true,
      }],
      evidence_nodes: [{
        id: 'EVD-CANDIDATE-IDENTITY',
        status: 'PASS',
        fresh: true,
        mandatory: true,
        candidate_sha: candidateSha,
        source: 'pnpm validate:candidate-identity',
        artifact: 'identity.json',
        observed_at: '2026-01-01T00:00:00.000Z',
      }],
      human_required: false,
      target_required: false,
    }],
    summary: { open_p0: 0, closed_p0: 1 },
    ...overrides,
  };
}

function validateFixture(registry) {
  const rootDir = mkdtempSync(resolve(tmpdir(), 'cvg-p0-registry-'));
  mkdirSync(resolve(rootDir, 'docs/triple-a'), { recursive: true });
  writeFileSync(resolve(rootDir, 'identity.json'), '{}\n');
  try {
    return validateP0Registry({
      rootDir,
      registry,
      identity,
      now: new Date('2026-01-01T00:01:00.000Z'),
    });
  } finally {
    rmSync(rootDir, { recursive: true, force: true });
  }
}

test('accepts a closed P0 only with fresh candidate-bound evidence', () => {
  assert.deepEqual(validateFixture(makeRegistry()), []);
});

test('repository-level validation rejects a registry bound to a stale candidate identity', () => {
  const rootDir = mkdtempSync(resolve(tmpdir(), 'cvg-p0-registry-current-'));
  mkdirSync(resolve(rootDir, 'docs/triple-a'), { recursive: true });
  writeFileSync(resolve(rootDir, 'identity.json'), '{}\n');
  try {
    const errors = validateP0RegistryForCurrentCandidate({
      rootDir,
      registry: makeRegistry(),
      identity,
      now: new Date('2026-01-01T00:01:00.000Z'),
      candidateIdentityErrors: ['candidate identity requires a clean worktree'],
    });
    assert.ok(errors.includes(
      'current candidate identity: candidate identity requires a clean worktree'
    ));
  } finally {
    rmSync(rootDir, { recursive: true, force: true });
  }
});

test('a CLOSED item requires every existing dependency to be CLOSED', () => {
  const registry = makeRegistry();
  const dependency = structuredClone(registry.items[0]);
  dependency.id = 'P0-DATA-POSTGRESQL-RUNTIME';
  dependency.dedupe_key = 'postgres-runtime';
  registry.items.push(dependency);
  registry.items[0].dependencies = [dependency.id];
  registry.summary = { open_p0: 0, closed_p0: 2 };
  assert.deepEqual(validateFixture(registry), []);

  for (const status of ['NOT_PROVEN', 'TARGET_REQUIRED', 'HUMAN_REQUIRED', 'BLOCKED_BY_DEPENDENCY']) {
    dependency.status = status;
    registry.summary = { open_p0: 1, closed_p0: 1 };
    assert.ok(validateFixture(registry).includes(
      'items[0] CLOSED requires dependency P0-DATA-POSTGRESQL-RUNTIME to be CLOSED'
    ), status);
  }
});

test('a missing dependency keeps its stable unknown-P0 diagnostic', () => {
  const registry = makeRegistry();
  registry.items[0].dependencies = ['P0-MISSING'];
  assert.deepEqual(validateFixture(registry), [
    'items[0].dependencies references unknown P0: P0-MISSING',
  ]);
});

test('rejects legacy DONE and a closed P0 without mandatory fresh evidence', () => {
  const registry = makeRegistry();
  registry.items[0].status = 'DONE';
  let errors = validateFixture(registry);
  assert.ok(errors.some((error) => error.includes('legacy DONE')));

  registry.items[0].status = 'CLOSED';
  registry.items[0].evidence_nodes[0].fresh = false;
  errors = validateFixture(registry);
  assert.ok(errors.some((error) => error.includes('CLOSED requires fresh PASS evidence')));
});

test('rejects dependency cycles and semantic duplicate keys', () => {
  const registry = makeRegistry();
  registry.items.push({
    ...registry.items[0],
    id: 'P0-DATA-RLS-RUNTIME',
    status: 'NOT_PROVEN',
    classification: 'TARGET_REQUIRED',
    closure_policy: 'MANUAL',
    dedupe_key: 'candidate-identity',
    dependencies: ['P0-CI-CANDIDATE-FREEZE'],
    human_required: false,
    target_required: true,
  });
  registry.items[0].dependencies = ['P0-DATA-RLS-RUNTIME'];
  registry.summary = { open_p0: 1, closed_p0: 1 };
  const errors = validateFixture(registry);
  assert.ok(errors.includes('P0 dependency graph contains a cycle'));
  assert.ok(errors.some((error) => error.includes('semantic duplicate dedupe_key')));
});
