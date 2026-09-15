#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

export const CONTRACT_PATH = 'docs/engineering/loyalty-expiration-contract-prod-052.json';
export const DOCUMENT_PATH = 'docs/052-contrato-expiracao-pontos.md';

const EXPECTED_CHOICES = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6'];
const EXPECTED_REQUIREMENTS = ['R1', 'R2', 'R3', 'R4', 'R5', 'R6'];
const REQUIRED_INVARIANTS = [
  'tenant_scoped_ledger',
  'ledger_not_rewritten',
  'expiry_reference_instant',
  'expiry_boundary_explicit',
  'expired_not_available',
  'blocked_not_available',
  'integer_points',
  'deterministic_consumption_order',
  'legacy_cutover_preserved',
  'reversal_preserves_provenance',
  'idempotent_balance_projection',
  'no_balance_mutation_in_r1'
];
const REQUIRED_SOURCE_REFS = [
  'docs/2026-09-14-backlog-state-of-art-triplo-aaa.md',
  'docs/2026-09-14-plano-executivo-state-of-art-triplo-aaa.md',
  'packages/modules/commercial/src/index.ts',
  'packages/db/migrations/0021_commercial_loyalty_price_pdv.sql',
  'packages/db/migrations/0022_commercial_rls.sql',
  'apps/api/src/routes/commercial-routes.ts'
];
const REQUIRED_DOCUMENT_MARKERS = [
  'PROPOSED_PENDING_AUTHORITY',
  'PENDING_AUTHORITY',
  'C1',
  'C6',
  'R1',
  'R6',
  'PROD-053',
  'não altera saldo'
];
const REQUIRED_SCENARIOS = [
  'SCN-001',
  'SCN-002',
  'SCN-003',
  'SCN-004',
  'SCN-005',
  'SCN-006',
  'SCN-007',
  'SCN-008'
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

function addReferenceError(rootDir, reference, label, errors) {
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
    errors.push(choice.id + '.validity needs ISO reviewBy and expiresOn');
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
    errors.push(requirement.id + ' needs title, two must rules and acceptanceEvidence');
  }
}

