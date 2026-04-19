import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import test from 'node:test';

import { ApiKeysService } from '@cvg-his-v2/module-api-keys';
import { AuditService } from '@cvg-his-v2/module-audit';
import { LocalEmailGateway } from '../email-gateway.js';
import { InMemoryEmailDeliveryRepository } from '../email-delivery-repository.js';
import { createInMemoryRuntimeRepositories } from '../runtime-repositories.js';
import { handleEmailRoutes } from './email-routes.js';

class MockResponse extends Writable {
  public statusCode = 200;
  readonly #headers = new Map<string, string>();
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

  setHeader(name: string, value: string): this {
    this.#headers.set(name.toLowerCase(), value);
    return this;
  }

  bodyJson<T>(): T {
    return JSON.parse(Buffer.concat(this.#chunks).toString('utf8')) as T;
  }
}

function createRequest(
  rawKey: string,
  payload: Record<string, unknown> = {},
  options: { method?: string; url?: string } = {}
) {
  return {
    method: options.method ?? 'POST',
    url: options.url ?? '/integrations/email/messages',
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

test('handleEmailRoutes sends transactional email and exposes report', async () => {
  const apiKeys = new ApiKeysService(createInMemoryRuntimeRepositories().apiKey);
  const created = await apiKeys.create({
    accountId: 'acc_cvg_demo' as never,
    name: 'Email key',
    permissions: ['integrations.read', 'notifications.manage'],
    createdBy: 'user_admin'
  });
  const audit = new AuditService();
  const emailDeliveries = new InMemoryEmailDeliveryRepository();
  const emailGateway = new LocalEmailGateway();

  const sendResponse = new MockResponse();
  const handledSend = await handleEmailRoutes(
    '/integrations/email/messages',
    createRequest(created.rawKey, {
      to: 'owner@example.com',
      subject: 'Resultado pronto',
      text: 'Seu resultado ja esta disponivel.',
      maxRetries: 2
    }),
    sendResponse as never,
    'corr-email-1',
    {
      emailGateway,
      emailDeliveries,
      emailMode: 'mock',
      emailFrom: 'noreply@cvg-his.local',
      resendConfigured: false,
      apiKeys,
      audit
    }
  );

  assert.equal(handledSend, true);
  assert.equal(sendResponse.statusCode, 201);
  const sent = sendResponse.bodyJson<{ messageId: string; status: string; provider: string }>();
  assert.equal(sent.status, 'sent');
  assert.equal(sent.provider, 'local-email');

  const reportResponse = new MockResponse();
  const handledReport = await handleEmailRoutes(
    '/integrations/email/messages/report',
    createRequest(created.rawKey, {}, { method: 'GET', url: '/integrations/email/messages/report' }),
    reportResponse as never,
    'corr-email-2',
    {
      emailGateway,
      emailDeliveries,
      emailMode: 'mock',
      emailFrom: 'noreply@cvg-his.local',
      resendConfigured: false,
      apiKeys,
      audit
    }
  );

  assert.equal(handledReport, true);
  assert.equal(reportResponse.statusCode, 200);
  const report = reportResponse.bodyJson<{
    operational: {
      mode: string;
      defaultFrom: string;
      resendConfigured: boolean;
      pendingRetries: number;
      byProvider: { 'local-email': number; resend: number };
    };
    summary: { total: number; sent: number };
  }>();
  assert.equal(report.summary.total, 1);
  assert.equal(report.summary.sent, 1);
  assert.equal(report.operational.mode, 'mock');
  assert.equal(report.operational.defaultFrom, 'noreply@cvg-his.local');
  assert.equal(report.operational.resendConfigured, false);
  assert.equal(report.operational.byProvider['local-email'], 1);
  assert.equal(report.operational.pendingRetries, 0);
});

test('handleEmailRoutes retries failed transactional email', async () => {
  const apiKeys = new ApiKeysService(createInMemoryRuntimeRepositories().apiKey);
  const created = await apiKeys.create({
    accountId: 'acc_cvg_demo' as never,
    name: 'Email key',
    permissions: ['integrations.read', 'notifications.manage'],
    createdBy: 'user_admin'
  });
  const audit = new AuditService();
  const emailDeliveries = new InMemoryEmailDeliveryRepository();
  const emailGateway = new LocalEmailGateway();

  const firstResponse = new MockResponse();
  await handleEmailRoutes(
    '/integrations/email/messages',
    createRequest(created.rawKey, {
      to: 'fail@example.com',
      subject: 'Falha simulada',
      text: 'Mensagem com falha controlada.',
      maxRetries: 2
    }),
    firstResponse as never,
    'corr-email-3',
    {
      emailGateway,
      emailDeliveries,
      emailMode: 'mock',
      emailFrom: 'noreply@cvg-his.local',
      resendConfigured: false,
      apiKeys,
      audit
    }
  );

  const failed = firstResponse.bodyJson<{ messageId: string; status: string; retryCount: number }>();
  assert.equal(failed.status, 'failed');
  assert.equal(failed.retryCount, 1);

  const retryResponse = new MockResponse();
  await handleEmailRoutes(
    `/integrations/email/messages/${failed.messageId}/retry`,
    createRequest(
      created.rawKey,
      {},
      { method: 'POST', url: `/integrations/email/messages/${failed.messageId}/retry` }
    ),
    retryResponse as never,
    'corr-email-4',
    {
      emailGateway,
      emailDeliveries,
      emailMode: 'mock',
      emailFrom: 'noreply@cvg-his.local',
      resendConfigured: false,
      apiKeys,
      audit
    }
  );

  assert.equal(retryResponse.statusCode, 202);
  const retried = retryResponse.bodyJson<{ status: string; retryCount: number }>();
  assert.equal(retried.status, 'failed');
  assert.equal(retried.retryCount, 2);
});
