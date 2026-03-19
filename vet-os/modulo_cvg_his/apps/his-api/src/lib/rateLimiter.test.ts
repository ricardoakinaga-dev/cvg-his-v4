import { describe, it, expect, vi } from 'vitest';
import { createRateLimiter } from './rateLimiter.js';
import type { FastifyRequest, FastifyReply } from 'fastify';

describe('RateLimiter', () => {
  function createMocks(ip = '127.0.0.1', userId = 'user-1') {
    const headers: Record<string, any> = {};
    const request = {
      ip,
      requestContext: { actor: { userId } }
    } as any;
    const reply = {
      header: vi.fn((key: string, value: any) => { headers[key] = value; return reply; }),
      status: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis()
    } as any;
    return { request, reply, headers };
  }

  it('should allow requests within limit', async () => {
    const limiter = createRateLimiter({ max: 3, windowMs: 60000 });
    const { request, reply, headers } = createMocks();
    
    for (let i = 0; i < 3; i++) {
      await limiter(request, reply);
    }
    
    expect(reply.status).not.toHaveBeenCalledWith(429);
    expect(headers['X-RateLimit-Limit']).toBe(3);
  });

  it('should block requests exceeding limit', async () => {
    const limiter = createRateLimiter({ max: 2, windowMs: 60000 });
    const { request, reply } = createMocks(`test-${Date.now()}`); // unique IP
    
    await limiter(request, reply);
    await limiter(request, reply);
    await limiter(request, reply); // This should be blocked
    
    expect(reply.status).toHaveBeenCalledWith(429);
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'RATE_LIMITED' })
    );
  });

  it('should set rate limit headers', async () => {
    const limiter = createRateLimiter({ max: 10, windowMs: 60000 });
    const { request, reply, headers } = createMocks(`headers-${Date.now()}`);
    
    await limiter(request, reply);
    
    expect(headers['X-RateLimit-Limit']).toBe(10);
    expect(headers['X-RateLimit-Remaining']).toBe(9);
    expect(headers['X-RateLimit-Reset']).toBeDefined();
  });
});
