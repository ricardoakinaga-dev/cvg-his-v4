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
        code: 'order-code-001', amount:22000, metadata:{account_id:'acc_card_pagarme',billing_record_id:'bill_card_pagarme'},
        created_at: '2026-08-07T23:00:00.000Z',
        charges: [{
          id: 'charge-001',
          code: 'charge-code-001',amount:22000,payment_method:'credit_card',
          status: 'authorized_pending_capture',
          last_transaction: {
            status:'authorized_pending_capture',success:true,transaction_type:'credit_card',amount:22000,
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
        status: 'paid', amount:22000,payment_method:'credit_card',order_id:'order-001',metadata:{account_id:'acc_card_pagarme'},
        updated_at: '2026-08-07T23:05:00.000Z',
        last_transaction: {
          status: 'captured', success:true,
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

test('PagarMe capture requires a consistent terminal charge and rejects replay without contacting provider', async () => {
  const originalFetch = globalThis.fetch;
  const invalidPayloads: unknown[] = [
    ...['pending', 'processing', 'failed', 'captured', 'unknown'].map(status => ({ id: 'ch_test', status })),
    { id: 'ch_test' }, null, {},
    ...[null, [], 'captured'].map(last_transaction => ({ id: 'ch_test', status: 'paid', last_transaction })),
    { id: 'other_charge', status: 'paid' },
    { id: 'ch_test', status: 'paid', last_transaction: { status: 'failed' } },
    { id: 'ch_test', status: 'paid', last_transaction: { status: 'waiting_capture' } },
    { id: 'ch_test', status: 'paid', last_transaction: { status: 'partial_capture' } },
    { id: 'ch_test', status: 'paid', last_transaction: { status: 'captured', success: false } },
    { id: 'ch_test', status: 'paid', amount: 1 },
    { id: 'ch_test', status: 'paid', paid_amount: 1 },
    { id: 'ch_test', status: 'paid', payment_method: 'pix' }
  ];
  try {
    for (const payload of invalidPayloads) {
      const repository = new InMemoryCardTransactionRepository();
      await repository.create({
        transactionId: 'card_test', accountId: 'tenant_a', provider: 'pagarme-card',
        providerChargeId: 'ch_test', amount: 100, currency: 'BRL', description: 'Test',
        installments: 1, status: 'authorized_pending_capture', createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(), billingSettlementStatus: 'awaiting_capture'
      });
      const gateway = new PagarMePaymentGatewayAdapter({ apiKey: 'fake', pixKey: 'fake', cardTransactions: repository });
      globalThis.fetch = async () => Response.json(payload);
      assert.equal((await gateway.captureCardIntent('card_test')).status, 'pending', JSON.stringify(payload));
      const persisted = await repository.findByTransactionId('card_test');
      assert.equal(persisted?.status, 'authorized_pending_capture');
      assert.equal(persisted?.capturedAt, undefined);
      assert.equal(await gateway.findCardIntent('tenant_b', 'card_test'), null);
    }

    const repository = new InMemoryCardTransactionRepository();
    await repository.create({
      transactionId: 'card_test', accountId: 'tenant_a', provider: 'pagarme-card',
      providerChargeId: 'ch_test', amount: 100, currency: 'BRL', description: 'Test',
      installments: 1, status: 'authorized_pending_capture', createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(), billingSettlementStatus: 'awaiting_capture'
    });
    const gateway = new PagarMePaymentGatewayAdapter({ apiKey: 'fake', pixKey: 'fake', cardTransactions: repository });
    globalThis.fetch = async (_input, init) => {
      assert.ok(init?.signal, 'provider request must have a timeout signal');
      throw new DOMException('timed out', 'TimeoutError');
    };
    await assert.rejects(gateway.captureCardIntent('card_test'), { name: 'TimeoutError' });
    assert.equal((await repository.findByTransactionId('card_test'))?.capturedAt, undefined);
    let calls = 0;
    globalThis.fetch = async () => {
      calls++;
      return Response.json({ id: 'ch_test', status: 'paid', amount: 10000, payment_method:'credit_card',metadata:{account_id:'tenant_a'},last_transaction: { status: 'captured', success:true } });
    };
    assert.equal((await gateway.captureCardIntent('card_test')).status, 'captured');
    assert.equal((await gateway.captureCardIntent('card_test')).status, 'failed');
    const recreated = new PagarMePaymentGatewayAdapter({ apiKey: 'fake', pixKey: 'fake', cardTransactions: repository });
    assert.equal((await recreated.captureCardIntent('card_test')).status, 'failed');
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

for(const capture of [false,true]) test(`Core v5 operation_type for capture=${capture}`,async()=>{
 const originalFetch=globalThis.fetch;
 let sent:any;
 globalThis.fetch=async(_url,init)=>{sent=JSON.parse(String(init?.body));return Response.json({id:'or_test',charges:[]});};
 try {
  await new PagarMePaymentGatewayAdapter({apiKey:'fake',pixKey:'fake'}).createCardIntent({accountId:'account',amount:100,description:'Contract',cardHolderName:'Test User',last4:'4242',cardToken:'fake',capture,customer:{name:'Test User',email:'test@example.invalid'}});
  assert.equal(sent.payments[0].credit_card.operation_type,capture?'auth_and_capture':'auth_only');
  assert.equal('capture' in sent.payments[0].credit_card,false);
 } finally {globalThis.fetch=originalFetch;}
});
