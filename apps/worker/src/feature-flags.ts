import {
  FeatureFlagRegistry,
  createEnvFeatureFlagProvider,
  normalizeFeatureFlagKeys,
  createCompositeFeatureFlagProviderWithMetrics,
  noOpFeatureFlagMetricsCollector,
  type EvaluationContext,
  type FeatureFlagMetricsCollector,
  type FlagDecision,
  type FlagDefinition
} from '@cvg-his-v2/shared-feature-flags';

export const WORKER_FEATURE_FLAG_DEFINITIONS: readonly FlagDefinition[] = [
  {
    key: 'runtime.distributed_state.enabled',
    owner: 'platform-runtime',
    description: 'Controls worker rollout of distributed runtime state beyond the auth limiter.',
    defaultValue: false,
    scopes: ['environment', 'account'],
    expiresAt: '2026-12-31T00:00:00.000Z',
    auditRequired: true,
    tags: ['runtime', 'worker', 'redis', 'rollout']
  },
  {
    key: 'notifications.whatsapp.provider_enabled',
    owner: 'notifications-platform',
    description: 'Controls worker-side rollout of WhatsApp provider-backed notification flows.',
    defaultValue: false,
    scopes: ['environment', 'account'],
    expiresAt: '2026-12-31T00:00:00.000Z',
    auditRequired: true,
    tags: ['notifications', 'whatsapp', 'worker', 'rollout']
  }
] as const;

export interface WorkerFeatureFlagsSnapshot {
  readonly providerName: string;
  readonly enabledKeys: readonly string[];
  readonly decisions: Readonly<Record<string, FlagDecision>>;
  readonly runtimeDistributedStateEnabled: boolean;
  readonly notificationsWhatsappProviderEnabled: boolean;
}

function createRegistry(): FeatureFlagRegistry {
  const registry = new FeatureFlagRegistry();
  registry.register(WORKER_FEATURE_FLAG_DEFINITIONS);
  return registry;
}

export function createWorkerFeatureFlags(params: {
  readonly environment: string;
  readonly enabledKeys: readonly string[];
  readonly metrics?: FeatureFlagMetricsCollector;
}): WorkerFeatureFlagsSnapshot {
  const registry = createRegistry();
  const baseProvider = createEnvFeatureFlagProvider(params.enabledKeys);
  const metrics = params.metrics ?? noOpFeatureFlagMetricsCollector;
  const provider = createCompositeFeatureFlagProviderWithMetrics({
    upstream: baseProvider,
    getRules: () => undefined,
    metrics
  });
  const context: EvaluationContext = {
    environment: params.environment
  };
  const decisions = Object.fromEntries(
    registry.list().map((definition) => [
      definition.key,
      provider.evaluate(definition, context) as FlagDecision
    ])
  ) as Readonly<Record<string, FlagDecision>>;
  const enabledKeys = normalizeFeatureFlagKeys(
    Object.values(decisions)
      .filter((decision) => decision.enabled)
      .map((decision) => decision.key)
  );

  return {
    providerName: provider.name,
    enabledKeys,
    decisions,
    runtimeDistributedStateEnabled:
      decisions['runtime.distributed_state.enabled']?.enabled ?? false,
    notificationsWhatsappProviderEnabled:
      decisions['notifications.whatsapp.provider_enabled']?.enabled ?? false
  };
}
