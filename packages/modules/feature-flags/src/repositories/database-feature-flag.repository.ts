import { getPool } from '@cvg-his-v2/shared-database';
import { withTenantQueryExplicit } from '@cvg-his-v2/tenant-context';
import type { Pool } from 'pg';
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
  update(flag: FlagDefinition, accountId: AccountId): Promise<void>;
  upsertOverride(
    flagKey: string,
    accountId: AccountId,
    override: PartialFlagOverride
  ): Promise<void>;
  findOverride(
    flagKey: string,
    environment: string,
    accountId: AccountId
  ): Promise<PartialFlagOverride | null>;
  listOverrides(flagKey: string, accountId: AccountId): Promise<readonly PartialFlagOverride[]>;
}

/**
 * Minimal repository boundary required to evaluate a flag. Keeping evaluation
 * injectable makes the decision policy testable without weakening the
 * production repository's tenant and database boundaries.
 */
export type FeatureFlagEvaluationRepository = Pick<
  FeatureFlagRepository,
  'findByKey' | 'listOverrides'
>;

export interface DatabaseFeatureFlagProviderOptions {
  readonly cacheTtlMs?: number;
  /** Maximum number of decisions retained by this process. Zero disables caching. */
  readonly maxCacheEntries?: number;
  readonly onFallback?: (key: string, reason: string) => void;
  readonly metrics?: FeatureFlagMetricsCollector;
  readonly repository?: FeatureFlagEvaluationRepository;
  /** Explicit pool used by the API bootstrap; avoids an implicit global lookup. */
  readonly pool?: Pool;
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: string | undefined | null): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

function assertDatabaseAccountId(accountId: AccountId): void {
  if (!isUuid(String(accountId))) {
    throw new Error('Feature flag database operations require a UUID accountId');
  }
}

export class DatabaseFeatureFlagRepository implements FeatureFlagRepository {
  readonly #pool?: Pool;

  public constructor(pool?: Pool) {
    this.#pool = pool;
  }

  private databasePool(): Pool {
    return this.#pool ?? getPool();
  }

  public async findByKey(key: string, accountId: AccountId): Promise<FlagDefinition | null> {
    assertDatabaseAccountId(accountId);
    return withTenantQueryExplicit(this.databasePool(), String(accountId), async (client) => {
      const result = await client.query(
        'SELECT * FROM feature_flags WHERE key = $1 AND account_id = $2 LIMIT 1',
        [key, accountId]
      );
      if (result.rows.length === 0) return null;
      return this.mapRowToDefinition(result.rows[0]);
    });
  }

  public async listByAccount(accountId: AccountId): Promise<readonly FlagDefinition[]> {
    assertDatabaseAccountId(accountId);
    return withTenantQueryExplicit(this.databasePool(), String(accountId), async (client) => {
      const result = await client.query(
        'SELECT * FROM feature_flags WHERE account_id = $1 ORDER BY created_at DESC',
        [accountId]
      );
      return result.rows.map((row) => this.mapRowToDefinition(row));
    });
  }

  public async create(flag: FlagDefinition, accountId: AccountId): Promise<void> {
    assertDatabaseAccountId(accountId);
    return withTenantQueryExplicit(this.databasePool(), String(accountId), async (client) => {
      await client.query(
        `INSERT INTO feature_flags (account_id, key, owner, description, default_value, enabled, scopes, expires_at, audit_required, tags, metadata, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7::jsonb, $8, $9::jsonb, $10::jsonb, $11::jsonb, NOW(), NOW())`,
        [
          accountId,
          flag.key,
          flag.owner,
          flag.description,
          JSON.stringify(Boolean(flag.defaultValue)),
          JSON.stringify(flag.enabled ?? true),
          JSON.stringify([...flag.scopes]),
          flag.expiresAt ? new Date(flag.expiresAt) : null,
          JSON.stringify(Boolean(flag.auditRequired ?? false)),
          JSON.stringify(flag.tags ?? []),
          flag.metadata ? JSON.stringify(flag.metadata) : null
        ]
      );
    });
  }

