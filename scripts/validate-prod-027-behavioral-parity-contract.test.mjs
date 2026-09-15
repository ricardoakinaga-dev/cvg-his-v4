import test from 'node:test';
import assert from 'node:assert/strict';

import { validateBehavioralParityContract } from './validate-prod-027-behavioral-parity-contract.mjs';

const ROOT = process.cwd();

async function loadContract() {
  const { readFile } = await import('node:fs/promises');
  return JSON.parse(await readFile('docs/engineering/behavioral-parity-contract-prod-027.json', 'utf8'));
}

test('accepts current contract-only preparation', () => {
  assert.deepEqual(validateBehavioralParityContract(ROOT), []);
});

test('rejects promotion status before Product and QA authority', async () => {
  const contract = await loadContract();
  contract.status = 'APPROVED';
  assert.match(validateBehavioralParityContract(ROOT, contract).join('\n'), /status must remain/);
});

test('rejects functional acceptance in a preparation-only scope', async () => {
  const contract = await loadContract();
  contract.scope.behavioralClaimsAllowed = true;
  assert.match(validateBehavioralParityContract(ROOT, contract).join('\n'), /scope must remain/);
});

test('rejects an omitted parity area', async () => {
  const contract = await loadContract();
  contract.areas = contract.areas.filter((area) => area.id !== 'fiscal');
  assert.match(validateBehavioralParityContract(ROOT, contract).join('\n'), /areas must contain exactly 11|areas missing: fiscal/);
});

test('rejects dropping the observed workflows delta', async () => {
  const contract = await loadContract();
  contract.moduleInventory = contract.moduleInventory.filter((entry) => entry.name !== 'workflows');
  assert.match(validateBehavioralParityContract(ROOT, contract).join('\n'), /current directory count|match packages\/modules exactly/);
});

test('rejects duplicate module classification', async () => {
  const contract = await loadContract();
  contract.moduleInventory[1].id = contract.moduleInventory[0].id;
  assert.match(validateBehavioralParityContract(ROOT, contract).join('\n'), /moduleInventory ids must be unique/);
});

test('rejects collapsing the 45 to 46 baseline drift', async () => {
  const contract = await loadContract();
  contract.observedBaseline.observedModuleCount = 45;
  assert.match(validateBehavioralParityContract(ROOT, contract).join('\n'), /observedModuleCount must match/);
});

test('rejects missing universal scenario coverage', async () => {
  const contract = await loadContract();
  const area = contract.areas.find((candidate) => candidate.id === 'atendimento');
  area.requiredScenarioKinds = area.requiredScenarioKinds.filter((kind) => kind !== 'reconciliation');
  assert.match(validateBehavioralParityContract(ROOT, contract).join('\n'), /atendimento must require reconciliation/);
});

test('rejects a promoted commercial track', async () => {
  const contract = await loadContract();
  contract.commercialJourneyTracks.find((track) => track.id === 'COM-003').status = 'APPROVED';
  assert.match(validateBehavioralParityContract(ROOT, contract).join('\n'), /COM-003 commercial track/);
});
