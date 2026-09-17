#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { lstatSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';

import {
  IDENTITY_PATH,
  validateCurrentCandidateIdentity
} from './generate-current-candidate-identity.mjs';
import { resolveCandidateBinding } from './lib/candidate-binding.mjs';
import {
  validateEvidenceFreshness,
  validateExternalEvidenceEnvelope,
} from './run-triple-a-release-gate.mjs';

export const EVIDENCE_GRAPH_PATH = 'artifacts/triple-a/evidence-graph.json';
export const DEFAULT_EVIDENCE_DIR = 'artifacts/release';

const LOCAL_EVIDENCE_INPUTS = Object.freeze([
  {
    nodeId: 'workflow_postgres',
    file: 'workflow-postgres-evidence.json',
    label: 'workflow PostgreSQL evidence',
  },
  {
    nodeId: 'audit',
    file: 'audit-evidence.json',
    label: 'audit evidence',
  },
]);

const NODE_DEFINITIONS = [
  ['ci', 'NOT_PROVEN', ['candidate'], 'No exact-candidate remote CI envelope is verified.'],
  ['unit', 'NOT_PROVEN', ['ci'], 'The isolated suite did not meet the global coverage threshold.'],
  ['integration', 'NOT_PROVEN', ['ci'], 'No exact-candidate terminal integration envelope is available.'],
  ['e2e', 'PARTIAL', ['candidate'], 'Current clinical browser slice passed 4/4; full SPA evidence is not certified.'],
  ['clinical_golden_path', 'PARTIAL', ['e2e'], 'The targeted workflow slice passed; full clinical golden-path/UAT evidence is absent.'],
  ['performance', 'NOT_PROVEN', ['ci'], 'The hosted k6 report is unavailable for the current candidate.'],
  ['security', 'PARTIAL', ['candidate'], 'Static checks exist locally; current target attestation is absent.'],
  ['rls_runtime', 'NOT_PROVEN', ['candidate'], 'Static RLS checks do not prove current target runtime isolation.'],
  ['workflow_postgres', 'NOT_PROVEN', ['candidate'], 'No exact-candidate workflow PostgreSQL envelope is available.'],
  ['worker_recovery', 'NOT_PROVEN', ['workflow_postgres'], 'No current crash-recovery target evidence is available.'],
  ['audit', 'NOT_PROVEN', ['clinical_golden_path'], 'No current externally retained audit evidence is available.'],
  ['backup', 'NOT_PROVEN', ['candidate'], 'The local install/upgrade drill does not prove restore/RPO/RTO.'],
  ['ux', 'PARTIAL', ['e2e'], 'Targeted accessibility evidence passed; full visual matrix and UAT remain open.'],
  ['branch_governance', 'NOT_PROVEN', ['ci'], 'Remote branch protection and required checks are not verified for this candidate.'],
  ['authority', 'NOT_PROVEN', ['branch_governance'], 'No release authority decision exists in the current ledger.']
];

function currentHead(rootDir) {
  return execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: rootDir,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim().toLowerCase();
}

function safeEvidencePath(rootDir, candidate) {
  if (typeof candidate !== 'string' || candidate.length === 0) return false;
  try {
    const realRoot = realpathSync(rootDir);
    const absolute = resolve(realRoot, candidate);
    const relativePath = relative(realRoot, absolute);
    if (relativePath === '' || relativePath.startsWith('..') || relativePath.includes(`..${sep}`)) return false;
    const stat = lstatSync(absolute);
    return stat.isFile() && !stat.isSymbolicLink() && realpathSync(absolute) === absolute;
  } catch {
    return false;
  }
}

function invalidImportedNode({ identity, source, reason, observedAt }) {
  return {
    status: 'FAIL',
    source_sha: identity.head_sha,
    timestamp: observedAt,
    issuer: 'evidence-graph-importer',
    environment: 'evidence-import-failed',
    source,
    dependencies: [],
    reason,
  };
}

