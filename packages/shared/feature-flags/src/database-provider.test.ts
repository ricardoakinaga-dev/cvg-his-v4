import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createDatabaseFeatureFlagProvider,
  type DatabaseFeatureFlagProviderOptions
} from '../database-provider.js';
import {
  createFlagDecision,
  clearFeatureFlagRegistryForTests,
  featureFlagRegistry,
  registerFeatureFlags,
  type EvaluationContext,
  type FeatureFlagProvider,
  type FlagDecision,
  type FlagDefinition
} from '../index.js';

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
  flagByKey?: Array<{ id: string; key: string; enabled: boolean; defaultValue: boolean }>;
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
      from: (table: { name: string }) => ({
        where: () => ({
          limit: () => ({
            execute: async () => {
              if (responses.throwOnFlagQuery && table.name === 'feature_flags') {
                throw new Error('DB_ERROR_FLAG_QUERY');
              }
              if (responses.throwOnOverrideQuery && table.name === 'feature_flag_overrides') {
                throw new Error('DB_ERROR_OVERRIDE_QUERY');
              }
              if (table.name === 'feature_flags') {
                return responses.flagByKey ?? [];
              }
              if (table.name === 'feature_flag_overrides') {
                return responses.overrides ?? [];
              }
              return [];
            }
          })
        })
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

  const decision = await provider.evaluate(TEST_FLAG, { environment: TEST_ENV });

  assert.equal(decision.enabled, true);
  assert.equal(decision.provider, 'fallback-env');
  assert.equal(decision.reason, 'bootstrap');
});

test('returns default when flag not in DB', async () => {
  clearFeatureFlagRegistryForTests();
  registerFeatureFlags([TEST_FLAG], featureFlagRegistry);

  const mockDb = createMockDbClient({ flagByKey: [] });
  const fallback = createFallbackProvider(false);
  const provider = createDatabaseFeatureFlagProvider(mockDb, fallback);

  const decision = await provider.evaluate(TEST_FLAG, { environment: TEST_ENV });

  assert.equal(decision.enabled, false);
  assert.equal(decision.reason, 'default');
  assert.equal(decision.provider, 'database');
});

test('kill switch on flag definition disables regardless of defaultValue', async () => {
  clearFeatureFlagRegistryForTests();
  registerFeatureFlags([TEST_FLAG], featureFlagRegistry);

  const mockDb = createMockDbClient({
    flagByKey: [{ id: 'flag-1', key: TEST_FLAG.key, enabled: false, defaultValue: true }]
  });
  const fallback = createFallbackProvider(true);
  const provider = createDatabaseFeatureFlagProvider(mockDb, fallback);

  const decision = await provider.evaluate(TEST_FLAG, { environment: TEST_ENV });

  assert.equal(decision.enabled, false);
  assert.equal(decision.reason, 'kill_switch');
  assert.deepEqual(decision.metadata, { level: 'flag' });
});

test('kill switch on override takes precedence over flag-level enabled', async () => {
  clearFeatureFlagRegistryForTests();
  registerFeatureFlags([TEST_FLAG], featureFlagRegistry);

  const mockDb = createMockDbClient({
    flagByKey: [{ id: 'flag-1', key: TEST_FLAG.key, enabled: true, defaultValue: true }],
    overrides: [{
      id: 'ovr-1',
      flagId: 'flag-1',
      environment: TEST_ENV,
      accountIdOverride: null,
      enabled: false,
      percentage: null,
      allowedUsers: []
    }]
  });
  const fallback = createFallbackProvider(true);
  const provider = createDatabaseFeatureFlagProvider(mockDb, fallback);

  const decision = await provider.evaluate(TEST_FLAG, { environment: TEST_ENV });

  assert.equal(decision.enabled, false);
  assert.equal(decision.reason, 'kill_switch');
  assert.deepEqual(decision.metadata, { level: 'override' });
});

