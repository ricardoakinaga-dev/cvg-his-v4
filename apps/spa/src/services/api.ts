import { useAuthStore } from '@/stores/auth';
import { spaRuntimeConfig } from '@/config/runtime';

const API_BASE = spaRuntimeConfig.apiBaseUrl;

export interface ApiRequestOptions extends RequestInit {
  skipAuth?: boolean;
  /** Abort the request after this many milliseconds and surface an uncertain outcome. */
  timeoutMs?: number;
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

let refreshPromise: Promise<string | null> | undefined;

async function refreshAccessToken(): Promise<string | null> {
  refreshPromise ??= (async () => {
    try {
      const correlationId = generateCorrelationId();
      const response = await fetch(`${API_BASE}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Correlation-Id': correlationId,
          'X-Request-Id': correlationId
        },
        body: '{}',
        credentials: 'include'
      });
      if (!response.ok) return null;

      const body = (await response.json().catch(() => null)) as {
        accessToken?: unknown;
      } | null;
      if (typeof body?.accessToken !== 'string' || body.accessToken.length === 0) return null;

      useAuthStore().setTokens(body.accessToken);
      return body.accessToken;
    } catch {
      return null;
    } finally {
      refreshPromise = undefined;
    }
  })();

  return refreshPromise;
}

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
  const {
    skipAuth,
    timeoutMs: requestedTimeoutMs,
    headers: customHeaders,
    signal: providedSignal,
    ...restOptions
  } = options;
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

  const timeoutMs =
    typeof requestedTimeoutMs === 'number' && Number.isFinite(requestedTimeoutMs) && requestedTimeoutMs > 0
      ? requestedTimeoutMs
      : 0;
  const executeRequest = async (requestHeaders: Headers): Promise<Response> => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let timedOut = false;
    let timeoutController: AbortController | undefined;
    let providedAbortListener: (() => void) | undefined;

    try {
      let signal = providedSignal;
      if (timeoutMs > 0 && typeof AbortController !== 'undefined') {
        timeoutController = new AbortController();
        providedAbortListener = () => timeoutController?.abort(providedSignal?.reason);
        if (providedSignal?.aborted) {
          providedAbortListener();
        } else {
          providedSignal?.addEventListener('abort', providedAbortListener, { once: true });
        }
        timeoutId = setTimeout(() => {
          timedOut = true;
          timeoutController?.abort();
        }, timeoutMs);
        signal = timeoutController.signal;
      }

      return await fetch(url, {
        ...restOptions,
        // Keep each attempt's header set immutable from the perspective of
        // fetch observers and service-worker instrumentation.
        headers: new Headers(requestHeaders),
        ...(signal ? { signal } : {}),
        credentials: 'include'
      });
    } catch (error) {
      if (timedOut) {
        throw new ApiError(
          'A solicitação excedeu o tempo limite; o resultado da operação pode estar pendente.',
          408,
          'Request Timeout'
        );
      }
      throw error;
    } finally {
      if (timeoutId !== undefined) clearTimeout(timeoutId);
      if (providedSignal && providedAbortListener) {
        providedSignal.removeEventListener('abort', providedAbortListener);
      }
    }
  };

  const readBody = async (response: Response): Promise<unknown> => {
    try {
      return await response.json();
    } catch {
      return null;
    }
  };

  let response = await executeRequest(headers);
  let body: unknown = response.ok ? null : await readBody(response);
  const canRefresh =
    !skipAuth &&
    (response.status === 401 || (response.status === 404 && isSessionNotFoundResponse(body)));

  if (canRefresh) {
    const refreshedToken = await refreshAccessToken();
    if (refreshedToken) {
      headers.set('Authorization', `Bearer ${refreshedToken}`);
      const refreshedAccountId =
        useAuthStore().user.accountId ?? getAccountIdFromToken(refreshedToken);
      if (refreshedAccountId) headers.set('x-account-id', refreshedAccountId);
      response = await executeRequest(headers);
      body = response.ok ? null : await readBody(response);
    }
  }

  if (!response.ok) {
    if (
      !skipAuth &&
      (response.status === 401 || (response.status === 404 && isSessionNotFoundResponse(body)))
    ) {
      const authStore = useAuthStore();
      authStore.clearSession();
      await redirectToLogin();
      throw new ApiError(SESSION_EXPIRED_MESSAGE, response.status, response.statusText, body);
    }

    throw new ApiError(
      typeof (body as ApiErrorBodyShape | null)?.message === 'string'
        ? ((body as ApiErrorBodyShape).message as string)
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
