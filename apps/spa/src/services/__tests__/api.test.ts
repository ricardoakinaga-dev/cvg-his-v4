import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockClearSession = vi.fn();
const mockRouterReplace = vi.fn();

async function importApiModule(currentRoute = '/owners?tab=all') {
  vi.resetModules();

  vi.doMock('@/router', () => ({
    router: {
      currentRoute: {
        value: {
          fullPath: currentRoute
        }
      },
      replace: (...args: unknown[]) => mockRouterReplace(...args)
    }
  }));

  vi.doMock('@/stores/auth', () => ({
    useAuthStore: () => ({
      accessToken: 'access-token',
      user: {
        accountId: 'account-123'
      },
      clearSession: mockClearSession
    })
  }));

  const module = await import('../api');
  return {
    ...module,
    cleanup: () => {
      vi.doUnmock('@/router');
      vi.doUnmock('@/stores/auth');
    }
  };
}

describe('apiRequest', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it('clears the session and redirects to login when an authenticated request returns 401', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      json: vi.fn().mockResolvedValue({ detail: 'expired' })
    });

    vi.stubGlobal('fetch', mockFetch);

    const { apiRequest, cleanup } = await importApiModule();

    try {
      await expect(apiRequest('/owners')).rejects.toMatchObject({
        name: 'ApiError',
        message: 'Sua sessão expirou. Faça login novamente.',
        status: 401,
        statusText: 'Unauthorized',
        body: { detail: 'expired' }
      });

      expect(mockClearSession).toHaveBeenCalledTimes(1);
      expect(mockRouterReplace).toHaveBeenCalledWith({
        path: '/login',
        query: { next: '/owners?tab=all' }
      });
      expect(mockFetch).toHaveBeenCalledWith('/api/owners', expect.any(Object));
      const requestInit = mockFetch.mock.calls[0]?.[1] as RequestInit;
      const headers = requestInit.headers as Headers;
      expect(headers.get('Authorization')).toBe('Bearer access-token');
      expect(headers.get('x-account-id')).toBe('account-123');
      expect(requestInit.credentials).toBe('include');
    } finally {
      cleanup();
    }
  });

  it('invalidates API and offline caches after a successful mutation', async () => {
    const deleteCachedRequest = vi.fn().mockResolvedValue(true);
    const cache = {
      keys: vi.fn().mockResolvedValue([
        { url: 'http://localhost/api/owners/owner-1' },
        { url: 'http://localhost/assets/app.js' }
      ]),
      delete: deleteCachedRequest
    };
    vi.stubGlobal('caches', {
      keys: vi.fn().mockResolvedValue(['api-cache']),
      open: vi.fn().mockResolvedValue(cache)
    });
    localStorage.setItem('pwa-cache-owners', JSON.stringify({ data: [] }));

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 204,
      statusText: 'No Content'
    });
    vi.stubGlobal('fetch', mockFetch);

    const { apiRequest, cleanup } = await importApiModule();

    try {
      await apiRequest('/owners/owner-1', { method: 'DELETE' });

      expect(deleteCachedRequest).toHaveBeenCalledTimes(1);
      expect(localStorage.getItem('pwa-cache-owners')).toBeNull();
      expect((mockFetch.mock.calls[0]?.[1] as RequestInit).credentials).toBe('include');
    } finally {
      cleanup();
    }
  });

  it('clears the session and redirects to login when an authenticated request returns 404 session not found', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      statusText: 'Not Found',
      json: vi.fn().mockResolvedValue({ code: 'NOT_FOUND', message: 'Session not found' })
    });

    vi.stubGlobal('fetch', mockFetch);

    const { apiRequest, cleanup } = await importApiModule('/patients');

    try {
      await expect(apiRequest('/patients')).rejects.toMatchObject({
        name: 'ApiError',
        message: 'Sua sessão expirou. Faça login novamente.',
        status: 404,
        statusText: 'Not Found',
        body: { code: 'NOT_FOUND', message: 'Session not found' }
      });

      expect(mockClearSession).toHaveBeenCalledTimes(1);
      expect(mockRouterReplace).toHaveBeenCalledWith({
        path: '/login',
        query: { next: '/patients' }
      });
    } finally {
      cleanup();
    }
  });

  it('keeps the existing error flow for 403 responses', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      json: vi.fn().mockResolvedValue({ detail: 'forbidden' })
    });

    vi.stubGlobal('fetch', mockFetch);

    const { apiRequest, cleanup } = await importApiModule();

    try {
      await expect(apiRequest('/owners')).rejects.toMatchObject({
        name: 'ApiError',
        message: 'HTTP 403: Forbidden',
        status: 403,
        statusText: 'Forbidden',
        body: { detail: 'forbidden' }
      });

      expect(mockClearSession).not.toHaveBeenCalled();
      expect(mockRouterReplace).not.toHaveBeenCalled();
    } finally {
      cleanup();
    }
  });

  it('prefers backend error message for non-auth failures such as finance runtime policy errors', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      statusText: 'Service Unavailable',
      json: vi.fn().mockResolvedValue({
        code: 'FINANCE_CATALOG_DB_REQUIRED',
        message: 'Finance catalog runtime requires database-backed persistence in the default API runtime'
      })
    });

    vi.stubGlobal('fetch', mockFetch);

    const { apiRequest, cleanup } = await importApiModule();

    try {
      await expect(apiRequest('/expenses-catalog')).rejects.toMatchObject({
        name: 'ApiError',
        message: 'Finance catalog runtime requires database-backed persistence in the default API runtime',
        status: 503,
        statusText: 'Service Unavailable',
        body: {
          code: 'FINANCE_CATALOG_DB_REQUIRED',
          message: 'Finance catalog runtime requires database-backed persistence in the default API runtime'
        }
      });

      expect(mockClearSession).not.toHaveBeenCalled();
      expect(mockRouterReplace).not.toHaveBeenCalled();
    } finally {
      cleanup();
    }
  });
});
