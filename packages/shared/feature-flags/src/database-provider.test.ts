import { getTableName, type Table } from 'drizzle-orm';
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createDatabaseFeatureFlagProvider,
  type DatabaseFeatureFlagProviderOptions
} from './database-provider.js';
import {
  createFlagDecision,
  clearFeatureFlagRegistryForTests,
  featureFlagRegistry,
  registerFeatureFlags,
  type EvaluationContext,
  type FeatureFlagProvider,
  type FlagDecision,
  type FlagDefinition
} from './index.js';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const TEST_FLAG: FlagDefinition = {
  key: 'test.feature.enabled',
  owner: 'test-owner',
  description: 'Test feature flag for PR-FF-14 validation',
  defaultValue: false,
  scopes: ['environment', 'account'],
  expiresAt: '2026-12-31T00:00:00.000Z',
  auditRequired: true,
  tags: ['test']
};

const TEST_ENV = 'staging';

function createFallbackProvider(enabledByDefault = false): FeatureFlagProvider {
  return {
    name: 'fallback-env',
    evaluate(definition: FlagDefinition, context: EvaluationContext): FlagDecision {
      return createFlagDecision(definition, context, {
        enabled: enabledByDefault,
        provider: 'fallback-env',
        reason: 'bootstrap'
      });
    }
  };
}

// ---------------------------------------------------------------------------
// Mock database client factory
// ---------------------------------------------------------------------------

function createMockDbClient(responses: {
  flagByKey?: Array<{
    id: string;
    key: string;
    enabled: boolean;
    defaultValue: boolean;
    expiresAt?: Date;
  }>;
  overrides?: Array<{
    id: string;
    flagId: string;
    environment: string | null;
    accountIdOverride: string | null;
    enabled: boolean;
    percentage: number | null;
    allowedUsers: string[];
  }>;
  throwOnFlagQuery?: boolean;
  throwOnOverrideQuery?: boolean;
}) {
  return {
    select: () => ({
      from: (table: Table) => ({
        where: () => {
          const execute = async () => {
            const name = getTableName(table);
            if (responses.throwOnFlagQuery && name === 'feature_flags')
              throw new Error('DB_ERROR_FLAG_QUERY');
            if (responses.throwOnOverrideQuery && name === 'feature_flag_overrides')
              throw new Error('DB_ERROR_OVERRIDE_QUERY');
            return name === 'feature_flags'
              ? (responses.flagByKey ?? [])
              : (responses.overrides ?? []).map((o) => ({ updatedAt: new Date(0), ...o }));
          };
          return {
            then: (resolve: (rows: unknown[]) => unknown, reject: (error: unknown) => unknown) =>
              execute().then(resolve, reject),
            limit: execute
          };
        }
      })
    })
  } as any;
}

// ---------------------------------------------------------------------------
// PR-FF-14: Resiliency — Fallback, Cache, and Rollout Validation
// ---------------------------------------------------------------------------

test('falls back gracefully when DB throws', async () => {
  clearFeatureFlagRegistryForTests();
  registerFeatureFlags([TEST_FLAG], featureFlagRegistry);

  const mockDb = createMockDbClient({ throwOnFlagQuery: true });
  const fallback = createFallbackProvider(true);
  const provider = createDatabaseFeatureFlagProvider(mockDb, fallback);

  const decision = await provider.evaluate(TEST_FLAG, {
    environment: TEST_ENV,
    accountId: 'account-test'
  });

  assert.equal(decision.enabled, true);
  assert.equal(decision.provider, 'fallback-env');
  assert.equal(decision.reason, 'bootstrap');
});

test('delegates to fallback when flag not in DB', async () => {
  clearFeatureFlagRegistryForTests();
  registerFeatureFlags([TEST_FLAG], featureFlagRegistry);

  const mockDb = createMockDbClient({ flagByKey: [] });
  const fallback = createFallbackProvider(false);
  const provider = createDatabaseFeatureFlagProvider(mockDb, fallback);

  const decision = await provider.evaluate(TEST_FLAG, {
    environment: TEST_ENV,
    accountId: 'account-test'
  });

  assert.equal(decision.enabled, false);
  assert.equal(decision.reason, 'bootstrap');
  assert.equal(decision.provider, 'fallback-env');
});

