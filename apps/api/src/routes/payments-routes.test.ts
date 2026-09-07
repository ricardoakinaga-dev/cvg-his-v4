import assert from 'node:assert/strict';
import test from 'node:test';

import { InMemoryCardTransactionRepository } from '../card-transaction-repository.js';
import { LocalPixPaymentGateway, PagarMePaymentGatewayAdapter, type CardPaymentIntentInput } from '../payment-gateway.js';
import {
  InMemoryPixTransactionRepository,
  type PixTransactionRepository
} from '../pix-transaction-repository.js';
import { handlePaymentsRoutes } from './payments-routes.js';

const ACCOUNT_ID = 'acc_payment_owner';

function createRequest(body?: Record<string, unknown>): object {
  return {
    method: 'POST',
    headers: { 'x-api-key': 'test-api-key' },
    ...(body
      ? {
          async *[Symbol.asyncIterator]() {
            yield Buffer.from(JSON.stringify(body));
          }
        }
      : {})
  };
}

function createResponse(): {
  response: object;
  state: { statusCode: number; body: string };
} {
  const state = { statusCode: 200, body: '' };
  const response = {
    get statusCode() {
      return state.statusCode;
    },
    set statusCode(value: number) {
      state.statusCode = value;
    },
    setHeader() {},
    end(body?: string) {
      state.body = body ?? '';
    }
  };
  return { response, state };
}

function paidCard(id: string, orderId?: string) {
  return {id,status:'paid',amount:10000,payment_method:'credit_card',metadata:{account_id:ACCOUNT_ID},
    ...(orderId ? {order_id:orderId} : {}),last_transaction:{status:'captured',success:true,amount:10000}};
}