function validateImportedEnvelope({ rootDir, identity, currentRepositoryHead, source, artifact, now }) {
  if (!/^[0-9a-f]{40}$/i.test(artifact?.commit_sha ?? '')) {
    return { status: 'FAIL', reason: 'Imported evidence must declare a complete commit_sha.' };
  }
  if (typeof artifact?.environment !== 'string' || artifact.environment.trim().length === 0) {
    return { status: 'FAIL', reason: 'Envelope imported into the graph must declare an environment.' };
  }
  if (artifact?.candidate_integrity?.status !== 'PASS' || artifact?.candidate_integrity?.worktree_clean !== true) {
    return { status: 'FAIL', reason: 'Envelope candidate_integrity must prove a clean candidate worktree.' };
  }
  const base = validateExternalEvidenceEnvelope({
    rootDir,
    value: source,
    artifact,
    commitSha: artifact.commit_sha,
  });
  if (base.status !== 'PASS') return base;

  const freshness = validateEvidenceFreshness({ observedAt: artifact.observed_at, now });
  if (!freshness.valid) {
    return { status: 'FAIL', reason: `Imported evidence is stale or has an invalid clock: ${freshness.reason}` };
  }

  const candidateBinding = resolveCandidateBinding({
    root: rootDir,
    collectionHead: identity.head_sha,
    candidateHead: artifact.commit_sha,
  });
  if (candidateBinding.status === 'INVALID') {
    return {
      status: 'FAIL',
      reason: `Evidence commit is not compatible with the current candidate: ${candidateBinding.reason}`,
    };
  }
  const repositoryBinding = resolveCandidateBinding({
    root: rootDir,
    collectionHead: artifact.commit_sha,
    candidateHead: currentRepositoryHead,
  });
  if (repositoryBinding.status === 'INVALID') {
    return {
      status: 'FAIL',
      reason: `Evidence commit is not an ancestor of the current repository HEAD: ${repositoryBinding.reason}`,
    };
  }

  return {
    status: 'PARTIAL',
    reason: 'Fresh candidate-bound local evidence was imported, but the graph keeps it PARTIAL until an independent trusted verifier attests it.',
    freshness,
    candidateBinding: candidateBinding.status,
    repositoryBinding: repositoryBinding.status,
  };
}

/**
 * Import only the known local envelopes into the graph.
 *
 * This is intentionally an evidence burn-up view, not a second release gate:
 * the local producer can improve a node from NOT_PROVEN to PARTIAL, but never
 * to PASS. Every accepted import is checked against the candidate identity,
 * current repository ancestry, freshness, environment, clean-worktree claim
 * and byte-level artifact digests by the canonical envelope validator.
 */
export function importLocalEvidence({
  rootDir = process.cwd(),
  identity,
  evidenceDir = DEFAULT_EVIDENCE_DIR,
  now = new Date(),
} = {}) {
  const imported = { nodes: {}, imports: [] };
  const repositoryHead = currentHead(rootDir);
  for (const input of LOCAL_EVIDENCE_INPUTS) {
    const candidatePath = `${evidenceDir.replace(/\/$/, '')}/${input.file}`;
    if (!safeEvidencePath(rootDir, candidatePath)) {
      try {
        lstatSync(resolve(rootDir, candidatePath));
      } catch {
        continue;
      }
      const node = invalidImportedNode({
        identity,
        source: candidatePath,
        reason: `Imported ${input.label} must be a regular non-symlink file contained in the repository.`,
        observedAt: now.toISOString(),
      });
      imported.nodes[input.nodeId] = node;
      imported.imports.push({ node_id: input.nodeId, source: candidatePath, status: node.status, reason: node.reason });
      continue;
    }
    let artifact;
    try {
      artifact = JSON.parse(readFileSync(resolve(rootDir, candidatePath), 'utf8'));
    } catch (error) {
      const node = invalidImportedNode({
        identity,
        source: candidatePath,
        reason: `Unable to parse imported ${input.label}: ${error.message}`,
        observedAt: now.toISOString(),
      });
      imported.nodes[input.nodeId] = node;
      imported.imports.push({ node_id: input.nodeId, source: candidatePath, status: node.status, reason: node.reason });
      continue;
    }

    const validation = validateImportedEnvelope({
      rootDir,
      identity,
      currentRepositoryHead: repositoryHead,
      source: candidatePath,
      artifact,
      now,
    });
    const node = {
      status: validation.status,
      source_sha: identity.head_sha,
      evidence_sha: artifact.commit_sha ?? null,
      timestamp: artifact.observed_at ?? now.toISOString(),
      issuer: artifact.verification?.verifier_id ?? 'unknown',
      environment: artifact.environment ?? 'unknown',
      source: candidatePath,
      artifact_digests: Array.isArray(artifact.artifacts) ? artifact.artifacts.map((item) => item.sha256) : [],
      dependencies: [],
      reason: validation.reason,
      ...(validation.freshness ? { freshness: validation.freshness } : {}),
      ...(validation.candidateBinding ? { candidate_binding: validation.candidateBinding } : {}),
      ...(validation.repositoryBinding ? { repository_binding: validation.repositoryBinding } : {}),
    };
    imported.nodes[input.nodeId] = node;
    imported.imports.push({
      node_id: input.nodeId,
      source: candidatePath,
      status: node.status,
      evidence_sha: node.evidence_sha,
      reason: node.reason,
    });
  }
  return imported;
}

