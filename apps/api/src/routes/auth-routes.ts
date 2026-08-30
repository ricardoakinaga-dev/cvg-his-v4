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
import type {
  MfaService,
  WebAuthnChallengeKey,
  WebAuthnChallengeStore,
  WebAuthnService
} from '@cvg-his-v2/module-mfa';
import { extractBearerToken } from '@cvg-his-v2/shared-auth-sdk';
import type {
  AuthSessionResponse,
  BrowserAuthSessionResponse,
  LoginRequest,
  LogoutRequest,
  RefreshSessionRequest,
  SessionListResponse
} from '@cvg-his-v2/shared-contracts';
import { AppError, toErrorResponse, ValidationError } from '@cvg-his-v2/shared-errors';
import type { AuthenticatedPrincipal, SessionSummary } from '@cvg-his-v2/shared-types';
import { requireNonEmptyString } from '@cvg-his-v2/shared-validation';

import { readJsonBody, validateRequestBody } from '../helpers/common.js';

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
  check(input: {
    ip: string;
    route: string;
    accountId?: string;
    userId?: string;
    tenantId?: string;
  }): Promise<AuthRateLimitInfo>;
}

interface AuthLogger {
  error(message: string, context?: unknown): void;
}

const MAX_RATE_LIMIT_DIMENSION_LENGTH = 256;
const MAX_LOGIN_USERNAME_LENGTH = 128;
const MAX_LOGIN_PASSWORD_LENGTH = 128;
const MAX_LOGIN_ACCOUNT_ID_LENGTH = 255;
const MAX_MFA_USER_ID_LENGTH = 128;
const MAX_MFA_TOKEN_LENGTH = 128;
const MAX_MFA_CHALLENGE_ID_LENGTH = 512;

function isJsonObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseLoginRequest(payload: unknown, correlationId: string): LoginRequest {
  if (!isJsonObject(payload)) {
    throw new ValidationError('Request body must be a JSON object', { correlationId });
  }

  validateRequestBody(
    payload,
    {
      username: {
        type: 'string',
        required: true,
        minLength: 1,
        maxLength: MAX_LOGIN_USERNAME_LENGTH
      },
      password: {
        type: 'string',
        required: true,
        minLength: 1,
        maxLength: MAX_LOGIN_PASSWORD_LENGTH
      },
      accountId: {
        type: 'string',
        minLength: 1,
        maxLength: MAX_LOGIN_ACCOUNT_ID_LENGTH
      }
    },
    correlationId
  );

  const username = requireNonEmptyString(payload.username, 'username');
  const password = requireNonEmptyString(payload.password, 'password');
  const accountId =
    payload.accountId === undefined
      ? undefined
      : requireNonEmptyString(payload.accountId, 'accountId');

  return {
    username,
    password,
    ...(accountId === undefined ? {} : { accountId })
  };
}

interface MfaLoginRouteRequest {
  readonly userId: string;
  readonly token: string;
  readonly challengeId: string;
}

