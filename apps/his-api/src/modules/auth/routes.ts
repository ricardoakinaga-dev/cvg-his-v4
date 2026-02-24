import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';

import { signJwt, verifyJwt, type JwtPayload, type AuthActor } from './service.js';
import { permissionsForRole } from '@cvg-his/rbac';

// Login request schemas
const EmailLoginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

const KeyLoginSchema = z.object({
  key: z.string().min(32, 'API key must be at least 32 characters')
});

const LoginSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('email'), ...EmailLoginSchema.shape }),
  z.object({ type: z.literal('key'), ...KeyLoginSchema.shape })
]);

// Dev login schema (development only)
const DevLoginSchema = z.object({
  accountId: z.string().uuid('Invalid Account ID'),
  role: z.enum(['admin', 'vet', 'enfermagem', 'recepcao']),
  userId: z.string().uuid().optional(),
  unitId: z.string().uuid().optional()
});

const FALLBACK_BOOTSTRAP_ACCOUNT_ID = '00000000-0000-0000-0000-000000000001';
const FALLBACK_BOOTSTRAP_USER_ID = '00000000-0000-0000-0000-000000000001';

function dedupe(values: string[]): string[] {
  return Array.from(new Set(values));
}

function buildActorFromPayload(payload: JwtPayload): AuthActor {
  const roles = payload.roles ?? (payload.role ? [payload.role] : []);
  const inheritedPermissions = roles.flatMap((r) => permissionsForRole(r));
  const permissions = dedupe([...inheritedPermissions, ...(payload.permissions ?? [])]);
  
  return {
    accountId: payload.accountId,
    userId: payload.userId,
    unitId: payload.unitId,
    role: payload.role ?? roles[0],
    roles,
    permissions
  };
}

function resolveBootstrapPayload(): JwtPayload {
  const accountIdCandidate = process.env.ADMIN_ACCOUNT_ID ?? FALLBACK_BOOTSTRAP_ACCOUNT_ID;
  const userIdCandidate = process.env.ADMIN_USER_ID ?? FALLBACK_BOOTSTRAP_USER_ID;

  const accountId = z.string().uuid().safeParse(accountIdCandidate).success
    ? accountIdCandidate
    : FALLBACK_BOOTSTRAP_ACCOUNT_ID;
  const userId = z.string().uuid().safeParse(userIdCandidate).success
    ? userIdCandidate
    : FALLBACK_BOOTSTRAP_USER_ID;

  return {
    accountId,
    userId,
    role: 'admin',
    roles: ['admin']
  };
}

async function ensureBootstrapActorInNonProduction(
  app: {
    env: { NODE_ENV: string };
    db: { $client: { query: (sql: string, params?: unknown[]) => Promise<unknown> } };
  },
  payload: JwtPayload
): Promise<void> {
  if (app.env.NODE_ENV === 'production') {
    return;
  }

  if (!payload.accountId) {
    return;
  }

  const normalizedAccount = payload.accountId.replace(/-/g, '');
  const accountSlug = `bootstrap-${normalizedAccount.slice(0, 16)}`;

  await app.db.$client.query(
    `
      insert into accounts (id, slug, name, is_active)
      values ($1, $2, $3, true)
      on conflict (id) do nothing
    `,
    [payload.accountId, accountSlug, 'Bootstrap Account']
  );

  if (!payload.userId) {
    return;
  }

  const normalizedUser = payload.userId.replace(/-/g, '');
  const bootstrapEmail = `bootstrap-${normalizedUser.slice(0, 16)}@local.invalid`;

  await app.db.$client.query(
    `
      insert into users (id, account_id, email, password_hash, full_name, is_active)
      values ($1, $2, $3, $4, $5, true)
      on conflict (id) do nothing
    `,
    [payload.userId, payload.accountId, bootstrapEmail, 'bootstrap-not-used', 'Bootstrap User']
  );
}

