import { getPool } from '@cvg-his-v2/shared-database';
import { withTenantQuery } from '@cvg-his-v2/tenant-context';
import type { AccountId } from '@cvg-his-v2/shared-types';
import type {
  FlagDefinition,
  FeatureFlagProvider,
  EvaluationContext,
  FlagDecision,
  FeatureFlagMetricsCollector
} from '@cvg-his-v2/shared-feature-flags';
import { createFlagDecision, computeRolloutBucket } from '@cvg-his-v2/shared-feature-flags';

type FeatureFlagScope = 'global' | 'environment' | 'tenant' | 'account' | 'user';

export interface PartialFlagOverride {
  readonly environment?: string;
  readonly accountIdOverride?: AccountId;
  readonly userId?: string;
  readonly percentage?: number | null;
  readonly allowedUsers?: readonly string[];
  readonly enabled: boolean;
}

/**
 * Database-backed FeatureFlagRepository using raw SQL.
 * Provides canonical persistence for feature flags and overrides.
 */
export interface FeatureFlagRepository {
  findByKey(key: string, accountId: AccountId): Promise<FlagDefinition | null>;
  listByAccount(accountId: AccountId): Promise<readonly FlagDefinition[]>;
  create(flag: FlagDefinition, accountId: AccountId): Promise<void>;
  update(flag: FlagDefinition): Promise<void>;
  upsertOverride(flagKey: string, accountId: AccountId, override: PartialFlagOverride): Promise<void>;
  findOverride(flagKey: string, environment: string, accountId: AccountId): Promise<PartialFlagOverride | null>;
  listOverrides(flagKey: string, accountId: AccountId): Promise<readonly PartialFlagOverride[]>;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string | undefined | null): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

export class DatabaseFeatureFlagRepository implements FeatureFlagRepository {
  public async findByKey(key: string, accountId: AccountId): Promise<FlagDefinition | null> {
    return withTenantQuery(getPool(), async (client) => {
      const resolvedAccountId = await this.resolveAccountId(client, accountId);
      const result = await client.query(
        'SELECT * FROM feature_flags WHERE key = $1 AND account_id = $2 LIMIT 1',
        [key, resolvedAccountId]
      );
      if (result.rows.length === 0) return null;
      return this.mapRowToDefinition(result.rows[0]);
    });
  }

  public async listByAccount(accountId: AccountId): Promise<readonly FlagDefinition[]> {
    return withTenantQuery(getPool(), async (client) => {
      const resolvedAccountId = await this.resolveAccountId(client, accountId);
      const result = await client.query(
        'SELECT * FROM feature_flags WHERE account_id = $1 ORDER BY created_at DESC',
        [resolvedAccountId]
      );
      return result.rows.map((row) => this.mapRowToDefinition(row));
    });
  }

  public async create(flag: FlagDefinition, accountId: AccountId): Promise<void> {
    return withTenantQuery(getPool(), async (client) => {
      const resolvedAccountId = await this.resolveAccountId(client, accountId);
      await client.query(
        `INSERT INTO feature_flags (account_id, key, owner, description, default_value, enabled, scopes, expires_at, audit_required, tags, metadata, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5::jsonb, 'true'::jsonb, $6::jsonb, $7, $8::jsonb, $9::jsonb, $10::jsonb, NOW(), NOW())`,
        [
          resolvedAccountId,
          flag.key,
          flag.owner,
          flag.description,
          JSON.stringify(Boolean(flag.defaultValue)),
          JSON.stringify([...flag.scopes]),
          flag.expiresAt ? new Date(flag.expiresAt) : null,
          JSON.stringify(Boolean(flag.auditRequired ?? false)),
          JSON.stringify(flag.tags ?? []),
          flag.metadata ? JSON.stringify(flag.metadata) : null
        ]
      );
    });
  }

