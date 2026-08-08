import { beforeEach, describe, expect, it, vi } from 'vitest';

const { RateLimiterMock, InMemoryStoreMock, RedisStoreMock, storeConstructors } = vi.hoisted(() => {
  const storeConstructors = {
    memory: vi.fn(),
    redis: vi.fn()
  };

  class InMemoryStoreMockImpl {
    readonly kind = 'memory';
    constructor() {
      storeConstructors.memory();
    }
  }

  class RedisStoreMockImpl {
    readonly kind = 'redis';
    readonly options: Record<string, unknown>;
    constructor(options: Record<string, unknown>) {
      this.options = options;
      storeConstructors.redis(options);
    }
  }

  class RateLimiterMockImpl {
    readonly config: Record<string, unknown>;
    readonly store: unknown;
    constructor(config: Record<string, unknown>, store: unknown) {
      this.config = config;
      this.store = store;
    }
    getConfig() {
      return this.config;
    }
  }

  return {
    RateLimiterMock: RateLimiterMockImpl,
    InMemoryStoreMock: InMemoryStoreMockImpl,
    RedisStoreMock: RedisStoreMockImpl,
    storeConstructors
  };
});

vi.mock('@cvg-his-v2/shared-rate-limiter', () => ({
  RateLimiter: RateLimiterMock,
  InMemoryRateLimiterStore: InMemoryStoreMock,
  RedisRateLimiterStore: RedisStoreMock
}));

import { createAuthRateLimiter } from '../../../apps/api/src/http/auth-rate-limiter.ts';

describe('auth-rate-limiter runtime coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('forces in-memory store when distributed state is disabled even with redisUrl', () => {
    const logger = { info: vi.fn(), warn: vi.fn() };
    const limiter = createAuthRateLimiter(logger, {
      redisUrl: 'redis://cache:6379',
      runtimeDistributedStateEnabled: false
    }) as unknown as { store: { kind: string }; getConfig(): Record<string, unknown> };

    expect(storeConstructors.memory).toHaveBeenCalledTimes(1);
    expect(storeConstructors.redis).not.toHaveBeenCalled();
    expect(limiter.store.kind).toBe('memory');
    expect(logger.info).toHaveBeenCalledWith('auth rate limiter using in-memory backend');
    expect(limiter.getConfig()).toEqual({
      windowMs: 15 * 60 * 1000,
      maxRequests: 10,
      name: 'auth'
    });
  });

  it('uses redis store when distributed state is enabled and redisUrl is configured', () => {
    const logger = { info: vi.fn(), warn: vi.fn() };
    const limiter = createAuthRateLimiter(logger, {
      redisUrl: 'redis://cache:6379',
      runtimeDistributedStateEnabled: true,
      authRateLimitWindowMs: 60_000,
      authRateLimitMaxRequests: 4
    }) as unknown as { store: { kind: string; options: Record<string, unknown> } };

    expect(storeConstructors.redis).toHaveBeenCalledWith({
      redisUrl: 'redis://cache:6379',
      keyPrefix: 'rate-limit:auth'
    });
    expect(limiter.store.kind).toBe('redis');
    expect(limiter.store.options).toEqual({
      redisUrl: 'redis://cache:6379',
      keyPrefix: 'rate-limit:auth'
    });
    expect(logger.info).toHaveBeenCalledWith('auth rate limiter using Redis backend', {
      runtimeDistributedStateEnabled: true
    });
  });
});