test('allowlist of userIds enables for matching user', async () => {
  clearFeatureFlagRegistryForTests();
  registerFeatureFlags([TEST_FLAG], featureFlagRegistry);

  const mockDb = createMockDbClient({
    flagByKey: [{ id: 'flag-1', key: TEST_FLAG.key, enabled: true, defaultValue: false }],
    overrides: [{
      id: 'ovr-1',
      flagId: 'flag-1',
      environment: TEST_ENV,
      accountIdOverride: null,
      enabled: true,
      percentage: null,
      allowedUsers: ['user_admin', 'user_vet']
    }]
  });
  const fallback = createFallbackProvider(false);
  const provider = createDatabaseFeatureFlagProvider(mockDb, fallback);

  const decision = await provider.evaluate(TEST_FLAG, {
    environment: TEST_ENV,
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
    overrides: [{
      id: 'ovr-1',
      flagId: 'flag-1',
      environment: TEST_ENV,
      accountIdOverride: null,
      enabled: true,
      percentage: null,
      allowedUsers: ['user_admin', 'user_vet']
    }]
  });
  const fallback = createFallbackProvider(false);
  const provider = createDatabaseFeatureFlagProvider(mockDb, fallback);

  const decision = await provider.evaluate(TEST_FLAG, {
    environment: TEST_ENV,
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
    overrides: [{
      id: 'ovr-1',
      flagId: 'flag-1',
      environment: TEST_ENV,
      accountIdOverride: null,
      enabled: true,
      percentage: 50,
      allowedUsers: []
    }]
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
    overrides: [{
      id: 'ovr-1',
      flagId: 'flag-1',
      environment: TEST_ENV,
      accountIdOverride: null,
      enabled: true,
      percentage: 100,
      allowedUsers: []
    }]
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
    overrides: [{
      id: 'ovr-1',
      flagId: 'flag-1',
      environment: TEST_ENV,
      accountIdOverride: null,
      enabled: true,
      percentage: 0,
      allowedUsers: []
    }]
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
          limit: () => ({
            execute: async () => {
              queryCount++;
              return [{ id: 'flag-1', key: TEST_FLAG.key, enabled: true, defaultValue: false }];
            }
          })
        })
      })
    })
  } as any;

  const fallback = createFallbackProvider(false);
  const provider = createDatabaseFeatureFlagProvider(countingDb, fallback, { cacheTtlMs: 10_000 });

  await provider.evaluate(TEST_FLAG, { environment: TEST_ENV });
  assert.equal(queryCount, 1);

  await provider.evaluate(TEST_FLAG, { environment: TEST_ENV });
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
          limit: () => ({
            execute: async () => {
              queryCount++;
              return [{ id: 'flag-1', key: TEST_FLAG.key, enabled: true, defaultValue: false }];
            }
          })
        })
      })
    })
  } as any;

  const fallback = createFallbackProvider(false);
  const provider = createDatabaseFeatureFlagProvider(countingDb, fallback, { cacheTtlMs: 1 });

  await provider.evaluate(TEST_FLAG, { environment: TEST_ENV });
  assert.equal(queryCount, 1);

  await new Promise((r) => setTimeout(r, 10));

  await provider.evaluate(TEST_FLAG, { environment: TEST_ENV });
  assert.equal(queryCount, 2, 'Cache should have expired after TTL');
});

test('metrics records fallback on DB error', async () => {
  clearFeatureFlagRegistryForTests();
  registerFeatureFlags([TEST_FLAG], featureFlagRegistry);

  const mockDb = createMockDbClient({ throwOnFlagQuery: true });
  const fallback = createFallbackProvider(false);
  const recordedFallbacks: Array<{ flagKey: string; provider: string; fallbackReason: string }> = [];

  const provider = createDatabaseFeatureFlagProvider(mockDb, fallback, {
    metrics: {
      recordEvaluation() {},
      recordError() {},
      recordFallback(m) {
        recordedFallbacks.push(m);
      }
    }
  });

  await provider.evaluate(TEST_FLAG, { environment: TEST_ENV });

  assert.equal(recordedFallbacks.length, 1);
  assert.equal(recordedFallbacks[0].flagKey, TEST_FLAG.key);
  assert.equal(recordedFallbacks[0].fallbackReason, 'database_error');
});

test('metrics records fallback when flag not found in DB', async () => {
  clearFeatureFlagRegistryForTests();
  registerFeatureFlags([TEST_FLAG], featureFlagRegistry);

  const mockDb = createMockDbClient({ flagByKey: [] });
  const fallback = createFallbackProvider(false);
  const recordedFallbacks: Array<{ flagKey: string; provider: string; fallbackReason: string }> = [];

  const provider = createDatabaseFeatureFlagProvider(mockDb, fallback, {
    metrics: {
      recordEvaluation() {},
      recordError() {},
      recordFallback(m) {
        recordedFallbacks.push(m);
      }
    }
  });

  await provider.evaluate(TEST_FLAG, { environment: TEST_ENV });

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

  const decision = await provider.evaluate(TEST_FLAG, { environment: TEST_ENV });

  assert.equal(decision.enabled, true);
  assert.equal(decision.reason, 'default');
});

test('override without percentage/allowlist returns enabled', async () => {
  clearFeatureFlagRegistryForTests();
  registerFeatureFlags([TEST_FLAG], featureFlagRegistry);

  const mockDb = createMockDbClient({
    flagByKey: [{ id: 'flag-1', key: TEST_FLAG.key, enabled: true, defaultValue: false }],
    overrides: [{
      id: 'ovr-1',
      flagId: 'flag-1',
      environment: TEST_ENV,
      accountIdOverride: null,
      enabled: true,
      percentage: null,
      allowedUsers: []
    }]
  });
  const fallback = createFallbackProvider(false);
  const provider = createDatabaseFeatureFlagProvider(mockDb, fallback);

  const decision = await provider.evaluate(TEST_FLAG, { environment: TEST_ENV });

  assert.equal(decision.enabled, true);
  assert.equal(decision.reason, 'override');
});