  public async update(flag: FlagDefinition): Promise<void> {
    return withTenantQuery(getPool(), async (client) => {
      await client.query(
        `UPDATE feature_flags
         SET owner = $2,
             description = $3,
             default_value = $4::jsonb,
             scopes = $5::jsonb,
             expires_at = $6,
             audit_required = $7::jsonb,
             tags = $8::jsonb,
             metadata = $9::jsonb,
             updated_at = NOW()
         WHERE key = $1`,
        [
          flag.key,
          flag.owner,
          flag.description,
          JSON.stringify(Boolean(flag.defaultValue)),
          JSON.stringify([...flag.scopes]),
          flag.expiresAt ? new Date(flag.expiresAt) : null,
          JSON.stringify(Boolean(flag.auditRequired ?? false)),
          JSON.stringify(flag.tags ?? []),
          flag.metadata ? JSON.stringify(flag.metadata) : null
        ]
      );
    });
  }

  public async upsertOverride(
    flagKey: string,
    accountId: AccountId,
    override: PartialFlagOverride
  ): Promise<void> {
    return withTenantQuery(getPool(), async (client) => {
      const resolvedAccountId = await this.resolveAccountId(client, accountId);

      // Get flag_id first
      const flagResult = await client.query(
        'SELECT id FROM feature_flags WHERE key = $1 AND account_id = $2 LIMIT 1',
        [flagKey, resolvedAccountId]
      );
      if (flagResult.rows.length === 0) return;

      const flagId = flagResult.rows[0].id;
      const normalizedOverrideAccountId =
        override.accountIdOverride && isUuid(String(override.accountIdOverride))
          ? override.accountIdOverride
          : null;
      const normalizedUserId = isUuid(override.userId) ? override.userId : null;
      const serializedPercentage =
        override.percentage === null || override.percentage === undefined
          ? null
          : JSON.stringify(override.percentage);
      const serializedAllowedUsers = JSON.stringify([
        ...(override.allowedUsers ?? []),
        ...(override.userId && !normalizedUserId ? [override.userId] : [])
      ]);

      const updated = await client.query(
        `UPDATE feature_flag_overrides
         SET user_id = $4,
             percentage = $5::jsonb,
             allowed_users = $6::jsonb,
             enabled = $7::jsonb,
             updated_at = NOW()
         WHERE flag_id = $1
           AND ((environment = $2) OR (environment IS NULL AND $2 IS NULL))
           AND ((account_id_override = $3) OR (account_id_override IS NULL AND $3 IS NULL))
         RETURNING id`,
        [
          flagId,
          override.environment ?? null,
          normalizedOverrideAccountId,
          normalizedUserId,
          serializedPercentage,
          serializedAllowedUsers,
          JSON.stringify(Boolean(override.enabled))
        ]
      );

      if (updated.rows.length > 0) {
        return;
      }

      await client.query(
        `INSERT INTO feature_flag_overrides (account_id, flag_id, environment, account_id_override, user_id, percentage, allowed_users, enabled, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8::jsonb, NOW(), NOW())`,
        [
          resolvedAccountId,
          flagId,
          override.environment ?? null,
          normalizedOverrideAccountId,
          normalizedUserId,
          serializedPercentage,
          serializedAllowedUsers,
          JSON.stringify(Boolean(override.enabled))
        ]
      );
    });
  }

  public async findOverride(
    flagKey: string,
    environment: string,
    accountId: AccountId
  ): Promise<PartialFlagOverride | null> {
    return withTenantQuery(getPool(), async (client) => {
      const resolvedAccountId = await this.resolveAccountId(client, accountId);
      const result = await client.query(
        `SELECT o.* FROM feature_flag_overrides o
         JOIN feature_flags f ON f.id = o.flag_id
         WHERE f.key = $1 AND f.account_id = $2 AND o.environment = $3 AND o.account_id_override = $4
         LIMIT 1`,
        [flagKey, resolvedAccountId, environment, resolvedAccountId]
      );
      if (result.rows.length === 0) return null;
      return this.mapRowToOverride(result.rows[0]);
    });
  }

  public async listOverrides(flagKey: string, accountId: AccountId): Promise<readonly PartialFlagOverride[]> {
    return withTenantQuery(getPool(), async (client) => {
      const resolvedAccountId = await this.resolveAccountId(client, accountId);
      const result = await client.query(
        `SELECT o.* FROM feature_flag_overrides o
         JOIN feature_flags f ON f.id = o.flag_id
         WHERE f.key = $1 AND f.account_id = $2`,
        [flagKey, resolvedAccountId]
      );
      return result.rows.map((row) => this.mapRowToOverride(row));
    });
  }

