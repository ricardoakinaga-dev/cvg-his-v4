import { eq, and, or, isNull } from 'drizzle-orm';
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

export interface DatabaseFeatureFlagProviderOptions {
  /** Retained for source compatibility; evaluate receives the authoritative definition. */
  readonly definitions?: readonly FlagDefinition[];
  readonly cacheTtlMs?: number;
  /** Maximum retained decisions, default 1024. Zero disables caching. */
  readonly maxCacheEntries?: number;
  readonly metrics?: FeatureFlagMetricsCollector;
}

export interface DatabaseFeatureFlagProvider extends FeatureFlagProvider {
  evaluate(definition: FlagDefinition, context: EvaluationContext): Promise<FlagDecision>;
  invalidateCache(key?: string): void;
}

/**
 * Tenant-aware database provider. Without an account, evaluation delegates to
 * fallback without issuing an unscoped query. Overrides prefer user, account,
 * then environment specificity; equal specificity uses the newest row and ID.
 */
export function createDatabaseFeatureFlagProvider(
  db: DatabaseClient,
  fallbackProvider: FeatureFlagProvider,
  options: DatabaseFeatureFlagProviderOptions = {}
): DatabaseFeatureFlagProvider {
  const ttl = options.cacheTtlMs ?? 60_000;
  if (!Number.isFinite(ttl) || ttl < 0)
    throw new RangeError('cacheTtlMs must be finite and nonnegative');
  const capacity = options.maxCacheEntries ?? 1024;
  if (!Number.isSafeInteger(capacity) || capacity < 0)
    throw new RangeError('maxCacheEntries must be a nonnegative safe integer');
  const metrics = options.metrics ?? noOpFeatureFlagMetricsCollector;
  const cache = new Map<string, { decision: FlagDecision; expiresAt: number; flagKey: string }>();
  let generation = 0;
  return {
    name: 'database',
    invalidateCache(key?: string): void {
      generation++;
      for (const [entryKey, entry] of cache)
        if (key === undefined || entry.flagKey === key) cache.delete(entryKey);
    },
    async evaluate(definition, context): Promise<FlagDecision> {
      const start = Date.now(),
        nowMs = (context.now ?? new Date()).getTime();
      // Tuple encoding prevents delimiter collisions. Definition/attributes are
      // inputs to fallback, so sharing their decisions would also be unsafe.
      for (const [key, cached] of cache) if (cached.expiresAt <= nowMs) cache.delete(key);
      const cacheKey = JSON.stringify([
        definition,
        context.environment,
        context.tenantId,
        context.accountId,
        context.userId,
        context.attributes,
        context.correlationId,
        context.now?.toISOString()
      ]);
      const entry = cache.get(cacheKey);
      let decision: FlagDecision;
      if (entry && entry.expiresAt > nowMs) {
        decision = createFlagDecision(
          definition,
          context,
          structuredClone({
            enabled: entry.decision.enabled,
            provider: entry.decision.provider,
            reason: entry.decision.reason,
            metadata: entry.decision.metadata
          })
        );
      } else {
        cache.delete(cacheKey);
        const pendingGeneration = generation;
        let expiry: number | undefined;
        const fallback = async (reason: string) => {
          metrics.recordFallback({
            flagKey: definition.key,
            provider: 'database',
            fallbackReason: reason
          });
          return await fallbackProvider.evaluate(definition, context);
        };
        if (!context.accountId) {
          decision = await fallback('missing_account');
        } else {
          let result: { decision: FlagDecision; expiry?: number } | null;
          try {
            result = await evaluateFromDb(db, definition, context);
          } catch (error) {
            metrics.recordError({
              flagKey: definition.key,
              provider: 'database',
              errorType: error instanceof Error ? error.constructor.name : 'UnknownError'
            });
            result = { decision: await fallback('database_error') };
          }
          if (result === null) decision = await fallback('not_found_in_db');
          else {
            decision = result.decision;
            expiry = result.expiry;
          }
        }
        // An invalidation while a query is in flight must not repopulate stale data.
        if (pendingGeneration === generation && ttl > 0 && capacity > 0) {
          while (cache.size >= capacity) cache.delete(cache.keys().next().value!);
          cache.set(cacheKey, {
            decision: structuredClone(decision),
            flagKey: definition.key,
            expiresAt: Math.min(nowMs + ttl, expiry ?? Infinity)
          });
        }
      }
      metrics.recordEvaluation({
        flagKey: definition.key,
        provider: 'database',
        reason: decision.reason,
        enabled: decision.enabled,
        durationMs: Date.now() - start
      });
      return decision;
    }
  };
}

