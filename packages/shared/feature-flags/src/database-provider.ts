import { eq, and, type SQL } from 'drizzle-orm';
import type { DatabaseClient } from '@cvg-his-v2/shared-database';
import { featureFlags, featureFlagOverrides } from '@cvg-his-v2/shared-database/schemas';
import type {
  EvaluationContext,
  FeatureFlagMetricsCollector,
  FeatureFlagProvider,
  FlagDecision,
  FlagDefinition
} from './index.js';
import { createFlagDecision, noOpFeatureFlagMetricsCollector } from './index.js';

/**
 * Caches flag decisions for a configurable TTL to avoid repeated DB hits.
 * Uses a simple Map with timestamp-based eviction.
 */
class FlagCache {
  readonly #cache = new Map<string, { decision: FlagDecision; expiresAt: number }>();
  readonly #ttlMs: number;

  constructor(ttlMs = 60_000) {
    this.#ttlMs = ttlMs;
  }

  get(key: string, nowMs: number): FlagDecision | undefined {
    const entry = this.#cache.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= nowMs) {
      this.#cache.delete(key);
      return undefined;
    }
    return entry.decision;
  }

  set(key: string, decision: FlagDecision, nowMs: number): void {
    this.#cache.set(key, {
      decision,
      expiresAt: nowMs + this.#ttlMs
    });
  }

  invalidate(key?: string): void {
    if (!key) {
      this.#cache.clear();
      return;
    }
    this.#cache.delete(key);
  }
}

export interface DatabaseFeatureFlagProviderOptions {
  /**
   * Pre-populate the internal registry with these definitions.
   * If a flag is not in this list, its definition is loaded from the DB.
   */
  readonly definitions?: readonly FlagDefinition[];
  /**
   * Cache TTL in milliseconds. Defaults to 60 seconds.
   */
  readonly cacheTtlMs?: number;
  /**
   * Metrics collector for observability. Defaults to no-op.
   */
  readonly metrics?: FeatureFlagMetricsCollector;
}

/**
 * Creates a database-backed FeatureFlagProvider that:
 * - Loads flag definitions from the DB on first evaluation (and caches them)
 * - Evaluates overrides by environment, account, and user
 * - Falls back to a secondary provider (e.g. env) on DB errors
 * - Supports rollout percentage and allowlist per override
 * - Records metrics via FeatureFlagMetricsCollector
 */
export function createDatabaseFeatureFlagProvider(
  db: DatabaseClient,
  fallbackProvider: FeatureFlagProvider,
  options: DatabaseFeatureFlagProviderOptions = {}
): FeatureFlagProvider {
  const cache = new FlagCache(options.cacheTtlMs ?? 60_000);
  const metrics = options.metrics ?? noOpFeatureFlagMetricsCollector;

  function recordFallback(key: string, reason: string): void {
    metrics.recordFallback({ flagKey: key, provider: 'database', fallbackReason: reason });
  }

  return {
    name: 'database',
    invalidateCache(key?: string): void {
      cache.invalidate(key);
    },

    async evaluate(
      definition: FlagDefinition,
      context: EvaluationContext
    ): Promise<FlagDecision> {
      const start = Date.now();
      const now = context.now ?? new Date();
      const nowMs = now.getTime();
      const cacheKey = buildCacheKey(definition.key, context);

      // 1. Check cache first
      const cached = cache.get(cacheKey, nowMs);
      if (cached) {
        metrics.recordEvaluation({
          flagKey: definition.key,
          provider: 'database',
          reason: cached.reason,
          enabled: cached.enabled,
          durationMs: Date.now() - start
        });
        return cached;
      }

      // 2. Try DB lookup
      let decision: FlagDecision;
      try {
        decision = await evaluateFromDb(db, definition, context, recordFallback);
      } catch (err) {
        // 3. Fall back to secondary provider on DB error
        recordFallback(definition.key, 'database_error');
        metrics.recordError({
          flagKey: definition.key,
          provider: 'database',
          errorType: err instanceof Error ? err.constructor.name : 'UnknownError'
        });
        decision = fallbackProvider.evaluate(definition, context);
      }

      // 4. Record evaluation metrics
      metrics.recordEvaluation({
        flagKey: definition.key,
        provider: 'database',
        reason: decision.reason,
        enabled: decision.enabled,
        durationMs: Date.now() - start
      });

      // 5. Cache the result (even fallback — avoids hammering DB on repeated errors)
      cache.set(cacheKey, decision, nowMs);
      return decision;
    }
  };
}

