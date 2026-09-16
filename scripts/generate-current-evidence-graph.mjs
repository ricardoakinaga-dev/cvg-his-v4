#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  IDENTITY_PATH,
  validateCurrentCandidateIdentity
} from './generate-current-candidate-identity.mjs';

export const EVIDENCE_GRAPH_PATH = 'artifacts/triple-a/evidence-graph.json';

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

export function buildCurrentEvidenceGraph({ identity, observedAt = new Date().toISOString() }) {
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
    limitations: [
      'A node is not promoted to PASS by source inspection or a historical artifact.',
      'Partial browser evidence is bounded to the current local disposable stack.',
      'The graph is fail-closed until exact-candidate external and human evidence exists.'
    ]
  };
}

export function generateCurrentEvidenceGraph({ rootDir = process.cwd() } = {}) {
  const identityPath = resolve(rootDir, IDENTITY_PATH);
  const identityErrors = validateCurrentCandidateIdentity({ rootDir });
  if (identityErrors.length > 0) throw new Error(identityErrors.join('; '));
  const identity = JSON.parse(readFileSync(identityPath, 'utf8'));
  const graph = buildCurrentEvidenceGraph({ identity });
  const outputPath = resolve(rootDir, EVIDENCE_GRAPH_PATH);
  mkdirSync(resolve(rootDir, 'artifacts/triple-a'), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(graph, null, 2)}\n`);
  return { outputPath, graph };
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(new URL(import.meta.url).pathname)) {
  try {
    const result = generateCurrentEvidenceGraph();
    console.log(`Current evidence graph generated: ${result.outputPath}; status=${result.graph.status}`);
  } catch (error) {
    console.error(`Current evidence graph failed: ${error?.message ?? error}`);
    process.exitCode = 1;
  }
}
