export type FeatureFlagScope = 'global' | 'environment' | 'tenant' | 'account' | 'user';

export type FeatureFlagDecisionReason =
  | 'default'
  | 'provider'
  | 'fallback'
  | 'bootstrap'
  | 'override'
  | 'kill_switch'
  | 'allowlist'
  | 'percentage_rollout';

/**
 * Allowlist configuration for targeted rollouts.
 * Users or accounts listed here receive the flag regardless of percentage rollout.
 */
export interface FeatureFlagAllowlist {
  readonly accountIds?: readonly string[];
  readonly userIds?: readonly string[];
}

/**
 * Rollout rules for a single feature flag.
 * Evaluated in order: killSwitch → allowlist → percentageRollout → default.
 */
export interface FeatureFlagRolloutRules {
  /**
   * Emergency kill switch — when true, the flag is ALWAYS disabled.
   * Takes precedence over all other rules.
   */
  readonly killSwitch?: boolean;

  /**
   * Allowlist of accountIds or userIds that receive the flag regardless of percentage.
   * Takes precedence over percentageRollout.
   */
  readonly allowlist?: FeatureFlagAllowlist;

  /**
   * Percentage rollout (0-100). Applied to accounts/users not in the allowlist.
   * Uses consistent hashing so the same account/user always gets the same result.
   */
  readonly percentageRollout?: number;
}

export interface FlagDefinition {
  readonly key: string;
  readonly owner: string;
  readonly description: string;
  readonly defaultValue: boolean;
  readonly scopes: readonly FeatureFlagScope[];
  readonly expiresAt?: string;
  readonly auditRequired?: boolean;
  readonly tags?: readonly string[];
  readonly metadata?: Readonly<Record<string, string | number | boolean>>;
  /**
   * Optional rollout rules for this specific flag.
   * When provided, the rules-based provider uses these to evaluate the flag.
   */
  readonly rolloutRules?: FeatureFlagRolloutRules;
}

export interface EvaluationContext {
  readonly environment?: string;
  readonly tenantId?: string;
  readonly accountId?: string;
  readonly userId?: string;
  readonly correlationId?: string;
  readonly now?: Date;
  readonly attributes?: Readonly<Record<string, string | number | boolean>>;
}

export interface FlagDecision {
  readonly key: string;
  readonly enabled: boolean;
  readonly provider: string;
  readonly reason: FeatureFlagDecisionReason | string;
  readonly evaluatedAt: string;
  readonly definition: FlagDefinition;
  readonly context: Readonly<EvaluationContext>;
  readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface FeatureFlagProvider {
  readonly name: string;
  evaluate(definition: FlagDefinition, context: EvaluationContext): Promise<FlagDecision> | FlagDecision;
}

export class InvalidFlagDefinitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidFlagDefinitionError';
  }
}

export class DuplicateFeatureFlagError extends Error {
  constructor(key: string) {
    super(`Feature flag '${key}' is already registered`);
    this.name = 'DuplicateFeatureFlagError';
  }
}

export class UnknownFeatureFlagError extends Error {
  constructor(key: string) {
    super(`Feature flag '${key}' is not registered`);
    this.name = 'UnknownFeatureFlagError';
  }
}

const FEATURE_FLAG_KEY_PATTERN = /^[a-z0-9]+(?:[._-][a-z0-9]+)*$/;

function uniqueScopes(scopes: readonly FeatureFlagScope[]): readonly FeatureFlagScope[] {
  return Array.from(new Set(scopes));
}

export function normalizeFeatureFlagKeys(keys: readonly string[]): readonly string[] {
  return Array.from(new Set(keys.map((key) => key.trim().toLowerCase()).filter(Boolean))).sort();
}

function normalizeExpiresAt(value: string | undefined, key: string): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new InvalidFlagDefinitionError(
      `Feature flag '${key}' has an invalid expiresAt value: ${value}`
    );
  }

  return parsed.toISOString();
}

