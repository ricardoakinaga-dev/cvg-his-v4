#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { validateUsabilityManualEvidence } from './usability-certification-contract.mjs';

const [markdownPath = 'certification/index.md', jsonPath = 'certification/index.json'] =
  process.argv.slice(2);

function requiredEnvironment(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required certification field: ${name}`);
  return value;
}

const candidateSha = requiredEnvironment('CANDIDATE_SHA');
const decision = requiredEnvironment('GO_NO_GO');
const manualEvidencePath = requiredEnvironment('MANUAL_EVIDENCE_PATH');
const manualEvidenceRaw = await readFile(manualEvidencePath, 'utf8');
const manualEvidence = JSON.parse(manualEvidenceRaw);
const manualValidation = validateUsabilityManualEvidence(manualEvidence, {
  expectedSha: candidateSha,
  expectedDecision: decision
});

if (!manualValidation.valid) {
  throw new Error(
    `Invalid manual evidence:\n${manualValidation.errors.map((error) => `- ${error}`).join('\n')}`
  );
}

const technicalResult = requiredEnvironment('TECHNICAL_RESULT');
const crossBrowserResult = requiredEnvironment('CROSS_BROWSER_RESULT');
if (decision === 'go' && (technicalResult !== 'success' || crossBrowserResult !== 'success')) {
  throw new Error('GO requires successful technical and cross-browser jobs');
}

const evidence = {
  generatedAt: new Date().toISOString(),
  sha: candidateSha,
  workflowRun: `${requiredEnvironment('GITHUB_SERVER_URL')}/${requiredEnvironment('GITHUB_REPOSITORY')}/actions/runs/${requiredEnvironment('GITHUB_RUN_ID')}`,
  environment:
    'three isolated PostgreSQL certification runs plus Chromium/Firefox/WebKit essentials',
  technicalResult,
  crossBrowserResult,
  manualEvidence: {
    sha256: createHash('sha256').update(manualEvidenceRaw).digest('hex'),
    visualEvidence: manualEvidence.visualReview.evidenceReference,
    visualApprovers: {
      product: manualEvidence.visualReview.productApprover,
      ux: manualEvidence.visualReview.uxApprover
    },
    uat: manualEvidence.uat.map((entry) => ({
      role: entry.role,
      result: entry.result,
      approver: entry.approver,
      evidenceReference: entry.evidenceReference
    })),
    accessibility: manualEvidence.accessibilityReview,
    residualRisks: manualEvidence.residualRisks,
    decisionEvidence: manualEvidence.goNoGo.evidenceReference,
    decisionApprovers: manualEvidence.goNoGo.approvers
  },
  decision
};

if (!['go', 'no-go'].includes(evidence.decision)) {
  throw new Error(`Invalid go/no-go decision: ${evidence.decision}`);
}

function markdownCell(value) {
  return String(value)
    .replaceAll('|', '\\|')
    .replace(/[\r\n]+/g, ' ');
}

function identity(identityValue) {
  if (!identityValue) return 'not applicable';
  return markdownCell(`${identityValue.name} (${identityValue.corporateId})`);
}

const uatRows = evidence.manualEvidence.uat
  .map(
    (entry) =>
      `| ${markdownCell(entry.role)} | ${markdownCell(entry.result)} | ${identity(entry.approver)} | ${markdownCell(entry.evidenceReference)} |`
  )
  .join('\n');

const markdown = `# Usability certification evidence

- SHA: \`${evidence.sha}\`
- Generated at: ${evidence.generatedAt}
- Environment: ${evidence.environment}
- Three full PostgreSQL runs: **${evidence.technicalResult}**
- Chromium/Firefox/WebKit essentials: **${evidence.crossBrowserResult}**
- Manual evidence SHA-256: \`${evidence.manualEvidence.sha256}\`
- Visual review: ${markdownCell(evidence.manualEvidence.visualEvidence)}
- Product visual approver: ${identity(evidence.manualEvidence.visualApprovers.product)}
- UX visual approver: ${identity(evidence.manualEvidence.visualApprovers.ux)}
- Accessibility review: ${markdownCell(evidence.manualEvidence.accessibility.evidenceReference)}
- Accessibility approver: ${identity(evidence.manualEvidence.accessibility.approver)}
- Residual risks: ${evidence.manualEvidence.residualRisks.length}
- Decision: **${evidence.decision}**
- Decision evidence: ${markdownCell(evidence.manualEvidence.decisionEvidence)}
- Immutable workflow and screenshots/traces: ${evidence.workflowRun}

## Five-role UAT

| Role | Result | Approver | Evidence |
| ---- | ------ | -------- | -------- |
${uatRows}
`;

await Promise.all([
  mkdir(dirname(markdownPath), { recursive: true }),
  mkdir(dirname(jsonPath), { recursive: true })
]);
await Promise.all([
  writeFile(markdownPath, markdown, 'utf8'),
  writeFile(jsonPath, `${JSON.stringify(evidence, null, 2)}\n`, 'utf8')
]);

console.log(`Certification index generated for ${evidence.sha}: ${evidence.decision}.`);