test('kill switch on flag definition disables regardless of defaultValue', async () => {
  clearFeatureFlagRegistryForTests();
  registerFeatureFlags([TEST_FLAG], featureFlagRegistry);

  const mockDb = createMockDbClient({
    flagByKey: [{ id: 'flag-1', key: TEST_FLAG.key, enabled: false, defaultValue: true }]
  });
  const fallback = createFallbackProvider(true);
  const provider = createDatabaseFeatureFlagProvider(mockDb, fallback);

  const decision = await provider.evaluate(TEST_FLAG, {
    environment: TEST_ENV,
    accountId: 'account-test'
  });

  assert.equal(decision.enabled, false);
  assert.equal(decision.reason, 'kill_switch');
  assert.deepEqual(decision.metadata, { level: 'flag' });
});

test('kill switch on override takes precedence over flag-level enabled', async () => {
  clearFeatureFlagRegistryForTests();
  registerFeatureFlags([TEST_FLAG], featureFlagRegistry);

  const mockDb = createMockDbClient({
    flagByKey: [{ id: 'flag-1', key: TEST_FLAG.key, enabled: true, defaultValue: true }],
    overrides: [
      {
        id: 'ovr-1',
        flagId: 'flag-1',
        environment: TEST_ENV,
        accountIdOverride: null,
        enabled: false,
        percentage: null,
        allowedUsers: []
      }
    ]
  });
  const fallback = createFallbackProvider(true);
  const provider = createDatabaseFeatureFlagProvider(mockDb, fallback);

  const decision = await provider.evaluate(TEST_FLAG, {
    environment: TEST_ENV,
    accountId: 'account-test'
  });

  assert.equal(decision.enabled, false);
  assert.equal(decision.reason, 'kill_switch');
  assert.deepEqual(decision.metadata, { level: 'override' });
});

test('allowlist of userIds enables for matching user', async () => {
  clearFeatureFlagRegistryForTests();
  registerFeatureFlags([TEST_FLAG], featureFlagRegistry);

  const mockDb = createMockDbClient({
    flagByKey: [{ id: 'flag-1', key: TEST_FLAG.key, enabled: true, defaultValue: false }],
    overrides: [
      {
        id: 'ovr-1',
        flagId: 'flag-1',
        environment: TEST_ENV,
        accountIdOverride: null,
        enabled: true,
        percentage: null,
        allowedUsers: ['user_admin', 'user_vet']
      }
    ]
  });
  const fallback = createFallbackProvider(false);
  const provider = createDatabaseFeatureFlagProvider(mockDb, fallback);

  const decision = await provider.evaluate(TEST_FLAG, {
    environment: TEST_ENV,
    accountId: 'account-test',
    userId: 'user_vet'
  });

  assert.equal(decision.enabled, true);
  assert.equal(decision.reason, 'allowlist');
});

test('allowlist excludes non-matching userIds', async () => {
  clearFeatureFlagRegistryForTests();
  registerFeatureFlags([TEST_FLAG], featureFlagRegistry);

  const mockDb = createMockDbClient({
    flagByKey: [{ id: 'flag-1', key: TEST_FLAG.key, enabled: true, defaultValue: false }],
    overrides: [
      {
        id: 'ovr-1',
        flagId: 'flag-1',
        environment: TEST_ENV,
        accountIdOverride: null,
        enabled: true,
        percentage: null,
        allowedUsers: ['user_admin', 'user_vet']
      }
    ]
  });
  const fallback = createFallbackProvider(false);
  const provider = createDatabaseFeatureFlagProvider(mockDb, fallback);

  const decision = await provider.evaluate(TEST_FLAG, {
    environment: TEST_ENV,
    accountId: 'account-test',
    userId: 'user_unknown'
  });

  assert.equal(decision.enabled, false);
  assert.equal(decision.reason, 'allowlist_excluded');
});

test('percentage rollout is deterministic — same result on repeated evaluations', async () => {
  clearFeatureFlagRegistryForTests();
  registerFeatureFlags([TEST_FLAG], featureFlagRegistry);

  const mockDb = createMockDbClient({
    flagByKey: [{ id: 'flag-1', key: TEST_FLAG.key, enabled: true, defaultValue: false }],
    overrides: [
      {
        id: 'ovr-1',
        flagId: 'flag-1',
        environment: TEST_ENV,
        accountIdOverride: null,
        enabled: true,
        percentage: 50,
        allowedUsers: []
      }
    ]
  });
  const fallback = createFallbackProvider(false);
  const provider = createDatabaseFeatureFlagProvider(mockDb, fallback);

  const accountId = 'acc_deterministic_test';
  const first = await provider.evaluate(TEST_FLAG, { environment: TEST_ENV, accountId });

  for (let i = 0; i < 5; i++) {
    const again = await provider.evaluate(TEST_FLAG, { environment: TEST_ENV, accountId });
    assert.equal(again.enabled, first.enabled, `Run ${i}: same account must produce same result`);
    assert.equal(again.reason, 'percentage');
  }
});

