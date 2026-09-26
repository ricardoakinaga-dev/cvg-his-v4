import assert from 'node:assert/strict';
import { Readable, Writable } from 'node:stream';
import test from 'node:test';

import { handleNotificationWriteRoutes } from './notification-write-routes.js';

class MockRequest extends Readable {
  public readonly method: string;
  public readonly url: string;
  public readonly headers: Record<string, string> = {};
  readonly #body: Buffer;
  #sent = false;

  constructor(method: string, url: string, body = '') {
    super();
    this.method = method;
    this.url = url;
    this.#body = Buffer.from(body, 'utf8');
  }

  _read(): void {
    if (this.#sent) {
      this.push(null);
      return;
    }

    this.#sent = true;
    if (this.#body.length > 0) this.push(this.#body);
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
  user: { id: 'user-notification-write', accountId: 'account-notification-write' }
} as never;

test('notification create route preserves permission, service, audit, and response order', async () => {
  const calls: string[] = [];
  const payload = { title: 'Queue review', category: 'operations' };
  const notification = { id: 'notification-1', category: 'operations' };
  const request = new MockRequest('POST', '/notifications', JSON.stringify(payload));
  const response = new MockResponse();

  const handled = await handleNotificationWriteRoutes(
    '/notifications',
    request as never,
    response as never,
    'corr-notification-create',
    {
      notifications: {
        create: async (actorId, accountId, receivedPayload) => {
          calls.push(`create:${actorId}:${accountId}`);
          assert.deepEqual(receivedPayload, payload);
          return notification as never;
        }
      },
      notificationPersistence: { processPendingFromRepository: async () => [] },
      requirePrincipal: async (_request, permissionCode) => {
        calls.push(`principal:${permissionCode}`);
        return principal;
      },
      appendAudit: (...audit) => {
        calls.push('audit');
        assert.deepEqual(audit, [
          'user-notification-write',
          'account-notification-write',
          'notifications',
          'create',
          'notification',
          'notification-1',
          'Notification queued for category operations',
          'medium',
          'corr-notification-create'
        ]);
      }
    }
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 201);
  assert.deepEqual(calls, [
    'principal:notifications.manage',
    'create:user-notification-write:account-notification-write',
    'audit'
  ]);
  assert.deepEqual(response.bodyJson(), notification);
});

test('notification processing route forwards payload then audits and responds with items', async () => {
  const calls: string[] = [];
  const payload = { limit: 7 };
  const processed = [{ id: 'notification-job-1' }];
  const request = new MockRequest('POST', '/notifications/process', JSON.stringify(payload));
  const response = new MockResponse();

  const handled = await handleNotificationWriteRoutes(
    '/notifications/process',
    request as never,
    response as never,
    'corr-notification-process',
    {
      notifications: { create: async () => ({ id: 'unused', category: 'system' }) as never },
      notificationPersistence: {
        processPendingFromRepository: async (accountId, receivedPayload) => {
          calls.push(`process:${accountId}`);
          assert.deepEqual(receivedPayload, payload);
          return processed;
        }
      },
      requirePrincipal: async (_request, permissionCode) => {
        calls.push(`principal:${permissionCode}`);
        return principal;
      },
      appendAudit: (...audit) => {
        calls.push('audit');
        assert.deepEqual(audit, [
          'user-notification-write',
          'account-notification-write',
          'notifications',
          'process_jobs',
          'notification-job',
          '1',
          'Processed 1 notification jobs',
          'medium',
          'corr-notification-process'
        ]);
      }
    }
  );

  assert.equal(handled, true);
  assert.equal(response.statusCode, 200);
  assert.deepEqual(calls, [
    'principal:notifications.manage',
    'process:account-notification-write',
    'audit'
  ]);
  assert.deepEqual(response.bodyJson(), { items: processed });
});

test('notification processing keeps the malformed-body fallback to an empty payload', async () => {
  let receivedPayload: unknown;
  const request = new MockRequest('POST', '/notifications/process', '{');
  const response = new MockResponse();

  const handled = await handleNotificationWriteRoutes(
    '/notifications/process',
    request as never,
    response as never,
    'corr-notification-process-empty',
    {
      notifications: { create: async () => ({ id: 'unused', category: 'system' }) as never },
      notificationPersistence: {
        processPendingFromRepository: async (_accountId, payload) => {
          receivedPayload = payload;
          return [];
        }
      },
      requirePrincipal: async () => principal,
      appendAudit: () => undefined
    }
  );

  assert.equal(handled, true);
  assert.deepEqual(receivedPayload, {});
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.bodyJson(), { items: [] });
});

test('notification write routes leave unmatched requests unhandled', async () => {
  const request = new MockRequest('PATCH', '/notifications');
  const handled = await handleNotificationWriteRoutes(
    '/notifications',
    request as never,
    new MockResponse() as never,
    'corr-notification-unmatched',
    {
      notifications: { create: async () => ({ id: 'unused', category: 'system' }) as never },
      notificationPersistence: { processPendingFromRepository: async () => [] },
      requirePrincipal: async () => {
        throw new Error('unexpected authentication');
      },
      appendAudit: () => {
        throw new Error('unexpected audit');
      }
    }
  );

  assert.equal(handled, false);
});
