import type { ApiKeyId, ApiKeySummary, ApiKeyUsageSummary } from '@cvg-his-v2/shared-types';

export interface ApiKeyRepository {
  create(apiKey: ApiKeySummary): Promise<void>;
  findById(id: ApiKeyId): Promise<ApiKeySummary | null>;
  findByAccount(accountId: string): Promise<readonly ApiKeySummary[]>;
  findByPrefix(keyPrefix: string): Promise<readonly ApiKeySummary[]>;
  findActiveById(id: ApiKeyId): Promise<ApiKeySummary | null>;
  update(apiKey: ApiKeySummary): Promise<void>;
  delete(id: ApiKeyId): Promise<void>;

  // Rate limiting
  incrementUsage(apiKeyId: string, windowStart: Date): Promise<void>;
  getUsageCount(apiKeyId: string, windowStart: Date): Promise<number>;

  // Usage tracking
  recordUsage(usage: ApiKeyUsageSummary): Promise<void>;
  getUsageHistory(apiKeyId: string, limit?: number): Promise<readonly ApiKeyUsageSummary[]>;
}