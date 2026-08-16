import assert from 'node:assert/strict';
import { test } from 'vitest';

import {
  DuplicateFeatureFlagError,
  FeatureFlagRegistry,
  clearFeatureFlagRegistryForTests,
  computeRolloutBucket,
  createCompositeFeatureFlagProvider,
  createFlagDecision,
  createCompositeFeatureFlagProviderWithMetrics,
  createEnvFeatureFlagProvider,
  createRulesBasedFeatureFlagProvider,
  createRulesBasedFeatureFlagProviderWithMetrics,
  evaluateFeatureFlag,
  evaluateRolloutRules,
  featureFlagRegistry,
  isFeatureFlagEnabled,
  listFeatureFlagDefinitions,
  noOpFeatureFlagMetricsCollector,
  registerFeatureFlags,
  requireFeatureFlagDefinition,
  validateFlagDefinition,
  type EvaluationContext,
  type FeatureFlagAllowlist,
  type FeatureFlagMetricsCollector,
  type FeatureFlagProvider,
  type FeatureFlagRolloutRules,
  type FlagDecision,
  type FlagDefinition
} from './index.js';

const TEST_FLAG: FlagDefinition = {
  key: 'runtime.distributed_state.enabled',
  owner: 'platform-runtime',
  description: 'Controls distributed runtime state rollout',
  defaultValue: false,
  scopes: ['environment', 'account'],
  expiresAt: '2026-12-31T00:00:00.000Z',
  auditRequired: true,
  tags: ['runtime', 'rollout']
};

test('validateFlagDefinition normalizes and validates required metadata', () => {
  const definition = validateFlagDefinition({
    ...TEST_FLAG,
    key: 'runtime.distributed_state.enabled',
    owner: ' platform-runtime ',
    description: ' Controls distributed runtime state rollout ',
    tags: ['runtime', 'rollout', 'runtime']
  });

  assert.equal(definition.owner, 'platform-runtime');
  assert.equal(definition.description, 'Controls distributed runtime state rollout');
  assert.deepEqual(definition.tags, ['runtime', 'rollout']);
  assert.equal(definition.expiresAt, '2026-12-31T00:00:00.000Z');
});

test('FeatureFlagRegistry registers and lists definitions in key order', () => {
  const registry = new FeatureFlagRegistry();
  registry.register([
    TEST_FLAG,
    {
      key: 'auth.oidc.enabled',
      owner: 'security-auth',
      description: 'Controls OIDC login rollout',
      defaultValue: false,
      scopes: ['environment', 'account']
    }
  ]);

  assert.deepEqual(
    registry.list().map((definition) => definition.key),
    ['auth.oidc.enabled', 'runtime.distributed_state.enabled']
  );
});

test('FeatureFlagRegistry rejects duplicate keys', () => {
  const registry = new FeatureFlagRegistry();
  registry.register(TEST_FLAG);

  assert.throws(() => registry.register(TEST_FLAG), DuplicateFeatureFlagError);
});

test('global registry helper functions register and resolve definitions', () => {
  clearFeatureFlagRegistryForTests();
  registerFeatureFlags([TEST_FLAG]);

  const resolved = requireFeatureFlagDefinition(TEST_FLAG.key);
  assert.equal(resolved.key, TEST_FLAG.key);
  assert.equal(listFeatureFlagDefinitions().length, 1);

  clearFeatureFlagRegistryForTests();
});

test('evaluateFeatureFlag delegates to provider with registered definition', async () => {
  clearFeatureFlagRegistryForTests();
  registerFeatureFlags([TEST_FLAG]);

  const context: EvaluationContext = {
    environment: 'staging',
    accountId: 'acc_demo',
    now: new Date('2026-04-13T00:00:00.000Z')
  };
  const provider: FeatureFlagProvider = {
    name: 'test-provider',
    evaluate(definition: FlagDefinition, evaluationContext: EvaluationContext): FlagDecision {
      return createFlagDecision(definition, evaluationContext, {
        enabled: evaluationContext.environment === 'staging',
        provider: 'test-provider',
        reason: 'provider'
      });
    }
  };

  const decision = await evaluateFeatureFlag(TEST_FLAG.key, provider, context);
  assert.equal(decision.enabled, true);
  assert.equal(decision.provider, 'test-provider');
  assert.equal(decision.reason, 'provider');
  assert.equal(decision.key, TEST_FLAG.key);

  clearFeatureFlagRegistryForTests();
});

