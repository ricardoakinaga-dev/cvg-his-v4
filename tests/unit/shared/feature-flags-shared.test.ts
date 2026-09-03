import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  clearFeatureFlagRegistryForTests,
  computeRolloutBucket,
  createCompositeFeatureFlagProvider,
  createCompositeFeatureFlagProviderWithMetrics,
  createEnvFeatureFlagProvider,
  createFlagDecision,
  createRulesBasedFeatureFlagProvider,
  createRulesBasedFeatureFlagProviderWithMetrics,
  DuplicateFeatureFlagError,
  evaluateFeatureFlag,
  evaluateRolloutRules,
  FeatureFlagRegistry,
  getFeatureFlagDefinition,
  InvalidFlagDefinitionError,
  isFeatureFlagEnabled,
  listFeatureFlagDefinitions,
  noOpFeatureFlagMetricsCollector,
  normalizeFeatureFlagKeys,
  registerFeatureFlags,
  requireFeatureFlagDefinition,
  UnknownFeatureFlagError,
  validateFlagDefinition
} from '../../../packages/shared/feature-flags/src/index.js';

const TEST_FLAG = {
  key: 'triage.fast_track.enabled',
  owner: 'clinical',
  description: ' Enables fast track in triage ',
  defaultValue: false,
  scopes: ['account', 'environment', 'account'] as const,
  tags: [' triage ', 'ops', 'ops'],
  rolloutRules: {
    percentageRollout: 50
  }
};

