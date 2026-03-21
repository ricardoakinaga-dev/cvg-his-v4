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
  sessionId: z.string().uuid().optional(),
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
    sessionId: z.string().optional(),
    unitId: z.string().optional(),
    role: z.string().optional(),
    roles: z.array(z.string()),
    permissions: z.array(z.string())
  }),
  expiresIn: z.number()
});

export type LoginResponse = z.infer<typeof LoginResponseSchema>;

const AuthMeResponseSchema = z.object({
  actor: z.object({
    accountId: z.string().uuid(),
    userId: z.string().uuid().optional(),
    sessionId: z.string().uuid().optional(),
    unitId: z.string().uuid().optional(),
    role: z.string().optional(),
    roles: z.array(z.string()).default([]),
    permissions: z.array(z.string()).default([])
  }),
  session: z
    .object({
      id: z.string().uuid().optional(),
      accountId: z.string().uuid().optional(),
      userId: z.string().uuid().optional(),
      unitId: z.string().uuid().optional(),
      expiresAt: z.string().optional(),
      revokedAt: z.string().nullable().optional()
    })
    .nullable()
    .optional()
});

type AuthMeResponse = z.infer<typeof AuthMeResponseSchema>;

const AuthProfilePolicySchema = z.object({
  profile: z.object({
    must_change_password: z.boolean()
  })
});

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

function persistSessionMetadata(session: AuthSession): void {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(
    AUTH_STORAGE_KEY,
    JSON.stringify({
      accountId: session.accountId,
      role: session.role,
      unitId: session.unitId,
      userId: session.userId,
      sessionId: session.sessionId,
      permissions: session.permissions,
      roles: session.roles
    })
  );
}

function removeSessionMetadata(): void {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.removeItem(AUTH_STORAGE_KEY);
}

async function logoutFromServer(): Promise<void> {
  if (!isBrowser()) {
    return;
  }

  await fetch('/api/proxy/auth/logout', {
    method: 'POST',
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
  persistSessionMetadata(validSession);
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
    sessionId: loginResponse.actor.sessionId,
    permissions: loginResponse.actor.permissions,
    roles: loginResponse.actor.roles
  };

  persistSessionMetadata(session);
  
  return session;
}

export async function syncAuthSessionFromServer(): Promise<AuthSession | null> {
  if (!isBrowser()) {
    return null;
  }

  let response: Response;
  try {
    response = await fetch('/api/proxy/auth/me', {
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store'
    });
  } catch {
    return getAuthSession();
  }

  if (response.status === 401) {
    removeSessionMetadata();
    try {
      await clearTokenCookie();
    } catch {
      // Ignore cookie cleanup failures during session bootstrap.
    }
    return null;
  }

  if (!response.ok) {
    throw new Error(`Failed to load auth session (${response.status})`);
  }

  const payload = await response.json();
  const result = AuthMeResponseSchema.safeParse(payload);
  if (!result.success) {
    throw new Error('Invalid auth session response');
  }

  const session = toAuthSession(result.data);
  persistSessionMetadata(session);
  return session;
}

export async function getAuthProfilePolicy(): Promise<{ mustChangePassword: boolean } | null> {
  if (!isBrowser()) {
    return null;
  }

  const response = await fetch('/api/proxy/auth/profile', {
    method: 'GET',
    credentials: 'same-origin',
    cache: 'no-store'
  });

  if (response.status === 401) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`Failed to load auth profile (${response.status})`);
  }

  const payload = await response.json();
  const result = AuthProfilePolicySchema.safeParse(payload);
  if (!result.success) {
    throw new Error('Invalid auth profile response');
  }

  return {
    mustChangePassword: result.data.profile.must_change_password
  };
}

function toAuthSession(payload: AuthMeResponse): AuthSession {
  return {
    accountId: payload.actor.accountId,
    role: payload.actor.role ?? payload.actor.roles[0] ?? '',
    unitId: payload.actor.unitId,
    userId: payload.actor.userId,
    sessionId: payload.actor.sessionId ?? payload.session?.id,
    permissions: payload.actor.permissions,
    roles: payload.actor.roles
  };
}

export async function clearAuthSession(): Promise<void> {
  if (!isBrowser()) {
    return;
  }

  removeSessionMetadata();

  try {
    await logoutFromServer();
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[his-web][auth] failed to revoke backend session', error);
    }
  }

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
