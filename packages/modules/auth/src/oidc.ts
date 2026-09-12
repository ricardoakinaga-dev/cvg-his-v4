/**
 * OIDC/SSO Service — CVG-HIS-V2
 *
 * Implements OAuth 2.0 Authorization Code Flow with PKCE for SSO.
 * Supports generic OIDC providers (Keycloak, Auth0, Okta, Azure AD).
 *
 * Based on RFC 6749 + RFC 7636 (PKCE).
 */

import { randomBytes, createHash } from 'node:crypto';

export interface OIDCConfig {
  readonly issuer: string;
  readonly clientId: string;
  readonly clientSecret: string;
  readonly redirectUri: string;
  readonly scope: string;
  readonly authorizationEndpoint: string;
  readonly tokenEndpoint: string;
  readonly userinfoEndpoint?: string;
  readonly endSessionEndpoint?: string;
  readonly jwksUri?: string;
  readonly requestTimeoutMs?: number;
}

export interface PKCEPair {
  codeVerifier: string;
  codeChallenge: string;
}

export interface OIDCAuthorizationRequest {
  readonly state: string;
  readonly codeChallenge: string;
  readonly codeChallengeMethod: 'S256';
  readonly redirectUri: string;
  readonly scope: string;
  readonly clientId: string;
}

export interface OIDCTokenResponse {
  readonly accessToken: string;
  readonly idToken?: string;
  readonly refreshToken?: string;
  readonly tokenType: string;
  readonly expiresIn: number;
  readonly scope: string;
}

export interface OIDCTokenEndpointResponse {
  readonly access_token: string;
  readonly id_token?: string;
  readonly refresh_token?: string;
  readonly token_type: string;
  readonly expires_in: number;
  readonly scope?: string;
}

export type OIDCTokenExchangeErrorCode = 'TOKEN_ENDPOINT_ERROR' | 'INVALID_TOKEN_RESPONSE';

export class OIDCTokenExchangeError extends Error {
  override readonly name = 'OIDCTokenExchangeError';

  constructor(
    readonly code: OIDCTokenExchangeErrorCode,
    message: string
  ) {
    super(message);
  }
}

export interface OIDCUserInfo {
  readonly sub: string;
  readonly email?: string;
  readonly emailVerified?: boolean;
  readonly name?: string;
  readonly givenName?: string;
  readonly familyName?: string;
  readonly picture?: string;
  readonly locale?: string;
}

interface OIDCUserInfoEndpointResponse {
  readonly sub: string;
  readonly email?: string;
  readonly email_verified?: boolean;
  readonly name?: string;
  readonly given_name?: string;
  readonly family_name?: string;
  readonly picture?: string;
  readonly locale?: string;
}

const DEFAULT_OIDC_REQUEST_TIMEOUT_MS = 5_000;

function providerRequestSignal(config: OIDCConfig): AbortSignal {
  const timeoutMs = config.requestTimeoutMs ?? DEFAULT_OIDC_REQUEST_TIMEOUT_MS;
  if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 30_000) {
    throw new Error('OIDC request timeout must be an integer between 1 and 30000 milliseconds');
  }
  return AbortSignal.timeout(timeoutMs);
}

/**
 * Generate PKCE code verifier and challenge pair.
 * code_verifier = high-entropy cryptographic random string (43-128 chars)
 * code_challenge = BASE64URL(SHA256(code_verifier))
 */
export function generatePKCE(): PKCEPair {
  const verifier = randomBytes(64).toString('base64url');
  const hash = createHash('sha256').update(verifier).digest('base64url');
  return { codeVerifier: verifier, codeChallenge: hash };
}

/**
 * Build OIDC authorization URL.
 */
