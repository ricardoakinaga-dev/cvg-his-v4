import assert from 'node:assert/strict';
import test from 'node:test';

import { PagarMePixPaymentDispatchProvider } from './pagarme-pix-payment-dispatch-provider.js';
import { PixPaymentDispatchProviderError } from './pix-payment-dispatcher.js';

const input = {
  accountId: '00000000-0000-4000-8000-000000000001',
  attemptId: '00000000-0000-4000-8000-000000000002',
  encounterId: '00000000-0000-4000-8000-000000000003',
  billingRecordId: 'bill-1',
  amountCents: 15_000,
  currency: 'BRL' as const,
  providerIdempotencyKey: 'cvg:pix:create:v1:00000000-0000-4000-8000-000000000002',
  attemptCreatedAt: '2026-10-01T12:00:00.000Z'
};

function providerWith(respond: (init: RequestInit) => Response | Promise<Response>) {
  const calls: RequestInit[] = [];
  const provider = new PagarMePixPaymentDispatchProvider({
    apiKey: 'sk_test',
    pixKey: 'pix@clinic.test',
    baseUrl: 'https://pagarme.test',
    fetchImpl: (async (_url: string, init: RequestInit) => {
      calls.push(init);
      return respond(init);
    }) as typeof fetch
  });
  return { provider, calls };
}

test('creates the QR code with the stable idempotency key and tenant/attempt metadata', async () => {
  const { provider, calls } = providerWith(() =>
    Response.json({
      id: 'qr_123',
      qr_code: '000201pix',
      qr_code_base64: 'cXI=',
      expires_at: '2026-10-01T12:30:00.000Z'
    })
  );

  const result = await provider.createIntent(input);

  assert.deepEqual(result, {
    providerTransactionId: 'qr_123',
    qrCodePayload: '000201pix',
    qrCodeBase64: 'cXI=',
    expiresAt: '2026-10-01T12:30:00.000Z'
  });
  const headers = new Headers(calls[0]?.headers);
  assert.equal(headers.get('idempotency-key'), input.providerIdempotencyKey);
  const body = JSON.parse(String(calls[0]?.body));
  assert.equal(body.amount, 15_000);
  assert.deepEqual(body.metadata, {
    cvg_account_id: input.accountId,
    cvg_attempt_id: input.attemptId
  });
  assert.equal(provider.mode, 'external');
  assert.equal(provider.key, 'pagarme');
});

test('classifies provider failures so the dispatcher retries safely', async () => {
  const cases: Array<[() => Response | Promise<Response>, string, string]> = [
    [() => Promise.reject(new Error('socket hang up')), 'PAGARME_NO_RESPONSE', 'ambiguous'],
    [() => new Response('', { status: 408 }), 'PAGARME_TIMEOUT', 'ambiguous'],
    [() => new Response('', { status: 503 }), 'PAGARME_UNAVAILABLE', 'transient'],
    [() => new Response('', { status: 429 }), 'PAGARME_UNAVAILABLE', 'transient'],
    [() => new Response('', { status: 401 }), 'PAGARME_AUTH_REJECTED', 'permanent'],
    [() => new Response('', { status: 422 }), 'PAGARME_REJECTED', 'permanent'],
    [() => Response.json({ id: 'qr_1' }), 'PAGARME_INVALID_RESPONSE', 'ambiguous']
  ];
  for (const [respond, code, failureClass] of cases) {
    const { provider } = providerWith(respond);
    await assert.rejects(
      () => provider.createIntent(input),
      (error: PixPaymentDispatchProviderError) =>
        error instanceof PixPaymentDispatchProviderError &&
        error.code === code &&
        error.failureClass === failureClass
    );
  }
});
