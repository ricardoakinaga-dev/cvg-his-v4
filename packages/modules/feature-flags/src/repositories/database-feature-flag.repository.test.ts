import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createDatabaseFeatureFlagProvider,
  selectApplicableOverride,
  type FeatureFlagEvaluationRepository,
  type PartialFlagOverride
} from './database-feature-flag.repository.js';
import {
  createFlagDecision,
  type FeatureFlagProvider,
  type FlagDefinition
} from '@cvg-his-v2/shared-feature-flags';

const FLAG: FlagDefinition = {
  key: 'runtime.feature.enabled',
  owner: 'platform',
  description: 'Controls a runtime feature',
  defaultValue: true,
  scopes: ['environment', 'account']
};

const FALLBACK: FeatureFlagProvider = {
  name: 'fallback',
  evaluate(definition, context) {
    return createFlagDecision(definition, context, {
      enabled: true,
      provider: 'fallback',
      reason: 'bootstrap'
    });
  }
};

function repository(
  flag: FlagDefinition,
  overrides: readonly PartialFlagOverride[] = []
): FeatureFlagEvaluationRepository {
  return {
    async findByKey() {
      return flag;
    },
    async listOverrides() {
      return overrides;
    }
  };
}

test('selectApplicableOverride chooses the most specific matching scope', () => {
  const global: PartialFlagOverride = { enabled: false };
  const environment: PartialFlagOverride = { environment: 'production', enabled: true };
  const user: PartialFlagOverride = {
    environment: 'production',
    userId: 'user-1',
    enabled: false
  };

  assert.equal(
    selectApplicableOverride([global, environment, user], {
      environment: 'production',
      accountId: 'account-1',
      userId: 'user-1'
    }),
    user
  );
  assert.equal(
    selectApplicableOverride([global, environment, user], {
      environment: 'production',
      accountId: 'account-1',
      userId: 'user-2'
    }),
    environment
  );
});

test('database provider honors the persisted flag kill switch before overrides', async () => {
  let overrideReads = 0;
  const repo: FeatureFlagEvaluationRepository = {
    async findByKey() {
      return { ...FLAG, enabled: false };
    },
    async listOverrides() {
      overrideReads += 1;
      return [{ enabled: true }];
    }
  };
  const provider = createDatabaseFeatureFlagProvider(FALLBACK, { repository: repo });

  const decision = await provider.evaluate(FLAG, {
    accountId: 'account-1',
    environment: 'production'
  });

  assert.equal(decision.enabled, false);
  assert.equal(decision.reason, 'kill_switch');
  assert.deepEqual(decision.metadata, { level: 'flag' });
  assert.equal(overrideReads, 0);
});

test('database provider disables expired flags and does not cache beyond expiry', async () => {
  const expiresAt = '2026-09-17T12:00:00.000Z';
  let reads = 0;
  const repo: FeatureFlagEvaluationRepository = {
    async findByKey() {
      reads += 1;
      return { ...FLAG, enabled: true, expiresAt };
    },
    async listOverrides() {
      return [];
    }
  };
  const provider = createDatabaseFeatureFlagProvider(FALLBACK, {
    repository: repo,
    cacheTtlMs: 60_000
  });

  const beforeExpiry = await provider.evaluate(FLAG, {
    accountId: 'account-1',
    environment: 'production',
    now: new Date('2026-09-17T11:59:59.000Z')
  });
  const afterExpiry = await provider.evaluate(FLAG, {
    accountId: 'account-1',
    environment: 'production',
    now: new Date(expiresAt)
  });

  assert.equal(beforeExpiry.enabled, true);
  assert.equal(afterExpiry.enabled, false);
  assert.equal(afterExpiry.reason, 'expired');
  assert.deepEqual(afterExpiry.metadata, { expiresAt });
  assert.equal(reads, 2);
});

test('allowlist overrides fail closed without a matching user', async () => {
  const provider = createDatabaseFeatureFlagProvider(FALLBACK, {
    repository: repository(FLAG, [
      {
        environment: 'production',
        enabled: true,
        allowedUsers: ['user-1']
      }
    ])
  });

  const decision = await provider.evaluate(FLAG, {
    accountId: 'account-1',
    environment: 'production'
  });

  assert.equal(decision.enabled, false);
  assert.equal(decision.reason, 'allowlist_excluded');
});

