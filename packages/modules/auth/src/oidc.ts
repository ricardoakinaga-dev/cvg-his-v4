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
export function buildAuthorizationUrl(
  config: OIDCConfig,
  state: string,
  pkce: PKCEPair
): string {
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
    body: body.toString()
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${response.status} ${error}`);
  }

  return response.json() as Promise<OIDCTokenResponse>;
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
    }
  });

  if (!response.ok) {
    throw new Error(`UserInfo fetch failed: ${response.status}`);
  }

  return response.json() as Promise<OIDCUserInfo>;
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
