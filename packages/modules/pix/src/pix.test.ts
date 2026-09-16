import assert from 'node:assert/strict';
import { expect, test } from 'vitest';
import { ValidationError } from '@cvg-his-v2/shared-errors';
import { ConfirmedPixSettlementCommand } from './confirmed-settlement/confirmed-pix-settlement-command.js';
import { PixService } from './pix.service.js';
import { MockPixAdapter } from './adapters/mock.adapter.js';
import { PagarMePixAdapter } from './adapters/pagarme.adapter.js';
import type { PixTransactionId } from './types.js';

test('PixService createIntent returns PixIntentResult with QR code', async () => {
  const adapter = new MockPixAdapter();
  const service = new PixService(adapter);

  const result = await service.createIntent({
    billingRecordId: 'bill_123',
    accountId: 'acc_cvg_demo' as never,
    amount: 10000, // R$100.00 in cents
    description: 'Consulta veterinária'
  });

  assert.ok(result.transaction.id, 'Transaction should have an id');
  assert.equal(result.transaction.currency, 'BRL');
  assert.equal(result.transaction.amount, 10000);
  assert.equal(result.transaction.status, 'pending');
  assert.ok(result.qrCodeBase64, 'Should have QR code base64');
  assert.ok(result.qrCodePayload, 'Should have QR code payload (EMV)');
  assert.ok(result.qrCodePayload.startsWith('000201'), 'EMV payload should start with 000201');
  assert.ok(result.transaction.expiresAt, 'Should have expiration time');
});

test('PixService createIntent respects expirationMinutes', async () => {
  const adapter = new MockPixAdapter();
  const service = new PixService(adapter);

  const before = Date.now();
  const result = await service.createIntent({
    billingRecordId: 'bill_456',
    accountId: 'acc_cvg_demo' as never,
    amount: 5000,
    description: 'Exame',
    expirationMinutes: 30
  });
  const after = Date.now();

  const expiresAt = new Date(result.transaction.expiresAt).getTime();
  const expectedMin = before + 30 * 60 * 1000;
  const expectedMax = after + 30 * 60 * 1000;

  assert.ok(expiresAt >= expectedMin && expiresAt <= expectedMax, 'Expiration should be ~30 minutes from now');
});

test('PixService getStatus returns status from provider', async () => {
  const adapter = new MockPixAdapter();
  const service = new PixService(adapter);

  const { transaction } = await service.createIntent({
    billingRecordId: 'bill_789',
    accountId: 'acc_cvg_demo' as never,
    amount: 2500,
    description: 'Vacina'
  });

  const status = await service.getStatus(transaction.id);

  assert.equal(status.transactionId, transaction.id);
  assert.equal(status.status, 'pending');
});

test('PixService cancelIntent returns cancelled=true for pending transaction', async () => {
  const adapter = new MockPixAdapter();
  const service = new PixService(adapter);

  const { transaction } = await service.createIntent({
    billingRecordId: 'bill_cancel',
    accountId: 'acc_cvg_demo' as never,
    amount: 1500,
    description: 'Test cancellation'
  });

  const result = await service.cancelIntent(transaction.id);

  assert.equal(result.transactionId, transaction.id);
  assert.equal(result.cancelled, true);
});

test('PixService cancelIntent returns cancelled=false when not supported', async () => {
  // Create an adapter without cancelIntent
  const adapterWithoutCancel: any = {
    name: 'nocancel',
    async createIntent() {
      return {
        transaction: {
          id: 'pix_test' as PixTransactionId,
          billingRecordId: 'bill_test',
          accountId: 'acc_test' as never,
          amount: 1000,
          currency: 'BRL' as const,
          pixKey: '',
          qrCodePayload: '000201',
          expiresAt: new Date(Date.now() + 3600000).toISOString(),
          status: 'pending' as const,
          provider: 'nocancel' as const,
          createdAt: new Date().toISOString()
        },
        qrCodeBase64: 'data:image/png;base64,TEST',
        qrCodePayload: '000201'
      };
    },
    async getStatus(id: PixTransactionId) {
      return { transactionId: id, status: 'pending' as const };
    }
    // no cancelIntent method
  };

  const service = new PixService(adapterWithoutCancel as any);
  const result = await service.cancelIntent('pix_test' as PixTransactionId);

  assert.equal(result.cancelled, false);
  assert.ok(result.reason?.includes('does not support cancellation'));
});

