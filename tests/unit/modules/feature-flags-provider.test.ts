import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createEnvFeatureFlagProvider } from '@cvg-his-v2/shared-feature-flags';

import {
  createDatabaseFeatureFlagProvider,
  DatabaseFeatureFlagRepository
} from '../../../packages/modules/feature-flags/src/index.js';

const TEST_FLAG = {
  key: 'runtime.distributed_state.enabled',
  owner: 'platform',
  description: 'Enables distributed state runtime features.',
  defaultValue: false,
  scopes: ['environment', 'account'] as const
};

describe('Database feature flag provider coverage guard', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns default decision when account context is absent and records metrics', async () => {
    const collector = {
      recordEvaluation: vi.fn(),
      recordError: vi.fn(),
      recordFallback: vi.fn()
    };
    const provider = createDatabaseFeatureFlagProvider(createEnvFeatureFlagProvider([]), {
      metrics: collector
    });

    const decision = await provider.evaluate(TEST_FLAG, { environment: 'staging' });

    expect(decision.enabled).toBe(false);
    expect(decision.reason).toBe('default');
    expect(collector.recordEvaluation).toHaveBeenCalledWith(
      expect.objectContaining({
        flagKey: TEST_FLAG.key,
        reason: 'default',
        enabled: false
      })
    );
  });

  it('uses allowlist and kill-switch overrides from repository data', async () => {
    const findByKey = vi
      .spyOn(DatabaseFeatureFlagRepository.prototype, 'findByKey')
      .mockResolvedValue({ ...TEST_FLAG, defaultValue: true });
    const findOverride = vi
      .spyOn(DatabaseFeatureFlagRepository.prototype, 'findOverride')
      .mockResolvedValueOnce({
        enabled: false,
        environment: 'production',
        accountIdOverride: 'acc_test' as never,
        percentage: null,
        allowedUsers: []
      })
      .mockResolvedValueOnce({
        enabled: true,
        environment: 'production',
        accountIdOverride: 'acc_test' as never,
        userId: 'user-1',
        percentage: null,
        allowedUsers: ['user-1']
      })
      .mockResolvedValueOnce({
        enabled: true,
        environment: 'production',
        accountIdOverride: 'acc_test' as never,
        userId: 'user-1',
        percentage: null,
        allowedUsers: ['other-user']
      });

    const provider = createDatabaseFeatureFlagProvider(createEnvFeatureFlagProvider([]));

    const killSwitch = await provider.evaluate(TEST_FLAG, {
      environment: 'production',
      accountId: 'acc_test' as never
    });
    const allowlisted = await provider.evaluate(TEST_FLAG, {
      environment: 'production',
      accountId: 'acc_test' as never,
      userId: 'user-1'
    });
    const excluded = await provider.evaluate(TEST_FLAG, {
      environment: 'production',
      accountId: 'acc_test' as never,
      userId: 'user-2'
    });

    expect(findByKey).toHaveBeenCalledTimes(3);
    expect(findOverride).toHaveBeenCalledTimes(3);
    expect(killSwitch.reason).toBe('kill_switch');
    expect(killSwitch.enabled).toBe(false);
    expect(allowlisted.reason).toBe('allowlist');
    expect(allowlisted.enabled).toBe(true);
    expect(excluded.reason).toBe('allowlist_excluded');
    expect(excluded.enabled).toBe(false);
  });

  it('falls back on missing flags, database errors and caches successful percentage rollout decisions', async () => {
    const collector = {
      recordEvaluation: vi.fn(),
      recordError: vi.fn(),
      recordFallback: vi.fn()
    };
    const fallback = createEnvFeatureFlagProvider([TEST_FLAG.key]);

    const findByKey = vi
      .spyOn(DatabaseFeatureFlagRepository.prototype, 'findByKey')
      .mockResolvedValueOnce(null)
      .mockRejectedValueOnce(new Error('db down'))
      .mockResolvedValue({
        ...TEST_FLAG,
        defaultValue: false
      });
    const findOverride = vi
      .spyOn(DatabaseFeatureFlagRepository.prototype, 'findOverride')
      .mockResolvedValue({
        enabled: true,
        environment: 'production',
        accountIdOverride: 'acc_rollout' as never,
        percentage: 100,
        allowedUsers: []
      });

    const onFallback = vi.fn();
    const provider = createDatabaseFeatureFlagProvider(fallback, {
      cacheTtlMs: 60_000,
      onFallback,
      metrics: collector
    });

    const missing = await provider.evaluate(TEST_FLAG, {
      environment: 'production',
      accountId: 'acc_missing' as never
    });
    const errored = await provider.evaluate(TEST_FLAG, {
      environment: 'production',
      accountId: 'acc_error' as never
    });
    const rollout = await provider.evaluate(TEST_FLAG, {
      environment: 'production',
      accountId: 'acc_rollout' as never
    });
    const rolloutCached = await provider.evaluate(TEST_FLAG, {
      environment: 'production',
      accountId: 'acc_rollout' as never
    });

    expect(missing.reason).toBe('default');
    expect(missing.enabled).toBe(false);
    expect(errored.enabled).toBe(true);
    expect(errored.provider).toBe('env-bootstrap');
    expect(rollout.reason).toBe('percentage_rollout');
    expect(rollout.enabled).toBe(true);
    expect(rolloutCached.reason).toBe('percentage_rollout');
    expect(findByKey).toHaveBeenCalledTimes(3);
    expect(findOverride).toHaveBeenCalledTimes(1);
    expect(onFallback).toHaveBeenCalledWith(TEST_FLAG.key, 'not_found_in_db');
    expect(onFallback).toHaveBeenCalledWith(TEST_FLAG.key, 'database_error');
    expect(collector.recordFallback).toHaveBeenCalledWith(
      expect.objectContaining({ fallbackReason: 'not_found_in_db' })
    );
    expect(collector.recordError).toHaveBeenCalledWith(
      expect.objectContaining({ provider: 'database-repository' })
    );
    expect(collector.recordEvaluation).toHaveBeenCalledWith(
      expect.objectContaining({ reason: 'cache_hit', enabled: true })
    );
  });
});
