import assert from 'node:assert/strict';
import test from 'node:test';

import { readFile } from 'node:fs/promises';

import { validateRegistryContract } from './validate-prod-063-registry-contract.mjs';

const ROOT = process.cwd();

async function loadContract() {
  return JSON.parse(await readFile('docs/engineering/registry-contract-prod-063.json', 'utf8'));
}

test('accepts the current PROD-063 local boundary contract', () => {
  assert.deepEqual(validateRegistryContract(ROOT), []);
});

test('rejects authority or functional promotion in the local contract', async () => {
  const contract = await loadContract();
  contract.status = 'APPROVED';
  contract.scope.behavioralClaimsAllowed = true;
  const errors = validateRegistryContract(ROOT, contract).join('\n');
  assert.match(errors, /status must remain/);
  assert.match(errors, /scope cannot authorize/);
});

test('rejects an omitted required scenario', async () => {
  const contract = await loadContract();
  contract.scenarioCatalog = contract.scenarioCatalog.filter((entry) => entry.id !== 'REG-SCN-006');
  assert.match(validateRegistryContract(ROOT, contract).join('\n'), /scenarioCatalog missing: REG-SCN-006/);
});

test('rejects a dependency waiver or real-data scope expansion', async () => {
  const contract = await loadContract();
  contract.scope.dependencyReplan.fullDependencies = ['PROD-024'];
  contract.scope.realDataAllowed = true;
  const errors = validateRegistryContract(ROOT, contract).join('\n');
  assert.match(errors, /dependencyReplan missing PROD-027/);
  assert.match(errors, /scope cannot authorize real data/);
});

test('rejects a missing source reference', async () => {
  const contract = await loadContract();
  contract.sourceRefs = contract.sourceRefs.filter((reference) => reference !== 'apps/api/src/registry-request-boundaries.ts');
  assert.match(validateRegistryContract(ROOT, contract).join('\n'), /sourceRefs missing: apps\/api\/src\/registry-request-boundaries.ts/);
});