test('PixService confirmPayment returns confirmed=true for pending transaction', async () => {
  const adapter = new MockPixAdapter();
  const service = new PixService(adapter);

  const { transaction } = await service.createIntent({
    billingRecordId: 'bill_confirm',
    accountId: 'acc_cvg_demo' as never,
    amount: 10000,
    description: 'Test confirmation'
  });

  const result = await service.confirmPayment(transaction.id, 'mock_e2e_001');

  assert.equal(result.transactionId, transaction.id);
  assert.equal(result.status, 'completed');
  assert.ok(result.completedAt);
});

test('PixService confirmPayment returns pending status when transaction not found', async () => {
  const adapter = new MockPixAdapter();
  const service = new PixService(adapter);

  const result = await service.confirmPayment('pix_nonexistent' as PixTransactionId);

  assert.equal(result.transactionId, 'pix_nonexistent');
  assert.equal(result.status, 'pending');
});

test('PixService buildTransaction creates a valid transaction object', () => {
  const adapter = new MockPixAdapter();
  const service = new PixService(adapter);

  const tx = service.buildTransaction({
    billingRecordId: 'bill_build',
    accountId: 'acc_build' as never,
    amount: 7500,
    qrCodePayload: '00020126580014br.gov.bcb.pix0136test1235204000053039865407500005802BR59250000',
    qrCodeBase64: 'data:image/png;base64,QR_TEST',
    expiresAt: '2026-04-10T15:00:00.000Z',
    providerTransactionId: 'prov_tx_123'
  });

  assert.ok(tx.id.startsWith('pix_'));
  assert.equal(tx.billingRecordId, 'bill_build');
  assert.equal(tx.accountId, 'acc_build');
  assert.equal(tx.amount, 7500);
  assert.equal(tx.currency, 'BRL');
  assert.equal(tx.status, 'pending');
  assert.equal(tx.provider, 'mock');
  assert.equal(tx.providerTransactionId, 'prov_tx_123');
});

test('ConfirmedPixSettlementCommand rejects malformed claims fingerprints before transaction access', async () => {
  const command = new ConfirmedPixSettlementCommand(
    { apply: async () => { throw new Error('repository must not be reached'); } },
    {},
    () => undefined
  );

  await assert.rejects(
    () => command.execute({
      accountId: '00000000-0000-0000-0000-000000000001',
      actorUserId: '00000000-0000-0000-0000-000000000002',
      attemptId: '00000000-0000-0000-0000-000000000003',
      provider: 'local-pix',
      providerEventId: 'provider-event',
      claimsFingerprint: 'not-a-sha256-digest',
      transactionId: 'transaction',
      billingRecordId: 'billing',
      amountCents: 100,
      currency: 'BRL',
      confirmedAt: '2026-08-30T12:00:00.000Z'
    }),
    (error: unknown) =>
      error instanceof ValidationError && error.message.includes('claimsFingerprint')
  );
});