test('isFeatureFlagEnabled returns the provider decision boolean', async () => {
  clearFeatureFlagRegistryForTests(featureFlagRegistry);
  registerFeatureFlags([TEST_FLAG], featureFlagRegistry);

  const provider: FeatureFlagProvider = {
    name: 'default-provider',
    evaluate(definition: FlagDefinition, context: EvaluationContext): FlagDecision {
      return createFlagDecision(definition, context, {
        enabled: true,
        provider: 'default-provider',
        reason: 'override'
      });
    }
  };

  const enabled = await isFeatureFlagEnabled(TEST_FLAG.key, provider, {
    environment: 'production'
  });
  assert.equal(enabled, true);

  clearFeatureFlagRegistryForTests(featureFlagRegistry);
});

test('createEnvFeatureFlagProvider enables explicitly configured keys and falls back to defaults', () => {
  const provider = createEnvFeatureFlagProvider([
    ' AUTH.OIDC.ENABLED ',
    'auth.oidc.enabled',
    'runtime.distributed_state.enabled'
  ]);
  const context = {
    environment: 'staging' as const,
    now: new Date('2026-08-15T00:00:00.000Z')
  };

  const enabledDecision = provider.evaluate(TEST_FLAG, context) as FlagDecision;
  assert.deepEqual(
    enabledDecision,
    createFlagDecision(TEST_FLAG, context, {
      enabled: true,
      provider: 'env-bootstrap',
      reason: 'bootstrap',
      metadata: {
        enabledByEnv: true
      }
    })
  );

  const disabledDecision = provider.evaluate({
    ...TEST_FLAG,
    key: 'auth.webauthn.enabled',
    defaultValue: false
  }, context) as FlagDecision;
  assert.equal(disabledDecision.enabled, false);
  assert.equal(disabledDecision.reason, 'default');
});

// ---------------------------------------------------------------------------
// PR-FF-06: Rollout Percentage, Allowlist and Kill Switch Tests
// ---------------------------------------------------------------------------

test('computeRolloutBucket returns deterministic 1-100 values', () => {
  const bucket1 = computeRolloutBucket('auth.oidc.enabled', 'acc_cvg_demo');
  const bucket2 = computeRolloutBucket('auth.oidc.enabled', 'acc_cvg_demo');
  assert.equal(bucket1, bucket2, 'Same inputs must produce same bucket');

  const bucket3 = computeRolloutBucket('auth.oidc.enabled', 'acc_other');
  assert.notEqual(bucket1, bucket3, 'Different inputs should produce different buckets');

  assert.ok(bucket1 >= 1 && bucket1 <= 100);
  assert.ok(bucket3 >= 1 && bucket3 <= 100);
});

test('computeRolloutBucket is consistent across flag keys', () => {
  const bucketA = computeRolloutBucket('flag_a', 'acc_cvg_demo');
  const bucketB = computeRolloutBucket('flag_b', 'acc_cvg_demo');
  assert.notEqual(bucketA, bucketB, 'Same entity different flags should have different buckets');
});

test('evaluateRolloutRules: killSwitch takes precedence over everything', () => {
  const definition: FlagDefinition = {
    ...TEST_FLAG,
    rolloutRules: {
      killSwitch: true,
      allowlist: { accountIds: ['acc_cvg_demo'] },
      percentageRollout: 100
    }
  };

  const result = evaluateRolloutRules(definition, {
    accountId: 'acc_cvg_demo',
    now: new Date('2026-04-13T00:00:00.000Z')
  });

  assert.equal(result.enabled, false);
  assert.equal(result.reason, 'kill_switch');
});

