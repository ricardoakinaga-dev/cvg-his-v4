import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

import {
  AuthService,
  buildAuthorizationUrl,
  exchangeCodeForTokens,
  fetchUserInfo,
  generatePKCE,
  type OIDCConfig
} from '@cvg-his-v2/module-auth';
import type { MfaService, WebAuthnService } from '@cvg-his-v2/module-mfa';
import { extractBearerToken } from '@cvg-his-v2/shared-auth-sdk';
import type {
  LoginRequest,
  LogoutRequest,
  RefreshSessionRequest
} from '@cvg-his-v2/shared-contracts';
import { toErrorResponse } from '@cvg-his-v2/shared-errors';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';

import { readJsonBody } from '../helpers/common.js';

type AuditAppender = (
  actorId: string,
  accountId: string,
  module: string,
  action: string,
  entityType: string,
  entityId: string,
  payloadSummary: string,
  riskLevel: 'low' | 'medium' | 'high',
  correlationId: string
) => void;

interface AuthRateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
  blocked: boolean;
  retryAfterMs: number;
}

interface AuthRateLimiter {
  check(input: { ip: string; route: string }): Promise<AuthRateLimitInfo>;
}

interface AuthLogger {
  error(message: string, context?: unknown): void;
}

interface OidcStateValue {
  codeChallenge: string;
  codeVerifier: string;
  redirectUri: string;
  createdAt: number;
}

export interface OidcStateStore {
  create(value: OidcStateValue): string;
  consume(state: string): OidcStateValue | null;
}

export function createInMemoryOidcStateStore(): OidcStateStore {
  const states = new Map<string, OidcStateValue>();

  return {
    create(value) {
      const state = Buffer.from(randomBytes(16).toString('hex')).toString('base64url');
      states.set(state, value);
      return state;
    },
    consume(state) {
      const value = states.get(state) ?? null;
      if (value) {
        states.delete(state);
      }
      return value;
    }
  };
}

function signOidcState(secret: string, payload: string): string {
  return createHmac('sha256', secret).update(payload).digest('base64url');
}

export function createStatelessOidcStateStore(secret: string): OidcStateStore {
  return {
    create(value) {
      const payload = Buffer.from(JSON.stringify(value)).toString('base64url');
      const signature = signOidcState(secret, payload);
      return `${payload}.${signature}`;
    },
    consume(state) {
      const separatorIndex = state.lastIndexOf('.');
      if (separatorIndex <= 0) {
        return null;
      }

      const payload = state.slice(0, separatorIndex);
      const signature = state.slice(separatorIndex + 1);
      const signatureBuffer = Buffer.from(signature);
      const expectedBuffer = Buffer.from(signOidcState(secret, payload));

      if (
        signatureBuffer.length !== expectedBuffer.length
        || !timingSafeEqual(signatureBuffer, expectedBuffer)
      ) {
        return null;
      }

      try {
        const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as OidcStateValue;
        if (
          typeof parsed.codeChallenge !== 'string'
          || typeof parsed.codeVerifier !== 'string'
          || typeof parsed.redirectUri !== 'string'
          || typeof parsed.createdAt !== 'number'
        ) {
          return null;
        }
        return parsed;
      } catch {
        return null;
      }
    }
  };
}

export interface AuthRoutesHandlers {
  auth: AuthService;
  authRateLimiter: AuthRateLimiter;
  logger: AuthLogger;
  appName: string;
  featureFlags: {
    authOidcEnabled: boolean;
    authWebauthnEnabled: boolean;
  };
  webauthnService?: WebAuthnService;
  webauthnChallenges: Map<string, string>;
  oidcConfig: OIDCConfig | null;
  oidcStateStore: OidcStateStore;
  oidcStateTtlMs: number;
  requirePrincipal: (request: IncomingMessage, permissionCode: string) => AuthenticatedPrincipal;
  appendAudit: AuditAppender;
}

function readHeader(request: IncomingMessage, headerName: string): string | undefined {
  const value = request.headers[headerName];
  return typeof value === 'string' ? value : undefined;
}

