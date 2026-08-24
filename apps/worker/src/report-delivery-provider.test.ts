import assert from 'node:assert/strict';
import test from 'node:test';

import type { ReportExportSummary } from '@cvg-his-v2/module-reports';
import type { AccountId, UserId } from '@cvg-his-v2/shared-types';

import { createWorkerReportDeliveryProvider } from './report-delivery-provider.js';

function exported(): ReportExportSummary {
  return {
    id: 'report-export-1',
    accountId: 'account-report-provider' as AccountId,
    executionId: 'report-execution-1',
    format: 'csv',
    filename: 'report.csv',
    contentType: 'text/csv',
    contentEncoding: 'utf8',
    content: 'metric,value\nrevenue,100\n',
    exportedByUserId: 'user-report-provider' as UserId,
    exportedAt: '2026-08-24T12:00:00.000Z'
  };
}

test('worker report provider sends the durable delivery key and artifact', async () => {
  const previousKey = process.env.RESEND_API_KEY;
  const previousFrom = process.env.EMAIL_FROM;
  const previousEndpoint = process.env.REPORT_EMAIL_ENDPOINT;
  const previousMock = process.env.EMAIL_MOCK_MODE;
  const previousFetch = globalThis.fetch;
  process.env.RESEND_API_KEY = 're_worker_test_key';
  process.env.EMAIL_FROM = 'reports@example.test';
  delete process.env.REPORT_EMAIL_ENDPOINT;
  delete process.env.EMAIL_MOCK_MODE;

  let request: RequestInit | undefined;
  globalThis.fetch = (async (_url, init) => {
    request = init;
    return new Response('{}', { status: 200 });
  }) as typeof fetch;

  try {
    const provider = createWorkerReportDeliveryProvider('test');
    assert.ok(provider);
    await provider.deliver({
      accountId: 'account-report-provider' as AccountId,
      scheduleId: 'schedule-1',
      executionId: 'execution-1',
      deliveryId: 'delivery-1',
      idempotencyKey: 'report:delivery-1',
      recipient: 'finance@example.test',
      exported: exported()
    });

    assert.equal(
      (request?.headers as Record<string, string>)['Idempotency-Key'],
      'report:delivery-1'
    );
    const body = JSON.parse(String(request?.body)) as { attachments: Array<{ content: string }> };
    assert.equal(body.attachments[0]?.content, Buffer.from(exported().content).toString('base64'));
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = previousKey;
    if (previousFrom === undefined) delete process.env.EMAIL_FROM;
    else process.env.EMAIL_FROM = previousFrom;
    if (previousEndpoint === undefined) delete process.env.REPORT_EMAIL_ENDPOINT;
    else process.env.REPORT_EMAIL_ENDPOINT = previousEndpoint;
    if (previousMock === undefined) delete process.env.EMAIL_MOCK_MODE;
    else process.env.EMAIL_MOCK_MODE = previousMock;
  }
});

test('worker report provider can use an explicit local endpoint in test environments', async () => {
  const previousKey = process.env.RESEND_API_KEY;
  const previousFrom = process.env.EMAIL_FROM;
  const previousEndpoint = process.env.REPORT_EMAIL_ENDPOINT;
  const previousFetch = globalThis.fetch;
  process.env.RESEND_API_KEY = 're_worker_test_key';
  process.env.EMAIL_FROM = 'reports@example.test';
  process.env.REPORT_EMAIL_ENDPOINT = 'http://127.0.0.1:43123/report-email';

  let requestedUrl: string | undefined;
  globalThis.fetch = (async (url) => {
    requestedUrl = String(url);
    return new Response('{}', { status: 200 });
  }) as typeof fetch;

  try {
    const provider = createWorkerReportDeliveryProvider('test');
    assert.ok(provider);
    await provider.deliver({
      accountId: 'account-report-provider' as AccountId,
      scheduleId: 'schedule-1',
      executionId: 'execution-1',
      deliveryId: 'delivery-1',
      idempotencyKey: 'report:delivery-1',
      recipient: 'finance@example.test',
      exported: exported()
    });
    assert.equal(requestedUrl, 'http://127.0.0.1:43123/report-email');
  } finally {
    globalThis.fetch = previousFetch;
    if (previousKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = previousKey;
    if (previousFrom === undefined) delete process.env.EMAIL_FROM;
    else process.env.EMAIL_FROM = previousFrom;
    if (previousEndpoint === undefined) delete process.env.REPORT_EMAIL_ENDPOINT;
    else process.env.REPORT_EMAIL_ENDPOINT = previousEndpoint;
  }
});

test('worker report provider remains explicit when production email is not configured', () => {
  const previousKey = process.env.RESEND_API_KEY;
  const previousFrom = process.env.EMAIL_FROM;
  const previousEndpoint = process.env.REPORT_EMAIL_ENDPOINT;
  delete process.env.RESEND_API_KEY;
  delete process.env.EMAIL_FROM;
  delete process.env.REPORT_EMAIL_ENDPOINT;

  try {
    assert.equal(createWorkerReportDeliveryProvider('production'), undefined);
  } finally {
    if (previousKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = previousKey;
    if (previousFrom === undefined) delete process.env.EMAIL_FROM;
    else process.env.EMAIL_FROM = previousFrom;
    if (previousEndpoint === undefined) delete process.env.REPORT_EMAIL_ENDPOINT;
    else process.env.REPORT_EMAIL_ENDPOINT = previousEndpoint;
  }
});

test('worker report provider rejects a controlled endpoint in production-like environments', () => {
  const previousKey = process.env.RESEND_API_KEY;
  const previousFrom = process.env.EMAIL_FROM;
  const previousEndpoint = process.env.REPORT_EMAIL_ENDPOINT;
  process.env.RESEND_API_KEY = 're_worker_test_key';
  process.env.EMAIL_FROM = 'reports@example.test';
  process.env.REPORT_EMAIL_ENDPOINT = 'http://127.0.0.1:43123/report-email';

  try {
    assert.throws(
      () => createWorkerReportDeliveryProvider('production'),
      /REPORT_EMAIL_ENDPOINT is restricted/
    );
  } finally {
    if (previousKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = previousKey;
    if (previousFrom === undefined) delete process.env.EMAIL_FROM;
    else process.env.EMAIL_FROM = previousFrom;
    if (previousEndpoint === undefined) delete process.env.REPORT_EMAIL_ENDPOINT;
    else process.env.REPORT_EMAIL_ENDPOINT = previousEndpoint;
  }
});