export function validateFlagDefinition(definition: FlagDefinition): FlagDefinition {
  const key = definition.key.trim();
  if (key.length === 0) {
    throw new InvalidFlagDefinitionError('Feature flag key is required');
  }

  if (!FEATURE_FLAG_KEY_PATTERN.test(key)) {
    throw new InvalidFlagDefinitionError(
      `Feature flag '${key}' must use lowercase segments separated by '.', '_' or '-'`
    );
  }

  const owner = definition.owner.trim();
  if (owner.length === 0) {
    throw new InvalidFlagDefinitionError(`Feature flag '${key}' must define an owner`);
  }

  const description = definition.description.trim();
  if (description.length === 0) {
    throw new InvalidFlagDefinitionError(`Feature flag '${key}' must define a description`);
  }

  const scopes = uniqueScopes(definition.scopes);
  if (scopes.length === 0) {
    throw new InvalidFlagDefinitionError(`Feature flag '${key}' must define at least one scope`);
  }

  const tags = definition.tags
    ? Array.from(new Set(definition.tags.map((tag) => tag.trim()).filter((tag) => tag.length > 0)))
    : undefined;

  return {
    ...definition,
    key,
    owner,
    description,
    scopes,
    tags,
    expiresAt: normalizeExpiresAt(definition.expiresAt, key)
  };
}

export class FeatureFlagRegistry {
  readonly #definitions = new Map<string, FlagDefinition>();

  register(definition: FlagDefinition): FlagDefinition;
  register(definitions: readonly FlagDefinition[]): readonly FlagDefinition[];
  register(
    definitionOrDefinitions: FlagDefinition | readonly FlagDefinition[]
  ): FlagDefinition | readonly FlagDefinition[] {
    if (Array.isArray(definitionOrDefinitions)) {
      const definitions = definitionOrDefinitions as readonly FlagDefinition[];
      return definitions.map((definition) => this.registerOne(definition));
    }

    return this.registerOne(definitionOrDefinitions as FlagDefinition);
  }

  has(key: string): boolean {
    return this.#definitions.has(key);
  }

  get(key: string): FlagDefinition | undefined {
    return this.#definitions.get(key);
  }

  require(key: string): FlagDefinition {
    const definition = this.get(key);
    if (!definition) {
      throw new UnknownFeatureFlagError(key);
    }
    return definition;
  }

  list(): readonly FlagDefinition[] {
    return Array.from(this.#definitions.values()).sort((left, right) => {
      return left.key.localeCompare(right.key);
    });
  }

  clear(): void {
    this.#definitions.clear();
  }

  registerOne(definition: FlagDefinition): FlagDefinition {
    const normalized = validateFlagDefinition(definition);
    if (this.#definitions.has(normalized.key)) {
      throw new DuplicateFeatureFlagError(normalized.key);
    }

    this.#definitions.set(normalized.key, normalized);
    return normalized;
  }
}

export const featureFlagRegistry = new FeatureFlagRegistry();

export function registerFeatureFlags(
  definitions: readonly FlagDefinition[],
  registry: FeatureFlagRegistry = featureFlagRegistry
): readonly FlagDefinition[] {
  return registry.register(definitions);
}

export function getFeatureFlagDefinition(
  key: string,
  registry: FeatureFlagRegistry = featureFlagRegistry
): FlagDefinition | undefined {
  return registry.get(key);
}

export function requireFeatureFlagDefinition(
  key: string,
  registry: FeatureFlagRegistry = featureFlagRegistry
): FlagDefinition {
  return registry.require(key);
}

export function listFeatureFlagDefinitions(
  registry: FeatureFlagRegistry = featureFlagRegistry
): readonly FlagDefinition[] {
  return registry.list();
}

export function clearFeatureFlagRegistryForTests(
  registry: FeatureFlagRegistry = featureFlagRegistry
): void {
  registry.clear();
}

export function createFlagDecision(
  definition: FlagDefinition,
  context: EvaluationContext,
  params?: {
    readonly enabled?: boolean;
    readonly provider?: string;
    readonly reason?: FeatureFlagDecisionReason | string;
    readonly evaluatedAt?: string;
    readonly metadata?: Readonly<Record<string, unknown>>;
  }
): FlagDecision {
  return {
    key: definition.key,
    enabled: params?.enabled ?? definition.defaultValue,
    provider: params?.provider ?? 'registry-default',
    reason: params?.reason ?? 'default',
    evaluatedAt: params?.evaluatedAt ?? (context.now ?? new Date()).toISOString(),
    definition,
    context,
    metadata: params?.metadata
  };
}

