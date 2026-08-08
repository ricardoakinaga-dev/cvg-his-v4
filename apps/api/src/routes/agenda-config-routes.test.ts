import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import test from 'node:test';

import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';
import { createSeedStaff, StaffService } from '@cvg-his-v2/module-staff';

import {
  InMemoryAgendaConfigRepository,
  type AgendaConfigRepository
} from '../repositories/agenda-config-repository.js';
import { handleAgendaConfigRoutes } from './agenda-config-routes.js';

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

  setHeader(): this {
    return this;
  }

  bodyJson<T>(): T {
    return JSON.parse(Buffer.concat(this.#chunks).toString('utf8')) as T;
  }
}

function createPrincipal(accountId = 'account-a'): AuthenticatedPrincipal {
  return {
    user: {
      id: 'user-a' as never,
      accountId: accountId as never,
      username: 'admin',
      email: 'admin@example.com',
      displayName: 'Admin',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    session: {
      sessionId: 'session-a' as never,
      userId: 'user-a' as never,
      accountId: accountId as never,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      authTime: new Date().toISOString(),
      refreshExpiresAt: new Date(Date.now() + 120_000).toISOString(),
      active: true
    },
    access: {
      roleCodes: ['admin'],
      permissionCodes: ['scheduling.read', 'scheduling.manage'],
      capabilities: []
    }
  };
}

function createRequest(method: string, url: string, body?: Record<string, unknown>) {
  if (!body) return { method, url } as never;
  return {
    method,
    url,
    [Symbol.asyncIterator]: async function* () {
      yield Buffer.from(JSON.stringify(body));
    }
  } as never;
}

function createHandlers(repository: AgendaConfigRepository, accountId = 'account-a') {
  return {
    repository,
    audit: { write: () => {} } as never,
    requirePrincipal: () => createPrincipal(accountId)
  };
}

test('agenda configuration persists availability and appointment types through the repository', async () => {
  const repository = new InMemoryAgendaConfigRepository();

  const availabilityResponse = new MockResponse();
  await handleAgendaConfigRoutes(
    '/availability',
    createRequest('POST', '/availability', {
      professionalUserId: 'professional-a',
      dayOfWeek: 3,
      startTime: '08:00',
      endTime: '17:00',
      slotDurationMinutes: 30
    }),
    availabilityResponse as never,
    'corr-agenda-availability',
    createHandlers(repository)
  );

  assert.equal(availabilityResponse.statusCode, 201);
  const availability = availabilityResponse.bodyJson<{ id: string }>();
  assert.ok(availability.id);

  const listResponse = new MockResponse();
  await handleAgendaConfigRoutes(
    '/availability',
    createRequest('GET', '/availability?professionalUserId=professional-a'),
    listResponse as never,
    'corr-agenda-availability-list',
    createHandlers(repository)
  );
  assert.equal(listResponse.bodyJson<{ total: number }>().total, 1);

  const typeResponse = new MockResponse();
  await handleAgendaConfigRoutes(
    '/appointment-types',
    createRequest('POST', '/appointment-types', {
      code: 'RETORNO',
      name: 'Retorno',
      defaultDurationMinutes: 20
    }),
    typeResponse as never,
    'corr-agenda-type',
    createHandlers(repository)
  );
  assert.equal(typeResponse.statusCode, 201);
  assert.equal(typeResponse.bodyJson<{ code: string }>().code, 'RETORNO');
});

test('agenda availability mutations refresh the scheduling read model', async () => {
  const repository = new InMemoryAgendaConfigRepository();
  const refreshCalls: string[] = [];
  const handlers = {
    ...createHandlers(repository),
    refreshScheduling: async (accountId: string) => {
      refreshCalls.push(accountId);
    }
  };

  const createResponse = new MockResponse();
  await handleAgendaConfigRoutes(
    '/availability',
    createRequest('POST', '/availability', {
      professionalUserId: 'professional-a',
      dayOfWeek: 3,
      startTime: '08:00',
      endTime: '17:00',
      slotDurationMinutes: 30
    }),
    createResponse as never,
    'corr-agenda-refresh-create',
    handlers
  );
  const availability = createResponse.bodyJson<{ id: string }>();

  const patchResponse = new MockResponse();
  await handleAgendaConfigRoutes(
    `/availability/${availability.id}`,
    createRequest('PATCH', `/availability/${availability.id}`, { endTime: '18:00' }),
    patchResponse as never,
    'corr-agenda-refresh-patch',
    handlers
  );

  const deleteResponse = new MockResponse();
  await handleAgendaConfigRoutes(
    `/availability/${availability.id}`,
    createRequest('DELETE', `/availability/${availability.id}`),
    deleteResponse as never,
    'corr-agenda-refresh-delete',
    handlers
  );

  assert.deepEqual(refreshCalls, ['account-a', 'account-a', 'account-a']);
});

test('agenda configuration never exposes another tenant record', async () => {
  const repository = new InMemoryAgendaConfigRepository();
  const ownerResponse = new MockResponse();
  await handleAgendaConfigRoutes(
    '/appointment-types',
    createRequest('POST', '/appointment-types', {
      code: 'TENANT_A',
      name: 'Somente A'
    }),
    ownerResponse as never,
    'corr-agenda-tenant-a',
    createHandlers(repository, 'account-a')
  );

  const foreignListResponse = new MockResponse();
  await handleAgendaConfigRoutes(
    '/appointment-types',
    createRequest('GET', '/appointment-types'),
    foreignListResponse as never,
    'corr-agenda-tenant-b',
    createHandlers(repository, 'account-b')
  );

  assert.equal(foreignListResponse.bodyJson<{ total: number }>().total, 0);
});

test('in-memory agenda seeds reference active staff records', async () => {
  const repository = new InMemoryAgendaConfigRepository();
  const staff = new StaffService(undefined, createSeedStaff());
  const availability = await repository.listAvailability('acc_cvg_demo');

  assert.equal(availability.length, 2);
  for (const record of availability) {
    const professional = staff.list('acc_cvg_demo' as never).find(
      (member) => member.userId === record.professionalUserId
    );
    assert.ok(professional);
    assert.equal(professional.status, 'active');
    assert.equal(professional.accountId, 'acc_cvg_demo');
  }
});