function sendJson(response: ServerResponse, statusCode: number, payload: unknown): true {
  response.statusCode = statusCode;
  response.setHeader('content-type', 'application/json');
  response.end(JSON.stringify(payload));
  return true;
}

function sendRateLimited(response: ServerResponse, rateLimitInfo: AuthRateLimitInfo): boolean {
  response.setHeader('X-RateLimit-Limit', String(rateLimitInfo.limit));
  response.setHeader('X-RateLimit-Remaining', String(rateLimitInfo.remaining));
  response.setHeader('X-RateLimit-Reset', String(rateLimitInfo.reset));

  if (!rateLimitInfo.blocked) {
    return false;
  }

  response.setHeader('Retry-After', String(Math.ceil(rateLimitInfo.retryAfterMs / 1000)));
  response.statusCode = 429;
  response.end(
    JSON.stringify({
      code: 'RATE_LIMITED',
      message: 'Too many requests. Please try again later.',
      retryAfterMs: rateLimitInfo.retryAfterMs
    })
  );
  return true;
}

function getClientIp(request: IncomingMessage): string {
  return request.headers['x-forwarded-for']?.toString().split(',')[0].trim()
    ?? request.socket.remoteAddress
    ?? 'unknown';
}

function getMfaService(auth: AuthService): MfaService | undefined {
  return auth.mfaService;
}

