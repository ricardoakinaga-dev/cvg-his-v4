import {
  FeatureFlagRegistry,
  createEnvFeatureFlagProvider,
  normalizeFeatureFlagKeys,
  createCompositeFeatureFlagProviderWithMetrics,
  type EvaluationContext,
  type FeatureFlagMetricsCollector,
  type FeatureFlagProvider,
  type FlagDecision,
  type FlagDefinition
} from '@cvg-his-v2/shared-feature-flags';
import {
  createDatabaseFeatureFlagProvider
} from '@cvg-his-v2/module-feature-flags';
import { getDatabaseClient, type DatabaseClient } from '@cvg-his-v2/shared-database';

export const API_FEATURE_FLAG_DEFINITIONS: readonly FlagDefinition[] = [
  {
    key: 'auth.oidc.enabled',
    owner: 'security-auth',
    description: 'Controls OIDC login rollout in the API runtime.',
    defaultValue: false,
    scopes: ['environment', 'account'],
    expiresAt: '2026-12-31T00:00:00.000Z',
    auditRequired: true,
    tags: ['auth', 'oidc', 'rollout']
  },
  {
    key: 'auth.webauthn.enabled',
    owner: 'security-auth',
    description: 'Controls WebAuthn enrollment and assertion endpoints.',
    defaultValue: false,
    scopes: ['environment', 'account'],
    expiresAt: '2026-12-31T00:00:00.000Z',
    auditRequired: true,
    tags: ['auth', 'mfa', 'webauthn', 'rollout']
  },
  {
    key: 'runtime.distributed_state.enabled',
    owner: 'platform-runtime',
    description: 'Controls rollout of distributed runtime state beyond the auth limiter.',
    defaultValue: false,
    scopes: ['environment', 'account'],
    expiresAt: '2026-12-31T00:00:00.000Z',
    auditRequired: true,
    tags: ['runtime', 'redis', 'rollout']
  },
  {
    key: 'fiscal.backoffice.enabled',
    owner: 'erp-fiscal',
    description: 'Controls rollout of fiscal backoffice write paths.',
    defaultValue: false,
    scopes: ['environment', 'account'],
    expiresAt: '2026-12-31T00:00:00.000Z',
    auditRequired: true,
    tags: ['fiscal', 'erp', 'rollout']
  },
  {
    key: 'notifications.whatsapp.reminders.enabled',
    owner: 'platform-notifications',
    description: 'Controls automatic WhatsApp reminders triggered by appointment scheduling.',
    defaultValue: false,
    scopes: ['environment', 'account'],
    expiresAt: '2026-12-31T00:00:00.000Z',
    auditRequired: true,
    tags: ['notifications', 'whatsapp', 'scheduling', 'rollout']
  },
  {
    key: 'notifications.whatsapp.inbound_actions.enabled',
    owner: 'platform-notifications',
    description: 'Controls inbound WhatsApp actions that mutate appointment state.',
    defaultValue: false,
    scopes: ['environment', 'account'],
    expiresAt: '2026-12-31T00:00:00.000Z',
    auditRequired: true,
    tags: ['notifications', 'whatsapp', 'webhook', 'rollout']
  }
] as const;

export interface ApiFeatureFlagsSnapshot {
  readonly providerName: string;
  readonly enabledKeys: readonly string[];
  readonly decisions: Readonly<Record<string, FlagDecision>>;
  readonly authOidcEnabled: boolean;
  readonly authWebauthnEnabled: boolean;
  readonly runtimeDistributedStateEnabled: boolean;
  readonly fiscalBackofficeEnabled: boolean;
  readonly notificationsWhatsappRemindersEnabled: boolean;
  readonly notificationsWhatsappInboundActionsEnabled: boolean;
  readonly provider: FeatureFlagProvider;
}

function createRegistry(): FeatureFlagRegistry {
  const registry = new FeatureFlagRegistry();
  registry.register(API_FEATURE_FLAG_DEFINITIONS);
  return registry;
}

export async function createApiFeatureFlags(params: {
  readonly environment: string;
  readonly enabledKeys: readonly string[];
  readonly db?: DatabaseClient;
  readonly metrics?: FeatureFlagMetricsCollector;
}): Promise<ApiFeatureFlagsSnapshot> {
  const registry = createRegistry();

  // Bootstrap provider: env-based (static flags from env vars)
  const envProvider = createEnvFeatureFlagProvider(params.enabledKeys);

  // Upstream chain: database → env (database is primary, env is fallback)
  const upstreamProvider: FeatureFlagProvider = params.db
    ? createDatabaseFeatureFlagProvider(envProvider, {
        metrics: params.metrics,
        cacheTtlMs: 60_000
      })
    : envProvider;

  // Wrap with metrics + rules layer
  const provider = createCompositeFeatureFlagProviderWithMetrics({
    upstream: upstreamProvider,
    getRules: () => undefined, // no runtime rules — overrides come from DB
    metrics: params.metrics
  });

  const context: EvaluationContext = {
    environment: params.environment
  };
  const decisionEntries = await Promise.all(
    registry.list().map(async (definition: FlagDefinition) => [
      definition.key,
      await provider.evaluate(definition, context)
    ])
  );
  const decisions = Object.fromEntries(decisionEntries) as Readonly<Record<string, FlagDecision>>;
  const enabledKeys = normalizeFeatureFlagKeys(
    Object.values(decisions)
      .filter((decision) => decision.enabled)
      .map((decision) => decision.key)
  );

  return {
    providerName: provider.name,
    enabledKeys,
    decisions,
    authOidcEnabled: decisions['auth.oidc.enabled']?.enabled ?? false,
    authWebauthnEnabled: decisions['auth.webauthn.enabled']?.enabled ?? false,
    runtimeDistributedStateEnabled:
      decisions['runtime.distributed_state.enabled']?.enabled ?? false,
    fiscalBackofficeEnabled: decisions['fiscal.backoffice.enabled']?.enabled ?? false,
    notificationsWhatsappRemindersEnabled:
      decisions['notifications.whatsapp.reminders.enabled']?.enabled ?? false,
    notificationsWhatsappInboundActionsEnabled:
      decisions['notifications.whatsapp.inbound_actions.enabled']?.enabled ?? false,
    provider
  };
}
