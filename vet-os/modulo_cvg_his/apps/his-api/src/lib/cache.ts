/**
 * Simple in-memory cache with TTL support.
 * 
 * For production, consider using Redis-based cache instead.
 * This is suitable for single-instance deployments.
 */

type CacheEntry<T> = {
  data: T;
  expiresAt: number;
};

export class SimpleCache {
  private store = new Map<string, CacheEntry<unknown>>();
  private defaultTtlMs: number;
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor(defaultTtlMs = 60_000) { // 1 minute default
    this.defaultTtlMs = defaultTtlMs;
    
    // Auto-cleanup every 30 seconds
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 30_000);
  }

  /**
   * Get a cached value. Returns undefined if not found or expired.
   */
  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return undefined;
    }
    
    return entry.data as T;
  }

  /**
   * Set a value in cache with optional TTL.
   */
  set<T>(key: string, data: T, ttlMs?: number): void {
    this.store.set(key, {
      data,
      expiresAt: Date.now() + (ttlMs ?? this.defaultTtlMs)
    });
  }

  /**
   * Get cached value or compute and cache it.
   */
  async getOrSet<T>(key: string, compute: () => Promise<T>, ttlMs?: number): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== undefined) return cached;
    
    const data = await compute();
    this.set(key, data, ttlMs);
    return data;
  }

  /**
   * Delete a specific key.
   */
  delete(key: string): boolean {
    return this.store.delete(key);
  }

  /**
   * Delete all keys matching a pattern.
   */
  deletePattern(pattern: string): number {
    let count = 0;
    const regex = new RegExp(pattern.replace('*', '.*'));
    for (const key of this.store.keys()) {
      if (regex.test(key)) {
        this.store.delete(key);
        count++;
      }
    }
    return count;
  }

  /**
   * Clear all cache entries.
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Remove expired entries.
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (now > entry.expiresAt) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Get cache statistics.
   */
  stats(): { size: number; keys: string[] } {
    return {
      size: this.store.size,
      keys: Array.from(this.store.keys())
    };
  }

  /**
   * Destroy the cache and cleanup interval.
   */
  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.clear();
  }
}

// Singleton instances for different cache zones
export const healthCache = new SimpleCache(10_000); // 10s for health checks
export const reportCache = new SimpleCache(60_000); // 1min for reports
export const catalogCache = new SimpleCache(300_000); // 5min for catalog data
