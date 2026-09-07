#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { navigation, sourceState, validateEvidence } from './lib/usability-test-inventory.mjs';
const [
  resultsPath = 'playwright-report/usability/results.json',
  auditPath = 'tmp/master-usability-audit.json',
  inventoryPath = 'tmp/usability-test-inventory.json',
  discoveryPath = 'tmp/playwright-discovery.json'
] = process.argv.slice(2);
try {
  if (process.env.E2E_EXPECTED_TESTS)
    throw new Error(
      'E2E_EXPECTED_TESTS is unsupported; expected cases must come from frozen discovery'
    );
  const [results, audit, inventory, discovery] = await Promise.all(
    [resultsPath, auditPath, inventoryPath, discoveryPath].map(async (p) =>
      JSON.parse(await readFile(p, 'utf8'))
    )
  );
  const root = resolve(import.meta.dirname, '..');
  const accepted = validateEvidence({
    results,
    audit,
    inventory,
    discovery,
    source: await sourceState(root),
    routes: await navigation(root),
    expectedSha: process.env.GITHUB_SHA || process.env.CI_COMMIT_SHA
  });
  console.log(`Usability evidence valid: ${JSON.stringify(accepted)}`);
} catch (error) {
  console.error(`Usability evidence invalid: ${error.message}`);
  process.exitCode = 1;
}