test('evaluateRolloutRules: allowlist enables flag regardless of percentage', () => {
  const definition: FlagDefinition = {
    ...TEST_FLAG,
    rolloutRules: {
      allowlist: { accountIds: ['acc_cvg_demo'] },
      percentageRollout: 0 // Would be 0% without allowlist
    }
  };

  // Matched via accountId
  const matchedResult = evaluateRolloutRules(definition, {
    accountId: 'acc_cvg_demo',
    now: new Date('2026-04-13T00:00:00.000Z')
  });
  assert.equal(matchedResult.enabled, true);
  assert.equal(matchedResult.reason, 'allowlist');

  // Not matched — falls through to percentage
  const unmatchedResult = evaluateRolloutRules(definition, {
    accountId: 'acc_other',
    now: new Date('2026-04-13T00:00:00.000Z')
  });
  assert.equal(unmatchedResult.enabled, false); // 0% rollout
  assert.equal(unmatchedResult.reason, 'percentage_rollout');
});

test('evaluateRolloutRules: allowlist supports userIds', () => {
  const definition: FlagDefinition = {
    ...TEST_FLAG,
    rolloutRules: {
      allowlist: { userIds: ['user_admin', 'user_vet'] },
      percentageRollout: 0
    }
  };

  const matchedResult = evaluateRolloutRules(definition, {
    userId: 'user_vet',
    now: new Date('2026-04-13T00:00:00.000Z')
  });
  assert.equal(matchedResult.enabled, true);
  assert.equal(matchedResult.reason, 'allowlist');

  const unmatchedResult = evaluateRolloutRules(definition, {
    userId: 'user_other',
    now: new Date('2026-04-13T00:00:00.000Z')
  });
  assert.equal(unmatchedResult.enabled, false);
});

test('evaluateRolloutRules: allowlist is case-insensitive for accountIds', () => {
  const definition: FlagDefinition = {
    ...TEST_FLAG,
    rolloutRules: {
      allowlist: { accountIds: ['ACC_CVG_DEMO'] }
    }
  };

  const result = evaluateRolloutRules(definition, {
    accountId: 'acc_cvg_demo',
    now: new Date('2026-04-13T00:00:00.000Z')
  });
  assert.equal(result.enabled, true);
  assert.equal(result.reason, 'allowlist');
});

test('evaluateRolloutRules: percentageRollout respects consistent hashing', () => {
  const definition: FlagDefinition = {
    ...TEST_FLAG,
    rolloutRules: {
      percentageRollout: 50
    }
  };

  // Run multiple times with same entity — should be consistent
  const results = Array.from({ length: 5 }, () =>
    evaluateRolloutRules(definition, {
      accountId: 'acc_consistent_test',
      now: new Date('2026-04-13T00:00:00.000Z')
    })
  );

  const enabledCount = results.filter((r) => r.enabled).length;
  assert.ok(
    enabledCount === 0 || enabledCount === 5,
    `Consistent hashing should return same result: got ${enabledCount}/5 enabled`
  );
});

test('evaluateRolloutRules: percentageRollout 100 always enables', () => {
  const definition: FlagDefinition = {
    ...TEST_FLAG,
    defaultValue: false,
    rolloutRules: {
      percentageRollout: 100
    }
  };

  const result = evaluateRolloutRules(definition, {
    accountId: 'any_account',
    now: new Date('2026-04-13T00:00:00.000Z')
  });
  assert.equal(result.enabled, true);
  assert.equal(result.reason, 'percentage_rollout');
});

test('evaluateRolloutRules: percentageRollout 0 always disables (no allowlist)', () => {
  const definition: FlagDefinition = {
    ...TEST_FLAG,
    defaultValue: false,
    rolloutRules: {
      percentageRollout: 0
    }
  };

  const result = evaluateRolloutRules(definition, {
    accountId: 'any_account',
    now: new Date('2026-04-13T00:00:00.000Z')
  });
  assert.equal(result.enabled, false);
  assert.equal(result.reason, 'percentage_rollout');
});

