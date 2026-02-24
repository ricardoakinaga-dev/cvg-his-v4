import { createHmac, timingSafeEqual, randomBytes } from 'node:crypto';
import { permissionsForRole } from '@cvg-his/rbac';
function asString(value) {
    return typeof value === 'string' ? value : undefined;
}
function parseCsv(value, separatorPattern = /,/) {
    return (value ?? '')
        .split(separatorPattern)
        .map((item) => item.trim())
        .filter(Boolean);
}
function dedupe(values) {
    return Array.from(new Set(values));
}
function base64UrlToBuffer(value) {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padding = normalized.length % 4 === 0 ? '' : '='.repeat(4 - (normalized.length % 4));
    return Buffer.from(`${normalized}${padding}`, 'base64');
}
function bufferToBase64Url(buffer) {
    return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function normalizeAudienceClaim(value) {
    if (Array.isArray(value)) {
        return value
            .filter((item) => typeof item === 'string')
            .map((item) => item.trim())
            .filter(Boolean);
    }
    if (typeof value === 'string' && value.trim().length > 0) {
        return [value.trim()];
    }
    return [];
}
function parseAndVerifyBearerToken(token, secret, validation) {
    const parts = token.split('.');
    if (parts.length !== 3) {
        return undefined;
    }
    const [rawHeader, rawPayload, rawSignature] = parts;
    if (!rawHeader || !rawPayload || !rawSignature) {
        return undefined;
    }
    let header;
    let payload;
    try {
        header = JSON.parse(base64UrlToBuffer(rawHeader).toString('utf8'));
        payload = JSON.parse(base64UrlToBuffer(rawPayload).toString('utf8'));
    }
    catch {
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
function parseAuthorizationToken(headers) {
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
function asStringRecordValue(value) {
    return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}
function asStringArrayRecordValue(value) {
    if (Array.isArray(value)) {
        return value.filter((item) => typeof item === 'string' && item.trim().length > 0);
    }
    if (typeof value === 'string' && value.trim().length > 0) {
        return parseCsv(value, /[,\s]+/);
    }
    return [];
}
export function resolveActorFromHeaders(headers, options) {
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
    const userId = asStringRecordValue(claims.userId) ??
        asStringRecordValue(claims.user_id) ??
        asStringRecordValue(claims.sub);
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
        unitId,
        role: roleFromClaim ?? roles[0],
        roles,
        permissions
    };
}
/**
 * Sign a JWT token with the provided payload
 */
export function signJwt(payload, options) {
    const { jwtSecret, jwtIssuer, jwtAudience, expiresIn = 8 * 60 * 60 } = options;
    const nowInSeconds = Math.floor(Date.now() / 1000);
    const exp = nowInSeconds + expiresIn;
    const fullPayload = {
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
export function generateApiKey() {
    return randomBytes(32).toString('hex');
}
/**
 * Verify a JWT token and return the payload
 */
export function verifyJwt(token, options) {
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
        unitId: asStringRecordValue(claims.unitId) ?? asStringRecordValue(claims.unit_id),
        role: asStringRecordValue(claims.role),
        roles: asStringArrayRecordValue(claims.roles),
        permissions: asStringArrayRecordValue(claims.permissions)
    };
}
//# sourceMappingURL=service.js.map