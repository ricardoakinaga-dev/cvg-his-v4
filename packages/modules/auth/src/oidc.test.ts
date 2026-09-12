import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  exchangeCodeForTokens,
  fetchUserInfo,
  OIDCTokenExchangeError,
  type OIDCConfig
} from './oidc.js';

const config: OIDCConfig = {
  issuer: 'https://issuer.example.com',
  clientId: 'client-id',
  clientSecret: 'client-secret',
  redirectUri: 'https://app.example.com/auth/callback',
  scope: 'openid profile email',
  authorizationEndpoint: 'https://issuer.example.com/auth',
  tokenEndpoint: 'https://issuer.example.com/token',
  userinfoEndpoint: 'https://issuer.example.com/userinfo'
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('fetchUserInfo', () => {
  it('bounds the provider call and normalizes validated OIDC claims', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          sub: 'subject-1',
          email: 'person@example.com',
          email_verified: true,
          given_name: 'Ada',
          family_name: 'Lovelace'
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    );

    await expect(fetchUserInfo(config, 'access-token')).resolves.toEqual({
      sub: 'subject-1',
      email: 'person@example.com',
      emailVerified: true,
      givenName: 'Ada',
      familyName: 'Lovelace'
    });
    expect(fetchMock.mock.calls[0]?.[1]?.signal).toBeInstanceOf(AbortSignal);
  });

  it('rejects malformed claims without reflecting provider data', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ sub: '', email: 'must-not-leak@example.com' }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      })
    );

    const error = await fetchUserInfo(config, 'access-token').catch((caught: unknown) => caught);
    expect(String(error)).toContain('invalid response');
    expect(String(error)).not.toContain('must-not-leak');
  });
});

describe('exchangeCodeForTokens', () => {
  it('normalizes the OAuth token endpoint snake_case payload', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: 'access-token',
          id_token: 'id-token',
          refresh_token: 'refresh-token',
          token_type: 'Bearer',
          expires_in: 3600,
          scope: 'openid profile email'
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    );

    await expect(
      exchangeCodeForTokens(config, 'authorization-code', {
        codeVerifier: 'code-verifier',
        codeChallenge: 'code-challenge'
      })
    ).resolves.toEqual({
      accessToken: 'access-token',
      idToken: 'id-token',
      refreshToken: 'refresh-token',
      tokenType: 'Bearer',
      expiresIn: 3600,
      scope: 'openid profile email'
    });
  });

  it('rejects malformed token payloads without exposing their contents', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ refresh_token: 'must-not-leak' }), {
        status: 200,
        headers: { 'content-type': 'application/json' }
      })
    );

    const error = await exchangeCodeForTokens(config, 'authorization-code', {
      codeVerifier: 'code-verifier',
      codeChallenge: 'code-challenge'
    }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(OIDCTokenExchangeError);
    expect(error).toMatchObject({ code: 'INVALID_TOKEN_RESPONSE' });
    expect(String(error)).not.toContain('must-not-leak');
  });
});
