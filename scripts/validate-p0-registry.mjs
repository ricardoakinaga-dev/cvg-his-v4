#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { validateCurrentCandidateIdentity } from './generate-current-candidate-identity.mjs';

export const P0_REGISTRY_PATH = 'docs/triple-a/P0_REGISTRY.json';
export const CANDIDATE_IDENTITY_PATH = 'docs/triple-a/CURRENT_CANDIDATE_IDENTITY.json';

const SHA_PATTERN = /^[0-9a-f]{40}$/i;
const ITEM_STATUSES = new Set([
  'CLOSED',
  'NOT_PROVEN',
  'READY',
  'BLOCKED_BY_DEPENDENCY',
  'TARGET_REQUIRED',
  'HUMAN_REQUIRED',
  'STALE',
  'DUPLICATE',
  'OBSOLETE',
]);
const CLASSIFICATIONS = new Set([
  'AUTOMATABLE_LOCAL',
  'LOCAL_INFRA_REQUIRED',
  'CI_REQUIRED',
  'TARGET_REQUIRED',
  'HUMAN_REQUIRED',
]);
const CRITERION_STATUSES = new Set([
  'PASS',
  'FAIL',
  'NOT_PROVEN',
  'NOT_RUN',
  'BLOCKED',
  'TARGET_REQUIRED',
  'HUMAN_REQUIRED',
]);

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function readJson(rootDir, relativePath) {
  const path = resolve(rootDir, relativePath);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

function validateSha(errors, value, label) {
  if (!SHA_PATTERN.test(value ?? '')) errors.push(label + ' must be a complete Git SHA');
}

function validateTimestamp(errors, value, label, now) {
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) {
    errors.push(label + ' must be an ISO timestamp');
    return;
  }
  if (Date.parse(value) > now.getTime() + 5 * 60 * 1000) {
    errors.push(label + ' must not be materially in the future');
  }
}

function hasDependencyCycle(itemsById) {
  const visiting = new Set();
  const visited = new Set();

  function visit(id) {
    if (visiting.has(id)) return true;
    if (visited.has(id)) return false;
    visiting.add(id);
    for (const dependency of itemsById.get(id)?.dependencies ?? []) {
      if (visit(dependency)) return true;
    }
    visiting.delete(id);
    visited.add(id);
    return false;
  }

  return [...itemsById.keys()].some(visit);
}

function validateEvidenceNode({ errors, node, label, candidateHead, rootDir, now }) {
  if (!isObject(node)) {
    errors.push(label + ' must be an object');
    return;
  }
  if (typeof node.id !== 'string' || !node.id.trim()) errors.push(label + '.id is required');
  if (!CRITERION_STATUSES.has(node.status)) errors.push(label + '.status is invalid');
  if (typeof node.source !== 'string' || !node.source.trim()) errors.push(label + '.source is required');
  if (typeof node.artifact !== 'string' || !node.artifact.trim()) errors.push(label + '.artifact is required');
  if (typeof node.fresh !== 'boolean') errors.push(label + '.fresh must be boolean');
  validateTimestamp(errors, node.observed_at, label + '.observed_at', now);
  if (node.fresh) {
    validateSha(errors, node.candidate_sha, label + '.candidate_sha');
    if (node.candidate_sha !== candidateHead) {
      errors.push(label + '.candidate_sha must match the registry candidate');
    }
    const artifactPath = resolve(rootDir, node.artifact);
    if (!existsSync(artifactPath)) errors.push(label + '.artifact does not exist: ' + node.artifact);
  }
}