  private async resolveAccountId(
    client: { query: (queryText: string, params?: readonly unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }> },
    accountId: AccountId
  ): Promise<string> {
    if (isUuid(String(accountId))) {
      return String(accountId);
    }

    const result = await client.query(
      `SELECT id
       FROM accounts
       WHERE slug = 'default'
       ORDER BY created_at ASC NULLS LAST, id ASC
       LIMIT 1`
    );

    const resolved = result.rows[0]?.id;
    if (typeof resolved !== 'string' || resolved.length === 0) {
      throw new Error(`Unable to resolve database account id for legacy account "${String(accountId)}"`);
    }

    return resolved;
  }

  private mapRowToDefinition(row: Record<string, unknown>): FlagDefinition {
    return {
      key: row.key as string,
      owner: row.owner as string,
      description: row.description as string,
      defaultValue: row.default_value as boolean,
      scopes: row.scopes as unknown as readonly FeatureFlagScope[],
      expiresAt: row.expires_at ? new Date(row.expires_at as string).toISOString() : undefined,
      auditRequired: row.audit_required as boolean,
      tags: (row.tags as string[]) ?? [],
      metadata: (row.metadata as Record<string, string | number | boolean>) ?? undefined
    };
  }

  private mapRowToOverride(row: Record<string, unknown>): PartialFlagOverride {
    return {
      environment: row.environment as string | undefined,
      accountIdOverride: row.account_id_override as AccountId | undefined,
      userId: row.user_id ? (row.user_id as string) : undefined,
      percentage: row.percentage as number | null,
      allowedUsers: (row.allowed_users as string[]) ?? [],
      enabled: row.enabled as boolean
    };
  }
}

/**
 * Creates a database-backed FeatureFlagProvider that reads from the DB
 * and falls back to an upstream provider on errors.
 */
export function createDatabaseFeatureFlagProvider(
  fallbackProvider: FeatureFlagProvider,
  options: {
    readonly cacheTtlMs?: number;
    readonly onFallback?: (key: string, reason: string) => void;
    /** GAP-06: metrics collector for Prometheus instrumentation */
    readonly metrics?: FeatureFlagMetricsCollector;
  } = {}
): FeatureFlagProvider {
  const cache = new Map<string, { decision: FlagDecision; expiresAt: number }>();
  const cacheTtlMs = options.cacheTtlMs ?? 60_000;
  const onFallback = options.onFallback ?? (() => {});
  const metrics = options.metrics;

  return {
    name: 'database-repository',

    async evaluate(definition: FlagDefinition, context: EvaluationContext): Promise<FlagDecision> {
      const now = context.now ?? new Date();
      const nowMs = now.getTime();
      const cacheKey = buildCacheKey(definition.key, context);

      // Check cache (synchronous)
      const cached = cache.get(cacheKey);
      if (cached && cached.expiresAt > nowMs) {
        metrics?.recordEvaluation({
          flagKey: definition.key,
          provider: 'database-repository',
          reason: 'cache_hit',
          enabled: cached.decision.enabled
        });
        return cached.decision;
      }

      // GAP-06: pass metrics to async evaluation
      return evaluateFromDbWithRepo(definition, context, cache, cacheKey, nowMs, cacheTtlMs, onFallback, fallbackProvider, metrics);
    }
  };
}

function buildCacheKey(flagKey: string, context: EvaluationContext): string {
  return `${flagKey}:${context.environment ?? ''}:${context.accountId ?? ''}:${context.userId ?? ''}`;
}

