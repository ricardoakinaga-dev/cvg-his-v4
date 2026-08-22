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

export interface RateLimitIncrementOptions {
  readonly now: number;
  readonly windowMs: number;
  readonly maxRequests: number;
}

export interface RateLimitIncrementResult {
  readonly count: number;
  readonly resetAt: number;
  readonly blocked: boolean;
}

/**
 * Store interface for rate limiter backends.
 * Implementations must make increment's counter update and allow/block decision
 * indivisible. get/set remain available for diagnostics and compatibility, but
 * RateLimiter never composes them into a read/modify/write sequence.
 */
export interface RateLimiterStore {
  increment(key: string, options: RateLimitIncrementOptions): Promise<RateLimitIncrementResult>;
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

  async increment(
    key: string,
    options: RateLimitIncrementOptions
  ): Promise<RateLimitIncrementResult> {
    const current = this.store.get(key);
    const entry =
      !current || current.resetAt <= options.now
        ? { count: 0, resetAt: options.now + options.windowMs }
        : current;

    if (entry.count >= options.maxRequests) {
      return { ...entry, blocked: true };
    }

    const nextEntry = { count: entry.count + 1, resetAt: entry.resetAt };
    this.store.set(key, nextEntry);
    return { ...nextEntry, blocked: false };
  }

  async get(key: string): Promise<{ count: number; resetAt: number } | undefined> {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (entry.resetAt <= Date.now()) {
      this.store.delete(key);
      return undefined;
    }
    return { ...entry };
  }

  async set(key: string, value: { count: number; resetAt: number }): Promise<void> {
    this.store.set(key, { ...value });
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
  readonly connectTimeoutMs?: number;
  readonly maxReconnectAttempts?: number;
}

type RedisClient = ReturnType<(typeof import('redis'))['createClient']>;

const ATOMIC_INCREMENT_SCRIPT = `
local values = redis.call('HMGET', KEYS[1], 'count', 'resetAt')
local count = tonumber(values[1])
local resetAt = tonumber(values[2])
local serverTime = redis.call('TIME')
local now = (tonumber(serverTime[1]) * 1000) + math.floor(tonumber(serverTime[2]) / 1000)
local windowMs = tonumber(ARGV[1])
local maxRequests = tonumber(ARGV[2])

if not count or not resetAt or resetAt <= now then
  count = 0
  resetAt = now + windowMs
end

if count >= maxRequests then
  return { count, resetAt, 1 }
end

count = count + 1
redis.call('HSET', KEYS[1], 'count', count, 'resetAt', resetAt)
redis.call('PEXPIREAT', KEYS[1], resetAt)
return { count, resetAt, 0 }
`;

export class RedisRateLimiterStore implements RateLimiterStore {
  private readonly redisUrl: string;
  private readonly keyPrefix: string;
  private readonly connectTimeoutMs: number;
  private readonly maxReconnectAttempts: number;
  private clientPromise: Promise<RedisClient> | undefined;
  private activeOperations = 0;
  private closed = false;
  private closePromise: Promise<void> | undefined;
  private readonly drainWaiters = new Set<() => void>();
  private readonly retiredClients = new Set<RedisClient>();

  constructor(options: RedisRateLimiterStoreOptions) {
    this.redisUrl = options.redisUrl;
    this.keyPrefix = options.keyPrefix ?? 'rate-limit';
    this.connectTimeoutMs = options.connectTimeoutMs ?? 500;
    this.maxReconnectAttempts = options.maxReconnectAttempts ?? 1;
  }

  private fullKey(key: string): string {
    return `${this.keyPrefix}:${key}`;
  }

  private async getClient(): Promise<RedisClient> {
    if (!this.clientPromise) {
      this.clientPromise = import('redis').then(async ({ createClient }) => {
        const client = createClient({
          url: this.redisUrl,
          disableOfflineQueue: true,
          socket: {
            connectTimeout: this.connectTimeoutMs,
            reconnectStrategy: (retries) => {
              if (retries >= this.maxReconnectAttempts) {
                return new Error('Redis rate limiter reconnect limit reached');
              }
              return Math.min(50 * 2 ** retries, 250);
            }
          }
        });
        // node-redis requires an error listener. Command/connect failures still
        // reject through execute(); this prevents a separate process-level event.
        client.on('error', () => undefined);
        try {
          await client.connect();
          client.unref();
          return client;
        } catch (error) {
          await this.disconnectClient(client);
          throw error;
        }
      });
    }

    const clientPromise = this.clientPromise;
    try {
      return await clientPromise;
    } catch (error) {
      if (this.clientPromise === clientPromise) {
        this.clientPromise = undefined;
      }
      throw error;
    }
  }

