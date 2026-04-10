import { AUTH_STORAGE_KEYS } from '@cvg-his-v2/shared-auth-sdk';
import { useAuthStore } from '@/stores/auth';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '';

export interface ApiRequestOptions extends RequestInit {
  skipAuth?: boolean;
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
  try {
    return localStorage.getItem(AUTH_STORAGE_KEYS.accessToken);
  } catch {
    return null;
  }
}

export async function apiRequest<T = unknown>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const { skipAuth, headers: customHeaders, ...restOptions } = options;

  const url = path.startsWith('http') ? path : `${API_BASE}/api${path}`;
  const correlationId = generateCorrelationId();

  const headers = new Headers(customHeaders as HeadersInit | undefined);
  headers.set('Content-Type', 'application/json');
  headers.set('X-Correlation-Id', correlationId);
  headers.set('X-Request-Id', correlationId);

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

  const response = await fetch(url, {
    ...restOptions,
    headers
  });

  if (!response.ok) {
    let body: unknown;
    try {
      body = await response.json();
    } catch {
      body = null;
    }
    throw new ApiError(
      `HTTP ${response.status}: ${response.statusText}`,
      response.status,
      response.statusText,
      body
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}
