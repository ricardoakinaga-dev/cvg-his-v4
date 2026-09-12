#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const CROSSWALK_PATH = 'docs/triple-a/18-master-prompt-crosswalk.json';
const PROMPT_PATH = 'docs/triple-a/MASTER_PROMPT.md';
const MISSION_PATH = 'docs/triple-a/MASTER_PROMPT_STATE_OF_ART.md';
const QUALITY_BAR_PATH = 'docs/triple-a/QUALITY_BAR_V1.json';
const TRACEABILITY_PATH = 'docs/triple-a/16-requirement-traceability.md';
const SHA256 = /^[0-9a-f]{64}$/i;
const PHASE_ID = /^MP-(\d{2})$/;
const MATRIX_ID = /^F(\d{2})$/;
const ALLOWED_STATUSES = new Set(['PASS', 'PARTIAL', 'NOT PROVEN', 'BLOCKED']);

function hashText(text) {
  return createHash('sha256').update(text).digest('hex');
}

function parsePromptPhases(promptText) {
  const lines = promptText.split(/(?<=\n)/);
  const phases = [];
  for (let index = 0; index < lines.length; index += 1) {
    const match = /^# FASE (\d+) — (.+)\n?$/.exec(lines[index]);
    if (!match) continue;
    const phase = Number(match[1]);
    const startLine = index + 1;
    const endLine = phases.length > 0 ? startLine - 1 : null;
    if (endLine !== null) phases[phases.length - 1].source_end_line = endLine;
    phases.push({
      phase,
      title: match[2],
      source_start_line: startLine,
      source_end_line: lines.length
    });
  }
  if (phases.length > 1) {
    phases[phases.length - 1].source_end_line = lines.length;
  }
  return phases.map((phase) => ({
    ...phase,
    source_sha256: hashText(
      lines.slice(phase.source_start_line - 1, phase.source_end_line).join('')
    )
  }));
}

function parseTraceabilityIds(traceabilityText) {
  return new Set([...traceabilityText.matchAll(/^\|\s*(F\d{2})\s*\|/gm)].map((match) => match[1]));
}

function push(errors, message) {
  errors.push(message);
}

