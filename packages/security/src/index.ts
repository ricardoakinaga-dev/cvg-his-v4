/**
 * Security Module — CVG-HIS-V2 Enterprise
 *
 * Centralizes security utilities, headers, and configurations.
 * Re-exports from existing modules and provides new security features.
 *
 * Features:
 * - Security headers (helmet-compatible)
 * - CORS validation helpers
 * - Input sanitization
 * - HTTP response headers for enterprise security
 */

// Re-exported from shared for convenience
export { AuthenticationError, ForbiddenError, ValidationError } from '@cvg-his-v2/shared-errors';
export { requireNonEmptyString, requireEnum } from '@cvg-his-v2/shared-validation';
export * from './database-runtime-role-policy.js';

// ---------------------------------------------------------------------------
// Security Headers
// ---------------------------------------------------------------------------

export interface SecurityHeadersOptions {
  readonly referrerPolicy?: 'no-referrer' | 'no-referrer-when-downgrade' | 'origin' | 'same-origin';
  readonly contentSecurityPolicy?: boolean;
  readonly hstsMaxAge?: number;
  readonly forceHttps?: boolean;
}

const DEFAULT_SECURITY_HEADERS: Required<SecurityHeadersOptions> = {
  referrerPolicy: 'no-referrer',
  contentSecurityPolicy: true,
  hstsMaxAge: 31536000,
  forceHttps: false,
};

/**
 * Get security headers for HTTP responses.
 * Compatible with Fastify/hono and standard Node.js HTTP servers.
 */
export function getSecurityHeaders(
  options: SecurityHeadersOptions = {}
): Record<string, string> {
  const opts = { ...DEFAULT_SECURITY_HEADERS, ...options };
  const headers: Record<string, string> = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': opts.referrerPolicy,
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
  };

  if (opts.contentSecurityPolicy) {
    headers['Content-Security-Policy'] = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self'",
      "connect-src 'self'",
      "frame-ancestors 'none'",
    ].join('; ');
  }

  if (opts.forceHttps) {
    headers['Strict-Transport-Security'] = `max-age=${opts.hstsMaxAge}; includeSubDomains`;
  }

  return headers;
}

/**
 * Apply security headers to a response object.
 * Works with Fastify reply, Hono context, and raw Node.js http.ServerResponse.
 */
export function applySecurityHeaders(
  response: { setHeader: (name: string, value: string) => void },
  options?: SecurityHeadersOptions
): void {
  const headers = getSecurityHeaders(options);
  for (const [name, value] of Object.entries(headers)) {
    response.setHeader(name, value);
  }
}

// ---------------------------------------------------------------------------
// Input Sanitization
// ---------------------------------------------------------------------------

/**
 * Sanitize a string to prevent injection attacks.
 * Removes control characters and trims whitespace.
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return '';
  // Remove control characters except newlines and tabs
  return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();
}

/**
 * Sanitize an object by recursively sanitizing all string fields.
 * Arrays are deep-sanitized. Non-string primitives are preserved.
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  if (obj === null || obj === undefined) return obj;

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      result[key] = sanitizeString(value);
    } else if (Array.isArray(value)) {
      result[key] = value.map((item) =>
        typeof item === 'string' ? sanitizeString(item) : item
      );
    } else if (typeof value === 'object' && value !== null) {
      result[key] = sanitizeObject(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }

  return result as T;
}

/**
 * Validate that a string does not contain potential SQL injection patterns.
 * Returns true if the string appears safe.
 */
export function isSafeSqlInput(input: string): boolean {
  if (typeof input !== 'string') return false;
  const dangerous = [
    /(\b)(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|EXEC|EXECUTE|UNION)(\b)/i,
    /(--|#|\/\*|\*\/)/,
    /(\bOR\b|\bAND\b).*(=|<|>|LIKE)/i,
  ];
  return !dangerous.some((pattern) => pattern.test(input));
}

/**
 * Validate that a string does not look like an injection attempt.
 * Returns true if the string appears safe for use in headers or URLs.
 */
export function isSafeHeaderValue(input: string): boolean {
  if (typeof input !== 'string') return false;
  // Header values should not contain control characters or newlines
  return !/[\x00-\x1F\x7F]/.test(input) && !/[\r\n]/.test(input);
}

// ---------------------------------------------------------------------------
// CORS Validation
// ---------------------------------------------------------------------------

/**
 * Validate an origin against an allowlist.
 * Returns true if the origin is in the allowlist.
 */
export function isOriginAllowed(
  origin: string | null | undefined,
  allowlist: readonly string[]
): boolean {
  if (!origin) return false;
  // Exact match first
  if (allowlist.includes(origin)) return true;
  // Pattern matching for dev environments
  return allowlist.some((allowed) => {
    if (allowed.endsWith('/')) {
      return origin.startsWith(allowed);
    }
    return false;
  });
}

// ---------------------------------------------------------------------------
// Rate Limiting Helper
// ---------------------------------------------------------------------------

export interface RateLimitExceeded {
  readonly exceeded: true;
  readonly retryAfterMs: number;
  readonly limit: number;
  readonly windowMs: number;
}

/**
 * Determine if a request should be rate limited.
 * Returns exceeded info if limit was hit.
 */
export function checkRateLimitHit(
  count: number,
  limit: number,
  windowMs: number
): false | RateLimitExceeded {
  if (count <= limit) return false;
  return {
    exceeded: true,
    retryAfterMs: windowMs,
    limit,
    windowMs,
  };
}

// ---------------------------------------------------------------------------
// Module Export
// ---------------------------------------------------------------------------

export const SecurityModule = {
  getSecurityHeaders,
  applySecurityHeaders,
  sanitizeString,
  sanitizeObject,
  isSafeSqlInput,
  isSafeHeaderValue,
  isOriginAllowed,
  checkRateLimitHit,
} as const;

export type SecurityModule = typeof SecurityModule;