export function validateP0Registry({
  rootDir = process.cwd(),
  registry = readJson(rootDir, P0_REGISTRY_PATH),
  identity = readJson(rootDir, CANDIDATE_IDENTITY_PATH),
  now = new Date(),
} = {}) {
  const errors = [];
  if (!isObject(registry)) return [P0_REGISTRY_PATH + ' must be a readable JSON object'];
  if (registry.schema_version !== 1) errors.push('schema_version must be 1');
  if (typeof registry.registry_id !== 'string' || !registry.registry_id.trim()) errors.push('registry_id is required');
  validateTimestamp(errors, registry.generated_at, 'generated_at', now);
  if (typeof registry.generated_by !== 'string' || !registry.generated_by.trim()) errors.push('generated_by is required');
  if (!isObject(identity)) {
    errors.push(CANDIDATE_IDENTITY_PATH + ' must be a readable JSON object');
  }

  const candidate = registry.candidate;
  if (!isObject(candidate)) {
    errors.push('candidate must be an object');
  } else {
    const identityFields = {
      candidate_head_sha: 'head_sha',
      behavior_sha: 'behavior_sha',
      assurance_sha: 'assurance_sha',
      documentation_sha: 'documentation_sha',
    };
    for (const [field, identityField] of Object.entries(identityFields)) {
      validateSha(errors, candidate[field], 'candidate.' + field);
      if (isObject(identity) && candidate[field] !== identity[identityField]) {
        errors.push('candidate.' + field + ' must match ' + CANDIDATE_IDENTITY_PATH);
      }
    }
    if (typeof candidate.identity_path !== 'string' || candidate.identity_path !== CANDIDATE_IDENTITY_PATH) {
      errors.push('candidate.identity_path must be ' + CANDIDATE_IDENTITY_PATH);
    }
    if (isObject(identity) && candidate.candidate_id !== identity.candidate_id) {
      errors.push('candidate.candidate_id must match ' + CANDIDATE_IDENTITY_PATH);
    }
  }

  const candidateHead = candidate?.candidate_head_sha;
  const items = registry.items;
  if (!Array.isArray(items) || items.length === 0) {
    errors.push('items must be a non-empty array');
    return [...new Set(errors)].sort();
  }

  const itemsById = new Map();
  const dedupeKeys = new Map();
  for (const [index, item] of items.entries()) {
    const label = 'items[' + index + ']';
    if (!isObject(item)) {
      errors.push(label + ' must be an object');
      continue;
    }
    if (typeof item.id !== 'string' || !/^P0-[A-Z0-9-]+$/.test(item.id)) errors.push(label + '.id must use the P0-* format');
    if (itemsById.has(item.id)) errors.push('duplicate P0 id: ' + item.id);
    else itemsById.set(item.id, item);
    if (typeof item.title !== 'string' || item.title.trim().length < 8) errors.push(label + '.title is required');
    if (typeof item.owner !== 'string' || !item.owner.trim()) errors.push(label + '.owner is required');
    if (!ITEM_STATUSES.has(item.status)) errors.push(label + '.status is invalid');
    if (!CLASSIFICATIONS.has(item.classification)) errors.push(label + '.classification is invalid');
    if (typeof item.dedupe_key !== 'string' || !item.dedupe_key.trim()) errors.push(label + '.dedupe_key is required');
    if (dedupeKeys.has(item.dedupe_key)) errors.push('semantic duplicate dedupe_key: ' + item.dedupe_key);
    else dedupeKeys.set(item.dedupe_key, item.id);
    validateSha(errors, item.behavior_sha, label + '.behavior_sha');
    if (candidateHead && item.behavior_sha !== candidateHead) errors.push(label + '.behavior_sha must match candidate.candidate_head_sha');
    if (!Array.isArray(item.dependencies)) errors.push(label + '.dependencies must be an array');
    if (!Array.isArray(item.acceptance_criteria) || item.acceptance_criteria.length === 0) errors.push(label + '.acceptance_criteria must be non-empty');
    if (!Array.isArray(item.evidence_nodes) || item.evidence_nodes.length === 0) errors.push(label + '.evidence_nodes must be non-empty');
    if (typeof item.human_required !== 'boolean') errors.push(label + '.human_required must be boolean');
    if (typeof item.target_required !== 'boolean') errors.push(label + '.target_required must be boolean');
    if (item.status === 'DONE') errors.push(label + ' may not use the legacy DONE status');
  }

  for (const [index, item] of items.entries()) {
    if (!isObject(item)) continue;
    const label = 'items[' + index + ']';
    for (const dependency of item.dependencies ?? []) {
      if (!itemsById.has(dependency)) errors.push(label + '.dependencies references unknown P0: ' + dependency);
      if (dependency === item.id) errors.push(label + ' cannot depend on itself');
    }
    if (item.status === 'BLOCKED_BY_DEPENDENCY' && (item.dependencies ?? []).every((dependency) => itemsById.get(dependency)?.status === 'CLOSED')) {
      errors.push(label + ' is BLOCKED_BY_DEPENDENCY but all dependencies are CLOSED');
    }
    if (item.status === 'TARGET_REQUIRED' && item.target_required !== true) errors.push(label + ' TARGET_REQUIRED must set target_required=true');
    if (item.status === 'HUMAN_REQUIRED' && item.human_required !== true) errors.push(label + ' HUMAN_REQUIRED must set human_required=true');
    if (item.classification === 'TARGET_REQUIRED' && item.target_required !== true) errors.push(label + ' TARGET_REQUIRED classification must set target_required=true');
    if (item.classification === 'HUMAN_REQUIRED' && item.human_required !== true) errors.push(label + ' HUMAN_REQUIRED classification must set human_required=true');

    const criteria = item.acceptance_criteria ?? [];
    const criterionIds = new Set();
    for (const [criterionIndex, criterion] of criteria.entries()) {
      const criterionLabel = label + '.acceptance_criteria[' + criterionIndex + ']';
      if (!isObject(criterion)) {
        errors.push(criterionLabel + ' must be an object');
        continue;
      }
      if (typeof criterion.id !== 'string' || !criterion.id.trim()) errors.push(criterionLabel + '.id is required');
      if (criterionIds.has(criterion.id)) errors.push('duplicate criterion id in ' + item.id + ': ' + criterion.id);
      criterionIds.add(criterion.id);
      if (typeof criterion.description !== 'string' || criterion.description.trim().length < 12) errors.push(criterionLabel + '.description is required');
      if (!CRITERION_STATUSES.has(criterion.status)) errors.push(criterionLabel + '.status is invalid');
      if (typeof criterion.required !== 'boolean') errors.push(criterionLabel + '.required must be boolean');
    }

    const evidenceIds = new Set();
    for (const [evidenceIndex, evidence] of (item.evidence_nodes ?? []).entries()) {
      const evidenceLabel = label + '.evidence_nodes[' + evidenceIndex + ']';
      if (isObject(evidence) && evidenceIds.has(evidence.id)) errors.push('duplicate evidence id in ' + item.id + ': ' + evidence.id);
      if (isObject(evidence)) evidenceIds.add(evidence.id);
      validateEvidenceNode({ errors, node: evidence, label: evidenceLabel, candidateHead, rootDir, now });
    }

    if (item.status === 'CLOSED') {
      for (const dependency of item.dependencies ?? []) {
        if (itemsById.has(dependency) && itemsById.get(dependency).status !== 'CLOSED') {
          errors.push(label + ' CLOSED requires dependency ' + dependency + ' to be CLOSED');
        }
      }
      if (item.human_required || item.target_required) errors.push(label + ' cannot be CLOSED while human_required or target_required is true');
      if (item.closure_policy !== 'AUTOMATIC') errors.push(label + ' CLOSED items require closure_policy=AUTOMATIC');
      const requiredCriteria = criteria.filter((criterion) => isObject(criterion) && criterion.required);
      if (requiredCriteria.some((criterion) => criterion.status !== 'PASS')) errors.push(label + ' CLOSED requires every required acceptance criterion to be PASS');
      const mandatoryEvidence = (item.evidence_nodes ?? []).filter((evidence) => isObject(evidence) && evidence.mandatory === true);
      if (mandatoryEvidence.length === 0) errors.push(label + ' CLOSED requires mandatory evidence');
      for (const evidence of mandatoryEvidence) {
        if (evidence.status !== 'PASS' || evidence.fresh !== true || evidence.candidate_sha !== candidateHead) {
          errors.push(label + ' CLOSED requires fresh PASS evidence bound to the candidate');
        }
      }
    }
  }

  if (hasDependencyCycle(itemsById)) errors.push('P0 dependency graph contains a cycle');
  const calculatedOpenP0 = items.filter((item) => isObject(item) && item.status !== 'CLOSED').length;
  if (!isObject(registry.summary)) errors.push('summary is required');
  else {
    if (registry.summary.open_p0 !== calculatedOpenP0) errors.push('summary.open_p0 must equal ' + calculatedOpenP0);
    if (registry.summary.closed_p0 !== items.length - calculatedOpenP0) errors.push('summary.closed_p0 must equal ' + (items.length - calculatedOpenP0));
  }
  return [...new Set(errors)].sort();
}

export function validateP0RegistryForCurrentCandidate({
  rootDir = process.cwd(),
  registry,
  identity,
  now = new Date(),
  candidateIdentityErrors,
} = {}) {
  const registryErrors = validateP0Registry({ rootDir, registry, identity, now });
  const identityErrors = candidateIdentityErrors ??
    validateCurrentCandidateIdentity({ rootDir });

  return [...new Set([
    ...registryErrors,
    ...identityErrors.map((error) => 'current candidate identity: ' + error),
  ])].sort();
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const errors = validateP0RegistryForCurrentCandidate();
  if (errors.length > 0) {
    console.error('P0 registry invalid (' + errors.length + ' problem(s)):');
    for (const error of errors) console.error('- ' + error);
    process.exitCode = 1;
  } else {
    const registry = readJson(process.cwd(), P0_REGISTRY_PATH);
    console.log('P0 registry valid: ' + registry.items.length + ' items; open_p0=' + registry.summary.open_p0 + '; closed_p0=' + registry.summary.closed_p0 + '.');
  }
}
