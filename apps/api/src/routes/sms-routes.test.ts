import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import test from 'node:test';

import { ApiKeysService } from '@cvg-his-v2/module-api-keys';
import { AuditService } from '@cvg-his-v2/module-audit';

import { createInMemoryRuntimeRepositories } from '../runtime-repositories.js';
import { InMemorySmsDeliveryRepository } from '../sms-delivery-repository.js';
import { LocalSmsGateway } from '../sms-gateway.js';
import { handleSmsRoutes } from './sms-routes.js';

class MockResponse extends Writable {
  public statusCode = 200;
  readonly #chunks: Buffer[] = [];

  _write(chunk: string | Buffer, _encoding: BufferEncoding, callback: (error?: Error | null) => void): void {
    this.#chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    callback();
  }

  override end(chunk?: string | Buffer | (() => void), encoding?: BufferEncoding | (() => void), callback?: () => void): this {
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

function createRequest(rawKey: string, payload: Record<string, unknown> = {}, options: { method?: string; url?: string } = {}) {
  return {
    method: options.method ?? 'POST',
    url: options.url ?? '/integrations/sms/messages',
    headers: {
      'x-api-key': rawKey,
      'content-type': 'application/json'
    },
    socket: { remoteAddress: '127.0.0.1' },
    [Symbol.asyncIterator]: async function* () {
      if (Object.keys(payload).length > 0) {
        yield Buffer.from(JSON.stringify(payload));
      }
    }
  } as never;
}

test('handleSmsRoutes sends transactional sms and exposes report', async () => {
  const apiKeys = new ApiKeysService(createInMemoryRuntimeRepositories().apiKey);
  const created = await apiKeys.create({
    accountId: 'acc_cvg_demo' as never,
    name: 'SMS key',
    permissions: ['integrations.read', 'notifications.manage'],
    createdBy: 'user_admin'
  });
  const audit = new AuditService();
  const smsDeliveries = new InMemorySmsDeliveryRepository();
  const smsGateway = new LocalSmsGateway();

  const sendResponse = new MockResponse();
  const handledSend = await handleSmsRoutes(
    '/integrations/sms/messages',
    createRequest(created.rawKey, {
      to: '5511999999999',
      text: 'Resultado liberado',
      maxRetries: 2
    }),
    sendResponse as never,
    'corr-sms-1',
    {
      smsGateway,
      smsDeliveries,
      smsMode: 'mock',
      smsFrom: 'CVGHIS',
      smsConfigured: false,
      apiKeys,
      audit
    }
  );

  assert.equal(handledSend, true);
  assert.equal(sendResponse.statusCode, 201);
  const sent = sendResponse.bodyJson<{ messageId: string; status: string; provider: string }>();
  assert.equal(sent.status, 'sent');
  assert.equal(sent.provider, 'local-sms');

  const reportResponse = new MockResponse();
  await handleSmsRoutes(
    '/integrations/sms/messages/report',
    createRequest(created.rawKey, {}, { method: 'GET', url: '/integrations/sms/messages/report' }),
    reportResponse as never,
    'corr-sms-2',
    {
      smsGateway,
      smsDeliveries,
      smsMode: 'mock',
      smsFrom: 'CVGHIS',
      smsConfigured: false,
      apiKeys,
      audit
    }
  );

  const report = reportResponse.bodyJson<{ summary: { total: number; sent: number } }>();
  assert.equal(report.summary.total, 1);
  assert.equal(report.summary.sent, 1);
});

test('handleSmsRoutes retries failed transactional sms', async () => {
  const apiKeys = new ApiKeysService(createInMemoryRuntimeRepositories().apiKey);
  const created = await apiKeys.create({
    accountId: 'acc_cvg_demo' as never,
    name: 'SMS key',
    permissions: ['integrations.read', 'notifications.manage'],
    createdBy: 'user_admin'
  });
  const audit = new AuditService();
  const smsDeliveries = new InMemorySmsDeliveryRepository();
  const smsGateway = new LocalSmsGateway();

  const firstResponse = new MockResponse();
  await handleSmsRoutes(
    '/integrations/sms/messages',
    createRequest(created.rawKey, {
      to: '5511000000000',
      text: 'Mensagem fail'
    }),
    firstResponse as never,
    'corr-sms-3',
    {
      smsGateway,
      smsDeliveries,
      smsMode: 'mock',
      smsFrom: 'CVGHIS',
      smsConfigured: false,
      apiKeys,
      audit
    }
  );

  const failed = firstResponse.bodyJson<{ messageId: string; status: string; retryCount: number }>();
  assert.equal(failed.status, 'failed');
  assert.equal(failed.retryCount, 1);

  const retryResponse = new MockResponse();
  await handleSmsRoutes(
    `/integrations/sms/messages/${failed.messageId}/retry`,
    createRequest(created.rawKey, {}, { method: 'POST', url: `/integrations/sms/messages/${failed.messageId}/retry` }),
    retryResponse as never,
    'corr-sms-4',
    {
      smsGateway,
      smsDeliveries,
      smsMode: 'mock',
      smsFrom: 'CVGHIS',
      smsConfigured: false,
      apiKeys,
      audit
    }
  );

  const retried = retryResponse.bodyJson<{ status: string; retryCount: number }>();
  assert.equal(retried.status, 'failed');
  assert.equal(retried.retryCount, 2);
});
