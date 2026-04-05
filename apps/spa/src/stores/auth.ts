import { defineStore } from 'pinia';
import type { AuthState } from '@/types';

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'cvg-his-v2:access_token',
  REFRESH_TOKEN: 'cvg-his-v2:refresh_token',
  MFA_REQUIRED: 'cvg-his-v2:mfa_required',
  MFA_SETUP_REQUIRED: 'cvg-his-v2:mfa_setup_required'
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

function decodeJwt(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    return JSON.parse(atob(parts[1]));
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

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    accessToken: loadFromStorage(STORAGE_KEYS.ACCESS_TOKEN),
    refreshToken: loadFromStorage(STORAGE_KEYS.REFRESH_TOKEN),
    mfaRequired: loadFromStorage(STORAGE_KEYS.MFA_REQUIRED) === 'true',
    mfaSetupRequired: loadFromStorage(STORAGE_KEYS.MFA_SETUP_REQUIRED) === 'true',
    user: { id: null, email: null, name: null, roles: [] }
  }),

  getters: {
    isAuthenticated: (state) => {
      if (!state.accessToken) return false;
      return !isExpired(state.accessToken);
    },

    needsMfa: (state) => state.mfaRequired,

    needsMfaSetup: (state) => state.mfaSetupRequired,

    userName: (state) => state.user.name ?? state.user.email ?? 'Usuário'
  },

  actions: {
    setTokens(accessToken: string, refreshToken?: string) {
      this.accessToken = accessToken;
      this.refreshToken = refreshToken ?? null;
      saveToStorage(STORAGE_KEYS.ACCESS_TOKEN, accessToken);
      if (refreshToken) saveToStorage(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);

      const payload = decodeJwt(accessToken);
      if (payload) {
        this.user = {
          id: (payload.sub as string) ?? null,
          email: (payload.email as string) ?? null,
          name: (payload.name as string) ?? null,
          roles: (payload.roles as string[]) ?? []
        };
      }
    },

    setMfaRequired(required: boolean) {
      this.mfaRequired = required;
      if (required) {
        saveToStorage(STORAGE_KEYS.MFA_REQUIRED, 'true');
      } else {
        removeFromStorage(STORAGE_KEYS.MFA_REQUIRED);
      }
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
      this.accessToken = null;
      this.refreshToken = null;
      this.mfaRequired = false;
      this.mfaSetupRequired = false;
      this.user = { id: null, email: null, name: null, roles: [] };
      removeFromStorage(STORAGE_KEYS.ACCESS_TOKEN);
      removeFromStorage(STORAGE_KEYS.REFRESH_TOKEN);
      removeFromStorage(STORAGE_KEYS.MFA_REQUIRED);
      removeFromStorage(STORAGE_KEYS.MFA_SETUP_REQUIRED);
    }
  }
});