export function buildAuthorizationUrl(config: OIDCConfig, state: string, pkce: PKCEPair): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: config.scope,
    state,
    code_challenge: pkce.codeChallenge,
    code_challenge_method: 'S256'
  });

  return `${config.authorizationEndpoint}?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens.
 */
export async function exchangeCodeForTokens(
  config: OIDCConfig,
  code: string,
  pkce: PKCEPair
): Promise<OIDCTokenResponse> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    redirect_uri: config.redirectUri,
    code_verifier: pkce.codeVerifier
  });

  const response = await fetch(config.tokenEndpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json'
    },
    body: body.toString(),
    signal: providerRequestSignal(config)
  });

  if (!response.ok) {
    throw new OIDCTokenExchangeError(
      'TOKEN_ENDPOINT_ERROR',
      `OIDC token endpoint rejected the token exchange (${response.status})`
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new OIDCTokenExchangeError(
      'INVALID_TOKEN_RESPONSE',
      'OIDC token endpoint returned an invalid JSON response'
    );
  }

  return normalizeTokenEndpointResponse(payload, config.scope);
}

function normalizeTokenEndpointResponse(
  payload: unknown,
  requestedScope: string
): OIDCTokenResponse {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw invalidTokenResponse();
  }

  const wire = payload as Partial<Record<keyof OIDCTokenEndpointResponse, unknown>>;
  if (
    !isNonEmptyString(wire.access_token) ||
    !isNonEmptyString(wire.token_type) ||
    typeof wire.expires_in !== 'number' ||
    !Number.isInteger(wire.expires_in) ||
    wire.expires_in < 0 ||
    (wire.scope !== undefined && typeof wire.scope !== 'string') ||
    (wire.id_token !== undefined && typeof wire.id_token !== 'string') ||
    (wire.refresh_token !== undefined && typeof wire.refresh_token !== 'string')
  ) {
    throw invalidTokenResponse();
  }

  return {
    accessToken: wire.access_token,
    tokenType: wire.token_type,
    expiresIn: wire.expires_in,
    scope: wire.scope ?? requestedScope,
    ...(wire.id_token === undefined ? {} : { idToken: wire.id_token }),
    ...(wire.refresh_token === undefined ? {} : { refreshToken: wire.refresh_token })
  };
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function invalidTokenResponse(): OIDCTokenExchangeError {
  return new OIDCTokenExchangeError(
    'INVALID_TOKEN_RESPONSE',
    'OIDC token endpoint returned an invalid token response'
  );
}

/**
 * Fetch user info from OIDC provider.
 */
export async function fetchUserInfo(
  config: OIDCConfig,
  accessToken: string
): Promise<OIDCUserInfo> {
  if (!config.userinfoEndpoint) {
    throw new Error('userinfo endpoint not configured');
  }

  const response = await fetch(config.userinfoEndpoint, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json'
    },
    signal: providerRequestSignal(config)
  });

  if (!response.ok) {
    throw new Error(`UserInfo fetch failed: ${response.status}`);
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error('OIDC UserInfo endpoint returned an invalid JSON response');
  }
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('OIDC UserInfo endpoint returned an invalid response');
  }
  const wire = payload as Partial<Record<keyof OIDCUserInfoEndpointResponse, unknown>>;
  if (
    !isNonEmptyString(wire.sub)
    || (wire.email !== undefined && typeof wire.email !== 'string')
    || (wire.email_verified !== undefined && typeof wire.email_verified !== 'boolean')
    || (wire.name !== undefined && typeof wire.name !== 'string')
    || (wire.given_name !== undefined && typeof wire.given_name !== 'string')
    || (wire.family_name !== undefined && typeof wire.family_name !== 'string')
    || (wire.picture !== undefined && typeof wire.picture !== 'string')
    || (wire.locale !== undefined && typeof wire.locale !== 'string')
  ) {
    throw new Error('OIDC UserInfo endpoint returned an invalid response');
  }

  return {
    sub: wire.sub,
    ...(wire.email === undefined ? {} : { email: wire.email }),
    ...(wire.email_verified === undefined ? {} : { emailVerified: wire.email_verified }),
    ...(wire.name === undefined ? {} : { name: wire.name }),
    ...(wire.given_name === undefined ? {} : { givenName: wire.given_name }),
    ...(wire.family_name === undefined ? {} : { familyName: wire.family_name }),
    ...(wire.picture === undefined ? {} : { picture: wire.picture }),
    ...(wire.locale === undefined ? {} : { locale: wire.locale })
  };
}

/**
 * Validate that the OIDC configuration has all required fields.
 */
export function validateOIDCConfig(config: OIDCConfig): void {
  const required = [
    'issuer',
    'clientId',
    'clientSecret',
    'redirectUri',
    'authorizationEndpoint',
    'tokenEndpoint'
  ];

  for (const field of required) {
    if (!config[field as keyof OIDCConfig]) {
      throw new Error(`OIDC config missing required field: ${field}`);
    }
  }
}
