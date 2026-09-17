import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertProductionRuntimeContract,
  findProductionRuntimeContractViolations
} from './production-runtime-contract.js';

const healthyProductionRuntime = {
  environment: 'production',
  databaseConfigured: true,
  databaseHealthy: true,
  persistenceMode: 'database' as const,
  repositoriesUseDatabase: true,
  repositoriesReady: true,
  workerReady: true,
  productionReady: true,
  unitOfWorkReady: true,
  runtimeDistributedStateEnabled: true,
  redisConfigured: true
};

test('production composition passes only when every durability invariant is true', () => {
  assert.deepEqual(findProductionRuntimeContractViolations(healthyProductionRuntime), []);
  assert.doesNotThrow(() => assertProductionRuntimeContract(healthyProductionRuntime));
});

test('production composition refuses in-memory or partially initialized state', () => {
  const violations = findProductionRuntimeContractViolations({
    ...healthyProductionRuntime,
    databaseHealthy: false,
    persistenceMode: 'in-memory',
    repositoriesUseDatabase: false,
    workerReady: false,
    productionReady: false,
    unitOfWorkReady: false,
    runtimeDistributedStateEnabled: false,
    redisConfigured: false
  });

  assert.deepEqual(violations, [
    'databaseHealthy=true',
    'persistenceMode=database',
    'repositoriesUseDatabase=true',
    'workerReady=true',
    'productionReady=true',
    'unitOfWorkReady=true',
    'runtimeDistributedStateEnabled=true',
    'redisConfigured=true'
  ]);
  assert.throws(
    () =>
      assertProductionRuntimeContract({
        ...healthyProductionRuntime,
        databaseHealthy: false,
        persistenceMode: 'in-memory',
        repositoriesUseDatabase: false,
        workerReady: false,
        productionReady: false,
        unitOfWorkReady: false,
        runtimeDistributedStateEnabled: false,
        redisConfigured: false
      }),
    /Production runtime contract failed/
  );
});

test('development and test runtimes retain an explicit degraded-mode escape hatch', () => {
  assert.deepEqual(
    findProductionRuntimeContractViolations({
      ...healthyProductionRuntime,
      environment: 'test',
      databaseConfigured: false,
      databaseHealthy: false,
      persistenceMode: 'in-memory',
      repositoriesUseDatabase: false,
      repositoriesReady: true,
      workerReady: false,
      productionReady: false,
      unitOfWorkReady: false,
      runtimeDistributedStateEnabled: false,
      redisConfigured: false
    }),
    []
  );
});
