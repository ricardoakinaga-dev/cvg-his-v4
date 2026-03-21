import { createHmac } from 'node:crypto';

import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { requestContextPlugin } from '../../plugins/requestContext.js';
import { adminIamRoutes } from './routes.js';

vi.mock('@cvg-his/audit', () => ({
  append: vi.fn(async () => ({
    diff: { before: null, after: null, changed: [] }
  }))
}));

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
const ACCOUNT_ID = '00000000-0000-4000-8000-000000000001';
const USER_ID = '11111111-1111-4111-8111-111111111111';
const SESSION_ID = '22222222-2222-4222-8222-222222222222';
const ROLE_ID = '33333333-3333-4333-8333-333333333333';

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
  await app.register(adminIamRoutes);
  await app.ready();
  return app;
}

function buildToken(extraPermissions: string[]): string {
  return signHs256Jwt(
    {
      accountId: ACCOUNT_ID,
      userId: USER_ID,
      sessionId: SESSION_ID,
      role: 'superadmin',
      roles: ['superadmin'],
      permissions: extraPermissions,
      iss: JWT_ISSUER,
      aud: JWT_AUDIENCE,
      exp: Math.floor(Date.now() / 1000) + 60
    },
    JWT_SECRET
  );
}

describe('admin IAM routes', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('blocks self privilege mutation when replacing own roles', async () => {
    mockDbQuery = (sql) => {
      if (sql.includes('from auth_sessions')) {
        return {
          rows: [{ id: SESSION_ID, account_id: ACCOUNT_ID, user_id: USER_ID, revoked_at: null, expires_at: new Date(Date.now() + 60_000).toISOString() }]
        };
      }

      return { rows: [] };
    };

    const app = await buildApp();
    const response = await app.inject({
      method: 'PUT',
      url: `/admin/iam/users/${USER_ID}/roles`,
      headers: {
        authorization: `Bearer ${buildToken(['users.update'])}`
      },
      payload: {
        roleIds: [ROLE_ID]
      }
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({
      statusCode: 403,
      error: 'Forbidden',
      message: 'You cannot change your own privileges or disable your own account.'
    });

    await app.close();
  });

  it('blocks editing permissions of a role assigned to the acting account', async () => {
    mockDbQuery = (sql) => {
      if (sql.includes('from auth_sessions')) {
        return {
          rows: [{ id: SESSION_ID, account_id: ACCOUNT_ID, user_id: USER_ID, revoked_at: null, expires_at: new Date(Date.now() + 60_000).toISOString() }]
        };
      }

      if (sql.includes('select id, name from roles')) {
        return {
          rows: [{ id: ROLE_ID, name: 'superadmin' }]
        };
      }

      return { rows: [] };
    };

    const app = await buildApp();
    const response = await app.inject({
      method: 'PUT',
      url: `/admin/iam/roles/${ROLE_ID}/permissions`,
      headers: {
        authorization: `Bearer ${buildToken(['permissions.manage'])}`
      },
      payload: {
        permissionIds: []
      }
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({
      statusCode: 403,
      error: 'Forbidden',
      message: 'You cannot change permissions of a role currently assigned to your own account.'
    });

    await app.close();
  });
});
