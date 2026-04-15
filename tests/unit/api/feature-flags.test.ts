import { describe, expect, it } from 'vitest';

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
      'notifications.whatsapp.inbound_actions.enabled'
    ]);
  });

  it('enables only explicit bootstrap flags by default', async () => {
    const flags = await createApiFeatureFlags({
      environment: 'staging',
      enabledKeys: ['auth.oidc.enabled']
    });

    expect(flags.providerName).toBe('env-bootstrap-with-rules');
    expect(flags.enabledKeys).toEqual(['auth.oidc.enabled']);
    expect(flags.authOidcEnabled).toBe(true);
    expect(flags.authWebauthnEnabled).toBe(false);
    expect(flags.runtimeDistributedStateEnabled).toBe(false);
    expect(flags.fiscalBackofficeEnabled).toBe(false);
    expect(flags.notificationsWhatsappRemindersEnabled).toBe(false);
    expect(flags.notificationsWhatsappInboundActionsEnabled).toBe(false);
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
});
