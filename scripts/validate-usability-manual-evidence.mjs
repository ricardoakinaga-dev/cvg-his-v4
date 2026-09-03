#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import { validateUsabilityManualEvidence } from './usability-certification-contract.mjs';

const [evidencePath, expectedSha, expectedDecision] = process.argv.slice(2);

if (!evidencePath || !expectedSha || !expectedDecision) {
  console.error(
    'Usage: node scripts/validate-usability-manual-evidence.mjs <evidence.json> <candidate-sha> <go|no-go>'
  );
  process.exit(2);
}

let evidence;
try {
  evidence = JSON.parse(await readFile(evidencePath, 'utf8'));
} catch (error) {
  console.error(`Unable to read manual certification evidence: ${error.message}`);
  process.exit(1);
}

const result = validateUsabilityManualEvidence(evidence, {
  expectedSha,
  expectedDecision
});

if (!result.valid) {
  console.error('Manual usability certification evidence is invalid:');
  for (const error of result.errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `Manual usability evidence valid for ${expectedSha}: ${expectedDecision}, ` +
    `${evidence.visualReview.decisions.length} visual decisions and ${evidence.uat.length} UAT roles.`
);
