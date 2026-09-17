import { describe, expect, it, vi } from 'vitest';

import {
  API_FEATURE_FLAG_DEFINITIONS,
  createApiFeatureFlags
} from '../../../apps/api/src/feature-flags.ts';
import { createEnvFeatureFlagProvider } from '@cvg-his-v2/shared-feature-flags';

describe('api feature flags', () => {
  it('exposes the canonical rollout catalog for the API', () => {
    expect(API_FEATURE_FLAG_DEFINITIONS.map((flag) => flag.key)).toEqual([
      'auth.oidc.enabled',
      'auth.webauthn.enabled',
      'runtime.distributed_state.enabled',
      'fiscal.backoffice.enabled',
      'notifications.whatsapp.reminders.enabled',
      'notifications.whatsapp.inbound_actions.enabled',
      'ml.smart_scheduling.enabled',
      'ml.forecasting.enabled',
      'ml.anomaly_detection.enabled',
      'ml.ocr_fiscal.enabled'
    ]);
    expect(
      API_FEATURE_FLAG_DEFINITIONS.find((flag) => flag.key === 'runtime.distributed_state.enabled')
        ?.scopes
    ).toEqual(['environment']);
  });

  it('enables only explicit bootstrap flags by default', async () => {
    const flags = await createApiFeatureFlags({
      environment: 'staging',
      enabledKeys: ['auth.oidc.enabled']
    });

    expect(flags.providerName).toBe('env-bootstrap-with-rules');
    expect(flags.enabledKeys).toEqual(
      expect.arrayContaining([
        'auth.oidc.enabled',
        'ml.smart_scheduling.enabled',
        'ml.forecasting.enabled',
        'ml.anomaly_detection.enabled',
        'ml.ocr_fiscal.enabled'
      ])
    );
    expect(flags.authOidcEnabled).toBe(true);
    expect(flags.authWebauthnEnabled).toBe(false);
    expect(flags.runtimeDistributedStateEnabled).toBe(false);
    expect(flags.fiscalBackofficeEnabled).toBe(false);
    expect(flags.notificationsWhatsappRemindersEnabled).toBe(false);
    expect(flags.notificationsWhatsappInboundActionsEnabled).toBe(false);
    expect(flags.mlSmartSchedulingEnabled).toBe(true);
    expect(flags.mlForecastingEnabled).toBe(true);
    expect(flags.mlAnomalyDetectionEnabled).toBe(true);
    expect(flags.mlOcrFiscalEnabled).toBe(true);
  });

  it('normalizes bootstrap env keys before evaluation', () => {
    const provider = createEnvFeatureFlagProvider([
      ' AUTH.WEBAUTHN.ENABLED ',
      'auth.webauthn.enabled'
    ]);
    const decision = provider.evaluate(
      {
        key: 'auth.webauthn.enabled',
        owner: 'security-auth',
        description: 'Controls WebAuthn enrollment and assertion endpoints.',
        defaultValue: false,
        scopes: ['environment']
      },
      { environment: 'production' }
    );

    expect(decision.enabled).toBe(true);
    expect(decision.reason).toBe('bootstrap');
    expect(decision.provider).toBe('env-bootstrap');
  });

  it('fails closed for WebAuthn in production-like environments without a complete verifier', async () => {
    const flags = await createApiFeatureFlags({
      environment: 'production',
      enabledKeys: ['auth.webauthn.enabled']
    });

    expect(flags.authWebauthnEnabled).toBe(false);
    expect(flags.enabledKeys).not.toContain('auth.webauthn.enabled');
    const decision = await flags.evaluate?.('auth.webauthn.enabled', {
      environment: 'staging',
      accountId: '00000000-0000-4000-8000-0000000000aa',
      userId: '00000000-0000-4000-8000-0000000000ab'
    });
    expect(decision).toEqual(
      expect.objectContaining({
        enabled: false,
        reason: 'verifier_not_ready',
        metadata: expect.objectContaining({
          failureMode: 'fail_closed',
          requiredCapability: 'fido2_attestation_and_assertion_verifier'
        })
      })
    );
  });

  it('allows WebAuthn only when the complete verifier capability is explicitly declared', async () => {
    const flags = await createApiFeatureFlags({
      environment: 'production',
      enabledKeys: ['auth.webauthn.enabled'],
      webauthnVerifierReady: true
    });

    expect(flags.authWebauthnEnabled).toBe(true);
    expect(flags.enabledKeys).toContain('auth.webauthn.enabled');
  });

  it('maps multiple bootstrap rollouts into the snapshot booleans', async () => {
    const flags = await createApiFeatureFlags({
      environment: 'staging',
      enabledKeys: [
        'auth.oidc.enabled',
        'runtime.distributed_state.enabled',
        'notifications.whatsapp.reminders.enabled'
      ]
    });

    expect(flags.providerName).toBe('env-bootstrap-with-rules');
    expect(flags.authOidcEnabled).toBe(true);
    expect(flags.runtimeDistributedStateEnabled).toBe(true);
    expect(flags.notificationsWhatsappRemindersEnabled).toBe(true);
    expect(flags.notificationsWhatsappInboundActionsEnabled).toBe(false);
    expect(flags.mlSmartSchedulingEnabled).toBe(true);
    expect(flags.enabledKeys).toEqual(
      expect.arrayContaining([
        'auth.oidc.enabled',
        'runtime.distributed_state.enabled',
        'notifications.whatsapp.reminders.enabled',
        'ml.smart_scheduling.enabled'
      ])
    );
  });

  it('maps inbound WhatsApp bootstrap rollout into the snapshot booleans', async () => {
    const flags = await createApiFeatureFlags({
      environment: 'production',
      enabledKeys: ['notifications.whatsapp.inbound_actions.enabled']
    });

    expect(flags.authOidcEnabled).toBe(false);
    expect(flags.fiscalBackofficeEnabled).toBe(false);
    expect(flags.notificationsWhatsappInboundActionsEnabled).toBe(true);
    expect(flags.enabledKeys).toEqual(
      expect.arrayContaining([
        'notifications.whatsapp.inbound_actions.enabled',
        'ml.smart_scheduling.enabled',
        'ml.forecasting.enabled',
        'ml.anomaly_detection.enabled',
        'ml.ocr_fiscal.enabled'
      ])
    );
  });

  it('uses persisted overrides when account context is provided', async () => {
    const accountId = 'acc_flags_001' as never;
    const databaseProviderFactory = vi.fn((fallbackProvider) => ({
      name: 'database-repository',
      async evaluate(definition, context) {
        if (
          definition.key === 'fiscal.backoffice.enabled' &&
          context.accountId === accountId &&
          context.environment === 'production'
        ) {
          return {
            key: definition.key,
            enabled: true,
            reason: 'persisted_override',
            provider: 'database-repository'
          };
        }

        return fallbackProvider.evaluate(definition, context);
      }
    }));

    const flags = await createApiFeatureFlags({
      environment: 'production',
      enabledKeys: ['auth.oidc.enabled'],
      db: {} as never,
      accountId,
      databaseProviderFactory
    });

    expect(databaseProviderFactory).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'env-bootstrap' }),
      expect.objectContaining({ cacheTtlMs: 60_000 })
    );
    expect(flags.providerName).toBe('database-repository-with-rules');
    expect(flags.authOidcEnabled).toBe(true);
    expect(flags.fiscalBackofficeEnabled).toBe(true);
    expect(flags.enabledKeys).toEqual(
      expect.arrayContaining(['auth.oidc.enabled', 'fiscal.backoffice.enabled'])
    );
  });

  it('evaluates operational gates with the request context and authoritative environment', async () => {
    const accountId = '00000000-0000-4000-8000-0000000000aa';
    const databaseEvaluate = vi.fn();
    const databaseProviderFactory = vi.fn((fallbackProvider) => ({
      name: 'database-repository',
      evaluate: async (definition, context) => {
        databaseEvaluate(definition, context);
        const fallback = await fallbackProvider.evaluate(definition, context);
        if (
          definition.key === 'fiscal.backoffice.enabled' &&
          context.accountId === accountId &&
          context.environment === 'production'
        ) {
          return {
            ...(fallback ?? {}),
            key: definition.key,
            enabled: true,
            provider: 'database-repository',
            reason: 'persisted_override'
          };
        }
        return fallback;
      }
    }));

    const flags = await createApiFeatureFlags({
      environment: 'production',
      enabledKeys: [],
      db: {} as never,
      databaseProviderFactory
    });

    const decision = await flags.evaluate?.('fiscal.backoffice.enabled', {
      environment: 'staging',
      accountId,
      userId: '00000000-0000-4000-8000-0000000000ab'
    });

    expect(decision?.enabled).toBe(true);
    expect(databaseEvaluate).toHaveBeenLastCalledWith(
      expect.objectContaining({ key: 'fiscal.backoffice.enabled' }),
      expect.objectContaining({
        environment: 'production',
        accountId,
        userId: '00000000-0000-4000-8000-0000000000ab'
      })
    );
  });
});
