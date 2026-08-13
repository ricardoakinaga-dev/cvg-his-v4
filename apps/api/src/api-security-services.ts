import {
  AbacEngine,
  type ActorAttributes,
  type EnvironmentAttributes,
  type ResourceAttributes
} from '@cvg-his-v2/module-access-control';
import { DatabaseFeatureFlagRepository } from '@cvg-his-v2/module-feature-flags';
import { InMemoryWebAuthnRepository, WebAuthnServiceImpl } from '@cvg-his-v2/module-mfa';
import {
  AccessReviewControlService,
  DisasterRecoveryControlService,
  IncidentResponseControlService,
  MfaControlService,
  VulnerabilityControlService
} from '@cvg-his-v2/module-soc2';
import type { OIDCConfig } from '@cvg-his-v2/module-auth';
import {
  createInMemoryOidcStateStore,
  createStatelessOidcStateStore
} from './routes/auth-routes.js';

export const WEBAUTHN_CHALLENGE_TTL_MS = 5 * 60 * 1000;
export const OIDC_STATE_TTL_MS = 10 * 60 * 1000;

export interface ApiSecurityServices {
  readonly abacEngine: AbacEngine;
  readonly featureFlagRepository: DatabaseFeatureFlagRepository;
  readonly webauthnService: WebAuthnServiceImpl;
  readonly webauthnChallenges: Map<string, { readonly challenge: string; readonly createdAt: number }>;
  readonly oidcStateStore: ReturnType<typeof createInMemoryOidcStateStore>;
  readonly oidcStateTtlMs: number;
  readonly webauthnChallengeTtlMs: number;
  readonly oidcConfig: OIDCConfig | null;
  readonly soc2MfaControl: MfaControlService;
  readonly soc2VulnControl: VulnerabilityControlService;
  readonly soc2AccessControl: AccessReviewControlService;
  readonly soc2DrControl: DisasterRecoveryControlService;
  readonly soc2IncidentControl: IncidentResponseControlService;
}

function resolveOidcConfig(): OIDCConfig | null {
  const issuer = process.env['OIDC_ISSUER'];
  const clientId = process.env['OIDC_CLIENT_ID'];
  const clientSecret = process.env['OIDC_CLIENT_SECRET'];
  const redirectUri = process.env['OIDC_REDIRECT_URI'];
  if (!issuer || !clientId || !clientSecret || !redirectUri) {
    return null;
  }

  return {
    issuer,
    clientId,
    clientSecret,
    redirectUri,
    scope: 'openid profile email',
    authorizationEndpoint: `${issuer}/protocol/openid-connect/auth`,
    tokenEndpoint: `${issuer}/protocol/openid-connect/token`,
    userinfoEndpoint: `${issuer}/protocol/openid-connect/userinfo`,
    endSessionEndpoint: `${issuer}/protocol/openid-connect/logout`
  };
}

export function createApiSecurityServices(options: {
  readonly authSecret: string;
  readonly runtimeDistributedStateEnabled: boolean;
}): ApiSecurityServices {
  return {
    abacEngine: new AbacEngine(),
    featureFlagRepository: new DatabaseFeatureFlagRepository(),
    webauthnService: new WebAuthnServiceImpl(new InMemoryWebAuthnRepository()),
    webauthnChallenges: new Map(),
    oidcStateStore: options.runtimeDistributedStateEnabled
      ? createStatelessOidcStateStore(options.authSecret)
      : createInMemoryOidcStateStore(),
    oidcStateTtlMs: OIDC_STATE_TTL_MS,
    webauthnChallengeTtlMs: WEBAUTHN_CHALLENGE_TTL_MS,
    oidcConfig: resolveOidcConfig(),
    soc2MfaControl: new MfaControlService({
      requiredForRoles: ['admin', 'finance'],
      requiredForApiKeys: true,
      failedLoginLockoutAttempts: 5,
      lockoutDurationMinutes: 15,
      sessionTimeoutMinutes: 30
    }),
    soc2VulnControl: new VulnerabilityControlService(),
    soc2AccessControl: new AccessReviewControlService(),
    soc2DrControl: new DisasterRecoveryControlService(),
    soc2IncidentControl: new IncidentResponseControlService()
  };
}

export type { ActorAttributes, EnvironmentAttributes, ResourceAttributes };
