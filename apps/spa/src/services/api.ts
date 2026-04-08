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

async function getAccessToken(): Promise<string | null> {
  try {
    return localStorage.getItem('cvg-his-v2:access_token');
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
