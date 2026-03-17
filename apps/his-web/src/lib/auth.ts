import { z } from 'zod';

export const AUTH_COOKIE_NAME = 'his_token';
export const AUTH_STORAGE_KEY = 'his_auth_session';
const AUTH_SESSION_ROUTE = '/api/auth/session';

// Zod Schemas
export const UserRoleSchema = z.enum(['admin', 'vet', 'enfermagem', 'recepcao']);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const AuthSessionSchema = z.object({
  accountId: z.string().uuid('Invalid Account ID'),
  role: z.string().min(1, 'Role is required'), // Relaxed validation to allow legacy roles if needed, or use UserRoleSchema
  unitId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  permissions: z.array(z.string()).optional(),
  roles: z.array(z.string()).optional(),
});

export type AuthSession = z.infer<typeof AuthSessionSchema>;
export const AuthLoginInputSchema = AuthSessionSchema.extend({
  token: z.string().min(1, 'Token is required')
});
export type AuthLoginInput = z.infer<typeof AuthLoginInputSchema>;

// API response types
export const LoginResponseSchema = z.object({
  token: z.string(),
  actor: z.object({
    accountId: z.string(),
    userId: z.string().optional(),
    unitId: z.string().optional(),
    role: z.string().optional(),
    roles: z.array(z.string()),
    permissions: z.array(z.string())
  }),
  expiresIn: z.number()
});

export type LoginResponse = z.infer<typeof LoginResponseSchema>;

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

async function persistTokenCookie(token: string): Promise<void> {
  if (!isBrowser()) {
    return;
  }

  const response = await fetch(AUTH_SESSION_ROUTE, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    credentials: 'same-origin',
    body: JSON.stringify({ token })
  });

  if (!response.ok) {
    let message = 'Failed to persist auth session cookie.';
    try {
      const payload = await response.json();
      if (payload && typeof payload === 'object' && 'message' in payload) {
        message = String((payload as { message: unknown }).message);
      }
    } catch {
      // ignore parse error
    }

    throw new Error(message);
  }
}

async function clearTokenCookie(): Promise<void> {
  if (!isBrowser()) {
    return;
  }

  await fetch(AUTH_SESSION_ROUTE, {
    method: 'DELETE',
    credentials: 'same-origin'
  });
}

export function getAuthSession(): AuthSession | null {
  if (!isBrowser()) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    const result = AuthSessionSchema.safeParse(parsed);

    if (result.success) {
      return result.data;
    } else {
      console.warn('Invalid auth session format:', result.error);
      void clearAuthSession();
      return null;
    }
  } catch (error) {
    console.error('Failed to read auth session', error);
    return null;
  }
}

export function getAuthToken(): string | null {
  return null;
}

/**
 * Login with email and password
 */
export async function loginWithEmail(email: string, password: string): Promise<LoginResponse> {
  const response = await fetch('/api/proxy/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    credentials: 'same-origin',
    body: JSON.stringify({ type: 'email', email, password })
  });

  if (!response.ok) {
    let message = 'Login failed';
    try {
      const payload = await response.json();
      if (payload && typeof payload === 'object' && 'message' in payload) {
        message = String((payload as { message: unknown }).message);
      }
    } catch {
      // ignore parse error
    }
    throw new Error(message);
  }

  const data = await response.json();
  const result = LoginResponseSchema.safeParse(data);
  
  if (!result.success) {
    throw new Error('Invalid login response');
  }
  
  return result.data;
}

/**
 * Login with API key
 */
export async function loginWithKey(key: string): Promise<LoginResponse> {
  const response = await fetch('/api/proxy/auth/login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    credentials: 'same-origin',
    body: JSON.stringify({ type: 'key', key })
  });

  if (!response.ok) {
    let message = 'Login failed';
    try {
      const payload = await response.json();
      if (payload && typeof payload === 'object' && 'message' in payload) {
        message = String((payload as { message: unknown }).message);
      }
    } catch {
      // ignore parse error
    }
    throw new Error(message);
  }

  const data = await response.json();
  const result = LoginResponseSchema.safeParse(data);
  
  if (!result.success) {
    throw new Error('Invalid login response');
  }
  
  return result.data;
}

/**
 * Development login (only works in development mode)
 */
export async function devLogin(options: {
  accountId: string;
  role: UserRole;
  userId?: string;
  unitId?: string;
}): Promise<LoginResponse> {
  const response = await fetch('/api/proxy/auth/dev-login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    credentials: 'same-origin',
    body: JSON.stringify(options)
  });

  if (!response.ok) {
    let message = 'Dev login failed';
    try {
      const payload = await response.json();
      if (payload && typeof payload === 'object' && 'message' in payload) {
        message = String((payload as { message: unknown }).message);
      }
    } catch {
      // ignore parse error
    }
    throw new Error(message);
  }

  const data = await response.json();
  const result = LoginResponseSchema.safeParse(data);
  
  if (!result.success) {
    throw new Error('Invalid login response');
  }
  
  return result.data;
}

/**
 * Set auth session after successful login
 */
export async function setAuthSession(session: AuthLoginInput): Promise<void> {
  if (!isBrowser()) {
    return;
  }

  const result = AuthLoginInputSchema.safeParse(session);
  if (!result.success) {
    throw new Error('Attempted to set invalid auth session.');
  }

  const validSession = result.data;
  await persistTokenCookie(validSession.token);

  // Persist Full Metadata in LocalStorage
  window.localStorage.setItem(
    AUTH_STORAGE_KEY,
    JSON.stringify({
      accountId: validSession.accountId,
      role: validSession.role,
      unitId: validSession.unitId,
      userId: validSession.userId,
      permissions: validSession.permissions,
      roles: validSession.roles
    })
  );
}

/**
 * Complete login flow - call API, persist token, store session
 */
export async function performLogin(options: 
  | { type: 'email'; email: string; password: string }
  | { type: 'key'; key: string }
  | { type: 'dev'; accountId: string; role: UserRole; userId?: string; unitId?: string }
): Promise<AuthSession> {
  let loginResponse: LoginResponse;
  
  if (options.type === 'email') {
    loginResponse = await loginWithEmail(options.email, options.password);
  } else if (options.type === 'key') {
    loginResponse = await loginWithKey(options.key);
  } else {
    loginResponse = await devLogin(options);
  }
  
  // Persist token in HttpOnly cookie
  await persistTokenCookie(loginResponse.token);
  
  // Store session metadata in localStorage
  const session: AuthSession = {
    accountId: loginResponse.actor.accountId,
    role: loginResponse.actor.role ?? loginResponse.actor.roles[0] ?? '',
    unitId: loginResponse.actor.unitId,
    userId: loginResponse.actor.userId,
    permissions: loginResponse.actor.permissions,
    roles: loginResponse.actor.roles
  };
  
  window.localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
  
  return session;
}

export async function clearAuthSession(): Promise<void> {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.removeItem(AUTH_STORAGE_KEY);

  try {
    await clearTokenCookie();
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[his-web][auth] failed to clear token cookie', error);
    }
  }
}

// Minimal check for cached auth metadata presence.
export function hasAuthToken(): boolean {
  return isValidSession();
}

// Strict check: User must have AccountID + Role metadata cached.
export function isValidSession(): boolean {
  const session = getAuthSession();
  if (!session) return false;
  return session.accountId.length > 0 && session.role.length > 0;
}