  private async execute<T>(operation: (client: RedisClient) => Promise<T>): Promise<T> {
    if (this.closed) {
      throw new Error('Redis rate limiter unavailable', {
        cause: new Error('Redis rate limiter store is closed')
      });
    }

    this.activeOperations += 1;
    let client: RedisClient | undefined;
    try {
      client = await this.getClient();
      client.ref();
      return await operation(client);
    } catch (error) {
      if (client) {
        await this.retireFailedClient(client);
      }
      throw new Error('Redis rate limiter unavailable', { cause: error as Error });
    } finally {
      this.activeOperations = Math.max(0, this.activeOperations - 1);
      if (this.activeOperations === 0) {
        client?.unref();
        for (const resolve of this.drainWaiters) resolve();
        this.drainWaiters.clear();
        await this.disconnectRetiredClients();
      }
    }
  }

  private async retireFailedClient(client: RedisClient): Promise<void> {
    const cachedPromise = this.clientPromise;
    if (cachedPromise) {
      try {
        const cachedClient = await cachedPromise;
        if (cachedClient === client && this.clientPromise === cachedPromise) {
          this.clientPromise = undefined;
        }
      } catch {
        if (this.clientPromise === cachedPromise) {
          this.clientPromise = undefined;
        }
      }
    }
    this.retiredClients.add(client);
  }

  private async disconnectRetiredClients(): Promise<void> {
    const clients = [...this.retiredClients];
    this.retiredClients.clear();
    await Promise.all(clients.map((client) => this.disconnectClient(client)));
  }

  private async disconnectClient(client: RedisClient): Promise<void> {
    if (!client.isOpen) return;
    try {
      client.ref();
      await client.disconnect();
    } catch {
      // The operation already failed closed. Cleanup must not mask it.
    }
  }

  private waitForOperationsToDrain(): Promise<void> {
    if (this.activeOperations === 0) return Promise.resolve();
    return new Promise((resolve) => this.drainWaiters.add(resolve));
  }

  async increment(
    key: string,
    options: RateLimitIncrementOptions
  ): Promise<RateLimitIncrementResult> {
    return this.execute(async (client) => {
      const result = await client.eval(ATOMIC_INCREMENT_SCRIPT, {
        keys: [this.fullKey(key)],
        arguments: [String(options.windowMs), String(options.maxRequests)]
      });

      if (!Array.isArray(result) || result.length !== 3) {
        throw new Error('Redis rate limiter returned an invalid increment result');
      }

      const count = Number(result[0]);
      const resetAt = Number(result[1]);
      const blocked = Number(result[2]) === 1;
      if (!Number.isFinite(count) || !Number.isFinite(resetAt)) {
        throw new Error('Redis rate limiter returned non-numeric counter state');
      }

      return { count, resetAt, blocked };
    });
  }

  async get(key: string): Promise<{ count: number; resetAt: number } | undefined> {
    return this.execute(async (client) => {
      const fullKey = this.fullKey(key);
      const [countStr, resetStr] = await client.hmGet(fullKey, ['count', 'resetAt']);
      if (!countStr || !resetStr) return undefined;
      const resetAt = Number(resetStr);
      if (resetAt <= Date.now()) {
        await client.del(fullKey);
        return undefined;
      }
      return { count: Number(countStr), resetAt };
    });
  }

  async set(key: string, value: { count: number; resetAt: number }): Promise<void> {
    await this.execute(async (client) => {
      await client
        .multi()
        .hSet(this.fullKey(key), {
          count: String(value.count),
          resetAt: String(value.resetAt)
        })
        .pExpireAt(this.fullKey(key), value.resetAt)
        .exec();
    });
  }

  async reset(key: string): Promise<void> {
    await this.execute(async (client) => {
      await client.del(this.fullKey(key));
    });
  }

  async resetAll(): Promise<void> {
    await this.execute(async (client) => {
      let cursor = 0;
      do {
        const result = await client.scan(cursor, { MATCH: `${this.keyPrefix}:*`, COUNT: 100 });
        cursor = result.cursor;
        if (result.keys.length > 0) {
          await client.del(result.keys);
        }
      } while (cursor !== 0);
    });
  }

  async close(): Promise<void> {
    if (this.closePromise) return this.closePromise;

    this.closed = true;
    this.closePromise = this.closeWhenDrained();
    return this.closePromise;
  }

  private async closeWhenDrained(): Promise<void> {
    await this.waitForOperationsToDrain();
    await this.disconnectRetiredClients();
    const clientPromise = this.clientPromise;
    this.clientPromise = undefined;
    if (!clientPromise) return;

    try {
      const client = await clientPromise;
      if (client.isOpen) {
        client.ref();
        await client.quit();
      }
    } catch (error) {
      throw new Error('Redis rate limiter close failed', { cause: error as Error });
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
    const entry = await this.store.increment(compositeKey, {
      now,
      windowMs: this.config.windowMs,
      maxRequests: this.config.maxRequests
    });

    if (entry.blocked) return this.createBlockedInfo(entry, now);

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

    return buildKey(userPart, accountPart, ipPart, tenantPart, routePart);
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
