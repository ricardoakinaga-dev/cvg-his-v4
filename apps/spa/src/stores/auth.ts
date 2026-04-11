import { defineStore } from 'pinia';
import { AUTH_STORAGE_KEYS } from '@cvg-his-v2/shared-auth-sdk';
import type { AuthState } from '@/types';

const STORAGE_KEYS = {
  ACCESS_TOKEN: AUTH_STORAGE_KEYS.accessToken,
  REFRESH_TOKEN: AUTH_STORAGE_KEYS.refreshToken,
  MFA_REQUIRED: AUTH_STORAGE_KEYS.mfaRequired,
  MFA_SETUP_REQUIRED: AUTH_STORAGE_KEYS.mfaSetupRequired,
  MFA_USER_ID: 'cvg-his-v2:mfa_user_id'
} as const;

function loadFromStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function saveToStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* noop */
  }
}

function removeFromStorage(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    /* noop */
  }
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

function decodeJwt(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    // Backend emits signed tokens as payload.signature.
    // We also accept standard JWTs for forward compatibility.
    const encodedPayload = parts.length === 2 ? parts[0] : parts.length === 3 ? parts[1] : null;
    if (!encodedPayload) return null;

    const decoded = decodeBase64Url(encodedPayload);
    if (!decoded) return null;

    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function isExpired(token: string): boolean {
  const payload = decodeJwt(token);
  if (!payload) return true;
  const exp = payload.exp as number | undefined;
  if (!exp) return true;
  return Date.now() >= exp * 1000;
}

function emptyUser(): AuthState['user'] {
  return { id: null, email: null, name: null, roles: [], accountId: null };
}

function userFromToken(token: string | null): AuthState['user'] {
  if (!token) {
    return emptyUser();
  }

  const payload = decodeJwt(token);
  if (!payload) {
    return emptyUser();
  }

  return {
    id: (payload.sub as string) ?? null,
    email: (payload.email as string) ?? null,
    name: ((payload.displayName as string) ?? (payload.name as string) ?? null),
    roles: (payload.roles as string[]) ?? [],
    accountId: ((payload.accountId as string) ?? (payload.account_id as string) ?? null)
  };
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => {
    const accessToken = loadFromStorage(STORAGE_KEYS.ACCESS_TOKEN);
    return {
      accessToken,
      refreshToken: loadFromStorage(STORAGE_KEYS.REFRESH_TOKEN),
      mfaRequired: loadFromStorage(STORAGE_KEYS.MFA_REQUIRED) === 'true',
      mfaSetupRequired: loadFromStorage(STORAGE_KEYS.MFA_SETUP_REQUIRED) === 'true',
      pendingMfaUserId: loadFromStorage(STORAGE_KEYS.MFA_USER_ID),
      user: userFromToken(accessToken)
    };
  },

  getters: {
    isAuthenticated: (state) => {
      if (!state.accessToken) return false;
      return !isExpired(state.accessToken);
    },

    needsMfa: (state) => state.mfaRequired,

    needsMfaSetup: (state) => state.mfaSetupRequired,

    pendingMfaUserId: (state) => state.pendingMfaUserId,

    userName: (state) => state.user.name ?? state.user.email ?? 'Usuário'
  },

  actions: {
    setTokens(accessToken: string, refreshToken?: string) {
      this.accessToken = accessToken;
      this.refreshToken = refreshToken ?? null;
      saveToStorage(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
      if (refreshToken) saveToStorage(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
      this.user = userFromToken(accessToken);
    },

    clearSession() {
      this.accessToken = null;
      this.refreshToken = null;
      this.mfaRequired = false;
      this.mfaSetupRequired = false;
      this.pendingMfaUserId = null;
      this.user = emptyUser();
      removeFromStorage(STORAGE_KEYS.ACCESS_TOKEN);
      removeFromStorage(STORAGE_KEYS.REFRESH_TOKEN);
      removeFromStorage(STORAGE_KEYS.MFA_REQUIRED);
      removeFromStorage(STORAGE_KEYS.MFA_SETUP_REQUIRED);
      removeFromStorage(STORAGE_KEYS.MFA_USER_ID);
    },

    setMfaRequired(required: boolean) {
      this.mfaRequired = required;
      if (required) {
        saveToStorage(STORAGE_KEYS.MFA_REQUIRED, 'true');
      } else {
        removeFromStorage(STORAGE_KEYS.MFA_REQUIRED);
      }
    },

    setPendingMfaUserId(userId: string | null) {
      this.pendingMfaUserId = userId;
      if (userId) {
        saveToStorage(STORAGE_KEYS.MFA_USER_ID, userId);
      } else {
        removeFromStorage(STORAGE_KEYS.MFA_USER_ID);
      }
    },

    clearMfaChallenge() {
      this.setMfaRequired(false);
      this.setPendingMfaUserId(null);
    },

    setMfaSetupRequired(required: boolean) {
      this.mfaSetupRequired = required;
      if (required) {
        saveToStorage(STORAGE_KEYS.MFA_SETUP_REQUIRED, 'true');
      } else {
        removeFromStorage(STORAGE_KEYS.MFA_SETUP_REQUIRED);
      }
    },

    logout() {
      this.clearSession();
    }
  }
});
