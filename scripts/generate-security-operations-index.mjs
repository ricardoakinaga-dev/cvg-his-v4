#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const [
  markdownPath = 'certification/security-operations.md',
  jsonPath = 'certification/security-operations.json'
] = process.argv.slice(2);

function requiredEnvironment(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required security-operations field: ${name}`);
  return value;
}

function rejectPlaceholder(name, value) {
  if (/^(?:n\/?a|none|todo|pending|tbd|-|sem evid[eê]ncia)$/i.test(value) || value.length < 8) {
    throw new Error(`Invalid or placeholder security-operations field: ${name}`);
  }
}

const evidence = {
  generatedAt: new Date().toISOString(),
  sha: requiredEnvironment('RELEASE_SHA'),
  workflowRun: `${requiredEnvironment('GITHUB_SERVER_URL')}/${requiredEnvironment('GITHUB_REPOSITORY')}/actions/runs/${requiredEnvironment('GITHUB_RUN_ID')}`,
  targetEnvironment: requiredEnvironment('TARGET_ENVIRONMENT'),
  secretClasses: requiredEnvironment('SECRET_CLASSES'),
  previousVersionLabel: requiredEnvironment('PREVIOUS_VERSION_LABEL'),
  currentVersionLabel: requiredEnvironment('CURRENT_VERSION_LABEL'),
  rotationEvidenceReference: requiredEnvironment('ROTATION_EVIDENCE_REFERENCE'),
  breakGlassEvidenceReference: requiredEnvironment('BREAK_GLASS_EVIDENCE_REFERENCE'),
  vaultAuditEvidenceReference: requiredEnvironment('VAULT_AUDIT_EVIDENCE_REFERENCE'),
  executors: requiredEnvironment('EXECUTORS'),
  approvers: requiredEnvironment('APPROVERS'),
  residualRisks: requiredEnvironment('RESIDUAL_RISKS'),
  technicalResult: requiredEnvironment('TECHNICAL_RESULT'),
  decision: requiredEnvironment('GO_NO_GO')
};

if (!/^[0-9a-f]{40}$/.test(evidence.sha)) {
  throw new Error('RELEASE_SHA must be a full lowercase hexadecimal commit SHA');
}
if (!['staging', 'production'].includes(evidence.targetEnvironment)) {
  throw new Error(`Invalid target environment: ${evidence.targetEnvironment}`);
}
if (!['go', 'no-go'].includes(evidence.decision)) {
  throw new Error(`Invalid go/no-go decision: ${evidence.decision}`);
}
if (evidence.previousVersionLabel === evidence.currentVersionLabel) {
  throw new Error('Previous and current secret version labels must differ');
}
if (evidence.decision === 'go' && evidence.technicalResult !== 'success') {
  throw new Error('A go decision requires successful technical checks');
}

for (const [name, value] of [
  ['SECRET_CLASSES', evidence.secretClasses],
  ['PREVIOUS_VERSION_LABEL', evidence.previousVersionLabel],
  ['CURRENT_VERSION_LABEL', evidence.currentVersionLabel],
  ['ROTATION_EVIDENCE_REFERENCE', evidence.rotationEvidenceReference],
  ['BREAK_GLASS_EVIDENCE_REFERENCE', evidence.breakGlassEvidenceReference],
  ['VAULT_AUDIT_EVIDENCE_REFERENCE', evidence.vaultAuditEvidenceReference],
  ['EXECUTORS', evidence.executors],
  ['APPROVERS', evidence.approvers]
]) {
  rejectPlaceholder(name, value);
}

const markdown = `# Security operations certification evidence

- SHA: \`${evidence.sha}\`
- Generated at: ${evidence.generatedAt}
- Target environment: **${evidence.targetEnvironment}**
- Secret classes exercised: ${evidence.secretClasses}
- Version transition: \`${evidence.previousVersionLabel}\` → \`${evidence.currentVersionLabel}\`
- Technical checks: **${evidence.technicalResult}**
- Rotation evidence: ${evidence.rotationEvidenceReference}
- Break-glass evidence: ${evidence.breakGlassEvidenceReference}
- Vault audit evidence: ${evidence.vaultAuditEvidenceReference}
- Executors: ${evidence.executors}
- Approvers: ${evidence.approvers}
- Residual risks: ${evidence.residualRisks}
- Decision: **${evidence.decision}**
- Immutable workflow evidence: ${evidence.workflowRun}

This index contains references and version labels only. Secret values must never be included.
`;

await Promise.all([
  mkdir(dirname(markdownPath), { recursive: true }),
  mkdir(dirname(jsonPath), { recursive: true })
]);
await Promise.all([
  writeFile(markdownPath, markdown, 'utf8'),
  writeFile(jsonPath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8')
]);

console.log(`Security operations index generated for ${evidence.sha}: ${evidence.decision}.`);
