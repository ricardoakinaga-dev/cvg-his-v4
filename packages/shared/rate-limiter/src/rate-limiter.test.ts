import assert from 'node:assert/strict';
import test from 'node:test';

import { RateLimiter, createRateLimiter, type RateLimitKey } from './index.js';

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

test('RateLimiter: allows requests within limit', () => {
  const limiter = createRateLimiter({ windowMs: 60000, maxRequests: 5, name: 'test' });

  for (let i = 0; i < 5; i++) {
    const result = limiter.check(createTestKey());
    assert.equal(result.blocked, false, `Request ${i + 1} should not be blocked`);
    assert.ok(result.remaining <= 5 - i - 1, `Remaining should be ${5 - i - 1}`);
  }
});

test('RateLimiter: blocks requests exceeding limit', () => {
  const limiter = createRateLimiter({ windowMs: 60000, maxRequests: 3, name: 'test' });

  for (let i = 0; i < 3; i++) {
    limiter.check(createTestKey());
  }

  const blocked = limiter.check(createTestKey());
  assert.equal(blocked.blocked, true, 'Request exceeding limit should be blocked');
  assert.equal(blocked.remaining, 0);
  assert.ok(blocked.retryAfterMs > 0, 'Should have retry-after time');
});

test('RateLimiter: different users have independent limits', () => {
  const limiter = createRateLimiter({ windowMs: 60000, maxRequests: 2, name: 'test' });

  limiter.check(createTestKey({ userId: 'user1' }));
  limiter.check(createTestKey({ userId: 'user1' }));

  const user2First = limiter.check(createTestKey({ userId: 'user2' }));
  assert.equal(user2First.blocked, false, 'Different user should not be affected');

  const user2Second = limiter.check(createTestKey({ userId: 'user2' }));
  assert.equal(user2Second.blocked, false, 'Second request for user2 should pass');

  const user2Third = limiter.check(createTestKey({ userId: 'user2' }));
  assert.equal(user2Third.blocked, true, 'Third request for user2 should be blocked');
});

test('RateLimiter: different routes have independent limits', () => {
  const limiter = createRateLimiter({ windowMs: 60000, maxRequests: 2, name: 'test' });

  limiter.check(createTestKey({ route: '/route1' }));
  limiter.check(createTestKey({ route: '/route1' }));

  const route2First = limiter.check(createTestKey({ route: '/route2' }));
  assert.equal(route2First.blocked, false, 'Different route should have separate limit');
});

test('RateLimiter: different accounts have independent limits', () => {
  const limiter = createRateLimiter({ windowMs: 60000, maxRequests: 2, name: 'test' });

  limiter.check(createTestKey({ accountId: 'account1' }));
  limiter.check(createTestKey({ accountId: 'account1' }));

  const account2 = limiter.check(createTestKey({ accountId: 'account2' }));
  assert.equal(account2.blocked, false, 'Different account should have separate limit');
});

test('RateLimiter: user takes precedence over IP when present', () => {
  const limiter = createRateLimiter({ windowMs: 60000, maxRequests: 2, name: 'test' });

  limiter.check(createTestKey({ userId: 'user1', ip: '10.0.0.1' }));
  limiter.check(createTestKey({ userId: 'user1', ip: '10.0.0.1' }));

  const sameIpDiffUser = limiter.check(createTestKey({ userId: 'user2', ip: '10.0.0.1' }));
  assert.equal(
    sameIpDiffUser.blocked,
    false,
    'Different user should have separate limit even with same IP'
  );
});

test('RateLimiter: reset clears specific key', () => {
  const limiter = createRateLimiter({ windowMs: 60000, maxRequests: 2, name: 'test' });

  limiter.check(createTestKey({ userId: 'user1' }));
  limiter.check(createTestKey({ userId: 'user1' }));

  limiter.reset(createTestKey({ userId: 'user1' }));

  const afterReset = limiter.check(createTestKey({ userId: 'user1' }));
  assert.equal(afterReset.blocked, false, 'Should allow after reset');
  assert.equal(afterReset.remaining, 1);
});

test('RateLimiter: resetAll clears all entries', () => {
  const limiter = createRateLimiter({ windowMs: 60000, maxRequests: 1, name: 'test' });

  limiter.check(createTestKey({ userId: 'user1' }));
  limiter.check(createTestKey({ userId: 'user2' }));

  limiter.resetAll();

  const user1 = limiter.check(createTestKey({ userId: 'user1' }));
  const user2 = limiter.check(createTestKey({ userId: 'user2' }));

  assert.equal(user1.blocked, false);
  assert.equal(user2.blocked, false);
});

test('RateLimiter: returns correct limit and remaining', () => {
  const limiter = createRateLimiter({ windowMs: 60000, maxRequests: 10, name: 'test' });

  const initial = limiter.check(createTestKey());
  assert.equal(initial.limit, 10);
  assert.equal(initial.remaining, 9);

  const after5 = limiter.check(createTestKey());
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

test('RateLimiter: isBlocked returns correct status', () => {
  const limiter = createRateLimiter({ windowMs: 60000, maxRequests: 1, name: 'test' });

  assert.equal(limiter.isBlocked(createTestKey()), false);
  limiter.check(createTestKey());
  assert.equal(limiter.isBlocked(createTestKey()), true);
});