test('evaluateRolloutRules: falls back to defaultValue when no rules', () => {
  const definitionEnabled: FlagDefinition = {
    ...TEST_FLAG,
    defaultValue: true
    // No rolloutRules
  };
  const definitionDisabled: FlagDefinition = {
    ...TEST_FLAG,
    defaultValue: false
    // No rolloutRules
  };

  const enabledResult = evaluateRolloutRules(definitionEnabled, {});
  assert.equal(enabledResult.enabled, true);
  assert.equal(enabledResult.reason, 'default');

  const disabledResult = evaluateRolloutRules(definitionDisabled, {});
  assert.equal(disabledResult.enabled, false);
  assert.equal(disabledResult.reason, 'default');
});

test('evaluateRolloutRules: allowlist + percentage work together', () => {
  const definition: FlagDefinition = {
    ...TEST_FLAG,
    defaultValue: false,
    rolloutRules: {
      allowlist: { accountIds: ['acc_premium'] },
      percentageRollout: 10
    }
  };

  // Allowlist account — always enabled
  const allowlisted = evaluateRolloutRules(definition, {
    accountId: 'acc_premium'
  });
  assert.equal(allowlisted.enabled, true);
  assert.equal(allowlisted.reason, 'allowlist');

  // Non-allowlist — uses percentage rollout
  const rolloutResult = evaluateRolloutRules(definition, {
    accountId: 'acc_in_rollout_bucket'
  });
  assert.ok(rolloutResult.metadata !== undefined);
  assert.ok('percentageRollout' in rolloutResult.metadata);
});

test('createRulesBasedFeatureFlagProvider: delegates to rules engine', async () => {
  const provider = createRulesBasedFeatureFlagProvider();

  const definitionWithRules: FlagDefinition = {
    ...TEST_FLAG,
    rolloutRules: {
      killSwitch: true
    }
  };

  const decision = await provider.evaluate(definitionWithRules, {
    accountId: 'acc_cvg_demo'
  }) as FlagDecision;

  assert.equal(decision.enabled, false);
  assert.equal(decision.reason, 'kill_switch');
  assert.equal(decision.provider, 'rules-based');
});

test('createRulesBasedFeatureFlagProvider: falls back to base provider when no rules', async () => {
  const baseProvider: FeatureFlagProvider = {
    name: 'base-provider',
    evaluate(definition, context) {
      return createFlagDecision(definition, context, {
        enabled: true,
        provider: 'base-provider',
        reason: 'override'
      });
    }
  };

  const rulesProvider = createRulesBasedFeatureFlagProvider(baseProvider);

  const decision = await rulesProvider.evaluate(TEST_FLAG, {
    accountId: 'acc_cvg_demo'
  }) as FlagDecision;

  assert.equal(decision.enabled, true);
  assert.equal(decision.reason, 'override');
  assert.equal(decision.provider, 'base-provider');
});

test('createCompositeFeatureFlagProvider: killSwitch overrides upstream', async () => {
  const upstream: FeatureFlagProvider = {
    name: 'upstream',
    evaluate(definition, context) {
      return createFlagDecision(definition, context, {
        enabled: true,
        provider: 'upstream',
        reason: 'provider'
      });
    }
  };

  const rulesFn = (_key: string): FeatureFlagRolloutRules | undefined => ({
    killSwitch: true
  });

  const composite = createCompositeFeatureFlagProvider(upstream, rulesFn);

  const decision = await composite.evaluate(TEST_FLAG, {
    accountId: 'acc_cvg_demo'
  }) as FlagDecision;

  assert.equal(decision.enabled, false);
  assert.equal(decision.reason, 'kill_switch');
});

