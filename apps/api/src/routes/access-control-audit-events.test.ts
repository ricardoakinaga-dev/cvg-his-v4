import assert from 'node:assert/strict';
import type { IncomingMessage } from 'node:http';
import { Readable, Writable } from 'node:stream';
import test from 'node:test';

import { AccessControlService } from '@cvg-his-v2/module-access-control';
import { UsersService, type UserRecord } from '@cvg-his-v2/module-users';
import { ForbiddenError, NotFoundError } from '@cvg-his-v2/shared-errors';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';
import { handleAccessControlRoutes } from './access-control-routes.js';

class MockResponse extends Writable {
  public statusCode = 200;
  readonly #chunks: Buffer[] = [];

  _write(chunk: string | Buffer, _encoding: BufferEncoding, callback: (error?: Error | null) => void): void {
    this.#chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    callback();
  }

  override end(chunk?: string | Buffer | (() => void), encoding?: BufferEncoding | (() => void), callback?: () => void): this {
    const finalCallback = typeof chunk === 'function' ? chunk : typeof encoding === 'function' ? encoding : callback;
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
  return new UsersService(undefined, users);
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
    }
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
      requirePrincipal: () => createPrincipal()
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

test('access-control audit route exposes operational coverage report and audits the read', async () => {
  const response = new MockResponse();
  const auditWrites: Array<{ action: string; entityType: string; entityId: string; riskLevel: string }> = [];

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
        getOperationalCoverageReport: () => ({
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
        write: (event: { action: string; entityType: string; entityId: string; riskLevel: string }) => {
          auditWrites.push(event);
          return event;
        }
      } as never,
      requirePrincipal: () => createPrincipal()
    }
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 200);
  assert.equal(response.bodyJson<{ coveragePercent: number }>().coveragePercent, 50);
  assert.deepEqual(auditWrites.map((event) => event.action), ['operational_coverage_read']);
  assert.equal(auditWrites[0].entityType, 'audit-coverage');
  assert.equal(auditWrites[0].riskLevel, 'high');
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
  assert.equal(updateTemplateResponse.bodyJson<{ name: string }>().name, 'Template Operacional Editado');

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
    effective.effectivePermissions.find((item) => item.permissionCode === 'counter_sale.write')?.effective,
    true
  );
  assert.equal(
    effective.effectivePermissions.find((item) => item.permissionCode === 'counter_sale.write')?.resolution,
    'team_allow'
  );
  assert.equal(
    effective.effectivePermissions.find((item) => item.permissionCode === 'scheduling.manage')?.effective,
    false
  );
  assert.equal(
    effective.effectivePermissions.find((item) => item.permissionCode === 'scheduling.manage')?.resolution,
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
    NotFoundError
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
    NotFoundError
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
    NotFoundError
  );
});
