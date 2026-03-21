import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { scrypt, timingSafeEqual, randomBytes } from 'node:crypto';
import { promisify } from 'node:util';

import { signJwt, verifyJwt, type JwtPayload, type AuthActor } from './service.js';
import { permissionsForRole } from '@cvg-his/rbac';
import { append } from '@cvg-his/audit';
import { requireAuthenticated } from '../../middlewares/requireAuthenticated.js';

import {
  createAuthSession,
  findUserAuthProfileByLogin,
  getActiveSessionById,
  getUserPasswordHashById,
  getUserProfileById,
  markUserSuccessfulLogin,
  registerFailedLoginAttempt,
  revokeAuthSession,
  updateOwnUserPassword,
  updateOwnUserProfile
} from '../iam/service.js';

const scryptAsync = promisify(scrypt);

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

const UpdateMyProfileSchema = z.object({
  email: z.string().email().optional(),
  username: z.string().trim().min(3).max(64).nullable().optional(),
  fullName: z.string().trim().min(3).max(255).optional()
}).refine((value) => Object.keys(value).length > 0, {
  message: 'At least one field must be provided'
});

const ChangeMyPasswordSchema = z.object({
  currentPassword: z.string().min(6, 'Current password is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters')
}).refine((value) => value.currentPassword !== value.newPassword, {
  message: 'New password must be different from current password',
  path: ['newPassword']
});

function dedupe(values: string[]): string[] {
  return Array.from(new Set(values));
}

function isFutureIsoDate(value: string | null | undefined): boolean {
  if (!value) {
    return false;
  }

  return new Date(value).getTime() > Date.now();
}

function buildActorFromPayload(payload: JwtPayload): AuthActor {
  const roles = payload.roles ?? (payload.role ? [payload.role] : []);
  const inheritedPermissions = roles.flatMap((r) => permissionsForRole(r));
  const permissions = dedupe([...inheritedPermissions, ...(payload.permissions ?? [])]);

  return {
    accountId: payload.accountId,
    userId: payload.userId,
    sessionId: payload.sessionId,
    unitId: payload.unitId,
    role: payload.role ?? roles[0],
    roles,
    permissions
  };
}

/**
 * Verifica um password em texto plano contra o hash armazenado.
 *
 * Formato suportado: "scrypt:<salt_hex>:<hash_hex>"
 * Fallback timing-safe para hashes sem prefixo (migração gradual).
 */
async function verifyPasswordHash(plain: string, stored: string): Promise<boolean> {
  if (stored.startsWith('scrypt:')) {
    const parts = stored.split(':');
    if (parts.length !== 3) return false;
    const [, saltHex, hashHex] = parts;
    if (!saltHex || !hashHex) return false;
    const salt = Buffer.from(saltHex, 'hex');
    const expectedHash = Buffer.from(hashHex, 'hex');
    const derivedKey = (await scryptAsync(plain, salt, 64)) as Buffer;
    if (derivedKey.length !== expectedHash.length) return false;
    return timingSafeEqual(derivedKey, expectedHash);
  }

  // Fallback para hashes legados SHA-256 (hex)
  if (/^[a-f0-9]{64}$/i.test(stored)) {
    const crypto = await import('node:crypto');
    const plainSha256 = crypto.createHash('sha256').update(plain).digest('hex');
    const storedBuf = Buffer.from(stored, 'utf8');
    const plainBuf = Buffer.from(plainSha256, 'utf8');
    if (storedBuf.length !== plainBuf.length) return false;
    return timingSafeEqual(storedBuf, plainBuf);
  }

  // Fallback timing-safe para valores em texto plano (permite migração gradual)
  const storedBuf = Buffer.from(stored, 'utf8');
  const plainBuf = Buffer.from(plain, 'utf8');
  if (storedBuf.length !== plainBuf.length) {
    const dummy = Buffer.alloc(storedBuf.length);
    void timingSafeEqual(dummy, dummy);
    return false;
  }
  return timingSafeEqual(storedBuf, plainBuf);
}

/**
 * Gera um hash de senha no formato "scrypt:<salt_hex>:<hash_hex>" (64 bytes).
 * Exportada para uso no seed e CLI de criação de usuários.
 */
export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = (await scryptAsync(plain, salt, 64)) as Buffer;
  return `scrypt:${salt.toString('hex')}:${hash.toString('hex')}`;
}

