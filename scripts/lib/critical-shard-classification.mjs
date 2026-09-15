export const CRITICAL_VITEST_SHARDS = Object.freeze(['vitest-unit', 'vitest-integration']);

/**
 * A critical Vitest test belongs to the integration shard when it lives under
 * the canonical integration tree or declares the `.integration.test.ts`
 * suffix beside its package. Database-backed suites must never be silently
 * skipped by the unit shard.
 */
export function isCriticalIntegrationTest(path) {
  if (typeof path !== 'string' || !path) return false;
  return (
    path.startsWith('tests/integration/') ||
    path.endsWith('.integration.test.ts') ||
    // This legacy package test contains a mandatory PostgreSQL repository
    // contract alongside its in-memory unit tests. Keep it in the database
    // shard so unit tests that assert DATABASE_URL is absent remain honest.
    path === 'packages/modules/ml/src/ml.test.ts'
  );
}

export function shardExecutionEnv(shard, baseEnv) {
  if (!CRITICAL_VITEST_SHARDS.includes(shard)) throw new Error(`Unsupported critical Vitest shard: ${shard}`);
  if (shard === 'vitest-integration') return { ...baseEnv, REQUIRE_TEST_DB: '1' };
  return { ...baseEnv };
}