describe('shared feature flags coverage guard', () => {
  beforeEach(() => {
    clearFeatureFlagRegistryForTests();
  });

  it('validates and normalizes flag definitions and registry operations', async () => {
    const normalized = validateFlagDefinition(TEST_FLAG);
    const registry = new FeatureFlagRegistry();

    expect(normalized).toEqual(
      expect.objectContaining({
        key: 'triage.fast_track.enabled',
        owner: 'clinical',
        description: 'Enables fast track in triage',
        scopes: ['account', 'environment'],
        tags: ['triage', 'ops']
      })
    );

    registerFeatureFlags([normalized], registry);
    expect(requireFeatureFlagDefinition('triage.fast_track.enabled', registry)).toEqual(normalized);

    expect(() => registerFeatureFlags([normalized], registry)).toThrow(DuplicateFeatureFlagError);

    expect(() =>
      validateFlagDefinition({
        ...TEST_FLAG,
        key: 'INVALID KEY'
      })
    ).toThrow(InvalidFlagDefinitionError);

    expect(() => requireFeatureFlagDefinition('missing.flag', registry)).toThrow(
      UnknownFeatureFlagError
    );
  });

  it('rejects every incomplete definition and normalizes optional metadata', () => {
    expect(normalizeFeatureFlagKeys([' B.flag ', '', 'a.flag', 'A.FLAG'])).toEqual([
      'a.flag',
      'b.flag'
    ]);

    const valid = validateFlagDefinition({
      ...TEST_FLAG,
      expiresAt: '2027-01-02T03:04:05-03:00',
      tags: undefined
    });
    expect(valid.expiresAt).toBe('2027-01-02T06:04:05.000Z');
    expect(valid.tags).toBeUndefined();

    const invalidDefinitions = [
      { ...TEST_FLAG, key: ' ' },
      { ...TEST_FLAG, owner: ' ' },
      { ...TEST_FLAG, description: ' ' },
      { ...TEST_FLAG, scopes: [] },
      { ...TEST_FLAG, expiresAt: 'not-a-date' }
    ];
    for (const definition of invalidDefinitions) {
      expect(() => validateFlagDefinition(definition)).toThrow(InvalidFlagDefinitionError);
    }
  });

  it('supports single registration, lookup, ordering, listing and clearing', () => {
    const registry = new FeatureFlagRegistry();
    const second = registry.register({ ...TEST_FLAG, key: 'z.flag' });
    const first = registry.register({ ...TEST_FLAG, key: 'a.flag' });

    expect(registry.has(first.key)).toBe(true);
    expect(getFeatureFlagDefinition(second.key, registry)).toBe(second);
    expect(listFeatureFlagDefinitions(registry).map(({ key }) => key)).toEqual([
      'a.flag',
      'z.flag'
    ]);

    clearFeatureFlagRegistryForTests(registry);
    expect(registry.list()).toEqual([]);
    expect(registry.get(first.key)).toBeUndefined();
  });

  it('creates decisions with defaults or explicit overrides', () => {
    const now = new Date('2026-09-02T12:00:00.000Z');
    const defaultDecision = createFlagDecision(TEST_FLAG, { now });
    const explicitDecision = createFlagDecision(TEST_FLAG, {}, {
      enabled: true,
      provider: 'test-provider',
      reason: 'override',
      evaluatedAt: '2026-09-02T13:00:00.000Z',
      metadata: { source: 'test' }
    });

    expect(defaultDecision).toEqual(
      expect.objectContaining({
        enabled: false,
        provider: 'registry-default',
        reason: 'default',
        evaluatedAt: now.toISOString()
      })
    );
    expect(explicitDecision).toEqual(
      expect.objectContaining({
        enabled: true,
        provider: 'test-provider',
        reason: 'override',
        evaluatedAt: '2026-09-02T13:00:00.000Z',
        metadata: { source: 'test' }
      })
    );
  });

  it('evaluates rollout rules for kill switch, allowlist, percentage rollout and defaults', () => {
    const now = new Date('2026-04-18T12:00:00.000Z');

    const killSwitch = evaluateRolloutRules(
      {
        ...TEST_FLAG,
        rolloutRules: {
          killSwitch: true,
          percentageRollout: 100
        }
      },
      { accountId: 'acc_test', now }
    );

    const allowlisted = evaluateRolloutRules(
      {
        ...TEST_FLAG,
        rolloutRules: {
          allowlist: {
            accountIds: ['ACC_TEST'],
            userIds: ['user-fast-track']
          },
          percentageRollout: 0
        }
      },
      { accountId: 'acc_test', userId: 'user-other', now }
    );

    const percentage = evaluateRolloutRules(
      {
        ...TEST_FLAG,
        rolloutRules: {
          percentageRollout: 100
        }
      },
      { accountId: 'acc_rollout', now }
    );

    const fallback = evaluateRolloutRules(
      {
        ...TEST_FLAG,
        defaultValue: true,
        rolloutRules: undefined
      },
      { tenantId: 'tenant_a', now }
    );

    expect(killSwitch).toEqual(
      expect.objectContaining({
        enabled: false,
        reason: 'kill_switch'
      })
    );
    expect(allowlisted).toEqual(
      expect.objectContaining({
        enabled: true,
        reason: 'allowlist',
        metadata: expect.objectContaining({
          allowlistMatch: 'accountId'
        })
      })
    );
    expect(percentage).toEqual(
      expect.objectContaining({
        enabled: true,
        reason: 'percentage_rollout',
        metadata: expect.objectContaining({
          percentageRollout: 100,
          rolloutNote: 'full_rollout'
        })
      })
    );
    expect(fallback).toEqual(
      expect.objectContaining({
        enabled: true,
        reason: 'default'
      })
    );
    expect(computeRolloutBucket('triage.fast_track.enabled', 'acc_rollout')).toBe(
      computeRolloutBucket('triage.fast_track.enabled', 'acc_rollout')
    );
  });

  it('covers user targeting and every percentage-rollout entity fallback', () => {
    const userAllowlisted = evaluateRolloutRules(
      {
        ...TEST_FLAG,
        rolloutRules: { allowlist: { userIds: ['USER_ONE'] }, percentageRollout: 0 }
      },
      { userId: 'user_one' }
    );
    expect(userAllowlisted.metadata.allowlistMatch).toBe('userId');

    for (const context of [
      { accountId: 'account' },
      { userId: 'user' },
      { tenantId: 'tenant' },
      {}
    ]) {
      const result = evaluateRolloutRules(
        { ...TEST_FLAG, rolloutRules: { percentageRollout: 0 } },
        context
      );
      expect(result.enabled).toBe(false);
      expect(result.reason).toBe('percentage_rollout');
    }
  });

  it('uses direct rules-provider defaults and composite delegation paths', async () => {
    const definition = validateFlagDefinition({ ...TEST_FLAG, rolloutRules: undefined });
    const direct = createRulesBasedFeatureFlagProvider();
    expect(await direct.evaluate(definition, {})).toEqual(
      expect.objectContaining({ provider: 'rules-based', reason: 'default', enabled: false })
    );

    const upstream = {
      name: 'sync-upstream',
      evaluate: vi.fn(() =>
        createFlagDecision(definition, {}, {
          enabled: true,
          provider: 'sync-upstream',
          reason: 'provider'
        })
      )
    };
    const delegated = createCompositeFeatureFlagProvider(upstream, () => undefined);
    expect(await delegated.evaluate(definition, {})).toEqual(
      expect.objectContaining({
        provider: 'sync-upstream-with-rules',
        reason: 'provider',
        enabled: true
      })
    );

    const stopped = createCompositeFeatureFlagProvider(upstream, () => ({ killSwitch: true }));
    expect(await stopped.evaluate(definition, {})).toEqual(
      expect.objectContaining({ reason: 'kill_switch', enabled: false })
    );
    expect(upstream.evaluate).toHaveBeenCalledOnce();
  });

  it('supports env, rules-based and composite providers with metrics', async () => {
    const registry = new FeatureFlagRegistry();
    const definition = validateFlagDefinition({
      ...TEST_FLAG,
      rolloutRules: {
        allowlist: { userIds: ['nurse_1'] },
        percentageRollout: 10
      }
    });
    registerFeatureFlags([definition], registry);

    const envProvider = createEnvFeatureFlagProvider([definition.key]);
    const metrics = {
      recordEvaluation: vi.fn(),
      recordError: vi.fn(),
      recordFallback: vi.fn()
    };

    const rulesProvider = createRulesBasedFeatureFlagProvider(envProvider);
    const rulesDecision = await rulesProvider.evaluate(definition, {
      accountId: 'acc_test',
      userId: 'nurse_1'
    });

    const rulesWithMetrics = createRulesBasedFeatureFlagProviderWithMetrics({
      baseProvider: envProvider,
      metrics
    });
    const defaultDecision = await rulesWithMetrics.evaluate(
      { ...definition, rolloutRules: undefined },
      { accountId: 'acc_test' }
    );

    const upstream = {
      name: 'upstream-provider',
      evaluate: vi.fn(async () => ({
        key: definition.key,
        enabled: false,
        provider: 'upstream-provider',
        reason: 'provider',
        evaluatedAt: new Date('2026-04-18T12:00:00.000Z').toISOString(),
        definition,
        context: { accountId: 'acc_test' }
      }))
    };

    const composite = createCompositeFeatureFlagProvider(upstream, (key) =>
      key === definition.key
        ? {
            percentageRollout: 100
          }
        : undefined
    );
    const compositeDecision = await composite.evaluate(definition, {
      accountId: 'acc_test'
    });

    const compositeWithMetrics = createCompositeFeatureFlagProviderWithMetrics({
      upstream,
      getRules: () => ({ killSwitch: true }),
      metrics
    });
    const killSwitchDecision = await compositeWithMetrics.evaluate(definition, {
      accountId: 'acc_test'
    });

    expect(rulesDecision.reason).toBe('allowlist');
    expect(rulesDecision.enabled).toBe(true);
    expect(defaultDecision.provider).toBe('env-bootstrap');
    expect(defaultDecision.reason).toBe('bootstrap');
    expect(compositeDecision.provider).toBe('upstream-provider-with-rules');
    expect(compositeDecision.reason).toBe('percentage_rollout');
    expect(compositeDecision.metadata).toEqual(
      expect.objectContaining({
        upstreamProvider: 'upstream-provider',
        upstreamReason: 'provider'
      })
    );
    expect(killSwitchDecision.reason).toBe('kill_switch');
    expect(killSwitchDecision.enabled).toBe(false);
    expect(metrics.recordEvaluation).toHaveBeenCalled();
    expect(metrics.recordError).not.toHaveBeenCalled();
    expect(noOpFeatureFlagMetricsCollector.recordEvaluation({} as never)).toBeUndefined();

    const evaluated = await evaluateFeatureFlag(definition.key, envProvider, {}, registry);
    const enabled = await isFeatureFlagEnabled(definition.key, envProvider, {}, registry);
    expect(evaluated.reason).toBe('bootstrap');
    expect(enabled).toBe(true);
  });

  it('records metric defaults, delegation, normal evaluation and both error types', async () => {
    const definition = validateFlagDefinition({ ...TEST_FLAG, rolloutRules: undefined });
    const metrics = {
      recordEvaluation: vi.fn(),
      recordError: vi.fn(),
      recordFallback: vi.fn()
    };
    const upstreamDecision = createFlagDecision(definition, {}, {
      enabled: true,
      provider: 'upstream',
      reason: 'provider'
    });
    const upstream = { name: 'upstream', evaluate: vi.fn(() => upstreamDecision) };

    const rulesDefault = createRulesBasedFeatureFlagProviderWithMetrics({ metrics });
    expect(await rulesDefault.evaluate(definition, {})).toEqual(
      expect.objectContaining({ provider: 'rules-based', reason: 'default' })
    );

    const compositeDelegated = createCompositeFeatureFlagProviderWithMetrics({
      upstream,
      getRules: () => undefined,
      metrics
    });
    expect(await compositeDelegated.evaluate(definition, {})).toEqual(
      expect.objectContaining({ enabled: true, reason: 'provider' })
    );

    const compositeRules = createCompositeFeatureFlagProviderWithMetrics({
      upstream,
      getRules: () => ({ percentageRollout: 100 }),
      metrics
    });
    expect(await compositeRules.evaluate(definition, {})).toEqual(
      expect.objectContaining({ enabled: true, reason: 'percentage_rollout' })
    );

    const errorProvider = createRulesBasedFeatureFlagProviderWithMetrics({
      baseProvider: {
        name: 'error-provider',
        evaluate: () => {
          throw new TypeError('provider unavailable');
        }
      },
      metrics
    });
    await expect(errorProvider.evaluate(definition, {})).rejects.toThrow('provider unavailable');

    const unknownErrorComposite = createCompositeFeatureFlagProviderWithMetrics({
      upstream: {
        name: 'unknown-error-provider',
        evaluate: () => {
          throw 'provider unavailable';
        }
      },
      getRules: () => undefined,
      metrics
    });
    await expect(unknownErrorComposite.evaluate(definition, {})).rejects.toBe(
      'provider unavailable'
    );

    expect(metrics.recordEvaluation).toHaveBeenCalledTimes(3);
    expect(metrics.recordError).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'rules-based', errorType: 'TypeError' })
    );
    expect(metrics.recordError).toHaveBeenCalledWith(
      expect.objectContaining({
        provider: 'unknown-error-provider-with-rules',
        errorType: 'UnknownError'
      })
    );

    const noMetricsRules = createRulesBasedFeatureFlagProviderWithMetrics({});
    const noMetricsComposite = createCompositeFeatureFlagProviderWithMetrics({
      upstream,
      getRules: () => ({ killSwitch: true })
    });
    await expect(noMetricsRules.evaluate(definition, {})).resolves.toBeDefined();
    await expect(noMetricsComposite.evaluate(definition, {})).resolves.toEqual(
      expect.objectContaining({ reason: 'kill_switch', enabled: false })
    );
    expect(noOpFeatureFlagMetricsCollector.recordError({} as never)).toBeUndefined();
    expect(noOpFeatureFlagMetricsCollector.recordFallback({} as never)).toBeUndefined();
  });
});
