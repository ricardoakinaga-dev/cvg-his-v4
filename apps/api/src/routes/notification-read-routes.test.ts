import assert from 'node:assert/strict';
import { Readable, Writable } from 'node:stream';
import test from 'node:test';

import { handleNotificationReadRoutes } from './notification-read-routes.js';

class MockRequest extends Readable {
  public readonly method: string;
  public readonly url: string;

  constructor(method: string, url: string) {
    super();
    this.method = method;
    this.url = url;
  }

  _read(): void {
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

  bodyJson<T>(): T {
    return JSON.parse(Buffer.concat(this.#chunks).toString('utf8')) as T;
  }
}

const principal = {
  user: { id: 'user-notification-read', accountId: 'account-notification-read' }
} as never;

test('notification list route retains empty status filtering, audit, and response shape', async () => {
  const calls: string[] = [];
  let receivedStatus: string | undefined;
  let receivedAudit: unknown[] | undefined;
  const notification = { id: 'notification-1' };
  const request = new MockRequest('GET', '/notifications?status=');
  const response = new MockResponse();

  const handled = await handleNotificationReadRoutes(
    '/notifications',
    new URL(request.url, 'http://localhost'),
    request as never,
    response as never,
    'corr-notification-list',
    {
      notificationPersistence: {
        listFromRepository: async (accountId, status) => {
          calls.push(`list:${accountId}`);
          receivedStatus = status;
          return [notification];
        },
        listJobsFromRepository: async () => []
      },
      requirePrincipal: async (_request, permissionCode) => {
        calls.push(`principal:${permissionCode}`);
        return principal;
      },
      appendAudit: (...audit) => {
        calls.push('audit');
        receivedAudit = audit;
      }
    }
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 200);
  assert.deepEqual(calls, [
    'principal:notifications.read',
    'audit',
    'list:account-notification-read'
  ]);
  assert.equal(receivedStatus, '');
  assert.deepEqual(receivedAudit, [
    'user-notification-read',
    'account-notification-read',
    'notifications',
    'list',
    'notification',
    '',
    'Operational notifications listed',
    'medium',
    'corr-notification-list'
  ]);
  assert.deepEqual(response.bodyJson<{ items: unknown[] }>().items, [notification]);
});

test('notification jobs route audits and lists jobs for the authenticated account', async () => {
  const calls: string[] = [];
  const job = { id: 'notification-job-1' };
  const request = new MockRequest('GET', '/notifications/jobs');
  const response = new MockResponse();

  const handled = await handleNotificationReadRoutes(
    '/notifications/jobs',
    new URL(request.url, 'http://localhost'),
    request as never,
    response as never,
    'corr-notification-jobs',
    {
      notificationPersistence: {
        listFromRepository: async () => [],
        listJobsFromRepository: async (accountId, ...unexpected) => {
          assert.deepEqual([accountId, ...unexpected], ['account-notification-read']);
          calls.push(`jobs:${accountId}`);
          return [job];
        }
      },
      requirePrincipal: async (_request, permissionCode) => {
        calls.push(`principal:${permissionCode}`);
        return principal;
      },
      appendAudit: (
        _actorId,
        accountId,
        module,
        action,
        entityType,
        entityId,
        summary,
        risk,
        correlationId
      ) => {
        calls.push(
          `audit:${accountId}:${module}:${action}:${entityType}:${entityId}:${summary}:${risk}:${correlationId}`
        );
      }
    }
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 200);
  assert.deepEqual(calls, [
    'principal:notifications.read',
    'audit:account-notification-read:notifications:list_jobs:notification-job:all:Notification jobs listed:medium:corr-notification-jobs',
    'jobs:account-notification-read'
  ]);
  assert.deepEqual(response.bodyJson<{ items: unknown[] }>().items, [job]);
});

test('notification read routes leave unmatched methods and paths unhandled', async () => {
  const handlers = {
    notificationPersistence: {
      listFromRepository: async () => [],
      listJobsFromRepository: async () => []
    },
    requirePrincipal: async () => {
      throw new Error('unexpected authentication');
    },
    appendAudit: () => {
      throw new Error('unexpected audit');
    }
  };
  const unmatchedRequests = [
    new MockRequest('POST', '/notifications'),
    new MockRequest('GET', '/notifications/jobs/next')
  ];

  for (const request of unmatchedRequests) {
    const pathname = new URL(request.url, 'http://localhost').pathname;
    const handled = await handleNotificationReadRoutes(
      pathname,
      new URL(request.url, 'http://localhost'),
      request as never,
      new MockResponse() as never,
      'corr-notification-unmatched',
      handlers
    );

    assert.equal(handled, false);
  }
});
