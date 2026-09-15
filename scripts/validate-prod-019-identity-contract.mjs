#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

export const CONTRACT_PATH = 'docs/engineering/identity-contract-prod-019.json';
export const DOCUMENT_PATH = 'docs/019-contrato-identidade-corporativa.md';

const EXPECTED_CHOICES = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6'];
const EXPECTED_REQUIREMENTS = ['R1', 'R2', 'R3', 'R4', 'R5', 'R6'];
const REQUIRED_INVARIANTS = [
  'external_identity_key',
  'no_email_binding',
  'issuer_allowlist',
  'redirect_allowlist',
  'state_pkce_nonce',
  'signed_id_token',
  'fail_closed_mapping',
  'no_browser_tokens',
  'mfa_policy',
  'refresh_rotation',
  'generic_errors'
];
const REQUIRED_SOURCE_REFS = [
  'docs/2026-09-14-backlog-state-of-art-triplo-aaa.md',
  'docs/2026-09-12-ma04-status-e-proxima-tarefa.md',
  'docs/2026-09-12-ma08-decisao-e-despacho-proposto.md',
  'docs/2026-09-12-avaliacao-profunda-release-triplo-aaa.md',
  'packages/modules/auth/src/oidc.ts',
  'apps/api/src/routes/auth-routes.ts',
  'apps/api/src/server.ts'
];
const REQUIRED_DOCUMENT_MARKERS = [
  'PROPOSED_PENDING_AUTHORITY',
  'PENDING_AUTHORITY',
  'C1',
  'C6',
  'R1',
  'R6',
  'PROD-020',
  'PROD-021'
];
const REQUIRED_THREATS = [
  'THR-001',
  'THR-002',
  'THR-003',
  'THR-004',
  'THR-005',
  'THR-006',
  'THR-007',
  'THR-008'
];
const REQUIRED_FAILURES = [
  'FAIL-001',
  'FAIL-002',
  'FAIL-003',
  'FAIL-004',
  'FAIL-005',
  'FAIL-006',
  'FAIL-007',
  'FAIL-008'
];

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function nonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function addRepositoryReferenceError(rootDir, reference, label, errors) {
  if (!nonEmpty(reference)) {
    errors.push(label + ' must be a non-empty repository path');
    return;
  }
  const absolutePath = path.resolve(rootDir, reference);
  const relativePath = path.relative(rootDir, absolutePath);
  if (relativePath.startsWith('..' + path.sep) || path.isAbsolute(relativePath)) {
    errors.push(label + ' escapes the repository: ' + reference);
    return;
  }
  if (!fs.existsSync(absolutePath)) errors.push(label + ' does not exist: ' + reference);
}

function uniqueIds(entries, label, errors) {
  if (!Array.isArray(entries)) {
    errors.push(label + ' must be an array');
    return new Set();
  }
  const ids = entries.map((entry) => entry && entry.id);
  if (ids.some((id) => !nonEmpty(id))) errors.push(label + ' entries need non-empty ids');
  if (new Set(ids).size !== ids.length) errors.push(label + ' ids must be unique');
  return new Set(ids);
}

function validateChoice(choice, errors) {
  if (!isObject(choice)) {
    errors.push('each choice must be an object');
    return;
  }
  if (choice.status !== 'PENDING_AUTHORITY') {
    errors.push(choice.id + '.status must remain PENDING_AUTHORITY');
  }
  if (!nonEmpty(choice.title) || !nonEmpty(choice.question)) {
    errors.push(choice.id + ' needs title and question');
  }
  if (!nonEmpty(choice.owner)) errors.push(choice.id + '.owner must be non-empty');
  if (!isObject(choice.validity)
    || !/^\d{4}-\d{2}-\d{2}$/.test(choice.validity.reviewBy ?? '')
    || !/^\d{4}-\d{2}-\d{2}$/.test(choice.validity.expiresOn ?? '')) {
    errors.push(choice.id + '.validity must include ISO reviewBy and expiresOn dates');
  }
  if (!isObject(choice.recommendation)
    || choice.recommendation.nonBinding !== true
    || !nonEmpty(choice.recommendation.optionId)) {
    errors.push(choice.id + '.recommendation must be explicitly non-binding');
  }
  const options = Array.isArray(choice.options) ? choice.options : [];
  if (options.length < 2) errors.push(choice.id + ' needs at least two options');
  const optionIds = options.map((option) => option && option.id);
  if (new Set(optionIds).size !== optionIds.length) errors.push(choice.id + ' option ids must be unique');
  for (const option of options) {
    if (!isObject(option) || !nonEmpty(option.id) || !nonEmpty(option.label)
      || !nonEmpty(option.implications) || !Array.isArray(option.evidenceRequired)
      || option.evidenceRequired.length === 0) {
      errors.push(choice.id + ' options need label, implications and evidenceRequired');
    }
  }
  if (isObject(choice.recommendation)
    && !optionIds.includes(choice.recommendation.optionId)) {
    errors.push(choice.id + '.recommendation.optionId must refer to an option');
  }
}

