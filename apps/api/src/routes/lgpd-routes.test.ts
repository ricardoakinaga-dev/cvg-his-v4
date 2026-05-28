import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import test from 'node:test';

import type { AuditService } from '@cvg-his-v2/module-audit';
import type { LgpdService } from '@cvg-his-v2/module-lgpd';
import type { AccountId, AuthenticatedPrincipal, UserId } from '@cvg-his-v2/shared-types';

import { handleLgpdRoutes } from './lgpd-routes.js';

const ACCOUNT = 'acc_cvg_demo' as AccountId;
const USER = 'user_lgpd_route' as UserId;

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

  bodyJson<T>(): T {
    return JSON.parse(Buffer.concat(this.#chunks).toString('utf8')) as T;
  }
}

function request(method: string, body?: unknown, url?: string): never {
  return {
    method,
    url: url ?? '/lgpd/requests',
    headers: { host: 'localhost' },
    [Symbol.asyncIterator]: async function* () {
      if (body !== undefined) yield Buffer.from(JSON.stringify(body));
    }
  } as never;
}

function principal(): AuthenticatedPrincipal {
  return {
    user: {
      id: USER,
      accountId: ACCOUNT,
      username: 'lgpd-user',
      email: 'lgpd@example.com',
      displayName: 'LGPD User',
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    },
    session: {
      sessionId: 'session-lgpd' as never,
      userId: USER,
      accountId: ACCOUNT,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
      authTime: new Date().toISOString(),
      refreshExpiresAt: new Date(Date.now() + 120_000).toISOString(),
      active: true
    },
    access: {
      roleCodes: ['admin'],
      permissionCodes: ['lgpd.requests.read', 'lgpd.requests.manage'],
      capabilities: []
    }
  };
}

function createHandlers() {
  const auditEntries: unknown[] = [];
  const lgpd = {
    async getDsrRequests(accountId: string) {
      assert.equal(accountId, ACCOUNT);
      return [
        {
          id: 'dsr-1',
          accountId,
          subjectId: 'owner-1',
          subjectType: 'owner',
          requestType: 'data_export',
          status: 'pending',
          requestedBy: USER,
          requestedAt: '2026-05-28T10:00:00.000Z',
          createdAt: '2026-05-28T10:00:00.000Z',
          updatedAt: '2026-05-28T10:00:00.000Z'
        }
      ];
    },
    async completeDsrRequest(accountId: string, requestId: string, completedBy: string) {
      assert.equal(accountId, ACCOUNT);
      assert.equal(requestId, 'dsr-1');
      assert.equal(completedBy, USER);
      return {
        id: requestId,
        accountId,
        subjectId: 'owner-1',
        subjectType: 'owner',
        requestType: 'data_export',
        status: 'completed',
        requestedBy: USER,
        requestedAt: '2026-05-28T10:00:00.000Z',
        completedBy,
        completedAt: '2026-05-28T10:05:00.000Z',
        resultJson: { exported: true },
        createdAt: '2026-05-28T10:00:00.000Z',
        updatedAt: '2026-05-28T10:05:00.000Z'
      };
    },
    async buildPersonalDataExport(accountId: string, subjectId: string, subjectType: string) {
      assert.equal(accountId, ACCOUNT);
      return {
        accountId,
        subjectId,
        subjectType,
        exportedAt: '2026-05-28T10:05:00.000Z',
        evidence: { consentCount: 1, dsrCount: 1, providerCount: 0 },
        data: { consents: [{}], dataSubjectRequests: [{}] }
      };
    }
  } as unknown as LgpdService;

  return {
    lgpd,
    auditEntries,
    audit: { write(entry: unknown) { auditEntries.push(entry); } } as AuditService,
    requirePrincipal: () => principal()
  };
}

test('handleLgpdRoutes lists all DSR requests without requiring filters', async () => {
  const response = new MockResponse();
  const handlers = createHandlers();

  await handleLgpdRoutes(
    '/lgpd/requests',
    request('GET'),
    response as never,
    'corr-lgpd-list',
    handlers
  );

  assert.equal(response.statusCode, 200);
  assert.equal(response.bodyJson<{ requests: unknown[] }>().requests.length, 1);
});

test('handleLgpdRoutes audits DSR completion and personal data export', async () => {
  const handlers = createHandlers();
  const completeResponse = new MockResponse();

  await handleLgpdRoutes(
    '/lgpd/requests/complete',
    request('POST', { requestId: 'dsr-1' }, '/lgpd/requests/complete'),
    completeResponse as never,
    'corr-lgpd-complete',
    handlers
  );

  assert.equal(completeResponse.statusCode, 200);

  const exportResponse = new MockResponse();
  await handleLgpdRoutes(
    '/lgpd/export',
    request('POST', { subjectId: 'owner-1', subjectType: 'owner' }, '/lgpd/export'),
    exportResponse as never,
    'corr-lgpd-export',
    handlers
  );

  assert.equal(exportResponse.statusCode, 200);
  assert.deepEqual(
    handlers.auditEntries
      .map((entry) => (entry as { action: string }).action)
      .filter((action) => action.startsWith('dsr_') || action === 'personal_data_exported'),
    ['dsr_completed', 'personal_data_exported']
  );
});
