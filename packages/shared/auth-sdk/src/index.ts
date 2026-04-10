export function buildAuthorizationHeader(token: string | undefined): string | undefined {
  if (!token || token.trim().length === 0) {
    return undefined;
  }

  return `Bearer ${token}`;
}

export function extractBearerToken(headerValue: string | undefined): string | undefined {
  if (!headerValue) {
    return undefined;
  }

  const [scheme, token] = headerValue.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return undefined;
  }

  return token;
}

export const AUTH_STORAGE_KEYS = {
  accessToken: 'cvg-his-v2:access_token',
  refreshToken: 'cvg-his-v2:refresh_token',
  mfaRequired: 'cvg-his-v2:mfa_required',
  mfaSetupRequired: 'cvg-his-v2:mfa_setup_required'
} as const;