function createHandlers(options: {
  readonly paymentGateway: LocalPixPaymentGateway | PagarMePaymentGatewayAdapter;
  readonly billingRecord?: Record<string, unknown>;
  readonly captureCalls?: number[];
  readonly confirmCalls?: number[];
  readonly eventCalls?: number[];
  readonly cardTransactions?: InMemoryCardTransactionRepository;
  readonly pixTransactions?: PixTransactionRepository;
}) {
  const {
    paymentGateway,
    billingRecord,
    captureCalls,
    confirmCalls,
    eventCalls,
    pixTransactions = new InMemoryPixTransactionRepository()
  } = options;
  const cardGateway = {
    paymentProviders: paymentGateway.paymentProviders,
    createPixIntent: paymentGateway.createPixIntent.bind(paymentGateway),
    createCardIntent: paymentGateway.createCardIntent.bind(paymentGateway),
    findCardIntent: paymentGateway.findCardIntent.bind(paymentGateway),
    captureCardIntent: async (transactionId: string, options?: { readonly allowProviderCapture?: boolean; readonly claimProviderCapture?: () => Promise<boolean>; readonly beginFinalization?: () => Promise<void> }) => {
      captureCalls?.push(1);
      return paymentGateway instanceof PagarMePaymentGatewayAdapter
        ? paymentGateway.captureCardIntent(transactionId, options)
        : paymentGateway.captureCardIntent(transactionId, options);
    },
    confirmPayment: async (transactionId: string) => {
      confirmCalls?.push(1);
      return paymentGateway.confirmPayment(transactionId);
    }
  };

  return {
    eventBus: {
      async publish() {
        eventCalls?.push(1);
        return { id: 'evt_payment_test', correlationId: 'corr_payment_test' };
      }
    },
    paymentGateway: cardGateway,
    apiKeys: {
      async validate() {
        return {
          id: 'key_payment_test',
          accountId: ACCOUNT_ID,
          permissions: ['payments.manage'],
          rateLimit: 1000,
          rateLimitWindow: 3600,
          keyPrefix: 'cvg_test',
          name: 'test',
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      },
      async checkRateLimit() {
        return {
          allowed: true,
          remaining: 999,
          resetAt: new Date(Date.now() + 3600 * 1000)
        };
      },
      async updateLastUsed() {},
      async recordUsage() {}
    },
    audit: { write() {} },
    cardTransactions: options.cardTransactions ?? new InMemoryCardTransactionRepository(),
    pixTransactions,
    billing: {
      getOrThrow() {
        if (!billingRecord) throw new Error('billing record not configured');
        return billingRecord;
      }
    }
  };
}

test('legacy PIX confirmation returns 410 for attempt-linked transactions before gateway or event', async () => {
  const gateway = new LocalPixPaymentGateway();
  const intent = await gateway.createPixIntent({
    accountId: ACCOUNT_ID,
    billingRecordId: 'billing_attempt_legacy',
    amount: 100,
    description: 'Consulta'
  });
  const pixTransactions = new InMemoryPixTransactionRepository();
  await pixTransactions.create({
    transactionId: intent.id,
    provider: 'local-pix',
    accountId: ACCOUNT_ID,
    billingRecordId: intent.billingRecordId,
    paymentAttemptId: '00000000-0000-0000-0000-000000000123',
    amount: intent.amount,
    currency: intent.currency,
    description: intent.description,
    qrCodePayload: intent.qrCodePayload,
    qrCodeBase64: intent.qrCodeBase64,
    expiresAt: intent.expiresAt,
    status: 'pending',
    createdAt: intent.createdAt,
    updatedAt: intent.createdAt,
    billingSettlementStatus: 'awaiting_payment',
    cashReconciliationStatus: 'pending'
  });
  const confirmCalls: number[] = [];
  const eventCalls: number[] = [];
  const handlers = createHandlers({
    paymentGateway: gateway,
    pixTransactions,
    confirmCalls,
    eventCalls
  });
  const { response, state } = createResponse();

  await handlePaymentsRoutes(
    `/payments/pix/intents/${intent.id}/confirm`,
    createRequest() as never,
    response as never,
    'corr-legacy-confirm',
    handlers as never
  );

  assert.equal(state.statusCode, 410);
  assert.deepEqual(JSON.parse(state.body), {
    code: 'LEGACY_PIX_CONFIRMATION_DISABLED',
    message: 'PIX confirmation for encounter payment attempts is disabled'
  });
  assert.equal(confirmCalls.length, 0);
  assert.equal(eventCalls.length, 0);
});

test('legacy PIX confirmation hides an attempt-linked transaction from another account', async () => {
  const gateway = new LocalPixPaymentGateway();
  const foreignIntent = await gateway.createPixIntent({
    accountId: 'acc_other',
    billingRecordId: 'billing_foreign_legacy',
    amount: 100,
    description: 'Consulta'
  });
  const pixTransactions = new InMemoryPixTransactionRepository();
  await pixTransactions.create({
    transactionId: foreignIntent.id,
    provider: 'local-pix',
    accountId: 'acc_other',
    billingRecordId: foreignIntent.billingRecordId,
    paymentAttemptId: '00000000-0000-0000-0000-000000000124',
    amount: foreignIntent.amount,
    currency: foreignIntent.currency,
    description: foreignIntent.description,
    qrCodePayload: foreignIntent.qrCodePayload,
    qrCodeBase64: foreignIntent.qrCodeBase64,
    expiresAt: foreignIntent.expiresAt,
    status: 'pending',
    createdAt: foreignIntent.createdAt,
    updatedAt: foreignIntent.createdAt,
    billingSettlementStatus: 'awaiting_payment',
    cashReconciliationStatus: 'pending'
  });
  const confirmCalls: number[] = [];
  const eventCalls: number[] = [];
  const handlers = createHandlers({
    paymentGateway: gateway,
    pixTransactions,
    confirmCalls,
    eventCalls
  });
  const { response, state } = createResponse();

  await handlePaymentsRoutes(
    `/payments/pix/intents/${foreignIntent.id}/confirm`,
    createRequest() as never,
    response as never,
    'corr-legacy-confirm-foreign',
    handlers as never
  );

  assert.equal(state.statusCode, 404);
  assert.deepEqual(JSON.parse(state.body), { code: 'NOT_FOUND', message: 'Intent not found' });
  assert.equal(confirmCalls.length, 0);
  assert.equal(eventCalls.length, 0);
});

test('card intent creation rejects a billing record owned by another account before calling provider', async () => {
  const gateway = new LocalPixPaymentGateway();
  let providerCalls = 0;
  const handlers = createHandlers({
    paymentGateway: gateway,
    billingRecord: {
      id: 'bill_foreign',
      accountId: 'acc_other',
      currency: 'BRL',
      subtotalAmount: 100,
      status: 'estimated'
    }
  });
  const originalCreateCardIntent = handlers.paymentGateway.createCardIntent;
  handlers.paymentGateway.createCardIntent = async (input: CardPaymentIntentInput) => {
    providerCalls += 1;
    return originalCreateCardIntent(input);
  };

  await assert.rejects(async () => {
    await handlePaymentsRoutes(
      '/payments/cards/intents',
      createRequest({
        billingRecordId: 'bill_foreign',
        amount: 100,
        description: 'Consulta',
        cardHolderName: 'Maria Silva',
        last4: '4242',
        customerName: 'Maria Silva',
        customerEmail: 'maria@example.com'
      }) as never,
      createResponse().response as never,
      'corr-card-foreign',
      handlers as never
    );
  }, /billingRecordId does not belong to the API key account/);
  assert.equal(providerCalls, 0);
});

test('card capture hides a foreign intent and never calls the provider', async () => {
  const gateway = new LocalPixPaymentGateway();
  const foreignIntent = await gateway.createCardIntent({
    accountId: 'acc_other',
    amount: 100,
    description: 'Consulta',
    cardHolderName: 'Maria Silva',
    last4: '4242'
  });
  const captureCalls: number[] = [];
  const handlers = createHandlers({ paymentGateway: gateway, captureCalls });
  const { response, state } = createResponse();

  await handlePaymentsRoutes(
    `/payments/cards/intents/${foreignIntent.id}/capture`,
    createRequest() as never,
    response as never,
    'corr-card-capture-foreign',
    handlers as never
  );

  assert.equal(state.statusCode, 404);
  assert.equal(captureCalls.length, 0);
  assert.deepEqual(JSON.parse(state.body), {
    code: 'NOT_FOUND',
    message: 'Intent not found'
  });
});

test('card capture route emits completion only for a consistent paid charge, with tenant and replay protection', async () => {
  const originalFetch = globalThis.fetch;
  try {
    const payloads: unknown[] = [
      ...['pending', 'failed', 'unknown'].map(status => ({ id: 'ch_route', status })),
      { id: 'ch_route' }, null,
      { id: 'ch_route', status: 'paid', last_transaction: { status: 'failed' } },
      { id: 'foreign_charge', status: 'paid' },
      { id: 'ch_route', status: 'paid', paid_amount: 1 },
      { id: 'ch_route', status: 'paid', last_transaction: { status: 'captured' } },
      { id: 'ch_route', status: 'paid' },
      paidCard('ch_route','or_route'),
      'timeout'
    ];
    for (const payload of payloads) {
      let providerCalls = 0;
      globalThis.fetch = async (input) => {
        if (String(input).endsWith('/orders')) {
          return Response.json({ id: 'or_route', charges: [{ id: 'ch_route', code: 'card_route', status: 'pending' }] });
        }
        providerCalls++;
        if (payload === 'timeout') throw new DOMException('timed out', 'TimeoutError');
        return Response.json(payload);
      };
      const gateway = new PagarMePaymentGatewayAdapter({ apiKey: 'fake', pixKey: 'fake' });
      await gateway.createCardIntent({
        accountId: ACCOUNT_ID, amount: 100, description: 'Test', cardHolderName: 'Test', last4: '4242',
        cardToken: 'fake', customer: { name: 'Test', email: 'test@example.invalid' }
      });
      const handlers = createHandlers({ paymentGateway: gateway });
      const events: string[] = [];
      handlers.eventBus.publish = async (...args: unknown[]) => {
        events.push((args[0] as { eventType: string }).eventType);
        return { id: 'event', correlationId: 'correlation' };
      };
      const invoke = async () => {
        const { response, state } = createResponse();
        await handlePaymentsRoutes('/payments/cards/intents/card_route/capture', createRequest() as never,
          response as never,
          'corr-card-regression', handlers as never);
        return state;
      };
      const ownerValidate = handlers.apiKeys.validate;
      handlers.apiKeys.validate = async () => ({ ...await ownerValidate(), accountId: 'foreign_tenant' });
      assert.equal((await invoke()).statusCode, 404);
      assert.equal(providerCalls, 0);
      assert.equal(events.length, 0);
      handlers.apiKeys.validate = ownerValidate;
      const valid = typeof payload === 'object' && payload !== null && (payload as any).last_transaction?.success === true;
      if (payload === 'timeout') {
        const result = await invoke();
        assert.equal(result.statusCode, 202);
        assert.equal(JSON.parse(result.body).code, 'CARD_CAPTURE_RECONCILIATION_REQUIRED');
      }
      else {
        const result = await invoke();
        assert.equal(JSON.parse(result.body).status === 'captured', valid, JSON.stringify(payload));
      }
      assert.equal(events.filter(type => type === 'payment.card.completed').length, valid ? 1 : 0);
      if (valid) {
        assert.equal((await invoke()).statusCode, 409);
        assert.equal(providerCalls, 1);
        assert.equal(events.filter(type => type === 'payment.card.completed').length, 1);
      }
    }
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('concurrent card capture routes serialize provider dispatch and outbox publication', async () => {
  const originalFetch = globalThis.fetch;
  const cardTransactions = new InMemoryCardTransactionRepository();
  let entered!: () => void;
  let release!: () => void;
  const atProvider = new Promise<void>(resolve => { entered = resolve; });
  const barrier = new Promise<void>(resolve => { release = resolve; });
  let posts = 0;
  globalThis.fetch = async (_input, init) => {
    if (String(_input).endsWith('/orders')) return Response.json({ charges: [{ id: 'ch_parallel', code: 'parallel', status: 'pending' }] });
    assert.equal(init?.method, 'POST');
    posts++;
    entered();
    await barrier;
    return Response.json(paidCard('ch_parallel'));
  };
  try {
    const gateway = new PagarMePaymentGatewayAdapter({ apiKey: 'fake', pixKey: 'fake', cardTransactions });
    await gateway.createCardIntent({ accountId: ACCOUNT_ID, amount: 100, description: 'Test',
      cardHolderName: 'Test', last4: '4242', cardToken: 'fake', customer: { name: 'Test', email: 'test@example.invalid' } });
    const eventCalls: number[] = [];
    const handlers = createHandlers({ paymentGateway: gateway, cardTransactions, eventCalls });
    const invoke = async () => {
      const { response, state } = createResponse();
      await handlePaymentsRoutes('/payments/cards/intents/parallel/capture', createRequest() as never,
        response as never, 'parallel-capture', handlers as never);
      return state;
    };
    const first = invoke();
    await atProvider;
    try {
      const second = await invoke();
      assert.equal(second.statusCode, 409);
      assert.equal(JSON.parse(second.body).code, 'CARD_CAPTURE_IN_PROGRESS');
      assert.equal(eventCalls.length, 0);
    } finally { release(); }
    assert.equal((await first).statusCode, 200);
    assert.equal((await invoke()).statusCode, 409);
    assert.equal(posts, 1);
    assert.equal(eventCalls.length, 1);
  } finally { release(); globalThis.fetch = originalFetch; }
});

test('public card creation never confirms contradictory paid charges or an order without a charge', async () => {
  const originalFetch = globalThis.fetch;
  const invalid = [
    { id: 'ch_create', status: 'paid', amount: 1, last_transaction: { status: 'failed', success: false } },
    { id: 'ch_create', status: 'paid', amount: 10000, last_transaction: { status: 'failed' } },
    { id: 'ch_create', status: 'paid', amount: 1 },
    { id: 'ch_create', status: 'paid', paid_amount: 1 },
    { id: 'ch_create', status: 'paid', payment_method: 'pix' },
    { id: 'ch_create', status: 'paid', last_transaction: null },
    { id: 'ch_create', status: 'pending' },
    { id: 'ch_create', status: 'failed' },
    { id: 'ch_create' },
    { id: 'ch_create', status: 'unknown' },
    { status: 'paid' },
    undefined
  ];
  try {
    for (const [index, charge] of [...invalid, { id: 'ch_create', status: 'paid', amount: 10000, payment_method: 'credit_card', last_transaction: { status: 'captured', success: true } }].entries()) {
      const repository = new InMemoryCardTransactionRepository();
      const gateway = new PagarMePaymentGatewayAdapter({ apiKey: 'fake', pixKey: 'fake', cardTransactions: repository });
      const handlers = createHandlers({ paymentGateway: gateway, cardTransactions: repository });
      const events: string[] = [];
      handlers.eventBus.publish = async (...args: unknown[]) => {
        events.push((args[0] as { eventType: string }).eventType);
        return { id: 'event', correlationId: 'correlation' };
      };
      globalThis.fetch = async (_url, init) => Response.json({ id: 'order', code: JSON.parse(String(init?.body)).code, status: 'paid', amount: 10000, metadata: { account_id: ACCOUNT_ID }, charges: charge ? [charge] : [] });
      const { response, state } = createResponse();
      await handlePaymentsRoutes('/payments/cards/intents', createRequest({ amount: 100, description: 'Test',
        cardHolderName: 'Test', last4: '4242', cardToken: 'fake', capture: true,
        customerName: 'Test', customerEmail: 'test@example.invalid' }) as never,
        response as never, 'create-regression', handlers as never);
      assert.ok([201,202].includes(state.statusCode));
      const valid = index === invalid.length;
      assert.equal(JSON.parse(state.body).status === 'captured', valid, JSON.stringify(charge));
      const record = await repository.findByTransactionId(JSON.parse(state.body).id);
      assert.equal(record?.status === 'captured', valid);
      assert.equal(!!record?.capturedAt, valid);
      assert.equal(events.includes('payment.card.completed'), false);
    }
  } finally { globalThis.fetch = originalFetch; }
});

test('a public capture preflight error does not consume dispatch eligibility', async () => {
  const originalFetch = globalThis.fetch;
  const repository = new InMemoryCardTransactionRepository();
  await repository.create({ transactionId: 'preflight', accountId: ACCOUNT_ID, provider: 'pagarme-card',
    providerChargeId: 'ch_preflight', billingRecordId: 'bill', amount: 100, currency: 'BRL', description: 'Test',
    installments: 1, status: 'authorized_pending_capture', createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(), billingSettlementStatus: 'awaiting_capture' });
  const gateway = new PagarMePaymentGatewayAdapter({ apiKey: 'fake', pixKey: 'fake', cardTransactions: repository });
  const handlers = createHandlers({ paymentGateway: gateway, cardTransactions: repository,
    billingRecord: { accountId: ACCOUNT_ID, status: 'pending' } });
  const getBilling = handlers.billing.getOrThrow;
  const methods: string[] = [];
  globalThis.fetch = async (_url, init) => { methods.push(init?.method ?? 'GET'); return Response.json(paidCard('ch_preflight')); };
  const invoke = async () => {
    const { response, state } = createResponse();
    await handlePaymentsRoutes('/payments/cards/intents/preflight/capture', createRequest() as never,
      response as never, 'preflight', handlers as never);
    return state;
  };
  try {
    handlers.billing.getOrThrow = () => { throw new Error('temporary billing lookup failure'); };
    await assert.rejects(invoke(), /temporary billing lookup failure/);
    assert.deepEqual(methods, []);
    handlers.billing.getOrThrow = getBilling;
    assert.equal((await invoke()).statusCode, 200);
    assert.deepEqual(methods, ['POST']);
  } finally { globalThis.fetch = originalFetch; }
});

test('creation publish failure leaves a pending provider anchor that can reconcile without recapture', async () => {
  const originalFetch = globalThis.fetch;
  const repository = new InMemoryCardTransactionRepository();
  const gateway = new PagarMePaymentGatewayAdapter({ apiKey: 'fake', pixKey: 'fake', cardTransactions: repository });
  const handlers = createHandlers({ paymentGateway: gateway, cardTransactions: repository });
  const methods: string[] = [];
  globalThis.fetch = async (url, init) => {
    methods.push(init?.method ?? 'GET');
    return Response.json(String(url).endsWith('/orders')
      ? { id: 'order', code: JSON.parse(String(init?.body)).code, amount: 10000, metadata: { account_id: ACCOUNT_ID }, charges: [{ id: 'ch_create_rollback', status: 'paid', amount: 10000, payment_method: 'credit_card', last_transaction: {status:'captured',success:true} }] }
      : paidCard('ch_create_rollback','order'));
  };
  const publish = handlers.eventBus.publish;
  handlers.eventBus.publish = async () => { throw new Error('outbox insertion failed'); };
  try {
    const { response, state } = createResponse();
    await handlePaymentsRoutes('/payments/cards/intents', createRequest({
      amount: 100, description: 'Test', cardHolderName: 'Test', last4: '4242', cardToken: 'fake',
      capture: true, customerName: 'Test', customerEmail: 'test@example.invalid'
    }) as never, response as never, 'creation-rollback', handlers as never);
    assert.equal(state.statusCode, 202);
    assert.equal(JSON.parse(state.body).code, 'CARD_INTENT_RECONCILIATION_REQUIRED');
    assert.ok(JSON.parse(state.body).creationId);
    const pending = await repository.findByTransactionId(JSON.parse(state.body).transactionId);
    assert.equal(pending?.status, 'pending');
    assert.equal(pending?.capturedAt, undefined);
    assert.equal(pending?.providerChargeId, 'ch_create_rollback');
    assert.ok(pending?.captureRequestedAt);
    handlers.eventBus.publish = publish;
    const recovery = createResponse();
    await handlePaymentsRoutes(`/payments/cards/intents/${JSON.parse(state.body).transactionId}/capture`, createRequest() as never,
      recovery.response as never, 'creation-recovery', handlers as never);
    assert.equal(recovery.state.statusCode, 200);
    assert.deepEqual(methods, ['POST', 'GET']);
  } finally { globalThis.fetch = originalFetch; }
});

test('creation replay reuses durable identity for one billing reference', async () => {
 const repository = new InMemoryCardTransactionRepository();
 const gateway = new PagarMePaymentGatewayAdapter({ apiKey: 'fake', pixKey: 'fake', cardTransactions: repository });
 const events: number[] = [];
 const originalFetch = globalThis.fetch;
 const handlers = createHandlers({ paymentGateway: gateway, cardTransactions: repository, eventCalls: events,
   billingRecord: {accountId: ACCOUNT_ID, currency: 'BRL', subtotalAmount: 100, status: 'pending'} });
 let posts = 0;
 globalThis.fetch = async (_url, init) => { posts++; return Response.json({id: `order_${posts}`, code: JSON.parse(String(init?.body)).code, amount:10000, metadata:{account_id:ACCOUNT_ID,billing_record_id:'bill_replayed'}, charges: [{id: `charge_${posts}`, status:'paid', amount:10000,payment_method:'credit_card',last_transaction:{status:'captured',success:true}}]}); };
 let intentId: string;
 try { for(let i=0;i<2;i++) {
   const {response,state}=createResponse();
   await handlePaymentsRoutes('/payments/cards/intents',createRequest({billingRecordId:'bill_replayed',amount:100,description:'Test',cardHolderName:'Test',last4:'4242',cardToken:'fake',capture:true,customerName:'Test',customerEmail:'test@example.invalid'}) as never,response as never,'critic',handlers as never);
   assert.equal(state.statusCode,201);
   intentId = JSON.parse(state.body).id;
 }
 assert.equal(posts,1); assert.equal(events.length,1);
 const record=await repository.findByTransactionId(intentId!);
 assert.equal(record?.providerChargeId,'charge_1');
 } finally { globalThis.fetch = originalFetch; }
});