  public async update(flag: FlagDefinition, accountId: AccountId): Promise<void> {
    assertDatabaseAccountId(accountId);
    return withTenantQueryExplicit(this.databasePool(), String(accountId), async (client) => {
      await client.query(
        `UPDATE feature_flags
         SET owner = $2,
             description = $3,
             default_value = $4::jsonb,
             enabled = $5::jsonb,
             scopes = $6::jsonb,
             expires_at = $7,
             audit_required = $8::jsonb,
             tags = $9::jsonb,
             metadata = $10::jsonb,
             updated_at = NOW()
         WHERE key = $1 AND account_id = $11`,
        [
          flag.key,
          flag.owner,
          flag.description,
          JSON.stringify(Boolean(flag.defaultValue)),
          JSON.stringify(flag.enabled ?? true),
          JSON.stringify([...flag.scopes]),
          flag.expiresAt ? new Date(flag.expiresAt) : null,
          JSON.stringify(Boolean(flag.auditRequired ?? false)),
          JSON.stringify(flag.tags ?? []),
          flag.metadata ? JSON.stringify(flag.metadata) : null,
          accountId
        ]
      );
    });
  }

  public async upsertOverride(
    flagKey: string,
    accountId: AccountId,
    override: PartialFlagOverride
  ): Promise<void> {
    assertDatabaseAccountId(accountId);
    return withTenantQueryExplicit(this.databasePool(), String(accountId), async (client) => {
      // Get flag_id first
      const flagResult = await client.query(
        'SELECT id FROM feature_flags WHERE key = $1 AND account_id = $2 LIMIT 1',
        [flagKey, accountId]
      );
      if (flagResult.rows.length === 0) return;

      const flagId = flagResult.rows[0].id;
      if (
        override.environment !== undefined &&
        (typeof override.environment !== 'string' || override.environment.trim().length === 0)
      ) {
        throw new Error('Feature flag override environment must be a non-empty string');
      }
      if (override.accountIdOverride && !isUuid(String(override.accountIdOverride))) {
        throw new Error('Feature flag override accountIdOverride must be a UUID');
      }
      if (override.userId !== undefined && !isUuid(override.userId)) {
        throw new Error('Feature flag override userId must be a UUID');
      }
      if (
        override.allowedUsers !== undefined &&
        (!Array.isArray(override.allowedUsers) ||
          override.allowedUsers.some((userId) => typeof userId !== 'string' || !isUuid(userId)))
      ) {
        throw new Error('Feature flag override allowedUsers must be an array of UUIDs');
      }
      if (typeof override.enabled !== 'boolean') {
        throw new Error('Feature flag override enabled must be a boolean');
      }
      if (
        override.percentage !== null &&
        override.percentage !== undefined &&
        (!Number.isFinite(override.percentage) ||
          override.percentage < 0 ||
          override.percentage > 100)
      ) {
        throw new Error('Feature flag override percentage must be between 0 and 100');
      }
      const normalizedOverrideAccountId =
        override.accountIdOverride && isUuid(String(override.accountIdOverride))
          ? override.accountIdOverride
          : null;
      const normalizedUserId = override.userId ?? null;
      const serializedPercentage =
        override.percentage === null || override.percentage === undefined
          ? null
          : JSON.stringify(override.percentage);
      const serializedAllowedUsers = JSON.stringify([...new Set(override.allowedUsers ?? [])]);
      await client.query(
        `INSERT INTO feature_flag_overrides (account_id, flag_id, environment, account_id_override, user_id, percentage, allowed_users, enabled, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, $8::jsonb, NOW(), NOW())
         ON CONFLICT (flag_id, environment, account_id_override, user_id)
         DO UPDATE SET
           percentage = EXCLUDED.percentage,
           allowed_users = EXCLUDED.allowed_users,
           enabled = EXCLUDED.enabled,
           updated_at = NOW()`,
        [
          accountId,
          flagId,
          override.environment ?? null,
          normalizedOverrideAccountId,
          normalizedUserId,
          serializedPercentage,
          serializedAllowedUsers,
          JSON.stringify(override.enabled)
        ]
      );
    });
  }