export function createEnvFeatureFlagProvider(enabledKeys: readonly string[]): FeatureFlagProvider {
  const normalizedEnabledKeys = new Set(normalizeFeatureFlagKeys(enabledKeys));

  return {
    name: 'env-bootstrap',
    evaluate(definition, context) {
      const enabled = normalizedEnabledKeys.has(definition.key)
        ? true
        : definition.defaultValue;

      return createFlagDecision(definition, context, {
        enabled,
        provider: 'env-bootstrap',
        reason: normalizedEnabledKeys.has(definition.key) ? 'bootstrap' : 'default',
        metadata: {
          enabledByEnv: normalizedEnabledKeys.has(definition.key)
        }
      });
    }
  };
}

export async function evaluateFeatureFlag(
  key: string,
  provider: FeatureFlagProvider,
  context: EvaluationContext = {},
  registry: FeatureFlagRegistry = featureFlagRegistry
): Promise<FlagDecision> {
  const definition = registry.require(key);
  return provider.evaluate(definition, context);
}

export async function isFeatureFlagEnabled(
  key: string,
  provider: FeatureFlagProvider,
  context: EvaluationContext = {},
  registry: FeatureFlagRegistry = featureFlagRegistry
): Promise<boolean> {
  const decision = await evaluateFeatureFlag(key, provider, context, registry);
  return decision.enabled;
}

// ---------------------------------------------------------------------------
// Rollout Rules Evaluation
// ---------------------------------------------------------------------------

/**
 * Consistent hash bucket for percentage rollouts.
 * Uses a deterministic hash so the same accountId/userId always
 * maps to the same bucket across evaluations.
 */
export function computeRolloutBucket(
  flagKey: string,
  entityId: string
): number {
  // Simple deterministic hash: sum of char codes modulo 100 + 1
  // Gives a value 1-100 that is deterministic for the given inputs
  let hash = 0;
  const input = `${flagKey}:${entityId}`;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) - hash + input.charCodeAt(i)) | 0;
  }
  // Make it positive and map to 1-100
  return (Math.abs(hash) % 100) + 1;
}

