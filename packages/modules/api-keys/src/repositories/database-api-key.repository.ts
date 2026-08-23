import { getPool } from '@cvg-his-v2/shared-database';
import { withTenantQuery } from '@cvg-his-v2/tenant-context';
import type {
  AccountId,
  ApiKeyAuthenticationPrincipal,
  ApiKeyId,
  ApiKeySummary,
  ApiKeyUsageSummary
} from '@cvg-his-v2/shared-types';
import type {
  ApiKeyRateLimitDecision,
  ApiKeyRepository
} from './api-key-repository.interface.js';

function requiredString(row: Record<string, unknown>, field: string): string {
  const value = row[field];
  if (typeof value !== 'string') throw new Error(`Invalid API key row: ${field} must be a string`);
  return value;
}

function requiredNumber(row: Record<string, unknown>, field: string): number {
  const value = row[field];
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Invalid API key row: ${field} must be a finite number`);
  }
  return value;
}

function requiredBoolean(row: Record<string, unknown>, field: string): boolean {
  const value = row[field];
  if (typeof value !== 'boolean') throw new Error(`Invalid API key row: ${field} must be a boolean`);
  return value;
}

function optionalIsoDate(row: Record<string, unknown>, field: string): string | null {
  const value = row[field];
  if (value === null || value === undefined) return null;
  const date = value instanceof Date ? value : new Date(typeof value === 'string' ? value : Number.NaN);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid API key row: ${field} must be a date`);
  return date.toISOString();
}

function requiredIsoDate(row: Record<string, unknown>, field: string): string {
  const value = optionalIsoDate(row, field);
  if (!value) throw new Error(`Invalid API key row: ${field} must be a date`);
  return value;
}

function parsePermissions(value: unknown): readonly string[] {
  let parsed: unknown = value;
  if (typeof value === 'string') {
    try {
      parsed = JSON.parse(value) as unknown;
    } catch {
      throw new Error('Invalid API key row: permissions must be JSON');
    }
  }
  if (!Array.isArray(parsed) || parsed.some((permission) => typeof permission !== 'string')) {
    throw new Error('Invalid API key row: permissions must be an array of strings');
  }
  return Object.freeze([...parsed]);
}

export function mapDatabaseApiKeyRow(row: Record<string, unknown>): ApiKeySummary {
  return {
    id: requiredString(row, 'id') as ApiKeyId,
    accountId: requiredString(row, 'account_id') as AccountId,
    name: requiredString(row, 'name'),
    keyPrefix: requiredString(row, 'key_prefix'),
    keyHash: requiredString(row, 'key_hash'),
    permissions: parsePermissions(row.permissions),
    rateLimit: requiredNumber(row, 'rate_limit'),
    rateLimitWindow: requiredNumber(row, 'rate_limit_window'),
    expiresAt: optionalIsoDate(row, 'expires_at'),
    lastUsedAt: optionalIsoDate(row, 'last_used_at'),
    isActive: requiredBoolean(row, 'is_active'),
    createdBy: requiredString(row, 'created_by'),
    createdAt: requiredIsoDate(row, 'created_at'),
    updatedAt: requiredIsoDate(row, 'updated_at')
  };
}

