import assert from 'node:assert/strict';
import { Readable, Writable } from 'node:stream';
import test from 'node:test';

import { AbacEngine } from '@cvg-his-v2/module-access-control';
import { OwnersService } from '@cvg-his-v2/module-owners';
import { ForbiddenError } from '@cvg-his-v2/shared-errors';
import type { ResourceAttributes } from '@cvg-his-v2/module-access-control';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';

import { handleOwnersRoutes } from './owners-routes.js';

class MockRequest extends Readable {
  public readonly method: string;
  public readonly url: string;
  public readonly headers: Record<string, string>;
  public readonly socket: { remoteAddress: string };
  readonly #body: Buffer;
  #sent = false;

  constructor(input: {
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: Record<string, unknown>;
  }) {
    super();
    this.method = input.method;
    this.url = input.url;
    this.headers = input.headers ?? {};
    this.socket = { remoteAddress: '127.0.0.1' };
    this.#body = Buffer.from(input.body ? JSON.stringify(input.body) : '', 'utf8');
  }

  _read(): void {
    if (this.#sent) {
      this.push(null);
      return;
    }

    this.#sent = true;
    if (this.#body.length > 0) {
      this.push(this.#body);
    }
    this.push(null);
  }
}

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

  setHeader(): this {
    return this;
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

  bodyJson<T>(): T {
    return JSON.parse(Buffer.concat(this.#chunks).toString('utf8')) as T;
  }
}

function createPrincipal(): AuthenticatedPrincipal {
  return {
    user: {
      id: 'user-1' as never,
      accountId: 'acc_cvg_demo' as never,
      username: 'admin',
      email: 'admin@example.com',
      displayName: 'Admin',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    session: {
      sessionId: 'session-1' as never,
      userId: 'user-1' as never,
      accountId: 'acc_cvg_demo' as never,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      authTime: new Date().toISOString(),
      refreshExpiresAt: new Date(Date.now() + 120_000).toISOString(),
      active: true
    },
    access: {
      roleCodes: ['admin'],
      permissionCodes: ['owners.read', 'owners.manage'],
      capabilities: []
    }
  };
}

function createAbacEnforcer(sectorCodes: readonly string[]) {
  const engine = new AbacEngine();
  return (
    actionCode: string,
    principal: AuthenticatedPrincipal,
    resource: ResourceAttributes
  ) =>
    engine.enforce(
      actionCode,
      {
        userId: principal.user.id,
        accountId: principal.user.accountId,
        roleCodes: principal.access.roleCodes,
        branchIds: [],
        teamIds: [],
        sectorIds: [],
        sectorCodes,
        isActive: true
      },
      resource,
      {
        timestamp: new Date('2026-04-18T10:00:00.000Z').toISOString(),
        dayOfWeek: 5,
        hourOfDay: 10,
        ipAddress: '127.0.0.1'
      }
    );
}

test('handleOwnersRoutes GET /owners lists filtered owners', async () => {
  const response = new MockResponse();

  const handled = await handleOwnersRoutes(
    '/owners',
    new MockRequest({
      method: 'GET',
      url: '/owners?financialResponsible=true'
    }) as never,
    response as never,
    'corr-owners-1',
    {
      owners: new OwnersService(),
      audit: { write: () => {} } as never,
      requirePrincipal: () => createPrincipal()
    }
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 200);
  const payload = response.bodyJson<{ items: Array<{ id: string; financialResponsible: boolean }> }>();
  assert.ok(payload.items.length >= 1);
  assert.equal(payload.items.every((item) => item.financialResponsible), true);
  assert.equal(payload.items.some((item) => item.id === 'owner_maria_silva'), true);
});

test('handleOwnersRoutes GET /owners searches masked fields with unmasked query', async () => {
  const documentResponse = new MockResponse();

  const handled = await handleOwnersRoutes(
    '/owners',
    new MockRequest({
      method: 'GET',
      url: '/owners?q=11111111111'
    }) as never,
    documentResponse as never,
    'corr-owners-search-1',
    {
      owners: new OwnersService(),
      audit: { write: () => {} } as never,
      requirePrincipal: () => createPrincipal()
    }
  );

  assert.equal(handled, true);
  assert.equal(documentResponse.statusCode, 200);
  const documentPayload = documentResponse.bodyJson<{ items: Array<{ id: string }> }>();
  assert.equal(documentPayload.items.some((item) => item.id === 'owner_maria_silva'), true);

  const phoneResponse = new MockResponse();
  await handleOwnersRoutes(
    '/owners',
    new MockRequest({
      method: 'GET',
      url: '/owners?q=11999991111'
    }) as never,
    phoneResponse as never,
    'corr-owners-search-2',
    {
      owners: new OwnersService(),
      audit: { write: () => {} } as never,
      requirePrincipal: () => createPrincipal()
    }
  );

  const phonePayload = phoneResponse.bodyJson<{ items: Array<{ id: string }> }>();
  assert.equal(phonePayload.items.some((item) => item.id === 'owner_maria_silva'), true);
});

test('handleOwnersRoutes POST /owners creates a new owner', async () => {
  const response = new MockResponse();
  const owners = new OwnersService();

  const handled = await handleOwnersRoutes(
    '/owners',
    new MockRequest({
      method: 'POST',
      url: '/owners',
      body: {
        fullName: 'Ana Martins',
        documentId: '333.333.333-33',
        contacts: [
          {
            label: 'Celular',
            value: '+55 11 97777-3333',
            type: 'whatsapp',
            primary: true
          }
        ],
        address: {
          zipCode: '01234-567',
          street: 'Rua Vetus',
          number: '100',
          complement: 'Casa',
          state: 'SP',
          city: 'Sao Paulo',
          district: 'Centro',
          reference: 'Proximo ao metro',
          cityCode: '3550308'
        },
        profile: {
          group: 'VIP',
          receiveSms: true,
          personType: 'individual',
          rg: '11.222.333-4'
        },
        financialProfile: {
          allowedDebtLimit: 250,
          creditBalance: 35.5,
          availablePoints: 120,
          blockedPoints: 15
        },
        legacyVetusId: '3835',
        originalCreatedAt: '2024-05-03',
        financialResponsible: true
      }
    }) as never,
    response as never,
    'corr-owners-2',
    {
      owners,
      audit: { write: () => {} } as never,
      requirePrincipal: () => createPrincipal()
    }
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 201);
  const payload = response.bodyJson<{
    id: string;
    fullName: string;
    legacyVetusId?: string;
    profile?: { group?: string; receiveSms?: boolean };
    address?: { cityCode?: string };
    financialProfile?: { creditBalance?: number; availablePoints?: number };
  }>();
  assert.equal(payload.fullName, 'Ana Martins');
  assert.equal(payload.legacyVetusId, '3835');
  assert.equal(payload.profile?.group, 'VIP');
  assert.equal(payload.profile?.receiveSms, true);
  assert.equal(payload.address?.cityCode, '3550308');
  assert.equal(payload.financialProfile?.creditBalance, 35.5);
  assert.equal(payload.financialProfile?.availablePoints, 120);
  assert.equal(owners.list('Ana Martins').length, 1);
});

test('handleOwnersRoutes enforces contextual sector isolation when x-sector-code is present', async () => {
  const response = new MockResponse();

  await assert.rejects(
    () =>
      handleOwnersRoutes(
        '/owners/owner_maria_silva',
        new MockRequest({
          method: 'GET',
          url: '/owners/owner_maria_silva',
          headers: {
            'x-sector-code': 'icu'
          }
        }) as never,
        response as never,
        'corr-owners-3',
        {
          owners: new OwnersService(),
          audit: { write: () => {} } as never,
          requirePrincipal: () => createPrincipal(),
          enforceAbac: createAbacEnforcer(['reception'])
        }
      ),
    (error: unknown) => {
      assert.equal(error instanceof ForbiddenError, true);
      return true;
    }
  );
});