export interface RolloutEvaluationResult {
  readonly enabled: boolean;
  readonly reason: FeatureFlagDecisionReason;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/**
 * Evaluates rollout rules for a flag given an evaluation context.
 *
 * Evaluation order (first match wins):
 *  1. killSwitch → always disabled (reason: kill_switch)
 *  2. allowlist (accountIds/userIds) → always enabled (reason: allowlist)
 *  3. percentageRollout → enabled if bucket <= percentage (reason: percentage_rollout)
 *  4. defaultValue → used as fallback (reason: default)
 */
export function evaluateRolloutRules(
  definition: FlagDefinition,
  context: EvaluationContext
): RolloutEvaluationResult {
  const rules = definition.rolloutRules;
  const now = context.now ?? new Date();

  // 1. Kill switch — immediate disable regardless of anything else
  if (rules?.killSwitch === true) {
    return {
      enabled: false,
      reason: 'kill_switch',
      metadata: {
        killSwitch: true,
        evaluatedAt: now.toISOString()
      }
    };
  }

  // 2. Allowlist check — account or user explicitly enabled
  if (rules?.allowlist) {
    const { allowlist } = rules;

    if (allowlist.accountIds && context.accountId) {
      const normalizedAccountIds = allowlist.accountIds.map((id) => id.toLowerCase());
      if (normalizedAccountIds.includes(context.accountId.toLowerCase())) {
        return {
          enabled: true,
          reason: 'allowlist',
          metadata: {
            allowlistMatch: 'accountId',
            matchedAccountId: context.accountId,
            evaluatedAt: now.toISOString()
          }
        };
      }
    }

    if (allowlist.userIds && context.userId) {
      const normalizedUserIds = allowlist.userIds.map((id) => id.toLowerCase());
      if (normalizedUserIds.includes(context.userId.toLowerCase())) {
        return {
          enabled: true,
          reason: 'allowlist',
          metadata: {
            allowlistMatch: 'userId',
            matchedUserId: context.userId,
            evaluatedAt: now.toISOString()
          }
        };
      }
    }
  }

  // 3. Percentage rollout — consistent bucket check
  // percentageRollout can be 0 (0% rollout = always off), or 1-99, or 100 (always on)
  if (rules?.percentageRollout !== undefined && rules.percentageRollout < 100) {
    // Use accountId as the entity for percentage calculation; fall back to userId
    const entityId = context.accountId ?? context.userId ?? context.tenantId ?? 'anonymous';
    const bucket = computeRolloutBucket(definition.key, entityId);
    const inRollout = bucket <= rules.percentageRollout;

    return {
      enabled: inRollout,
      reason: 'percentage_rollout',
      metadata: {
        percentageRollout: rules.percentageRollout,
        rolloutBucket: bucket,
        rolloutEntity: entityId,
        inRollout,
        evaluatedAt: now.toISOString()
      }
    };
  }

  // If percentage is 100, treat as fully enabled (no rollout needed)
  if (rules?.percentageRollout === 100) {
    return {
      enabled: true,
      reason: 'percentage_rollout',
      metadata: {
        percentageRollout: 100,
        rolloutNote: 'full_rollout',
        evaluatedAt: now.toISOString()
      }
    };
  }

  // 4. Default fallback
  return {
    enabled: definition.defaultValue,
    reason: 'default',
    metadata: {
      evaluatedAt: now.toISOString()
    }
  };
}

/**
 * Creates a feature flag provider that evaluates rollout rules
 * (kill switch, allowlist, percentage) defined in FlagDefinition.rolloutRules.
 *
 * @param baseProvider - optional base provider for overrides beyond the rules engine
 */
export function createRulesBasedFeatureFlagProvider(
  baseProvider?: FeatureFlagProvider
): FeatureFlagProvider {
  return {
    name: 'rules-based',

    evaluate(definition: FlagDefinition, context: EvaluationContext): Promise<FlagDecision> {
      // If no rollout rules are defined, delegate to base provider or return default
      if (!definition.rolloutRules) {
        if (baseProvider) {
          return Promise.resolve(baseProvider.evaluate(definition, context));
        }
        return Promise.resolve(createFlagDecision(definition, context, {
          provider: 'rules-based',
          reason: 'default'
        }));
      }

      // Evaluate rollout rules (always sync)
      const result = evaluateRolloutRules(definition, context);

      return Promise.resolve(createFlagDecision(definition, context, {
        enabled: result.enabled,
        provider: 'rules-based',
        reason: result.reason,
        metadata: result.metadata
      }));
    }
  };
}

/**
 * Creates a composite provider that wraps an upstream provider
 * with an override layer supporting kill switch, allowlist and percentage rollout.
 *
 * Useful when you want to layer runtime rules on top of an existing
 * database-backed or HTTP-backed provider.
 *
 * @param upstream - the underlying provider to wrap
 * @param getRules - function that returns the rules for a given flag key
 */
export function createCompositeFeatureFlagProvider(
  upstream: FeatureFlagProvider,
  getRules: (key: string) => FeatureFlagRolloutRules | undefined
): FeatureFlagProvider {
  return {
    name: `${upstream.name}-with-rules`,

    async evaluate(definition: FlagDefinition, context: EvaluationContext): Promise<FlagDecision> {
      const rules = getRules(definition.key);

      // If no rules for this key, delegate entirely to upstream (with composite wrapper metadata)
      if (!rules) {
        return Promise.resolve(upstream.evaluate(definition, context)).then((upstreamDecision) => {
          return createFlagDecision(definition, context, {
            enabled: upstreamDecision.enabled,
            provider: `${upstream.name}-with-rules`,
            reason: upstreamDecision.reason,
            metadata: {
              upstreamProvider: upstreamDecision.provider,
              upstreamReason: upstreamDecision.reason
            }
          });
        }) as Promise<FlagDecision>;
      }

      // Evaluate rules (always sync)
      const result = evaluateRolloutRules(
        { ...definition, rolloutRules: rules },
        context
      );

      // If kill switch, always return disabled regardless of upstream
      if (result.reason === 'kill_switch') {
        return createFlagDecision(definition, context, {
          enabled: false,
          provider: `${upstream.name}-with-rules`,
          reason: 'kill_switch',
          metadata: result.metadata
        });
      }

      // Otherwise delegate to upstream for the actual decision
      const upstreamResult = await Promise.resolve(upstream.evaluate(definition, context));

      // Handle both sync and async upstream providers
      return Promise.resolve(upstreamResult).then((upstreamDecision) => {
        return createFlagDecision(definition, context, {
          enabled: result.enabled,
          provider: `${upstream.name}-with-rules`,
          reason: result.reason,
          metadata: {
            ...result.metadata,
            upstreamProvider: upstreamDecision.provider,
            upstreamReason: upstreamDecision.reason
          }
        });
      }) as Promise<FlagDecision>;
    }
  };
}

// ---------------------------------------------------------------------------
// PR-FF-13: Metrics and Observability
// ---------------------------------------------------------------------------

/**
 * Metrics collected for feature flag evaluations.
 * Used to build Prometheus counters/histograms and dashboards.
 */
export interface FeatureFlagEvaluationMetrics {
  readonly flagKey: string;
  readonly provider: string;
  readonly reason: string;
  readonly enabled: boolean;
  readonly durationMs?: number;
}

export interface FeatureFlagErrorMetrics {
  readonly flagKey: string;
  readonly provider: string;
  readonly errorType: string;
}

export interface FeatureFlagFallbackMetrics {
  readonly flagKey: string;
  readonly provider: string;
  readonly fallbackReason: string;
}

/**
 * Interface for collecting feature flag metrics.
 * Implement this to wire up Prometheus counters/histograms.
 * The NoOp implementation is used when no metrics collector is provided.
 */
export interface FeatureFlagMetricsCollector {
  /**
   * Called after every flag evaluation (success or failure).
   */
  recordEvaluation(metrics: FeatureFlagEvaluationMetrics): void;