function validateContractShape(contract, errors) {
  if (!isObject(contract)) {
    errors.push('contract must be an object');
    return;
  }
  if (contract.schemaVersion !== 1) errors.push('schemaVersion must be 1');
  if (contract.contractId !== 'PROD-052-LOYALTY-EXPIRATION-CONTRACT') {
    errors.push('contractId must be PROD-052-LOYALTY-EXPIRATION-CONTRACT');
  }
  if (contract.status !== 'PROPOSED_PENDING_AUTHORITY') {
    errors.push('status must remain PROPOSED_PENDING_AUTHORITY');
  }
  if (contract.product !== 'CVG-HIS-V4') errors.push('product must be CVG-HIS-V4');
  if (contract.scope?.mode !== 'CONTRACT_ONLY'
    || contract.scope?.balanceMutationAllowed !== false
    || contract.scope?.migrationAllowed !== false
    || contract.scope?.provider !== 'NONE'
    || contract.scope?.realDataAllowed !== false
    || contract.scope?.currentBehaviorInterpretation !== 'OBSERVATION_NOT_VIOLATION') {
    errors.push('scope must remain contract-only and forbid balance/migration mutation');
  }
  if (contract.decisionPolicy?.recommendationsAreBinding !== false
    || contract.decisionPolicy?.balancesMayBeMutated !== false
    || contract.decisionPolicy?.currentBehaviorIsViolation !== false
    || contract.decisionPolicy?.defaultDecisionStatus !== 'PENDING_AUTHORITY'
    || contract.decisionPolicy?.noBalanceWritesInThisSlice !== true
    || contract.decisionPolicy?.implementationDependency !== 'PROD-053') {
    errors.push('decisionPolicy must keep recommendations pending and balance writes forbidden');
  }

  const invariants = Array.isArray(contract.invariants) ? contract.invariants : [];
  const invariantIds = uniqueIds(invariants, 'invariants', errors);
  for (const id of REQUIRED_INVARIANTS) {
    if (!invariantIds.has(id)) errors.push('invariants missing: ' + id);
  }
  const noMutation = invariants.find((entry) => entry && entry.id === 'no_balance_mutation_in_r1');
  if (!noMutation || !/(não|nao).*(escreve|altera|recalcula|migra|expira)/i.test(noMutation.rule ?? '')) {
    errors.push('no_balance_mutation_in_r1 must forbid balance writes/recalculation');
  }
  const legacy = invariants.find((entry) => entry && entry.id === 'legacy_cutover_preserved');
  if (!legacy || !/(não|nao).*(invent|retroativ|apagar)/i.test(legacy.rule ?? '')) {
    errors.push('legacy_cutover_preserved must forbid invented retroactive expiry');
  }

  const sourceRefs = Array.isArray(contract.sourceRefs) ? contract.sourceRefs : [];
  if (new Set(sourceRefs).size !== sourceRefs.length) errors.push('sourceRefs must be unique');
  for (const ref of REQUIRED_SOURCE_REFS) {
    if (!sourceRefs.includes(ref)) errors.push('sourceRefs missing: ' + ref);
  }
  for (const ref of sourceRefs) addReferenceError(process.cwd(), ref, 'sourceRefs', errors);

  const choices = Array.isArray(contract.choices) ? contract.choices : [];
  const choiceIds = uniqueIds(choices, 'choices', errors);
  for (const id of EXPECTED_CHOICES) if (!choiceIds.has(id)) errors.push('choices missing: ' + id);
  for (const choice of choices) validateChoice(choice, errors);

  const requirements = Array.isArray(contract.requirements) ? contract.requirements : [];
  const requirementIds = uniqueIds(requirements, 'requirements', errors);
  for (const id of EXPECTED_REQUIREMENTS) {
    if (!requirementIds.has(id)) errors.push('requirements missing: ' + id);
  }
  for (const requirement of requirements) validateRequirement(requirement, errors);

  const temporal = contract.temporalCriteria;
  if (!isObject(temporal)) {
    errors.push('temporalCriteria must be an object');
  } else {
    if (temporal.expiresAtInput?.value !== 'OPTIONAL_NULLABLE'
      || temporal.expiresAtInput?.status !== 'OBSERVED_CURRENT_NOT_ACCEPTED') {
      errors.push('expiresAtInput must preserve observed nullable input');
    }
    if (temporal.storedType?.value !== 'TIMESTAMPTZ'
      || temporal.storedType?.status !== 'OBSERVED_CURRENT_NOT_ACCEPTED') {
      errors.push('storedType must preserve observed TIMESTAMPTZ');
    }
    for (const field of ['evaluationInstant', 'timezone', 'cutoffBoundary', 'legacyCutoverDate', 'consumptionTieBreak']) {
      if (temporal[field]?.value !== null || temporal[field]?.status !== 'PENDING_AUTHORITY') {
        errors.push('temporalCriteria.' + field + ' must remain null/PENDING_AUTHORITY');
      }
    }
  }

  const scenarios = Array.isArray(contract.scenarioMatrix) ? contract.scenarioMatrix : [];
  const scenarioIds = uniqueIds(scenarios, 'scenarioMatrix', errors);
  if (scenarios.length < 8) errors.push('scenarioMatrix needs at least eight cases');
  for (const id of REQUIRED_SCENARIOS) if (!scenarioIds.has(id)) errors.push('scenarioMatrix missing: ' + id);
  for (const scenario of scenarios) {
    if (!isObject(scenario) || !nonEmpty(scenario.case)
      || !nonEmpty(scenario.expected) || !nonEmpty(scenario.evidence)) {
      errors.push('scenarioMatrix entries need case, expected and evidence');
    }
  }

  const failures = Array.isArray(contract.failureCases) ? contract.failureCases : [];
  const failureIds = uniqueIds(failures, 'failureCases', errors);
  if (failures.length < 8) errors.push('failureCases needs at least eight cases');
  for (const id of REQUIRED_FAILURES) if (!failureIds.has(id)) errors.push('failureCases missing: ' + id);
  for (const failure of failures) {
    if (!isObject(failure) || !nonEmpty(failure.trigger)
      || !nonEmpty(failure.expected) || !nonEmpty(failure.evidence)) {
      errors.push('failureCases entries need trigger, expected and evidence');
    }
  }

  const gate = contract.acceptanceGate;
  if (!isObject(gate)
    || gate.status !== 'PENDING_AUTHORITY'
    || !Array.isArray(gate.requiredBefore)
    || !gate.requiredBefore.includes('PROD-053')
    || !Array.isArray(gate.requiredAuthorities)
    || gate.requiredAuthorities.length < 2
    || gate.requiredAuthorities.some((entry) => entry?.status !== 'PENDING_AUTHORITY')
    || !Array.isArray(gate.requiredEvidence)
    || gate.requiredEvidence.length < 4) {
    errors.push('acceptanceGate must keep Product/Finance and PROD-053 pending');
  }
}

export function validateLoyaltyExpirationContract(
  rootDir = process.cwd(),
  contractOverride = null
) {
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
  for (const ref of sourceRefs) addReferenceError(rootDir, ref, 'sourceRefs', errors);
  const documentPath = path.join(rootDir, DOCUMENT_PATH);
  addReferenceError(rootDir, DOCUMENT_PATH, 'document', errors);
  if (fs.existsSync(documentPath)) {
    const document = fs.readFileSync(documentPath, 'utf8');
    for (const marker of REQUIRED_DOCUMENT_MARKERS) {
      if (!document.includes(marker)) errors.push('document missing marker: ' + marker);
    }
  }
  return [...new Set(errors)].sort();
}

if (import.meta.url === new URL(process.argv[1], 'file:').href) {
  const errors = validateLoyaltyExpirationContract();
  if (errors.length > 0) {
    console.error('[loyalty-expiration-contract] FAIL');
    for (const error of errors) console.error('- ' + error);
    process.exitCode = 1;
  } else {
    console.log('[loyalty-expiration-contract] PASS contract-only PROD-052; balances and authority remain pending');
  }
}
