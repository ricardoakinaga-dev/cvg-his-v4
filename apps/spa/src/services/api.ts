import { useAuthStore } from '@/stores/auth';
import { spaRuntimeConfig } from '@/config/runtime';

const API_BASE = spaRuntimeConfig.apiBaseUrl;

export interface ApiRequestOptions extends RequestInit {
  skipAuth?: boolean;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public statusText: string,
    public body?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

interface ApiErrorBodyShape {
  message?: unknown;
}

const SESSION_EXPIRED_MESSAGE = 'Sua sessão expirou. Faça login novamente.';

async function invalidateClientCaches(path: string): Promise<void> {
  try {
    if (typeof caches !== 'undefined') {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map(async (cacheName) => {
          const cache = await caches.open(cacheName);
          const requests = await cache.keys();
          await Promise.all(
            requests
              .filter((request) => new URL(request.url).pathname.startsWith('/api/'))
              .map((request) => cache.delete(request))
          );
        })
      );
    }
  } catch {
    // Cache invalidation is best effort; the committed server response is authoritative.
  }

  try {
    const keysToRemove = Object.keys(localStorage).filter((key) => key.startsWith('pwa-cache-'));
    for (const key of keysToRemove) {
      localStorage.removeItem(key);
    }
  } catch {
    // Browser storage can be unavailable in private browsing contexts.
  }

  const entityMatch = path.match(/^\/(owners|patients|users)(?:\/([^/?#]+))?/);
  if (entityMatch?.[1]) {
    try {
      const { invalidateEntityCache } = await import('@/composables/useEntityCache');
      invalidateEntityCache(entityMatch[1] as 'owners' | 'patients' | 'users', entityMatch[2]);
    } catch {
      // The API client must not fail after a successful mutation because a UI cache is unavailable.
    }
  }
}

function generateCorrelationId(): string {
  return `spa-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function decodeBase64Url(value: string): string | null {
  try {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    return atob(padded);
  } catch {
    return null;
  }
}

function getAccountIdFromToken(token: string | null): string | null {
  if (!token) {
    return null;
  }

  try {
    const parts = token.split('.');
    const encodedPayload = parts.length === 2 ? parts[0] : parts.length === 3 ? parts[1] : null;
    if (!encodedPayload) {
      return null;
    }

    const decoded = decodeBase64Url(encodedPayload);
    if (!decoded) {
      return null;
    }

    const payload = JSON.parse(decoded) as Record<string, unknown>;
    return ((payload.accountId as string) ?? (payload.account_id as string) ?? null);
  } catch {
    return null;
  }
}

async function getAccessToken(): Promise<string | null> {
  return useAuthStore().accessToken;
}

async function getCurrentRouteFullPath(): Promise<string> {
  const { router } = await import('@/router');
  const currentRoute = router.currentRoute.value.fullPath;
  if (currentRoute) {
    return currentRoute;
  }

  if (typeof window !== 'undefined') {
    return `${window.location.pathname}${window.location.search}${window.location.hash}`;
  }

  return '/';
}

async function redirectToLogin(): Promise<void> {
  const { router } = await import('@/router');
  const next = await getCurrentRouteFullPath();
  router.replace({
    path: '/login',
    query: next && next !== '/login' ? { next } : undefined
  });
}

function isSessionNotFoundResponse(body: unknown): boolean {
  if (!body || typeof body !== 'object') {
    return false;
  }

  const payload = body as { code?: unknown; message?: unknown };
  return payload.code === 'NOT_FOUND' && payload.message === 'Session not found';
}

export async function apiRequest<T = unknown>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { skipAuth, headers: customHeaders, ...restOptions } = options;
  const method = (restOptions.method ?? 'GET').toUpperCase();
  const isMutation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

  const url = path.startsWith('http') ? path : `${API_BASE}/api${path}`;
  const correlationId = generateCorrelationId();

  const headers = new Headers(customHeaders as HeadersInit | undefined);
  headers.set('Content-Type', 'application/json');
  headers.set('X-Correlation-Id', correlationId);
  headers.set('X-Request-Id', correlationId);
  if (isMutation && !headers.has('Idempotency-Key')) {
    headers.set('Idempotency-Key', correlationId);
  }

  if (!skipAuth) {
    const token = await getAccessToken();
    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }
    const authStore = useAuthStore();
    const accountId = authStore.user.accountId ?? getAccountIdFromToken(token);
    if (accountId) {
      headers.set('x-account-id', accountId);
    }
  }

  const response = await fetch(url, {
    ...restOptions,
    headers,
    credentials: 'include'
  });

  if (!response.ok) {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      body = null;
    }

    if (!skipAuth && (response.status === 401 || (response.status === 404 && isSessionNotFoundResponse(body)))) {
      const authStore = useAuthStore();
      authStore.clearSession();
      await redirectToLogin();
      throw new ApiError(SESSION_EXPIRED_MESSAGE, response.status, response.statusText, body);
    }

    throw new ApiError(
      typeof (body as ApiErrorBodyShape | null)?.message === 'string'
        ? (body as ApiErrorBodyShape).message as string
        : `HTTP ${response.status}: ${response.statusText}`,
      response.status,
      response.statusText,
      body
    );
  }

  if (response.status === 204) {
    if (isMutation) {
      await invalidateClientCaches(path);
    }
    return undefined as T;
  }

  if (isMutation) {
    await invalidateClientCaches(path);
  }

  return response.json() as Promise<T>;
}

export { invalidateClientCaches };
