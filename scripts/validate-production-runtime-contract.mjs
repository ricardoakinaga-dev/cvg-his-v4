#!/usr/bin/env node

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const REQUIRED_INVARIANTS = [
  'databaseConfigured',
  'databaseHealthy',
  'persistenceMode',
  'repositoriesUseDatabase',
  'repositoriesReady',
  'workerReady',
  'productionReady',
  'unitOfWorkReady',
  'runtimeDistributedStateEnabled',
  'redisConfigured'
];

const readText = (rootDirectory, relativePath) =>
  readFileSync(join(rootDirectory, relativePath), 'utf8');

export function inspectProductionRuntimeContract({ rootDirectory = process.cwd() } = {}) {
  const findings = [];
  const requiredFiles = [
    'apps/api/src/production-runtime-contract.ts',
    'apps/api/src/production-runtime-contract.test.ts',
    'apps/api/src/index.ts'
  ];

  for (const relativePath of requiredFiles) {
    if (!existsSync(join(rootDirectory, relativePath))) {
      findings.push(`missing required production runtime contract file: ${relativePath}`);
    }
  }

  if (findings.length > 0) return findings;

  const contract = readText(rootDirectory, requiredFiles[0]);
  const contractTest = readText(rootDirectory, requiredFiles[1]);
  const compositionRoot = readText(rootDirectory, requiredFiles[2]);

  for (const invariant of REQUIRED_INVARIANTS) {
    if (!contract.includes(invariant)) {
      findings.push(`production runtime contract does not declare invariant: ${invariant}`);
    }
    const passedExplicitly = compositionRoot.includes(`${invariant}:`);
    const passedByShorthand = compositionRoot.includes(`${invariant},`);
    if (!passedExplicitly && !passedByShorthand) {
      findings.push(`composition root does not pass invariant: ${invariant}`);
    }
  }

  for (const marker of [
    'isProductionLikeRuntimeEnvironment',
    'findProductionRuntimeContractViolations',
    'assertProductionRuntimeContract',
    "persistenceMode !== 'database'",
    'Refusing to start with degraded persistence or single-node state'
  ]) {
    if (!contract.includes(marker)) {
      findings.push(`production runtime contract is missing marker: ${marker}`);
    }
  }

  for (const marker of [
    "from './production-runtime-contract.js'",
    'assertProductionRuntimeContract({',
    'await apiServer.assertDistributedRuntimeReadiness()'
  ]) {
    if (!compositionRoot.includes(marker)) {
      findings.push(`composition root is missing marker: ${marker}`);
    }
  }

  for (const marker of [
    'production composition passes only when every durability invariant is true',
    'production composition refuses in-memory or partially initialized state',
    'development and test runtimes retain an explicit degraded-mode escape hatch'
  ]) {
    if (!contractTest.includes(marker)) {
      findings.push(`production runtime contract test is missing scenario: ${marker}`);
    }
  }

  const packageJson = JSON.parse(readText(rootDirectory, 'package.json'));
  if (!packageJson.scripts?.['validate:production-runtime']) {
    findings.push('package.json is missing validate:production-runtime script');
  }

  return findings;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const findings = inspectProductionRuntimeContract();
  if (findings.length > 0) {
    console.error('# Production Runtime Contract: FAIL');
    for (const finding of findings) console.error(`- ${finding}`);
    process.exitCode = 1;
  } else {
    console.log('# Production Runtime Contract: PASS');
    console.log('Composition root, invariant implementation, tests and package gate are present.');
  }
}