export const authRoutes: FastifyPluginAsync = async (app) => {
  // POST /auth/login - Authenticate with email+password or API key
  app.post('/login', async (request, reply) => {
    const body = request.body as unknown;

    const parseResult = LoginSchema.safeParse(body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'INVALID_REQUEST',
        message: 'Invalid login request',
        details: parseResult.error.issues
      });
    }

    const loginData = parseResult.data;
    const { JWT_SECRET, JWT_ISSUER, JWT_AUDIENCE } = app.env;

    let payload: JwtPayload;
    let actor: AuthActor;
    const expiresIn = 8 * 60 * 60;
    const expiresAt = new Date(Date.now() + expiresIn * 1000);

    if (loginData.type === 'email') {
      const user = await findUserAuthProfileByLogin(app.db, loginData.email);

      // Retorna mensagem genérica para não vazar existência do email
      if (!user) {
        return reply.status(401).send({
          error: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        });
      }

      if (isFutureIsoDate(user.lockedUntil)) {
        await append({
          accountId: user.accountId,
          actorUserId: user.id,
          roles: user.roles,
          requestId: request.requestContext.requestId,
          action: 'auth.login.failed',
          entityType: 'user',
          entityId: user.id,
          reason: 'account_locked'
        });

        return reply.status(423).send({
          error: 'ACCOUNT_LOCKED',
          message: 'Account temporarily locked due to repeated failed attempts'
        });
      }

      // Verifica senha com scrypt + timingSafeEqual
      const passwordValid = await verifyPasswordHash(loginData.password, user.passwordHash);
      if (!passwordValid) {
        const failedAttempt = await registerFailedLoginAttempt(app.db, {
          userId: user.id
        });

        await append({
          accountId: user.accountId,
          actorUserId: user.id,
          roles: user.roles,
          requestId: request.requestContext.requestId,
          action: 'auth.login.failed',
          entityType: 'user',
          entityId: user.id,
          reason: failedAttempt.lockedUntil ? 'account_locked' : 'invalid_credentials'
        });
        return reply.status(401).send({
          error: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        });
      }

      const { sessionId } = await createAuthSession(app.db, {
        accountId: user.accountId,
        userId: user.id,
        unitId: user.unitId ?? undefined,
        authMethod: 'password',
        expiresAt,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent']
      });

      await markUserSuccessfulLogin(app.db, user.id);

      payload = {
        accountId: user.accountId,
        userId: user.id,
        sessionId,
        unitId: user.unitId ?? undefined,
        role: user.roles[0],
        roles: user.roles,
        permissions: user.permissions
      };

      actor = buildActorFromPayload(payload);

      await append({
        accountId: user.accountId,
        actorUserId: user.id,
        roles: actor.roles,
        requestId: request.requestContext.requestId,
        action: 'auth.login.success',
        entityType: 'session',
        entityId: sessionId,
        reason: 'password_login'
      });
    } else {
      // API Key: validado contra env var API_KEY — sem hardcode no código
      const validApiKey = process.env.API_KEY?.trim();
      if (!validApiKey) {
        return reply.status(500).send({
          error: 'AUTH_NOT_CONFIGURED',
          message: 'API key authentication is not configured'
        });
      }

      const keyBuf = Buffer.from(loginData.key, 'utf8');
      const validBuf = Buffer.from(validApiKey, 'utf8');
      const keyMatch = keyBuf.length === validBuf.length && timingSafeEqual(keyBuf, validBuf);

      if (!keyMatch) {
        return reply.status(401).send({
          error: 'INVALID_KEY',
          message: 'Invalid API key'
        });
      }

      const apiKeyAccountId = process.env.API_KEY_ACCOUNT_ID?.trim();
      if (!apiKeyAccountId) {
        return reply.status(500).send({
          error: 'AUTH_NOT_CONFIGURED',
          message: 'API_KEY_ACCOUNT_ID is required for API key authentication'
        });
      }

      payload = {
        accountId: apiKeyAccountId,
        role: 'admin',
        roles: ['admin']
      };

      actor = buildActorFromPayload(payload);
    }

    const token = signJwt(payload, {
      jwtSecret: JWT_SECRET,
      jwtIssuer: JWT_ISSUER,
      jwtAudience: JWT_AUDIENCE,
      expiresIn
    });

    return reply.status(200).send({
      token,
      actor,
      expiresIn
    });
  });

  // POST /auth/dev-login - Development-only login (bypasses authentication)
  app.post('/dev-login', async (request, reply) => {
    // Bloqueado em produção — retorna 404 para não vazar existência do endpoint
    if (app.env.NODE_ENV === 'production') {
      return reply.status(404).send({
        error: 'NOT_FOUND',
        message: 'Endpoint not found'
      });
    }

    const body = request.body as unknown;

    const parseResult = DevLoginSchema.safeParse(body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'INVALID_REQUEST',
        message: 'Invalid dev login request',
        details: parseResult.error.issues
      });
    }

    const { accountId, role, userId, unitId } = parseResult.data;
    const { JWT_SECRET, JWT_ISSUER, JWT_AUDIENCE } = app.env;

    const payload: JwtPayload = {
      accountId,
      role,
      roles: [role],
      userId,
      unitId
    };

    const token = signJwt(payload, {
      jwtSecret: JWT_SECRET,
      jwtIssuer: JWT_ISSUER,
      jwtAudience: JWT_AUDIENCE
    });

    const actor = buildActorFromPayload(payload);

    return reply.status(200).send({
      token,
      actor,
      expiresIn: 8 * 60 * 60
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

  app.post('/logout', { preHandler: requireAuthenticated }, async (request, reply) => {
    const actor = request.requestContext.actor;

    if (!actor?.accountId || !actor.sessionId) {
      return reply.status(401).send({
        error: 'UNAUTHORIZED',
        message: 'Not authenticated'
      });
    }

    const revoked = await revokeAuthSession(app.db, {
      sessionId: actor.sessionId,
      accountId: actor.accountId,
      reason: 'user_logout'
    });

    if (!revoked) {
      return reply.status(401).send({
        error: 'SESSION_NOT_ACTIVE',
        message: 'Session is no longer active'
      });
    }

    await append({
      accountId: actor.accountId,
      actorUserId: actor.userId,
      roles: actor.roles,
      requestId: request.requestContext.requestId,
      action: 'auth.logout',
      entityType: 'session',
      entityId: actor.sessionId,
      reason: 'user_logout'
    });

    return reply.status(200).send({ ok: true });
  });

  // GET /auth/me - Get current actor from token
  app.get('/me', { preHandler: requireAuthenticated }, async (request, reply) => {
    const actor = request.requestContext.actor;

    if (!actor) {
      return reply.status(401).send({
        error: 'UNAUTHORIZED',
        message: 'Not authenticated'
      });
    }

    let session: Awaited<ReturnType<typeof getActiveSessionById>> | null = null;

    if (actor.sessionId) {
      session = await getActiveSessionById(app.db, {
        sessionId: actor.sessionId,
        accountId: actor.accountId
      });

      if (!session || session.revokedAt) {
        return reply.status(401).send({
          error: 'SESSION_NOT_ACTIVE',
          message: 'Session is no longer active'
        });
      }

      if (new Date(session.expiresAt).getTime() <= Date.now()) {
        return reply.status(401).send({
          error: 'SESSION_EXPIRED',
          message: 'Session has expired'
        });
      }
    }

    return reply.status(200).send({ actor, session });
  });

  app.get('/profile', { preHandler: requireAuthenticated }, async (request, reply) => {
    const actor = request.requestContext.actor;
    if (!actor?.accountId || !actor.userId) {
      return reply.status(401).send({
        error: 'UNAUTHORIZED',
        message: 'Not authenticated'
      });
    }

    const profile = await getUserProfileById(app.db, {
      accountId: actor.accountId,
      userId: actor.userId
    });

    if (!profile) {
      return reply.status(404).send({
        error: 'PROFILE_NOT_FOUND',
        message: 'Profile not found'
      });
    }

    return reply.status(200).send({ profile });
  });

  app.patch('/profile', { preHandler: requireAuthenticated }, async (request, reply) => {
    const actor = request.requestContext.actor;
    if (!actor?.accountId || !actor.userId) {
      return reply.status(401).send({
        error: 'UNAUTHORIZED',
        message: 'Not authenticated'
      });
    }

    const parseResult = UpdateMyProfileSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'INVALID_REQUEST',
        message: 'Invalid profile update request',
        details: parseResult.error.issues
      });
    }

    const updated = await updateOwnUserProfile(app.db, {
      accountId: actor.accountId,
      userId: actor.userId,
      email: parseResult.data.email,
      username: parseResult.data.username,
      fullName: parseResult.data.fullName
    }, {
      requestId: request.requestContext.requestId,
      actorRoles: actor.roles
    });

    if (!updated) {
      return reply.status(404).send({
        error: 'PROFILE_NOT_FOUND',
        message: 'Profile not found'
      });
    }

    const profile = await getUserProfileById(app.db, {
      accountId: actor.accountId,
      userId: actor.userId
    });

    return reply.status(200).send({ ok: true, profile });
  });

  app.post('/change-password', { preHandler: requireAuthenticated }, async (request, reply) => {
    const actor = request.requestContext.actor;
    if (!actor?.accountId || !actor.userId) {
      return reply.status(401).send({
        error: 'UNAUTHORIZED',
        message: 'Not authenticated'
      });
    }

    const parseResult = ChangeMyPasswordSchema.safeParse(request.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'INVALID_REQUEST',
        message: 'Invalid password change request',
        details: parseResult.error.issues
      });
    }

    const currentHash = await getUserPasswordHashById(app.db, {
      accountId: actor.accountId,
      userId: actor.userId
    });

    if (!currentHash) {
      return reply.status(404).send({
        error: 'PROFILE_NOT_FOUND',
        message: 'Profile not found'
      });
    }

    const currentPasswordValid = await verifyPasswordHash(parseResult.data.currentPassword, currentHash);
    if (!currentPasswordValid) {
      return reply.status(401).send({
        error: 'INVALID_CREDENTIALS',
        message: 'Current password is invalid'
      });
    }

    const passwordHash = await hashPassword(parseResult.data.newPassword);
    await updateOwnUserPassword(app.db, {
      accountId: actor.accountId,
      userId: actor.userId,
      passwordHash
    }, {
      requestId: request.requestContext.requestId,
      actorRoles: actor.roles
    });

    return reply.status(200).send({ ok: true });
  });
};
