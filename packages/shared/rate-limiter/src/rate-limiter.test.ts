import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import test from 'node:test';

import {
  RateLimiter,
  createRateLimiter,
  InMemoryRateLimiterStore,
  RedisRateLimiterStore,
  type RateLimitKey,
  type RateLimiterStore
} from './index.js';

function createTestKey(overrides: Partial<RateLimitKey> = {}): RateLimitKey {
  return {
    userId: undefined,
    accountId: undefined,
    ip: '192.168.1.1',
    tenantId: 'default-tenant',
    route: '/test',
    ...overrides
  };
}

test('RateLimiter: allows requests within limit', async () => {
  const limiter = createRateLimiter({ windowMs: 60000, maxRequests: 5, name: 'test' });

  for (let i = 0; i < 5; i++) {
    const result = await limiter.check(createTestKey());
    assert.equal(result.blocked, false, `Request ${i + 1} should not be blocked`);
    assert.ok(result.remaining <= 5 - i - 1, `Remaining should be ${5 - i - 1}`);
  }
});

test('RateLimiter: blocks requests exceeding limit', async () => {
  const limiter = createRateLimiter({ windowMs: 60000, maxRequests: 3, name: 'test' });

  for (let i = 0; i < 3; i++) {
    await limiter.check(createTestKey());
  }

  const blocked = await limiter.check(createTestKey());
  assert.equal(blocked.blocked, true, 'Request exceeding limit should be blocked');
  assert.equal(blocked.remaining, 0);
  assert.ok(blocked.retryAfterMs > 0, 'Should have retry-after time');
});

test('RateLimiter: different users have independent limits', async () => {
  const limiter = createRateLimiter({ windowMs: 60000, maxRequests: 2, name: 'test' });

  await limiter.check(createTestKey({ userId: 'user1' }));
  await limiter.check(createTestKey({ userId: 'user1' }));

  const user2First = await limiter.check(createTestKey({ userId: 'user2' }));
  assert.equal(user2First.blocked, false, 'Different user should not be affected');

  const user2Second = await limiter.check(createTestKey({ userId: 'user2' }));
  assert.equal(user2Second.blocked, false, 'Second request for user2 should pass');

  const user2Third = await limiter.check(createTestKey({ userId: 'user2' }));
  assert.equal(user2Third.blocked, true, 'Third request for user2 should be blocked');
});

test('RateLimiter: different routes have independent limits', async () => {
  const limiter = createRateLimiter({ windowMs: 60000, maxRequests: 2, name: 'test' });

  await limiter.check(createTestKey({ route: '/route1' }));
  await limiter.check(createTestKey({ route: '/route1' }));

  const route2First = await limiter.check(createTestKey({ route: '/route2' }));
  assert.equal(route2First.blocked, false, 'Different route should have separate limit');
});

test('RateLimiter: different accounts have independent limits', async () => {
  const limiter = createRateLimiter({ windowMs: 60000, maxRequests: 2, name: 'test' });

  await limiter.check(createTestKey({ accountId: 'account1' }));
  await limiter.check(createTestKey({ accountId: 'account1' }));

  const account2 = await limiter.check(createTestKey({ accountId: 'account2' }));
  assert.equal(account2.blocked, false, 'Different account should have separate limit');
});

test('RateLimiter: user takes precedence over IP when present', async () => {
  const limiter = createRateLimiter({ windowMs: 60000, maxRequests: 2, name: 'test' });

  await limiter.check(createTestKey({ userId: 'user1', ip: '10.0.0.1' }));
  await limiter.check(createTestKey({ userId: 'user1', ip: '10.0.0.1' }));

  const sameIpDiffUser = await limiter.check(createTestKey({ userId: 'user2', ip: '10.0.0.1' }));
  assert.equal(
    sameIpDiffUser.blocked,
    false,
    'Different user should have separate limit even with same IP'
  );
});