  /**
   * Called when a provider encounters an error.
   */
  recordError(metrics: FeatureFlagErrorMetrics): void;

  /**
   * Called when evaluation falls back to default value
   * (e.g., flag not found in DB, network error, etc.)
   */
  recordFallback(metrics: FeatureFlagFallbackMetrics): void;
}

/**
 * No-op metrics collector — used when no collector is configured.
 * All methods are no-ops, so providers work without metrics infrastructure.
 */
export const noOpFeatureFlagMetricsCollector: FeatureFlagMetricsCollector = {
  recordEvaluation() {
    // no-op
  },
  recordError() {
    // no-op
  },
  recordFallback() {
    // no-op
  }
};

export interface RulesBasedProviderOptions {
  readonly baseProvider?: FeatureFlagProvider;
  readonly metrics?: FeatureFlagMetricsCollector;
}

export interface CompositeProviderOptions {
  readonly upstream: FeatureFlagProvider;
  readonly getRules: (key: string) => FeatureFlagRolloutRules | undefined;
  readonly metrics?: FeatureFlagMetricsCollector;
}

/**
 * Creates a rules-based provider with metrics collection.
 * Metrics are recorded for every evaluation, error, and fallback.
 */
export function createRulesBasedFeatureFlagProviderWithMetrics(
  options: RulesBasedProviderOptions
): FeatureFlagProvider {
  const { baseProvider, metrics = noOpFeatureFlagMetricsCollector } = options;

  return {
    name: 'rules-based',

    async evaluate(definition: FlagDefinition, context: EvaluationContext): Promise<FlagDecision> {
      const start = Date.now();

      try {
        // If no rollout rules are defined, delegate to base provider or return default
        if (!definition.rolloutRules) {
          if (baseProvider) {
            const result = baseProvider.evaluate(definition, context);
            return Promise.resolve(result).then((decision) => {
              metrics.recordEvaluation({
                flagKey: definition.key,
                provider: decision.provider,
                reason: decision.reason,
                enabled: decision.enabled,
                durationMs: Date.now() - start
              });
              return decision;
            }) as Promise<FlagDecision>;
          }

          const decision = createFlagDecision(definition, context, {
            provider: 'rules-based',
            reason: 'default'
          });
          metrics.recordEvaluation({
            flagKey: definition.key,
            provider: 'rules-based',
            reason: 'default',
            enabled: decision.enabled,
            durationMs: Date.now() - start
          });
          return decision;
        }

        // Evaluate rollout rules (always sync)
        const result = evaluateRolloutRules(definition, context);

        const decision = createFlagDecision(definition, context, {
          enabled: result.enabled,
          provider: 'rules-based',
          reason: result.reason,
          metadata: result.metadata
        });

        metrics.recordEvaluation({
          flagKey: definition.key,
          provider: 'rules-based',
          reason: result.reason,
          enabled: decision.enabled,
          durationMs: Date.now() - start
        });

        return decision;
      } catch (err) {
        metrics.recordError({
          flagKey: definition.key,
          provider: 'rules-based',
          errorType: err instanceof Error ? err.constructor.name : 'UnknownError'
        });
        throw err;
      }
    }
  };
}

/**
 * Creates a composite provider with metrics collection.
 * Records metrics for evaluations, errors, and fallbacks.
 */
export function createCompositeFeatureFlagProviderWithMetrics(
  options: CompositeProviderOptions
): FeatureFlagProvider {
  const { upstream, getRules, metrics = noOpFeatureFlagMetricsCollector } = options;

  return {
    name: `${upstream.name}-with-rules`,

    async evaluate(definition: FlagDefinition, context: EvaluationContext): Promise<FlagDecision> {
      const start = Date.now();

      try {
        const rules = getRules(definition.key);

        // If no rules for this key, delegate entirely to upstream
        if (!rules) {
          return Promise.resolve(upstream.evaluate(definition, context))
            .then((upstreamDecision) => {
              metrics.recordEvaluation({
                flagKey: definition.key,
                provider: `${upstream.name}-with-rules`,
                reason: upstreamDecision.reason,
                enabled: upstreamDecision.enabled,
                durationMs: Date.now() - start
              });
              return createFlagDecision(definition, context, {
                enabled: upstreamDecision.enabled,
                provider: `${upstream.name}-with-rules`,
                reason: upstreamDecision.reason,
                metadata: {
                  upstreamProvider: upstreamDecision.provider,
                  upstreamReason: upstreamDecision.reason
                }
              });
            }) as Promise<FlagDecision>;
        }

        // Evaluate rules (always sync)
        const result = evaluateRolloutRules(
          { ...definition, rolloutRules: rules },
          context
        );

        // Kill switch — always disabled regardless of upstream
        if (result.reason === 'kill_switch') {
          const decision = createFlagDecision(definition, context, {
            enabled: false,
            provider: `${upstream.name}-with-rules`,
            reason: 'kill_switch',
            metadata: result.metadata
          });
          metrics.recordEvaluation({
            flagKey: definition.key,
            provider: `${upstream.name}-with-rules`,
            reason: 'kill_switch',
            enabled: false,
            durationMs: Date.now() - start
          });
          return decision;
        }

        // Delegate to upstream
        const upstreamResult = await Promise.resolve(upstream.evaluate(definition, context));

        return Promise.resolve(upstreamResult).then((upstreamDecision) => {
          const decision = createFlagDecision(definition, context, {
            enabled: result.enabled,
            provider: `${upstream.name}-with-rules`,
            reason: result.reason,
            metadata: {
              ...result.metadata,
              upstreamProvider: upstreamDecision.provider,
              upstreamReason: upstreamDecision.reason
            }
          });

          metrics.recordEvaluation({
            flagKey: definition.key,
            provider: `${upstream.name}-with-rules`,
            reason: result.reason,
            enabled: decision.enabled,
            durationMs: Date.now() - start
          });

          return decision;
        }) as Promise<FlagDecision>;
      } catch (err) {
        metrics.recordError({
          flagKey: definition.key,
          provider: `${upstream.name}-with-rules`,
          errorType: err instanceof Error ? err.constructor.name : 'UnknownError'
        });
        throw err;
      }
    }
  };
}