async function evaluateFromDb(
  db: DatabaseClient,
  definition: FlagDefinition,
  context: EvaluationContext
): Promise<{ decision: FlagDecision; expiry?: number } | null> {
  const accountId = context.accountId!,
    environment = context.environment ?? 'development',
    userId = context.userId;
  const [flag] = await db
    .select()
    .from(featureFlags)
    .where(and(eq(featureFlags.key, definition.key), eq(featureFlags.accountId, accountId)))
    .limit(1);
  if (!flag) return null;
  const expiry = flag.expiresAt?.getTime();
  const decide = (
    enabled: boolean,
    reason: string,
    metadata?: Readonly<Record<string, unknown>>
  ) => ({
    decision: createFlagDecision(definition, context, {
      enabled,
      provider: 'database',
      reason,
      metadata
    }),
    expiry
  });
  if (expiry !== undefined && expiry <= (context.now ?? new Date()).getTime())
    return decide(false, 'expired');
  if (!flag.enabled) return decide(false, 'kill_switch', { level: 'flag' });
  const overrides = await db
    .select()
    .from(featureFlagOverrides)
    .where(
      and(
        eq(featureFlagOverrides.flagId, flag.id),
        eq(featureFlagOverrides.accountId, accountId),
        or(
          isNull(featureFlagOverrides.environment),
          eq(featureFlagOverrides.environment, environment)
        ),
        or(
          isNull(featureFlagOverrides.accountIdOverride),
          eq(featureFlagOverrides.accountIdOverride, accountId)
        ),
        userId
          ? or(isNull(featureFlagOverrides.userId), eq(featureFlagOverrides.userId, userId))
          : isNull(featureFlagOverrides.userId)
      )
    );
  const specificity = (o: (typeof overrides)[number]) =>
    (o.userId ? 4 : 0) + (o.accountIdOverride ? 2 : 0) + (o.environment ? 1 : 0);
  overrides.sort(
    (a, b) =>
      specificity(b) - specificity(a) ||
      b.updatedAt.getTime() - a.updatedAt.getTime() ||
      a.id.localeCompare(b.id)
  );
  const override = overrides[0];
  if (!override) return decide(flag.defaultValue, 'default');
  if (!override.enabled) return decide(false, 'kill_switch', { level: 'override' });
  if (override.allowedUsers.length > 0)
    return decide(
      Boolean(userId && override.allowedUsers.includes(userId)),
      userId && override.allowedUsers.includes(userId) ? 'allowlist' : 'allowlist_excluded'
    );
  if (override.percentage !== null) {
    if (
      !Number.isFinite(override.percentage) ||
      override.percentage < 0 ||
      override.percentage > 100
    )
      throw new Error('Invalid feature flag percentage');
    const hash = hashAccount(accountId, definition.key);
    return decide(hash < override.percentage, 'percentage', {
      percentage: override.percentage,
      hash
    });
  }
  return decide(true, 'override');
}

function hashAccount(accountId: string, flagKey: string): number {
  let hash = 5381;
  const input = `${accountId}:${flagKey}`;
  for (let i = 0; i < input.length; i++) hash = (((hash << 5) + hash) ^ input.charCodeAt(i)) >>> 0;
  return hash % 100;
}