function validateRequirement(requirement, errors) {
  if (!isObject(requirement)) {
    errors.push('each requirement must be an object');
    return;
  }
  if (requirement.status !== 'REQUIRED_PENDING_AUTHORITY') {
    errors.push(requirement.id + '.status must remain REQUIRED_PENDING_AUTHORITY');
  }
  if (!nonEmpty(requirement.title)
    || !Array.isArray(requirement.must)
    || requirement.must.length < 2
    || requirement.must.some((entry) => !nonEmpty(entry))
    || !Array.isArray(requirement.acceptanceEvidence)
    || requirement.acceptanceEvidence.length === 0) {
    errors.push(requirement.id + ' needs title, at least two must rules and acceptanceEvidence');
  }
}

function validateTemporalCriteria(criteria, errors) {
  if (!isObject(criteria)) {
    errors.push('temporalCriteria must be an object');
    return;
  }
  if (criteria.stateTtlMs?.value !== 600000
    || criteria.stateTtlMs?.status !== 'OBSERVED_CURRENT_NOT_ACCEPTED') {
    errors.push('temporalCriteria.stateTtlMs must preserve the observed 600000 ms value');
  }
  if (criteria.providerCallTimeoutMs?.default !== 5000
    || criteria.providerCallTimeoutMs?.maximum !== 30000
    || criteria.providerCallTimeoutMs?.status !== 'OBSERVED_CURRENT_NOT_ACCEPTED') {
    errors.push('temporalCriteria.providerCallTimeoutMs must preserve observed 5000/30000 ms');
  }
  if (criteria.authorizationCode?.value !== 'SINGLE_USE'
    || criteria.nonce?.value !== 'PER_TRANSACTION_SINGLE_USE') {
    errors.push('authorizationCode and nonce must be single-use criteria');
  }
  if (criteria.sessionTtlMs?.status !== 'PENDING_AUTHORITY'
    || criteria.sessionTtlMs?.value !== null) {
    errors.push('sessionTtlMs must remain null and PENDING_AUTHORITY');
  }
  if (criteria.refreshRotation?.value !== 'REQUIRED_IF_REFRESH_IS_USED'
    || criteria.refreshRotation?.status !== 'REQUIRED_PENDING_AUTHORITY') {
    errors.push('refreshRotation must remain a pending required criterion');
  }
  if (criteria.endToEndDeadlineMs?.status !== 'PENDING_AUTHORITY'
    || criteria.endToEndDeadlineMs?.value !== null) {
    errors.push('endToEndDeadlineMs must remain pending rather than invented');
  }
}

