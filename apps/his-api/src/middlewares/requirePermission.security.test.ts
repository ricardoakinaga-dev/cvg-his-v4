import { createHmac } from 'node:crypto';

import Fastify, { type FastifyInstance } from 'fastify';
import { afterEach, describe, expect, it } from 'vitest';

import { requestContextPlugin } from '../plugins/requestContext.js';
import { requirePermission } from './requirePermission.js';

function toBase64Url(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
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

async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify();
  app.decorate('env', {
    NODE_ENV: 'test',
    PORT: 3000,
    DATABASE_URL: 'postgres://test',
    REDIS_URL: 'redis://test',
    QUEUE_PREFIX: 'cvg-his',
    LOG_LEVEL: 'silent',
    JWT_SECRET: process.env.JWT_SECRET ?? 'test-secret',
    JWT_ISSUER: process.env.JWT_ISSUER ?? 'cvg-his-test',
    JWT_AUDIENCE: process.env.JWT_AUDIENCE ?? 'cvg-his-api-test',
    DEFAULT_TIMEZONE: 'UTC',
    MEDICATION_SCHEDULE_DEFAULT_TIMEZONE: 'UTC',
    MEDICATION_SCHEDULE_TIMEZONE_BY_ACCOUNT: '{}',
    MEDICATION_SCHEDULE_TIMEZONE_BY_WARD: '{}',
    QDRANT_URL: undefined,
    QDRANT_COLLECTION: 'professor',
    QDRANT_API_KEY: undefined
  });
  await app.register(requestContextPlugin);

  app.get(
    '/secure',
    {
      preHandler: requirePermission('audit.read')
    },
    async () => ({ ok: true })
  );

  await app.ready();
  return app;
}

describe('requirePermission security hardening', () => {
  const originalJwtSecret = process.env.JWT_SECRET;
  const originalJwtIssuer = process.env.JWT_ISSUER;
  const originalJwtAudience = process.env.JWT_AUDIENCE;

  afterEach(() => {
    process.env.JWT_SECRET = originalJwtSecret;
    process.env.JWT_ISSUER = originalJwtIssuer;
    process.env.JWT_AUDIENCE = originalJwtAudience;
  });

  it('rejects forged x-permissions without valid token', async () => {
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_ISSUER = 'cvg-his-test';
    process.env.JWT_AUDIENCE = 'cvg-his-api-test';
    const app = await buildApp();

    const response = await app.inject({
      method: 'GET',
      url: '/secure',
      headers: {
        'x-account-id': 'acc-forged',
        'x-role': 'admin',
        'x-permissions': '*'
      }
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      message: 'Missing or invalid actor context. Provide a valid Bearer token.'
    });

    await app.close();
  });

  it('rejects forged x-permissions with invalid token signature', async () => {
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_ISSUER = 'cvg-his-test';
    process.env.JWT_AUDIENCE = 'cvg-his-api-test';
    const token = signHs256Jwt(
      {
        accountId: 'acc-1',
        permissions: ['audit.read'],
        iss: 'cvg-his-test',
        aud: 'cvg-his-api-test',
        exp: Math.floor(Date.now() / 1000) + 60
      },
      'different-secret'
    );

    const app = await buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/secure',
      headers: {
        authorization: `Bearer ${token}`,
        'x-account-id': 'acc-1',
        'x-permissions': '*'
      }
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      message: 'Missing or invalid actor context. Provide a valid Bearer token.'
    });

    await app.close();
  });

  it('accepts permissions from token claims and ignores forged header privileges', async () => {
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_ISSUER = 'cvg-his-test';
    process.env.JWT_AUDIENCE = 'cvg-his-api-test';
    const token = signHs256Jwt(
      {
        accountId: 'acc-1',
        userId: 'user-1',
        role: 'recepcao',
        permissions: ['audit.read'],
        iss: 'cvg-his-test',
        aud: 'cvg-his-api-test',
        exp: Math.floor(Date.now() / 1000) + 60
      },
      process.env.JWT_SECRET
    );

    const app = await buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/secure',
      headers: {
        authorization: `Bearer ${token}`,
        'x-permissions': '*'
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({ ok: true });

    await app.close();
  });

  it('does not elevate permissions from x-permissions when token lacks permission', async () => {
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_ISSUER = 'cvg-his-test';
    process.env.JWT_AUDIENCE = 'cvg-his-api-test';
    const token = signHs256Jwt(
      {
        accountId: 'acc-1',
        userId: 'user-1',
        role: 'recepcao',
        permissions: ['owner.read'],
        iss: 'cvg-his-test',
        aud: 'cvg-his-api-test',
        exp: Math.floor(Date.now() / 1000) + 60
      },
      process.env.JWT_SECRET
    );

    const app = await buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/secure',
      headers: {
        authorization: `Bearer ${token}`,
        'x-permissions': '*'
      }
    });

    expect(response.statusCode).toBe(403);
    expect(response.json()).toEqual({
      message: 'Missing required permission: audit.read'
    });

    await app.close();
  });

  it('rejects expired token', async () => {
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_ISSUER = 'cvg-his-test';
    process.env.JWT_AUDIENCE = 'cvg-his-api-test';
    const token = signHs256Jwt(
      {
        accountId: 'acc-1',
        userId: 'user-1',
        permissions: ['audit.read'],
        iss: 'cvg-his-test',
        aud: 'cvg-his-api-test',
        exp: Math.floor(Date.now() / 1000) - 10
      },
      process.env.JWT_SECRET
    );

    const app = await buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/secure',
      headers: {
        authorization: `Bearer ${token}`
      }
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      message: 'Missing or invalid actor context. Provide a valid Bearer token.'
    });

    await app.close();
  });

  it('rejects token with invalid issuer/audience claims', async () => {
    process.env.JWT_SECRET = 'test-secret';
    process.env.JWT_ISSUER = 'cvg-his-test';
    process.env.JWT_AUDIENCE = 'cvg-his-api-test';
    const token = signHs256Jwt(
      {
        accountId: 'acc-1',
        userId: 'user-1',
        permissions: ['audit.read'],
        iss: 'other-issuer',
        aud: 'other-audience',
        exp: Math.floor(Date.now() / 1000) + 60
      },
      process.env.JWT_SECRET
    );

    const app = await buildApp();
    const response = await app.inject({
      method: 'GET',
      url: '/secure',
      headers: {
        authorization: `Bearer ${token}`
      }
    });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({
      message: 'Missing or invalid actor context. Provide a valid Bearer token.'
    });

    await app.close();
  });
});
