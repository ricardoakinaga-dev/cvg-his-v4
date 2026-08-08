import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import test from 'node:test';

import { UsersService } from '@cvg-his-v2/module-users';
import { NotFoundError } from '@cvg-his-v2/shared-errors';
import type { AccountId, AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';

import { handleUsersStaffQuotesRoutes } from './users-staff-quotes-routes.js';

class MockResponse extends Writable {
  public statusCode = 200;
  readonly #chunks: Buffer[] = [];

  _write(chunk: string | Buffer, _encoding: BufferEncoding, callback: () => void): void {
    this.#chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    callback();
  }

  override end(chunk?: string | Buffer | (() => void)): this {
    if (chunk !== undefined && typeof chunk !== 'function') {
      this.#chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    if (typeof chunk === 'function') chunk();
    return this;
  }

  bodyJson<T>(): T {
    return JSON.parse(Buffer.concat(this.#chunks).toString('utf8')) as T;
  }
}

function principal(accountId: AccountId): AuthenticatedPrincipal {
  const now = new Date().toISOString();
  return {
    user: {
      id: 'user_admin' as never,
      accountId,
      username: 'admin',
      email: 'admin@example.com',
      displayName: 'Admin',
      status: 'active',
      createdAt: now,
      updatedAt: now
    },
    session: {
      sessionId: 'session_1' as never,
      userId: 'user_admin' as never,
      accountId,
      createdAt: now,
      expiresAt: now,
      authTime: now,
      refreshExpiresAt: now,
      active: true
    },
    access: { roleCodes: ['admin'], permissionCodes: ['users.read', 'users.manage'], capabilities: [] }
  };
}

function request(method: string, url: string, body?: Record<string, unknown>) {
  return {
    method,
    url,
    [Symbol.asyncIterator]: async function* () {
      if (body) yield Buffer.from(JSON.stringify(body));
    }
  } as never;
}

function handlers(users: UsersService, accountId: AccountId) {
  return {
    users,
    staff: {} as never,
    quotes: {} as never,
    counterSales: {} as never,
    accessControl: { replaceLegacyRoles: async () => {} } as never,
    audit: { write: () => {} } as never,
    requirePrincipal: () => principal(accountId)
  };
}

test('user routes scope create and list operations to the authenticated account', async () => {
  const users = new UsersService({ seedUsersEnabled: false });
  await users.create({
    accountId: 'acc_other' as AccountId,
    username: 'other',
    email: 'other@example.com',
    password: 'Password123!'
  });

  const createResponse = new MockResponse();
  await handleUsersStaffQuotesRoutes(
    '/users',
    request('POST', '/users', {
      username: 'local',
      email: 'local@example.com',
      password: 'Password123!'
    }),
    createResponse as never,
    'corr-create',
    handlers(users, 'acc_local' as AccountId)
  );
  assert.equal(createResponse.statusCode, 201);
  assert.equal(createResponse.bodyJson<{ accountId: string }>().accountId, 'acc_local');

  const listResponse = new MockResponse();
  await handleUsersStaffQuotesRoutes(
    '/users',
    request('GET', '/users'),
    listResponse as never,
    'corr-list',
    handlers(users, 'acc_local' as AccountId)
  );
  assert.deepEqual(
    listResponse.bodyJson<{ items: Array<{ username: string }> }>().items.map((user) => user.username),
    ['local']
  );
});

test('user routes reject cross-account reads and updates', async () => {
  const users = new UsersService({ seedUsersEnabled: false });
  const other = await users.create({
    accountId: 'acc_other' as AccountId,
    username: 'other',
    email: 'other@example.com',
    password: 'Password123!'
  });
  const routeHandlers = handlers(users, 'acc_local' as AccountId);

  await assert.rejects(
    () =>
      handleUsersStaffQuotesRoutes(
        `/users/${other.id}`,
        request('GET', `/users/${other.id}`),
        new MockResponse() as never,
        'corr-read',
        routeHandlers
      ),
    NotFoundError
  );
  await assert.rejects(
    () =>
      handleUsersStaffQuotesRoutes(
        `/users/${other.id}`,
        request('PATCH', `/users/${other.id}`, { displayName: 'Leaked' }),
        new MockResponse() as never,
        'corr-update',
        routeHandlers
      ),
    NotFoundError
  );
});