test('RateLimiter: reset clears specific key', async () => {
  const store = new InMemoryRateLimiterStore();
  const limiter = new RateLimiter({ windowMs: 60000, maxRequests: 2, name: 'test' }, store);

  await limiter.check(createTestKey({ userId: 'user1' }));
  await limiter.check(createTestKey({ userId: 'user1' }));

  await limiter.reset(createTestKey({ userId: 'user1' }));

  const afterReset = await limiter.check(createTestKey({ userId: 'user1' }));
  assert.equal(afterReset.blocked, false, 'Should allow after reset');
  assert.equal(afterReset.remaining, 1);
});

test('RateLimiter: resetAll clears all entries', async () => {
  const store = new InMemoryRateLimiterStore();
  const limiter = new RateLimiter({ windowMs: 60000, maxRequests: 1, name: 'test' }, store);

  await limiter.check(createTestKey({ userId: 'user1' }));
  await limiter.check(createTestKey({ userId: 'user2' }));

  await limiter.resetAll();

  const user1 = await limiter.check(createTestKey({ userId: 'user1' }));
  const user2 = await limiter.check(createTestKey({ userId: 'user2' }));

  assert.equal(user1.blocked, false);
  assert.equal(user2.blocked, false);
});

test('RateLimiter: returns correct limit and remaining', async () => {
  const limiter = createRateLimiter({ windowMs: 60000, maxRequests: 10, name: 'test' });

  const initial = await limiter.check(createTestKey());
  assert.equal(initial.limit, 10);
  assert.equal(initial.remaining, 9);

  const after5 = await limiter.check(createTestKey());
  assert.equal(after5.remaining, 8);
});

test('RateLimiter: getConfig returns configuration', () => {
  const limiter = createRateLimiter({ windowMs: 30000, maxRequests: 20, name: 'auth-limiter' });

  const config = limiter.getConfig();
  assert.equal(config.windowMs, 30000);
  assert.equal(config.maxRequests, 20);
  assert.equal(config.name, 'auth-limiter');
});

test('RateLimiter: instance created with constructor', () => {
  const limiter = new RateLimiter({ windowMs: 1000, maxRequests: 5 });
  assert.ok(limiter instanceof RateLimiter);
});

test('RateLimiter: isBlocked returns correct status', async () => {
  const limiter = createRateLimiter({ windowMs: 60000, maxRequests: 1, name: 'test' });

  assert.equal(await limiter.isBlocked(createTestKey()), false);
  await limiter.check(createTestKey());
  assert.equal(await limiter.isBlocked(createTestKey()), true);
});

test('InMemoryRateLimiterStore: implements RateLimiterStore interface', async () => {
  const store = new InMemoryRateLimiterStore();

  const result1 = await store.get('key1');
  assert.equal(result1, undefined);

  await store.set('key1', { count: 5, resetAt: Date.now() + 60000 });
  const result2 = await store.get('key1');
  assert.ok(result2 !== undefined);
  assert.equal(result2.count, 5);
});

test('InMemoryRateLimiterStore: resetAll clears all entries', async () => {
  const store = new InMemoryRateLimiterStore();

  await store.set('key1', { count: 1, resetAt: Date.now() + 60000 });
  await store.set('key2', { count: 2, resetAt: Date.now() + 60000 });

  await store.resetAll();

  assert.equal(await store.get('key1'), undefined);
  assert.equal(await store.get('key2'), undefined);
});

test('RateLimiter: atomically enforces a shared limit across concurrent instances', async () => {
  const store = new InMemoryRateLimiterStore();
  const firstLimiter = new RateLimiter({ windowMs: 60_000, maxRequests: 5 }, store);
  const secondLimiter = new RateLimiter({ windowMs: 60_000, maxRequests: 5 }, store);

  const results = await Promise.all(
    Array.from({ length: 100 }, (_, index) =>
      (index % 2 === 0 ? firstLimiter : secondLimiter).check(createTestKey())
    )
  );

  assert.equal(
    results.filter((result) => !result.blocked).length,
    5,
    'exactly maxRequests concurrent attempts may pass'
  );
  assert.equal(results.filter((result) => result.blocked).length, 95);
});

