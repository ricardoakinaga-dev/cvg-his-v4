import type { IncomingMessage, ServerResponse } from 'node:http';
import { URL } from 'node:url';

export const DEFAULT_CORS_ALLOWED_ORIGINS = [
  'http://127.0.0.1:3000',
  'http://localhost:3000',
  'http://127.0.0.1:3002',
  'http://localhost:3002',
  'http://127.0.0.1:3102',
  'http://localhost:3102',
  'http://127.0.0.1:3112',
  'http://localhost:3112',
  'http://127.0.0.1:4173',
  'http://localhost:4173',
  'http://127.0.0.1:5173',
  'http://localhost:5173'
] as const;

const DEFAULT_CORS_ALLOW_METHODS = 'GET,POST,PUT,PATCH,DELETE,OPTIONS';
const DEFAULT_CORS_ALLOW_HEADERS =
  'accept, authorization, content-type, x-correlation-id, x-request-id';
const DEFAULT_CORS_EXPOSE_HEADERS =
  'x-correlation-id, x-request-id, x-trace-id, traceparent, tracestate';

export interface CorsDecision {
  readonly allowed: boolean;
  readonly message?: string;
}

function appendVaryHeader(response: ServerResponse, headerName: string): void {
  const current = response.getHeader('vary');
  const values = new Set<string>();
  const rawValues = Array.isArray(current)
    ? current
    : typeof current === 'string'
      ? current.split(',')
      : [];

  for (const value of rawValues) {
    const trimmed = value.trim();
    if (trimmed.length > 0) {
      values.add(trimmed);
    }
  }

  values.add(headerName);
  response.setHeader('vary', Array.from(values).join(', '));
}

function normalizeRequestOrigin(request: IncomingMessage): string | undefined {
  const originHeader = request.headers.origin;
  const rawOrigin = Array.isArray(originHeader) ? originHeader[0] : originHeader;

  if (!rawOrigin) {
    return undefined;
  }

  try {
    const parsed = new URL(rawOrigin);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return undefined;
    }

    return parsed.origin;
  } catch {
    return undefined;
  }
}

export function applyCorsPolicy(
  request: IncomingMessage,
  response: ServerResponse,
  allowedOrigins: readonly string[]
): CorsDecision {
  appendVaryHeader(response, 'Origin');
  appendVaryHeader(response, 'Access-Control-Request-Headers');
  response.setHeader('access-control-allow-headers', DEFAULT_CORS_ALLOW_HEADERS);
  response.setHeader('access-control-allow-methods', DEFAULT_CORS_ALLOW_METHODS);
  response.setHeader('access-control-expose-headers', DEFAULT_CORS_EXPOSE_HEADERS);
  response.setHeader('access-control-max-age', '600');

  const originHeader = request.headers.origin;
  if (!originHeader) {
    return { allowed: true };
  }

  const normalizedOrigin = normalizeRequestOrigin(request);
  if (!normalizedOrigin) {
    return {
      allowed: false,
      message: 'Origin header is invalid. Only http(s) origins are accepted.'
    };
  }

  if (!allowedOrigins.includes(normalizedOrigin)) {
    return {
      allowed: false,
      message: `Origin ${normalizedOrigin} is not allowed by CORS policy.`
    };
  }

  response.setHeader('access-control-allow-origin', normalizedOrigin);
  return { allowed: true };
}
