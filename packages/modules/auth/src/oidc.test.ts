import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  buildAuthorizationUrl,
  exchangeCodeForTokens,
  fetchUserInfo,
  generatePKCE,
  OIDCTokenExchangeError,
  type OIDCConfig,
  validateOIDCConfig
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

  it('normalizes every supported optional claim', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          sub: 'subject-all-claims',
          email: 'person@example.com',
          email_verified: false,
          name: 'Ada Lovelace',
          given_name: 'Ada',
          family_name: 'Lovelace',
          picture: 'https://example.com/avatar.png',
          locale: 'en-US'
        }),
        { status: 200, headers: { 'content-type': 'application/json' } }
      )
    );

    await expect(fetchUserInfo(config, 'access-token')).resolves.toEqual({
      sub: 'subject-all-claims',
      email: 'person@example.com',
      emailVerified: false,
      name: 'Ada Lovelace',
      givenName: 'Ada',
      familyName: 'Lovelace',
      picture: 'https://example.com/avatar.png',
      locale: 'en-US'
    });
  });

  it('rejects missing, failed, malformed, and non-object UserInfo responses', async () => {
    await expect(
      fetchUserInfo({ ...config, userinfoEndpoint: undefined }, 'access-token')
    ).rejects.toThrow('userinfo endpoint not configured');

    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response('unavailable', { status: 503 }));
    await expect(fetchUserInfo(config, 'access-token')).rejects.toThrow('UserInfo fetch failed: 503');

    vi.mocked(fetch).mockResolvedValueOnce(new Response('{', { status: 200 }));
    await expect(fetchUserInfo(config, 'access-token')).rejects.toThrow('invalid JSON response');

    for (const payload of [
      null,
      [],
      { sub: 'subject', email: 42 },
      { sub: 'subject', email_verified: 'yes' },
      { sub: 'subject', name: 42 },
      { sub: 'subject', given_name: 42 },
      { sub: 'subject', family_name: 42 },
      { sub: 'subject', picture: 42 },
      { sub: 'subject', locale: 42 }
    ]) {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify(payload), {
          status: 200,
          headers: { 'content-type': 'application/json' }
        })
      );
      await expect(fetchUserInfo(config, 'access-token')).rejects.toThrow('invalid response');
    }
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

  it('uses the requested scope when the provider omits scope and preserves optional token absence', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          access_token: 'access-token',
          token_type: 'Bearer',
          expires_in: 0
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
      tokenType: 'Bearer',
      expiresIn: 0,
      scope: config.scope
    });
  });

  it('rejects provider HTTP failures, invalid JSON, invalid timeout, and malformed token shapes', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response('failed', { status: 400 }));
    await expect(
      exchangeCodeForTokens(config, 'authorization-code', {
        codeVerifier: 'code-verifier',
        codeChallenge: 'code-challenge'
      })
    ).rejects.toMatchObject({
      code: 'TOKEN_ENDPOINT_ERROR',
      message: expect.stringContaining('400')
    });

    vi.mocked(fetch).mockResolvedValueOnce(new Response('{', { status: 200 }));
    await expect(
      exchangeCodeForTokens(config, 'authorization-code', {
        codeVerifier: 'code-verifier',
        codeChallenge: 'code-challenge'
      })
    ).rejects.toMatchObject({ code: 'INVALID_TOKEN_RESPONSE' });

    await expect(
      exchangeCodeForTokens({ ...config, requestTimeoutMs: 0 }, 'authorization-code', {
        codeVerifier: 'code-verifier',
        codeChallenge: 'code-challenge'
      })
    ).rejects.toThrow('timeout must be an integer');

    const malformedPayloads = [
      null,
      [],
      { access_token: '', token_type: 'Bearer', expires_in: 3600 },
      { access_token: 'access-token', token_type: '', expires_in: 3600 },
      { access_token: 'access-token', token_type: 'Bearer', expires_in: 1.5 },
      { access_token: 'access-token', token_type: 'Bearer', expires_in: -1 },
      { access_token: 'access-token', token_type: 'Bearer', expires_in: 3600, scope: 42 },
      { access_token: 'access-token', token_type: 'Bearer', expires_in: 3600, id_token: 42 },
      { access_token: 'access-token', token_type: 'Bearer', expires_in: 3600, refresh_token: 42 }
    ];
    for (const payload of malformedPayloads) {
      vi.mocked(fetch).mockResolvedValueOnce(
        new Response(JSON.stringify(payload), {
          status: 200,
          headers: { 'content-type': 'application/json' }
        })
      );
      await expect(
        exchangeCodeForTokens(config, 'authorization-code', {
          codeVerifier: 'code-verifier',
          codeChallenge: 'code-challenge'
        })
      ).rejects.toMatchObject({ code: 'INVALID_TOKEN_RESPONSE' });
    }
  });
});

describe('OIDC helpers', () => {
  it('generates RFC 7636 PKCE material and serializes authorization parameters', () => {
    const pkce = generatePKCE();
    expect(pkce.codeVerifier.length).toBeGreaterThanOrEqual(43);
    expect(pkce.codeVerifier.length).toBeLessThanOrEqual(128);
    expect(pkce.codeChallenge).toMatch(/^[A-Za-z0-9_-]+$/);

    const authorizationUrl = buildAuthorizationUrl(config, 'state-value', pkce);
    const parsed = new URL(authorizationUrl);
    expect(parsed.searchParams.get('response_type')).toBe('code');
    expect(parsed.searchParams.get('client_id')).toBe(config.clientId);
    expect(parsed.searchParams.get('redirect_uri')).toBe(config.redirectUri);
    expect(parsed.searchParams.get('scope')).toBe(config.scope);
    expect(parsed.searchParams.get('state')).toBe('state-value');
    expect(parsed.searchParams.get('code_challenge')).toBe(pkce.codeChallenge);
    expect(parsed.searchParams.get('code_challenge_method')).toBe('S256');
  });

  it('validates every required OIDC configuration field', () => {
    expect(() => validateOIDCConfig(config)).not.toThrow();
    for (const field of [
      'issuer',
      'clientId',
      'clientSecret',
      'redirectUri',
      'authorizationEndpoint',
      'tokenEndpoint'
    ] as const) {
      expect(() => validateOIDCConfig({ ...config, [field]: '' })).toThrow(
        `OIDC config missing required field: ${field}`
      );
    }
  });
});