test('RateLimiter: fails closed when the atomic store operation is unavailable', async () => {
  const unavailableStore: RateLimiterStore = {
    increment: async () => {
      throw new Error('distributed store unavailable');
    },
    get: async () => undefined,
    set: async () => undefined,
    reset: async () => undefined,
    resetAll: async () => undefined
  };
  const limiter = new RateLimiter({ windowMs: 60_000, maxRequests: 5 }, unavailableStore);

  await assert.rejects(
    limiter.check(createTestKey()),
    /distributed store unavailable/,
    'a store outage must never fall back to an independent local counter'
  );
});

test('RedisRateLimiterStore: waits for active operations before closing its connection', async () => {
  let releaseIncrement: (() => void) | undefined;
  let markIncrementStarted: (() => void) | undefined;
  const incrementStarted = new Promise<void>((resolve) => {
    markIncrementStarted = resolve;
  });
  const incrementReleased = new Promise<void>((resolve) => {
    releaseIncrement = resolve;
  });
  let quitCalls = 0;
  const fakeClient = {
    eval: async () => {
      markIncrementStarted?.();
      await incrementReleased;
      return [1, Date.now() + 60_000, 0];
    },
    ref: () => undefined,
    unref: () => undefined,
    isOpen: true,
    quit: async () => {
      quitCalls += 1;
      return 'OK';
    }
  };
  const store = new RedisRateLimiterStore({ redisUrl: 'redis://unused.test:6379' });
  Object.assign(store as unknown as { clientPromise: Promise<unknown> }, {
    clientPromise: Promise.resolve(fakeClient)
  });

  const increment = store.increment('close-race', {
    now: Date.now(),
    windowMs: 60_000,
    maxRequests: 5
  });
  await incrementStarted;
  const close = store.close();
  await new Promise<void>((resolve) => setImmediate(resolve));

  assert.equal(quitCalls, 0, 'close must not quit while an atomic increment is active');
  releaseIncrement?.();
  await Promise.all([increment, close]);
  assert.equal(quitCalls, 1);
});

test('RedisRateLimiterStore: discards a failed client so a later operation can recover', async () => {
  let disconnectCalls = 0;
  const failedClient = {
    eval: async () => {
      throw new Error('connection closed');
    },
    ref: () => undefined,
    unref: () => undefined,
    isOpen: true,
    disconnect: async () => {
      disconnectCalls += 1;
    }
  };
  const recoveredClient = {
    eval: async () => [1, Date.now() + 60_000, 0],
    ref: () => undefined,
    unref: () => undefined,
    isOpen: true
  };
  const store = new RedisRateLimiterStore({ redisUrl: 'redis://unused.test:6379' });
  const internalStore = store as unknown as { clientPromise: Promise<unknown> | undefined };
  internalStore.clientPromise = Promise.resolve(failedClient);

  await assert.rejects(
    store.increment('outage-recovery', {
      now: Date.now(),
      windowMs: 60_000,
      maxRequests: 5
    }),
    /Redis rate limiter unavailable/
  );

  assert.equal(internalStore.clientPromise, undefined);
  assert.equal(disconnectCalls, 1);

  internalStore.clientPromise = Promise.resolve(recoveredClient);
  const recovered = await store.increment('outage-recovery', {
    now: Date.now(),
    windowMs: 60_000,
    maxRequests: 5
  });
  assert.equal(recovered.blocked, false);
  assert.equal(recovered.count, 1);
});

