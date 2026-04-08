import { describe, it, expect } from 'vitest';

import { RateLimiter } from '@cvg-his-v2/shared-rate-limiter';

describe('RateLimiter Integration Tests', () => {
  describe('Key isolation for unauthenticated requests', () => {
    it('should NOT share bucket when accountId is pending and IPs differ', () => {
      const limiter = new RateLimiter({ windowMs: 60000, maxRequests: 3, name: 'test' });

      limiter.check({ ip: '192.168.1.1', accountId: 'pending', route: '/auth/login' });
      limiter.check({ ip: '192.168.1.1', accountId: 'pending', route: '/auth/login' });
      limiter.check({ ip: '192.168.1.1', accountId: 'pending', route: '/auth/login' });

      const ip1Blocked = limiter.check({
        ip: '192.168.1.1',
        accountId: 'pending',
        route: '/auth/login'
      });
      expect(ip1Blocked.blocked).toBe(true);

      const ip2First = limiter.check({
        ip: '192.168.1.2',
        accountId: 'pending',
        route: '/auth/login'
      });
      expect(ip2First.blocked).toBe(false);
      expect(ip2First.remaining).toBe(2);
    });

    it('should share bucket when accountId is verified (not pending)', () => {
      const limiter = new RateLimiter({ windowMs: 60000, maxRequests: 3, name: 'test' });

      limiter.check({ ip: '192.168.1.1', accountId: 'acc_cvg_demo', route: '/lgpd/consent' });
      limiter.check({ ip: '192.168.1.1', accountId: 'acc_cvg_demo', route: '/lgpd/consent' });
      limiter.check({ ip: '192.168.1.2', accountId: 'acc_cvg_demo', route: '/lgpd/consent' });

      const blocked = limiter.check({
        ip: '192.168.1.3',
        accountId: 'acc_cvg_demo',
        route: '/lgpd/consent'
      });
      expect(blocked.blocked).toBe(true);
    });

    it('should prefer verified account over IP for same account', () => {
      const limiter = new RateLimiter({ windowMs: 60000, maxRequests: 2, name: 'test' });

      limiter.check({ ip: '10.0.0.1', accountId: 'acc_real', route: '/lgpd/consent' });
      limiter.check({ ip: '10.0.0.2', accountId: 'acc_real', route: '/lgpd/consent' });

      const fromThirdIp = limiter.check({
        ip: '10.0.0.3',
        accountId: 'acc_real',
        route: '/lgpd/consent'
      });
      expect(fromThirdIp.blocked).toBe(true);
    });
  });

  describe('User-based isolation (authenticated requests)', () => {
    it('should isolate by userId, not IP', () => {
      const limiter = new RateLimiter({ windowMs: 60000, maxRequests: 2, name: 'test' });

      limiter.check({ userId: 'user1', ip: '192.168.1.1', route: '/auth/login' });
      limiter.check({ userId: 'user1', ip: '192.168.1.1', route: '/auth/login' });

      const user1Blocked = limiter.check({
        userId: 'user1',
        ip: '192.168.1.1',
        route: '/auth/login'
      });
      expect(user1Blocked.blocked).toBe(true);

      const user2SameIp = limiter.check({
        userId: 'user2',
        ip: '192.168.1.1',
        route: '/auth/login'
      });
      expect(user2SameIp.blocked).toBe(false);
    });

    it('should isolate users across different routes independently', () => {
      const limiter = new RateLimiter({ windowMs: 60000, maxRequests: 2, name: 'test' });

      limiter.check({ userId: 'user1', route: '/auth/login' });
      limiter.check({ userId: 'user1', route: '/auth/login' });

      const user1LoginBlocked = limiter.check({ userId: 'user1', route: '/auth/login' });
      expect(user1LoginBlocked.blocked).toBe(true);

      const user1Mfa = limiter.check({ userId: 'user1', route: '/auth/login/mfa' });
      expect(user1Mfa.blocked).toBe(false);
      expect(user1Mfa.remaining).toBe(1);
    });
  });

  describe('Route-based isolation', () => {
    it('should have independent limits per route', () => {
      const limiter = new RateLimiter({ windowMs: 60000, maxRequests: 2, name: 'test' });

      limiter.check({ ip: '1.1.1.1', route: '/auth/login' });
      limiter.check({ ip: '1.1.1.1', route: '/auth/login' });

      const loginBlocked = limiter.check({ ip: '1.1.1.1', route: '/auth/login' });
      expect(loginBlocked.blocked).toBe(true);

      const mfaAllowed = limiter.check({ ip: '1.1.1.1', route: '/auth/login/mfa' });
      expect(mfaAllowed.blocked).toBe(false);
    });

    it('should share bucket for same route', () => {
      const limiter = new RateLimiter({ windowMs: 60000, maxRequests: 2, name: 'test' });

      limiter.check({ ip: '5.5.5.5', route: '/lgpd/consent' });
      limiter.check({ ip: '5.5.5.5', route: '/lgpd/consent' });

      const blocked = limiter.check({ ip: '5.5.5.5', route: '/lgpd/consent' });
      expect(blocked.blocked).toBe(true);
      expect(blocked.remaining).toBe(0);
    });
  });

  describe('Headers info correctness', () => {
    it('should return correct limit and remaining', () => {
      const limiter = new RateLimiter({ windowMs: 5000, maxRequests: 10, name: 'test' });

      const first = limiter.check({ ip: '8.8.8.8', route: '/auth/refresh' });
      expect(first.limit).toBe(10);
      expect(first.remaining).toBe(9);
      expect(first.blocked).toBe(false);
      expect(first.reset).toBeGreaterThan(Date.now());
    });

    it('should return blocked info with retryAfterMs', () => {
      const limiter = new RateLimiter({ windowMs: 1000, maxRequests: 1, name: 'test' });

      limiter.check({ ip: '8.8.4.4', route: '/mfa/setup' });
      const blocked = limiter.check({ ip: '8.8.4.4', route: '/mfa/setup' });

      expect(blocked.blocked).toBe(true);
      expect(blocked.remaining).toBe(0);
      expect(blocked.retryAfterMs).toBeGreaterThan(0);
      expect(blocked.retryAfterMs).toBeLessThanOrEqual(1000);
    });

    it('should include reset timestamp', () => {
      const limiter = new RateLimiter({ windowMs: 30000, maxRequests: 5, name: 'test' });
      const before = Date.now();

      const result = limiter.check({ ip: '1.2.3.4', route: '/lgpd/consent' });

      expect(result.reset).toBeGreaterThanOrEqual(before);
      expect(result.reset).toBeLessThanOrEqual(before + 30000 + 10);
    });
  });

  describe('Window reset behavior', () => {
    it('should allow new requests after window expires', async () => {
      const limiter = new RateLimiter({ windowMs: 100, maxRequests: 2, name: 'test' });

      limiter.check({ ip: '2.2.2.2', route: '/lgpd/consent' });
      limiter.check({ ip: '2.2.2.2', route: '/lgpd/consent' });

      const blocked = limiter.check({ ip: '2.2.2.2', route: '/lgpd/consent' });
      expect(blocked.blocked).toBe(true);

      await new Promise((resolve) => setTimeout(resolve, 150));

      const afterReset = limiter.check({ ip: '2.2.2.2', route: '/lgpd/consent' });
      expect(afterReset.blocked).toBe(false);
      expect(afterReset.remaining).toBe(1);
    });
  });

  describe('Reset functionality', () => {
    it('should reset specific key only', () => {
      const limiter = new RateLimiter({ windowMs: 60000, maxRequests: 2, name: 'test' });

      limiter.check({ userId: 'user1', route: '/auth/login' });
      limiter.check({ userId: 'user1', route: '/auth/login' });

      limiter.reset({ userId: 'user1', route: '/auth/login' });

      const afterReset = limiter.check({ userId: 'user1', route: '/auth/login' });
      expect(afterReset.blocked).toBe(false);
      expect(afterReset.remaining).toBe(1);
    });

    it('should not affect different keys when resetting one', () => {
      const limiter = new RateLimiter({ windowMs: 60000, maxRequests: 2, name: 'test' });

      limiter.check({ userId: 'user1', route: '/auth/login' });
      limiter.check({ userId: 'user1', route: '/auth/login' });
      limiter.check({ userId: 'user2', route: '/auth/login' });
      limiter.check({ userId: 'user2', route: '/auth/login' });

      limiter.reset({ userId: 'user1', route: '/auth/login' });

      const user1After = limiter.check({ userId: 'user1', route: '/auth/login' });
      expect(user1After.blocked).toBe(false);

      const user2After = limiter.check({ userId: 'user2', route: '/auth/login' });
      expect(user2After.blocked).toBe(true);
    });
  });

  describe('Account vs IP priority', () => {
    it('should use userId when present', () => {
      const limiter = new RateLimiter({ windowMs: 60000, maxRequests: 1, name: 'test' });

      limiter.check({ userId: 'user1', ip: '1.1.1.1', route: '/auth/login' });
      const blocked = limiter.check({ userId: 'user1', ip: '2.2.2.2', route: '/auth/login' });

      expect(blocked.blocked).toBe(true);
    });

    it('should use verified accountId when no userId but valid accountId', () => {
      const limiter = new RateLimiter({ windowMs: 60000, maxRequests: 1, name: 'test' });

      limiter.check({ ip: '1.1.1.1', accountId: 'acc_verified', route: '/lgpd/consent' });
      const blocked = limiter.check({
        ip: '2.2.2.2',
        accountId: 'acc_verified',
        route: '/lgpd/consent'
      });

      expect(blocked.blocked).toBe(true);
    });

    it('should fall back to IP when accountId is pending', () => {
      const limiter = new RateLimiter({ windowMs: 60000, maxRequests: 1, name: 'test' });

      limiter.check({ ip: '1.1.1.1', accountId: 'pending', route: '/auth/login' });
      const sameIpBlocked = limiter.check({
        ip: '1.1.1.1',
        accountId: 'pending',
        route: '/auth/login'
      });
      expect(sameIpBlocked.blocked).toBe(true);

      const diffIp = limiter.check({ ip: '2.2.2.2', accountId: 'pending', route: '/auth/login' });
      expect(diffIp.blocked).toBe(false);
    });
  });
});