  public async findOverride(
    flagKey: string,
    environment: string,
    accountId: AccountId
  ): Promise<PartialFlagOverride | null> {
    assertDatabaseAccountId(accountId);
    return withTenantQueryExplicit(this.databasePool(), String(accountId), async (client) => {
      const result = await client.query(
        `SELECT o.* FROM feature_flag_overrides o
         JOIN feature_flags f ON f.id = o.flag_id
         WHERE f.key = $1 AND f.account_id = $2 AND o.account_id = $2
           AND o.environment = $3 AND o.account_id_override = $4
         LIMIT 1`,
        [flagKey, accountId, environment, accountId]
      );
      if (result.rows.length === 0) return null;
      return this.mapRowToOverride(result.rows[0]);
    });
  }

  public async listOverrides(
    flagKey: string,
    accountId: AccountId
  ): Promise<readonly PartialFlagOverride[]> {
    assertDatabaseAccountId(accountId);
    return withTenantQueryExplicit(this.databasePool(), String(accountId), async (client) => {
      const result = await client.query(
        `SELECT o.* FROM feature_flag_overrides o
         JOIN feature_flags f ON f.id = o.flag_id
         WHERE f.key = $1 AND f.account_id = $2 AND o.account_id = $2
         ORDER BY o.updated_at DESC, o.id ASC`,
        [flagKey, accountId]
      );
      return result.rows.map((row) => this.mapRowToOverride(row));
    });
  }

  private mapRowToDefinition(row: Record<string, unknown>): FlagDefinition {
    const key = readString(row.key, 'key');
    const owner = readString(row.owner, 'owner');
    const description = readString(row.description, 'description');
    const defaultValue = readBoolean(row.default_value, 'default_value');
    const auditRequired = readBoolean(row.audit_required, 'audit_required');
    const enabled =
      row.enabled === undefined || row.enabled === null
        ? undefined
        : readBoolean(row.enabled, 'enabled');
    const scopes = readStringArray(row.scopes, 'scopes');
    const tags = readStringArray(row.tags, 'tags');
    const expiresAt = readDate(row.expires_at, 'expires_at');
    const metadata = readMetadata(row.metadata);
    return {
      key,
      owner,
      description,
      defaultValue,
      enabled,
      scopes: scopes as readonly FeatureFlagScope[],
      expiresAt,
      auditRequired,
      tags,
      metadata
    };
  }

  private mapRowToOverride(row: Record<string, unknown>): PartialFlagOverride {
    const percentage = row.percentage;
    if (
      percentage !== undefined &&
      percentage !== null &&
      (typeof percentage !== 'number' || !Number.isFinite(percentage))
    ) {
      throw new Error('Invalid feature flag override percentage in database');
    }
    const allowedUsers = readStringArray(row.allowed_users, 'allowed_users', true);
    if (allowedUsers.some((userId) => !isUuid(userId))) {
      throw new Error('Invalid feature flag override allowed_users in database: expected UUIDs');
    }
    const environment =
      row.environment === null || row.environment === undefined
        ? undefined
        : readString(row.environment, 'override.environment');
    if (environment !== undefined && environment.trim().length === 0) {
      throw new Error('Invalid feature flag override environment in database');
    }
    const accountIdOverride =
      row.account_id_override === null || row.account_id_override === undefined
        ? undefined
        : readString(row.account_id_override, 'override.account_id_override');
    if (accountIdOverride && !isUuid(accountIdOverride)) {
      throw new Error('Invalid feature flag override account_id_override in database');
    }
    const userId =
      row.user_id === null || row.user_id === undefined
        ? undefined
        : readString(row.user_id, 'override.user_id');
    if (userId && !isUuid(userId)) {
      throw new Error('Invalid feature flag override user_id in database');
    }
    return {
      environment,
      accountIdOverride: accountIdOverride as AccountId | undefined,
      userId,
      percentage: percentage as number | null | undefined,
      allowedUsers,
      enabled: readBoolean(row.enabled, 'override.enabled')
    };
  }
}

function readBoolean(value: unknown, field: string): boolean {
  if (typeof value !== 'boolean') {
    throw new Error(`Invalid feature flag ${field} in database`);
  }
  return value;
}

function readString(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throw new Error(`Invalid feature flag ${field} in database`);
  }
  return value;
}

function readStringArray(value: unknown, field: string, nullable = false): readonly string[] {
  if (value === null || value === undefined) {
    if (nullable) return [];
    throw new Error(`Invalid feature flag ${field} in database`);
  }
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new Error(`Invalid feature flag ${field} in database`);
  }
  return value;
}