function buildCacheKey(flagKey: string, context: EvaluationContext): string {
  return `${flagKey}:${context.environment ?? ''}:${context.accountId ?? ''}:${context.userId ?? ''}`;
}

async function evaluateFromDb(
  db: DatabaseClient,
  definition: FlagDefinition,
  context: EvaluationContext,
  recordFallback: (key: string, reason: string) => void
): Promise<FlagDecision> {
  const accountId = context.accountId;
  const environment = context.environment ?? 'development';
  const userId = context.userId;

  // Build the where conditions safely
  const flagKeyCondition = eq(featureFlags.key, definition.key);
  const accountCondition: SQL | undefined = accountId
    ? eq(featureFlags.accountId, accountId)
    : undefined;

  // Load flag from DB
  const flagWhere = accountCondition
    ? and(flagKeyCondition, accountCondition)
    : flagKeyCondition;

  const flagRows = await db.select().from(featureFlags).where(flagWhere).limit(1);

  // If flag not found in DB, delegate entirely to fallback
  if (!flagRows || flagRows.length === 0) {
    recordFallback(definition.key, 'not_found_in_db');
    return createFlagDecision(definition, context, {
      enabled: definition.defaultValue,
      provider: 'database',
      reason: 'default'
    });
  }

  const flagRow = flagRows[0]!;

  // Check if flag is disabled at the definition level (kill switch)
  const globalEnabled = flagRow.enabled;
  if (!globalEnabled) {
    return createFlagDecision(definition, context, {
      enabled: false,
      provider: 'database',
      reason: 'kill_switch',
      metadata: { level: 'flag' }
    });
  }

  // Build override conditions
  const overrideFlagCondition = eq(featureFlagOverrides.flagId, flagRow.id);
  const overrideEnvCondition: SQL | undefined = environment
    ? eq(featureFlagOverrides.environment, environment)
    : undefined;
  const overrideAccountCondition: SQL | undefined = accountId
    ? eq(featureFlagOverrides.accountIdOverride, accountId)
    : undefined;

  // Load override for this environment / account / user
  const overrideWhere = and(overrideFlagCondition, overrideEnvCondition, overrideAccountCondition);
  const overrideRows = await db
    .select()
    .from(featureFlagOverrides)
    .where(overrideWhere)
    .limit(1);

  if (!overrideRows || overrideRows.length === 0) {
    // No override → use the flag's own enabled + defaultValue
    return createFlagDecision(definition, context, {
      enabled: Boolean(flagRow.defaultValue),
      provider: 'database',
      reason: 'default'
    });
  }

  const override = overrideRows[0]!;

  // Kill switch on override
  if (!override.enabled) {
    return createFlagDecision(definition, context, {
      enabled: false,
      provider: 'database',
      reason: 'kill_switch',
      metadata: { level: 'override' }
    });
  }

  // Allowlist check
  const allowedUsers: string[] = override.allowedUsers ?? [];
  if (allowedUsers.length > 0 && userId) {
    if (allowedUsers.includes(userId)) {
      return createFlagDecision(definition, context, {
        enabled: true,
        provider: 'database',
        reason: 'allowlist'
      });
    } else {
      return createFlagDecision(definition, context, {
        enabled: false,
        provider: 'database',
        reason: 'allowlist_excluded'
      });
    }
  }

  // Percentage rollout
  const percentage = override.percentage;
  if (percentage !== null && percentage !== undefined && accountId) {
    const hash = hashAccount(accountId, definition.key);
    const enabled = hash < percentage;
    return createFlagDecision(definition, context, {
      enabled,
      provider: 'database',
      reason: 'percentage',
      metadata: { percentage, hash }
    });
  }

  return createFlagDecision(definition, context, {
    enabled: true,
    provider: 'database',
    reason: 'override'
  });
}

/**
 * Deterministic hash for rollout distribution.
 * Same account + flag key always produces the same hash (0–99).
 */
function hashAccount(accountId: string, flagKey: string): number {
  let hash = 5381;
  const input = `${accountId}:${flagKey}`;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) + hash) ^ input.charCodeAt(i);
    hash = hash >>> 0; // keep as unsigned 32-bit
  }
  return hash % 100;
}