async function evaluateFromDbWithRepo(
  definition: FlagDefinition,
  context: EvaluationContext,
  cache: Map<string, { decision: FlagDecision; expiresAt: number }>,
  cacheKey: string,
  nowMs: number,
  cacheTtlMs: number,
  onFallback: (key: string, reason: string) => void,
  fallbackProvider: FeatureFlagProvider,
  metrics?: FeatureFlagMetricsCollector
): Promise<FlagDecision> {
  const startTime = Date.now();
  const accountId = context.accountId;
  const environment = context.environment ?? 'development';
  const userId = context.userId;
  const recordMetrics = (reason: string, enabled: boolean): void => {
    metrics?.recordEvaluation({
      flagKey: definition.key,
      provider: 'database-repository',
      reason,
      enabled,
      durationMs: Date.now() - startTime
    });
  };

  if (!accountId) {
    const decision = createFlagDecision(definition, context, {
      provider: 'database-repository',
      reason: 'default'
    });
    recordMetrics('default', decision.enabled);
    cache.set(cacheKey, { decision, expiresAt: nowMs + cacheTtlMs });
    return decision;
  }

  const repo = new DatabaseFeatureFlagRepository();

  let decision: FlagDecision;
  try {
    const flagDef = await repo.findByKey(definition.key, accountId as AccountId);

    if (!flagDef) {
      onFallback(definition.key, 'not_found_in_db');
      metrics?.recordFallback({
        flagKey: definition.key,
        provider: 'database-repository',
        fallbackReason: 'not_found_in_db'
      });
      decision = createFlagDecision(definition, context, {
        enabled: definition.defaultValue,
        provider: 'database-repository',
        reason: 'default'
      });
      recordMetrics('not_found_in_db', decision.enabled);
      cache.set(cacheKey, { decision, expiresAt: nowMs + cacheTtlMs });
      return decision;
    }

    const override = await repo.findOverride(definition.key, environment, accountId as AccountId);

    if (!override) {
      decision = createFlagDecision(definition, context, {
        enabled: Boolean(flagDef.defaultValue),
        provider: 'database-repository',
        reason: 'default'
      });
      recordMetrics('default', decision.enabled);
      cache.set(cacheKey, { decision, expiresAt: nowMs + cacheTtlMs });
      return decision;
    }

    if (!override.enabled) {
      decision = createFlagDecision(definition, context, {
        enabled: false,
        provider: 'database-repository',
        reason: 'kill_switch',
        metadata: { level: 'override' }
      });
      recordMetrics('kill_switch', false);
      cache.set(cacheKey, { decision, expiresAt: nowMs + cacheTtlMs });
      return decision;
    }

    if (override.allowedUsers && override.allowedUsers.length > 0 && userId) {
      if (override.allowedUsers.includes(userId)) {
        decision = createFlagDecision(definition, context, {
          enabled: true,
          provider: 'database-repository',
          reason: 'allowlist'
        });
        recordMetrics('allowlist', true);
        cache.set(cacheKey, { decision, expiresAt: nowMs + cacheTtlMs });
        return decision;
      } else {
        decision = createFlagDecision(definition, context, {
          enabled: false,
          provider: 'database-repository',
          reason: 'allowlist_excluded'
        });
        recordMetrics('allowlist_excluded', false);
        cache.set(cacheKey, { decision, expiresAt: nowMs + cacheTtlMs });
        return decision;
      }
    }

    if (override.percentage !== null && override.percentage !== undefined && accountId) {
      const bucket = computeRolloutBucket(definition.key, accountId);
      const enabled = bucket <= override.percentage;
      decision = createFlagDecision(definition, context, {
        enabled,
        provider: 'database-repository',
        reason: 'percentage_rollout',
        metadata: { percentageRollout: override.percentage, rolloutBucket: bucket }
      });
      recordMetrics('percentage_rollout', enabled);
      cache.set(cacheKey, { decision, expiresAt: nowMs + cacheTtlMs });
      return decision;
    }

    decision = createFlagDecision(definition, context, {
      enabled: true,
      provider: 'database-repository',
      reason: 'override'
    });
    recordMetrics('override', true);
    cache.set(cacheKey, { decision, expiresAt: nowMs + cacheTtlMs });
    return decision;
  } catch (err) {
    metrics?.recordError({
      flagKey: definition.key,
      provider: 'database-repository',
      errorType: err instanceof Error ? err.constructor.name : 'UnknownError'
    });
    onFallback(definition.key, 'database_error');
    decision = await fallbackProvider.evaluate(definition, context);
    recordMetrics('database_error_fallback', decision.enabled);
    return decision;
  }
}