export function mapDatabaseApiKeyAuthRow(
  row: Record<string, unknown>
): ApiKeyAuthenticationPrincipal {
  return {
    id: requiredString(row, 'id') as ApiKeyId,
    accountId: requiredString(row, 'account_id') as AccountId,
    keyHash: requiredString(row, 'key_hash'),
    permissions: parsePermissions(row.permissions),
    rateLimit: requiredNumber(row, 'rate_limit'),
    rateLimitWindow: requiredNumber(row, 'rate_limit_window'),
    expiresAt: optionalIsoDate(row, 'expires_at'),
    isActive: requiredBoolean(row, 'is_active')
  };
}

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
      return mapDatabaseApiKeyRow(result.rows[0]);
    });
  }

  async findByAccount(accountId: string): Promise<readonly ApiKeySummary[]> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        'SELECT * FROM api_keys WHERE account_id = $1 ORDER BY created_at DESC',
        [accountId]
      );
      return result.rows.map(mapDatabaseApiKeyRow);
    });
  }

  async findByPrefix(keyPrefix: string): Promise<readonly ApiKeySummary[]> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        'SELECT * FROM api_keys WHERE key_prefix = $1 AND is_active = true ORDER BY created_at DESC',
        [keyPrefix]
      );
      return result.rows.map(mapDatabaseApiKeyRow);
    });
  }

  async findActiveByKeyHash(
    keyPrefix: string,
    keyHash: string
  ): Promise<readonly ApiKeyAuthenticationPrincipal[]> {
    const result = await getPool().query(
      'SELECT * FROM app.resolve_active_api_key($1, $2)',
      [keyPrefix, keyHash]
    );
    return result.rows.map(mapDatabaseApiKeyAuthRow);
  }

  async findActiveById(id: ApiKeyId): Promise<ApiKeySummary | null> {
    return withTenantQuery(getPool(), async (client) => {
      const now = new Date();
      const result = await client.query(
        `SELECT * FROM api_keys WHERE id = $1 AND is_active = true AND (expires_at IS NULL OR expires_at > $2)`,
        [id, now]
      );
      if (result.rows.length === 0) return null;
      return mapDatabaseApiKeyRow(result.rows[0]);
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
  async consumeRateLimit(
    apiKeyId: string,
    windowStart: Date,
    rateLimit: number
  ): Promise<ApiKeyRateLimitDecision> {
    return withTenantQuery(getPool(), async (client) => {
      for (let attempt = 0; attempt < 2; attempt += 1) {
        const updated = await client.query<{ readonly request_count: number }>(
          `UPDATE api_key_rate_limits
              SET request_count = request_count + 1
            WHERE api_key_id = $1
              AND window_start = $2
              AND request_count < $3
            RETURNING request_count`,
          [apiKeyId, windowStart, rateLimit]
        );
        if (updated.rows.length > 0) {
          const current = Math.max(0, updated.rows[0].request_count - 1);
          return {
            allowed: true,
            current,
            remaining: Math.max(0, rateLimit - updated.rows[0].request_count)
          };
        }

        const inserted = await client.query<{ readonly request_count: number }>(
          `INSERT INTO api_key_rate_limits (account_id, api_key_id, window_start, request_count)
           SELECT account_id, id, $2, 1
             FROM api_keys
            WHERE id = $1 AND $3 > 0
           ON CONFLICT (api_key_id, window_start) DO NOTHING
           RETURNING request_count`,
          [apiKeyId, windowStart, rateLimit]
        );
        if (inserted.rows.length > 0) {
          return {
            allowed: true,
            current: 0,
            remaining: Math.max(0, rateLimit - inserted.rows[0].request_count)
          };
        }
      }

      const result = await client.query<{ readonly request_count: number }>(
        'SELECT request_count FROM api_key_rate_limits WHERE api_key_id = $1 AND window_start = $2',
        [apiKeyId, windowStart]
      );
      const current = result.rows[0]?.request_count ?? 0;
      return {
        allowed: false,
        current,
        remaining: Math.max(0, rateLimit - current)
      };
    });
  }

  async incrementUsage(apiKeyId: string, windowStart: Date): Promise<void> {
    return withTenantQuery(getPool(), async (client) => {
      await client.query(
        `INSERT INTO api_key_rate_limits (account_id, api_key_id, window_start, request_count)
         SELECT account_id, id, $2, 1 FROM api_keys WHERE id = $1
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
        `INSERT INTO api_key_usage (id, account_id, api_key_id, endpoint, method, status_code, response_time_ms, created_at)
         SELECT $1, account_id, id, $3, $4, $5, $6, $7 FROM api_keys WHERE id = $2`,
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
