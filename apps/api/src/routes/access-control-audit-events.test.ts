import assert from 'node:assert/strict';
import type { IncomingMessage } from 'node:http';
import { Readable, Writable } from 'node:stream';
import test from 'node:test';

import { AccessControlService } from '@cvg-his-v2/module-access-control';
import { encodeAuditCursor } from '@cvg-his-v2/module-audit';
import { UsersService, type UserRecord } from '@cvg-his-v2/module-users';
import {
  AppError,
  AuthenticationError,
  ForbiddenError,
  ValidationError
} from '@cvg-his-v2/shared-errors';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';
import { handleAccessControlRoutes } from './access-control-routes.js';
import type { TenantCommandInput } from '../helpers/tenant-command.js';

class MockResponse extends Writable {
  public statusCode = 200;
  readonly #chunks: Buffer[] = [];

  _write(
    chunk: string | Buffer,
    _encoding: BufferEncoding,
    callback: (error?: Error | null) => void
  ): void {
    this.#chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    callback();
  }

  override end(
    chunk?: string | Buffer | (() => void),
    encoding?: BufferEncoding | (() => void),
    callback?: () => void
  ): this {
    const finalCallback =
      typeof chunk === 'function' ? chunk : typeof encoding === 'function' ? encoding : callback;
    if (chunk !== undefined && typeof chunk !== 'function') {
      this.#chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    finalCallback?.();
    return this;
  }

  bodyJson<T>() {
    return JSON.parse(Buffer.concat(this.#chunks).toString('utf8')) as T;
  }
}

function createPrincipal(
  permissionCodes: readonly string[] = ['audit.read'],
  userId = 'user-1',
  accountId = 'acc-1'
): AuthenticatedPrincipal {
  return {
    user: {
      id: userId as never,
      accountId: accountId as never,
      username: 'audit',
      email: 'audit@example.com',
      displayName: 'Auditoria',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    session: {
      sessionId: 'session-1' as never,
      userId: 'user-1' as never,
      accountId: 'acc-1' as never,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      authTime: new Date().toISOString(),
      refreshExpiresAt: new Date(Date.now() + 120_000).toISOString(),
      active: true
    },
    access: {
      roleCodes: ['audit'],
      permissionCodes: [...permissionCodes],
      capabilities: []
    }
  };
}

const allowAbac = () => {};

function jsonRequest(method: string, url: string, body: unknown) {
  const request = Readable.from([JSON.stringify(body)]) as never as {
    method: string;
    url: string;
  };
  request.method = method;
  request.url = url;
  return request as never;
}

function createUsersService(): UsersService {
  const now = '2026-05-01T00:00:00.000Z';
  const users: UserRecord[] = [
    {
      id: 'user-admin' as never,
      accountId: 'acc-1' as never,
      username: 'admin',
      email: 'admin@example.com',
      displayName: 'Admin',
      status: 'active',
      createdAt: now,
      updatedAt: now,
      passwordHash: 'test',
      roleCodes: []
    },
    {
      id: 'user-a' as never,
      accountId: 'acc-1' as never,
      username: 'user-a',
      email: 'user-a@example.com',
      displayName: 'Usuário A',
      status: 'active',
      createdAt: now,
      updatedAt: now,
      passwordHash: 'test',
      roleCodes: []
    },
    {
      id: 'user-b' as never,
      accountId: 'acc-1' as never,
      username: 'user-b',
      email: 'user-b@example.com',
      displayName: 'Usuário B',
      status: 'active',
      createdAt: now,
      updatedAt: now,
      passwordHash: 'test',
      roleCodes: []
    },
    {
      id: 'user-other' as never,
      accountId: 'acc-2' as never,
      username: 'user-other',
      email: 'user-other@example.com',
      displayName: 'Usuário Outra Conta',
      status: 'active',
      createdAt: now,
      updatedAt: now,
      passwordHash: 'test',
      roleCodes: []
    }
  ];
  return new UsersService({ seedUsersEnabled: true }, users);
}

function createAccessHandlers(accessControl: AccessControlService, users = createUsersService()) {
  const audit = {
    list: () => [],
    write: () => undefined
  };
  const principal = createPrincipal(['access.read', 'users.manage'], 'user-admin', 'acc-1');
  return {
    accessControl,
    users,
    audit: audit as never,
    requirePrincipal: (_request: IncomingMessage, permissionCode: string) => {
      accessControl.assertAuthorized({
        actor: principal.user,
        access: principal.access,
        permissionCode,
        accountId: principal.user.accountId
      });
      return principal;
    },
    enforceAbac: allowAbac
  };
}

test('access-control audit route filters audit events by finance domain query params', async () => {
  const response = new MockResponse();
  const auditEvents = [
    {
      actorId: 'user-1',
      accountId: 'acc-1',
      module: 'billing',
      action: 'update_expense_catalog_item',
      entityType: 'expense-catalog',
      entityId: 'DES-101',
      correlationId: 'corr-fin-1',
      riskLevel: 'medium',
      payloadSummary: 'Expense catalog item updated',
      occurredAt: '2026-04-22T12:10:00.000Z'
    },
    {
      actorId: 'user-2',
      accountId: 'acc-1',
      module: 'billing',
      action: 'create_cost_center_catalog_item',
      entityType: 'cost-center-catalog',
      entityId: 'ADM-FIN',
      correlationId: 'corr-fin-2',
      riskLevel: 'medium',
      payloadSummary: 'Cost center catalog item created',
      occurredAt: '2026-04-22T12:00:00.000Z'
    },
    {
      actorId: 'user-3',
      accountId: 'acc-1',
      module: 'integrations',
      action: 'webhook.updated',
      entityType: 'webhook',
      entityId: 'wh-1',
      correlationId: 'corr-ext-1',
      riskLevel: 'high',
      payloadSummary: 'Webhook sensível alterado',
      occurredAt: '2026-04-22T11:50:00.000Z'
    }
  ];

  const handled = await handleAccessControlRoutes(
    '/audit/events',
    {
      method: 'GET',
      url: '/audit/events?module=billing&entityType=cost-center-catalog&correlationId=corr-fin-2&q=ADM-FIN&limit=10'
    } as never,
    response as never,
    'corr-audit-1',
    {
      accessControl: {} as never,
      users: {} as never,
      audit: {
        list: () => auditEvents,
        write: () => undefined
      } as never,
      requirePrincipal: () => createPrincipal(),
      enforceAbac: allowAbac
    }
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.bodyJson<{ items: Array<{ entityId: string; module: string }> }>(), {
    items: [
      {
        actorId: 'user-2',
        accountId: 'acc-1',
        module: 'billing',
        action: 'create_cost_center_catalog_item',
        entityType: 'cost-center-catalog',
        entityId: 'ADM-FIN',
        correlationId: 'corr-fin-2',
        riskLevel: 'medium',
        payloadSummary: 'Cost center catalog item created',
        occurredAt: '2026-04-22T12:00:00.000Z'
      }
    ]
  });
});

test('audit events route enforces audit.read ABAC before querying the audit service', async () => {
  const evaluations: Array<{
    action: unknown;
    accountId: unknown;
    resourceType: unknown;
    resourceId: unknown;
  }> = [];
  const reads: string[] = [];
  const handlers = {
    accessControl: {} as never,
    users: {} as never,
    audit: {
      listPage: async (query: { accountId: string }) => {
        reads.push('audit');
        assert.equal(query.accountId, 'acc-1');
        return { items: [] };
      },
      write: () => undefined
    } as never,
    requirePrincipal: () => createPrincipal(),
    enforceAbac: (...args: readonly unknown[]) => {
      const [action, evaluatedPrincipal, resource] = args as [
        unknown,
        AuthenticatedPrincipal,
        { resourceType: unknown; resourceId: unknown; accountId: unknown }
      ];
      assert.deepEqual(reads, []);
      evaluations.push({
        action,
        accountId: evaluatedPrincipal.user.accountId,
        resourceType: resource.resourceType,
        resourceId: resource.resourceId
      });
    }
  };

  await handleAccessControlRoutes(
    '/audit/events',
    { method: 'GET', url: '/audit/events?module=billing&limit=10' } as never,
    new MockResponse() as never,
    'corr-audit-abac',
    handlers
  );

  assert.deepEqual(evaluations, [
    {
      action: 'audit.read',
      accountId: 'acc-1',
      resourceType: 'audit_entry',
      resourceId: 'events'
    }
  ]);
  assert.deepEqual(reads, ['audit']);
});

test('audit events route fails closed when ABAC denies before querying the audit service', async () => {
  let queried = false;
  const handlers = {
    accessControl: {} as never,
    users: {} as never,
    audit: {
      listPage: async () => {
        queried = true;
        return { items: [] };
      },
      write: () => undefined
    } as never,
    requirePrincipal: () => createPrincipal(),
    enforceAbac: () => {
      throw new ForbiddenError('ABAC denied audit events');
    }
  };

  await assert.rejects(
    handleAccessControlRoutes(
      '/audit/events',
      { method: 'GET', url: '/audit/events' } as never,
      new MockResponse() as never,
      'corr-audit-abac-denied',
      handlers
    ),
    (error: unknown) =>
      error instanceof ForbiddenError && error.message === 'ABAC denied audit events'
  );
  assert.equal(queried, false);
});

test('audit events route fails closed before the fallback audit list when ABAC denies', async () => {
  let queried = false;
  const handlers = {
    accessControl: {} as never,
    users: {} as never,
    audit: {
      list: () => {
        queried = true;
        return [];
      },
      write: () => undefined
    } as never,
    requirePrincipal: () => createPrincipal(),
    enforceAbac: () => {
      throw new ForbiddenError('ABAC denied audit events');
    }
  };

  await assert.rejects(
    handleAccessControlRoutes(
      '/audit/events',
      { method: 'GET', url: '/audit/events' } as never,
      new MockResponse() as never,
      'corr-audit-abac-fallback-denied',
      handlers
    ),
    (error: unknown) =>
      error instanceof ForbiddenError && error.message === 'ABAC denied audit events'
  );
  assert.equal(queried, false);
});

test('access-control audit route forwards cursor pagination and returns the next cursor', async () => {
  const response = new MockResponse();
  const cursor = encodeAuditCursor({
    occurredAt: '2026-04-22T12:10:00.000Z',
    eventId: 'evt-cursor' as never
  });
  const queries: unknown[] = [];
  const page = {
    items: [
      {
        actorId: 'user-1',
        accountId: 'acc-1',
        module: 'billing',
        action: 'read',
        entityType: 'invoice',
        entityId: 'inv-1',
        correlationId: 'corr-cursor',
        riskLevel: 'low',
        payloadSummary: 'Invoice read',
        occurredAt: '2026-04-22T12:00:00.000Z'
      }
    ],
    nextCursor: 'next-page-cursor'
  };

  const handled = await handleAccessControlRoutes(
    '/audit/events',
    {
      method: 'GET',
      url: `/audit/events?module=billing&entity=invoice&entityType=invoice&limit=1&cursor=${encodeURIComponent(cursor)}`
    } as never,
    response as never,
    'corr-audit-cursor',
    {
      accessControl: {} as never,
      users: {} as never,
      audit: {
        listPage: async (query: unknown) => {
          queries.push(query);
          return page;
        },
        write: () => undefined
      } as never,
      requirePrincipal: () => createPrincipal(),
      enforceAbac: allowAbac
    }
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.bodyJson(), page);
  assert.deepEqual(queries, [
    {
      accountId: 'acc-1',
      cursor: {
        occurredAt: '2026-04-22T12:10:00.000Z',
        eventId: 'evt-cursor'
      },
      filters: {
        module: 'billing',
        entity: 'invoice',
        correlationId: undefined,
        query: undefined,
        entityTypes: ['invoice']
      },
      limit: 1
    }
  ]);
});

test('access-control audit route rejects an invalid cursor before querying events', async () => {
  const response = new MockResponse();
  let queried = false;

  await assert.rejects(
    () =>
      handleAccessControlRoutes(
        '/audit/events',
        { method: 'GET', url: '/audit/events?cursor=invalid' } as never,
        response as never,
        'corr-audit-invalid-cursor',
        {
          accessControl: {} as never,
          users: {} as never,
          audit: {
            listPage: async () => {
              queried = true;
              return { items: [] };
            },
            write: () => undefined
          } as never,
          requirePrincipal: () => createPrincipal(),
          enforceAbac: allowAbac
        }
      ),
    (error: unknown) => error instanceof ValidationError && error.message === 'Invalid audit cursor'
  );

  assert.equal(queried, false);
});

test('access-control routes bound membership entries and repeated audit filters', async () => {
  const accessControl = new AccessControlService();
  const mutationHandlers = createAccessHandlers(accessControl);

  await assert.rejects(
    () =>
      handleAccessControlRoutes(
        '/access-control/users/user-a/teams',
        jsonRequest('POST', '/access-control/users/user-a/teams', {
          teamIds: ['t'.repeat(256)]
        }),
        new MockResponse() as never,
        'corr-membership-entry-bound',
        mutationHandlers
      ),
    ValidationError
  );

  const repeatedEntityTypes = Array.from({ length: 21 }, () => 'invoice')
    .map((value) => `entityType=${value}`)
    .join('&');
  await assert.rejects(
    () =>
      handleAccessControlRoutes(
        '/audit/events',
        { method: 'GET', url: `/audit/events?${repeatedEntityTypes}` } as never,
        new MockResponse() as never,
        'corr-audit-filter-bound',
        {
          accessControl: {} as never,
          users: {} as never,
          audit: { list: () => [], write: () => undefined } as never,
          requirePrincipal: () => createPrincipal(),
          enforceAbac: allowAbac
        }
      ),
    ValidationError
  );
});

test('access-control audit route exposes operational coverage report and audits the read', async () => {
  const response = new MockResponse();
  const auditWrites: Array<{
    action: string;
    entityType: string;
    entityId: string;
    riskLevel: string;
  }> = [];

  const handled = await handleAccessControlRoutes(
    '/audit/operational-coverage',
    {
      method: 'GET',
      url: '/audit/operational-coverage'
    } as never,
    response as never,
    'corr-audit-coverage',
    {
      accessControl: {} as never,
      users: {} as never,
      audit: {
        list: () => [],
        getOperationalCoverageReport: async () => ({
          generatedAt: '2026-05-28T12:00:00.000Z',
          accountId: 'acc-1',
          totalEvents: 2,
          eventsByModule: { lgpd: 1, audit: 1 },
          eventsByRiskLevel: { low: 0, medium: 0, high: 2 },
          requirements: [],
          coveredRequirements: 1,
          missingRequirements: 1,
          coveragePercent: 50
        }),
        write: (event: {
          action: string;
          entityType: string;
          entityId: string;
          riskLevel: string;
        }) => {
          auditWrites.push(event);
          return event;
        }
      } as never,
      requirePrincipal: () => createPrincipal(),
      enforceAbac: allowAbac
    }
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 200);
  assert.equal(response.bodyJson<{ coveragePercent: number }>().coveragePercent, 50);
  assert.deepEqual(
    auditWrites.map((event) => event.action),
    ['operational_coverage_read']
  );
  assert.equal(auditWrites[0].entityType, 'audit-coverage');
  assert.equal(auditWrites[0].riskLevel, 'high');
});

test('operational coverage fails closed with a sanitized 503 when the committed source is unavailable', async () => {
  await assert.rejects(
    () =>
      handleAccessControlRoutes(
        '/audit/operational-coverage',
        {
          method: 'GET',
          url: '/audit/operational-coverage'
        } as never,
        new MockResponse() as never,
        'corr-audit-coverage-unavailable',
        {
          accessControl: {} as never,
          users: {} as never,
          audit: {
            getOperationalCoverageReport: async () => {
              throw new Error('database credentials leaked if surfaced');
            },
            write: () => undefined
          } as never,
          requirePrincipal: () => createPrincipal(),
          enforceAbac: allowAbac
        }
      ),
    (error: unknown) =>
      error instanceof AppError &&
      error.code === 'AUDIT_COVERAGE_UNAVAILABLE' &&
      error.statusCode === 503 &&
      error.message === 'Operational audit coverage is temporarily unavailable' &&
      !error.message.includes('credentials')
  );
});

test('operational coverage enforces audit ABAC before querying or auditing the durable source', async () => {
  let queried = false;
  let audited = false;
  const handlers = {
    accessControl: {} as never,
    users: {} as never,
    audit: {
      getOperationalCoverageReport: async () => {
        queried = true;
        return {};
      },
      write: () => {
        audited = true;
      }
    } as never,
    requirePrincipal: () => createPrincipal(),
    enforceAbac: () => {
      assert.equal(queried, false);
      throw new ForbiddenError('ABAC denied operational coverage');
    }
  };

  await assert.rejects(
    handleAccessControlRoutes(
      '/audit/operational-coverage',
      { method: 'GET', url: '/audit/operational-coverage' } as never,
      new MockResponse() as never,
      'corr-audit-coverage-abac-denied',
      handlers
    ),
    (error: unknown) =>
      error instanceof ForbiddenError && error.message === 'ABAC denied operational coverage'
  );
  assert.equal(queried, false);
  assert.equal(audited, false);
});

test('operational coverage waits for the durable read audit before responding', async () => {
  let releasePersistence!: () => void;
  const persistence = new Promise<void>((resolve) => {
    releasePersistence = resolve;
  });
  const response = new MockResponse();
  let auditWaits = 0;

  const routePromise = handleAccessControlRoutes(
    '/audit/operational-coverage',
    { method: 'GET', url: '/audit/operational-coverage' } as never,
    response as never,
    'corr-audit-coverage-await',
    {
      accessControl: {} as never,
      users: {} as never,
      audit: {
        getOperationalCoverageReport: async () => ({
          generatedAt: '2026-05-28T12:00:00.000Z',
          accountId: 'acc-1',
          totalEvents: 0,
          eventsByModule: {},
          eventsByRiskLevel: { low: 0, medium: 0, high: 0 },
          requirements: [],
          coveredRequirements: 0,
          missingRequirements: 0,
          coveragePercent: 100
        }),
        writeAndWait: async () => {
          auditWaits += 1;
          await persistence;
        }
      } as never,
      requirePrincipal: () => createPrincipal(),
      enforceAbac: allowAbac
    }
  );

  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.equal(auditWaits, 1);
  assert.throws(() => response.bodyJson(), SyntaxError);

  releasePersistence();
  assert.equal(await routePromise, true);
  assert.equal(response.statusCode, 200);
  assert.equal(response.bodyJson<{ coveragePercent: number }>().coveragePercent, 100);
});

test('RH-VAL-1 validates editable groups, memberships, grants and effective permission by routine', async () => {
  const accessControl = new AccessControlService();
  const handlers = createAccessHandlers(accessControl);

  const templateResponse = new MockResponse();
  await handleAccessControlRoutes(
    '/access-control/teams',
    jsonRequest('POST', '/access-control/teams', {
      code: 'tpl_operacional',
      name: 'Template Operacional',
      description: 'Modelo inicial editável'
    }),
    templateResponse as never,
    'corr-rh-val-1',
    handlers
  );
  assert.equal(templateResponse.statusCode, 201);
  const template = templateResponse.bodyJson<{ id: string; name: string; status: string }>();

  const updateTemplateResponse = new MockResponse();
  await handleAccessControlRoutes(
    `/access-control/teams/${template.id}`,
    jsonRequest('PATCH', `/access-control/teams/${template.id}`, {
      name: 'Template Operacional Editado',
      isActive: true
    }),
    updateTemplateResponse as never,
    'corr-rh-val-2',
    handlers
  );
  assert.equal(
    updateTemplateResponse.bodyJson<{ name: string }>().name,
    'Template Operacional Editado'
  );

  const groupResponse = new MockResponse();
  await handleAccessControlRoutes(
    '/access-control/teams',
    jsonRequest('POST', '/access-control/teams', {
      code: 'grupo_operacao_a',
      name: 'Grupo Operação A'
    }),
    groupResponse as never,
    'corr-rh-val-3',
    handlers
  );
  const group = groupResponse.bodyJson<{ id: string }>();

  const sectorResponse = new MockResponse();
  await handleAccessControlRoutes(
    '/access-control/org-sectors',
    jsonRequest('POST', '/access-control/org-sectors', {
      code: 'setor_operacional',
      name: 'Setor Operacional'
    }),
    sectorResponse as never,
    'corr-rh-val-4',
    handlers
  );
  const sector = sectorResponse.bodyJson<{ id: string }>();

  const userATeamsResponse = new MockResponse();
  await handleAccessControlRoutes(
    '/access-control/users/user-a/teams',
    jsonRequest('POST', '/access-control/users/user-a/teams', { teamIds: [group.id] }),
    userATeamsResponse as never,
    'corr-rh-val-5',
    handlers
  );
  assert.deepEqual(userATeamsResponse.bodyJson(), { ok: true });

  const userASectorsResponse = new MockResponse();
  await handleAccessControlRoutes(
    '/access-control/users/user-a/sectors',
    jsonRequest('POST', '/access-control/users/user-a/sectors', { sectorIds: [sector.id] }),
    userASectorsResponse as never,
    'corr-rh-val-6',
    handlers
  );
  assert.deepEqual(userASectorsResponse.bodyJson(), { ok: true });

  const grantResponse = new MockResponse();
  await handleAccessControlRoutes(
    '/access-control/grants',
    jsonRequest('POST', '/access-control/grants', {
      subjectType: 'team',
      subjectId: group.id,
      permissionCode: 'counter_sale.write',
      effect: 'allow'
    }),
    grantResponse as never,
    'corr-rh-val-7',
    handlers
  );
  assert.deepEqual(grantResponse.bodyJson(), { ok: true });

  const denyResponse = new MockResponse();
  await handleAccessControlRoutes(
    '/access-control/grants',
    jsonRequest('POST', '/access-control/grants', {
      subjectType: 'sector',
      subjectId: sector.id,
      permissionCode: 'scheduling.manage',
      effect: 'deny'
    }),
    denyResponse as never,
    'corr-rh-val-8',
    handlers
  );
  assert.deepEqual(denyResponse.bodyJson(), { ok: true });

  const inheritResponse = new MockResponse();
  await handleAccessControlRoutes(
    '/access-control/grants',
    jsonRequest('POST', '/access-control/grants', {
      subjectType: 'user',
      subjectId: 'user-a',
      permissionCode: 'counter_sale.write',
      effect: 'inherit'
    }),
    inheritResponse as never,
    'corr-rh-val-9',
    handlers
  );
  assert.deepEqual(inheritResponse.bodyJson(), { ok: true });

  const effectiveResponse = new MockResponse();
  await handleAccessControlRoutes(
    '/access-control/users/user-a/effective',
    { method: 'GET' } as never,
    effectiveResponse as never,
    'corr-rh-val-10',
    handlers
  );
  const effective = effectiveResponse.bodyJson<{
    effectivePermissions: Array<{ permissionCode: string; effective: boolean; resolution: string }>;
  }>();
  assert.equal(
    effective.effectivePermissions.find((item) => item.permissionCode === 'counter_sale.write')
      ?.effective,
    true
  );
  assert.equal(
    effective.effectivePermissions.find((item) => item.permissionCode === 'counter_sale.write')
      ?.resolution,
    'team_allow'
  );
  assert.equal(
    effective.effectivePermissions.find((item) => item.permissionCode === 'scheduling.manage')
      ?.effective,
    false
  );
  assert.equal(
    effective.effectivePermissions.find((item) => item.permissionCode === 'scheduling.manage')
      ?.resolution,
    'sector_deny'
  );

  const userBProfile = accessControl.createProfile({
    accountId: 'acc-1' as never,
    userId: 'user-b' as never,
    roleCodes: []
  });
  assert.throws(
    () =>
      accessControl.assertAuthorized({
        actor: handlers.users.getOrThrow('user-b' as never),
        access: userBProfile,
        permissionCode: 'counter_sale.write',
        accountId: 'acc-1'
      }),
    ForbiddenError
  );
});

test('permission grant fails closed when audit persistence rejects', async () => {
  const accessControl = new AccessControlService();
  const users = createUsersService();
  const team = await accessControl.createTeam('acc-1' as never, {
    code: 'audit-failure-team',
    name: 'Audit Failure Team'
  });
  let runCommandCalls = 0;
  let refreshCalls = 0;
  let writeAndWaitCalls = 0;
  const principal = createPrincipal(['users.manage'], 'user-admin', 'acc-1');
  const audit = {
    write: () => undefined,
    writeAndWait: async () => {
      writeAndWaitCalls += 1;
      throw new Error('audit-store-down');
    }
  };

  await assert.rejects(
    () =>
      handleAccessControlRoutes(
        '/access-control/grants',
        jsonRequest('POST', '/access-control/grants', {
          subjectType: 'team',
          subjectId: team.id,
          permissionCode: 'counter_sale.write',
          effect: 'allow'
        }),
        new MockResponse() as never,
        'corr-audit-failure',
        {
          accessControl,
          users,
          audit: audit as never,
          requirePrincipal: () => principal,
          enforceAbac: allowAbac,
          runCommand: async <T>(input: TenantCommandInput<T>) => {
            runCommandCalls += 1;
            try {
              return await input.command();
            } catch (error) {
              await input.onRollback?.();
              throw error;
            }
          },
          refreshAccessControl: async () => {
            refreshCalls += 1;
          }
        }
      ),
    (error: unknown) => error instanceof Error && error.message === 'audit-store-down'
  );

  assert.equal(runCommandCalls, 1);
  assert.equal(writeAndWaitCalls, 1);
  assert.equal(refreshCalls, 1);
});

test('access-control exposes auditable RBAC module permission matrix by profile, unit and action', async () => {
  const accessControl = new AccessControlService();
  const handlers = createAccessHandlers(accessControl);
  const team = await accessControl.createTeam('acc-1' as never, {
    code: 'financeiro',
    name: 'Financeiro'
  });
  const sector = await accessControl.createSector('acc-1' as never, {
    code: 'recepcao',
    name: 'Recepção'
  });
  await accessControl.setPermissionAssignment({
    accountId: 'acc-1' as never,
    subjectType: 'team',
    subjectId: team.id,
    permissionCode: 'billing.manage',
    effect: 'allow'
  });
  await accessControl.setPermissionAssignment({
    accountId: 'acc-1' as never,
    subjectType: 'sector',
    subjectId: sector.id,
    permissionCode: 'billing.manage',
    effect: 'deny'
  });

  const response = new MockResponse();
  const handled = await handleAccessControlRoutes(
    '/access-control/module-permission-matrix',
    { method: 'GET', url: '/access-control/module-permission-matrix' } as never,
    response as never,
    'corr-rbac-matrix-1',
    handlers
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 200);
  const payload = response.bodyJson<{
    accountId: string;
    items: Array<{
      module: string;
      permissionCodes: string[];
      actions: Record<string, boolean>;
      rolesAllowed: string[];
      teamOverrideCount: number;
      sectorOverrideCount: number;
      coverageStatus: string;
    }>;
  }>();
  const billing = payload.items.find((item) => item.module === 'billing');
  assert.equal(payload.accountId, 'acc-1');
  assert.ok(billing);
  assert.equal(billing.permissionCodes.includes('billing.read'), true);
  assert.equal(billing.permissionCodes.includes('billing.manage'), true);
  assert.equal(billing.actions.consult, true);
  assert.equal(billing.actions.insert, true);
  assert.equal(billing.actions.update, true);
  assert.equal(billing.actions.delete, true);
  assert.equal(billing.rolesAllowed.includes('finance'), true);
  assert.equal(billing.teamOverrideCount, 1);
  assert.equal(billing.sectorOverrideCount, 1);
  assert.equal(billing.coverageStatus, 'complete');
});

test('access-control routes reject cross-account subjects for RH governance writes', async () => {
  const accessControl = new AccessControlService();
  const handlers = createAccessHandlers(accessControl);
  const otherAccountTeam = await accessControl.createTeam('acc-2' as never, {
    code: 'grupo_outra_conta',
    name: 'Grupo Outra Conta'
  });

  await assert.rejects(
    () =>
      handleAccessControlRoutes(
        '/access-control/users/user-other/teams',
        jsonRequest('POST', '/access-control/users/user-other/teams', { teamIds: [] }),
        new MockResponse() as never,
        'corr-rh-cross-1',
        handlers
      ),
    AuthenticationError
  );

  await assert.rejects(
    () =>
      handleAccessControlRoutes(
        `/access-control/teams/${otherAccountTeam.id}`,
        jsonRequest('PATCH', `/access-control/teams/${otherAccountTeam.id}`, {
          name: 'Tentativa cross-account'
        }),
        new MockResponse() as never,
        'corr-rh-cross-2',
        handlers
      ),
    AuthenticationError
  );

  await assert.rejects(
    () =>
      handleAccessControlRoutes(
        '/access-control/grants',
        jsonRequest('POST', '/access-control/grants', {
          subjectType: 'team',
          subjectId: otherAccountTeam.id,
          permissionCode: 'counter_sale.write',
          effect: 'allow'
        }),
        new MockResponse() as never,
        'corr-rh-cross-3',
        handlers
      ),
    AuthenticationError
  );
});

test('access-control mutations validate input and leave a tenant-scoped audit trail', async () => {
  const accessControl = new AccessControlService();
  const auditWrites: Array<{
    action: string;
    entityType: string;
    entityId: string;
    accountId: string;
    payloadSummary: string;
  }> = [];
  const users = createUsersService();
  const principal = createPrincipal(['access.read', 'users.manage'], 'user-admin', 'acc-1');
  const handlers = {
    accessControl,
    users,
    audit: {
      list: () => [],
      write: (event: (typeof auditWrites)[number]) => {
        auditWrites.push(event);
      }
    } as never,
    requirePrincipal: () => principal,
    enforceAbac: allowAbac
  };

  await assert.rejects(
    () =>
      handleAccessControlRoutes(
        '/access-control/teams',
        jsonRequest('POST', '/access-control/teams', { code: ' ', name: 'Sem código' }),
        new MockResponse() as never,
        'corr-access-invalid-team',
        handlers
      ),
    ValidationError
  );

  const createResponse = new MockResponse();
  await handleAccessControlRoutes(
    '/access-control/teams',
    jsonRequest('POST', '/access-control/teams', {
      code: 'grupo_auditavel',
      name: 'Grupo auditável',
      description: 'Grupo de governança'
    }),
    createResponse as never,
    'corr-access-team-created',
    handlers
  );
  const team = createResponse.bodyJson<{ id: string }>();

  const grantResponse = new MockResponse();
  await handleAccessControlRoutes(
    '/access-control/grants',
    jsonRequest('POST', '/access-control/grants', {
      subjectType: 'team',
      subjectId: team.id,
      permissionCode: 'audit.read',
      effect: 'allow'
    }),
    grantResponse as never,
    'corr-access-grant',
    handlers
  );

  await assert.rejects(
    () =>
      handleAccessControlRoutes(
        '/access-control/users/user-a/teams',
        jsonRequest('POST', '/access-control/users/user-a/teams', { teamIds: 'not-an-array' }),
        new MockResponse() as never,
        'corr-access-invalid-membership',
        handlers
      ),
    ValidationError
  );

  assert.deepEqual(
    auditWrites.map((event) => event.action),
    ['team_created', 'permission_granted']
  );
  assert.ok(auditWrites.every((event) => event.accountId === 'acc-1'));
  assert.ok(auditWrites.every((event) => !event.payloadSummary.includes('Grupo auditável')));
});
