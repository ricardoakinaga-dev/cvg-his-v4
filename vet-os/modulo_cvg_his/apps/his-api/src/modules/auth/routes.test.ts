import { createHmac } from 'node:crypto';

import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { authRoutes } from './routes.js';
import { requestContextPlugin } from '../../plugins/requestContext.js';

vi.mock('@cvg-his/audit', () => ({
  append: vi.fn(async (input: Record<string, unknown>) => ({
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    requestId: input.requestId,
    diff: { before: null, after: null, changed: [] }
  }))
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

function toBase64Url(value: string): string {
  return Buffer.from(value, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function signHs256Jwt(payload: Record<string, unknown>, secret: string): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = toBase64Url(JSON.stringify(header));
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const content = `${encodedHeader}.${encodedPayload}`;
  const signature = createHmac('sha256', secret)
    .update(content)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
  return `${content}.${signature}`;
}

const JWT_SECRET = 'test-secret-minimum-32-chars-ok!';
const JWT_ISSUER = 'cvg-his-test';
const JWT_AUDIENCE = 'cvg-his-api-test';

// Mock de DB: permite controlar findUserByEmail por teste
let mockDbQuery: (sql: string, params?: unknown[]) => { rows: Record<string, unknown>[] };

async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify();

  app.decorate('env', {
    NODE_ENV: 'test',
    PORT: 3000,
    DATABASE_URL: 'postgres://test',
    REDIS_URL: 'redis://test',
    QUEUE_PREFIX: 'cvg-his',
    LOG_LEVEL: 'silent',
    JWT_SECRET,
    JWT_ISSUER,
    JWT_AUDIENCE,
    DEFAULT_TIMEZONE: 'UTC',
    MEDICATION_SCHEDULE_DEFAULT_TIMEZONE: 'UTC',
    MEDICATION_SCHEDULE_TIMEZONE_BY_ACCOUNT: '{}',
    MEDICATION_SCHEDULE_TIMEZONE_BY_WARD: '{}',
    QDRANT_URL: undefined,
    QDRANT_COLLECTION: 'professor',
    QDRANT_API_KEY: undefined
  });

  // Mock mínimo do db compatível com findUserByEmail
  app.decorate('db', {
    $client: {
      query: ((sql: string, params?: unknown[]) => Promise.resolve(mockDbQuery(sql, params))) as typeof import('@cvg-his/db').db.$client.query
    }
  } as unknown as typeof import('@cvg-his/db').db);
  app.decorateRequest('db', {
    getter() {
      return app.db;
    }
  });

  await app.register(requestContextPlugin);
  await app.register(authRoutes, { prefix: '/auth' });
  await app.ready();
  return app;
}

// ── Testes ────────────────────────────────────────────────────────────────────

describe('auth routes', () => {
  const originalApiKey = process.env.API_KEY;
  const originalApiKeyAccountId = process.env.API_KEY_ACCOUNT_ID;

  afterEach(() => {
    process.env.API_KEY = originalApiKey;
    process.env.API_KEY_ACCOUNT_ID = originalApiKeyAccountId;
  });

  // ── POST /auth/login (email) ───────────────────────────────────────────────

  describe('POST /auth/login (email)', () => {
    it('retorna 400 para body inválido', async () => {
      mockDbQuery = () => ({ rows: [] });
      const app = await buildApp();

      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { type: 'email', email: 'not-an-email', password: '123' }
      });

      expect(response.statusCode).toBe(400);
      expect(response.json().error).toBe('INVALID_REQUEST');
      await app.close();
    });

    it('retorna 401 quando usuário não existe no banco', async () => {
      mockDbQuery = () => ({ rows: [] });
      const app = await buildApp();

      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { type: 'email', email: 'naoexiste@cvg.local', password: 'senha123' }
      });

      expect(response.statusCode).toBe(401);
      expect(response.json().error).toBe('INVALID_CREDENTIALS');
      await app.close();
    });

    it('retorna 401 quando senha está errada (hash não confere)', async () => {
      // password_hash sem prefixo scrypt — fallback timing-safe comparison
      mockDbQuery = () => ({
        rows: [
          {
            id: '11111111-1111-4111-8111-111111111111',
            account_id: '00000000-0000-4000-8000-000000000001',
            unit_id: null,
            email: 'admin@cvg.local',
            username: 'admin',
            password_hash: 'outra-senha-que-nao-bate',
            full_name: 'Admin',
            is_active: true,
            must_change_password: false,
            failed_login_attempts: 0,
            locked_until: null,
            roles: ['admin'],
            permissions: ['users.read']
          }
        ]
      });
      const app = await buildApp();

      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { type: 'email', email: 'admin@cvg.local', password: 'senha-errada' }
      });

      expect(response.statusCode).toBe(401);
      expect(response.json().error).toBe('INVALID_CREDENTIALS');
      await app.close();
    });

    it('retorna 200 com token JWT quando credenciais estão corretas (texto plano fallback)', async () => {
      // Simula hash legado em texto plano para facilitar o teste sem scrypt real
      const plainPassword = 'senha-correta';
      mockDbQuery = (sql) => {
        if (sql.includes('insert into auth_sessions')) {
          return {
            rows: [{ id: '22222222-2222-4222-8222-222222222222' }]
          };
        }

        return {
          rows: [
            {
              id: '11111111-1111-4111-8111-111111111111',
              account_id: '00000000-0000-4000-8000-000000000001',
              unit_id: null,
              email: 'admin@cvg.local',
              username: 'admin',
              password_hash: plainPassword,
              full_name: 'Admin',
              is_active: true,
              must_change_password: false,
              failed_login_attempts: 0,
              locked_until: null,
              roles: ['admin'],
              permissions: ['users.read', 'users.update']
            }
          ]
        };
      };
      const app = await buildApp();

      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { type: 'email', email: 'admin@cvg.local', password: plainPassword }
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.token).toBeDefined();
      expect(typeof body.token).toBe('string');
      expect(body.actor.accountId).toBe('00000000-0000-4000-8000-000000000001');
      expect(body.actor.userId).toBe('11111111-1111-4111-8111-111111111111');
      await app.close();
    });
  });

  // ── POST /auth/login (API key) ─────────────────────────────────────────────

  describe('POST /auth/login (API key)', () => {
    it('retorna 500 quando API_KEY não está configurada', async () => {
      delete process.env.API_KEY;
      mockDbQuery = () => ({ rows: [] });
      const app = await buildApp();

      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { type: 'key', key: 'uma-chave-qualquer-com-32-chars-ok' }
      });

      expect(response.statusCode).toBe(500);
      expect(response.json().error).toBe('AUTH_NOT_CONFIGURED');
      await app.close();
    });

    it('retorna 401 quando a API key não confere', async () => {
      process.env.API_KEY = 'chave-valida-no-env-com-32-chars-ok';
      process.env.API_KEY_ACCOUNT_ID = 'account-abc';
      mockDbQuery = () => ({ rows: [] });
      const app = await buildApp();

      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { type: 'key', key: 'chave-errada-no-payload-32-chars!' }
      });

      expect(response.statusCode).toBe(401);
      expect(response.json().error).toBe('INVALID_KEY');
      await app.close();
    });

    it('retorna 200 com token JWT quando API key é válida', async () => {
      const apiKey = 'chave-valida-no-env-com-32-chars-ok';
      process.env.API_KEY = apiKey;
      process.env.API_KEY_ACCOUNT_ID = 'account-xyz';
      mockDbQuery = () => ({ rows: [] });
      const app = await buildApp();

      const response = await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { type: 'key', key: apiKey }
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.token).toBeDefined();
      expect(body.actor.accountId).toBe('account-xyz');
      await app.close();
    });
  });

  // ── POST /auth/verify ──────────────────────────────────────────────────────

  describe('POST /auth/verify', () => {
    it('retorna 400 quando token não é enviado', async () => {
      mockDbQuery = () => ({ rows: [] });
      const app = await buildApp();

      const response = await app.inject({
        method: 'POST',
        url: '/auth/verify',
        payload: {}
      });

      expect(response.statusCode).toBe(400);
      await app.close();
    });

    it('retorna 401 para token expirado', async () => {
      mockDbQuery = () => ({ rows: [] });
      const token = signHs256Jwt(
        {
          accountId: 'account-1',
          iss: JWT_ISSUER,
          aud: JWT_AUDIENCE,
          exp: Math.floor(Date.now() / 1000) - 60
        },
        JWT_SECRET
      );
      const app = await buildApp();

      const response = await app.inject({
        method: 'POST',
        url: '/auth/verify',
        payload: { token }
      });

      expect(response.statusCode).toBe(401);
      expect(response.json().error).toBe('INVALID_TOKEN');
      await app.close();
    });

    it('retorna 200 com actor para token válido', async () => {
      mockDbQuery = () => ({ rows: [] });
      const token = signHs256Jwt(
        {
          accountId: 'account-1',
          userId: 'user-1',
          role: 'vet',
          iss: JWT_ISSUER,
          aud: JWT_AUDIENCE,
          exp: Math.floor(Date.now() / 1000) + 3600
        },
        JWT_SECRET
      );
      const app = await buildApp();

      const response = await app.inject({
        method: 'POST',
        url: '/auth/verify',
        payload: { token }
      });

      expect(response.statusCode).toBe(200);
      expect(response.json().valid).toBe(true);
      expect(response.json().actor.accountId).toBe('account-1');
      await app.close();
    });
  });

  // ── POST /auth/dev-login ───────────────────────────────────────────────────

  describe('POST /auth/dev-login', () => {
    it('retorna 400 para body inválido', async () => {
      mockDbQuery = () => ({ rows: [] });
      const app = await buildApp();

      const response = await app.inject({
        method: 'POST',
        url: '/auth/dev-login',
        payload: { accountId: 'not-a-uuid', role: 'vet' }
      });

      expect(response.statusCode).toBe(400);
      await app.close();
    });

    it('retorna 200 com token para credenciais dev válidas', async () => {
      mockDbQuery = () => ({ rows: [] });
      const app = await buildApp();

      const response = await app.inject({
        method: 'POST',
        url: '/auth/dev-login',
        payload: {
          accountId: '550e8400-e29b-41d4-a716-446655440000',
          role: 'vet',
          userId: '550e8400-e29b-41d4-a716-446655440001'
        }
      });

      expect(response.statusCode).toBe(200);
      const body = response.json();
      expect(body.token).toBeDefined();
      expect(body.actor.accountId).toBe('550e8400-e29b-41d4-a716-446655440000');
      expect(body.actor.role).toBe('vet');
      await app.close();
    });
  });

  describe('POST /auth/logout', () => {
    it('revoga a sessão autenticada atual', async () => {
      mockDbQuery = (sql) => {
        if (sql.includes('from auth_sessions')) {
          return {
            rows: [
              {
                id: '33333333-3333-4333-8333-333333333333',
                account_id: '00000000-0000-4000-8000-000000000001',
                user_id: '11111111-1111-4111-8111-111111111111',
                revoked_at: null,
                expires_at: new Date(Date.now() + 60_000).toISOString()
              }
            ]
          };
        }

        if (sql.includes('update auth_sessions')) {
          return {
            rows: [{ id: '33333333-3333-4333-8333-333333333333' }]
          };
        }

        return { rows: [] };
      };

      const app = await buildApp();
      const token = signHs256Jwt(
        {
          accountId: '00000000-0000-4000-8000-000000000001',
          userId: '11111111-1111-4111-8111-111111111111',
          sessionId: '33333333-3333-4333-8333-333333333333',
          role: 'admin',
          roles: ['admin'],
          permissions: ['users.read'],
          iss: JWT_ISSUER,
          aud: JWT_AUDIENCE,
          exp: Math.floor(Date.now() / 1000) + 60
        },
        JWT_SECRET
      );

      const response = await app.inject({
        method: 'POST',
        url: '/auth/logout',
        headers: {
          authorization: `Bearer ${token}`
        }
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({ ok: true });
      await app.close();
    });
  });
});