test('percentage 100 always enables regardless of hash', async () => {
  clearFeatureFlagRegistryForTests();
  registerFeatureFlags([TEST_FLAG], featureFlagRegistry);

  const mockDb = createMockDbClient({
    flagByKey: [{ id: 'flag-1', key: TEST_FLAG.key, enabled: true, defaultValue: false }],
    overrides: [
      {
        id: 'ovr-1',
        flagId: 'flag-1',
        environment: TEST_ENV,
        accountIdOverride: null,
        enabled: true,
        percentage: 100,
        allowedUsers: []
      }
    ]
  });
  const fallback = createFallbackProvider(false);
  const provider = createDatabaseFeatureFlagProvider(mockDb, fallback);

  const decision = await provider.evaluate(TEST_FLAG, {
    environment: TEST_ENV,
    accountId: 'any_account'
  });

  assert.equal(decision.enabled, true);
  assert.equal(decision.reason, 'percentage');
});

test('percentage 0 always disables (no allowlist)', async () => {
  clearFeatureFlagRegistryForTests();
  registerFeatureFlags([TEST_FLAG], featureFlagRegistry);

  const mockDb = createMockDbClient({
    flagByKey: [{ id: 'flag-1', key: TEST_FLAG.key, enabled: true, defaultValue: true }],
    overrides: [
      {
        id: 'ovr-1',
        flagId: 'flag-1',
        environment: TEST_ENV,
        accountIdOverride: null,
        enabled: true,
        percentage: 0,
        allowedUsers: []
      }
    ]
  });
  const fallback = createFallbackProvider(true);
  const provider = createDatabaseFeatureFlagProvider(mockDb, fallback);

  const decision = await provider.evaluate(TEST_FLAG, {
    environment: TEST_ENV,
    accountId: 'any_account'
  });

  assert.equal(decision.enabled, false);
  assert.equal(decision.reason, 'percentage');
});

test('cache avoids repeated DB queries for same key+context', async () => {
  clearFeatureFlagRegistryForTests();
  registerFeatureFlags([TEST_FLAG], featureFlagRegistry);

  let queryCount = 0;
  const countingDb = {
    select: () => ({
      from: (table: { name: string }) => ({
        where: () => ({
          limit: async () => {
            queryCount++;
            return [{ id: 'flag-1', key: TEST_FLAG.key, enabled: false, defaultValue: false }];
          }
        })
      })
    })
  } as any;

  const fallback = createFallbackProvider(false);
  const provider = createDatabaseFeatureFlagProvider(countingDb, fallback, { cacheTtlMs: 10_000 });

  await provider.evaluate(TEST_FLAG, { environment: TEST_ENV, accountId: 'account-test' });
  assert.equal(queryCount, 1);

  await provider.evaluate(TEST_FLAG, { environment: TEST_ENV, accountId: 'account-test' });
  assert.equal(queryCount, 1, 'Second call should use cache, not hit DB again');

  await provider.evaluate(TEST_FLAG, { environment: 'production', accountId: 'acc_a' });
  assert.equal(queryCount, 2, 'Different context should miss cache');
});

test('cache expires after configured TTL', async () => {
  clearFeatureFlagRegistryForTests();
  registerFeatureFlags([TEST_FLAG], featureFlagRegistry);

  let queryCount = 0;
  const countingDb = {
    select: () => ({
      from: (table: { name: string }) => ({
        where: () => ({
          limit: async () => {
            queryCount++;
            return [{ id: 'flag-1', key: TEST_FLAG.key, enabled: false, defaultValue: false }];
          }
        })
      })
    })
  } as any;

  const fallback = createFallbackProvider(false);
  const provider = createDatabaseFeatureFlagProvider(countingDb, fallback, { cacheTtlMs: 1 });

  await provider.evaluate(TEST_FLAG, { environment: TEST_ENV, accountId: 'account-test' });
  assert.equal(queryCount, 1);

  await new Promise((r) => setTimeout(r, 10));

  await provider.evaluate(TEST_FLAG, { environment: TEST_ENV, accountId: 'account-test' });
  assert.equal(queryCount, 2, 'Cache should have expired after TTL');
});

