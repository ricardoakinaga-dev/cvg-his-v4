import assert from 'node:assert/strict';
import test from 'node:test';

import { ResendEmailGatewayAdapter } from './email-gateway.js';

test('ResendEmailGatewayAdapter sends transactional email successfully', async () => {
  const originalFetch = globalThis.fetch;
  const calls: Array<{ readonly url: string; readonly init?: RequestInit }> = [];

  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(url), init });
    return new Response(JSON.stringify({ id: 're_123' }), {
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
  }) as typeof fetch;

  try {
    const gateway = new ResendEmailGatewayAdapter({
      apiKey: 're_test_key',
      from: 'clinic@example.com'
    });

    const result = await gateway.send({
      to: 'owner@example.com',
      subject: 'Exame liberado',
      text: 'Seu exame foi liberado.'
    });

    assert.equal(result.provider, 'resend');
    assert.equal(result.status, 'sent');
    assert.equal(result.providerMessageId, 're_123');
    assert.equal(calls.length, 1);
    assert.equal(calls[0]?.url, 'https://api.resend.com/emails');
    assert.match(String(calls[0]?.init?.headers instanceof Headers
      ? calls[0]?.init?.headers.get('Authorization')
      : (calls[0]?.init?.headers as Record<string, string>).Authorization), /^Bearer re_test_key$/);
    assert.deepEqual(JSON.parse(String(calls[0]?.init?.body)), {
      from: 'clinic@example.com',
      to: ['owner@example.com'],
      subject: 'Exame liberado',
      text: 'Seu exame foi liberado.'
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('ResendEmailGatewayAdapter returns failure payload when provider rejects request', async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = (async () =>
    new Response(JSON.stringify({ message: 'forbidden' }), {
      status: 403,
      headers: { 'content-type': 'application/json' }
    })) as typeof fetch;

  try {
    const gateway = new ResendEmailGatewayAdapter({
      apiKey: 're_test_key',
      from: 'clinic@example.com'
    });

    const result = await gateway.send({
      to: 'owner@example.com',
      subject: 'Falha',
      text: 'Falha esperada.'
    });

    assert.equal(result.provider, 'resend');
    assert.equal(result.status, 'failed');
    assert.match(result.failureReason ?? '', /403/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
