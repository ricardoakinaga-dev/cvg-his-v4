import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { evaluateAudit } from './lib/vetus-parity-audit.mjs';
import { vetusParityContract } from './lib/vetus-parity-contract.mjs';

const clinicalAreaIds = new Set(['care', 'registrations', 'laboratory']);
const clinicalAreas = vetusParityContract.filter((area) => clinicalAreaIds.has(area.id));
const audit = evaluateAudit(clinicalAreas, (proof) => existsSync(resolve(process.cwd(), proof)));

console.log('# Vetus Clinical Parity Audit');
console.log(`Evidence coverage: ${audit.evidenceScore}/100`);
console.log(`Verified areas: ${audit.verifiedAreas}/${audit.totalAreas}`);
console.log(`Clinical parity: ${audit.passed ? 'VERIFIED' : 'NOT VERIFIED'}`);

for (const area of audit.areas) {
  console.log(`- ${area.name}: ${area.status}; blockers=${area.blockers.length}; missing=${area.missingLayers.join(',') || 'none'}`);
}

if (!audit.passed) {
  process.exitCode = 1;
}