test('metrics records fallback on DB error', async () => {
  clearFeatureFlagRegistryForTests();
  registerFeatureFlags([TEST_FLAG], featureFlagRegistry);

  const mockDb = createMockDbClient({ throwOnFlagQuery: true });
  const fallback = createFallbackProvider(false);
  const recordedFallbacks: Array<{ flagKey: string; provider: string; fallbackReason: string }> =
    [];

  const provider = createDatabaseFeatureFlagProvider(mockDb, fallback, {
    metrics: {
      recordEvaluation() {},
      recordError() {},
      recordFallback(m) {
        recordedFallbacks.push(m);
      }
    }
  });

  await provider.evaluate(TEST_FLAG, { environment: TEST_ENV, accountId: 'account-test' });

  assert.equal(recordedFallbacks.length, 1);
  assert.equal(recordedFallbacks[0].flagKey, TEST_FLAG.key);
  assert.equal(recordedFallbacks[0].fallbackReason, 'database_error');
});

test('metrics records fallback when flag not found in DB', async () => {
  clearFeatureFlagRegistryForTests();
  registerFeatureFlags([TEST_FLAG], featureFlagRegistry);

  const mockDb = createMockDbClient({ flagByKey: [] });
  const fallback = createFallbackProvider(false);
  const recordedFallbacks: Array<{ flagKey: string; provider: string; fallbackReason: string }> =
    [];

  const provider = createDatabaseFeatureFlagProvider(mockDb, fallback, {
    metrics: {
      recordEvaluation() {},
      recordError() {},
      recordFallback(m) {
        recordedFallbacks.push(m);
      }
    }
  });

  await provider.evaluate(TEST_FLAG, { environment: TEST_ENV, accountId: 'account-test' });

  assert.equal(recordedFallbacks.length, 1);
  assert.equal(recordedFallbacks[0].fallbackReason, 'not_found_in_db');
});

test('no override returns defaultValue from flag', async () => {
  clearFeatureFlagRegistryForTests();
  registerFeatureFlags([TEST_FLAG], featureFlagRegistry);

  const mockDb = createMockDbClient({
    flagByKey: [{ id: 'flag-1', key: TEST_FLAG.key, enabled: true, defaultValue: true }],
    overrides: []
  });
  const fallback = createFallbackProvider(false);
  const provider = createDatabaseFeatureFlagProvider(mockDb, fallback);

  const decision = await provider.evaluate(TEST_FLAG, {
    environment: TEST_ENV,
    accountId: 'account-test'
  });

  assert.equal(decision.enabled, true);
  assert.equal(decision.reason, 'default');
});

test('override without percentage/allowlist returns enabled', async () => {
  clearFeatureFlagRegistryForTests();
  registerFeatureFlags([TEST_FLAG], featureFlagRegistry);

  const mockDb = createMockDbClient({
    flagByKey: [{ id: 'flag-1', key: TEST_FLAG.key, enabled: true, defaultValue: false }],
    overrides: [
      {
        id: 'ovr-1',
        flagId: 'flag-1',
        environment: TEST_ENV,
        accountIdOverride: null,
        enabled: true,
        percentage: null,
        allowedUsers: []
      }
    ]
  });
  const fallback = createFallbackProvider(false);
  const provider = createDatabaseFeatureFlagProvider(mockDb, fallback);

  const decision = await provider.evaluate(TEST_FLAG, {
    environment: TEST_ENV,
    accountId: 'account-test'
  });

  assert.equal(decision.enabled, true);
  assert.equal(decision.reason, 'override');
});

test('awaits async fallback before metrics and cached decisions; missing account never queries DB', async () => {
  let queries = 0,
    calls = 0;
  const db = {
    select: () => {
      queries++;
      throw Error('unexpected unscoped query');
    }
  } as any;
  const evaluations: unknown[] = [];
  const fallback: FeatureFlagProvider = {
    name: 'async',
    async evaluate(definition, context) {
      calls++;
      await Promise.resolve();
      return createFlagDecision(definition, context, {
        enabled: true,
        provider: 'async',
        reason: 'fallback'
      });
    }
  };
  const provider = createDatabaseFeatureFlagProvider(db, fallback, {
    metrics: {
      recordEvaluation: (value) => evaluations.push(value),
      recordError() {},
      recordFallback() {}
    }
  });
  assert.equal((await provider.evaluate(TEST_FLAG, {})).enabled, true);
  assert.equal((await provider.evaluate(TEST_FLAG, {})).provider, 'async');
  assert.equal(queries, 0);
  assert.equal(calls, 1);
  assert.ok(evaluations.every((value) => (value as { enabled: boolean }).enabled === true));
});

