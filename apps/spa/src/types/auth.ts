export interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  mfaRequired: boolean;
  mfaSetupRequired: boolean;
  user: {
    id: string | null;
    email: string | null;
    name: string | null;
    roles: string[];
  };
}

const AUTH_STORAGE_KEYS = {
  ACCESS_TOKEN: 'cvg-his-v2:access_token',
  REFRESH_TOKEN: 'cvg-his-v2:refresh_token',
  MFA_REQUIRED: 'cvg-his-v2:mfa_required',
  MFA_SETUP_REQUIRED: 'cvg-his-v2:mfa_setup_required'
} as const;

function loadToken(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function saveToken(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage not available
  }
}

function removeToken(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Storage not available
  }
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    return payload;
  } catch {
    return null;
  }
}

function isTokenExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload) return true;
  const exp = payload.exp as number | undefined;
  if (!exp) return true;
  return Date.now() >= exp * 1000;
}
