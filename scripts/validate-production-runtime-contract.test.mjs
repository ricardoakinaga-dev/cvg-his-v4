import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { inspectProductionRuntimeContract } from './validate-production-runtime-contract.mjs';

const contractSource = `
export function isProductionLikeRuntimeEnvironment() {}
export function findProductionRuntimeContractViolations(input) {
  input.databaseConfigured; input.databaseHealthy; input.persistenceMode;
  input.repositoriesUseDatabase; input.repositoriesReady; input.workerReady;
  input.productionReady; input.unitOfWorkReady; input.runtimeDistributedStateEnabled;
  input.redisConfigured; if (input.persistenceMode !== 'database') return [];
  return ['Refusing to start with degraded persistence or single-node state'];
}
export function assertProductionRuntimeContract() {}
`;
const contractTestSource = `
test('production composition passes only when every durability invariant is true', () => {});
test('production composition refuses in-memory or partially initialized state', () => {});
test('development and test runtimes retain an explicit degraded-mode escape hatch', () => {});
`;

function createFixture() {
  const rootDirectory = mkdtempSync(join(tmpdir(), 'cvg-production-runtime-'));
  mkdirSync(join(rootDirectory, 'apps/api/src'), { recursive: true });
  writeFileSync(join(rootDirectory, 'apps/api/src/production-runtime-contract.ts'), contractSource);
  writeFileSync(
    join(rootDirectory, 'apps/api/src/production-runtime-contract.test.ts'),
    contractTestSource
  );
  writeFileSync(
    join(rootDirectory, 'apps/api/src/index.ts'),
    `import { assertProductionRuntimeContract } from './production-runtime-contract.js';
assertProductionRuntimeContract({
  databaseConfigured: true, databaseHealthy: true, persistenceMode: 'database',
  repositoriesUseDatabase: true, repositoriesReady: true, workerReady: true,
  productionReady: true, unitOfWorkReady: true, runtimeDistributedStateEnabled: true,
  redisConfigured: true
});
await apiServer.assertDistributedRuntimeReadiness();`
  );
  writeFileSync(
    join(rootDirectory, 'package.json'),
    JSON.stringify({ scripts: { 'validate:production-runtime': 'node scripts/validate.mjs' } })
  );
  return rootDirectory;
}

test('accepts a complete composition-root contract', () => {
  const rootDirectory = createFixture();
  try {
    assert.deepEqual(inspectProductionRuntimeContract({ rootDirectory }), []);
  } finally {
    rmSync(rootDirectory, { recursive: true, force: true });
  }
});

test('fails closed when the composition root stops passing one invariant', () => {
  const rootDirectory = createFixture();
  try {
    const path = join(rootDirectory, 'apps/api/src/index.ts');
    const source = readFileSync(path, 'utf8').replace('redisConfigured: true', '');
    writeFileSync(path, source);
    const findings = inspectProductionRuntimeContract({ rootDirectory });
    assert.ok(findings.some((finding) => finding.includes('redisConfigured')));
  } finally {
    rmSync(rootDirectory, { recursive: true, force: true });
  }
});
