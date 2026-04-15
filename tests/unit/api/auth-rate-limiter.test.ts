import { describe, expect, it, vi } from 'vitest';

import { createAuthRateLimiter } from '../../../apps/api/src/http/auth-rate-limiter.ts';

describe('auth-rate-limiter helper', () => {
  it('builds the auth limiter with provided bootstrap configuration', () => {
    const logger = {
      warn: vi.fn(),
      info: vi.fn()
    };

    const limiter = createAuthRateLimiter(logger, {
      authRateLimitWindowMs: 30_000,
      authRateLimitMaxRequests: 7
    });

    expect(limiter.getConfig()).toEqual({
      windowMs: 30_000,
      maxRequests: 7,
      name: 'auth'
    });
  });

  it('uses in-memory store when redisUrl is absent', () => {
    const logger = {
      warn: vi.fn(),
      info: vi.fn()
    };

    const limiter = createAuthRateLimiter(logger, {});
    expect(limiter.getConfig().name).toBe('auth');
  });
});
