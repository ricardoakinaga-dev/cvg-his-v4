import { defineStore } from 'pinia';
import { AUTH_STORAGE_KEYS } from '@cvg-his-v2/shared-auth-sdk';
import type { AuthState } from '@/types';

const STORAGE_KEYS = {
  // These keys are kept only to remove tokens written by older releases.
  // Access/refresh tokens are no longer read from or persisted in storage.
  ACCESS_TOKEN: AUTH_STORAGE_KEYS.accessToken,
  REFRESH_TOKEN: AUTH_STORAGE_KEYS.refreshToken,
  MFA_REQUIRED: AUTH_STORAGE_KEYS.mfaRequired,
  MFA_SETUP_REQUIRED: AUTH_STORAGE_KEYS.mfaSetupRequired,
  MFA_USER_ID: 'cvg-his-v2:mfa_user_id',
  MFA_CHALLENGE_ID: 'cvg-his-v2:mfa_challenge_id'
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
    name: (payload.displayName as string) ?? (payload.name as string) ?? null,
    roles: (payload.roles as string[]) ?? [],
    accountId: (payload.accountId as string) ?? (payload.account_id as string) ?? null
  };
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => {
    return {
      accessToken: null,
      refreshToken: null,
      mfaRequired: loadFromStorage(STORAGE_KEYS.MFA_REQUIRED) === 'true',
      mfaSetupRequired: loadFromStorage(STORAGE_KEYS.MFA_SETUP_REQUIRED) === 'true',
      pendingMfaUserId: loadFromStorage(STORAGE_KEYS.MFA_USER_ID),
      pendingMfaChallengeId: loadFromStorage(STORAGE_KEYS.MFA_CHALLENGE_ID),
      user: emptyUser()
    };
  },

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
    setTokens(accessToken: string, _refreshToken?: string) {
      this.accessToken = accessToken;
      // Refresh tokens are delivered in an HttpOnly cookie and are never
      // exposed to JavaScript or persisted in browser storage.
      this.refreshToken = null;
      this.user = userFromToken(accessToken);
    },

    async restoreSession(): Promise<boolean> {
      try {
        const { apiRequest } = await import('@/services/api');
        const session = await apiRequest<{ accessToken: string }>('/auth/refresh', {
          method: 'POST',
          skipAuth: true,
          body: '{}'
        });
        this.setTokens(session.accessToken);
        this.clearMfaChallenge();
        return true;
      } catch {
        this.clearSession();
        return false;
      }
    },

    clearSession() {
      this.accessToken = null;
      this.refreshToken = null;
      this.mfaRequired = false;
      this.mfaSetupRequired = false;
      this.pendingMfaUserId = null;
      this.pendingMfaChallengeId = null;
      this.user = emptyUser();
      removeFromStorage(STORAGE_KEYS.ACCESS_TOKEN);
      removeFromStorage(STORAGE_KEYS.REFRESH_TOKEN);
      removeFromStorage(STORAGE_KEYS.MFA_REQUIRED);
      removeFromStorage(STORAGE_KEYS.MFA_SETUP_REQUIRED);
      removeFromStorage(STORAGE_KEYS.MFA_USER_ID);
      removeFromStorage(STORAGE_KEYS.MFA_CHALLENGE_ID);
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

    setPendingMfaChallengeId(challengeId: string | null) {
      this.pendingMfaChallengeId = challengeId;
      if (challengeId) {
        saveToStorage(STORAGE_KEYS.MFA_CHALLENGE_ID, challengeId);
      } else {
        removeFromStorage(STORAGE_KEYS.MFA_CHALLENGE_ID);
      }
    },

    clearMfaChallenge() {
      this.setMfaRequired(false);
      this.setMfaSetupRequired(false);
      this.setPendingMfaUserId(null);
      this.setPendingMfaChallengeId(null);
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
