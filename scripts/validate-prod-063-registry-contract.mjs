#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

export const CONTRACT_PATH = 'docs/engineering/registry-contract-prod-063.json';
export const DOCUMENT_PATH = 'docs/063-contrato-cadastros.md';

const EXPECTED_INVARIANTS = Array.from({ length: 8 }, (_, index) => `REG-INV-${String(index + 1).padStart(3, '0')}`);
const EXPECTED_SCENARIOS = Array.from({ length: 8 }, (_, index) => `REG-SCN-${String(index + 1).padStart(3, '0')}`);
const EXPECTED_FAILURES = Array.from({ length: 10 }, (_, index) => `REG-FAIL-${String(index + 1).padStart(3, '0')}`);
const REQUIRED_SOURCES = [
  'docs/2026-09-14-backlog-state-of-art-triplo-aaa.md',
  'docs/2026-09-13-backlog-prontidao-producao.md',
  'docs/clinical/CLINICAL_SAFETY_INVARIANTS.md',
  'apps/api/src/openapi.yaml',
  'apps/api/src/routes/owners-routes.ts',
  'apps/api/src/routes/patients-routes.ts',
  'apps/api/src/registry-request-boundaries.ts',
  'packages/modules/owners/src/index.ts',
  'packages/modules/patients/src/index.ts',
  'packages/db/migrations/0065_tenant_isolation_auth_webhook_clinical_links.sql',
  'packages/db/migrations/0095_patient_merge_audit.sql'
];

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function nonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function idsOf(entries, label, errors) {
  if (!Array.isArray(entries)) {
    errors.push(`${label} must be an array`);
    return new Set();
  }
  const ids = entries.map((entry) => entry && entry.id);
  if (ids.some((id) => !nonEmpty(id))) errors.push(`${label} entries need non-empty ids`);
  if (new Set(ids).size !== ids.length) errors.push(`${label} ids must be unique`);
  return new Set(ids);
}

function validateEntries(contract, key, expectedIds, errors) {
  const ids = idsOf(contract[key], key, errors);
  for (const id of expectedIds) if (!ids.has(id)) errors.push(`${key} missing: ${id}`);
  for (const entry of contract[key] ?? []) {
    if (!isObject(entry) || !nonEmpty(entry.kind ?? entry.trigger ?? entry.rule ?? entry.expected)) {
      errors.push(`${key} entries need a meaningful description`);
    }
  }
}

function validateReferences(rootDir, references, errors) {
  if (!Array.isArray(references)) {
    errors.push('sourceRefs must be an array');
    return;
  }
  for (const reference of references) {
    if (!nonEmpty(reference)) {
      errors.push('sourceRefs must contain repository paths');
      continue;
    }
    const absolute = path.resolve(rootDir, reference);
    const relative = path.relative(rootDir, absolute);
    if (relative.startsWith('..' + path.sep) || path.isAbsolute(relative)) {
      errors.push(`sourceRef escapes repository: ${reference}`);
    } else if (!fs.existsSync(absolute)) {
      errors.push(`sourceRef does not exist: ${reference}`);
    }
  }
  for (const required of REQUIRED_SOURCES) {
    if (!references.includes(required)) errors.push(`sourceRefs missing: ${required}`);
  }
}

export function validateRegistryContract(rootDir = process.cwd(), input) {
  const errors = [];
  const contract = input ?? JSON.parse(fs.readFileSync(path.resolve(rootDir, CONTRACT_PATH), 'utf8'));

  if (!isObject(contract)) return ['contract must be an object'];
  if (contract.schemaVersion !== 1) errors.push('schemaVersion must be 1');
  if (contract.contractId !== 'PROD-063-REGISTRY-CONTRACT') errors.push('contractId is invalid');
  if (contract.id !== 'PROD-063') errors.push('id must be PROD-063');
  if (contract.status !== 'PROPOSED_PENDING_AUTHORITY') errors.push('status must remain PROPOSED_PENDING_AUTHORITY');
  if (!isObject(contract.scope) || contract.scope.mode !== 'LOCAL_BOUNDARY_HARDENING_AND_CONTRACT_PREPARATION') {
    errors.push('scope must remain local boundary hardening and contract preparation');
  }
  if (contract.scope?.functionalAcceptanceAllowed !== false || contract.scope?.behavioralClaimsAllowed !== false) {
    errors.push('scope cannot authorize functional acceptance or behavioral claims');
  }
  if (contract.scope?.realDataAllowed !== false || contract.scope?.provider !== 'NONE') {
    errors.push('scope cannot authorize real data or providers');
  }
  if (!isObject(contract.owners) || contract.owners.status !== 'PENDING_AUTHORITY') {
    errors.push('owners.status must remain PENDING_AUTHORITY');
  }
  if (!Array.isArray(contract.owners?.requiredAuthorities) || contract.owners.requiredAuthorities.length < 3) {
    errors.push('required authorities must remain explicit');
  }
  if (!isObject(contract.decisionPolicy) || contract.decisionPolicy.recommendationsAreBinding !== false
    || contract.decisionPolicy.currentUnitTestsAreAcceptance !== false
    || contract.decisionPolicy.noExternalCallsInThisSlice !== true
    || contract.decisionPolicy.noRealDataInThisSlice !== true) {
    errors.push('decisionPolicy must remain non-binding and local-only');
  }
  validateReferences(rootDir, contract.sourceRefs, errors);
  validateEntries(contract, 'invariants', EXPECTED_INVARIANTS, errors);
  validateEntries(contract, 'scenarioCatalog', EXPECTED_SCENARIOS, errors);
  validateEntries(contract, 'failureCases', EXPECTED_FAILURES, errors);

  const documentPath = path.resolve(rootDir, DOCUMENT_PATH);
  if (!fs.existsSync(documentPath)) errors.push(`document does not exist: ${DOCUMENT_PATH}`);
  else {
    const document = fs.readFileSync(documentPath, 'utf8');
    for (const marker of [
      'PROD-063',
      'IMPLEMENTED_LOCALLY',
      'documentId',
      'primaryOwnerId',
      'PROD-024',
      'PROD-027',
      'PROD-055',
      'não é `DONE`'
    ]) {
      if (!document.includes(marker)) errors.push(`document missing marker: ${marker}`);
    }
  }

  const dependencies = contract.scope?.dependencyReplan?.fullDependencies ?? [];
  for (const dependency of ['PROD-024', 'PROD-027', 'PROD-055']) {
    if (!dependencies.includes(dependency)) errors.push(`dependencyReplan missing ${dependency}`);
  }
  if (contract.promotionRule && /may not become DONE/.test(contract.promotionRule) === false) {
    errors.push('promotionRule must prohibit local-only DONE');
  }

  return errors;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const errors = validateRegistryContract(process.cwd());
  if (errors.length > 0) {
    console.error('[prod-063-registry-contract] FAIL');
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
  } else {
    console.log('[prod-063-registry-contract] PASS local boundary contract; dependencies and authority remain pending');
  }
}
