import assert from 'node:assert/strict';
import test from 'node:test';

import {
  LocalPixPaymentGateway,
  PagarMePaymentGatewayAdapter
} from './payment-gateway.js';
import { InMemoryCardTransactionRepository } from './card-transaction-repository.js';
import { InMemoryPixTransactionRepository } from './pix-transaction-repository.js';

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

test('LocalPixPaymentGateway confirmPayment rejects an unknown intent', async () => {
  const gateway = new LocalPixPaymentGateway();

  const result = await gateway.confirmPayment('pix_intent_abc123');

  assert.equal(result, null);
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

  const result = await gateway.confirmPayment(intent.id);

  assert.equal(result?.transactionId, intent.id);
  assert.equal(result?.status, 'completed');
  assert.equal(result?.billingRecordId, 'bill_settled_001');
  assert.ok((result?.completedAt?.length ?? 0) > 0);
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

test('LocalPixPaymentGateway exposes card intents only to their owning account', async () => {
  const gateway = new LocalPixPaymentGateway();
  const intent = await gateway.createCardIntent?.({
    accountId: 'acc_card_owner',
    billingRecordId: 'bill_card_owner_42',
    amount: 180,
    description: 'Exame complementar',
    cardHolderName: 'Maria Silva',
    last4: '5454',
    installments: 1
  });

  assert.ok(intent);
  const ownerView = await gateway.findCardIntent('acc_card_owner', intent.id);
  const foreignView = await gateway.findCardIntent('acc_other', intent.id);

  assert.equal(ownerView?.id, intent.id);
  assert.equal(foreignView, null);
});

test('PagarMe PIX intent survives adapter recreation and confirms using the provider transaction id', async () => {
  const pixTransactions = new InMemoryPixTransactionRepository();
  const originalFetch = globalThis.fetch;
  const requests: string[] = [];
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    requests.push(`${init?.method ?? 'GET'} ${url}`);
    if (url.endsWith('/core/v5/pix/qr_codes') && init?.method === 'POST') {
      return Response.json({
        id: 'pagarme-qr-001',
        qr_code: '000201pagarme',
        qr_code_base64: 'cWFk',
        expires_at: '2026-08-08T00:00:00.000Z'
      });
    }
    if (url.endsWith('/core/v5/pix/qr_codes/pagarme-qr-001') && init?.method === 'GET') {
      return Response.json({
        id: 'pagarme-qr-001',
        status: 'paid',
        paid_at: '2026-08-07T23:00:00.000Z'
      });
    }
    return Response.json({ message: 'unexpected request' }, { status: 404 });
  };

  try {
    const firstAdapter = new PagarMePaymentGatewayAdapter({
      apiKey: 'pagarme-key',
      pixKey: 'pix@example.test',
      pixTransactions
    });
    const created = await firstAdapter.createPixIntent({
      accountId: 'acc_pagarme',
      billingRecordId: 'bill_pagarme',
      amount: 99.9,
      description: 'Consulta'
    });

    assert.equal(created.providerTransactionId, 'pagarme-qr-001');
    const persisted = await pixTransactions.findByTransactionId(created.id);
    assert.equal(persisted?.providerTransactionId, 'pagarme-qr-001');

    const recreatedAdapter = new PagarMePaymentGatewayAdapter({
      apiKey: 'pagarme-key',
      pixKey: 'pix@example.test',
      pixTransactions
    });
    const confirmed = await recreatedAdapter.confirmPayment(created.id);

    assert.equal(confirmed?.status, 'completed');
    assert.equal(confirmed?.accountId, 'acc_pagarme');
    assert.equal(confirmed?.billingRecordId, 'bill_pagarme');
    assert.equal(confirmed?.providerTransactionId, 'pagarme-qr-001');
    assert.ok(requests.some((request) => request.endsWith('/pagarme-qr-001')));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('PagarMe card intent survives adapter recreation and captures the durable provider charge', async () => {
  const cardTransactions = new InMemoryCardTransactionRepository();
  const originalFetch = globalThis.fetch;
  const requests: string[] = [];
  globalThis.fetch = async (input, init) => {
    const url = String(input);
    requests.push(`${init?.method ?? 'GET'} ${url}`);
    if (url.endsWith('/core/v5/orders') && init?.method === 'POST') {
      return Response.json({
        id: 'order-001',
        code: 'order-code-001',
        created_at: '2026-08-07T23:00:00.000Z',
        charges: [{
          id: 'charge-001',
          code: 'charge-code-001',
          status: 'authorized_pending_capture',
          last_transaction: {
            brand: 'visa',
            authorization_code: 'AUTH-001',
            acquirer_nsu: 'NSU-001'
          }
        }]
      });
    }
    if (url.endsWith('/core/v5/charges/charge-001/capture') && init?.method === 'POST') {
      return Response.json({
        id: 'charge-001',
        updated_at: '2026-08-07T23:05:00.000Z',
        last_transaction: {
          authorization_code: 'AUTH-CAPTURED',
          acquirer_nsu: 'NSU-CAPTURED'
        }
      });
    }
    return Response.json({ message: 'unexpected request' }, { status: 404 });
  };

  try {
    const firstAdapter = new PagarMePaymentGatewayAdapter({
      apiKey: 'pagarme-key',
      pixKey: 'pix@example.test',
      cardTransactions
    });
    const created = await firstAdapter.createCardIntent({
      accountId: 'acc_card_pagarme',
      billingRecordId: 'bill_card_pagarme',
      amount: 220,
      description: 'Internacao',
      cardHolderName: 'Maria Silva',
      brand: 'visa',
      last4: '4242',
      cardToken: 'card-token',
      customer: { name: 'Maria Silva', email: 'maria@example.test' }
    });

    const recreatedAdapter = new PagarMePaymentGatewayAdapter({
      apiKey: 'pagarme-key',
      pixKey: 'pix@example.test',
      cardTransactions
    });
    const recovered = await recreatedAdapter.findCardIntent('acc_card_pagarme', created.id);
    assert.equal(recovered?.providerChargeId, 'charge-001');

    const captured = await recreatedAdapter.captureCardIntent(created.id);
    assert.equal(captured.status, 'captured');
    assert.equal(captured.providerChargeId, 'charge-001');
    assert.equal(captured.billingRecordId, 'bill_card_pagarme');
    assert.ok(requests.some((request) => request.endsWith('/charges/charge-001/capture')));
    assert.equal((await cardTransactions.findByTransactionId(created.id))?.status, 'captured');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