export async function handleAuthRoutes(
  pathname: string,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  handlers: AuthRoutesHandlers
): Promise<boolean> {
  const {
    auth,
    authRateLimiter,
    logger,
    appName,
    featureFlags,
    webauthnService,
    webauthnChallenges,
    oidcConfig,
    oidcStateStore,
    oidcStateTtlMs,
    requirePrincipal,
    appendAudit
  } = handlers;

  if (pathname === '/auth/session' && request.method === 'GET') {
    const principal = requirePrincipal(request, 'auth.session.read');
    appendAudit(
      principal.user.id,
      principal.user.accountId,
      'auth',
      'session_read',
      'session',
      principal.session.sessionId,
      'Current session inspected',
      'low',
      correlationId
    );
    return sendJson(response, 200, {
      session: principal.session,
      access: principal.access,
      principal
    });
  }

  if (pathname === '/auth/login' && request.method === 'POST') {
    const rateLimitInfo = await authRateLimiter.check({
      ip: getClientIp(request),
      route: '/auth/login'
    });
    if (sendRateLimited(response, rateLimitInfo)) {
      return true;
    }

    try {
      const payload = (await readJsonBody(request)) as LoginRequest;
      const session = await auth.login(payload, correlationId);
      return sendJson(response, 200, session);
    } catch (error) {
      logger.error('auth login failed', { correlationId, error });
      const errorResponse = toErrorResponse(error, correlationId);
      response.statusCode = errorResponse.statusCode;
      response.end(JSON.stringify(errorResponse.body));
      return true;
    }
  }

  if (pathname === '/auth/refresh' && request.method === 'POST') {
    const payload = (await readJsonBody(request)) as RefreshSessionRequest;
    const session = auth.refresh(payload, correlationId);
    return sendJson(response, 200, session);
  }

  if (pathname === '/auth/logout' && request.method === 'POST') {
    const payload = (await readJsonBody(request).catch(() => ({}))) as LogoutRequest;
    auth.logout(
      {
        refreshToken: payload.refreshToken,
        accessToken: extractBearerToken(readHeader(request, 'authorization'))
      },
      correlationId
    );
    response.statusCode = 204;
    response.end();
    return true;
  }

  if (pathname === '/auth/login/mfa' && request.method === 'POST') {
    const rateLimitInfo = await authRateLimiter.check({
      ip: getClientIp(request),
      route: '/auth/login/mfa'
    });
    if (sendRateLimited(response, rateLimitInfo)) {
      return true;
    }

    const payload = (await readJsonBody(request)) as { userId: string; token: string };
    const result = await auth.completeMfaLogin(
      { userId: payload.userId, token: payload.token },
      correlationId
    );
    return sendJson(response, 200, result);
  }

  if (pathname === '/mfa/setup' && request.method === 'POST') {
    const principal = requirePrincipal(request, 'auth.mfa.manage');
    const mfaService = getMfaService(auth);
    if (!mfaService) {
      return sendJson(response, 501, { code: 'NOT_IMPLEMENTED', message: 'MFA not configured' });
    }
    const setup = await mfaService.initiateSetup(
      principal.user.id,
      principal.user.email,
      appName
    );
    return sendJson(response, 200, setup);
  }

  if (pathname === '/mfa/setup/confirm' && request.method === 'POST') {
    const principal = requirePrincipal(request, 'auth.mfa.manage');
    const mfaService = getMfaService(auth);
    if (!mfaService) {
      return sendJson(response, 501, { code: 'NOT_IMPLEMENTED', message: 'MFA not configured' });
    }
    const payload = (await readJsonBody(request)) as { token: string };
    const record = await mfaService.confirmSetup(principal.user.id, payload.token);
    appendAudit(
      principal.user.id,
      principal.user.accountId,
      'auth',
      'mfa_setup_confirmed',
      'mfa',
      principal.user.id,
      'MFA TOTP setup confirmed',
      'high',
      correlationId
    );
    return sendJson(response, 200, { isActive: record.isActive });
  }

  if (pathname === '/mfa/status' && request.method === 'GET') {
    const principal = requirePrincipal(request, 'auth.mfa.read');
    const mfaService = getMfaService(auth);
    if (!mfaService) {
      return sendJson(response, 200, { isActive: false, isRequired: false });
    }
    const isActive = await mfaService.isMfaActive(principal.user.id);
    const isRequired = mfaService.isMfaRequired(principal.access.roleCodes);
    return sendJson(response, 200, { isActive, isRequired });
  }

  if (pathname === '/mfa/disable' && request.method === 'POST') {
    const principal = requirePrincipal(request, 'auth.mfa.manage');
    const mfaService = getMfaService(auth);
    if (!mfaService) {
      return sendJson(response, 501, { code: 'NOT_IMPLEMENTED', message: 'MFA not configured' });
    }
    const payload = (await readJsonBody(request)) as { token: string };
    await mfaService.disableMfa(principal.user.id, payload.token);
    appendAudit(
      principal.user.id,
      principal.user.accountId,
      'auth',
      'mfa_disabled',
      'mfa',
      principal.user.id,
      'MFA TOTP disabled',
      'high',
      correlationId
    );
    return sendJson(response, 200, { success: true });
  }

  if (pathname === '/mfa/recovery-codes/regenerate' && request.method === 'POST') {
    const principal = requirePrincipal(request, 'auth.mfa.manage');
    const mfaService = getMfaService(auth);
    if (!mfaService) {
      return sendJson(response, 501, { code: 'NOT_IMPLEMENTED', message: 'MFA not configured' });
    }
    const codes = await mfaService.regenerateRecoveryCodes(principal.user.id);
    return sendJson(response, 200, { recoveryCodes: codes });
  }

  if (pathname === '/auth/mfa/webauthn/setup' && request.method === 'GET') {
    const principal = requirePrincipal(request, 'auth.mfa.manage');
    if (!webauthnService) {
      return sendJson(response, 501, { code: 'NOT_IMPLEMENTED', message: 'WebAuthn not configured' });
    }
    if (!featureFlags.authWebauthnEnabled) {
      return sendJson(response, 403, { code: 'FLAG_DISABLED', message: 'WebAuthn is not enabled' });
    }
    const rpId = request.headers['x-rp-id']?.toString() ?? 'localhost';
    const { publicKeyOptions, challenge } = await webauthnService.generateRegistrationOptions(
      principal.user.id,
      {
        rpName: 'CVG-HIS-V2',
        rpId,
        userId: principal.user.id,
        userName: principal.user.email
      }
    );
    webauthnChallenges.set(`reg:${principal.user.id}`, challenge);
    return sendJson(response, 200, { publicKeyOptions, challenge });
  }

  if (pathname === '/auth/mfa/webauthn/setup' && request.method === 'POST') {
    const principal = requirePrincipal(request, 'auth.mfa.manage');
    if (!webauthnService) {
      return sendJson(response, 501, { code: 'NOT_IMPLEMENTED', message: 'WebAuthn not configured' });
    }
    if (!featureFlags.authWebauthnEnabled) {
      return sendJson(response, 403, { code: 'FLAG_DISABLED', message: 'WebAuthn is not enabled' });
    }
    const payload = (await readJsonBody(request)) as {
      credentialId: string;
      attestationObject: string;
      clientDataJSON: string;
    };
    const storedChallenge = webauthnChallenges.get(`reg:${principal.user.id}`);
    if (!storedChallenge) {
      return sendJson(response, 400, {
        code: 'INVALID_CHALLENGE',
        message: 'No pending WebAuthn registration'
      });
    }
    webauthnChallenges.delete(`reg:${principal.user.id}`);
    const result = await webauthnService.verifyRegistration(
      principal.user.id,
      {
        credentialId: payload.credentialId,
        attestationObject: payload.attestationObject,
        clientDataJSON: payload.clientDataJSON
      },
      storedChallenge
    );
    appendAudit(
      principal.user.id,
      principal.user.accountId,
      'auth',
      'webauthn_credential_registered',
      'webauthn',
      principal.user.id,
      `WebAuthn credential registered: ${result.credentialId}`,
      'high',
      correlationId
    );
    return sendJson(response, 200, { success: true, credentialId: result.credentialId });
  }

  if (pathname === '/auth/mfa/webauthn/authenticate' && request.method === 'POST') {
    const principal = requirePrincipal(request, 'auth.mfa.manage');
    if (!webauthnService) {
      return sendJson(response, 501, { code: 'NOT_IMPLEMENTED', message: 'WebAuthn not configured' });
    }
    if (!featureFlags.authWebauthnEnabled) {
      return sendJson(response, 403, { code: 'FLAG_DISABLED', message: 'WebAuthn is not enabled' });
    }
    const payload = (await readJsonBody(request)) as { credentialId?: string };
    const rpId = request.headers['x-rp-id']?.toString() ?? 'localhost';
    const { publicKeyOptions, challenge } = await webauthnService.generateAuthenticationOptions(
      principal.user.id,
      { rpId, timeout: 60000, userVerification: 'preferred' }
    );
    if (payload.credentialId) {
      (publicKeyOptions as Record<string, unknown>).allowCredentials = [
        { id: payload.credentialId, type: 'public-key' }
      ];
    }
    webauthnChallenges.set(`auth:${principal.user.id}`, challenge);
    return sendJson(response, 200, { publicKeyOptions, challenge });
  }

  if (pathname === '/auth/mfa/webauthn/assert' && request.method === 'POST') {
    const principal = requirePrincipal(request, 'auth.mfa.manage');
    if (!webauthnService) {
      return sendJson(response, 501, { code: 'NOT_IMPLEMENTED', message: 'WebAuthn not configured' });
    }
    if (!featureFlags.authWebauthnEnabled) {
      return sendJson(response, 403, { code: 'FLAG_DISABLED', message: 'WebAuthn is not enabled' });
    }
    const payload = (await readJsonBody(request)) as {
      credentialId: string;
      authenticatorData: string;
      clientDataJSON: string;
      signature: string;
      userHandle?: string;
    };
    const storedChallenge = webauthnChallenges.get(`auth:${principal.user.id}`);
    if (!storedChallenge) {
      return sendJson(response, 400, {
        code: 'INVALID_CHALLENGE',
        message: 'No pending WebAuthn assertion'
      });
    }
    webauthnChallenges.delete(`auth:${principal.user.id}`);
    const rpId = request.headers['x-rp-id']?.toString() ?? 'localhost';
    const result = await webauthnService.verifyAuthentication(
      payload.credentialId,
      {
        authenticatorData: payload.authenticatorData,
        clientDataJSON: payload.clientDataJSON,
        signature: payload.signature,
        userHandle: payload.userHandle
      },
      storedChallenge,
      rpId
    );
    if (!result.success) {
      return sendJson(response, 401, {
        code: 'AUTHENTICATION_FAILED',
        message: 'WebAuthn assertion failed'
      });
    }
    appendAudit(
      principal.user.id,
      principal.user.accountId,
      'auth',
      'webauthn_authenticated',
      'webauthn',
      principal.user.id,
      `WebAuthn authentication successful for credential: ${payload.credentialId}`,
      'medium',
      correlationId
    );
    return sendJson(response, 200, { success: true });
  }

  if (pathname === '/auth/oidc/login' && request.method === 'GET') {
    if (!oidcConfig) {
      return sendJson(response, 501, { code: 'NOT_CONFIGURED', message: 'OIDC not configured' });
    }
    if (!featureFlags.authOidcEnabled) {
      return sendJson(response, 403, { code: 'FLAG_DISABLED', message: 'OIDC login is not enabled' });
    }
    const redirectUri = request.headers['x-oidc-redirect-uri']?.toString() ?? oidcConfig.redirectUri;
    const pkce = generatePKCE();
    const state = oidcStateStore.create({
      codeChallenge: pkce.codeChallenge,
      codeVerifier: pkce.codeVerifier,
      redirectUri,
      createdAt: Date.now()
    });
    response.statusCode = 302;
    response.setHeader('Location', buildAuthorizationUrl(oidcConfig, state, pkce));
    response.end();
    return true;
  }

  if (pathname === '/auth/oidc/callback' && request.method === 'GET') {
    if (!oidcConfig) {
      return sendJson(response, 501, { code: 'NOT_CONFIGURED', message: 'OIDC not configured' });
    }
    if (!featureFlags.authOidcEnabled) {
      return sendJson(response, 403, { code: 'FLAG_DISABLED', message: 'OIDC login is not enabled' });
    }

    const url = new URL(request.url ?? '/', 'http://localhost');
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const errorParam = url.searchParams.get('error');

    if (errorParam) {
      const errorDescription = url.searchParams.get('error_description') ?? errorParam;
      return sendJson(response, 400, { code: 'OIDC_ERROR', message: errorDescription });
    }
    if (!code || !state) {
      return sendJson(response, 400, {
        code: 'INVALID_CALLBACK',
        message: 'Missing code or state'
      });
    }

    const storedState = oidcStateStore.consume(state);
    if (!storedState) {
      return sendJson(response, 400, {
        code: 'INVALID_STATE',
        message: 'OIDC state not found or expired'
      });
    }
    if (Date.now() - storedState.createdAt > oidcStateTtlMs) {
      return sendJson(response, 400, {
        code: 'STATE_EXPIRED',
        message: 'OIDC state has expired'
      });
    }
    try {
      const tokens = await exchangeCodeForTokens(oidcConfig, code, {
        codeVerifier: storedState.codeVerifier,
        codeChallenge: storedState.codeChallenge
      });
      let userInfo: unknown = null;
      if (tokens.accessToken && oidcConfig.userinfoEndpoint) {
        try {
          userInfo = await fetchUserInfo(oidcConfig, tokens.accessToken);
        } catch {
          userInfo = null;
        }
      }
      return sendJson(response, 200, { tokens, userInfo });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Token exchange failed';
      return sendJson(response, 502, { code: 'TOKEN_EXCHANGE_FAILED', message });
    }
  }

  if (pathname === '/auth/oidc/logout' && request.method === 'POST') {
    if (!oidcConfig) {
      return sendJson(response, 501, { code: 'NOT_CONFIGURED', message: 'OIDC not configured' });
    }
    const payload = (await readJsonBody(request).catch(() => ({}))) as { idTokenHint?: string };
    const params = new URLSearchParams();
    if (payload.idTokenHint) {
      params.set('id_token_hint', payload.idTokenHint);
    }
    if (oidcConfig.endSessionEndpoint) {
      response.statusCode = 302;
      response.setHeader('Location', `${oidcConfig.endSessionEndpoint}?${params.toString()}`);
      response.end();
      return true;
    }
    return sendJson(response, 200, {
      success: true,
      message: 'OIDC not configured for end-session'
    });
  }

  return false;
}
