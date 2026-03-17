import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { scrypt, timingSafeEqual, randomBytes } from 'node:crypto';
import { promisify } from 'node:util';

import { signJwt, verifyJwt, type JwtPayload, type AuthActor } from './service.js';
import { permissionsForRole } from '@cvg-his/rbac';

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

type UserRow = {
  id: string;
  accountId: string;
  unitId: string | null;
  email: string;
  passwordHash: string;
  isActive: boolean;
};

type DbLike = {
  $client: {
    query(sql: string, params: unknown[]): Promise<{ rows: Record<string, unknown>[] }>;
  };
};

/**
 * Busca usuário ativo no banco pelo email.
 * Retorna null se não encontrado, inativo ou account inativo.
 */
async function findUserByEmail(db: DbLike, email: string): Promise<UserRow | null> {
  const result = await db.$client.query(
    `
      select u.id, u.account_id, u.unit_id, u.email, u.password_hash, u.is_active
      from users u
      join accounts a on a.id = u.account_id
      where lower(u.email) = lower($1)
        and u.is_active = true
        and a.is_active = true
      limit 1
    `,
    [email]
  );

  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return {
    id: String(row.id),
    accountId: String(row.account_id),
    unitId: row.unit_id ? String(row.unit_id) : null,
    email: String(row.email),
    passwordHash: String(row.password_hash),
    isActive: Boolean(row.is_active)
  };
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

    if (loginData.type === 'email') {
      // Busca o usuário no banco — sem credenciais hardcoded no código
      const user = await findUserByEmail(app.db, loginData.email);

      // Retorna mensagem genérica para não vazar existência do email
      if (!user) {
        return reply.status(401).send({
          error: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        });
      }

      // Verifica senha com scrypt + timingSafeEqual
      const passwordValid = await verifyPasswordHash(loginData.password, user.passwordHash);
      if (!passwordValid) {
        return reply.status(401).send({
          error: 'INVALID_CREDENTIALS',
          message: 'Invalid email or password'
        });
      }

      payload = {
        accountId: user.accountId,
        userId: user.id,
        unitId: user.unitId ?? undefined,
        role: 'admin',
        roles: ['admin']
      };
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
    }

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

  // GET /auth/me - Get current actor from token
  app.get('/me', async (request, reply) => {
    const actor = request.requestContext.actor;

    if (!actor) {
      return reply.status(401).send({
        error: 'UNAUTHORIZED',
        message: 'Not authenticated'
      });
    }

    return reply.status(200).send({ actor });
  });
};
