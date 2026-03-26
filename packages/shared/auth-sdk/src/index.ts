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

  const [scheme, token] = headerValue.split(" ");
  if (scheme !== "Bearer" || !token) {
    return undefined;
  }

  return token;
}

export const AUTH_STORAGE_KEYS = {
  accessToken: "cvg_his_v2_access_token",
  refreshToken: "cvg_his_v2_refresh_token",
} as const;
