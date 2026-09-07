import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { Pool } from 'pg';
import { createDatabaseClient, closeDatabaseClient, getDatabaseTransactionScope } from '@cvg-his-v2/shared-database';
import { runWithTenantContext } from '@cvg-his-v2/tenant-context';
import { DatabaseCardTransactionRepository } from '../../../packages/modules/payments/src/card-transaction-repository.js';
import { DatabaseOutboxRepository, EventBusService, type OutboxEvent } from '../../../packages/modules/event-bus/src/index.js';
import { PagarMePaymentGatewayAdapter } from '../../../apps/api/src/payment-gateway.js';
import { handlePaymentsRoutes } from '../../../apps/api/src/routes/payments-routes.js';
import { TEST_DB_URL } from '../../setup/env.js';

const tenantId = randomUUID();
const accountId = randomUUID();
const originalFetch = globalThis.fetch;
const admin = new Pool({ connectionString: TEST_DB_URL });
const asTenant = <T>(operation: () => Promise<T>) => runWithTenantContext({ tenantId, accountId, correlationId: randomUUID() }, operation);
const paid = (id: string) => ({ id, status: 'paid', amount: 10000, payment_method:'credit_card', metadata:{account_id:accountId}, order_id:`order_${id}`, last_transaction: { status: 'captured', success:true, amount:10000 } });

async function fixture() {
  const id = `card_${randomUUID()}`;
  await asTenant(() => new DatabaseCardTransactionRepository().create({
    transactionId: id, accountId, provider: 'pagarme-card', providerChargeId: id, providerOrderId: `order_${id}`,
    amount: 100, currency: 'BRL', description: 'Concurrency test', installments: 1,
    status: 'authorized_pending_capture', createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(), billingSettlementStatus: 'not_applicable'
  }));
  return id;
}

function instance(outbox = new DatabaseOutboxRepository()) {
  const cardTransactions = new DatabaseCardTransactionRepository();
  return {
    cardTransactions,
    paymentGateway: new PagarMePaymentGatewayAdapter({ apiKey: 'local-fake', pixKey: 'local-fake', cardTransactions }),
    eventBus: new EventBusService(outbox),
    audit: { write() {} },
    billing: { getOrThrow(): { accountId: string; status: string } { throw new Error('No billing record in this fixture'); } },
    apiKeys: {
      async validate() { return { id: 'fake', accountId, permissions: ['payments.manage'], rateLimit: 1000, rateLimitWindow: 3600 }; },
      async checkRateLimit() { return { allowed: true }; },
      async updateLastUsed() {}
    }
  };
}

async function invoke(handlers: ReturnType<typeof instance>, id: string) {
  const state = { statusCode: 200, body: '', ended: false };
  const response = {
    get statusCode() { return state.statusCode; },
    set statusCode(value: number) { state.statusCode = value; },
    setHeader() {},
    end(body: string) { state.body = body; state.ended = true; }
  };
  await asTenant(async () => {
    await handlePaymentsRoutes(`/payments/cards/intents/${id}/capture`,
      { method: 'POST', headers: { 'x-api-key': 'fake' } } as never, response as never,
      randomUUID(), handlers as never);
  });
  return state;
}

async function evidence(id: string) {
  const row = await admin.query('SELECT status, captured_at, capture_requested_at FROM card_transactions WHERE account_id = $1 AND transaction_id = $2', [accountId, id]);
  const events = await admin.query("SELECT id FROM outbox_events WHERE account_id = $1 AND event_type = 'payment.card.completed' AND payload->>'intentId' = $2", [accountId, id]);
  return { ...row.rows[0], events: events.rowCount };
}