function parseMfaLoginRequest(payload: unknown, correlationId: string): MfaLoginRouteRequest {
  if (!isJsonObject(payload)) {
    throw new ValidationError('Request body must be a JSON object', { correlationId });
  }

  validateRequestBody(
    payload,
    {
      userId: {
        type: 'string',
        required: true,
        minLength: 1,
        maxLength: MAX_MFA_USER_ID_LENGTH
      },
      token: {
        type: 'string',
        required: true,
        minLength: 1,
        maxLength: MAX_MFA_TOKEN_LENGTH
      },
      challengeId: {
        type: 'string',
        required: true,
        minLength: 1,
        maxLength: MAX_MFA_CHALLENGE_ID_LENGTH
      }
    },
    correlationId
  );

  return {
    userId: requireNonEmptyString(payload.userId, 'userId'),
    token: requireNonEmptyString(payload.token, 'token'),
    challengeId: requireNonEmptyString(payload.challengeId, 'challengeId')
  };
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

interface WebAuthnChallengeValue {
  challenge: string;
  createdAt: number;
}

function createWebAuthnChallengeValue(challenge: string): WebAuthnChallengeValue {
  return {
    challenge,
    createdAt: Date.now()
  };
}

function consumeWebAuthnChallenge(
  store: Map<string, WebAuthnChallengeValue>,
  key: string,
  ttlMs: number
):
  | { ok: true; challenge: string }
  | { ok: false; code: 'INVALID_CHALLENGE' | 'CHALLENGE_EXPIRED'; message: string } {
  const stored = store.get(key);
  if (!stored) {
    return {
      ok: false,
      code: 'INVALID_CHALLENGE',
      message: 'No pending WebAuthn challenge'
    };
  }

  store.delete(key);
  if (Date.now() - stored.createdAt > ttlMs) {
    return {
      ok: false,
      code: 'CHALLENGE_EXPIRED',
      message: 'WebAuthn challenge has expired'
    };
  }

  return { ok: true, challenge: stored.challenge };
}

function createWebAuthnChallengeKey(
  accountId: string,
  userId: string,
  purpose: WebAuthnChallengeKey['purpose']
): WebAuthnChallengeKey {
  return { accountId, userId, purpose };
}

async function issueWebAuthnChallenge(
  challengeStore: WebAuthnChallengeStore | undefined,
  fallback: Map<string, WebAuthnChallengeValue>,
  fallbackKey: string,
  key: WebAuthnChallengeKey,
  challenge: string,
  ttlMs: number
): Promise<void> {
  if (challengeStore) {
    await challengeStore.issue({ key, challenge, ttlMs });
    return;
  }

  fallback.set(fallbackKey, createWebAuthnChallengeValue(challenge));
}

async function consumeStoredWebAuthnChallenge(
  challengeStore: WebAuthnChallengeStore | undefined,
  fallback: Map<string, WebAuthnChallengeValue>,
  fallbackKey: string,
  key: WebAuthnChallengeKey,
  ttlMs: number
): Promise<
  | { ok: true; challenge: string }
  | { ok: false; code: 'INVALID_CHALLENGE' | 'CHALLENGE_EXPIRED'; message: string }
> {
  if (challengeStore) {
    return challengeStore.consume(key);
  }

  return consumeWebAuthnChallenge(fallback, fallbackKey, ttlMs);
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
        signatureBuffer.length !== expectedBuffer.length ||
        !timingSafeEqual(signatureBuffer, expectedBuffer)
      ) {
        return null;
      }

      try {
        const parsed = JSON.parse(
          Buffer.from(payload, 'base64url').toString('utf8')
        ) as OidcStateValue;
        if (
          typeof parsed.codeChallenge !== 'string' ||
          typeof parsed.codeVerifier !== 'string' ||
          typeof parsed.redirectUri !== 'string' ||
          typeof parsed.createdAt !== 'number'
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
  webauthnChallengeStore?: WebAuthnChallengeStore;
  webauthnChallenges: Map<string, WebAuthnChallengeValue>;
  webauthnChallengeTtlMs: number;
  oidcConfig: OIDCConfig | null;
  oidcStateStore: OidcStateStore;
  oidcStateTtlMs: number;
  refreshCookieMaxAgeSeconds?: number;
  secureCookies?: boolean;
  /** Browser origins allowed to send cookie-backed session mutations. */
  csrfAllowedOrigins?: readonly string[];
  trustedProxyCidrs?: readonly string[];
  requirePrincipal: (
    request: IncomingMessage,
    permissionCode: string
  ) => AuthenticatedPrincipal | PromiseLike<AuthenticatedPrincipal>;
  appendAudit: AuditAppender;
}

export const REFRESH_SESSION_COOKIE_NAME = 'cvg_his_refresh';
const DEFAULT_REFRESH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

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

function appendSetCookie(response: ServerResponse, value: string): void {
  const current = response.getHeader('set-cookie');
  const existing = Array.isArray(current)
    ? current.map(String)
    : current === undefined
      ? []
      : [String(current)];
  response.setHeader('set-cookie', [...existing, value]);
}

function serializeRefreshCookie(
  token: string | null,
  maxAgeSeconds: number,
  secure: boolean
): string {
  const attributes = [
    `${REFRESH_SESSION_COOKIE_NAME}=${token ? encodeURIComponent(token) : ''}`,
    `Max-Age=${token ? Math.max(0, Math.floor(maxAgeSeconds)) : 0}`,
    'Path=/api',
    'HttpOnly',
    'SameSite=Strict'
  ];
  if (secure) {
    attributes.push('Secure');
  }
  if (!token) {
    attributes.push('Expires=Thu, 01 Jan 1970 00:00:00 GMT');
  }
  return attributes.join('; ');
}

function setRefreshCookie(
  response: ServerResponse,
  token: string | null,
  handlers: Pick<AuthRoutesHandlers, 'refreshCookieMaxAgeSeconds' | 'secureCookies'>
): void {
  appendSetCookie(
    response,
    serializeRefreshCookie(
      token,
      handlers.refreshCookieMaxAgeSeconds ?? DEFAULT_REFRESH_COOKIE_MAX_AGE_SECONDS,
      handlers.secureCookies ?? process.env.NODE_ENV === 'production'
    )
  );
}

function readCookie(request: IncomingMessage, name: string): string | undefined {
  const header = request.headers.cookie;
  if (typeof header !== 'string') {
    return undefined;
  }

  for (const part of header.split(';')) {
    const separatorIndex = part.indexOf('=');
    if (separatorIndex <= 0) {
      continue;
    }
    const key = part.slice(0, separatorIndex).trim();
    if (key !== name) {
      continue;
    }
    const rawValue = part.slice(separatorIndex + 1).trim();
    try {
      return decodeURIComponent(rawValue);
    } catch {
      return undefined;
    }
  }

  return undefined;
}

function isAllowedCookieOrigin(
  request: IncomingMessage,
  allowedOrigins: readonly string[] | undefined
): boolean {
  const origin = readHeader(request, 'origin');
  if (!origin) {
    return true;
  }

  try {
    const parsed = new URL(origin);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }
    return allowedOrigins?.includes(parsed.origin) ?? false;
  } catch {
    return false;
  }
}

function rejectCookieMutationWithoutTrustedOrigin(
  request: IncomingMessage,
  response: ServerResponse,
  allowedOrigins: readonly string[] | undefined
): boolean {
  if (isAllowedCookieOrigin(request, allowedOrigins)) {
    return false;
  }

  sendJson(response, 403, {
    code: 'CSRF_ORIGIN_DENIED',
    message: 'The request origin is not allowed to mutate the browser session.'
  });
  return true;
}

function readRefreshToken(payload: unknown, request: IncomingMessage): string | undefined {
  if (payload && typeof payload === 'object') {
    const refreshToken = (payload as { refreshToken?: unknown }).refreshToken;
    if (typeof refreshToken === 'string' && refreshToken.trim().length > 0) {
      return refreshToken;
    }
  }
  return readCookie(request, REFRESH_SESSION_COOKIE_NAME);
}

function toBrowserSession(session: AuthSessionResponse): BrowserAuthSessionResponse {
  return {
    accessToken: session.accessToken,
    tokenType: session.tokenType,
    principal: session.principal
  };
}

export function sendAuthSession(
  response: ServerResponse,
  session: AuthSessionResponse,
  handlers: Pick<AuthRoutesHandlers, 'refreshCookieMaxAgeSeconds' | 'secureCookies'>,
  statusCode = 200
): true {
  setRefreshCookie(response, session.refreshToken, handlers);
  return sendJson(response, statusCode, toBrowserSession(session));
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

function normalizeRateLimitDimension(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 && normalized.length <= MAX_RATE_LIMIT_DIMENSION_LENGTH
    ? normalized
    : undefined;
}

function combineRateLimitInfo(...infos: readonly AuthRateLimitInfo[]): AuthRateLimitInfo {
  const blockedInfos = infos.filter((info) => info.blocked);
  return {
    limit: Math.min(...infos.map((info) => info.limit)),
    remaining: Math.min(...infos.map((info) => info.remaining)),
    reset: Math.max(...infos.map((info) => info.reset)),
    blocked: blockedInfos.length > 0,
    retryAfterMs:
      blockedInfos.length > 0 ? Math.max(...blockedInfos.map((info) => info.retryAfterMs)) : 0
  };
}

async function checkAuthAttemptRateLimit(
  authRateLimiter: AuthRateLimiter,
  input: {
    readonly ip: string;
    readonly route: string;
    readonly accountId?: unknown;
    readonly userId?: unknown;
  }
): Promise<AuthRateLimitInfo> {
  try {
    const ipRateLimit = await authRateLimiter.check({
      ip: input.ip,
      route: `${input.route}:ip`
    });
    if (ipRateLimit.blocked) return ipRateLimit;

    const identity = normalizeRateLimitDimension(input.userId);
    if (!identity) return ipRateLimit;

    const identityRateLimit = await authRateLimiter.check({
      ip: 'identity',
      route: `${input.route}:identity`,
      accountId: normalizeRateLimitDimension(input.accountId),
      userId: identity
    });
    return combineRateLimitInfo(ipRateLimit, identityRateLimit);
  } catch {
    // Distributed authentication limits fail closed. Do not allow the
    // caller to continue into password verification or session creation.
    throw new AppError('RATE_LIMIT_UNAVAILABLE', 'Rate limit service unavailable', 503);
  }
}

function normalizeIpAddress(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^::ffff:/, '');
}

function ipv4ToNumber(value: string): number | undefined {
  const parts = value.split('.');
  if (parts.length !== 4 || parts.some((part) => !/^\d+$/.test(part))) {
    return undefined;
  }
  const octets = parts.map(Number);
  if (octets.some((part) => part < 0 || part > 255)) {
    return undefined;
  }
  return (((octets[0] * 256 + octets[1]) * 256 + octets[2]) * 256 + octets[3]) >>> 0;
}

function isTrustedProxyAddress(address: string, trustedProxyCidrs: readonly string[]): boolean {
  const normalizedAddress = normalizeIpAddress(address);
  const addressNumber = ipv4ToNumber(normalizedAddress);

  return trustedProxyCidrs.some((entry) => {
    const normalizedEntry = normalizeIpAddress(entry);
    const [network, prefix] = normalizedEntry.split('/');
    if (prefix === undefined) {
      return normalizedAddress === normalizedEntry;
    }
    if (addressNumber === undefined) {
      return false;
    }
    const networkNumber = ipv4ToNumber(network);
    const prefixLength = Number(prefix);
    if (
      networkNumber === undefined ||
      !Number.isInteger(prefixLength) ||
      prefixLength < 0 ||
      prefixLength > 32
    ) {
      return false;
    }
    const mask = prefixLength === 0 ? 0 : (0xffffffff << (32 - prefixLength)) >>> 0;
    return (addressNumber & mask) === (networkNumber & mask);
  });
}

export function getClientIp(
  request: IncomingMessage,
  trustedProxyCidrs: readonly string[] = []
): string {
  const remoteAddress = request.socket.remoteAddress ?? '';
  if (!isTrustedProxyAddress(remoteAddress, trustedProxyCidrs)) {
    return normalizeIpAddress(remoteAddress || 'unknown');
  }

  const forwardedFor = request.headers['x-forwarded-for']?.toString();
  if (forwardedFor) {
    const chain = forwardedFor.split(',').map(normalizeIpAddress).filter(Boolean);
    for (let index = chain.length - 1; index >= 0; index -= 1) {
      const candidate = chain[index];
      if (candidate && !isTrustedProxyAddress(candidate, trustedProxyCidrs)) {
        return candidate;
      }
    }
  }

  return normalizeIpAddress(remoteAddress || 'unknown');
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
    webauthnChallengeStore,
    webauthnChallenges,
    webauthnChallengeTtlMs,
    oidcConfig,
    oidcStateStore,
    oidcStateTtlMs,
    trustedProxyCidrs,
    requirePrincipal,
    appendAudit
  } = handlers;

  if (pathname === '/auth/session' && request.method === 'GET') {
    const principal = await requirePrincipal(request, 'auth.session.read');
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

  if (pathname === '/auth/sessions' && request.method === 'GET') {
    const principal = await requirePrincipal(request, 'auth.session.read');
    const items = (
      await auth.listSessionsForUserAuthoritative(principal.user.id, correlationId)
    ).map(toPublicSessionSummary);
    appendAudit(
      principal.user.id,
      principal.user.accountId,
      'auth',
      'session_list',
      'session',
      principal.session.sessionId,
      `Listed ${items.length} sessions`,
      'low',
      correlationId
    );
    return sendJson(response, 200, { items } satisfies SessionListResponse);
  }

  if (pathname === '/auth/login' && request.method === 'POST') {
    const rawPayload = await readJsonBody(request).catch(() => ({}));
    const rateLimitPayload = isJsonObject(rawPayload) ? rawPayload : {};
    const rateLimitInfo = await checkAuthAttemptRateLimit(authRateLimiter, {
      ip: getClientIp(request, trustedProxyCidrs),
      route: '/auth/login',
      accountId: rateLimitPayload.accountId,
      userId: rateLimitPayload.username
    });
    if (sendRateLimited(response, rateLimitInfo)) {
      return true;
    }

    try {
      const payload = parseLoginRequest(rawPayload, correlationId);
      const session = await auth.login(payload, correlationId);
      if ('refreshToken' in session && 'accessToken' in session) {
        return sendAuthSession(response, session, handlers);
      }
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
    if (rejectCookieMutationWithoutTrustedOrigin(request, response, handlers.csrfAllowedOrigins)) {
      return true;
    }
    const payload = await readJsonBody(request).catch(() => ({}));
    const refreshToken = readRefreshToken(payload, request);
    if (!refreshToken) {
      return sendJson(response, 401, {
        code: 'SESSION_NOT_FOUND',
        message: 'Session not found'
      });
    }
    const session = await auth.refresh(
      { refreshToken } satisfies RefreshSessionRequest,
      correlationId
    );
    return sendAuthSession(response, session, handlers);
  }

  if (pathname === '/auth/logout' && request.method === 'POST') {
    if (rejectCookieMutationWithoutTrustedOrigin(request, response, handlers.csrfAllowedOrigins)) {
      return true;
    }
    const payload = (await readJsonBody(request).catch(() => ({}))) as LogoutRequest;
    await auth.logout(
      {
        refreshToken: readRefreshToken(payload, request),
        accessToken: extractBearerToken(readHeader(request, 'authorization'))
      },
      correlationId
    );
    setRefreshCookie(response, null, handlers);
    response.statusCode = 204;
    response.end();
    return true;
  }

  if (pathname === '/auth/logout-all-others' && request.method === 'POST') {
    const principal = await requirePrincipal(request, 'auth.session.read');
    const revoked = await auth.revokeOtherSessions(principal.session.sessionId, correlationId);
    appendAudit(
      principal.user.id,
      principal.user.accountId,
      'auth',
      'session_revoke_others',
      'session',
      principal.session.sessionId,
      `Revoked ${revoked} other sessions`,
      'medium',
      correlationId
    );
    return sendJson(response, 200, {
      revokedSessions: revoked,
      keptSessionId: principal.session.sessionId
    });
  }

  const revokeSessionMatch = pathname.match(/^\/auth\/sessions\/([^/]+)\/revoke$/);
  if (revokeSessionMatch && request.method === 'POST') {
    const principal = await requirePrincipal(request, 'auth.session.read');
    const targetSessionId = revokeSessionMatch[1] as never;
    const revoked = await auth.revokeSessionForUser(
      principal.session.sessionId,
      targetSessionId,
      correlationId
    );
    appendAudit(
      principal.user.id,
      principal.user.accountId,
      'auth',
      'session_revoke',
      'session',
      String(targetSessionId),
      revoked
        ? `Revoked session ${targetSessionId}`
        : `Session ${targetSessionId} already inactive`,
      'medium',
      correlationId
    );
    return sendJson(response, 200, {
      revoked,
      sessionId: targetSessionId
    });
  }

  if (pathname === '/auth/login/mfa' && request.method === 'POST') {
    const rawPayload = await readJsonBody(request).catch(() => ({}));
    const rateLimitPayload = isJsonObject(rawPayload) ? rawPayload : {};
    const rateLimitInfo = await checkAuthAttemptRateLimit(authRateLimiter, {
      ip: getClientIp(request, trustedProxyCidrs),
      route: '/auth/login/mfa',
      userId: rateLimitPayload.userId
    });
    if (sendRateLimited(response, rateLimitInfo)) {
      return true;
    }

    try {
      const payload = parseMfaLoginRequest(rawPayload, correlationId);
      const result = await auth.completeMfaLogin(payload, correlationId);
      return sendAuthSession(response, result, handlers);
    } catch (error) {
      logger.error('auth MFA login failed', { correlationId, error });
      const errorResponse = toErrorResponse(error, correlationId);
      response.statusCode = errorResponse.statusCode;
      response.end(JSON.stringify(errorResponse.body));
      return true;
    }
  }

  if (pathname === '/auth/mfa/enroll' && request.method === 'POST') {
    const mfaService = getMfaService(auth);
    if (!mfaService) {
      return sendJson(response, 501, { code: 'NOT_IMPLEMENTED', message: 'MFA not configured' });
    }
    const payload = (await readJsonBody(request)) as { challengeId: string };
    const challengeId = requireNonEmptyString(payload.challengeId, 'challengeId');
    const setup = await auth.beginMfaEnrollment(challengeId, appName, correlationId);
    return sendJson(response, 200, setup);
  }

  if (pathname === '/auth/mfa/enroll/confirm' && request.method === 'POST') {
    const mfaService = getMfaService(auth);
    if (!mfaService) {
      return sendJson(response, 501, { code: 'NOT_IMPLEMENTED', message: 'MFA not configured' });
    }
    const payload = (await readJsonBody(request)) as { challengeId: string; token: string };
    const challengeId = requireNonEmptyString(payload.challengeId, 'challengeId');
    const token = requireNonEmptyString(payload.token, 'token');
    const result = await auth.confirmMfaEnrollment(challengeId, token, correlationId);
    return sendAuthSession(response, result, handlers);
  }

  if (pathname === '/mfa/setup' && request.method === 'POST') {
    const principal = await requirePrincipal(request, 'auth.mfa.manage');
    const mfaService = getMfaService(auth);
    if (!mfaService) {
      return sendJson(response, 501, { code: 'NOT_IMPLEMENTED', message: 'MFA not configured' });
    }
    const setup = await mfaService.initiateSetup(
      principal.user.accountId,
      principal.user.id,
      principal.user.email,
      appName
    );
    return sendJson(response, 200, setup);
  }

  if (pathname === '/mfa/setup/confirm' && request.method === 'POST') {
    const principal = await requirePrincipal(request, 'auth.mfa.manage');
    const mfaService = getMfaService(auth);
    if (!mfaService) {
      return sendJson(response, 501, { code: 'NOT_IMPLEMENTED', message: 'MFA not configured' });
    }
    const payload = (await readJsonBody(request)) as { token: string };
    const record = await mfaService.confirmSetup(
      principal.user.accountId,
      principal.user.id,
      payload.token
    );
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
    const principal = await requirePrincipal(request, 'auth.mfa.read');
    const mfaService = getMfaService(auth);
    if (!mfaService) {
      return sendJson(response, 200, { isActive: false, isRequired: false });
    }
    const isActive = await mfaService.isMfaActive(principal.user.accountId, principal.user.id);
    const isRequired = mfaService.isMfaRequired(principal.access.roleCodes);
    return sendJson(response, 200, { isActive, isRequired });
  }

  if (pathname === '/mfa/disable' && request.method === 'POST') {
    const principal = await requirePrincipal(request, 'auth.mfa.manage');
    const mfaService = getMfaService(auth);
    if (!mfaService) {
      return sendJson(response, 501, { code: 'NOT_IMPLEMENTED', message: 'MFA not configured' });
    }
    const payload = (await readJsonBody(request)) as { token: string };
    await mfaService.disableMfa(principal.user.accountId, principal.user.id, payload.token);
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
    const principal = await requirePrincipal(request, 'auth.mfa.manage');
    const mfaService = getMfaService(auth);
    if (!mfaService) {
      return sendJson(response, 501, { code: 'NOT_IMPLEMENTED', message: 'MFA not configured' });
    }
    const codes = await mfaService.regenerateRecoveryCodes(
      principal.user.accountId,
      principal.user.id
    );
    return sendJson(response, 200, { recoveryCodes: codes });
  }

  if (pathname === '/auth/mfa/webauthn/setup' && request.method === 'GET') {
    const principal = await requirePrincipal(request, 'auth.mfa.manage');
    if (!webauthnService) {
      return sendJson(response, 501, {
        code: 'NOT_IMPLEMENTED',
        message: 'WebAuthn not configured'
      });
    }
    if (!featureFlags.authWebauthnEnabled) {
      return sendJson(response, 403, { code: 'FLAG_DISABLED', message: 'WebAuthn is not enabled' });
    }
    const rpId = request.headers['x-rp-id']?.toString() ?? 'localhost';
    const { publicKeyOptions, challenge } = await webauthnService.generateRegistrationOptions(
      principal.user.accountId,
      principal.user.id,
      {
        rpName: 'CVG-HIS-V2',
        rpId,
        userId: principal.user.id,
        userName: principal.user.email
      }
    );
    await issueWebAuthnChallenge(
      webauthnChallengeStore,
      webauthnChallenges,
      `reg:${principal.user.id}`,
      createWebAuthnChallengeKey(principal.user.accountId, principal.user.id, 'registration'),
      challenge,
      webauthnChallengeTtlMs
    );
    return sendJson(response, 200, { publicKeyOptions, challenge });
  }

  if (pathname === '/auth/mfa/webauthn/setup' && request.method === 'POST') {
    const principal = await requirePrincipal(request, 'auth.mfa.manage');
    if (!webauthnService) {
      return sendJson(response, 501, {
        code: 'NOT_IMPLEMENTED',
        message: 'WebAuthn not configured'
      });
    }
    if (!featureFlags.authWebauthnEnabled) {
      return sendJson(response, 403, { code: 'FLAG_DISABLED', message: 'WebAuthn is not enabled' });
    }
    const payload = (await readJsonBody(request)) as {
      credentialId: string;
      attestationObject: string;
      clientDataJSON: string;
    };
    const challengeResult = await consumeStoredWebAuthnChallenge(
      webauthnChallengeStore,
      webauthnChallenges,
      `reg:${principal.user.id}`,
      createWebAuthnChallengeKey(principal.user.accountId, principal.user.id, 'registration'),
      webauthnChallengeTtlMs
    );
    if (!challengeResult.ok) {
      return sendJson(response, 400, {
        code: challengeResult.code,
        message:
          challengeResult.code === 'INVALID_CHALLENGE'
            ? 'No pending WebAuthn registration'
            : challengeResult.message
      });
    }
    const result = await webauthnService.verifyRegistration(
      principal.user.accountId,
      principal.user.id,
      {
        credentialId: payload.credentialId,
        attestationObject: payload.attestationObject,
        clientDataJSON: payload.clientDataJSON
      },
      challengeResult.challenge
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
    const principal = await requirePrincipal(request, 'auth.mfa.manage');
    if (!webauthnService) {
      return sendJson(response, 501, {
        code: 'NOT_IMPLEMENTED',
        message: 'WebAuthn not configured'
      });
    }
    if (!featureFlags.authWebauthnEnabled) {
      return sendJson(response, 403, { code: 'FLAG_DISABLED', message: 'WebAuthn is not enabled' });
    }
    const payload = (await readJsonBody(request)) as { credentialId?: string };
    const rpId = request.headers['x-rp-id']?.toString() ?? 'localhost';
    const { publicKeyOptions, challenge } = await webauthnService.generateAuthenticationOptions(
      principal.user.accountId,
      principal.user.id,
      { rpId, timeout: 60000, userVerification: 'preferred' }
    );
    if (payload.credentialId) {
      (publicKeyOptions as Record<string, unknown>).allowCredentials = [
        { id: payload.credentialId, type: 'public-key' }
      ];
    }
    await issueWebAuthnChallenge(
      webauthnChallengeStore,
      webauthnChallenges,
      `auth:${principal.user.id}`,
      createWebAuthnChallengeKey(principal.user.accountId, principal.user.id, 'authentication'),
      challenge,
      webauthnChallengeTtlMs
    );
    return sendJson(response, 200, { publicKeyOptions, challenge });
  }

  if (pathname === '/auth/mfa/webauthn/assert' && request.method === 'POST') {
    const principal = await requirePrincipal(request, 'auth.mfa.manage');
    if (!webauthnService) {
      return sendJson(response, 501, {
        code: 'NOT_IMPLEMENTED',
        message: 'WebAuthn not configured'
      });
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
    const challengeResult = await consumeStoredWebAuthnChallenge(
      webauthnChallengeStore,
      webauthnChallenges,
      `auth:${principal.user.id}`,
      createWebAuthnChallengeKey(principal.user.accountId, principal.user.id, 'authentication'),
      webauthnChallengeTtlMs
    );
    if (!challengeResult.ok) {
      return sendJson(response, 400, {
        code: challengeResult.code,
        message:
          challengeResult.code === 'INVALID_CHALLENGE'
            ? 'No pending WebAuthn assertion'
            : challengeResult.message
      });
    }
    const rpId = request.headers['x-rp-id']?.toString() ?? 'localhost';
    const result = await webauthnService.verifyAuthentication(
      principal.user.accountId,
      principal.user.id,
      payload.credentialId,
      {
        authenticatorData: payload.authenticatorData,
        clientDataJSON: payload.clientDataJSON,
        signature: payload.signature,
        userHandle: payload.userHandle
      },
      challengeResult.challenge,
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
      return sendJson(response, 403, {
        code: 'FLAG_DISABLED',
        message: 'OIDC login is not enabled'
      });
    }
    const redirectUri =
      request.headers['x-oidc-redirect-uri']?.toString() ?? oidcConfig.redirectUri;
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
      return sendJson(response, 403, {
        code: 'FLAG_DISABLED',
        message: 'OIDC login is not enabled'
      });
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

function toPublicSessionSummary(session: SessionSummary): SessionSummary {
  return {
    sessionId: session.sessionId,
    userId: session.userId,
    accountId: session.accountId,
    createdAt: session.createdAt,
    expiresAt: session.expiresAt,
    authTime: session.authTime,
    refreshExpiresAt: session.refreshExpiresAt,
    active: session.active
  };
}