test('catalog expiry also disables accountless evaluation', async () => {
  const provider = createDatabaseFeatureFlagProvider(FALLBACK, {
    repository: repository({
      ...FLAG,
      expiresAt: '2026-09-17T12:00:00.000Z'
    })
  });

  const decision = await provider.evaluate(
    { ...FLAG, expiresAt: '2026-09-17T12:00:00.000Z' },
    { environment: 'production', now: new Date('2026-09-17T12:00:00.000Z') }
  );

  assert.equal(decision.enabled, false);
  assert.equal(decision.reason, 'expired');
});

test('bounds, clones and invalidates the local decision cache', async () => {
  let reads = 0;
  const accountA = '00000000-0000-4000-8000-0000000000aa';
  const accountB = '00000000-0000-4000-8000-0000000000bb';
  const provider = createDatabaseFeatureFlagProvider(FALLBACK, {
    repository: {
      async findByKey() {
        reads += 1;
        return { ...FLAG, defaultValue: true };
      },
      async listOverrides() {
        return [];
      }
    },
    cacheTtlMs: 60_000,
    maxCacheEntries: 1
  });
  const invalidating = provider as FeatureFlagProvider & {
    invalidateCache: (key?: string) => void;
  };

  const first = await provider.evaluate(FLAG, {
    accountId: accountA,
    environment: 'production'
  });
  (first.context as { environment?: string }).environment = 'tampered';
  const cached = await provider.evaluate(FLAG, {
    accountId: accountA,
    environment: 'production'
  });
  assert.equal(reads, 1);
  assert.equal(cached.context.environment, 'production');

  await provider.evaluate(FLAG, { accountId: accountB, environment: 'production' });
  await provider.evaluate(FLAG, { accountId: accountA, environment: 'production' });
  assert.equal(reads, 3);

  invalidating.invalidateCache(FLAG.key);
  await provider.evaluate(FLAG, { accountId: accountA, environment: 'production' });
  assert.equal(reads, 4);
});

test('an in-flight evaluation cannot repopulate a cache invalidated by an admin write', async () => {
  let reads = 0;
  let release!: (flag: FlagDefinition) => void;
  const firstRead = new Promise<FlagDefinition>((resolve) => {
    release = resolve;
  });
  const provider = createDatabaseFeatureFlagProvider(FALLBACK, {
    repository: {
      async findByKey() {
        reads += 1;
        return reads === 1 ? firstRead : { ...FLAG, defaultValue: false };
      },
      async listOverrides() {
        return [];
      }
    }
  });
  const invalidating = provider as FeatureFlagProvider & {
    invalidateCache: (key?: string) => void;
  };
  const pending = provider.evaluate(FLAG, {
    accountId: 'account-1',
    environment: 'production'
  });

  await new Promise<void>((resolve) => setImmediate(resolve));
  invalidating.invalidateCache(FLAG.key);
  release({ ...FLAG, defaultValue: true });
  await pending;

  const current = await provider.evaluate(FLAG, {
    accountId: 'account-1',
    environment: 'production'
  });
  assert.equal(current.enabled, false);
  assert.equal(reads, 2);
});

test('definition changes cannot reuse a cached decision', async () => {
  let reads = 0;
  const provider = createDatabaseFeatureFlagProvider(FALLBACK, {
    repository: {
      async findByKey() {
        reads += 1;
        return { ...FLAG, defaultValue: true };
      },
      async listOverrides() {
        return [];
      }
    }
  });

  const context = { accountId: 'account-1', environment: 'production' };
  const first = await provider.evaluate(FLAG, context);
  const changedDefinition = { ...FLAG, defaultValue: false };
  const second = await provider.evaluate(changedDefinition, context);

  assert.equal(first.enabled, true);
  assert.equal(second.enabled, true);
  assert.equal(reads, 2);
});

test('rejects invalid cache configuration before creating a provider', () => {
  assert.throws(
    () => createDatabaseFeatureFlagProvider(FALLBACK, { cacheTtlMs: Number.NaN }),
    /cacheTtlMs/
  );
  assert.throws(
    () => createDatabaseFeatureFlagProvider(FALLBACK, { maxCacheEntries: -1 }),
    /maxCacheEntries/
  );
});