test('missing rows await async fallback instead of substituting definition default', async () => {
  const provider = createDatabaseFeatureFlagProvider(createMockDbClient({}), {
    name: 'async',
    async evaluate(d, c) {
      return createFlagDecision(d, c, { enabled: true, provider: 'async' });
    }
  });
  const decision = await provider.evaluate(TEST_FLAG, { accountId: 'account-a' });
  assert.equal(decision.enabled, true);
  assert.equal(decision.provider, 'async');
});

test('fallback rejection propagates and is not cached as a decision', async () => {
  let calls = 0;
  const provider = createDatabaseFeatureFlagProvider(
    createMockDbClient({ throwOnFlagQuery: true }),
    {
      name: 'rejecting',
      async evaluate() {
        calls++;
        throw Error('fallback unavailable');
      }
    }
  );
  for (let i = 0; i < 2; i++)
    await assert.rejects(provider.evaluate(TEST_FLAG, { accountId: 'a' }), /fallback unavailable/);
  assert.equal(calls, 2);
});

test('cache tuple prevents delimiter collisions and invalidates a flag across contexts', async () => {
  let calls = 0;
  const provider = createDatabaseFeatureFlagProvider(createMockDbClient({}), {
    name: 'context',
    evaluate(d, c) {
      calls++;
      return createFlagDecision(d, c, { enabled: c.accountId === 'a:b' });
    }
  });
  const contexts = [
    { accountId: 'a:b', environment: 'c' },
    { accountId: 'b', environment: 'c:a' }
  ];
  assert.equal((await provider.evaluate(TEST_FLAG, contexts[0]!)).enabled, true);
  assert.equal((await provider.evaluate(TEST_FLAG, contexts[1]!)).enabled, false);
  for (const c of contexts) await provider.evaluate(TEST_FLAG, c);
  assert.equal(calls, 2);
  provider.invalidateCache(TEST_FLAG.key);
  for (const c of contexts) await provider.evaluate(TEST_FLAG, c);
  assert.equal(calls, 4);
  provider.invalidateCache();
  await provider.evaluate(TEST_FLAG, contexts[0]!);
  assert.equal(calls, 5);
});

test('invalidation during pending fallback prevents stale cache repopulation', async () => {
  let resolve!: (decision: FlagDecision) => void,
    calls = 0;
  const provider = createDatabaseFeatureFlagProvider(createMockDbClient({}), {
    name: 'pending',
    evaluate(d, c) {
      calls++;
      return calls === 1
        ? new Promise<FlagDecision>((r) => {
            resolve = r;
          })
        : createFlagDecision(d, c, { enabled: false });
    }
  });
  const context = { accountId: 'a' },
    pending = provider.evaluate(TEST_FLAG, context);
  await new Promise((r) => setImmediate(r));
  provider.invalidateCache(TEST_FLAG.key);
  resolve(createFlagDecision(TEST_FLAG, context, { enabled: true }));
  assert.equal((await pending).enabled, true);
  assert.equal((await provider.evaluate(TEST_FLAG, context)).enabled, false);
  assert.equal(calls, 2);
});

test('explicit evaluation times, attributes and definition changes do not reuse another decision', async () => {
  let calls = 0;
  const provider = createDatabaseFeatureFlagProvider(createMockDbClient({}), {
    name: 'contextual',
    evaluate(d, c) {
      calls++;
      return createFlagDecision(d, c, {
        enabled: d.defaultValue || c.attributes?.enabled === true || c.now?.getTime() === 2
      });
    }
  });
  const c = { accountId: 'a', now: new Date(1) };
  assert.equal((await provider.evaluate(TEST_FLAG, c)).enabled, false);
  assert.equal((await provider.evaluate(TEST_FLAG, { ...c, now: new Date(2) })).enabled, true);
  assert.equal(
    (await provider.evaluate(TEST_FLAG, { ...c, attributes: { enabled: true } })).enabled,
    true
  );
  assert.equal((await provider.evaluate({ ...TEST_FLAG, defaultValue: true }, c)).enabled, true);
  assert.equal(calls, 4);
});

