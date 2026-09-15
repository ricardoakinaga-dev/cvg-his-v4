import test from 'node:test';
import assert from 'node:assert/strict';

import { validateIdentityContract } from './validate-prod-019-identity-contract.mjs';

const ROOT = process.cwd();

async function loadContract() {
  const { readFile } = await import('node:fs/promises');
  return JSON.parse(await readFile('docs/engineering/identity-contract-prod-019.json', 'utf8'));
}

test('accepts the current contract-only PROD-019 proposal', () => {
  const errors = validateIdentityContract(ROOT);
  assert.deepEqual(errors, []);
});

test('rejects promotion status before authority', async () => {
  const contract = await loadContract();
  contract.status = 'APPROVED';
  assert.match(validateIdentityContract(ROOT, contract).join('\n'), /status must remain/);
});

test('rejects email as an external identity key', async () => {
  const contract = await loadContract();
  contract.invariants = contract.invariants.filter((entry) => entry.id !== 'no_email_binding');
  assert.match(validateIdentityContract(ROOT, contract).join('\n'), /no_email_binding/);
});

test('rejects an approved choice', async () => {
  const contract = await loadContract();
  contract.choices.find((choice) => choice.id === 'C1').status = 'APPROVED';
  assert.match(validateIdentityContract(ROOT, contract).join('\n'), /C1.status/);
});

test('rejects a choice without alternatives', async () => {
  const contract = await loadContract();
  contract.choices.find((choice) => choice.id === 'C2').options = [];
  assert.match(validateIdentityContract(ROOT, contract).join('\n'), /C2 needs at least two options/);
});

test('rejects a missing failure case', async () => {
  const contract = await loadContract();
  contract.failureCases = contract.failureCases.filter((failure) => failure.id !== 'FAIL-004');
  assert.match(validateIdentityContract(ROOT, contract).join('\n'), /failureCases missing: FAIL-004/);
});

test('rejects an accepted requirement state', async () => {
  const contract = await loadContract();
  contract.requirements.find((requirement) => requirement.id === 'R6').status = 'ACCEPTED';
  assert.match(validateIdentityContract(ROOT, contract).join('\n'), /R6.status/);
});
