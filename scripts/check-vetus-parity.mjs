import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { evaluateAudit, PROOF_LAYERS } from './lib/vetus-parity-audit.mjs';
import { vetusParityContract } from './lib/vetus-parity-contract.mjs';

const root = process.cwd();
const reportOnly = process.argv.includes('--report-only');
const audit = evaluateAudit(vetusParityContract, (proof) => existsSync(resolve(root, proof)));

console.log('# Vetus Functional Parity Audit');
console.log('');
console.log(`Evidence coverage: ${audit.evidenceScore}/100`);
console.log(`Verified areas: ${audit.verifiedAreas}/${audit.totalAreas}`);
console.log(`Functional parity: ${audit.passed ? 'VERIFIED' : 'NOT VERIFIED'}`);
console.log('');
console.log('| Area | Status | Evidence | Missing proof | Blocking gaps |');
console.log('| --- | --- | ---: | --- | --- |');

for (const area of audit.areas) {
  const available = PROOF_LAYERS.filter((layer) => area.layerResults[layer]).join(', ') || '-';
  const missing = area.missingLayers.join(', ') || '-';
  const blockers = area.blockers.join(' ') || '-';
  console.log(`| ${area.name} | ${area.status} | ${area.score}/100 (${available}) | ${missing} | ${blockers} |`);
}

console.log('');
console.log('This score measures available proof layers, not feature parity.');
console.log('Parity is verified only when every required area has UI, API, persistence, tests, E2E and no known blocker.');

if (!audit.passed && !reportOnly) {
  process.exitCode = 1;
}
