import Fastify, { type FastifyInstance } from 'fastify';
import { describe, expect, it, vi } from 'vitest';

import type { RequestContext } from '../../plugins/requestContext.js';
import { registerErrorHandler } from '../../lib/errors.js';
import { auditRoutes } from './routes.js';

type AuditRow = {
  id: string;
  created_at: string;
  actor_user_id: string | null;
  actor_roles: string[];
  action: string;
  entity_type: string;
  entity_id: string;
  before_json: Record<string, unknown> | null;
  after_json: Record<string, unknown> | null;
  reason: string | null;
  request_id: string | null;
};

const sharedEntityId = 'shared-entity-id';

const rowsByAccount: Record<string, AuditRow[]> = {
  'tenant-a': [
    {
      id: 'audit-a',
      created_at: '2026-02-19T12:00:00.000Z',
      actor_user_id: null,
      actor_roles: ['admin'],
      action: 'OwnerUpdated',
      entity_type: 'owner',
      entity_id: sharedEntityId,
      before_json: null,
      after_json: { phoneMain: '1111-1111' },
      reason: null,
      request_id: 'req-a'
    }
  ],
  'tenant-b': [
    {
      id: 'audit-b',
      created_at: '2026-02-19T12:00:00.000Z',
      actor_user_id: null,
      actor_roles: ['admin'],
      action: 'OwnerUpdated',
      entity_type: 'owner',
      entity_id: sharedEntityId,
      before_json: null,
      after_json: { phoneMain: '2222-2222' },
      reason: null,
      request_id: 'req-b'
    }
  ]
};

async function buildApp(accountId: string): Promise<{
  app: FastifyInstance;
  queryMock: ReturnType<typeof vi.fn>;
}> {
  const queryMock = vi.fn(async (text: string, values?: unknown[]) => {
    expect(text).toContain('ae.account_id = $1');
    const scopedAccountId = String(values?.[0] ?? '');
    const scopedRows = rowsByAccount[scopedAccountId] ?? [];

    if (text.includes('count(*)::int as total')) {
      return {
        rows: [{ total: scopedRows.length }]
      };
    }

    return {
      rows: scopedRows
    };
  });

  const actor: RequestContext['actor'] = {
    accountId,
    userId: `${accountId}-user`,
    role: 'admin',
    roles: ['admin'],
    permissions: ['audit.read']
  };

  const app = Fastify();
  app.decorate('db', {
    $client: {
      query: queryMock
    }
  } as unknown as typeof import('@cvg-his/db').db);
  app.decorate('env', {
    NODE_ENV: 'test',
    PORT: 3000,
    DATABASE_URL: 'postgres://test',
    REDIS_URL: 'redis://test',
    QUEUE_PREFIX: 'cvg-his',
    LOG_LEVEL: 'silent',
    JWT_SECRET: 'test-secret',
    JWT_ISSUER: 'cvg-his-test',
    JWT_AUDIENCE: 'cvg-his-api-test',
    DEFAULT_TIMEZONE: 'UTC',
    MEDICATION_SCHEDULE_DEFAULT_TIMEZONE: 'UTC',
    MEDICATION_SCHEDULE_TIMEZONE_BY_ACCOUNT: '{}',
    MEDICATION_SCHEDULE_TIMEZONE_BY_WARD: '{}',
    QDRANT_URL: undefined,
    QDRANT_COLLECTION: 'professor',
    QDRANT_API_KEY: undefined
  });

  app.addHook('onRequest', async (request) => {
    request.requestContext = {
      requestId: request.id,
      actor
    };
  });

  registerErrorHandler(app);
  await app.register(auditRoutes);
  await app.ready();

  return {
    app,
    queryMock
  };
}

describe('audit routes tenancy', () => {
  it('prevents cross-tenant read for same entity id', async () => {
    const tenantA = await buildApp('tenant-a');
    const tenantB = await buildApp('tenant-b');

    const [responseA, responseB] = await Promise.all([
      tenantA.app.inject({
        method: 'GET',
        url: `/audit?entity_type=owner&entity_id=${sharedEntityId}&page=1&pageSize=20`
      }),
      tenantB.app.inject({
        method: 'GET',
        url: `/audit?entity_type=owner&entity_id=${sharedEntityId}&page=1&pageSize=20`
      })
    ]);

    expect(responseA.statusCode).toBe(200);
    expect(responseB.statusCode).toBe(200);

    expect(responseA.json()).toMatchObject({
      total: 1,
      data: [{ id: 'audit-a', entity_id: sharedEntityId }]
    });
    expect(responseB.json()).toMatchObject({
      total: 1,
      data: [{ id: 'audit-b', entity_id: sharedEntityId }]
    });

    expect(tenantA.queryMock).toHaveBeenCalled();
    expect(tenantB.queryMock).toHaveBeenCalled();

    await tenantA.app.close();
    await tenantB.app.close();
  });
});
