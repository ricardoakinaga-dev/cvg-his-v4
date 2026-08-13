import assert from 'node:assert/strict';
import { test } from 'vitest';

import {
  RateLimiter,
  createRateLimiter,
  InMemoryRateLimiterStore,
  type RateLimitKey
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
