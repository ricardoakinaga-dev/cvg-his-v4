import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { assertServerEnv } from '@/lib/publicEnv';

const AUTH_COOKIE_NAME = 'his_token';
const DEFAULT_UPSTREAM_BASE_URL = 'http://127.0.0.1:3000';
const DEFAULT_PROXY_TIMEOUT_MS = 30_000;
const INTERNAL_API_ENV_NAME = 'HIS_API_INTERNAL_URL';

const ALLOWED_PATH_PREFIXES = [
  '/auth',
  '/owners',
  '/patients',
  '/search',
  '/encounters',
  '/notes',
  '/documents',
  '/wards',
  '/beds',
  '/inpatient',
  '/medication-orders',
  '/medication-administrations',
  '/medication-doses',
  '/medication-logs',
  '/handovers',
  '/patient-context',
  '/protocols',
  '/protocol-diff',
  '/protocol-versions',
  '/audit',
  '/alerts',
  '/rbac',
  '/system',
  '/soap-templates',
  '/health'
] as const;

// Hop-by-hop headers per RFC 2616 Section 13.5.1
const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailers',
  'transfer-encoding',
  'upgrade'
]);

const BLOCKED_REQUEST_HEADERS = new Set([
  'host',
  'content-length',
  ...Array.from(HOP_BY_HOP_HEADERS),
  'x-forwarded-for',
  'x-forwarded-host',
  'x-forwarded-port',
  'x-forwarded-proto',
  'x-real-ip',
  'cf-connecting-ip',
  // Client-controlled context headers - security risk
  'x-account-id',
  'x-role',
  'x-unit-id',
  'x-user-id'
]);

const BLOCKED_RESPONSE_HEADERS = new Set([
  'content-length',
  ...Array.from(HOP_BY_HOP_HEADERS)
]);

let cachedUpstreamBaseUrl: string | null = null;
let upstreamBaseLogged = false;

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Reset the cached upstream URL.
 * Exported as named module export for use in test files via static import.
 * Do NOT call this in production code.
 * @internal
 */
export function resetProxyCache(): void {
  cachedUpstreamBaseUrl = null;
  upstreamBaseLogged = false;
}

function resolveUpstreamBaseUrl(): string {
  if (cachedUpstreamBaseUrl) {
    return cachedUpstreamBaseUrl;
  }

  // Validate server env in production
  assertServerEnv();

  const internalUrl = process.env.HIS_API_INTERNAL_URL?.trim() ?? '';
  const rawBaseUrl = internalUrl.length > 0 ? internalUrl : DEFAULT_UPSTREAM_BASE_URL;
  const source = internalUrl.length > 0 ? INTERNAL_API_ENV_NAME : `default:${DEFAULT_UPSTREAM_BASE_URL}`;

  let parsed: URL;
  try {
    parsed = new URL(rawBaseUrl);
  } catch {
    throw new Error(
      `[his-web][proxy] FATAL: Invalid ${INTERNAL_API_ENV_NAME}="${rawBaseUrl}". ` +
      `Expected a valid URL (e.g., http://his-api:3000).`
    );
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(
      `[his-web][proxy] FATAL: Unsupported protocol "${parsed.protocol}" in ${INTERNAL_API_ENV_NAME}. ` +
      `Expected http:// or https://`
    );
  }

  if (parsed.pathname.startsWith('/api/proxy')) {
    throw new Error(
      `[his-web][proxy] FATAL: ${INTERNAL_API_ENV_NAME} must point to his-api upstream, not to /api/proxy. ` +
      `Got: ${rawBaseUrl}`
    );
  }

  parsed.search = '';
  parsed.hash = '';

  const normalized = parsed.toString().replace(/\/$/, '');
  cachedUpstreamBaseUrl = normalized;

  if (process.env.NODE_ENV !== 'production' && !upstreamBaseLogged) {
    upstreamBaseLogged = true;
    console.info('[his-web][proxy] upstream resolved', {
      source,
      upstreamBaseUrl: normalized
    });
  }

  return normalized;
}

