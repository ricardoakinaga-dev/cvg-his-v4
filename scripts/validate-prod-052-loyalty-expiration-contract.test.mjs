import test from 'node:test';
import assert from 'node:assert/strict';

import { validateLoyaltyExpirationContract } from './validate-prod-052-loyalty-expiration-contract.mjs';

const ROOT = process.cwd();

async function loadContract() {
  const { readFile } = await import('node:fs/promises');
  return JSON.parse(await readFile('docs/engineering/loyalty-expiration-contract-prod-052.json', 'utf8'));
}

test('accepts current contract-only PROD-052 proposal', () => {
  assert.deepEqual(validateLoyaltyExpirationContract(ROOT), []);
});

test('rejects promotion status before authority', async () => {
  const contract = await loadContract();
  contract.status = 'APPROVED';
  assert.match(validateLoyaltyExpirationContract(ROOT, contract).join('\n'), /status must remain/);
});

test('rejects balance mutation permission', async () => {
  const contract = await loadContract();
  contract.scope.balanceMutationAllowed = true;
  assert.match(validateLoyaltyExpirationContract(ROOT, contract).join('\n'), /scope must remain/);
});

test('rejects an approved decision', async () => {
  const contract = await loadContract();
  contract.choices.find((choice) => choice.id === 'C1').status = 'APPROVED';
  assert.match(validateLoyaltyExpirationContract(ROOT, contract).join('\n'), /C1.status/);
});

test('rejects a choice without alternatives', async () => {
  const contract = await loadContract();
  contract.choices.find((choice) => choice.id === 'C4').options = [];
  assert.match(validateLoyaltyExpirationContract(ROOT, contract).join('\n'), /C4 needs at least two options/);
});

test('rejects missing legacy protection invariant', async () => {
  const contract = await loadContract();
  contract.invariants = contract.invariants.filter((entry) => entry.id !== 'legacy_cutover_preserved');
  assert.match(validateLoyaltyExpirationContract(ROOT, contract).join('\n'), /legacy_cutover_preserved/);
});

test('rejects a missing temporal scenario', async () => {
  const contract = await loadContract();
  contract.scenarioMatrix = contract.scenarioMatrix.filter((scenario) => scenario.id !== 'SCN-003');
  assert.match(validateLoyaltyExpirationContract(ROOT, contract).join('\n'), /scenarioMatrix missing: SCN-003/);
});

test('rejects an accepted requirement state', async () => {
  const contract = await loadContract();
  contract.requirements.find((requirement) => requirement.id === 'R6').status = 'ACCEPTED';
  assert.match(validateLoyaltyExpirationContract(ROOT, contract).join('\n'), /R6.status/);
});
