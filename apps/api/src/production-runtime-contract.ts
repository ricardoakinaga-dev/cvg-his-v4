import type { PersistenceMode } from './app-state.js';

/**
 * Runtime invariants that must hold before a production-like API is allowed
 * to expose the application server.
 *
 * Bootstrap already validates individual database repositories. This contract
 * is the composition-root guard: it makes it impossible for a future change
 * to report a production-ready process while silently selecting an in-memory,
 * partially initialized, or single-node runtime.
 */
export interface ProductionRuntimeContractInput {
  readonly environment: string;
  readonly databaseConfigured: boolean;
  readonly databaseHealthy: boolean;
  readonly persistenceMode: PersistenceMode;
  readonly repositoriesUseDatabase: boolean;
  readonly repositoriesReady: boolean;
  readonly workerReady: boolean;
  readonly productionReady: boolean;
  readonly unitOfWorkReady: boolean;
  readonly runtimeDistributedStateEnabled: boolean;
  readonly redisConfigured: boolean;
}

export function isProductionLikeRuntimeEnvironment(environment: string): boolean {
  const normalized = environment.trim().toLowerCase();
  return (
    normalized === 'production' ||
    normalized === 'prod' ||
    normalized === 'staging' ||
    normalized === 'stage'
  );
}

export function findProductionRuntimeContractViolations(
  input: ProductionRuntimeContractInput
): readonly string[] {
  if (!isProductionLikeRuntimeEnvironment(input.environment)) return [];

  const violations: string[] = [];
  if (!input.databaseConfigured) violations.push('databaseConfigured=true');
  if (!input.databaseHealthy) violations.push('databaseHealthy=true');
  if (input.persistenceMode !== 'database') violations.push('persistenceMode=database');
  if (!input.repositoriesUseDatabase) violations.push('repositoriesUseDatabase=true');
  if (!input.repositoriesReady) violations.push('repositoriesReady=true');
  if (!input.workerReady) violations.push('workerReady=true');
  if (!input.productionReady) violations.push('productionReady=true');
  if (!input.unitOfWorkReady) violations.push('unitOfWorkReady=true');
  if (!input.runtimeDistributedStateEnabled) {
    violations.push('runtimeDistributedStateEnabled=true');
  }
  if (!input.redisConfigured) violations.push('redisConfigured=true');
  return violations;
}

export function assertProductionRuntimeContract(input: ProductionRuntimeContractInput): void {
  const violations = findProductionRuntimeContractViolations(input);
  if (violations.length === 0) return;

  throw new Error(
    `Production runtime contract failed for ${input.environment}: ${violations.join(', ')}. ` +
      'Refusing to start with degraded persistence or single-node state.'
  );
}
