import { getPool } from '@cvg-his-v2/shared-database';
import { withTenantQuery } from '@cvg-his-v2/tenant-context';
import type { AccountId, ApiKeyId, ApiKeySummary, ApiKeyUsageSummary } from '@cvg-his-v2/shared-types';
import type { ApiKeyRepository } from './api-key-repository.interface.js';

export class DatabaseApiKeyRepository implements ApiKeyRepository {
  async create(apiKey: ApiKeySummary): Promise<void> {
    return withTenantQuery(getPool(), async (client) => {
      await client.query(
        `INSERT INTO api_keys (id, account_id, name, key_prefix, key_hash, permissions, rate_limit, rate_limit_window, expires_at, last_used_at, is_active, created_by, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          apiKey.id,
          apiKey.accountId,
          apiKey.name,
          apiKey.keyPrefix,
          apiKey.keyHash,
          JSON.stringify(apiKey.permissions),
          apiKey.rateLimit,
          apiKey.rateLimitWindow,
          apiKey.expiresAt ? new Date(apiKey.expiresAt) : null,
          apiKey.lastUsedAt ? new Date(apiKey.lastUsedAt) : null,
          apiKey.isActive,
          apiKey.createdBy,
          new Date(apiKey.createdAt),
          new Date(apiKey.updatedAt)
        ]
      );
    });
  }

  async findById(id: ApiKeyId): Promise<ApiKeySummary | null> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query('SELECT * FROM api_keys WHERE id = $1', [id]);
      if (result.rows.length === 0) return null;
      return this.mapRow(result.rows[0]);
    });
  }

  async findByAccount(accountId: string): Promise<readonly ApiKeySummary[]> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        'SELECT * FROM api_keys WHERE account_id = $1 ORDER BY created_at DESC',
        [accountId]
      );
      return result.rows.map((r: Record<string, unknown>) => this.mapRow(r));
    });
  }

  async findByPrefix(keyPrefix: string): Promise<readonly ApiKeySummary[]> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        'SELECT * FROM api_keys WHERE key_prefix = $1 AND is_active = true ORDER BY created_at DESC',
        [keyPrefix]
      );
      return result.rows.map((r: Record<string, unknown>) => this.mapRow(r));
    });
  }

  async findActiveById(id: ApiKeyId): Promise<ApiKeySummary | null> {
    return withTenantQuery(getPool(), async (client) => {
      const now = new Date();
      const result = await client.query(
        `SELECT * FROM api_keys WHERE id = $1 AND is_active = true AND (expires_at IS NULL OR expires_at > $2)`,
        [id, now]
      );
      if (result.rows.length === 0) return null;
      return this.mapRow(result.rows[0]);
    });
  }

  async update(apiKey: ApiKeySummary): Promise<void> {
    return withTenantQuery(getPool(), async (client) => {
      await client.query(
        `UPDATE api_keys SET name = $2, permissions = $3, rate_limit = $4, rate_limit_window = $5, expires_at = $6, last_used_at = $7, is_active = $8, updated_at = $9 WHERE id = $1`,
        [
          apiKey.id,
          apiKey.name,
          JSON.stringify(apiKey.permissions),
          apiKey.rateLimit,
          apiKey.rateLimitWindow,
          apiKey.expiresAt ? new Date(apiKey.expiresAt) : null,
          apiKey.lastUsedAt ? new Date(apiKey.lastUsedAt) : null,
          apiKey.isActive,
          new Date(apiKey.updatedAt)
        ]
      );
    });
  }

  async delete(id: ApiKeyId): Promise<void> {
    return withTenantQuery(getPool(), async (client) => {
      await client.query('DELETE FROM api_keys WHERE id = $1', [id]);
    });
  }

  // Rate limiting
  async incrementUsage(apiKeyId: string, windowStart: Date): Promise<void> {
    return withTenantQuery(getPool(), async (client) => {
      await client.query(
        `INSERT INTO api_key_rate_limits (api_key_id, window_start, request_count)
         VALUES ($1, $2, 1)
         ON CONFLICT (api_key_id, window_start)
         DO UPDATE SET request_count = api_key_rate_limits.request_count + 1`,
        [apiKeyId, windowStart]
      );
    });
  }

  async getUsageCount(apiKeyId: string, windowStart: Date): Promise<number> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        'SELECT request_count FROM api_key_rate_limits WHERE api_key_id = $1 AND window_start = $2',
        [apiKeyId, windowStart]
      );
      if (result.rows.length === 0) return 0;
      return result.rows[0].request_count as number;
    });
  }

  // Usage tracking
  async recordUsage(usage: ApiKeyUsageSummary): Promise<void> {
    return withTenantQuery(getPool(), async (client) => {
      await client.query(
        `INSERT INTO api_key_usage (id, api_key_id, endpoint, method, status_code, response_time_ms, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          usage.id,
          usage.apiKeyId,
          usage.endpoint,
          usage.method,
          usage.statusCode,
          usage.responseTimeMs,
          new Date(usage.createdAt)
        ]
      );
    });
  }

  async getUsageHistory(apiKeyId: string, limit = 100): Promise<readonly ApiKeyUsageSummary[]> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        'SELECT * FROM api_key_usage WHERE api_key_id = $1 ORDER BY created_at DESC LIMIT $2',
        [apiKeyId, limit]
      );
      return result.rows.map((r: Record<string, unknown>) => this.mapUsageRow(r));
    });
  }

  private mapRow(row: Record<string, unknown>): ApiKeySummary {
    return {
      id: row.id as ApiKeyId,
      accountId: row.account_id as AccountId,
      name: row.name as string,
      keyPrefix: row.key_prefix as string,
      keyHash: row.key_hash as string,
      permissions: JSON.parse(row.permissions as string) as readonly string[],
      rateLimit: row.rate_limit as number,
      rateLimitWindow: row.rate_limit_window as number,
      expiresAt: row.expires_at ? (row.expires_at as Date).toISOString() : null,
      lastUsedAt: row.last_used_at ? (row.last_used_at as Date).toISOString() : null,
      isActive: row.is_active as boolean,
      createdBy: row.created_by as string,
      createdAt: new Date(row.created_at as Date).toISOString(),
      updatedAt: new Date(row.updated_at as Date).toISOString()
    };
  }

  private mapUsageRow(row: Record<string, unknown>): ApiKeyUsageSummary {
    return {
      id: row.id as string,
      apiKeyId: row.api_key_id as string,
      endpoint: row.endpoint as string,
      method: row.method as string,
      statusCode: row.status_code as number | null,
      responseTimeMs: row.response_time_ms as number | null,
      createdAt: new Date(row.created_at as Date).toISOString()
    };
  }
}