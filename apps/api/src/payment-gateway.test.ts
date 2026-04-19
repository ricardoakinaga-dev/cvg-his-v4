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

test('LocalPixPaymentGateway creates a local card intent for safe provider-less rollout', async () => {
  const gateway = new LocalPixPaymentGateway();

  const intent = await gateway.createCardIntent?.({
    accountId: 'acc_cvg_demo',
    billingRecordId: 'bill_card_42',
    amount: 220.5,
    description: 'Internacao',
    cardHolderName: 'Maria Silva',
    brand: 'visa',
    last4: '4242',
    installments: 3
  });

  assert.ok(intent);
  assert.equal(intent?.provider, 'local-card');
  assert.equal(intent?.status, 'authorized_pending_capture');
  assert.equal(intent?.installments, 3);
  assert.equal(intent?.card.last4, '4242');
  assert.equal(intent?.card.brand, 'visa');
  assert.ok(intent?.providerChargeId);
});

test('LocalPixPaymentGateway captures a previously authorized card intent', async () => {
  const gateway = new LocalPixPaymentGateway();
  const intent = await gateway.createCardIntent?.({
    accountId: 'acc_cvg_demo',
    billingRecordId: 'bill_card_capture_42',
    amount: 180,
    description: 'Exame complementar',
    cardHolderName: 'Maria Silva',
    brand: 'mastercard',
    last4: '5454',
    installments: 1,
    capture: false
  });

  assert.ok(intent);
  const result = await gateway.captureCardIntent?.(intent!.id);
  assert.ok(result);
  assert.equal(result?.status, 'captured');
  assert.equal(result?.provider, 'local-card');
  assert.equal(result?.billingRecordId, 'bill_card_capture_42');
});
