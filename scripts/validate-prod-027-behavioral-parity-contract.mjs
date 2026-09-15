#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

export const CONTRACT_PATH = 'docs/engineering/behavioral-parity-contract-prod-027.json';
export const DOCUMENT_PATH = 'docs/027-matriz-comportamental-11-areas.md';

const EXPECTED_AREA_IDS = [
  'cadastros',
  'atendimento',
  'estoque',
  'profissionais-comissoes',
  'laboratorio-diagnosticos',
  'fiscal',
  'financeiro',
  'marketing-comunicacao',
  'relatorios-entregas',
  'acesso-lgpd',
  'integracoes-migracao'
];
const EXPECTED_SCENARIOS = [
  'SCN-001',
  'SCN-002',
  'SCN-003',
  'SCN-004',
  'SCN-005',
  'SCN-006',
  'SCN-007',
  'SCN-008',
  'SCN-009',
  'SCN-010'
];
const EXPECTED_FAILURES = [
  'FAIL-001',
  'FAIL-002',
  'FAIL-003',
  'FAIL-004',
  'FAIL-005',
  'FAIL-006',
  'FAIL-007',
  'FAIL-008',
  'FAIL-009',
  'FAIL-010'
];
const REQUIRED_INVARIANTS = [
  'exactly_eleven_areas',
  'all_observed_modules_classified',
  'one_primary_area',
  'five_scenario_dimensions',
  'manifest_not_behavior',
  'unknown_preserved',
  'commercial_tracks_explicit',
  'synthetic_evidence_only',
  'versioned_reopen',
  'clinical_authority',
  'no_functional_change'
];
const REQUIRED_SOURCE_REFS = [
  'docs/2026-09-14-backlog-state-of-art-triplo-aaa.md',
  'docs/2026-09-14-relatorio-completo-estado-construcao.md',
  'docs/2026-09-14-plano-executivo-state-of-art-triplo-aaa.md',
  'docs/2026-09-13-backlog-prontidao-producao.md',
  'docs/clinical/CLINICAL_CRITICALITY_MATRIX.md',
  'docs/clinical/CLINICAL_SAFETY_INVARIANTS.md',
  'docs/navigation-matrix-current-vs-target.md',
  'scripts/lib/vetus-parity-contract.mjs',
  'scripts/check-vetus-parity.mjs',
  'scripts/check-vetus-clinical-parity.mjs',
  'packages/modules'
];
const REQUIRED_DOCUMENT_MARKERS = [
  'PROPOSED_PENDING_AUTHORITY',
  'CONTRACT_ONLY_PREPARATION',
  '11 áreas',
  '45 módulos',
  '46 entradas',
  'PROD-003',
  'não equivale a',
  'SCN-001',
  'FAIL-001',
  'COM-001'
];
const UNIVERSAL_SCENARIO_KINDS = [
  'positive',
  'negative',
  'permission',
  'persistence',
  'reconciliation'
];

function isObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function nonEmpty(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function idsOf(entries, label, errors) {
  if (!Array.isArray(entries)) {
    errors.push(label + ' must be an array');
    return new Set();
  }
  const ids = entries.map((entry) => entry && entry.id);
  if (ids.some((id) => !nonEmpty(id))) errors.push(label + ' entries need non-empty ids');
  if (new Set(ids).size !== ids.length) errors.push(label + ' ids must be unique');
  return new Set(ids);
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

function currentModuleNames(rootDir) {
  const moduleRoot = path.join(rootDir, 'packages/modules');
  if (!fs.existsSync(moduleRoot)) return [];
  return fs.readdirSync(moduleRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function validateChoice(choice, errors) {
  if (!isObject(choice)) {
    errors.push('each choice must be an object');
    return;
  }
  if (choice.status !== 'PENDING_AUTHORITY') errors.push(choice.id + '.status must remain PENDING_AUTHORITY');
  if (!nonEmpty(choice.title) || !nonEmpty(choice.question)) errors.push(choice.id + ' needs title and question');
  if (!nonEmpty(choice.owner) || !choice.owner.includes('PENDING_AUTHORITY')) {
    errors.push(choice.id + '.owner must preserve pending authority');
  }
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
    if (!isObject(option)
      || !nonEmpty(option.id)
      || !nonEmpty(option.label)
      || !nonEmpty(option.implications)
      || !Array.isArray(option.evidenceRequired)
      || option.evidenceRequired.length === 0) {
      errors.push(choice.id + ' options need label, implications and evidenceRequired');
    }
  }
  if (isObject(choice.recommendation) && !optionIds.includes(choice.recommendation.optionId)) {
    errors.push(choice.id + '.recommendation.optionId must refer to an option');
  }
}

function validateArea(area, errors) {
  if (!isObject(area)) {
    errors.push('each area must be an object');
    return;
  }
  if (!nonEmpty(area.name) || !nonEmpty(area.sourceGrouping) || !nonEmpty(area.risk)) {
    errors.push(area.id + ' needs name, sourceGrouping and risk');
  }
  if (!['VERIFIED_MANIFEST_ONLY', 'BLOCKED_IN_BASELINE'].includes(area.observedStatus)) {
    errors.push(area.id + '.observedStatus must be a bounded observation');
  }
  if (area.acceptanceStatus !== 'PENDING_AUTHORITY') {
    errors.push(area.id + '.acceptanceStatus must remain PENDING_AUTHORITY');
  }
  if (!nonEmpty(area.owner) || !area.owner.includes('PENDING_AUTHORITY')) {
    errors.push(area.id + '.owner must remain pending');
  }
  if (!Array.isArray(area.surfaceRefs) || area.surfaceRefs.length === 0) {
    errors.push(area.id + '.surfaceRefs must be non-empty');
  }
  if (!Array.isArray(area.commercialSubtracks)) errors.push(area.id + '.commercialSubtracks must be an array');
  if (!nonEmpty(area.limitation)) errors.push(area.id + '.limitation must be explicit');
}

function validateModuleInventory(contract, rootDir, errors) {
  const modules = Array.isArray(contract.moduleInventory) ? contract.moduleInventory : [];
  const moduleIds = idsOf(modules, 'moduleInventory', errors);
  const areaIds = new Set(EXPECTED_AREA_IDS);
  const actualNames = currentModuleNames(rootDir);
  const declaredNames = modules.map((entry) => entry && entry.name).filter(nonEmpty).sort();
  if (modules.length !== actualNames.length) {
    errors.push('moduleInventory must cover current directory count: expected ' + actualNames.length);
  }
  if (declaredNames.length !== new Set(declaredNames).size) errors.push('moduleInventory names must be unique');
  if (JSON.stringify(declaredNames) !== JSON.stringify(actualNames)) {
    errors.push('moduleInventory names must match packages/modules exactly');
  }
  for (const moduleName of actualNames) {
    const entry = modules.find((candidate) => candidate && candidate.name === moduleName);
    if (!entry) continue;
    if (entry.path !== 'packages/modules/' + moduleName) errors.push(moduleName + '.path is not canonical');
    if (!areaIds.has(entry.primaryArea)) errors.push(moduleName + '.primaryArea is invalid');
    if (!['PROVISIONAL_PENDING_AUTHORITY', 'BASELINE_COUNT_DRIFT_PENDING'].includes(entry.classificationStatus)) {
      errors.push(moduleName + '.classificationStatus must remain pending');
    }
    if (entry.evidenceStatus !== 'OBSERVED_DIRECTORY_NOT_BEHAVIORAL_PROOF') {
      errors.push(moduleName + '.evidenceStatus must not claim behavior');
    }
    if (!Array.isArray(entry.crossAreaTracks)) errors.push(moduleName + '.crossAreaTracks must be an array');
    if (!nonEmpty(entry.id) || !moduleIds.has(entry.id)) errors.push(moduleName + ' needs a stable id');
  }
  if (contract.observedBaseline?.expectedModuleCount !== 45) {
    errors.push('observedBaseline.expectedModuleCount must preserve source count 45');
  }
  if (contract.observedBaseline?.observedModuleCount !== actualNames.length) {
    errors.push('observedBaseline.observedModuleCount must match current directory count');
  }
  if (contract.observedBaseline?.observedModuleDelta?.status !== 'PENDING_AUTHORITY'
    || !contract.observedBaseline.observedModuleDelta.modules?.includes('workflows')) {
    errors.push('observed module delta workflows must remain PENDING_AUTHORITY');
  }
  if (contract.observedBaseline?.expectedAreaCount !== 11
    || contract.observedBaseline?.observedAreaCount !== 11
    || contract.observedBaseline?.verifiedManifestOnlyAreaIds?.length !== 4
    || contract.observedBaseline?.blockedBaselineAreaIds?.length !== 7) {
    errors.push('observedBaseline must preserve 11 areas and 4/11 plus 7/11 observation');
  }
}

function validateScenarioCatalog(contract, errors) {
  const scenarios = Array.isArray(contract.scenarioCatalog) ? contract.scenarioCatalog : [];
  const scenarioIds = idsOf(scenarios, 'scenarioCatalog', errors);
  for (const id of EXPECTED_SCENARIOS) if (!scenarioIds.has(id)) errors.push('scenarioCatalog missing: ' + id);
  for (const scenario of scenarios) {
    if (!isObject(scenario)
      || !nonEmpty(scenario.kind)
      || !nonEmpty(scenario.case)
      || !nonEmpty(scenario.expected)
      || !nonEmpty(scenario.evidence)) {
      errors.push('scenarioCatalog entries need kind, case, expected and evidence');
    }
  }
}

function validateFailureCases(contract, errors) {
  const failures = Array.isArray(contract.failureCases) ? contract.failureCases : [];
  const failureIds = idsOf(failures, 'failureCases', errors);
  for (const id of EXPECTED_FAILURES) if (!failureIds.has(id)) errors.push('failureCases missing: ' + id);
  for (const failure of failures) {
    if (!isObject(failure)
      || !nonEmpty(failure.trigger)
      || !nonEmpty(failure.expected)
      || !nonEmpty(failure.evidence)) {
      errors.push('failureCases entries need trigger, expected and evidence');
    }
  }
}

function validateContractShape(contract, rootDir, errors) {
  if (!isObject(contract)) {
    errors.push('contract must be an object');
    return;
  }
  if (contract.schemaVersion !== 1) errors.push('schemaVersion must be 1');
  if (contract.contractId !== 'PROD-027-BEHAVIORAL-PARITY-CONTRACT') {
    errors.push('contractId must be PROD-027-BEHAVIORAL-PARITY-CONTRACT');
  }
  if (contract.id !== 'PROD-027') errors.push('id must be PROD-027');
  if (contract.status !== 'PROPOSED_PENDING_AUTHORITY') {
    errors.push('status must remain PROPOSED_PENDING_AUTHORITY');
  }
  if (contract.product !== 'CVG-HIS-V4') errors.push('product must be CVG-HIS-V4');

  const scope = contract.scope;
  if (!isObject(scope)
    || scope.mode !== 'CONTRACT_ONLY_PREPARATION'
    || scope.functionalAcceptanceAllowed !== false
    || scope.behavioralClaimsAllowed !== false
    || scope.fixtureExecutionAllowed !== false
    || scope.realDataAllowed !== false
    || scope.provider !== 'NONE'
    || !isObject(scope.dependencyReplan)
    || !scope.dependencyReplan.doesNotWaive?.includes('PROD-003')) {
    errors.push('scope must remain contract-only and preserve PROD-003');
  }

  const decisionPolicy = contract.decisionPolicy;
  if (!isObject(decisionPolicy)
    || decisionPolicy.recommendationsAreBinding !== false
    || decisionPolicy.currentManifestStatusIsBehavioralPass !== false
    || decisionPolicy.filePresenceIsParityProof !== false
    || decisionPolicy.defaultDecisionStatus !== 'PENDING_AUTHORITY'
    || decisionPolicy.noFunctionalChangesInThisSlice !== true
    || decisionPolicy.noFixturesOrRealDataInThisSlice !== true
    || !decisionPolicy.implementationDependencies?.includes('PROD-003')) {
    errors.push('decisionPolicy must forbid promotion and functional changes');
  }

  const invariantIds = idsOf(contract.invariants, 'invariants', errors);
  for (const id of REQUIRED_INVARIANTS) if (!invariantIds.has(id)) errors.push('invariants missing: ' + id);
  const invariantById = new Map((contract.invariants ?? []).map((entry) => [entry && entry.id, entry]));
  if (!/(não|nao).*(PASS|comport|equival)/i.test(invariantById.get('manifest_not_behavior')?.rule ?? '')) {
    errors.push('manifest_not_behavior must forbid a behavioral PASS');
  }
  if (!/(UNKNOWN|BLOCKED).*(não|nao).*(infer|invent)/i.test(invariantById.get('unknown_preserved')?.rule ?? '')) {
    errors.push('unknown_preserved must forbid invented equivalence');
  }
  if (!/(PHI|dados reais).*(proibid|proib)/i.test(invariantById.get('synthetic_evidence_only')?.rule ?? '')) {
    errors.push('synthetic_evidence_only must forbid real/PHI data');
  }

  const sourceRefs = Array.isArray(contract.sourceRefs) ? contract.sourceRefs : [];
  if (new Set(sourceRefs).size !== sourceRefs.length) errors.push('sourceRefs must be unique');
  for (const ref of REQUIRED_SOURCE_REFS) if (!sourceRefs.includes(ref)) errors.push('sourceRefs missing: ' + ref);
  for (const ref of sourceRefs) addReferenceError(rootDir, ref, 'sourceRefs', errors);

  const areas = Array.isArray(contract.areas) ? contract.areas : [];
  const areaIds = idsOf(areas, 'areas', errors);
  if (areas.length !== EXPECTED_AREA_IDS.length) errors.push('areas must contain exactly 11 entries');
  for (const id of EXPECTED_AREA_IDS) if (!areaIds.has(id)) errors.push('areas missing: ' + id);
  for (const area of areas) validateArea(area, errors);
  const requiredScenarioKinds = new Set(UNIVERSAL_SCENARIO_KINDS);
  for (const area of areas) {
    const kinds = new Set(area.requiredScenarioKinds ?? UNIVERSAL_SCENARIO_KINDS);
    for (const kind of requiredScenarioKinds) if (!kinds.has(kind)) {
      errors.push(area.id + ' must require ' + kind);
    }
  }

  validateModuleInventory(contract, rootDir, errors);
  validateScenarioCatalog(contract, errors);
  validateFailureCases(contract, errors);

  const tracks = Array.isArray(contract.commercialJourneyTracks) ? contract.commercialJourneyTracks : [];
  const trackIds = idsOf(tracks, 'commercialJourneyTracks', errors);
  for (const id of ['COM-001', 'COM-002', 'COM-003', 'COM-004']) {
    if (!trackIds.has(id)) errors.push('commercialJourneyTracks missing: ' + id);
  }
  for (const track of tracks) {
    if (!isObject(track)
      || !nonEmpty(track.name)
      || !areaIds.has(track.primaryArea)
      || !Array.isArray(track.modules)
      || track.modules.length === 0
      || !Array.isArray(track.requiredScenarioKinds)
      || !track.requiredScenarioKinds.every((kind) => requiredScenarioKinds.has(kind) || kind === 'concurrency' || kind === 'retry/replay')
      || track.status !== 'PENDING_AUTHORITY') {
      errors.push(track.id + ' commercial track is incomplete or promoted');
    }
  }

  const choices = Array.isArray(contract.choices) ? contract.choices : [];
  const choiceIds = idsOf(choices, 'choices', errors);
  if (choices.length !== 6) errors.push('choices must contain C1-C6 only');
  for (const id of ['C1', 'C2', 'C3', 'C4', 'C5', 'C6']) if (!choiceIds.has(id)) errors.push('choices missing: ' + id);
  for (const choice of choices) validateChoice(choice, errors);

  const requirements = Array.isArray(contract.requirements) ? contract.requirements : [];
  const requirementIds = idsOf(requirements, 'requirements', errors);
  if (requirements.length !== 6) errors.push('requirements must contain R1-R6 only');
  for (const id of ['R1', 'R2', 'R3', 'R4', 'R5', 'R6']) if (!requirementIds.has(id)) errors.push('requirements missing: ' + id);
  for (const requirement of requirements) {
    if (!isObject(requirement)
      || requirement.status !== 'REQUIRED_PENDING_AUTHORITY'
      || !nonEmpty(requirement.title)
      || !Array.isArray(requirement.must)
      || requirement.must.length < 2
      || !requirement.must.every(nonEmpty)
      || !Array.isArray(requirement.acceptanceEvidence)
      || requirement.acceptanceEvidence.length === 0) {
      errors.push(requirement.id + ' requirement must remain pending with rules and evidence');
    }
  }

  const gate = contract.acceptanceGate;
  if (!isObject(gate)
    || gate.status !== 'PENDING_AUTHORITY'
    || !Array.isArray(gate.requiredBefore)
    || !gate.requiredBefore.includes('PROD-035')
    || !Array.isArray(gate.requiredAuthorities)
    || gate.requiredAuthorities.length < 2
    || gate.requiredAuthorities.some((entry) => entry?.status !== 'PENDING_AUTHORITY')
    || !Array.isArray(gate.requiredEvidence)
    || gate.requiredEvidence.length < 6
    || !nonEmpty(gate.promotionRule)
    || !gate.promotionRule.toLocaleLowerCase().includes('não promover')) {
    errors.push('acceptanceGate must keep authorities, evidence and no-promotion rule pending');
  }
}

export function validateBehavioralParityContract(rootDir = process.cwd(), contractOverride = null) {
  const errors = [];
  let contract = contractOverride;
  if (!contract) {
    try {
      contract = JSON.parse(fs.readFileSync(path.join(rootDir, CONTRACT_PATH), 'utf8'));
    } catch (error) {
      return ['contract is not valid JSON: ' + error.message];
    }
  }
  validateContractShape(contract, rootDir, errors);

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
  const errors = validateBehavioralParityContract();
  if (errors.length > 0) {
    console.error('[behavioral-parity-contract] FAIL');
    for (const error of errors) console.error('- ' + error);
    process.exitCode = 1;
  } else {
    console.log('[behavioral-parity-contract] PASS contract-only PROD-027; 11 areas and 46 observed modules remain pending');
  }
}
