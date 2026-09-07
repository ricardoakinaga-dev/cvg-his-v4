import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { Pool } from 'pg';
import { createDatabaseClient, closeDatabaseClient } from '@cvg-his-v2/shared-database';
import { runWithTenantContext } from '@cvg-his-v2/tenant-context';
import { DatabaseCardTransactionRepository } from '../../packages/modules/payments/src/card-transaction-repository.js';
import { DatabaseOutboxRepository, EventBusService } from '../../packages/modules/event-bus/src/index.js';
import { PagarMePaymentGatewayAdapter } from '../../apps/api/src/payment-gateway.js';
import { handlePaymentsRoutes } from '../../apps/api/src/routes/payments-routes.js';
import { TEST_DB_URL } from '../setup/env.js';

const tenantId = randomUUID();
const accountId = randomUUID();
const originalFetch = globalThis.fetch;
const admin = new Pool({ connectionString: TEST_DB_URL });
const asTenant = <T>(operation: () => Promise<T>) => runWithTenantContext({ tenantId, accountId, correlationId: randomUUID() }, operation);

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
      async updateLastUsed() {}, async recordUsage() {}
    }
  };
}

const body = { amount: 100, description: 'Creation test', cardHolderName: 'Test User', last4: '4242',
  capture: true, cardToken: 'never-store-this-token', customerName: 'Test User', customerEmail: 'test@example.invalid' };
async function create(handlers = instance(), key = randomUUID(), patch = {}) {
  const state = { statusCode: 200, body: '' };
  const request = { method: 'POST', headers: { 'x-api-key': 'fake', 'idempotency-key': key },
    async *[Symbol.asyncIterator]() { yield Buffer.from(JSON.stringify({ ...body, ...patch })); } };
  await asTenant(() => handlePaymentsRoutes('/payments/cards/intents', request as never,
    { get statusCode() { return state.statusCode; }, set statusCode(value) { state.statusCode = value; },
      setHeader() {}, end(value: string) { state.body = value; } } as never, randomUUID(), handlers as never) as Promise<boolean>);
  return { status: state.statusCode, data: JSON.parse(state.body) };
}
const order = (code: string, status = 'paid') => ({ id: 'or_' + code, code, amount: 10000,
  metadata: { account_id: accountId }, charges: [{ id: 'ch_' + code, status, amount: 10000, payment_method: 'credit_card',
    last_transaction: { status: status === 'paid' ? 'captured' : status, success: status === 'paid' } }] });
