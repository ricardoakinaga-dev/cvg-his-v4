import { describe, it, expect, beforeEach, afterEach, afterAll, vi } from 'vitest';
import { setAuthSession, getAuthSession, clearAuthSession, isValidSession, AUTH_STORAGE_KEY } from './auth';

// Mock localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => {
            store[key] = value.toString();
        },
        removeItem: (key: string) => {
            delete store[key];
        },
        clear: () => {
            store = {};
        }
    };
})();

Object.defineProperty(window, 'localStorage', {
    value: localStorageMock
});

describe('auth utils', () => {
    const fetchMock = vi.fn();
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    beforeEach(() => {
        localStorageMock.clear();
        fetchMock.mockReset();
        vi.stubGlobal('fetch', fetchMock);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    afterAll(() => {
        consoleWarnSpy.mockRestore();
        consoleErrorSpy.mockRestore();
    });

    it('should persist cookie session server-side and store metadata only', async () => {
        const session = {
            token: 'valid-token-123',
            accountId: '550e8400-e29b-41d4-a716-446655440000', // valid UUID
            role: 'admin'
        };

        fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
        await setAuthSession(session);
        const retrieved = getAuthSession();

        expect(fetchMock).toHaveBeenCalledWith('/api/auth/session', expect.objectContaining({
            method: 'POST'
        }));
        expect(retrieved).toEqual({
            accountId: session.accountId,
            role: session.role
        });
        expect(isValidSession()).toBe(true);
        expect(localStorageMock.getItem(AUTH_STORAGE_KEY)).not.toContain('valid-token-123');
    });

    it('should clear session', async () => {
        localStorageMock.setItem(AUTH_STORAGE_KEY, JSON.stringify({
            accountId: '550e8400-e29b-41d4-a716-446655440000',
            role: 'admin'
        }));
        fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }));
        await clearAuthSession();

        expect(fetchMock).toHaveBeenCalledWith('/api/auth/session', expect.objectContaining({
            method: 'DELETE'
        }));
        expect(getAuthSession()).toBeNull();
        expect(isValidSession()).toBe(false);
    });

    it('should return null for invalid session schema', () => {
        localStorageMock.setItem(AUTH_STORAGE_KEY, JSON.stringify({ foo: 'bar' }));
        expect(getAuthSession()).toBeNull();
    });
});
