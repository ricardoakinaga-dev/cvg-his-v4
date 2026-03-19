import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';

/**
 * Rate limiting middleware using in-memory store.
 * For production, use Redis-based rate limiting.
 */

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries every minute
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore) {
    if (now > entry.resetAt) {
      rateLimitStore.delete(key);
    }
  }
}, 60_000);

type RateLimitOptions = {
  max: number;        // Max requests per window
  windowMs: number;   // Window duration in ms
  keyGenerator?: (request: FastifyRequest) => string;
};

const defaultKeyGenerator = (request: FastifyRequest): string => {
  // Use IP + user ID if available
  const ip = request.ip || 'unknown';
  const userId = (request.requestContext as any)?.actor?.userId || 'anonymous';
  return `${ip}:${userId}`;
};

export function createRateLimiter(options: RateLimitOptions) {
  const { max, windowMs, keyGenerator = defaultKeyGenerator } = options;

  return async function rateLimitHook(request: FastifyRequest, reply: FastifyReply) {
    const key = keyGenerator(request);
    const now = Date.now();

    let entry = rateLimitStore.get(key);

    if (!entry || now > entry.resetAt) {
      entry = {
        count: 1,
        resetAt: now + windowMs
      };
      rateLimitStore.set(key, entry);
    } else {
      entry.count++;
    }

    // Set rate limit headers
    reply.header('X-RateLimit-Limit', max);
    reply.header('X-RateLimit-Remaining', Math.max(0, max - entry.count));
    reply.header('X-RateLimit-Reset', Math.ceil(entry.resetAt / 1000));

    if (entry.count > max) {
      return reply.status(429).send({
        error: 'RATE_LIMITED',
        message: 'Too many requests, please try again later',
        retryAfter: Math.ceil((entry.resetAt - now) / 1000)
      });
    }
  };
}

// Pre-configured rate limiters
export const strictRateLimiter = createRateLimiter({ max: 30, windowMs: 60_000 });    // 30/min (auth endpoints)
export const normalRateLimiter = createRateLimiter({ max: 100, windowMs: 60_000 });   // 100/min (API endpoints)
export const relaxedRateLimiter = createRateLimiter({ max: 300, windowMs: 60_000 });  // 300/min (read-only)