test('createCompositeFeatureFlagProvider: returns upstream decision when no rules', async () => {
  const upstream: FeatureFlagProvider = {
    name: 'upstream',
    evaluate(definition, context) {
      return createFlagDecision(definition, context, {
        enabled: true,
        provider: 'upstream',
        reason: 'provider'
      });
    }
  };

  const composite = createCompositeFeatureFlagProvider(upstream, () => undefined);

  const decision = await composite.evaluate(TEST_FLAG, {
    accountId: 'acc_cvg_demo'
  }) as FlagDecision;

  assert.equal(decision.enabled, true);
  assert.equal(decision.reason, 'provider');
  assert.equal(decision.provider, 'upstream-with-rules');
});

test('createCompositeFeatureFlagProvider: merge metadata from both layers', async () => {
  const upstream: FeatureFlagProvider = {
    name: 'upstream',
    evaluate(definition, context) {
      return createFlagDecision(definition, context, {
        enabled: true,
        provider: 'upstream',
        reason: 'provider'
      });
    }
  };

  const rulesFn = (_key: string): FeatureFlagRolloutRules | undefined => ({
    allowlist: { accountIds: ['acc_cvg_demo'] }
  });

  const composite = createCompositeFeatureFlagProvider(upstream, rulesFn);

  const decision = await composite.evaluate(TEST_FLAG, {
    accountId: 'acc_cvg_demo'
  }) as FlagDecision;

  assert.equal(decision.enabled, true);
  assert.equal(decision.reason, 'allowlist');
  assert.ok(decision.metadata !== undefined);
  assert.equal(
    (decision.metadata as Record<string, unknown>)['upstreamProvider'],
    'upstream'
  );
});

// ---------------------------------------------------------------------------
// PR-FF-13: Metrics Collector Tests
// ---------------------------------------------------------------------------

test('noOpFeatureFlagMetricsCollector: all methods are no-ops and do not throw', () => {
  // These should not throw
  noOpFeatureFlagMetricsCollector.recordEvaluation({
    flagKey: 'test.flag',
    provider: 'test-provider',
    reason: 'default',
    enabled: true,
    durationMs: 5
  });
  noOpFeatureFlagMetricsCollector.recordError({
    flagKey: 'test.flag',
    provider: 'test-provider',
    errorType: 'NetworkError'
  });
  noOpFeatureFlagMetricsCollector.recordFallback({
    flagKey: 'test.flag',
    provider: 'test-provider',
    fallbackReason: 'not_found_in_db'
  });
});

test('createRulesBasedFeatureFlagProviderWithMetrics: records evaluation metrics', async () => {
  const recorded = { data: null as { flagKey: string; provider: string; reason: string; enabled: boolean } | null };

  const collector: FeatureFlagMetricsCollector = {
    recordEvaluation(m) {
      recorded.data = {
        flagKey: m.flagKey,
        provider: m.provider,
        reason: m.reason,
        enabled: m.enabled
      };
    },
    recordError() {},
    recordFallback() {}
  };

  const provider = createRulesBasedFeatureFlagProviderWithMetrics({
    metrics: collector
  });

  const definition: FlagDefinition = {
    key: 'metrics.test.flag',
    owner: 'test',
    description: 'Test flag for metrics',
    defaultValue: true,
    scopes: ['global']
  };

  await provider.evaluate(definition, {});

  assert.equal(recorded.data?.flagKey, 'metrics.test.flag');
  assert.equal(recorded.data?.provider, 'rules-based');
  assert.equal(recorded.data?.reason, 'default');
  assert.equal(recorded.data?.enabled, true);
});

test('createRulesBasedFeatureFlagProviderWithMetrics: records durationMs', async () => {
  let recordedDurationMs: number | null = null;

  const collector: FeatureFlagMetricsCollector = {
    recordEvaluation(m) {
      recordedDurationMs = m.durationMs ?? null;
    },
    recordError() {},
    recordFallback() {}
  };

  const provider = createRulesBasedFeatureFlagProviderWithMetrics({ metrics: collector });

  await provider.evaluate(TEST_FLAG, {});

  assert.ok(recordedDurationMs !== null);
  assert.ok(recordedDurationMs >= 0);
});

