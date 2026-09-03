#!/usr/bin/env node

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const [markdownPath = 'certification/index.md', jsonPath = 'certification/index.json'] =
  process.argv.slice(2);

function requiredEnvironment(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required certification field: ${name}`);
  return value;
}

const evidence = {
  generatedAt: new Date().toISOString(),
  sha: requiredEnvironment('GITHUB_SHA'),
  workflowRun: `${requiredEnvironment('GITHUB_SERVER_URL')}/${requiredEnvironment('GITHUB_REPOSITORY')}/actions/runs/${requiredEnvironment('GITHUB_RUN_ID')}`,
  environment:
    'three isolated PostgreSQL certification runs plus Chromium/Firefox/WebKit essentials',
  technicalResult: requiredEnvironment('TECHNICAL_RESULT'),
  crossBrowserResult: requiredEnvironment('CROSS_BROWSER_RESULT'),
  uatEvidence: requiredEnvironment('UAT_EVIDENCE'),
  approvers: requiredEnvironment('UAT_APPROVERS'),
  residualRisks: requiredEnvironment('RESIDUAL_RISKS'),
  decision: requiredEnvironment('GO_NO_GO')
};

if (!['go', 'no-go'].includes(evidence.decision)) {
  throw new Error(`Invalid go/no-go decision: ${evidence.decision}`);
}

const markdown = `# Usability certification evidence

- SHA: \`${evidence.sha}\`
- Generated at: ${evidence.generatedAt}
- Environment: ${evidence.environment}
- Three full PostgreSQL runs: **${evidence.technicalResult}**
- Chromium/Firefox/WebKit essentials: **${evidence.crossBrowserResult}**
- UAT evidence (reception, veterinarian, nursing and administration): ${evidence.uatEvidence}
- Approvers: ${evidence.approvers}
- Residual risks: ${evidence.residualRisks}
- Decision: **${evidence.decision}**
- Immutable workflow and screenshots/traces: ${evidence.workflowRun}
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