export const authRoutes: FastifyPluginAsync = async (app) => {
  // POST /auth/login - Authenticate with email+password or API key
  app.post('/login', async (request, reply) => {
    const body = request.body as unknown;
    
    // Validate request body
    const parseResult = LoginSchema.safeParse(body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'INVALID_REQUEST',
        message: 'Invalid login request',
        details: parseResult.error.issues
      });
    }
    
    const loginData = parseResult.data;
    
    // Get JWT config from env
    const { JWT_SECRET, JWT_ISSUER, JWT_AUDIENCE } = app.env;
    
    let payload: JwtPayload;
    
    if (loginData.type === 'email') {
      // Email + Password authentication
      // In a real implementation, this would validate against a database
      // For now, we check against ADMIN_EMAIL and ADMIN_PASSWORD env vars
      const adminEmail = process.env.ADMIN_EMAIL;
      const adminPassword = process.env.ADMIN_PASSWORD;
      
      if (!adminEmail || !adminPassword) {
        return reply.status(500).send({
          error: 'AUTH_NOT_CONFIGURED',
          message: 'Email authentication is not configured'
        });
      }
      
      if (loginData.email !== adminEmail || loginData.password !== adminPassword) {
        return reply.status(401).send({
          error: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        });
      }
      
      payload = resolveBootstrapPayload();
      await ensureBootstrapActorInNonProduction(app, payload);
    } else {
      // API Key authentication
      // In a real implementation, this would look up the key in a database
      // For now, we accept any key that looks valid and create a basic user
      // TODO: Implement proper API key validation against database
      
      // For development, accept a special dev key
      if (loginData.key === 'dev-key-super-secret-32-chars-minimum') {
        payload = resolveBootstrapPayload();
        await ensureBootstrapActorInNonProduction(app, payload);
      } else {
        return reply.status(401).send({
          error: 'INVALID_KEY',
          message: 'Invalid API key'
        });
      }
    }
    
    // Sign JWT
    const token = signJwt(payload, {
      jwtSecret: JWT_SECRET,
      jwtIssuer: JWT_ISSUER,
      jwtAudience: JWT_AUDIENCE
    });
    
    const actor = buildActorFromPayload(payload);
    
    return reply.status(200).send({
      token,
      actor,
      expiresIn: 8 * 60 * 60 // 8 hours in seconds
    });
  });
  
  // POST /auth/dev-login - Development-only login (bypasses authentication)
  app.post('/dev-login', async (request, reply) => {
    // Block in production
    if (app.env.NODE_ENV === 'production') {
      return reply.status(404).send({
        error: 'NOT_FOUND',
        message: 'Endpoint not found'
      });
    }
    
    const body = request.body as unknown;
    
    // Validate request body
    const parseResult = DevLoginSchema.safeParse(body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'INVALID_REQUEST',
        message: 'Invalid dev login request',
        details: parseResult.error.issues
      });
    }
    
    const { accountId, role, userId, unitId } = parseResult.data;
    
    // Get JWT config from env
    const { JWT_SECRET, JWT_ISSUER, JWT_AUDIENCE } = app.env;
    
    const payload: JwtPayload = {
      accountId,
      role,
      roles: [role],
      userId,
      unitId
    };
    await ensureBootstrapActorInNonProduction(app, payload);
    
    // Sign JWT
    const token = signJwt(payload, {
      jwtSecret: JWT_SECRET,
      jwtIssuer: JWT_ISSUER,
      jwtAudience: JWT_AUDIENCE
    });
    
    const actor = buildActorFromPayload(payload);
    
    return reply.status(200).send({
      token,
      actor,
      expiresIn: 8 * 60 * 60 // 8 hours in seconds
    });
  });
  
  // POST /auth/verify - Verify a JWT token
  app.post('/verify', async (request, reply) => {
    const body = request.body as { token?: string };
    
    if (!body?.token) {
      return reply.status(400).send({
        error: 'INVALID_REQUEST',
        message: 'Token is required'
      });
    }
    
    const { JWT_SECRET, JWT_ISSUER, JWT_AUDIENCE } = app.env;
    
    const payload = verifyJwt(body.token, {
      jwtSecret: JWT_SECRET,
      jwtIssuer: JWT_ISSUER,
      jwtAudience: [JWT_AUDIENCE]
    });
    
    if (!payload) {
      return reply.status(401).send({
        error: 'INVALID_TOKEN',
        message: 'Invalid or expired token'
      });
    }
    
    const actor = buildActorFromPayload(payload);
    
    return reply.status(200).send({
      valid: true,
      actor
    });
  });
  
  // GET /auth/me - Get current actor from token
  app.get('/me', async (request, reply) => {
    const actor = request.requestContext.get('actor');
    
    if (!actor) {
      return reply.status(401).send({
        error: 'UNAUTHORIZED',
        message: 'Not authenticated'
      });
    }
    
    return reply.status(200).send({ actor });
  });
};