test('createRulesBasedFeatureFlagProviderWithMetrics: records error metrics on throw', async () => {
  const recordedError = { data: null as { flagKey: string; errorType: string } | null };

  const collector: FeatureFlagMetricsCollector = {
    recordEvaluation() {},
    recordError(m) {
      recordedError.data = { flagKey: m.flagKey, errorType: m.errorType };
    },
    recordFallback() {}
  };

  const brokenProvider = createRulesBasedFeatureFlagProviderWithMetrics({
    metrics: collector,
    baseProvider: {
      name: 'broken',
      evaluate() {
        throw new Error('Provider failed');
      }
    }
  });

  try {
    await brokenProvider.evaluate(TEST_FLAG, {});
    assert.fail('Should have thrown');
  } catch (err) {
    assert.equal(recordedError.data?.flagKey, TEST_FLAG.key);
    assert.equal(recordedError.data?.errorType, (err as Error).constructor.name);
  }
});

test('createRulesBasedFeatureFlagProviderWithMetrics: records kill_switch reason', async () => {
  let recordedReason: string | null = null;

  const collector: FeatureFlagMetricsCollector = {
    recordEvaluation(m) {
      recordedReason = m.reason;
    },
    recordError() {},
    recordFallback() {}
  };

  const provider = createRulesBasedFeatureFlagProviderWithMetrics({
    metrics: collector,
    baseProvider: createEnvFeatureFlagProvider([])
  });

  const definitionWithKillSwitch: FlagDefinition = {
    ...TEST_FLAG,
    rolloutRules: { killSwitch: true }
  };

  await provider.evaluate(definitionWithKillSwitch, {});

  assert.equal(recordedReason, 'kill_switch');
});

test('createCompositeFeatureFlagProviderWithMetrics: records evaluation metrics', async () => {
  const recordedMetrics = { data: null as { flagKey: string; provider: string; reason: string } | null };

  const collector: FeatureFlagMetricsCollector = {
    recordEvaluation(m) {
      recordedMetrics.data = {
        flagKey: m.flagKey,
        provider: m.provider,
        reason: m.reason
      };
    },
    recordError() {},
    recordFallback() {}
  };

  const upstream: FeatureFlagProvider = {
    name: 'upstream',
    evaluate(definition, _context) {
      return createFlagDecision(definition, _context, {
        enabled: true,
        provider: 'upstream',
        reason: 'provider'
      });
    }
  };

  const composite = createCompositeFeatureFlagProviderWithMetrics({
    upstream,
    getRules: () => undefined,
    metrics: collector
  });

  await composite.evaluate(TEST_FLAG, {});

  const recorded = recordedMetrics.data;
  assert.notEqual(recorded, null, 'recordEvaluation should have been called');
  assert.equal(recorded!.flagKey, TEST_FLAG.key);
  assert.ok(recorded!.provider.includes('upstream-with-rules'));
});

test('createCompositeFeatureFlagProviderWithMetrics: records error on upstream failure', async () => {
  const recordedError = { data: null as { flagKey: string; errorType: string } | null };

  const collector: FeatureFlagMetricsCollector = {
    recordEvaluation() {},
    recordError(m) {
      recordedError.data = { flagKey: m.flagKey, errorType: m.errorType };
    },
    recordFallback() {}
  };

  const brokenUpstream: FeatureFlagProvider = {
    name: 'broken',
    evaluate() {
      throw new Error('Upstream unavailable');
    }
  };

  const composite = createCompositeFeatureFlagProviderWithMetrics({
    upstream: brokenUpstream,
    getRules: () => undefined,
    metrics: collector
  });

  try {
    await composite.evaluate(TEST_FLAG, {});
    assert.fail('Should have thrown');
  } catch (err) {
    assert.equal(recordedError.data?.flagKey, TEST_FLAG.key);
    assert.equal(recordedError.data?.errorType, (err as Error).constructor.name);
  }
});
