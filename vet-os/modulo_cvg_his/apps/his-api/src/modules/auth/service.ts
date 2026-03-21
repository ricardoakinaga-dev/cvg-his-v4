import type { IncomingHttpHeaders } from 'node:http';
import { createHmac, timingSafeEqual, randomBytes } from 'node:crypto';

import { permissionsForRole } from '@cvg-his/rbac';

export type AuthActor = {
  accountId: string;
  userId?: string;
  sessionId?: string;
  unitId?: string;
  role?: string;
  roles: string[];
  permissions: string[];
};

export type JwtSignOptions = {
  jwtSecret: string;
  jwtIssuer: string;
  jwtAudience: string;
  expiresIn?: number; // seconds, defaults to 8 hours
};

export type JwtPayload = {
  accountId: string;
  userId?: string;
  sessionId?: string;
  unitId?: string;
  role?: string;
  roles?: string[];
  permissions?: string[];
};

export type ResolveActorOptions = {
  jwtSecret: string;
  jwtIssuer: string;
  jwtAudience: string[];
};

function asString(value: string | string[] | undefined): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

function parseCsv(value: string | undefined, separatorPattern = /,/): string[] {
  return (value ?? '')
    .split(separatorPattern)
    .map((item) => item.trim())
    .filter(Boolean);
}

function dedupe(values: string[]): string[] {
  return Array.from(new Set(values));
}

function base64UrlToBuffer(value: string): Buffer {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
  return Buffer.from(`${normalized}${padding}`, 'base64');
}

function bufferToBase64Url(buffer: Buffer): string {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

type InternalJwtPayload = Record<string, unknown>;

function normalizeAudienceClaim(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((item): item is string => typeof item === 'string')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    return [value.trim()];
  }

  return [];
}

function parseAndVerifyBearerToken(
  token: string,
  secret: string,
  validation: {
    issuer: string;
    audience: string[];
  }
): InternalJwtPayload | undefined {
  const parts = token.split('.');
  if (parts.length !== 3) {
    return undefined;
  }

  const [rawHeader, rawPayload, rawSignature] = parts;
  if (!rawHeader || !rawPayload || !rawSignature) {
    return undefined;
  }

  let header: Record<string, unknown>;
  let payload: InternalJwtPayload;

  try {
    header = JSON.parse(base64UrlToBuffer(rawHeader).toString('utf8')) as Record<string, unknown>;
    payload = JSON.parse(base64UrlToBuffer(rawPayload).toString('utf8')) as InternalJwtPayload;
  } catch {
    return undefined;
  }

  if (header.alg !== 'HS256') {
    return undefined;
  }

  const content = `${rawHeader}.${rawPayload}`;
  const expectedSignature = createHmac('sha256', secret).update(content).digest();
  const providedSignature = base64UrlToBuffer(rawSignature);

  if (expectedSignature.length !== providedSignature.length) {
    return undefined;
  }

  if (!timingSafeEqual(expectedSignature, providedSignature)) {
    return undefined;
  }

  const exp = payload.exp;
  if (typeof exp !== 'number' || !Number.isFinite(exp)) {
    return undefined;
  }

  const nowInSeconds = Math.floor(Date.now() / 1000);
  if (exp <= nowInSeconds) {
    return undefined;
  }

  const issuer = asStringRecordValue(payload.iss);
  if (!issuer || issuer !== validation.issuer) {
    return undefined;
  }

  const claimAudiences = normalizeAudienceClaim(payload.aud);
  if (claimAudiences.length === 0) {
    return undefined;
  }

  const expectedAudiences = validation.audience;
  const hasAudienceMatch = claimAudiences.some((value) => expectedAudiences.includes(value));
  if (!hasAudienceMatch) {
    return undefined;
  }

  return payload;
}

function parseAuthorizationToken(headers: IncomingHttpHeaders): string | undefined {
  const rawAuthorization = asString(headers.authorization);
  if (!rawAuthorization) {
    return undefined;
  }

  const [scheme, token] = rawAuthorization.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return undefined;
  }

  return token;
}

function asStringRecordValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function asStringArrayRecordValue(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
  }

  if (typeof value === 'string' && value.trim().length > 0) {
    return parseCsv(value, /[,\s]+/);
  }

  return [];
}

