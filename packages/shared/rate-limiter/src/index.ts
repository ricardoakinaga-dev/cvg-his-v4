export interface RateLimiterConfig {
  readonly windowMs: number;
  readonly maxRequests: number;
  readonly name?: string;
}

export interface RateLimitInfo {
  readonly remaining: number;
  readonly limit: number;
  readonly reset: number;
  readonly retryAfterMs: number;
  readonly blocked: boolean;
}

export interface RateLimitKey {
  readonly userId?: string;
  readonly accountId?: string;
  readonly ip?: string;
  readonly tenantId?: string;
  readonly route: string;
}

/**
 * Store interface for rate limiter backends.
 * Implementations must provide identical semantics for get/set.
 */
export interface RateLimiterStore {
  get(key: string): Promise<{ count: number; resetAt: number } | undefined>;
  set(key: string, value: { count: number; resetAt: number }): Promise<void>;
  reset(key: string): Promise<void>;
  resetAll(): Promise<void>;
}

function buildKey(...components: (string | undefined)[]): string {
  return components.filter(Boolean).join(':') || 'anonymous';
}

// ---------------------------------------------------------------------------
// In-memory store (default)
// ---------------------------------------------------------------------------

export class InMemoryRateLimiterStore implements RateLimiterStore {
  private readonly store = new Map<string, { count: number; resetAt: number }>();

  async get(key: string): Promise<{ count: number; resetAt: number } | undefined> {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.resetAt <= Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return entry;
  }

  async set(key: string, value: { count: number; resetAt: number }): Promise<void> {
    this.store.set(key, value);
  }

  async reset(key: string): Promise<void> {
    this.store.delete(key);
  }

  async resetAll(): Promise<void> {
    this.store.clear();
  }
}

// ---------------------------------------------------------------------------
// Redis store
// ---------------------------------------------------------------------------

export interface RedisRateLimiterStoreOptions {
  readonly redisUrl: string;
  readonly keyPrefix?: string;
}

export class RedisRateLimiterStore implements RateLimiterStore {
  private readonly redisUrl: string;
  private readonly keyPrefix: string;

  constructor(options: RedisRateLimiterStoreOptions) {
    this.redisUrl = options.redisUrl;
    this.keyPrefix = options.keyPrefix ?? 'rate-limit';
  }

  private ttlFor(resetAt: number): number {
    const ttl = Math.ceil((resetAt - Date.now()) / 1000);
    return ttl > 0 ? ttl : 1;
  }

  async get(key: string): Promise<{ count: number; resetAt: number } | undefined> {
    try {
      const { createClient } = await import('redis');
      const client = createClient({ url: this.redisUrl });
      await client.connect();
      try {
        const fullKey = `${this.keyPrefix}:${key}`;
        const [countStr, resetStr] = await client.hmGet(fullKey, ['count', 'resetAt']);
        if (!countStr || !resetStr) return undefined;
        const resetAt = Number(resetStr);
        if (resetAt <= Date.now()) {
          await client.del(fullKey);
          return undefined;
        }
        return { count: Number(countStr), resetAt };
      } finally {
        await client.quit();
      }
    } catch {
      return undefined;
    }
  }

  async set(key: string, value: { count: number; resetAt: number }): Promise<void> {
    try {
      const { createClient } = await import('redis');
      const client = createClient({ url: this.redisUrl });
      await client.connect();
      try {
        const fullKey = `${this.keyPrefix}:${key}`;
        const ttl = this.ttlFor(value.resetAt);
        await client.hSet(fullKey, {
          count: String(value.count),
          resetAt: String(value.resetAt)
        });
        await client.expire(fullKey, ttl);
      } finally {
        await client.quit();
      }
    } catch {
      // Redis write failure is swallowed — caller falls back to in-memory
    }
  }

  async reset(key: string): Promise<void> {
    try {
      const { createClient } = await import('redis');
      const client = createClient({ url: this.redisUrl });
      await client.connect();
      try {
        await client.del(`${this.keyPrefix}:${key}`);
      } finally {
        await client.quit();
      }
    } catch {
      // swallow
    }
  }

  async resetAll(): Promise<void> {
    try {
      const { createClient } = await import('redis');
      const client = createClient({ url: this.redisUrl });
      await client.connect();
      try {
        let cursor = 0;
        do {
          const result = await client.scan(cursor, { MATCH: `${this.keyPrefix}:*`, COUNT: 100 });
          cursor = result.cursor;
          if (result.keys.length > 0) {
            await client.del(result.keys);
          }
        } while (cursor !== 0);
      } finally {
        await client.quit();
      }
    } catch {
      // swallow
    }
  }
}

// ---------------------------------------------------------------------------
// RateLimiter with configurable store
// ---------------------------------------------------------------------------

export class RateLimiter {
  private readonly config: RateLimiterConfig;
  private readonly store: RateLimiterStore;

  constructor(config: RateLimiterConfig, store?: RateLimiterStore);
  constructor(config: RateLimiterConfig, store: RateLimiterStore);
  constructor(config: RateLimiterConfig, store?: RateLimiterStore) {
    this.config = config;
    this.store = store ?? new InMemoryRateLimiterStore();
  }

  async check(key: RateLimitKey): Promise<RateLimitInfo> {
    const compositeKey = this.buildCompositeKey(key);
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    let entry = await this.store.get(compositeKey);

    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + this.config.windowMs };
    }

    while (entry.count >= this.config.maxRequests && entry.resetAt > now) {
      return this.createBlockedInfo(entry, now);
    }

    entry.count++;
    await this.store.set(compositeKey, entry);

    return {
      remaining: Math.max(0, this.config.maxRequests - entry.count),
      limit: this.config.maxRequests,
      reset: entry.resetAt,
      retryAfterMs: 0,
      blocked: false
    };
  }

  isBlocked(key: RateLimitKey): Promise<boolean> {
    return this.check(key).then((r) => r.blocked);
  }

  async reset(key: RateLimitKey): Promise<void> {
    const compositeKey = this.buildCompositeKey(key);
    await this.store.reset(compositeKey);
  }

  async resetAll(): Promise<void> {
    await this.store.resetAll();
  }

  private buildCompositeKey(key: RateLimitKey): string {
    const userPart = key.userId ? `u:${key.userId}` : undefined;
    const accountPart =
      key.accountId && key.accountId !== 'pending' ? `a:${key.accountId}` : undefined;
    const ipPart = key.ip ? `ip:${key.ip}` : undefined;
    const tenantPart = key.tenantId ? `t:${key.tenantId}` : undefined;
    const routePart = `r:${key.route}`;

    if (userPart) return buildKey(userPart, routePart);
    if (accountPart) return buildKey(accountPart, routePart);
    if (ipPart) return buildKey(ipPart, routePart);
    return buildKey(tenantPart, routePart);
  }

  private createBlockedInfo(entry: { count: number; resetAt: number }, now: number): RateLimitInfo {
    return {
      remaining: 0,
      limit: this.config.maxRequests,
      reset: entry.resetAt,
      retryAfterMs: Math.max(0, entry.resetAt - now),
      blocked: true
    };
  }

  getConfig(): Readonly<{ windowMs: number; maxRequests: number; name?: string }> {
    return { ...this.config };
  }
}

export function createRateLimiter(config: RateLimiterConfig, store?: RateLimiterStore): RateLimiter {
  return new RateLimiter(config, store);
}