test('RedisRateLimiterStore: rejects a real unavailable endpoint within a bounded deadline', async () => {
  const moduleUrl = new URL('./index.js', import.meta.url).href;
  const probe = `
    import { RedisRateLimiterStore } from ${JSON.stringify(moduleUrl)};
    const store = new RedisRateLimiterStore({ redisUrl: 'redis://127.0.0.1:1' });
    try {
      await store.increment('unavailable', { now: Date.now(), windowMs: 60000, maxRequests: 1 });
      console.log('UNEXPECTED_SUCCESS');
    } catch (error) {
      console.log(error instanceof Error ? error.message : String(error));
    } finally {
      await store.close();
    }
  `;
  const startedAt = Date.now();
  const result = await new Promise<{
    error: Error | null;
    stdout: string;
    stderr: string;
  }>((resolve) => {
    execFile(
      process.execPath,
      ['--input-type=module', '--eval', probe],
      { timeout: 4_000 },
      (error, stdout, stderr) => resolve({ error, stdout, stderr })
    );
  });

  assert.equal(result.error, null, result.stderr || result.error?.message);
  assert.match(result.stdout, /Redis rate limiter unavailable/);
  assert.ok(Date.now() - startedAt < 4_000, 'unavailable Redis must reject before the deadline');
});

test(
  'RedisRateLimiterStore: atomically enforces a shared limit across two connections',
  { skip: !process.env.REDIS_RATE_LIMITER_TEST_URL },
  async () => {
    const redisUrl = process.env.REDIS_RATE_LIMITER_TEST_URL;
    assert.ok(redisUrl, 'REDIS_RATE_LIMITER_TEST_URL is required for this integration test');

    const keyPrefix = `rate-limit:test:${process.pid}:${Date.now()}`;
    const firstStore = new RedisRateLimiterStore({ redisUrl, keyPrefix });
    const secondStore = new RedisRateLimiterStore({ redisUrl, keyPrefix });
    const firstLimiter = new RateLimiter({ windowMs: 60_000, maxRequests: 7 }, firstStore);
    const secondLimiter = new RateLimiter({ windowMs: 60_000, maxRequests: 7 }, secondStore);

    try {
      const results = await Promise.all(
        Array.from({ length: 200 }, (_, index) =>
          (index % 2 === 0 ? firstLimiter : secondLimiter).check(createTestKey())
        )
      );

      assert.equal(
        results.filter((result) => !result.blocked).length,
        7,
        'Redis must make the increment and allow/block decision atomically'
      );
      assert.equal(results.filter((result) => result.blocked).length, 193);
    } finally {
      try {
        await firstStore.resetAll();
      } finally {
        await Promise.all([firstStore.close(), secondStore.close()]);
      }
    }
  }
);

test(
  'RedisRateLimiterStore: uses Redis time so a skewed node cannot reopen the window',
  { skip: !process.env.REDIS_RATE_LIMITER_TEST_URL },
  async () => {
    const redisUrl = process.env.REDIS_RATE_LIMITER_TEST_URL;
    assert.ok(redisUrl, 'REDIS_RATE_LIMITER_TEST_URL is required for this integration test');

    const keyPrefix = `rate-limit:clock:${process.pid}:${Date.now()}`;
    const firstStore = new RedisRateLimiterStore({ redisUrl, keyPrefix });
    const secondStore = new RedisRateLimiterStore({ redisUrl, keyPrefix });
    const realNow = Date.now();

    try {
      const first = await firstStore.increment('shared', {
        now: realNow,
        windowMs: 60_000,
        maxRequests: 1
      });
      const skewed = await secondStore.increment('shared', {
        now: realNow + 60_001,
        windowMs: 60_000,
        maxRequests: 1
      });

      assert.equal(first.blocked, false);
      assert.equal(skewed.blocked, true, 'application-node time must not control Redis windows');
      assert.equal(skewed.resetAt, first.resetAt);
    } finally {
      try {
        await firstStore.resetAll();
      } finally {
        await Promise.all([firstStore.close(), secondStore.close()]);
      }
    }
  }
);