export function resolveActorFromHeaders(
  headers: IncomingHttpHeaders,
  options: ResolveActorOptions
): AuthActor | undefined {
  const token = parseAuthorizationToken(headers);
  const secret = options.jwtSecret.trim();
  const issuer = options.jwtIssuer.trim();
  const audience = dedupe(options.jwtAudience.map((item) => item.trim()).filter(Boolean));

  if (!token || !secret || !issuer || audience.length === 0) {
    return undefined;
  }

  const claims = parseAndVerifyBearerToken(token, secret, {
    issuer,
    audience
  });
  if (!claims) {
    return undefined;
  }

  const accountId = asStringRecordValue(claims.accountId) ?? asStringRecordValue(claims.account_id);
  if (!accountId) {
    return undefined;
  }

  const userId =
    asStringRecordValue(claims.userId) ??
    asStringRecordValue(claims.user_id) ??
    asStringRecordValue(claims.sub);
  const sessionId = asStringRecordValue(claims.sessionId) ?? asStringRecordValue(claims.session_id);
  const unitId = asStringRecordValue(claims.unitId) ?? asStringRecordValue(claims.unit_id);
  const roleFromClaim = asStringRecordValue(claims.role);
  const explicitRoles = asStringArrayRecordValue(claims.roles);
  const explicitPermissions = asStringArrayRecordValue(claims.permissions);

  const roles = dedupe(explicitRoles.length > 0 ? explicitRoles : roleFromClaim ? [roleFromClaim] : []);

  const inheritedPermissions = roles.flatMap((roleName) => permissionsForRole(roleName));
  const permissions = dedupe([
    ...inheritedPermissions,
    ...explicitPermissions
  ]);

  return {
    accountId,
    userId,
    sessionId,
    unitId,
    role: roleFromClaim ?? roles[0],
    roles,
    permissions
  };
}

/**
 * Sign a JWT token with the provided payload
 */
export function signJwt(payload: JwtPayload, options: JwtSignOptions): string {
  const { jwtSecret, jwtIssuer, jwtAudience, expiresIn = 8 * 60 * 60 } = options;
  
  const nowInSeconds = Math.floor(Date.now() / 1000);
  const exp = nowInSeconds + expiresIn;
  
  const fullPayload: InternalJwtPayload = {
    ...payload,
    iss: jwtIssuer,
    aud: jwtAudience,
    iat: nowInSeconds,
    exp
  };
  
  const header = { alg: 'HS256', typ: 'JWT' };
  
  const rawHeader = bufferToBase64Url(Buffer.from(JSON.stringify(header), 'utf8'));
  const rawPayload = bufferToBase64Url(Buffer.from(JSON.stringify(fullPayload), 'utf8'));
  
  const content = `${rawHeader}.${rawPayload}`;
  const signature = createHmac('sha256', jwtSecret).update(content).digest();
  const rawSignature = bufferToBase64Url(signature);
  
  return `${content}.${rawSignature}`;
}

/**
 * Generate a secure random API key
 */
export function generateApiKey(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Verify a JWT token and return the payload
 */
export function verifyJwt(token: string, options: ResolveActorOptions): JwtPayload | undefined {
  const secret = options.jwtSecret.trim();
  const issuer = options.jwtIssuer.trim();
  const audience = dedupe(options.jwtAudience.map((item) => item.trim()).filter(Boolean));
  
  if (!secret || !issuer || audience.length === 0) {
    return undefined;
  }
  
  const claims = parseAndVerifyBearerToken(token, secret, { issuer, audience });
  if (!claims) {
    return undefined;
  }
  
  const accountId = asStringRecordValue(claims.accountId) ?? asStringRecordValue(claims.account_id);
  if (!accountId) {
    return undefined;
  }
  
  return {
    accountId,
    userId: asStringRecordValue(claims.userId) ?? asStringRecordValue(claims.user_id) ?? asStringRecordValue(claims.sub),
    sessionId: asStringRecordValue(claims.sessionId) ?? asStringRecordValue(claims.session_id),
    unitId: asStringRecordValue(claims.unitId) ?? asStringRecordValue(claims.unit_id),
    role: asStringRecordValue(claims.role),
    roles: asStringArrayRecordValue(claims.roles),
    permissions: asStringArrayRecordValue(claims.permissions)
  };
}