function validateContractShape(contract, errors) {
  if (!isObject(contract)) {
    errors.push('contract must be an object');
    return;
  }
  if (contract.schemaVersion !== 1) errors.push('schemaVersion must be 1');
  if (contract.contractId !== 'PROD-019-IDENTITY-CONTRACT') {
    errors.push('contractId must be PROD-019-IDENTITY-CONTRACT');
  }
  if (contract.status !== 'PROPOSED_PENDING_AUTHORITY') {
    errors.push('status must remain PROPOSED_PENDING_AUTHORITY until authority accepts it');
  }
  if (contract.product !== 'CVG-HIS-V4') errors.push('product must be CVG-HIS-V4');
  if (contract.scope?.mode !== 'CONTRACT_ONLY'
    || contract.scope?.provider !== 'NONE_SELECTED'
    || contract.scope?.functionalChangesAllowed !== false
    || contract.scope?.realCredentialsAllowed !== false
    || contract.scope?.browserTokenStorage !== 'FORBIDDEN') {
    errors.push('scope must remain contract-only, provider-free and browser-token-free');
  }
  if (contract.decisionPolicy?.recommendationsAreBinding !== false) {
    errors.push('recommendationsAreBinding must be false');
  }
  if (contract.decisionPolicy?.emailIsAnIdentityKey !== false) {
    errors.push('emailIsAnIdentityKey must be false');
  }
  if (contract.decisionPolicy?.defaultDecisionStatus !== 'PENDING_AUTHORITY') {
    errors.push('defaultDecisionStatus must be PENDING_AUTHORITY');
  }

  const invariants = Array.isArray(contract.invariants) ? contract.invariants : [];
  const invariantIds = uniqueIds(invariants, 'invariants', errors);
  for (const requiredId of REQUIRED_INVARIANTS) {
    if (!invariantIds.has(requiredId)) errors.push('invariants missing: ' + requiredId);
  }
  const noEmailInvariant = invariants.find((entry) => entry && entry.id === 'no_email_binding');
  if (!noEmailInvariant || !/email.*(bind|key|identity)|identit.*email|email.*(associa|vincula|reconcilia)|nunca.*(cria|reassocia)/i.test(noEmailInvariant.rule ?? '')) {
    errors.push('no_email_binding must explicitly prohibit email identity binding');
  }
  const browserTokenInvariant = invariants.find((entry) => entry && entry.id === 'no_browser_tokens');
  if (!browserTokenInvariant || !/token.*(não|nao|never|not|forbidden|prohibit)/i.test(browserTokenInvariant.rule ?? '')) {
    errors.push('no_browser_tokens must explicitly prohibit browser token storage');
  }

  const sourceRefs = Array.isArray(contract.sourceRefs) ? contract.sourceRefs : [];
  if (new Set(sourceRefs).size !== sourceRefs.length) errors.push('sourceRefs must be unique');
  for (const requiredRef of REQUIRED_SOURCE_REFS) {
    if (!sourceRefs.includes(requiredRef)) errors.push('sourceRefs missing: ' + requiredRef);
  }

  const choices = Array.isArray(contract.choices) ? contract.choices : [];
  const choiceIds = uniqueIds(choices, 'choices', errors);
  for (const id of EXPECTED_CHOICES) {
    if (!choiceIds.has(id)) errors.push('choices missing: ' + id);
  }
  for (const choice of choices) validateChoice(choice, errors);

  const requirements = Array.isArray(contract.requirements) ? contract.requirements : [];
  const requirementIds = uniqueIds(requirements, 'requirements', errors);
  for (const id of EXPECTED_REQUIREMENTS) {
    if (!requirementIds.has(id)) errors.push('requirements missing: ' + id);
  }
  for (const requirement of requirements) validateRequirement(requirement, errors);

  validateTemporalCriteria(contract.temporalCriteria, errors);

  const threats = Array.isArray(contract.threatModel) ? contract.threatModel : [];
  const threatIds = uniqueIds(threats, 'threatModel', errors);
  if (threats.length < 8) errors.push('threatModel needs at least eight cases');
  for (const id of REQUIRED_THREATS) if (!threatIds.has(id)) errors.push('threatModel missing: ' + id);
  for (const threat of threats) {
    if (!isObject(threat) || !nonEmpty(threat.scenario) || !nonEmpty(threat.control)
      || threat.failClosed !== true) {
      errors.push('threatModel entries need scenario, control and failClosed=true');
    }
  }

  const failures = Array.isArray(contract.failureCases) ? contract.failureCases : [];
  const failureIds = uniqueIds(failures, 'failureCases', errors);
  if (failures.length < 8) errors.push('failureCases needs at least eight cases');
  for (const id of REQUIRED_FAILURES) if (!failureIds.has(id)) errors.push('failureCases missing: ' + id);
  for (const failure of failures) {
    if (!isObject(failure) || !nonEmpty(failure.trigger) || !nonEmpty(failure.expected)
      || !nonEmpty(failure.evidence)) {
      errors.push('failureCases entries need trigger, expected and evidence');
    }
  }

  const gate = contract.acceptanceGate;
  if (!isObject(gate)
    || gate.status !== 'PENDING_AUTHORITY'
    || !Array.isArray(gate.requiredBefore)
    || !gate.requiredBefore.includes('PROD-020')
    || !gate.requiredBefore.includes('PROD-021')
    || !Array.isArray(gate.requiredAuthorities)
    || gate.requiredAuthorities.length < 2
    || gate.requiredAuthorities.some((entry) => entry?.status !== 'PENDING_AUTHORITY')
    || !Array.isArray(gate.requiredEvidence)
    || gate.requiredEvidence.length < 4) {
    errors.push('acceptanceGate must keep Product/Security authority and PROD-020/021 pending');
  }
}

export function validateIdentityContract(rootDir = process.cwd(), contractOverride = null) {
  const errors = [];
  let contract = contractOverride;
  if (!contract) {
    try {
      contract = JSON.parse(fs.readFileSync(path.join(rootDir, CONTRACT_PATH), 'utf8'));
    } catch (error) {
      return ['contract is not valid JSON: ' + error.message];
    }
  }
  validateContractShape(contract, errors);

  const sourceRefs = Array.isArray(contract?.sourceRefs) ? contract.sourceRefs : [];
  for (const reference of sourceRefs) {
    addRepositoryReferenceError(rootDir, reference, 'sourceRefs', errors);
  }
  addRepositoryReferenceError(rootDir, DOCUMENT_PATH, 'document', errors);
  const documentPath = path.join(rootDir, DOCUMENT_PATH);
  if (fs.existsSync(documentPath)) {
    const document = fs.readFileSync(documentPath, 'utf8');
    for (const marker of REQUIRED_DOCUMENT_MARKERS) {
      if (!document.includes(marker)) errors.push('document missing marker: ' + marker);
    }
  }
  return [...new Set(errors)].sort();
}

if (import.meta.url === new URL(process.argv[1], 'file:').href) {
  const errors = validateIdentityContract();
  if (errors.length > 0) {
    console.error('[identity-contract] FAIL');
    for (const error of errors) console.error('- ' + error);
    process.exitCode = 1;
  } else {
    console.log('[identity-contract] PASS contract-only PROD-019; authority/provider/integration remain pending');
  }
}