test('PagarMePixAdapter validates configuration and maps provider lifecycle states', async () => {
  assert.throws(
    () => new PagarMePixAdapter({ apiKey: '', pixKey: 'pix@example.test' }),
    /apiKey is required/
  );
  assert.throws(
    () => new PagarMePixAdapter({ apiKey: 'api-key', pixKey: ' ' }),
    /pixKey is required/
  );

  const originalFetch = globalThis.fetch;
  const requests: Array<{ url: string; method: string; headers: Headers; body?: string }> = [];
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    requests.push({
      url,
      method: init?.method ?? 'GET',
      headers: new Headers(init?.headers),
      body: typeof init?.body === 'string' ? init.body : undefined
    });
    if (init?.method === 'POST') {
      return Response.json({
        id: 'qr-001',
        qr_code: '000201payload',
        qr_code_base64: 'base64-qr',
        expires_at: '2026-09-16T12:00:00.000Z'
      });
    }
    if (init?.method === 'DELETE') return new Response(null, { status: 204 });
    const providerId = url.split('/').at(-1);
    const status = providerId === 'paid' ? 'paid' : providerId === 'cancelled' ? 'canceled' : providerId === 'expired' ? 'expired' : 'pending';
    return Response.json({
      id: providerId,
      status,
      paid_at: status === 'paid' ? '2026-09-16T11:00:00.000Z' : undefined
    });
  };

  try {
    const adapter = new PagarMePixAdapter({
      apiKey: 'api-key',
      pixKey: 'pix@example.test',
      baseUrl: 'https://pagarme.example.test'
    });
    const created = await adapter.createIntent({
      billingRecordId: 'bill-pagarme',
      accountId: 'acc-pagarme' as never,
      amount: 1234,
      description: 'Consulta',
      expirationMinutes: 15
    });
    assert.equal(created.transaction.provider, 'pagarme');
    assert.equal(created.transaction.providerTransactionId, 'qr-001');
    assert.equal(created.qrCodePayload, '000201payload');
    assert.equal(requests[0]?.method, 'POST');
    assert.equal(requests[0]?.headers.get('authorization'), `Basic ${Buffer.from('api-key:').toString('base64')}`);
    const createBody = JSON.parse(requests[0]?.body ?? '{}') as Record<string, unknown>;
    assert.equal(createBody.pix_key, 'pix@example.test');
    assert.equal(createBody.amount, 1234);
    assert.equal(createBody.description, 'Consulta');
    assert.equal(typeof createBody.expires_at, 'string');

    await expect(adapter.getStatus('paid' as PixTransactionId)).resolves.toMatchObject({
      status: 'completed',
      providerTransactionId: 'paid',
      completedAt: '2026-09-16T11:00:00.000Z'
    });
    await expect(adapter.getStatus('cancelled' as PixTransactionId)).resolves.toMatchObject({
      status: 'cancelled'
    });
    await expect(adapter.getStatus('expired' as PixTransactionId)).resolves.toMatchObject({
      status: 'expired'
    });
    await expect(adapter.getStatus('pending' as PixTransactionId)).resolves.toMatchObject({
      status: 'pending'
    });
    await expect(adapter.confirmPayment('local-id' as PixTransactionId, 'paid')).resolves.toMatchObject({
      status: 'completed',
      providerTransactionId: 'paid'
    });
    await expect(adapter.cancelIntent('qr-001' as PixTransactionId)).resolves.toEqual({
      transactionId: 'qr-001',
      cancelled: true
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('PagarMePixAdapter returns actionable provider errors and safe cancellation failures', async () => {
  const originalFetch = globalThis.fetch;
  let mode: 'errors' | 'message' | 'invalid' = 'errors';
  globalThis.fetch = async () => {
    if (mode === 'errors') {
      return Response.json({ errors: [{ code: 'invalid', message: 'invalid amount' }] }, { status: 422 });
    }
    if (mode === 'message') return Response.json({ message: 'provider unavailable' }, { status: 503 });
    return new Response('not-json', { status: 502, statusText: 'Bad Gateway' });
  };

  try {
    const adapter = new PagarMePixAdapter({ apiKey: 'api-key', pixKey: 'pix@example.test' });
    await expect(
      adapter.createIntent({
        billingRecordId: 'bill-error',
        accountId: 'acc-error' as never,
        amount: 1,
        description: 'Erro'
      })
    ).rejects.toThrow('invalid amount');
    mode = 'message';
    await expect(adapter.getStatus('status-error' as PixTransactionId)).rejects.toThrow(
      'provider unavailable'
    );
    mode = 'invalid';
    await expect(adapter.getStatus('status-invalid' as PixTransactionId)).rejects.toThrow(
      'HTTP 502 Bad Gateway'
    );
    await expect(adapter.cancelIntent('cancel-error' as PixTransactionId)).resolves.toMatchObject({
      cancelled: false,
      reason: expect.stringContaining('HTTP 502 Bad Gateway')
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
