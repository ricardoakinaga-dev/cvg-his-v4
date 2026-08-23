import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';
import type {
  ApiKeyId,
  ApiKeySummary,
  ApiKeyUsageSummary,
  AccountId
} from '@cvg-his-v2/shared-types';
import type { ApiKeyRepository } from './repositories/api-key-repository.interface.js';
import { DatabaseApiKeyRepository } from './repositories/database-api-key.repository.js';

export interface CreateApiKeyInput {
  accountId: AccountId;
  name: string;
  permissions: readonly string[];
  rateLimit?: number;
  rateLimitWindow?: number;
  expiresAt?: string;
  createdBy: string;
}

export interface ApiKeyCreated {
  apiKey: ApiKeySummary;
  rawKey: string; // Only returned once at creation time
}

export class ApiKeysService {
  private repository: ApiKeyRepository;

  constructor(repository?: ApiKeyRepository) {
    this.repository = repository ?? new DatabaseApiKeyRepository();
  }

  async create(input: CreateApiKeyInput): Promise<ApiKeyCreated> {
    const id = randomUUID() as ApiKeyId;
    const rawKey = this.generateKey();
    const keyPrefix = rawKey.substring(0, 8);
    const keyHash = this.hashKey(rawKey);

    const now = new Date().toISOString();
    const apiKey: ApiKeySummary = {
      id,
      accountId: input.accountId,
      name: input.name,
      keyPrefix,
      keyHash,
      permissions: input.permissions,
      rateLimit: input.rateLimit ?? 1000,
      rateLimitWindow: input.rateLimitWindow ?? 3600,
      expiresAt: input.expiresAt ?? null,
      lastUsedAt: null,
      isActive: true,
      createdBy: input.createdBy,
      createdAt: now,
      updatedAt: now
    };

    await this.repository.create(apiKey);

    return { apiKey, rawKey };
  }

  async validate(key: string): Promise<ApiKeySummary | null> {
    if (!key || key.length < 8) return null;

    const keyPrefix = key.substring(0, 8);
    const keyHash = this.hashKey(key);
    const candidates = this.repository.findActiveByKeyHash
      ? await this.repository.findActiveByKeyHash(keyPrefix, keyHash)
      : await this.repository.findByPrefix(keyPrefix);

    const matchingCandidates = candidates.filter((candidate) => {
      if (!candidate.keyHash || !candidate.isActive || !this.verifyKey(key, candidate.keyHash)) {
        return false;
      }

      return !candidate.expiresAt || new Date(candidate.expiresAt).getTime() > Date.now();
    });

    // A prefix is deliberately non-unique. Never choose an arbitrary key if
    // storage corruption or a custom repository produces more than one match.
    return matchingCandidates.length === 1 ? matchingCandidates[0] : null;
  }

  async getById(id: ApiKeyId): Promise<ApiKeySummary | null> {
    return this.repository.findById(id);
  }

  async getByAccount(accountId: string): Promise<readonly ApiKeySummary[]> {
    return this.repository.findByAccount(accountId);
  }

  async deactivate(id: ApiKeyId): Promise<void> {
    const existing = await this.repository.findById(id);
    if (!existing) return;

    const updated: ApiKeySummary = {
      ...existing,
      isActive: false,
      updatedAt: new Date().toISOString()
    };

    await this.repository.update(updated);
  }

  async updateLastUsed(id: ApiKeyId): Promise<void> {
    const existing = await this.repository.findById(id);
    if (!existing) return;

    const updated: ApiKeySummary = {
      ...existing,
      lastUsedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await this.repository.update(updated);
  }

  async checkRateLimit(apiKeyId: string, rateLimit: number, windowSeconds: number): Promise<{
    allowed: boolean;
    current: number;
    remaining: number;
    resetAt: Date;
  }> {
    const windowStart = this.getWindowStart(windowSeconds);
    if (this.repository.consumeRateLimit) {
      const decision = await this.repository.consumeRateLimit(apiKeyId, windowStart, rateLimit);
      return {
        ...decision,
        resetAt: new Date(windowStart.getTime() + windowSeconds * 1000)
      };
    }

    const current = await this.repository.getUsageCount(apiKeyId, windowStart);
    const allowed = current < rateLimit;
    const remaining = Math.max(0, rateLimit - current);
    const resetAt = new Date(windowStart.getTime() + windowSeconds * 1000);

    if (allowed) {
      await this.repository.incrementUsage(apiKeyId, windowStart);
    }

    return { allowed, current, remaining, resetAt };
  }

  async recordUsage(usage: Omit<ApiKeyUsageSummary, 'id' | 'createdAt'>): Promise<void> {
    const record: ApiKeyUsageSummary = {
      ...usage,
      id: randomUUID(),
      createdAt: new Date().toISOString()
    };
    await this.repository.recordUsage(record);
  }

  async getUsageHistory(apiKeyId: string, limit?: number): Promise<readonly ApiKeyUsageSummary[]> {
    return this.repository.getUsageHistory(apiKeyId, limit);
  }

  private generateKey(): string {
    const bytes = randomUUID().replace(/-/g, '') + randomUUID().replace(/-/g, '');
    return 'cvg_' + bytes.substring(0, 48);
  }

  private hashKey(key: string): string {
    return createHash('sha256').update(key).digest('hex');
  }

  private verifyKey(rawKey: string, storedHash: string): boolean {
    const computed = this.hashKey(rawKey);
    try {
      const a = Buffer.from(computed, 'utf8');
      const b = Buffer.from(storedHash, 'utf8');
      if (a.length !== b.length) return false;
      return timingSafeEqual(a, b);
    } catch {
      return false;
    }
  }

  private getWindowStart(windowSeconds: number): Date {
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    const windowStart = Math.floor(now / windowMs) * windowMs;
    return new Date(windowStart);
  }
}