function readDate(value: unknown, field: string): string | undefined {
  if (value === null || value === undefined) return undefined;
  if (!(value instanceof Date) && typeof value !== 'string') {
    throw new Error(`Invalid feature flag ${field} in database`);
  }
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) {
    throw new Error(`Invalid feature flag ${field} in database`);
  }
  return date.toISOString();
}

function readMetadata(
  value: unknown
): Readonly<Record<string, string | number | boolean>> | undefined {
  if (value === null || value === undefined) return undefined;
  if (typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Invalid feature flag metadata in database');
  }
  for (const [key, entry] of Object.entries(value)) {
    if (
      key.length === 0 ||
      (typeof entry !== 'string' && typeof entry !== 'boolean' && typeof entry !== 'number') ||
      (typeof entry === 'number' && !Number.isFinite(entry))
    ) {
      throw new Error('Invalid feature flag metadata in database');
    }
  }
  return value as Readonly<Record<string, string | number | boolean>>;
}

interface CachedFlagDecision {
  readonly flagKey: string;
  readonly decision: FlagDecision;
  readonly expiresAt: number;
}

/**
 * Creates a database-backed FeatureFlagProvider that reads from the DB.
 * Missing account/flag configuration may use the bootstrap provider, while a
 * database failure fails closed so an unknown persisted kill switch cannot
 * accidentally enable a protected path.
 */
export function createDatabaseFeatureFlagProvider(
  fallbackProvider: FeatureFlagProvider,
  options: DatabaseFeatureFlagProviderOptions = {}
): FeatureFlagProvider {
  const cache = new Map<string, CachedFlagDecision>();
  let cacheGeneration = 0;
  const cacheTtlMs = options.cacheTtlMs ?? 60_000;
  if (!Number.isFinite(cacheTtlMs) || cacheTtlMs < 0) {
    throw new RangeError('cacheTtlMs must be finite and nonnegative');
  }
  const maxCacheEntries = options.maxCacheEntries ?? 1_024;
  if (!Number.isSafeInteger(maxCacheEntries) || maxCacheEntries < 0) {
    throw new RangeError('maxCacheEntries must be a nonnegative safe integer');
  }
  const onFallback = options.onFallback ?? (() => {});
  const metrics = options.metrics;
  const repository = options.repository ?? new DatabaseFeatureFlagRepository(options.pool);

  return {
    name: 'database-repository',
    invalidateCache(key?: string): void {
      cacheGeneration += 1;
      if (key === undefined) {
        cache.clear();
        return;
      }
      for (const [cacheKey, entry] of cache) {
        if (entry.flagKey === key) cache.delete(cacheKey);
      }
    },

    async evaluate(definition: FlagDefinition, context: EvaluationContext): Promise<FlagDecision> {
      const now = context.now ?? new Date();
      const nowMs = now.getTime();
      const cacheKey = buildCacheKey(definition, context);

      const cached = cache.get(cacheKey);
      if (cached && cached.expiresAt > nowMs) {
        // Refresh insertion order so the bounded cache behaves as LRU.
        cache.delete(cacheKey);
        cache.set(cacheKey, cached);
        metrics?.recordEvaluation({
          flagKey: definition.key,
          provider: 'database-repository',
          reason: 'cache_hit',
          enabled: cached.decision.enabled
        });
        return {
          ...structuredClone(cached.decision),
          context
        };
      }
      if (cached) cache.delete(cacheKey);
      const evaluationGeneration = cacheGeneration;

      return evaluateFromDbWithRepo(
        definition,
        context,
        cache,
        cacheKey,
        nowMs,
        cacheTtlMs,
        onFallback,
        fallbackProvider,
        repository,
        metrics,
        maxCacheEntries,
        () => evaluationGeneration === cacheGeneration
      );
    }
  };
}

function buildCacheKey(definition: FlagDefinition, context: EvaluationContext): string {
  return JSON.stringify([
    definition,
    context.environment,
    context.tenantId,
    context.accountId,
    context.userId,
    context.attributes
  ]);
}

