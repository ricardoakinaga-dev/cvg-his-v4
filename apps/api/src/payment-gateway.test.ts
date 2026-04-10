import assert from 'node:assert/strict';
import test from 'node:test';

import { LocalPixPaymentGateway } from './payment-gateway.js';

test('LocalPixPaymentGateway creates a deterministic PIX intent shape', async () => {
  const gateway = new LocalPixPaymentGateway();

  const intent = await gateway.createPixIntent({
    accountId: 'acc_cvg_demo',
    billingRecordId: 'bill_42',
    amount: 123.45,
    description: 'Consulta de retorno',
    expirationMinutes: 15
  });

  assert.equal(intent.provider, 'local-pix');
  assert.equal(intent.status, 'pending');
  assert.equal(intent.currency, 'BRL');
  assert.ok(intent.qrCodePayload.includes('bill_42'));
  assert.ok(intent.qrCodeBase64.length > 0);
  assert.ok(intent.expiresAt.length > 0);
});

test('LocalPixPaymentGateway confirmPayment returns completed result', async () => {
  const gateway = new LocalPixPaymentGateway();

  const result = gateway.confirmPayment('pix_intent_abc123');

  assert.equal(result.transactionId, 'pix_intent_abc123');
  assert.equal(result.status, 'completed');
  assert.ok(result.providerTransactionId?.includes('local_confirm_'));
  assert.ok(result.completedAt.length > 0);
});

test('LocalPixPaymentGateway confirmPayment carries billingRecordId from created intent', async () => {
  const gateway = new LocalPixPaymentGateway();

  const intent = await gateway.createPixIntent({
    accountId: 'acc_cvg_demo',
    billingRecordId: 'bill_settled_001',
    amount: 5000,
    description: 'Procedimento',
    expirationMinutes: 30
  });

  const result = gateway.confirmPayment(intent.id);

  assert.equal(result.transactionId, intent.id);
  assert.equal(result.status, 'completed');
  assert.equal(result.billingRecordId, 'bill_settled_001');
  assert.ok(result.completedAt.length > 0);
});
