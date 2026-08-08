import assert from 'node:assert/strict';
import test from 'node:test';

import { InMemoryCardTransactionRepository } from '../card-transaction-repository.js';
import { LocalPixPaymentGateway, type CardPaymentIntentInput } from '../payment-gateway.js';
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

function createHandlers(options: {
  readonly paymentGateway: LocalPixPaymentGateway;
  readonly billingRecord?: Record<string, unknown>;
  readonly captureCalls?: number[];
}) {
  const { paymentGateway, billingRecord, captureCalls } = options;
  const cardGateway = {
    paymentProviders: paymentGateway.paymentProviders,
    createPixIntent: paymentGateway.createPixIntent.bind(paymentGateway),
    createCardIntent: paymentGateway.createCardIntent.bind(paymentGateway),
    findCardIntent: paymentGateway.findCardIntent.bind(paymentGateway),
    captureCardIntent: async (transactionId: string) => {
      captureCalls?.push(1);
      return paymentGateway.captureCardIntent(transactionId);
    },
    confirmPayment: paymentGateway.confirmPayment.bind(paymentGateway)
  };

  return {
    eventBus: {
      async publish() {
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
          keyPrefix: 'cvg_test',
          name: 'test',
          status: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      },
      async updateLastUsed() {}
    },
    audit: { write() {} },
    cardTransactions: new InMemoryCardTransactionRepository(),
    billing: {
      getOrThrow() {
        if (!billingRecord) throw new Error('billing record not configured');
        return billingRecord;
      }
    }
  };
}

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

  await assert.rejects(
    async () => {
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
    },
    /billingRecordId does not belong to the API key account/
  );
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
