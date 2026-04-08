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

function buildKey(...components: (string | undefined)[]): string {
  return components.filter(Boolean).join(':') || 'anonymous';
}

export class RateLimiter {
  private readonly config: RateLimiterConfig;
  private readonly store = new Map<string, { count: number; resetAt: number }>();

  constructor(config: RateLimiterConfig) {
    this.config = config;
  }

  check(key: RateLimitKey): RateLimitInfo {
    const compositeKey = this.buildCompositeKey(key);
    const now = Date.now();
    const windowStart = now - this.config.windowMs;

    let entry = this.store.get(compositeKey);

    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + this.config.windowMs };
    }

    while (entry.count >= this.config.maxRequests && entry.resetAt > now) {
      const blockedInfo = this.createBlockedInfo(entry, now);
      return blockedInfo;
    }

    entry.count++;
    this.store.set(compositeKey, entry);
    this.cleanup();

    return {
      remaining: Math.max(0, this.config.maxRequests - entry.count),
      limit: this.config.maxRequests,
      reset: entry.resetAt,
      retryAfterMs: 0,
      blocked: false
    };
  }

  isBlocked(key: RateLimitKey): boolean {
    return this.check(key).blocked;
  }

  private buildCompositeKey(key: RateLimitKey): string {
    const userPart = key.userId ? `u:${key.userId}` : undefined;
    const accountPart =
      key.accountId && key.accountId !== 'pending' ? `a:${key.accountId}` : undefined;
    const ipPart = key.ip ? `ip:${key.ip}` : undefined;
    const tenantPart = key.tenantId ? `t:${key.tenantId}` : undefined;
    const routePart = `r:${key.route}`;

    if (userPart) {
      return buildKey(userPart, routePart);
    }

    if (accountPart) {
      return buildKey(accountPart, routePart);
    }

    if (ipPart) {
      return buildKey(ipPart, routePart);
    }

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

  private cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (entry.resetAt <= now) {
        this.store.delete(key);
      }
    }
  }

  reset(key: RateLimitKey): void {
    const compositeKey = this.buildCompositeKey(key);
    this.store.delete(compositeKey);
  }

  resetAll(): void {
    this.store.clear();
  }

  getConfig(): Readonly<{
    windowMs: number;
    maxRequests: number;
    name?: string;
  }> {
    return { ...this.config };
  }
}

export function createRateLimiter(config: RateLimiterConfig): RateLimiter {
  return new RateLimiter(config);
}