export function buildCurrentEvidenceGraph({
  identity,
  observedAt = new Date().toISOString(),
  rootDir = process.cwd(),
  evidenceDir = DEFAULT_EVIDENCE_DIR,
  now = new Date(observedAt),
}) {
  const nodes = {
    candidate: {
      status: 'PASS',
      source_sha: identity.head_sha,
      timestamp: observedAt,
      issuer: 'generate-current-candidate-identity',
      environment: 'local-workstation',
      source: IDENTITY_PATH,
      dependencies: []
    }
  };
  for (const [id, status, dependencies, reason] of NODE_DEFINITIONS) {
    nodes[id] = {
      status,
      source_sha: identity.head_sha,
      timestamp: observedAt,
      issuer: 'lead-verification',
      environment: status === 'NOT_PROVEN' ? 'not-proven' : 'local-workstation',
      source: null,
      dependencies,
      reason
    };
  }
  const importedEvidence = importLocalEvidence({ rootDir, identity, evidenceDir, now });
  for (const [nodeId, importedNode] of Object.entries(importedEvidence.nodes)) {
    const existing = nodes[nodeId];
    if (!existing) continue;
    nodes[nodeId] = {
      ...existing,
      ...importedNode,
      dependencies: existing.dependencies,
      source_sha: identity.head_sha,
    };
  }
  const status = Object.values(nodes).every((node) => node.status === 'PASS') ? 'PASS' : 'BLOCKED';
  return {
    schema_version: 1,
    evidence_type: 'cvg-his-current-evidence-graph',
    generated_at: observedAt,
    candidate: {
      candidate_id: identity.candidate_id,
      behavior_sha: identity.behavior_sha,
      assurance_sha: identity.assurance_sha,
      documentation_sha: identity.documentation_sha,
      head_sha: identity.head_sha,
      ci_sha: identity.ci_sha,
      release_sha: identity.release_sha,
      status: identity.status
    },
    status,
    nodes,
    imported_evidence: importedEvidence.imports,
    limitations: [
      'A node is not promoted to PASS by source inspection or a historical artifact.',
      'Partial browser evidence is bounded to the current local disposable stack.',
      'Local envelopes may only promote their mapped node to PARTIAL; an independent trusted verifier is still required for PASS.',
      'The graph is fail-closed until exact-candidate external and human evidence exists.'
    ]
  };
}

export function generateCurrentEvidenceGraph({
  rootDir = process.cwd(),
  evidenceDir = process.env.TRIPLE_A_GRAPH_EVIDENCE_DIR ?? DEFAULT_EVIDENCE_DIR,
} = {}) {
  const identityPath = resolve(rootDir, IDENTITY_PATH);
  const identityErrors = validateCurrentCandidateIdentity({ rootDir });
  if (identityErrors.length > 0) throw new Error(identityErrors.join('; '));
  const identity = JSON.parse(readFileSync(identityPath, 'utf8'));
  const graph = buildCurrentEvidenceGraph({ identity, rootDir, evidenceDir });
  const outputPath = resolve(rootDir, EVIDENCE_GRAPH_PATH);
  mkdirSync(resolve(rootDir, 'artifacts/triple-a'), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(graph, null, 2)}\n`);
  return { outputPath, graph };
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  try {
    const evidenceDirFlag = process.argv.indexOf('--evidence-dir');
    const evidenceDir = evidenceDirFlag >= 0 ? process.argv[evidenceDirFlag + 1] : undefined;
    const result = generateCurrentEvidenceGraph({ evidenceDir });
    console.log(`Current evidence graph generated: ${result.outputPath}; status=${result.graph.status}`);
  } catch (error) {
    console.error(`Current evidence graph failed: ${error?.message ?? error}`);
    process.exitCode = 1;
  }
}
