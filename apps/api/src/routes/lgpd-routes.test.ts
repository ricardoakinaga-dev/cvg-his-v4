import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import test from 'node:test';

import type { AuditService } from '@cvg-his-v2/module-audit';
import type { LgpdService } from '@cvg-his-v2/module-lgpd';
import { NotFoundError, ValidationError } from '@cvg-his-v2/shared-errors';
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

test('handleLgpdRoutes durably audits filtered DSR reads before responding', async () => {
  const handlers = createHandlers();
  let waitedAction: string | undefined;
  handlers.lgpd = {
    async getDsrRequestsBySubject(accountId: string, subjectId: string, subjectType: string) {
      assert.equal(accountId, ACCOUNT);
      assert.equal(subjectId, 'owner-1');
      assert.equal(subjectType, 'owner');
      return [];
    }
  } as unknown as LgpdService;
  handlers.audit = {
    write() {
      throw new Error('filtered DSR reads must use the durable audit path');
    },
    async writeAndWait(entry: { action: string }) {
      waitedAction = entry.action;
    }
  } as unknown as AuditService;

  await handleLgpdRoutes(
    '/lgpd/requests',
    request('GET', undefined, '/lgpd/requests?subjectId=owner-1&subjectType=owner'),
    new MockResponse() as never,
    'corr-lgpd-dsr-read-durable',
    handlers
  );

  assert.equal(waitedAction, 'dsr_read');
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

test('handleLgpdRoutes rejects invalid subject and DSR values before calling the service', async () => {
  const handlers = createHandlers();

  await assert.rejects(
    () =>
      handleLgpdRoutes(
        '/lgpd/consent',
        request(
          'POST',
          { subjectId: 'owner-1', subjectType: 'unknown', purpose: 'marketing' },
          '/lgpd/consent'
        ),
        new MockResponse() as never,
        'corr-lgpd-invalid-subject',
        handlers
      ),
    ValidationError
  );

  await assert.rejects(
    () =>
      handleLgpdRoutes(
        '/lgpd/requests',
        request(
          'POST',
          { subjectId: 'owner-1', subjectType: 'owner', requestType: 'not-a-dsr' },
          '/lgpd/requests'
        ),
        new MockResponse() as never,
        'corr-lgpd-invalid-dsr',
        handlers
      ),
    ValidationError
  );
});

test('handleLgpdRoutes audits sensitive reads and does not return foreign-account provider rows', async () => {
  const handlers = createHandlers();
  const auditActions: string[] = [];
  handlers.audit = {
    write(event: { action: string }) {
      auditActions.push(event.action);
    }
  } as AuditService;
  handlers.lgpd = {
    async getConsents() {
      return [];
    },
    async buildPersonalDataExport() {
      return {
        accountId: ACCOUNT,
        subjectId: 'owner-1',
        subjectType: 'owner',
        exportedAt: '2026-05-28T10:05:00.000Z',
        evidence: { consentCount: 0, dsrCount: 0, providerCount: 1, collectedProviderCount: 1, failedProviderCount: 0 },
        providerEvidence: [{ providerName: 'patients', dataType: 'patient_profile', status: 'collected' }],
        retentionEvidence: [],
        data: {
          patients: {
            source: 'PatientsService',
            rows: [
              { id: 'patient-a', accountId: ACCOUNT, name: 'Paciente A' },
              { id: 'patient-b', accountId: 'acc-foreign', name: 'Paciente B' }
            ]
          }
        }
      };
    }
  } as unknown as LgpdService;

  const consentResponse = new MockResponse();
  await handleLgpdRoutes(
    '/lgpd/consent',
    request('GET', undefined, '/lgpd/consent?subjectId=owner-1&subjectType=owner'),
    consentResponse as never,
    'corr-lgpd-read-consent',
    handlers
  );

  const exportResponse = new MockResponse();
  await handleLgpdRoutes(
    '/lgpd/export',
    request('POST', { subjectId: 'owner-1', subjectType: 'owner' }, '/lgpd/export'),
    exportResponse as never,
    'corr-lgpd-safe-export',
    handlers
  );

  const payload = exportResponse.bodyJson<{
    data: { patients: { rows: Array<{ id: string; accountId: string; name: string }> } };
  }>();
  assert.deepEqual(payload.data.patients.rows, [
    { id: 'patient-a', accountId: ACCOUNT, name: 'Paciente A' }
  ]);
  assert.deepEqual(auditActions, ['consent_read', 'personal_data_exported']);
});

test('handleLgpdRoutes denies a cross-account DSR mutation before completion', async () => {
  const handlers = createHandlers();
  let completionCalled = false;
  handlers.lgpd = {
    async getDsrRequest(accountId: string, requestId: string) {
      assert.equal(accountId, ACCOUNT);
      assert.equal(requestId, 'dsr-from-another-account');
      return undefined;
    },
    async completeDsrRequest() {
      completionCalled = true;
      throw new Error('completion must not be called for a foreign request');
    }
  } as unknown as LgpdService;

  await assert.rejects(
    () =>
      handleLgpdRoutes(
        '/lgpd/requests/complete',
        request(
          'POST',
          { requestId: 'dsr-from-another-account' },
          '/lgpd/requests/complete'
        ),
        new MockResponse() as never,
        'corr-lgpd-cross-account',
        handlers
      ),
    NotFoundError
  );
  assert.equal(completionCalled, false);
});