test('DB expiry disables a flag at its boundary even within cache TTL', async () => {
  const expiresAt = new Date('2026-10-01T00:00:00Z');
  const db = createMockDbClient({
    flagByKey: [{ id: 'f', key: TEST_FLAG.key, enabled: true, defaultValue: true, expiresAt }]
  });
  const provider = createDatabaseFeatureFlagProvider(db, createFallbackProvider(true), {
    cacheTtlMs: 60_000
  });
  assert.equal(
    (await provider.evaluate(TEST_FLAG, { accountId: 'a', now: new Date(expiresAt.getTime() - 1) }))
      .enabled,
    true
  );
  const expired = await provider.evaluate(TEST_FLAG, { accountId: 'a', now: expiresAt });
  assert.equal(expired.enabled, false);
  assert.equal(expired.reason, 'expired');
});

test('allowlist with no user fails closed and returned decisions cannot mutate cache', async () => {
  const db = createMockDbClient({
    flagByKey: [{ id: 'f', key: TEST_FLAG.key, enabled: true, defaultValue: true }],
    overrides: [
      {
        id: 'o',
        flagId: 'f',
        environment: null,
        accountIdOverride: null,
        enabled: true,
        percentage: 100,
        allowedUsers: ['u']
      }
    ]
  });
  const provider = createDatabaseFeatureFlagProvider(db, createFallbackProvider(true));
  const first = await provider.evaluate(TEST_FLAG, { accountId: 'a' });
  assert.equal(first.reason, 'allowlist_excluded');
  assert.equal(first.enabled, false);
  (first as { enabled: boolean }).enabled = true;
  assert.equal((await provider.evaluate(TEST_FLAG, { accountId: 'a' })).enabled, false);
});

test('fallback cache preserves absent environment versus explicit DB default environment', async () => {
  let calls = 0;
  const provider = createDatabaseFeatureFlagProvider(createMockDbClient({}), {
    name: 'raw-context',
    evaluate(d, c) {
      calls++;
      return createFlagDecision(d, c, { enabled: c.environment === undefined });
    }
  });
  assert.equal((await provider.evaluate(TEST_FLAG, {})).enabled, true);
  assert.equal((await provider.evaluate(TEST_FLAG, { environment: 'development' })).enabled, false);
  assert.equal(calls, 2);
});

test('cache capacity bounds unique correlation and time entries and can disable retention', async () => {
  let calls = 0;
  const fallback: FeatureFlagProvider = {
    name: 'counter',
    evaluate(d, c) {
      calls++;
      return createFlagDecision(d, c);
    }
  };
  const provider = createDatabaseFeatureFlagProvider(createMockDbClient({}), fallback, {
    maxCacheEntries: 2
  });
  for (const correlationId of ['one', 'two', 'three', 'one'])
    await provider.evaluate(TEST_FLAG, { correlationId, now: new Date(1000) });
  assert.equal(calls, 4, 'oldest unique context must have been evicted');
  const uncached = createDatabaseFeatureFlagProvider(createMockDbClient({}), fallback, {
    maxCacheEntries: 0
  });
  await uncached.evaluate(TEST_FLAG, {});
  await uncached.evaluate(TEST_FLAG, {});
  assert.equal(calls, 6);
  for (const capacity of [-1, Infinity, NaN, 1.5])
    assert.throws(
      () =>
        createDatabaseFeatureFlagProvider(createMockDbClient({}), fallback, {
          maxCacheEntries: capacity
        }),
      /maxCacheEntries/
    );
});

test('expiry sweep removes an expired context before capacity evicts a live decision', async () => {
  let calls = 0;
  const provider = createDatabaseFeatureFlagProvider(
    createMockDbClient({}),
    {
      name: 'counter',
      evaluate(d, c) {
        calls++;
        return createFlagDecision(d, c);
      }
    },
    { cacheTtlMs: 60, maxCacheEntries: 2 }
  );
  // Explicit evaluation times make expiration independent of scheduler delays.
  const live = { correlationId: 'live', now: new Date(100) };
  await provider.evaluate(TEST_FLAG, live);
  await provider.evaluate(TEST_FLAG, { correlationId: 'older', now: new Date(0) });
  await provider.evaluate(TEST_FLAG, { correlationId: 'next', now: new Date(70) });
  await provider.evaluate(TEST_FLAG, live);
  assert.equal(calls, 3, 'expired older entry must be purged instead of evicting live entry');
});
