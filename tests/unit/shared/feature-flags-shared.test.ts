import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  clearFeatureFlagRegistryForTests,
  computeRolloutBucket,
  createCompositeFeatureFlagProvider,
  createCompositeFeatureFlagProviderWithMetrics,
  createEnvFeatureFlagProvider,
  createRulesBasedFeatureFlagProvider,
  createRulesBasedFeatureFlagProviderWithMetrics,
  DuplicateFeatureFlagError,
  evaluateFeatureFlag,
  evaluateRolloutRules,
  FeatureFlagRegistry,
  InvalidFlagDefinitionError,
  isFeatureFlagEnabled,
  noOpFeatureFlagMetricsCollector,
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
});