describe('durable card capture concurrency and recovery', () => {
  beforeAll(async () => {
    createDatabaseClient(TEST_DB_URL);
    await admin.query("INSERT INTO tenants(id,slug,name,status) VALUES($1,$2,'Capture test','active')", [tenantId, `capture-${tenantId}`]);
    await admin.query("INSERT INTO accounts(id,tenant_id,slug,name) VALUES($1,$2,$3,'Capture test')", [accountId, tenantId, `capture-${accountId}`]);
  });
  afterEach(() => { globalThis.fetch = originalFetch; });
  afterAll(async () => { await closeDatabaseClient(); await admin.end(); });

  it('two independent API/repository instances produce one capture and one durable completion', async () => {
    const id = await fixture();
    let entered!: () => void;
    let release!: () => void;
    const atProvider = new Promise<void>(resolve => { entered = resolve; });
    const barrier = new Promise<void>(resolve => { release = resolve; });
    let posts = 0;
    globalThis.fetch = async (_url, init) => {
      expect(init?.method).toBe('POST');
      posts++;
      entered();
      await barrier;
      return Response.json(paid(id));
    };
    const first = instance();
    const second = instance();
    // Prewarm the second adapter to prove that a stale cache cannot authorize replay.
    await asTenant(() => second.paymentGateway.findCardIntent(accountId, id));
    const pending = invoke(first, id);
    await atProvider;
    try {
      const duplicate = await invoke(second, id);
      expect(duplicate.statusCode).toBe(409);
      expect(JSON.parse(duplicate.body).code).toBe('CARD_CAPTURE_IN_PROGRESS');
      const inFlight = await evidence(id);
      expect(inFlight.capture_requested_at).not.toBeNull();
      expect(inFlight.status).toBe('authorized_pending_capture');
      expect(inFlight.events).toBe(0);
    } finally { release(); }
    expect((await pending).statusCode).toBe(200);
    expect((await invoke(second, id)).statusCode).toBe(409);
    expect(posts).toBe(1);
    expect(await evidence(id)).toMatchObject({ status: 'captured', events: 1 });
  });

  it('rolls back status and inserted outbox together, then reconciles after recreation without recapture', async () => {
    const id = await fixture();
    class RollbackOutbox extends DatabaseOutboxRepository {
      override async create(event: OutboxEvent) {
        await super.create(event);
        throw new Error('injected interruption after outbox insert');
      }
    }
    const methods: string[] = [];
    globalThis.fetch = async (_url, init) => { methods.push(init?.method ?? 'GET'); return Response.json(paid(id)); };
    const failedInstance = instance(new RollbackOutbox());
    await expect(invoke(failedInstance, id)).rejects.toThrow('injected interruption');
    expect(await evidence(id)).toMatchObject({ status: 'authorized_pending_capture', captured_at: null, events: 0 });
    expect((await evidence(id)).capture_requested_at).not.toBeNull();
    const recovered = instance();
    expect((await invoke(recovered, id)).statusCode).toBe(200);
    expect(methods).toEqual(['POST', 'GET']);
    expect(await evidence(id)).toMatchObject({ status: 'captured', events: 1 });
    expect((await invoke(instance(), id)).statusCode).toBe(409);
    expect(methods).toHaveLength(2);
  });

  it('timeout and pending reconciliation remain actionable and never resend capture', async () => {
    const id = await fixture();
    const methods: string[] = [];
    globalThis.fetch = async (_url, init) => {
      methods.push(init?.method ?? 'GET');
      if (methods.length === 1) throw new DOMException('provider timeout', 'TimeoutError');
      return Response.json({ id, status: 'pending' });
    };
    for (let attempt = 0; attempt < 2; attempt++) {
      const response = await invoke(instance(), id);
      expect(response.statusCode).toBe(202);
      expect(JSON.parse(response.body).code).toBe('CARD_CAPTURE_RECONCILIATION_REQUIRED');
    }
    expect(methods).toEqual(['POST', 'GET']);
    expect(await evidence(id)).toMatchObject({ status: 'authorized_pending_capture', captured_at: null, events: 0 });
    globalThis.fetch = async (_url, init) => {
      methods.push(init?.method ?? 'GET');
      return Response.json(paid(id));
    };
    expect((await invoke(instance(), id)).statusCode).toBe(200);
    expect(methods).toEqual(['POST', 'GET', 'GET']);
    expect(await evidence(id)).toMatchObject({ status: 'captured', events: 1 });
  });
  it('a lost database session releases its lock while the durable dispatch marker prevents recapture', async () => {
    const id = await fixture();
    const methods: string[] = [];
    globalThis.fetch = async (_url, init) => {
      methods.push(init?.method ?? 'GET');
      if (methods.length === 1) {
        const scope = getDatabaseTransactionScope();
        expect(scope).toBeDefined();
        const backend = await scope!.client.query('SELECT pg_backend_pid() AS pid');
        await admin.query('SELECT pg_terminate_backend($1)', [backend.rows[0].pid]);
      }
      return Response.json(paid(id));
    };
    await expect(invoke(instance(), id)).rejects.toThrow();
    expect(await evidence(id)).toMatchObject({ status: 'authorized_pending_capture', captured_at: null, events: 0 });
    expect((await evidence(id)).capture_requested_at).not.toBeNull();
    expect((await invoke(instance(), id)).statusCode).toBe(200);
    expect(methods).toEqual(['POST', 'GET']);
    expect(await evidence(id)).toMatchObject({ status: 'captured', events: 1 });
  });

  it('a billing preflight failure leaves the durable dispatch marker unconsumed', async () => {
    const id = await fixture();
    const handlers = instance();
    const findIntent = handlers.paymentGateway.findCardIntent.bind(handlers.paymentGateway);
    handlers.paymentGateway.findCardIntent = async (account, transactionId) => {
      const intent = await findIntent(account, transactionId);
      return intent ? { ...intent, billingRecordId: 'preflight-billing-reference' } : null;
    };
    const methods: string[] = [];
    globalThis.fetch = async (_url, init) => {
      methods.push(init?.method ?? 'GET');
      return Response.json(paid(id));
    };
    handlers.billing.getOrThrow = () => { throw new Error('temporary billing lookup failure'); };
    await expect(invoke(handlers, id)).rejects.toThrow('temporary billing lookup failure');
    expect(methods).toEqual([]);
    expect(await evidence(id)).toMatchObject({ status: 'authorized_pending_capture', captured_at: null,
      capture_requested_at: null, events: 0 });
    handlers.billing.getOrThrow = () => ({ accountId, status: 'pending' });
    expect((await invoke(handlers, id)).statusCode).toBe(200);
    expect(methods).toEqual(['POST']);
    expect(await evidence(id)).toMatchObject({ status: 'captured', events: 1 });
    expect((await evidence(id)).capture_requested_at).not.toBeNull();
  });

  it('finalization BEGIN can fail only after provider dispatch, and retry reconciles', async () => {
    const id = await fixture();
    const methods: string[] = [];
    globalThis.fetch = async (_url, init) => {
      methods.push(init?.method ?? 'GET');
      const scope = getDatabaseTransactionScope()!;
      expect(scope.isActive()).toBe(false); // No fallible finalization setup before dispatch.
      if (methods.length === 1) {
        const originalQuery = scope.client.query.bind(scope.client);
        scope.client.query = ((query: string, ...args: unknown[]) => {
          if (query === 'BEGIN') {
            scope.client.query = originalQuery;
            throw new Error('injected finalization BEGIN failure');
          }
          return (originalQuery as any)(query, ...args);
        }) as typeof scope.client.query;
      }
      return Response.json(paid(id));
    };
    await expect(invoke(instance(), id)).rejects.toThrow('injected finalization BEGIN failure');
    expect(methods).toEqual(['POST']);
    expect(await evidence(id)).toMatchObject({ status: 'authorized_pending_capture', captured_at: null, events: 0 });
    expect((await evidence(id)).capture_requested_at).not.toBeNull();
    expect((await invoke(instance(), id)).statusCode).toBe(200);
    expect(methods).toEqual(['POST', 'GET']);
  });

  it('creation capture and its real outbox insert roll back together while preserving a reconciliation anchor', async () => {
    let id = `creation_${randomUUID()}`;
    class InterruptedCreationOutbox extends DatabaseOutboxRepository {
      override async create(event: OutboxEvent) {
        await super.create(event);
        throw new Error('injected creation outbox failure');
      }
    }
    const methods: string[] = [];
    globalThis.fetch = async (url, init) => {
      methods.push(init?.method ?? 'GET');
      if (init?.method === 'POST') id = JSON.parse(String(init.body)).code;
      return Response.json(String(url).endsWith('/orders')
        ? { id: `order_${id}`, code: id, amount:10000, metadata:{account_id:accountId}, charges: [{...paid(id),payment_method:'credit_card',last_transaction:{status:'captured',success:true}}] } : paid(id));
    };
    const request = { method: 'POST', headers: { 'x-api-key': 'fake', 'idempotency-key': randomUUID() }, async *[Symbol.asyncIterator]() {
      yield Buffer.from(JSON.stringify({ amount: 100, description: 'Atomic creation', cardHolderName: 'Test User',
        last4: '4242', cardToken: 'fake', capture: true, customerName: 'Test User', customerEmail: 'test@example.invalid' }));
    } };
    let ended = false;
    const response = { statusCode: 200, setHeader() {}, end() { ended = true; } };
    await asTenant(async () => {
      await handlePaymentsRoutes('/payments/cards/intents', request as never, response as never,
        randomUUID(), instance(new InterruptedCreationOutbox()) as never);
    });
    expect(ended).toBe(true);
    expect(response.statusCode).toBe(202);
    expect(await evidence(id)).toMatchObject({ status: 'pending', captured_at: null, events: 0 });
    expect((await evidence(id)).capture_requested_at).not.toBeNull();
    const inserted = await admin.query("SELECT id FROM outbox_events WHERE account_id=$1 AND payload->>'intentId'=$2", [accountId, id]);
    expect(inserted.rowCount).toBe(0);
    expect((await invoke(instance(), id)).statusCode).toBe(200);
    expect(methods).toEqual(['POST', 'GET']);
    expect(await evidence(id)).toMatchObject({ status: 'captured', events: 1 });
  });

  it('creation finalization excludes concurrent capture and exposes captured only with its committed outbox', async () => {
    let id = `creation_${randomUUID()}`;
    let entered!: () => void;
    let release!: () => void;
    const inserted = new Promise<void>(resolve => { entered = resolve; });
    const barrier = new Promise<void>(resolve => { release = resolve; });
    class HeldCreationOutbox extends DatabaseOutboxRepository {
      override async create(event: OutboxEvent) { await super.create(event); entered(); await barrier; }
    }
    let providerCalls = 0;
    globalThis.fetch = async (_url, init) => { if (init?.method === 'POST') id = JSON.parse(String(init.body)).code; providerCalls++; return Response.json({ id: `order_${id}`, code: id, amount:10000, metadata:{account_id:accountId}, charges: [{...paid(id),payment_method:'credit_card',last_transaction:{status:'captured',success:true}}] }); };
    const request = { method: 'POST', headers: { 'x-api-key': 'fake', 'idempotency-key': randomUUID() }, async *[Symbol.asyncIterator]() {
      yield Buffer.from(JSON.stringify({ amount: 100, description: 'Atomic creation', cardHolderName: 'Test User',
        last4: '4242', cardToken: 'fake', capture: true, customerName: 'Test User', customerEmail: 'test@example.invalid' }));
    } };
    let ended = false;
    const response = { statusCode: 200, setHeader() {}, end() { ended = true; } };
    const creating = asTenant(async () => handlePaymentsRoutes('/payments/cards/intents', request as never,
      response as never, randomUUID(), { ...instance(new HeldCreationOutbox()),
        apiKeys: { ...instance().apiKeys, async recordUsage() {} } } as never));
    await inserted;
    try {
      expect(ended).toBe(false);
      expect((await invoke(instance(), id)).statusCode).toBe(409);
      expect(providerCalls).toBe(1);
      expect(await evidence(id)).toMatchObject({ status: 'pending', captured_at: null });
      const invisible = await admin.query("SELECT id FROM outbox_events WHERE account_id=$1 AND payload->>'intentId'=$2", [accountId, id]);
      expect(invisible.rowCount).toBe(0);
    } finally { release(); }
    await creating;
    expect(response.statusCode).toBe(201);
    expect(ended).toBe(true);
    const visible = await admin.query("SELECT id FROM outbox_events WHERE account_id=$1 AND payload->>'intentId'=$2", [accountId, id]);
    expect(visible.rowCount).toBe(1);
    expect((await evidence(id)).status).toBe('captured');
    expect((await invoke(instance(), id)).statusCode).toBe(409);
    expect(providerCalls).toBe(1);
  });

  it('fences thin and contradictory capture evidence, then reconciles one authoritative charge without another POST', async () => {
    const variants: Array<(value: any) => any> = [
      value => ({id:value.id,status:'paid'}),
      value => { delete value.amount; return value; },
      value => { delete value.payment_method; return value; },
      value => { delete value.metadata; return value; },
      value => { delete value.last_transaction.success; return value; },
      value => ({...value,metadata:{account_id:randomUUID()}}),
      value => ({...value,order:{id:'foreign-order',metadata:{account_id:randomUUID()}}}),
      value => ({...value,order:{id:value.order_id,code:'foreign-code'}}),
      value => ({...value,last_transaction:{...value.last_transaction,amount:1}}),
      value => ({...value,last_transaction:{...value.last_transaction,charge_id:'foreign-charge'}}),
      value => ({...value,last_transaction:{...value.last_transaction,order:{id:'foreign-order'}}}),
      value => ({...value,order:{id:value.order_id,amount:1}}),
      value => ({...value,order:{id:value.order_id,status:'failed'}}),
      value => ({...value,paid_amount:1}),
      value => ({...value,currency:'USD'})
    ];
    for (const mutate of variants) {
      const id = await fixture(); const methods: string[] = [];
      globalThis.fetch = async (_url, init) => { methods.push(init?.method ?? 'GET'); return Response.json(mutate(paid(id))); };
      expect((await invoke(instance(),id)).statusCode).toBe(202);
      expect(await evidence(id)).toMatchObject({status:'authorized_pending_capture',captured_at:null,events:0});
      globalThis.fetch = async (_url, init) => { methods.push(init?.method ?? 'GET'); return Response.json(paid(id)); };
      expect((await invoke(instance(),id)).statusCode).toBe(200);
      expect((await invoke(instance(),id)).statusCode).toBe(409);
      expect(methods).toEqual(['POST','GET']);
      expect(await evidence(id)).toMatchObject({status:'captured',events:1});
    }
  });

});
