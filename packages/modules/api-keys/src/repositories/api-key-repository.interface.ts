import type { ApiKeyId, ApiKeySummary, ApiKeyUsageSummary } from '@cvg-his-v2/shared-types';

export interface ApiKeyRateLimitDecision {
  readonly allowed: boolean;
  readonly current: number;
  readonly remaining: number;
}

export interface ApiKeyRepository {
  create(apiKey: ApiKeySummary): Promise<void>;
  findById(id: ApiKeyId): Promise<ApiKeySummary | null>;
  findByAccount(accountId: string): Promise<readonly ApiKeySummary[]>;
  findByPrefix(keyPrefix: string): Promise<readonly ApiKeySummary[]>;
  /**
   * Optional pre-tenant authentication lookup. Implementations must only
   * return active, non-expired keys matching both the prefix and full hash.
   */
  findActiveByKeyHash?(keyPrefix: string, keyHash: string): Promise<readonly ApiKeySummary[]>;
  findActiveById(id: ApiKeyId): Promise<ApiKeySummary | null>;
  update(apiKey: ApiKeySummary): Promise<void>;
  delete(id: ApiKeyId): Promise<void>;

  // Rate limiting
  /** Atomically consume one request when the window remains below the limit. */
  consumeRateLimit?(
    apiKeyId: string,
    windowStart: Date,
    rateLimit: number
  ): Promise<ApiKeyRateLimitDecision>;
  incrementUsage(apiKeyId: string, windowStart: Date): Promise<void>;
  getUsageCount(apiKeyId: string, windowStart: Date): Promise<number>;

  // Usage tracking
  recordUsage(usage: ApiKeyUsageSummary): Promise<void>;
  getUsageHistory(apiKeyId: string, limit?: number): Promise<readonly ApiKeyUsageSummary[]>;
}