async function evaluateFromDbWithRepo(
  definition: FlagDefinition,
  context: EvaluationContext,
  cache: Map<string, CachedFlagDecision>,
  cacheKey: string,
  nowMs: number,
  cacheTtlMs: number,
  onFallback: (key: string, reason: string) => void,
  fallbackProvider: FeatureFlagProvider,
  repository: FeatureFlagEvaluationRepository,
  metrics?: FeatureFlagMetricsCollector,
  maxCacheEntries = 1_024,
  canPopulateCache: () => boolean = () => true
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
  let cacheExpiryMs = Number.POSITIVE_INFINITY;
  const cacheDecision = (decision: FlagDecision): FlagDecision => {
    if (cacheTtlMs <= 0 || maxCacheEntries <= 0 || !canPopulateCache()) return decision;
    cache.delete(cacheKey);
    while (cache.size >= maxCacheEntries) {
      const oldest = cache.keys().next().value;
      if (oldest === undefined) break;
      cache.delete(oldest);
    }
    cache.set(cacheKey, {
      flagKey: definition.key,
      decision: structuredClone(decision),
      expiresAt: Math.min(nowMs + cacheTtlMs, cacheExpiryMs)
    });
    return decision;
  };

  const definitionExpiryMs = definition.expiresAt
    ? Date.parse(definition.expiresAt)
    : Number.POSITIVE_INFINITY;
  if (definition.expiresAt && !Number.isFinite(definitionExpiryMs)) {
    const invalidDecision = createFlagDecision(definition, context, {
      enabled: false,
      provider: 'database-repository',
      reason: 'invalid_configuration',
      metadata: { field: 'expiresAt' }
    });
    metrics?.recordError({
      flagKey: definition.key,
      provider: 'database-repository',
      errorType: 'InvalidFlagExpiry'
    });
    recordMetrics('invalid_configuration', false);
    return cacheDecision(invalidDecision);
  }
  cacheExpiryMs = definitionExpiryMs;
  if (definitionExpiryMs <= nowMs) {
    const expiredDecision = createFlagDecision(definition, context, {
      enabled: false,
      provider: 'database-repository',
      reason: 'expired',
      metadata: { expiresAt: definition.expiresAt }
    });
    recordMetrics('expired', false);
    return cacheDecision(expiredDecision);
  }

  if (!accountId) {
    onFallback(definition.key, 'missing_account');
    metrics?.recordFallback({
      flagKey: definition.key,
      provider: 'database-repository',
      fallbackReason: 'missing_account'
    });
    const decision = await fallbackProvider.evaluate(definition, context);
    recordMetrics(decision.reason, decision.enabled);
    return decision;
  }

  let decision: FlagDecision;
  try {
    const flagDef = await repository.findByKey(definition.key, accountId as AccountId);

    if (!flagDef) {
      onFallback(definition.key, 'not_found_in_db');
      metrics?.recordFallback({
        flagKey: definition.key,
        provider: 'database-repository',
        fallbackReason: 'not_found_in_db'
      });
      decision = await fallbackProvider.evaluate(definition, context);
      recordMetrics(decision.reason, decision.enabled);
      return decision;
    }

    const expiryMs = flagDef.expiresAt ? Date.parse(flagDef.expiresAt) : Number.POSITIVE_INFINITY;
    if (flagDef.expiresAt && !Number.isFinite(expiryMs)) {
      const invalidDecision = createFlagDecision(definition, context, {
        enabled: false,
        provider: 'database-repository',
        reason: 'invalid_configuration',
        metadata: { field: 'expiresAt' }
      });
      metrics?.recordError({
        flagKey: definition.key,
        provider: 'database-repository',
        errorType: 'InvalidFlagExpiry'
      });
      recordMetrics('invalid_configuration', false);
      return cacheDecision(invalidDecision);
    }
    cacheExpiryMs = Math.min(cacheExpiryMs, expiryMs);

    if (flagDef.enabled === false) {
      decision = createFlagDecision(definition, context, {
        enabled: false,
        provider: 'database-repository',
        reason: 'kill_switch',
        metadata: { level: 'flag' }
      });
      recordMetrics('kill_switch', false);
      return cacheDecision(decision);
    }

    if (expiryMs <= nowMs) {
      decision = createFlagDecision(definition, context, {
        enabled: false,
        provider: 'database-repository',
        reason: 'expired',
        metadata: { expiresAt: flagDef.expiresAt }
      });
      recordMetrics('expired', false);
      return cacheDecision(decision);
    }

    const overrides = await repository.listOverrides(definition.key, accountId as AccountId);
    const override = selectApplicableOverride(overrides, {
      environment,
      accountId,
      userId
    });

    if (!override) {
      decision = createFlagDecision(definition, context, {
        enabled: Boolean(flagDef.defaultValue),
        provider: 'database-repository',
        reason: 'default'
      });
      recordMetrics('default', decision.enabled);
      return cacheDecision(decision);
    }

    if (!override.enabled) {
      decision = createFlagDecision(definition, context, {
        enabled: false,
        provider: 'database-repository',
        reason: 'kill_switch',
        metadata: { level: 'override' }
      });
      recordMetrics('kill_switch', false);
      return cacheDecision(decision);
    }

    if (override.allowedUsers && override.allowedUsers.length > 0) {
      if (userId && override.allowedUsers.includes(userId)) {
        decision = createFlagDecision(definition, context, {
          enabled: true,
          provider: 'database-repository',
          reason: 'allowlist'
        });
        recordMetrics('allowlist', true);
        return cacheDecision(decision);
      } else {
        decision = createFlagDecision(definition, context, {
          enabled: false,
          provider: 'database-repository',
          reason: 'allowlist_excluded'
        });
        recordMetrics('allowlist_excluded', false);
        return cacheDecision(decision);
      }
    }

    if (override.percentage !== null && override.percentage !== undefined && accountId) {
      if (
        !Number.isFinite(override.percentage) ||
        override.percentage < 0 ||
        override.percentage > 100
      ) {
        const invalidDecision = createFlagDecision(definition, context, {
          enabled: false,
          provider: 'database-repository',
          reason: 'invalid_configuration',
          metadata: { field: 'percentage' }
        });
        metrics?.recordError({
          flagKey: definition.key,
          provider: 'database-repository',
          errorType: 'InvalidFlagPercentage'
        });
        recordMetrics('invalid_configuration', false);
        return cacheDecision(invalidDecision);
      }
      const bucket = computeRolloutBucket(definition.key, accountId);
      const enabled = bucket <= override.percentage;
      decision = createFlagDecision(definition, context, {
        enabled,
        provider: 'database-repository',
        reason: 'percentage_rollout',
        metadata: { percentageRollout: override.percentage, rolloutBucket: bucket }
      });
      recordMetrics('percentage_rollout', enabled);
      return cacheDecision(decision);
    }

    decision = createFlagDecision(definition, context, {
      enabled: true,
      provider: 'database-repository',
      reason: 'override'
    });
    recordMetrics('override', true);
    return cacheDecision(decision);
  } catch (err) {
    metrics?.recordError({
      flagKey: definition.key,
      provider: 'database-repository',
      errorType: err instanceof Error ? err.constructor.name : 'UnknownError'
    });
    onFallback(definition.key, 'database_error_fail_closed');
    metrics?.recordFallback({
      flagKey: definition.key,
      provider: 'database-repository',
      fallbackReason: 'database_error_fail_closed'
    });
    decision = createFlagDecision(definition, context, {
      enabled: false,
      provider: 'database-repository',
      reason: 'database_error',
      metadata: { failureMode: 'fail_closed' }
    });
    recordMetrics('database_error', false);
    return decision;
  }
}

export function selectApplicableOverride(
  overrides: readonly PartialFlagOverride[],
  context: {
    readonly environment: string;
    readonly accountId?: string;
    readonly userId?: string;
  }
): PartialFlagOverride | null {
  let selected: { override: PartialFlagOverride; specificity: number } | null = null;

  for (const override of overrides) {
    if (override.environment && override.environment !== context.environment) continue;
    if (override.accountIdOverride && override.accountIdOverride !== context.accountId) continue;
    if (override.userId && override.userId !== context.userId) continue;

    const specificity =
      (override.userId ? 4 : 0) +
      (override.accountIdOverride ? 2 : 0) +
      (override.environment ? 1 : 0);
    if (!selected || specificity > selected.specificity) {
      selected = { override, specificity };
    }
  }

  return selected ? selected.override : null;
}
