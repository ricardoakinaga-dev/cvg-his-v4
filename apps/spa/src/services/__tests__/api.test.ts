import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AUTH_STORAGE_KEYS } from '@cvg-his-v2/shared-auth-sdk';

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
    localStorage.setItem(AUTH_STORAGE_KEYS.accessToken, 'access-token');
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
});