function normalizePath(pathSegments: string[]): string {
  const filteredSegments = pathSegments
    .filter((segment) => segment.length > 0)
    .map((segment) => segment.replace(/\//g, ''));

  return `/${filteredSegments.join('/')}`.replace(/\/{2,}/g, '/');
}

function isAllowedPath(pathname: string): boolean {
  return ALLOWED_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function toUpstreamUrl(baseUrl: string, pathname: string, search: string): URL {
  const url = new URL(baseUrl);
  const basePath = url.pathname === '/' ? '' : url.pathname.replace(/\/$/, '');
  url.pathname = `${basePath}${pathname}`;
  url.search = search;
  return url;
}

/**
 * Generate a unique request ID for tracing.
 * Format: timestamp-randomHex (e.g., "1708405400-a1b2c3d4")
 */
function generateRequestId(): string {
  const timestamp = Math.floor(Date.now() / 1000).toString(36);
  const random = crypto.randomUUID().replace(/-/g, '').slice(0, 8);
  return `${timestamp}-${random}`;
}

/**
 * Resolve proxy timeout from environment or use default.
 */
function resolveProxyTimeout(): number {
  const envTimeout = process.env.HIS_PROXY_TIMEOUT_MS;
  if (envTimeout) {
    const parsed = parseInt(envTimeout, 10);
    if (!isNaN(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return DEFAULT_PROXY_TIMEOUT_MS;
}

function buildUpstreamHeaders(request: NextRequest, requestId: string): Headers {
  const headers = new Headers();

  request.headers.forEach((value, key) => {
    const lowerKey = key.toLowerCase();
    if (BLOCKED_REQUEST_HEADERS.has(lowerKey)) {
      return;
    }
    headers.set(key, value);
  });

  headers.delete('cookie');

  // Ensure x-request-id is always set for tracing
  headers.set('x-request-id', requestId);

  const tokenFromCookie = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (!headers.has('authorization') && tokenFromCookie) {
    headers.set('authorization', `Bearer ${decodeURIComponent(tokenFromCookie)}`);
  }

  // NOTE: Context headers (x-account-id, x-role, x-unit-id, x-user-id) are
  // blocked in BLOCKED_REQUEST_HEADERS. The backend derives actor context
  // solely from the verified JWT token for security.

  return headers;
}

function buildResponseHeaders(source: Headers, requestId: string): Headers {
  const headers = new Headers();
  source.forEach((value, key) => {
    if (BLOCKED_RESPONSE_HEADERS.has(key.toLowerCase())) {
      return;
    }
    headers.set(key, value);
  });
  // Include x-request-id in response for client-side correlation
  headers.set('x-request-id', requestId);
  return headers;
}

/**
 * Standardized error response format
 */
interface ProxyErrorResponse {
  error: {
    code: string;
    message: string;
    requestId: string;
  };
}

function createErrorResponse(
  code: string,
  message: string,
  requestId: string,
  status: number
): NextResponse<ProxyErrorResponse> {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        requestId
      }
    },
    { status }
  );
}

async function proxyRequest(
  request: NextRequest,
  context: { params: { path?: string[] } }
): Promise<NextResponse> {
  const requestId = generateRequestId();
  const pathSegments = context.params.path ?? [];
  const pathname = normalizePath(pathSegments);

  if (!isAllowedPath(pathname)) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[his-web][proxy] blocked path', { pathname, requestId });
    }
    return createErrorResponse(
      'PROXY_PATH_BLOCKED',
      'Proxy path not allowed.',
      requestId,
      403
    );
  }

  const upstreamBaseUrl = resolveUpstreamBaseUrl();
  const upstreamUrl = toUpstreamUrl(upstreamBaseUrl, pathname, request.nextUrl.search);
  const headers = buildUpstreamHeaders(request, requestId);
  const method = request.method.toUpperCase();
  const hasRequestBody = method !== 'GET' && method !== 'HEAD';
  const timeoutMs = resolveProxyTimeout();

  let body: ArrayBuffer | undefined;
  if (hasRequestBody) {
    const rawBody = await request.arrayBuffer();
    if (rawBody.byteLength > 0) {
      body = rawBody;
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    console.info('[his-web][proxy] forwarding', {
      method,
      pathname,
      requestId,
      upstreamUrl: upstreamUrl.toString(),
      timeoutMs
    });
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const upstreamResponse = await fetch(upstreamUrl.toString(), {
      method,
      headers,
      body,
      cache: 'no-store',
      redirect: 'manual',
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    return new NextResponse(upstreamResponse.body, {
      status: upstreamResponse.status,
      headers: buildResponseHeaders(upstreamResponse.headers, requestId)
    });
  } catch (error) {
    clearTimeout(timeoutId);

    const isTimeout = error instanceof Error && error.name === 'AbortError';
    const errorCode = isTimeout ? 'PROXY_TIMEOUT' : 'PROXY_UPSTREAM_ERROR';
    const errorMessage = isTimeout
      ? `Upstream request timed out after ${timeoutMs}ms.`
      : 'Upstream API unavailable.';
    const status = isTimeout ? 504 : 502;

    if (process.env.NODE_ENV !== 'production') {
      console.error('[his-web][proxy] upstream request failed', {
        method,
        pathname,
        requestId,
        upstreamUrl: upstreamUrl.toString(),
        error: error instanceof Error ? error.message : String(error),
        isTimeout
      });
    }

    return createErrorResponse(errorCode, errorMessage, requestId, status);
  }
}

export { proxyRequest as GET };
export { proxyRequest as POST };
export { proxyRequest as PUT };
export { proxyRequest as PATCH };
export { proxyRequest as DELETE };
export { proxyRequest as HEAD };
export { proxyRequest as OPTIONS };
