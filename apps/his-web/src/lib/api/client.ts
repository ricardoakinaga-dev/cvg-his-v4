// src/lib/api/client.ts
// Unified HTTP API Client for his-web
import { resolvePublicApiBaseConfig } from '../publicEnv';

export type ErrorState = {
  originalUrl: string;
  statusCode: number;
  message: string;
  details?: any;
};

export class ApiError extends Error {
  public state: ErrorState;

  constructor(state: ErrorState) {
    super(state.message);
    this.name = 'ApiError';
    this.state = state;
  }
}

export function getApiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_MODE === 'direct') {
    return process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:3000';
  }

  const { baseUrl } = resolvePublicApiBaseConfig();

  if (typeof window === 'undefined' && baseUrl.startsWith('/')) {
    const appUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3001';
    return `${appUrl}${baseUrl}`;
  }

  return baseUrl;
}

export function buildUrl(endpoint: string, params?: Record<string, string | number | boolean | undefined | null>): string {
  let url = `${getApiBaseUrl()}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        searchParams.append(key, String(value));
      }
    });
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
  }
  return url;
}

function getTenantHeaders(): HeadersInit {
  // DEV fallback: if in dev, we can inject a dummy account id/user id
  // In real life, these come from context, session, or cookies
  const headers: Record<string, string> = {};

  // Example: read from cookies or localStorage if needed.
  if (process.env.NODE_ENV === 'development') {
    // Fallback development tenant so we don't get 401s constantly while debugging UI
    headers['x-account-id'] = '00000000-0000-0000-0000-000000000001';
    headers['x-user-id'] = '00000000-0000-0000-0000-000000000001';
  }

  return headers;
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: any; // Allow objects to be sent, we will stringify
  params?: Record<string, string | number | boolean | undefined>;
}

export async function apiClient<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  let url = `${getApiBaseUrl()}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  if (options.params) {
    const searchParams = new URLSearchParams();
    Object.entries(options.params).forEach(([key, value]) => {
      if (value !== undefined) {
        searchParams.append(key, String(value));
      }
    });
    const qs = searchParams.toString();
    if (qs) url += `?${qs}`;
  }

  const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...getTenantHeaders(),
  };

  const fetchOptions: RequestInit = {
    ...options,
    headers: {
      ...defaultHeaders,
      ...(options.headers || {}),
    },
  };

  if (options.body && typeof options.body === 'object') {
    fetchOptions.body = JSON.stringify(options.body);
  }

  let response: Response;
  try {
    response = await fetch(url, fetchOptions);
  } catch (error: any) {
    // Network error handling
    console.error(`[apiClient] Network error on ${url}:`, error);
    throw new ApiError({
      originalUrl: url,
      statusCode: 0,
      message: error.message || 'Network error',
    });
  }

  const isJson = response.headers.get('content-type')?.includes('application/json');
  let data: any = null;
  let textData: string = '';

  if (isJson) {
    data = await response.json();
  } else {
    textData = await response.text();
  }

  if (!response.ok) {
    const proxyError = isJson && data?.error && typeof data.error === 'object' ? data.error : null;
    const proxyMessage = proxyError && typeof proxyError.message === 'string' ? proxyError.message : undefined;
    throw new ApiError({
      originalUrl: url,
      statusCode: response.status,
      message: isJson && data?.message ? data.message : (proxyMessage || textData || response.statusText),
      details: data,
    });
  }

  return data as T;
}

// Backwards compatibility layer for legacy imports (admin.ts, index.ts, etc)
export const fetchJson = apiClient;

export const api = {
  get: <T>(url: string, params?: Record<string, any>) => apiClient<T>(url, { params }),
  post: <T>(url: string, body?: any) => apiClient<T>(url, { method: 'POST', body }),
  put: <T>(url: string, body?: any) => apiClient<T>(url, { method: 'PUT', body }),
  delete: <T>(url: string) => apiClient<T>(url, { method: 'DELETE' }),
};

export type PaginatedResponse<T> = {
  page: number;
  pageSize: number;
  total: number;
  data: T[];
};

export type FetchJsonOptions = RequestOptions;
export type ProblemJson = any;

export async function fetchPaginated<T>(url: string, options?: RequestOptions): Promise<PaginatedResponse<T>> {
  return apiClient<PaginatedResponse<T>>(url, options);
}

export const ApiClientError = ApiError;
export const isApiClientError = (error: any): error is ApiError => error instanceof ApiError;
