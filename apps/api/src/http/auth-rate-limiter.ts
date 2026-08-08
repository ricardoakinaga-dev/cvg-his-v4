import {
  RateLimiter,
  InMemoryRateLimiterStore,
  RedisRateLimiterStore,
  type RateLimiterStore
} from '@cvg-his-v2/shared-rate-limiter';

export interface AuthRateLimiterLogger {
  warn(message: string, payload?: Record<string, unknown>): void;
  info(message: string, payload?: Record<string, unknown>): void;
}

export interface AuthRateLimiterOptions {
  readonly authRateLimitWindowMs?: number;
  readonly authRateLimitMaxRequests?: number;
  readonly redisUrl?: string;
  /** When true, allows Redis backend for distributed rate limiting.
   * When false (or unset), forces in-memory store regardless of redisUrl.
   * GAP-05: consumes runtimeDistributedStateEnabled flag. */
  readonly runtimeDistributedStateEnabled?: boolean;
  /** Production-like runtimes must provide a distributed backend. */
  readonly requireDistributed?: boolean;
}

/**
 * Creates a RateLimiter for auth endpoints.
 *
 * Uses Redis store when `redisUrl` is provided (production/distributed),
 * while retaining the in-memory store only for explicitly non-distributed
 * development/test runtimes.
 * Both backends expose the same `check()` interface and return the same
 * `RateLimitInfo` structure — only the storage backend differs.
 */
export function createAuthRateLimiter(
  logger: AuthRateLimiterLogger,
  options: AuthRateLimiterOptions
): RateLimiter {
  const windowMs = options.authRateLimitWindowMs ?? 15 * 60 * 1000;
  const maxRequests = options.authRateLimitMaxRequests ?? 10;

  let store: RateLimiterStore;

  // GAP-05: runtimeDistributedStateEnabled gates Redis usage.
  // When false (default), force in-memory even if redisUrl is set.
  // When true, allow Redis backend for distributed rate limiting.
  const canUseRedis = options.runtimeDistributedStateEnabled === true;
  if (options.requireDistributed && (!canUseRedis || !options.redisUrl)) {
    throw new Error(
      'Distributed auth rate limiting is required; configure REDIS_URL and RUNTIME_DISTRIBUTED_STATE_ENABLED=1'
    );
  }
  if (canUseRedis && options.redisUrl) {
    const redisStore = new RedisRateLimiterStore({
      redisUrl: options.redisUrl,
      keyPrefix: 'rate-limit:auth'
    });
    store = redisStore;
    logger.info('auth rate limiter using Redis backend', {
      runtimeDistributedStateEnabled: options.runtimeDistributedStateEnabled
    });
  } else {
    store = new InMemoryRateLimiterStore();
    logger.info('auth rate limiter using in-memory backend');
  }

  return new RateLimiter(
    { windowMs, maxRequests, name: 'auth' },
    store
  );
}