async function billingFixture() {
  const user = randomUUID(), owner = randomUUID(), patient = randomUUID(), encounter = randomUUID(), id = randomUUID();
  await admin.query("INSERT INTO users(id,account_id,username,email,password_hash,full_name) VALUES($1,$2,$3,$4,'fake','Test operator')",[user,accountId,'card_'+user,user+'@example.invalid']);
  await admin.query("INSERT INTO owners(id,account_id,full_name) VALUES($1,$2,'Test owner')",[owner,accountId]);
  await admin.query("INSERT INTO patients(id,account_id,owner_id,name,species) VALUES($1,$2,$3,'Test patient','canine')",[patient,accountId,owner]);
  await admin.query("INSERT INTO encounters(id,account_id,patient_id,owner_id,status,opened_by_user_id) VALUES($1,$2,$3,$4,'open',$5)",[encounter,accountId,patient,owner,user]);
  await admin.query("INSERT INTO billing_records(id,account_id,encounter_id,patient_id,owner_id,status,subtotal_amount,currency) VALUES($1,$2,$3,$4,$5,'open',100,'BRL')",[id,accountId,encounter,patient,owner]);
  const handlers = instance();
  handlers.billing.getOrThrow = () => ({accountId,status:'open',currency:'BRL',subtotalAmount:100});
  return {id,handlers};
}
async function rows() {
  const result = await admin.query("SELECT id FROM outbox_events WHERE account_id=$1 AND event_type='payment.card.intent.created'", [accountId]);
  return result.rowCount;
}
describe('durable card creation fencing and recovery', () => {
  beforeAll(async () => {
    createDatabaseClient(TEST_DB_URL);
    await admin.query("INSERT INTO tenants(id,slug,name,status) VALUES($1,$2,'Creation test','active')", [tenantId, `creation-${tenantId}`]);
    await admin.query("INSERT INTO accounts(id,tenant_id,slug,name) VALUES($1,$2,$3,'Creation test')", [accountId, tenantId, `creation-${accountId}`]);
  });
  afterEach(() => { globalThis.fetch = originalFetch; });
  afterAll(async () => { await closeDatabaseClient(); await admin.end(); });
  it('serializes concurrent independent instances and replays the same durable response', async () => {
    let enter!: () => void, release!: () => void;
    const entered = new Promise<void>(resolve => enter = resolve);
    const barrier = new Promise<void>(resolve => release = resolve);
    let posts = 0;
    globalThis.fetch = async (_url, init) => {
      if (init?.method !== 'POST') return Response.json({ data: [] });
      posts++; enter(); await barrier;
      const payload = JSON.parse(String(init.body));
      expect((init.headers as Record<string,string>)['Idempotency-key']).toBe(payload.code);
      return Response.json(order(payload.code));
    };
    const before = await rows(); const key = randomUUID();
    const first = create(instance(), key); await entered;
    try { expect((await create(instance(), key)).status).toBe(202); } finally { release(); }
    const completed = await first;
    expect(completed.status).toBe(201);
    expect(await create(instance(), key)).toEqual(completed);
    expect(posts).toBe(1); expect(await rows()).toBe(before! + 1);
    const persisted = await admin.query('SELECT status FROM card_transactions WHERE account_id=$1 AND transaction_id=$2', [accountId, completed.data.id]);
    expect(persisted.rows[0].status).toBe('captured');
    const journal = await admin.query('SELECT * FROM card_creation_attempts WHERE account_id=$1 AND id=$2', [accountId, completed.data.id]);
    expect(JSON.stringify(journal.rows)).not.toContain(body.cardToken);
    expect((await create(instance(), key, { amount: 101 })).status).toBe(409);
    expect(posts).toBe(1);
  });
  it('retains a reservation and reconciles by code after provider success with lost response', async () => {
    let providerOrder: ReturnType<typeof order>; let posts = 0; let gets = 0;
    globalThis.fetch = async (url, init) => {
      if (init?.method === 'POST') { posts++; providerOrder = order(JSON.parse(String(init.body)).code); throw new Error('response lost'); }
      gets++; expect(String(url)).toContain('code=' + providerOrder.code);
      return Response.json({ data: [providerOrder] });
    };
    const key = randomUUID(); const before = await rows();
    expect((await create(instance(), key)).status).toBe(202);
    const recovered = await create(instance(), key);
    expect(recovered.status).toBe(201); expect(recovered.data.status).toBe('captured');
    expect(await create(instance(), key)).toEqual(recovered);
    expect(posts).toBe(1); expect(gets).toBe(1); expect(await rows()).toBe(before! + 1);
  });
  it('recovers anchor insertion and atomic outbox failures without another provider POST', async () => {
    for (const failure of ['anchor', 'outbox']) {
      let posts = 0;
      globalThis.fetch = async (_url, init) => { posts++; return Response.json(order(JSON.parse(String(init?.body)).code)); };
      const handlers = instance();
      if (failure === 'anchor') handlers.cardTransactions.create = async () => { throw new Error('anchor unavailable'); };
      else handlers.eventBus.publish = async () => { throw new Error('outbox unavailable'); };
      const key = randomUUID(), before = await rows();
      const pending = await create(handlers, key); expect(pending.status).toBe(202);
      expect(await rows()).toBe(before);
      const anchor = await admin.query('SELECT * FROM card_transactions WHERE account_id=$1 AND transaction_id=$2', [accountId,pending.data.creationId]);
      if (failure === 'anchor') expect(anchor.rows).toHaveLength(0);
      else expect(anchor.rows[0].status).toBe('pending');
      const recovered = await create(instance(), key);
      expect(recovered.status).toBe(201); expect(recovered.data.status).toBe('captured');
      expect(await create(instance(), key)).toEqual(recovered);
      expect(posts).toBe(1); expect(await rows()).toBe(before! + 1);
    }
  });
  it('never dispatches before reservation commit and rejects foreign reconciliation metadata', async () => {
    let posts = 0; let code = '';
    globalThis.fetch = async (_url, init) => {
      if (init?.method === 'POST') { posts++; code = JSON.parse(String(init.body)).code; throw new Error('lost'); }
      return Response.json({ data: [{ ...order(code), metadata: { account_id: randomUUID() } }] });
    };
    const broken = instance(); broken.cardTransactions.reserveCreation = async () => { throw new Error('database unavailable'); };
    await expect(create(broken)).rejects.toThrow('database unavailable'); expect(posts).toBe(0);
    const key = randomUUID(); expect((await create(instance(),key)).status).toBe(202);
    expect((await create(instance(),key)).status).toBe(202); expect(posts).toBe(1);
  });
  it('recovers a failed provider-result journal write through GET and fences empty/duplicate order lookup', async () => {
    let providerOrder: ReturnType<typeof order>; let posts = 0; let resultMode = 'empty';
    globalThis.fetch = async (_url, init) => {
      if (init?.method === 'POST') { posts++; providerOrder = order(JSON.parse(String(init.body)).code); return Response.json(providerOrder); }
      return Response.json({ data: resultMode === 'empty' ? [] : resultMode === 'duplicate' ? [providerOrder,providerOrder] : [providerOrder] });
    };
    const handlers = instance(); handlers.cardTransactions.saveCreationResult = async () => { throw new Error('journal write failed'); };
    const key = randomUUID(); expect((await create(handlers,key)).status).toBe(202);
    expect((await create(instance(),key)).status).toBe(202);
    resultMode = 'duplicate'; expect((await create(instance(),key)).status).toBe(202);
    resultMode = 'unique'; expect((await create(instance(),key)).status).toBe(201);
    expect(posts).toBe(1);
  });
  it('isolates reservation lookup and result updates from another account context', async () => {
    const repository = new DatabaseCardTransactionRepository();
    const first = await asTenant(() => repository.reserveCreation(accountId,randomUUID(),'a'.repeat(64)));
    await runWithTenantContext({ tenantId, accountId: randomUUID(), correlationId: randomUUID() }, async () => {
      await expect(repository.findCreation(accountId,first.attempt.id)).rejects.toThrow('tenant mismatch');
      await expect(repository.saveCreationResult(accountId,first.attempt.id,{status:'captured'})).rejects.toThrow('tenant mismatch');
      await expect(repository.completeCreation(accountId,first.attempt.id,{})).rejects.toThrow('tenant mismatch');
    });
  });
  it('allows a distinct attempt after decline but fences unresolved billing attempts and fingerprint changes', async () => {
    await asTenant(async () => {
      const repository = new DatabaseCardTransactionRepository(); const billing = randomUUID();
      const first = await repository.reserveCreation(accountId,randomUUID(),'a'.repeat(64),billing);
      await expect(repository.reserveCreation(accountId,randomUUID(),'b'.repeat(64),billing)).rejects.toThrow('CARD_CREATION_BILLING_CONFLICT');
      await repository.saveCreationResult(accountId,first.attempt.id,{status:'not_authorized'});
      const next = await repository.reserveCreation(accountId,randomUUID(),'b'.repeat(64),billing);
      expect(next.fresh).toBe(true); expect(next.attempt.id).not.toBe(first.attempt.id);
    });
  });  it('requires every piece of capture evidence and never writes a terminal row or event when missing', async () => {
    const mutations = [
      (value: any) => { delete value.amount; },
      (value: any) => { delete value.metadata; },
      (value: any) => { delete value.code; },
      (value: any) => { delete value.charges[0].amount; },
      (value: any) => { delete value.charges[0].payment_method; },
      (value: any) => { delete value.charges[0].last_transaction; },
      (value: any) => { delete value.charges[0].last_transaction.success; },
      (value: any) => { value.charges[0].last_transaction.success = false; }
    ];
    const before = await rows();
    for (const mutate of mutations) {
      globalThis.fetch = async (_url, init) => { const value = order(JSON.parse(String(init?.body)).code); mutate(value); return Response.json(value); };
      const result = await create(); expect(result.status).toBe(202); expect(result.data.status).toBe('pending');
      const persisted = await admin.query('SELECT status FROM card_transactions WHERE account_id=$1 AND transaction_id=$2', [accountId,result.data.creationId]);
      expect(persisted.rows).toHaveLength(0);
    }
    expect(await rows()).toBe(before);
  });
  it('upgrades legacy cached pending responses once and rolls back refreshed terminal status with its completion outbox', async () => {
    let code = '', posts = 0, gets = 0;
    globalThis.fetch = async (_url, init) => {
      if (init?.method === 'POST') { posts++; code = JSON.parse(String(init.body)).code; return Response.json(order(code,'pending')); }
      gets++; return Response.json({data:[order(code)]});
    };
    const key = randomUUID(); const first = await create(instance(),key); expect(first.status).toBe(202);
    const legacy = { id: code, status:'pending', eventId:randomUUID(), eventCorrelationId:randomUUID() };
    await asTenant(() => new DatabaseCardTransactionRepository().completeCreation(accountId,code,legacy));
    const handlers = instance(); const publish = handlers.eventBus.publish.bind(handlers.eventBus);
    handlers.eventBus.publish = async (input) => { await publish(input); throw new Error('completion outbox interrupted'); };
    expect((await create(handlers,key)).status).toBe(202);
    const pending = await admin.query('SELECT status FROM card_transactions WHERE account_id=$1 AND transaction_id=$2',[accountId,code]);
    expect(pending.rows[0].status).toBe('pending');
    const journal = await admin.query('SELECT response FROM card_creation_attempts WHERE account_id=$1 AND id=$2',[accountId,code]);
    expect(journal.rows[0].response).toEqual(legacy);
    const [a,b] = await Promise.all([create(instance(),key),create(instance(),key)]);
    expect(a.data.status).toBe('captured'); expect(b.data.status).toBe('captured');
    expect(await create(instance(),key)).toEqual(a);
    const events = await admin.query("SELECT event_type FROM outbox_events WHERE account_id=$1 AND payload->>'intentId'=$2",[accountId,code]);
    expect(events.rows).toEqual([{event_type:'payment.card.completed'}]);
    expect(posts).toBe(1); expect(gets).toBe(1);
  });
  it('does not duplicate a completion already committed through legacy capture recovery', async () => {
    let code = '';
    globalThis.fetch = async (_url, init) => {
      if (init?.method === 'POST') { code = JSON.parse(String(init.body)).code; return Response.json(order(code,'pending')); }
      return Response.json({data:[order(code)]});
    };
    const key = randomUUID(); expect((await create(instance(),key)).status).toBe(202);
    await asTenant(async () => {
      const repository = new DatabaseCardTransactionRepository();
      await repository.completeCreation(accountId,code,{id:code,status:'pending',eventId:'legacy-created'});
      await repository.withCreationTransaction(accountId,code,async () => {
        await repository.create({ transactionId:code,accountId,provider:'pagarme-card',amount:100,currency:'BRL',
          description:'Creation test',installments:1,status:'captured',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString(),
          providerOrderId:'or_'+code,providerChargeId:'ch_'+code,billingSettlementStatus:'applied' });
        await instance().eventBus.publish({eventType:'payment.card.completed',moduleName:'billing',correlationId:randomUUID(),
          payload:{accountId,intentId:code}} as never);
      });
    });
    expect((await create(instance(),key)).data.status).toBe('captured');
    const events = await admin.query("SELECT event_type FROM outbox_events WHERE account_id=$1 AND payload->>'intentId'=$2",[accountId,code]);
    expect(events.rows).toEqual([{event_type:'payment.card.completed'}]);
    const row = await admin.query('SELECT billing_settlement_status FROM card_transactions WHERE account_id=$1 AND transaction_id=$2',[accountId,code]);
    expect(row.rows[0].billing_settlement_status).toBe('applied');
  });
  it('rejects captured without exact amount method and account evidence', async () => {
    globalThis.fetch = async () => Response.json({ id: 'or_thin', charges: [{ id: 'ch_thin', status: 'paid' }] });
    const result = await create();
    const persisted = await admin.query('SELECT status FROM card_transactions WHERE account_id=$1 AND transaction_id=$2', [accountId,result.data.id]);
    console.log('CRITIC thin paid:', JSON.stringify({result,persisted:persisted.rows}));
    expect(result.data.status).not.toBe('captured');
  });
  it('pending creation replay reconciles GET after provider becomes paid', async () => {
    let code = ''; let posts = 0; let gets = 0;
    globalThis.fetch = async (_url, init) => {
      if (init?.method === 'POST') { posts++; code=JSON.parse(String(init.body)).code; return Response.json(order(code,'pending')); }
      gets++; return Response.json({data:[order(code)]});
    };
    const key=randomUUID(); const first=await create(instance(),key); const second=await create(instance(),key);
    console.log('pending replay:', JSON.stringify({first,second,posts,gets}));
    expect(first.status).toBe(202);
    expect(gets).toBe(1); expect(second.data.status).toBe('captured'); expect(posts).toBe(1);
  });

  it('rejects contradictory nested charge authority despite a matching outer creation order', async () => {
    const variants: Array<(value: any) => void> = [
      value => { value.charges[0].order = {id:'foreign-order',code:'foreign-code',metadata:{account_id:randomUUID()}}; },
      value => { value.charges[0].metadata = {account_id:randomUUID()}; },
      value => { value.charges[0].order_id = 'foreign-order'; },
      value => { value.charges[0].order = {id:value.id,code:'foreign-code'}; },
      value => { value.charges[0].order = {id:value.id,amount:1}; },
      value => { value.charges[0].last_transaction.amount = 1; },
      value => { value.charges[0].last_transaction.charge_id = 'foreign-charge'; },
      value => { value.charges[0].last_transaction.metadata = {account_id:randomUUID()}; },
      value => { value.charges[0].last_transaction.order = {id:'foreign-order'}; },
      value => { value.charges[0].last_transaction.charge = {id:value.charges[0].id,order:{id:'foreign-order'}}; }
    ];
    const before = await rows();
    for (const mutate of variants) {
      let code = ''; const methods: string[] = [];
      globalThis.fetch = async (_url, init) => { methods.push(init?.method ?? 'GET'); code = JSON.parse(String(init?.body)).code; const value = order(code); mutate(value); return Response.json(value); };
      const key = randomUUID(); const rejected = await create(instance(),key); expect(rejected.status).toBe(202);
      const persisted = await admin.query('SELECT status FROM card_transactions WHERE account_id=$1 AND transaction_id=$2',[accountId,code]);
      expect(persisted.rows).toHaveLength(0);
      globalThis.fetch = async (_url, init) => { methods.push(init?.method ?? 'GET'); return Response.json({data:[order(code)]}); };
      expect((await create(instance(),key)).data.status).toBe('captured');
      expect(methods).toEqual(['POST','GET']);
    }
    expect(await rows()).toBe(before! + variants.length);
  });

  it('contradictory or thin declines retain the real billing reservation and cannot dispatch a second attempt', async () => {
    const variants: Array<(value: any) => void> = [
      value => { value.charges[0].captured_amount = 10000; },
      value => { value.charges[0].last_transaction.captured_amount = 1; },
      value => { value.charges[0].last_transaction.success = true; },
      value => { delete value.charges[0].last_transaction.success; },
      value => { delete value.charges[0].amount; },
      value => { value.charges[0].metadata = {account_id:randomUUID()}; },
      value => { value.charges[0].last_transaction.status = 'captured'; },
      value => { value.charges[0].paid_amount = 1; },
      value => { value.charges[0].order = {id:value.id,last_transaction:{status:'failed',success:false,transaction_type:'pix'}}; }
    ];
    for (const mutate of variants) {
      const billing = await billingFixture(); let posts = 0;
      globalThis.fetch = async (_url, init) => {
        posts++; const value:any = order(JSON.parse(String(init?.body)).code,'failed');
        value.metadata.billing_record_id = billing.id; mutate(value); return Response.json(value);
      };
      const first = await create(billing.handlers,randomUUID(),{billingRecordId:billing.id});
      expect(first.status).toBe(202);
      expect((await create(billing.handlers,randomUUID(),{billingRecordId:billing.id,cardToken:'intentional-second-card'})).status).toBe(409);
      expect(posts).toBe(1);
      const journal = await admin.query("SELECT provider_result->>'status' AS status FROM card_creation_attempts WHERE account_id=$1 AND billing_record_id=$2",[accountId,billing.id]);
      expect(journal.rows).toEqual([{status:'pending'}]);
      const rows = await admin.query('SELECT status FROM card_transactions WHERE account_id=$1 AND billing_record_id=$2',[accountId,billing.id]);
      expect(rows.rows).toHaveLength(0);
    }
  });
  it('authoritative decline allows an intentional new card attempt and persists both events against a real billing row', async () => {
    for (const decline of ['failed','not_authorized']) {
    const billing = await billingFixture(); let posts = 0;
    globalThis.fetch = async (_url, init) => {
      posts++; const value:any = order(JSON.parse(String(init?.body)).code,posts === 1 ? 'failed' : 'paid');
      value.metadata.billing_record_id = billing.id;
      if (posts === 1) value.charges[0].last_transaction.status = decline;
      value.charges[0].paid_amount = posts === 1 ? 0 : 10000;
      value.charges[0].captured_amount = posts === 1 ? 0 : 10000;
      value.charges[0].last_transaction.transaction_type = 'credit_card';
      return Response.json(value);
    };
    const key = randomUUID(); const first = await create(billing.handlers,key,{billingRecordId:billing.id});
    expect(first.status).toBe(201); expect(first.data.status).toBe(decline);
    expect(await create(billing.handlers,key,{billingRecordId:billing.id})).toEqual(first);
    const second = await create(billing.handlers,randomUUID(),{billingRecordId:billing.id,cardToken:'intentional-second-card'});
    expect(second.status).toBe(201); expect(second.data.status).toBe('captured'); expect(posts).toBe(2);
    const rows = await admin.query('SELECT status FROM card_transactions WHERE account_id=$1 AND billing_record_id=$2 ORDER BY created_at',[accountId,billing.id]);
    expect(rows.rows.map(row => row.status)).toEqual([decline,'captured']);
    const events = await admin.query("SELECT id FROM outbox_events WHERE account_id=$1 AND payload->>'billingRecordId'=$2",[accountId,billing.id]);
    expect(events.rows).toHaveLength(2);
    }
  });
  it('auth_only request preserves realistic authorized evidence without captured state and blocks a second billing dispatch', async () => {
    const billing = await billingFixture(); let posts = 0;
    globalThis.fetch = async (_url, init) => {
      posts++; const request = JSON.parse(String(init?.body));
      expect(request.payments[0].credit_card.operation_type).toBe('auth_only');
      expect(request.payments[0].credit_card).not.toHaveProperty('capture');
      const value:any = order(request.code,'pending'); value.status = 'pending';
      value.metadata.billing_record_id = billing.id;
      value.charges[0].last_transaction = {status:'authorized_pending_capture',success:true,transaction_type:'credit_card',amount:10000};
      return Response.json(value);
    };
    const first = await create(billing.handlers,randomUUID(),{billingRecordId:billing.id,capture:false});
    expect(first.status).toBe(201); expect(first.data.status).toBe('authorized_pending_capture');
    expect((await create(billing.handlers,randomUUID(),{billingRecordId:billing.id,capture:false})).status).toBe(409);
    expect(posts).toBe(1);
  });

});
