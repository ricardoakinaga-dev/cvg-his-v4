import assert from 'node:assert/strict';
import test from 'node:test';
import { PixService } from './pix.service.js';
import { MockPixAdapter } from './adapters/mock.adapter.js';
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