export function validateMasterPromptCrosswalk({
  crosswalk,
  promptText,
  missionText,
  qualityBar,
  traceabilityText
}) {
  const errors = [];
  if (!crosswalk || typeof crosswalk !== 'object') {
    return ['crosswalk must be a JSON object'];
  }
  if (crosswalk.schema_version !== 1) push(errors, 'crosswalk schema_version must be 1');
  if (typeof crosswalk.precedence !== 'string' || crosswalk.precedence.trim().length === 0) {
    push(errors, 'crosswalk precedence rule is missing');
  }

  const source = crosswalk.source_prompt;
  const qualitySource = qualityBar?.source_prompt;
  if (source?.path !== PROMPT_PATH || qualitySource !== PROMPT_PATH) {
    push(errors, `crosswalk and quality bar must use ${PROMPT_PATH}`);
  }
  const currentPromptHash = hashText(promptText ?? '');
  if (source?.sha256 !== currentPromptHash || !SHA256.test(source?.sha256 ?? '')) {
    push(errors, 'crosswalk source prompt hash does not match the current prompt');
  }
  if (qualityBar?.source_prompt_sha256 !== currentPromptHash) {
    push(errors, 'quality bar source prompt hash does not match the current prompt');
  }
  if (source?.sha256 !== qualityBar?.source_prompt_sha256) {
    push(errors, 'crosswalk and quality bar source prompt hashes disagree');
  }

  const mission = crosswalk.expanded_mission;
  const currentMissionHash = hashText(missionText ?? '');
  if (mission?.path !== MISSION_PATH || mission?.sha256 !== currentMissionHash) {
    push(errors, 'crosswalk expanded mission path or hash does not match the current file');
  }

  const expectedPhases = parsePromptPhases(promptText ?? '');
  if (expectedPhases.length !== 61) {
    push(errors, `prompt must contain exactly 61 FASE headings (found ${expectedPhases.length})`);
  }
  if (!Array.isArray(crosswalk.phases) || crosswalk.phases.length !== expectedPhases.length) {
    push(errors, 'crosswalk phases must contain one row per prompt phase');
  }

  const phaseRows = Array.isArray(crosswalk.phases) ? crosswalk.phases : [];
  const seenPhaseIds = new Set();
  for (let index = 0; index < expectedPhases.length; index += 1) {
    const expected = expectedPhases[index];
    const row = phaseRows[index];
    if (!row) {
      push(errors, `missing crosswalk row for MP-${expected.phase.toString().padStart(2, '0')}`);
      continue;
    }
    const expectedId = `MP-${expected.phase.toString().padStart(2, '0')}`;
    if (row.id !== expectedId || seenPhaseIds.has(row.id)) {
      push(errors, `phase ${index} has missing, out-of-order or duplicate id`);
    }
    seenPhaseIds.add(row.id);
    for (const field of [
      'phase',
      'title',
      'source_start_line',
      'source_end_line',
      'source_sha256'
    ]) {
      if (row[field] !== expected[field]) {
        push(errors, `${expectedId} ${field} does not match the frozen prompt`);
      }
    }
    if (row.source_sha256 !== expected.source_sha256 || !SHA256.test(row.source_sha256 ?? '')) {
      push(errors, `${expectedId} source excerpt hash is invalid`);
    }
    if (
      !Array.isArray(row.requirements) ||
      row.requirements.length === 0 ||
      row.requirements.some((item) => typeof item !== 'string' || item.trim().length === 0)
    ) {
      push(errors, `${expectedId} must preserve at least one explicit requirement`);
    }
    if (!ALLOWED_STATUSES.has(row.status)) {
      push(errors, `${expectedId} has an invalid evidence status`);
    }
    const acceptance = row.acceptance;
    if (
      !acceptance ||
      !Array.isArray(acceptance.commands) ||
      !Array.isArray(acceptance.artifacts)
    ) {
      push(errors, `${expectedId} must declare acceptance commands and artifacts`);
    }
    if (
      row.status === 'PASS' &&
      (acceptance?.commands?.length === 0 || acceptance?.artifacts?.length === 0)
    ) {
      push(errors, `${expectedId} cannot be PASS without command and artifact evidence`);
    }
    const matrixIds = Array.isArray(row.traceability_ids) ? row.traceability_ids : [];
    for (const matrixId of matrixIds) {
      if (!MATRIX_ID.test(matrixId))
        push(errors, `${expectedId} contains an invalid matrix id ${matrixId}`);
    }
    if (matrixIds.length === 0 && typeof row.unmapped_reason !== 'string' && row.id !== 'MP-57') {
      push(errors, `${expectedId} has no matrix mapping or explicit unmapped reason`);
    }
  }

  const declaredMatrixIds = crosswalk.traceability_matrix?.ids;
  const actualMatrixIds = parseTraceabilityIds(traceabilityText ?? '');
  if (!Array.isArray(declaredMatrixIds)) {
    push(errors, 'crosswalk traceability_matrix.ids is missing');
  } else {
    for (const matrixId of declaredMatrixIds) {
      if (!actualMatrixIds.has(matrixId))
        push(errors, `crosswalk declares absent matrix id ${matrixId}`);
    }
  }
  const coveredMatrixIds = new Set(phaseRows.flatMap((row) => row.traceability_ids ?? []));
  for (const matrixId of actualMatrixIds) {
    if (!coveredMatrixIds.has(matrixId))
      push(errors, `matrix id ${matrixId} has no prompt phase mapping`);
  }

  const requiredArtifacts = crosswalk.required_literal_artifacts;
  for (const artifact of [
    'artifacts/release/sbom.cdx.json',
    'artifacts/release/enterprise-release-manifest.json',
    'artifacts/release/TRIPLE_A_RELEASE_EVIDENCE.json'
  ]) {
    if (!Array.isArray(requiredArtifacts) || !requiredArtifacts.includes(artifact)) {
      push(errors, `required literal artifact is missing from crosswalk: ${artifact}`);
    }
  }

  const requirementChecks = new Map([
    ['MP-10', ['reminder', 'bob']],
    ['MP-11', ['patient', 'encounter', 'acknowledgement', 'handover.created']],
    ['MP-12', ['clinicalevent', 'accountid', 'patientid', 'causationid']],
    ['MP-13', ['schema version', 'replay', 'ordering', 'out-of-order']],
    ['MP-57', ['feature flags']],
    ['MP-58', ['lgpd']],
    ['MP-59', ['logging']]
  ]);
  for (const [phaseId, terms] of requirementChecks) {
    const row = phaseRows.find((candidate) => candidate.id === phaseId);
    const content = row ? row.requirements.join(' ').toLowerCase() : '';
    for (const term of terms) {
      if (!content.includes(term))
        push(errors, `${phaseId} omits explicit requirement term '${term}'`);
    }
  }

  return [...new Set(errors)].sort();
}

export function validateRepositoryMasterPromptCrosswalk({ rootDir = root } = {}) {
  const read = (relativePath) => readFileSync(resolve(rootDir, relativePath), 'utf8');
  let crosswalk;
  let qualityBar;
  try {
    crosswalk = JSON.parse(read(CROSSWALK_PATH));
    qualityBar = JSON.parse(read(QUALITY_BAR_PATH));
  } catch (error) {
    return [
      `crosswalk or quality bar JSON is invalid: ${error instanceof Error ? error.message : String(error)}`
    ];
  }
  return validateMasterPromptCrosswalk({
    crosswalk,
    promptText: read(PROMPT_PATH),
    missionText: read(MISSION_PATH),
    qualityBar,
    traceabilityText: read(TRACEABILITY_PATH)
  });
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  const errors = validateRepositoryMasterPromptCrosswalk();
  if (errors.length > 0) {
    for (const error of errors) console.error(`[prompt-crosswalk] FAIL ${error}`);
    console.error(`[prompt-crosswalk] ${errors.length} violation(s)`);
    process.exitCode = 1;
  } else {
    console.log('[prompt-crosswalk] PASS 61 prompt phases mapped to 76 traceability requirements');
  }
}
