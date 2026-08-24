import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { reconcileRuntimeRoles } from '../../../packages/db/src/reconcile-runtime-roles.js';
import {
  DatabaseCardTransactionRepository,
  DatabasePixTransactionRepository
} from '../../../packages/modules/payments/src/index.js';
import {
  DatabaseWebhookRepository,
  WebhooksService
} from '../../../packages/modules/webhooks/src/index.js';
import { getDatabaseClient } from '../../../packages/shared/database/src/index.js';
import { runWithTenantContext } from '../../../packages/tenant-context/src/index.js';
import { createLogger } from '../../../packages/shared/logging/src/index.js';
import {
  bootstrapWorkerServices,
  shutdownWorkerServices
} from '../../../apps/worker/src/bootstrap.js';
import { createWorkerEventBus, runEventBusTick } from '../../../apps/worker/src/runner.js';

import { ADMIN_DB_URL, TEST_DB_URL } from '../../setup/env.js';

const ROOT = new URL('../../../', import.meta.url).pathname.replace(/\/$/, '');
const suffix = randomUUID().replaceAll('-', '').slice(0, 16);
const scratchDatabase = `cvg_worker_events_${process.pid}_${suffix}`;
const apiRole = `cvg_worker_events_api_${suffix}`;
const workerRole = `cvg_worker_events_worker_${suffix}`;
const runtimePassword = `worker_events_${suffix}_password`;
const tenantA = randomUUID();
const tenantB = randomUUID();
const accountA = randomUUID();
const accountB = randomUUID();
const sharedCardIntentId = randomUUID();
const workerUrl = databaseUrl(scratchDatabase, workerRole, runtimePassword);
const scratchUrl = databaseUrl(scratchDatabase);

function databaseUrl(databaseName: string, role?: string, password?: string): string {
  const url = new URL(TEST_DB_URL);
  url.pathname = `/${databaseName}`;
  if (role) url.username = role;
  if (password) url.password = password;
  return url.toString();
}

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replaceAll('"', '""')}"`;
}

async function createLoginRole(pool: Pool, role: string): Promise<void> {
  const result = await pool.query<{ readonly sql: string }>(
    `SELECT format(
       'CREATE ROLE %I LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS PASSWORD %L',
       $1::text,
       $2::text
     ) AS sql`,
    [role, runtimePassword]
  );
  const sql = result.rows[0]?.sql;
  if (!sql) throw new Error(`failed to create role ${role}`);
  await pool.query(sql);
}

interface Fixture {
  readonly accountId: string;
  readonly actorUserId: string;
  readonly ownerId: string;
  readonly patientId: string;
  readonly encounterId: string;
  readonly billingRecordId: string;
  readonly financialAccountId: string;
  readonly receivableId: string;
  readonly cardIntentId: string;
  readonly patientEventId: string;
  readonly billingEventId: string;
  readonly webhookId: string;
}

async function seedAccount(
  pool: Pool,
  accountId: string,
  tenantId: string,
  label: string,
  cardIntentId = randomUUID()
): Promise<Fixture> {
  const actorUserId = randomUUID();
  const ownerId = randomUUID();
  const patientId = randomUUID();
  const encounterId = randomUUID();
  const billingRecordId = `worker-event-billing-${randomUUID()}`;
  const financialAccountId = randomUUID();
  const receivableId = randomUUID();
  const cardIntentEventId = randomUUID();
  const patientEventId = randomUUID();
  const billingEventId = randomUUID();
  const webhookId = `worker-event-webhook-${randomUUID()}`;
  const now = new Date();
  const suffixValue = accountId.replaceAll('-', '');

  await pool.query(
    `INSERT INTO tenants (id, slug, name, status, activated_at)
     VALUES ($1, $2, $3, 'active', now())`,
    [tenantId, `worker-events-tenant-${suffixValue}`, `${label} tenant`]
  );
  await pool.query(
    `INSERT INTO accounts (id, tenant_id, slug, name, is_active)
     VALUES ($1, $2, $3, $4, true)`,
    [accountId, tenantId, `worker-events-account-${suffixValue}`, `${label} account`]
  );
  await pool.query(
    `INSERT INTO users (id, account_id, username, email, password_hash, full_name)
     VALUES ($1, $2, $3, $4, 'test-hash', $5)`,
    [
      actorUserId,
      accountId,
      `worker_events_${suffixValue}`,
      `worker-events-${suffixValue}@example.test`,
      `${label} worker event operator`
    ]
  );
  await pool.query(`INSERT INTO owners (id, account_id, full_name) VALUES ($1, $2, $3)`, [
    ownerId,
    accountId,
    `${label} owner`
  ]);
  await pool.query(
    `INSERT INTO patients (id, account_id, owner_id, name, species)
     VALUES ($1, $2, $3, $4, 'canine')`,
    [patientId, accountId, ownerId, `${label} patient`]
  );
  await pool.query(
    `INSERT INTO encounters (id, account_id, patient_id, owner_id, status, opened_by_user_id)
     VALUES ($1, $2, $3, $4, 'closed', $5)`,
    [encounterId, accountId, patientId, ownerId, actorUserId]
  );
  await pool.query(
    `INSERT INTO billing_records (
       id, account_id, encounter_id, patient_id, owner_id, status, subtotal_amount, currency
     ) VALUES ($1, $2, $3, $4, $5, 'open', 125.00, 'BRL')`,
    [billingRecordId, accountId, encounterId, patientId, ownerId]
  );
  await pool.query(
    `INSERT INTO billing_items (
       id, account_id, billing_record_id, encounter_id, item_type, description,
       quantity, unit_price_amount, total_amount, created_by_user_id
     ) VALUES ($1, $2, $3, $4, 'service', $5, 1, 125.00, 125.00, $6)`,
    [randomUUID(), accountId, billingRecordId, encounterId, `${label} payment`, actorUserId]
  );
  await pool.query(
    `INSERT INTO encounter_financial_accounts (
       id, account_id, encounter_id, financial_status, subtotal_snapshot,
       total_snapshot, paid_amount, balance_due, snapshot_json
     ) VALUES ($1, $2, $3, 'pending', 125.00, 125.00, 0, 125.00, '{}')`,
    [financialAccountId, accountId, encounterId]
  );
  await pool.query(
    `INSERT INTO encounter_receivables (
       id, account_id, encounter_id, financial_account_id, installment_number,
       installment_label, status, amount_original, amount_paid, amount_outstanding
     ) VALUES ($1, $2, $3, $4, 1, 'Parcela 1/1', 'open', 125.00, 0, 125.00)`,
    [receivableId, accountId, encounterId, financialAccountId]
  );
  await pool.query(
    `INSERT INTO webhooks (id, account_id, url, events, secret, is_active, created_at, updated_at)
     VALUES ($1, $2, 'https://example.test/webhook', '["patient.created"]'::jsonb,
             'test-secret', true, $3, $3)`,
    [webhookId, accountId, now]
  );

  const correlationId = randomUUID();
  await insertOutboxEvent(pool, {
    id: cardIntentEventId,
    accountId,
    correlationId,
    eventType: 'payment.card.intent.created',
    payload: {
      accountId,
      intentId: cardIntentId,
      billingRecordId,
      amount: 125,
      currency: 'BRL',
      provider: 'local-card',
      status: 'authorized_pending_capture',
      createdAt: now.toISOString(),
      installments: 1,
      card: { holderName: `${label} holder`, brand: 'visa', last4: '4242' }
    }
  });
  await insertOutboxEvent(pool, {
    id: billingEventId,
    accountId,
    correlationId: randomUUID(),
    eventType: 'billing.record.created',
    payload: { accountId, id: billingRecordId }
  });
  await insertOutboxEvent(pool, {
    id: patientEventId,
    accountId,
    correlationId: randomUUID(),
    eventType: 'patient.created',
    payload: { accountId, patientId, name: `${label} patient` }
  });

  return Object.freeze({
    accountId,
    actorUserId,
    ownerId,
    patientId,
    encounterId,
    billingRecordId,
    financialAccountId,
    receivableId,
    cardIntentId,
    patientEventId,
    billingEventId,
    webhookId
  });
}

async function insertOutboxEvent(
  pool: Pool,
  input: {
    readonly id: string;
    readonly accountId: string;
    readonly correlationId: string;
    readonly eventType: string;
    readonly payload: Record<string, unknown>;
  }
): Promise<void> {
  await pool.query(
    `INSERT INTO outbox_events (
       id, account_id, correlation_id, module_name, event_type, payload,
       status, attempts, max_attempts, scheduled_at, created_at
     ) VALUES ($1, $2, $3, 'worker-events-test', $4, $5::jsonb, 'pending', 0, 1, now(), now())`,
    [
      input.id,
      input.accountId,
      input.correlationId,
      input.eventType,
      JSON.stringify({
        ...input.payload,
        accountId: input.accountId,
        _meta: { accountId: input.accountId }
      })
    ]
  );
}

async function insertWebhookDelivery(
  pool: Pool,
  input: {
    readonly accountId: string;
    readonly webhookId: string;
    readonly id: string;
    readonly maxAttempts?: number;
  }
): Promise<void> {
  await pool.query(
    `INSERT INTO webhook_deliveries (
       id, account_id, webhook_id, event, payload, status, attempts, max_attempts, created_at
     ) VALUES ($1, $2, $3, 'patient.created', $4::jsonb, 'pending', 0, $5, now())`,
    [
      input.id,
      input.accountId,
      input.webhookId,
      JSON.stringify({ id: input.id, accountId: input.accountId, event: 'patient.created' }),
      input.maxAttempts ?? 2
    ]
  );
}

describe('worker event consumers with PostgreSQL and RLS', () => {
  const clusterAdmin = new Pool({ connectionString: ADMIN_DB_URL, max: 2 });
  const scratchAdmin = new Pool({ connectionString: scratchUrl, max: 8 });
  const logger = createLogger('worker-event-consumers-test');
  const workerProbe = new Pool({ connectionString: workerUrl, max: 1 });
  let accountAFixture: Fixture;
  let accountBFixture: Fixture;
  let workerEventBus: ReturnType<typeof createWorkerEventBus>;
  let workerEventBusPeer: ReturnType<typeof createWorkerEventBus>;
  let bootstrap: Awaited<ReturnType<typeof bootstrapWorkerServices>>;
  const previousWorkerAccounts = process.env.WORKER_ACCOUNT_IDS;

  beforeAll(async () => {
    await clusterAdmin.query(`CREATE DATABASE ${quoteIdentifier(scratchDatabase)}`);
    execFileSync('pnpm', ['exec', 'tsx', 'packages/db/src/migrate.ts'], {
      cwd: ROOT,
      env: { ...process.env, DATABASE_URL: scratchUrl },
      stdio: 'pipe'
    });
    await createLoginRole(clusterAdmin, apiRole);
    await createLoginRole(clusterAdmin, workerRole);
    await clusterAdmin.query(
      `GRANT CONNECT ON DATABASE ${quoteIdentifier(scratchDatabase)} TO ${quoteIdentifier(apiRole)}, ${quoteIdentifier(workerRole)}`
    );
    accountAFixture = await seedAccount(scratchAdmin, accountA, tenantA, 'A', sharedCardIntentId);
    accountBFixture = await seedAccount(scratchAdmin, accountB, tenantB, 'B', sharedCardIntentId);
    const client = await scratchAdmin.connect();
    try {
      await reconcileRuntimeRoles(client, { apiRole, workerRole });
    } finally {
      client.release();
    }

    const runtimeRole = await workerProbe.query<{
      readonly current_user: string;
      readonly rolsuper: boolean;
      readonly rolbypassrls: boolean;
    }>(
      `SELECT current_user, rol.rolsuper, rol.rolbypassrls
         FROM pg_roles AS rol
        WHERE rol.rolname = current_user`
    );
    expect(runtimeRole.rows).toEqual([
      { current_user: workerRole, rolsuper: false, rolbypassrls: false }
    ]);

    process.env.WORKER_ACCOUNT_IDS = `${accountA},${accountB}`;
    bootstrap = await bootstrapWorkerServices({ databaseUrl: workerUrl, environment: 'staging' });
    expect(bootstrap.eventConsumers).toBeDefined();
    workerEventBus = createWorkerEventBus({
      eventBusRepository: bootstrap.outboxRepository,
      unitOfWork: bootstrap.unitOfWork,
      workerId: `worker-events-${suffix}`
    });
    bootstrap.eventConsumers?.register(workerEventBus);
    workerEventBusPeer = createWorkerEventBus({
      eventBusRepository: bootstrap.outboxRepository,
      unitOfWork: bootstrap.unitOfWork,
      workerId: `worker-events-${suffix}-peer`
    });
    bootstrap.eventConsumers?.register(workerEventBusPeer);
    expect(workerEventBus.consumerNames).toEqual(['payments', 'billing', 'webhooks']);
    expect(workerEventBusPeer.consumerNames).toEqual(['payments', 'billing', 'webhooks']);
    expect(workerEventBus.deliveryGuaranteesDurable).toBe(true);

    for (const fixture of [accountAFixture, accountBFixture]) {
      await runWithTenantContext(
        { tenantId: fixture.accountId, accountId: fixture.accountId, correlationId: randomUUID() },
        () => bootstrap.eventConsumers?.hydrateAccount(fixture.accountId as never)
      );
    }
  }, 120_000);

  const processForAccount = (
    fixture: Fixture,
    eventBus: ReturnType<typeof createWorkerEventBus> = workerEventBus
  ) =>
    runWithTenantContext(
      { tenantId: fixture.accountId, accountId: fixture.accountId, correlationId: randomUUID() },
      () =>
        runEventBusTick(
          logger,
          {
            service: 'worker-event-consumers-test',
            environment: 'staging',
            correlationId: randomUUID(),
            persistenceMode: 'database',
            databaseHealthy: true,
            databaseDetail: 'scratch PostgreSQL',
            accountId: fixture.accountId as never
          },
          eventBus
        )
    );

  afterAll(async () => {
    if (previousWorkerAccounts === undefined) delete process.env.WORKER_ACCOUNT_IDS;
    else process.env.WORKER_ACCOUNT_IDS = previousWorkerAccounts;
    await shutdownWorkerServices().catch(() => undefined);
    await workerProbe.end().catch(() => undefined);
    await scratchAdmin
      .query(
        `REASSIGN OWNED BY ${quoteIdentifier(apiRole)}, ${quoteIdentifier(workerRole)} TO postgres`
      )
      .catch(() => undefined);
    await scratchAdmin
      .query(`DROP OWNED BY ${quoteIdentifier(apiRole)}, ${quoteIdentifier(workerRole)}`)
      .catch(() => undefined);
    await scratchAdmin
      .query(
        `REVOKE cvg_installer FROM ${quoteIdentifier(apiRole)}, ${quoteIdentifier(workerRole)}`
      )
      .catch(() => undefined);
    await scratchAdmin.end();
    await clusterAdmin.query(
      'SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1',
      [scratchDatabase]
    );
    await clusterAdmin.query(`DROP DATABASE IF EXISTS ${quoteIdentifier(scratchDatabase)}`);
    await clusterAdmin.query(`DROP ROLE IF EXISTS ${quoteIdentifier(apiRole)}`);
    await clusterAdmin.query(`DROP ROLE IF EXISTS ${quoteIdentifier(workerRole)}`);
    await clusterAdmin.end();
  }, 120_000);

  it('processes payment, billing and webhook effects durably and keeps replay tenant-scoped', async () => {
    await processForAccount(accountAFixture);
    const cardIntent = await scratchAdmin.query(
      `SELECT status, billing_settlement_status
         FROM card_transactions
        WHERE account_id = $1 AND transaction_id = $2`,
      [accountA, accountAFixture.cardIntentId]
    );
    const billing = await scratchAdmin.query(
      `SELECT status FROM billing_records WHERE account_id = $1 AND id = $2`,
      [accountA, accountAFixture.billingRecordId]
    );
    const webhookDeliveries = await scratchAdmin.query(
      `SELECT status, attempts, payload ->> 'event' AS event
         FROM webhook_deliveries
        WHERE account_id = $1 AND webhook_id = $2`,
      [accountA, accountAFixture.webhookId]
    );
    const inbox = await scratchAdmin.query(
      `SELECT consumer_name, COUNT(*)::int AS count
         FROM inbox_events
        WHERE account_id = $1
        GROUP BY consumer_name
        ORDER BY consumer_name`,
      [accountA]
    );
    const outbox = await scratchAdmin.query(
      `SELECT event_type, status FROM outbox_events WHERE account_id = $1 ORDER BY created_at, id`,
      [accountA]
    );

    expect(cardIntent.rows).toEqual([
      { status: 'authorized_pending_capture', billing_settlement_status: 'awaiting_capture' }
    ]);
    expect(billing.rows).toEqual([{ status: 'open' }]);
    expect(webhookDeliveries.rows).toEqual([
      { status: 'pending', attempts: 0, event: 'patient.created' }
    ]);
    expect(inbox.rows).toEqual([
      { consumer_name: 'billing', count: 3 },
      { consumer_name: 'payments', count: 3 },
      { consumer_name: 'webhooks', count: 3 }
    ]);
    expect(outbox.rows.every((row) => row.status === 'completed')).toBe(true);

    const untouchedBOutbox = await scratchAdmin.query(
      `SELECT status FROM outbox_events WHERE account_id = $1 ORDER BY created_at, id`,
      [accountB]
    );
    const untouchedBInbox = await scratchAdmin.query(
      `SELECT COUNT(*)::int AS count FROM inbox_events WHERE account_id = $1`,
      [accountB]
    );
    const untouchedBCard = await scratchAdmin.query(
      `SELECT COUNT(*)::int AS count FROM card_transactions WHERE account_id = $1`,
      [accountB]
    );
    expect(untouchedBOutbox.rows).toHaveLength(3);
    expect(untouchedBOutbox.rows.every((row) => row.status === 'pending')).toBe(true);
    expect(untouchedBInbox.rows).toEqual([{ count: 0 }]);
    expect(untouchedBCard.rows).toEqual([{ count: 0 }]);

    const completedEventId = randomUUID();
    await insertOutboxEvent(scratchAdmin, {
      id: completedEventId,
      accountId: accountA,
      correlationId: randomUUID(),
      eventType: 'payment.card.completed',
      payload: {
        accountId: accountA,
        intentId: accountAFixture.cardIntentId,
        billingRecordId: accountAFixture.billingRecordId,
        provider: 'local-card',
        capturedAt: new Date().toISOString()
      }
    });
    await processForAccount(accountAFixture);

    const settledCard = await scratchAdmin.query(
      `SELECT status, billing_settlement_status FROM card_transactions WHERE account_id = $1 AND transaction_id = $2`,
      [accountA, accountAFixture.cardIntentId]
    );
    const settledBilling = await scratchAdmin.query(
      `SELECT status FROM billing_records WHERE account_id = $1 AND id = $2`,
      [accountA, accountAFixture.billingRecordId]
    );
    const settledFinancial = await scratchAdmin.query(
      `SELECT financial_status, paid_amount, balance_due
         FROM encounter_financial_accounts
        WHERE account_id = $1 AND id = $2`,
      [accountA, accountAFixture.financialAccountId]
    );
    const settledReceivable = await scratchAdmin.query(
      `SELECT status, amount_paid, amount_outstanding
         FROM encounter_receivables
        WHERE account_id = $1 AND id = $2`,
      [accountA, accountAFixture.receivableId]
    );
    const payments = await scratchAdmin.query(
      `SELECT COUNT(*)::int AS count, MAX(external_reference_type) AS external_reference_type
         FROM encounter_receivable_payments
        WHERE account_id = $1 AND external_reference_id = $2`,
      [accountA, accountAFixture.cardIntentId]
    );
    expect(settledCard.rows).toEqual([
      { status: 'captured', billing_settlement_status: 'applied' }
    ]);
    expect(settledBilling.rows).toEqual([{ status: 'settled' }]);
    expect(settledFinancial.rows).toEqual([
      { financial_status: 'paid', paid_amount: '125.00', balance_due: '0.00' }
    ]);
    expect(settledReceivable.rows).toEqual([
      { status: 'settled', amount_paid: '125.00', amount_outstanding: '0.00' }
    ]);
    expect(payments.rows).toEqual([{ count: 1, external_reference_type: 'other' }]);

    await scratchAdmin.query(
      `UPDATE outbox_events
          SET status = 'pending', attempts = 0, processed_at = NULL, scheduled_at = now(), error = NULL
        WHERE id = $1 AND account_id = $2`,
      [accountAFixture.patientEventId, accountA]
    );
    const deliveriesBeforeReplay = await scratchAdmin.query(
      `SELECT COUNT(*)::int AS count FROM webhook_deliveries WHERE account_id = $1 AND webhook_id = $2`,
      [accountA, accountAFixture.webhookId]
    );
    await Promise.all([
      processForAccount(accountAFixture, workerEventBus),
      processForAccount(accountAFixture, workerEventBusPeer)
    ]);
    const deliveriesAfterReplay = await scratchAdmin.query(
      `SELECT COUNT(*)::int AS count FROM webhook_deliveries WHERE account_id = $1 AND webhook_id = $2`,
      [accountA, accountAFixture.webhookId]
    );
    const replayInbox = await scratchAdmin.query(
      `SELECT COUNT(*)::int AS count FROM inbox_events WHERE account_id = $1 AND event_id = $2`,
      [accountA, accountAFixture.patientEventId]
    );
    const replayOutbox = await scratchAdmin.query(
      `SELECT status, attempts FROM outbox_events WHERE account_id = $1 AND id = $2`,
      [accountA, accountAFixture.patientEventId]
    );
    const replayPayments = await scratchAdmin.query(
      `SELECT COUNT(*)::int AS count
         FROM encounter_receivable_payments
        WHERE account_id = $1 AND external_reference_id = $2`,
      [accountA, accountAFixture.cardIntentId]
    );
    expect(deliveriesBeforeReplay.rows).toEqual([{ count: 1 }]);
    expect(deliveriesAfterReplay.rows).toEqual([{ count: 1 }]);
    expect(replayInbox.rows).toEqual([{ count: 3 }]);
    expect(replayOutbox.rows).toEqual([{ status: 'completed', attempts: 1 }]);
    expect(replayPayments.rows).toEqual([{ count: 1 }]);

    const cardRepository = new DatabaseCardTransactionRepository();
    const pixRepository = new DatabasePixTransactionRepository();
    await expect(
      runWithTenantContext(
        { tenantId: accountB, accountId: accountB, correlationId: randomUUID() },
        () => cardRepository.findByTransactionId(accountAFixture.cardIntentId)
      )
    ).resolves.toBeNull();
    await expect(
      runWithTenantContext(
        { tenantId: accountB, accountId: accountB, correlationId: randomUUID() },
        () => pixRepository.findByTransactionId(accountAFixture.cardIntentId)
      )
    ).resolves.toBeNull();
    const foreignOutbox = await runWithTenantContext(
      { tenantId: accountB, accountId: accountB, correlationId: randomUUID() },
      () => workerEventBus.getEvent(accountAFixture.patientEventId)
    );
    expect(foreignOutbox).toBeNull();
  });

  it('claims webhook deliveries once across workers and keeps retry state durable', async () => {
    expect(bootstrap.webhookDeliveryExecutor).toBeDefined();
    await scratchAdmin.query(
      `UPDATE webhook_deliveries
          SET status = 'delivered', attempts = GREATEST(attempts, 1), response_status = 204
        WHERE account_id = $1 AND status = 'pending'`,
      [accountA]
    );
    const deliveryId = `worker-webhook-claim-${randomUUID()}`;
    await insertWebhookDelivery(scratchAdmin, {
      accountId: accountA,
      webhookId: accountAFixture.webhookId,
      id: deliveryId
    });

    const repositoryA = new DatabaseWebhookRepository(getDatabaseClient());
    const repositoryB = new DatabaseWebhookRepository(getDatabaseClient());
    let networkCalls = 0;
    const makeService = (repository: DatabaseWebhookRepository) =>
      new WebhooksService({
        repository,
        resolveHostname: async () => ['1.1.1.1'],
        deliverRequest: async () => {
          networkCalls++;
          await new Promise((resolve) => setTimeout(resolve, 50));
          return { success: true, statusCode: 204 };
        }
      });

    const process = (service: WebhooksService, workerId: string) =>
      runWithTenantContext(
        { tenantId: accountA, accountId: accountA, correlationId: randomUUID() },
        () => service.processPendingDeliveries(accountA as never, { workerId, limit: 1 })
      );

    const [workerA, workerB] = await Promise.all([
      process(makeService(repositoryA), `webhook-a-${suffix}`),
      process(makeService(repositoryB), `webhook-b-${suffix}`)
    ]);

    expect(workerA.claimed + workerB.claimed).toBe(1);
    expect(workerA.delivered + workerB.delivered).toBe(1);
    expect(workerA.leaseLost + workerB.leaseLost).toBe(0);
    expect(networkCalls).toBe(1);

    const persisted = await scratchAdmin.query(
      `SELECT status, attempts, lease_owner, lease_token, lease_expires_at
         FROM webhook_deliveries
        WHERE account_id = $1 AND id = $2`,
      [accountA, deliveryId]
    );
    expect(persisted.rows).toEqual([
      {
        status: 'delivered',
        attempts: 1,
        lease_owner: null,
        lease_token: null,
        lease_expires_at: null
      }
    ]);

    const tenantAVisible = await runWithTenantContext(
      { tenantId: accountA, accountId: accountA, correlationId: randomUUID() },
      () => repositoryA.findDeliveriesByWebhook(accountA as never, accountAFixture.webhookId as never)
    );
    const tenantBHidden = await runWithTenantContext(
      { tenantId: accountB, accountId: accountB, correlationId: randomUUID() },
      () => repositoryA.findDeliveriesByWebhook(accountA as never, accountAFixture.webhookId as never)
    );
    expect(tenantAVisible.some((delivery) => delivery.id === deliveryId)).toBe(true);
    expect(tenantBHidden.some((delivery) => delivery.id === deliveryId)).toBe(false);

    const retryId = `worker-webhook-retry-${randomUUID()}`;
    await insertWebhookDelivery(scratchAdmin, {
      accountId: accountA,
      webhookId: accountAFixture.webhookId,
      id: retryId,
      maxAttempts: 2
    });
    let retryCalls = 0;
    const retryService = new WebhooksService({
      repository: repositoryA,
      resolveHostname: async () => ['1.1.1.1'],
      deliverRequest: async () => {
        retryCalls++;
        return retryCalls === 1
          ? { success: false, statusCode: 503, error: 'temporary upstream failure' }
          : { success: true, statusCode: 204 };
      }
    });

    const firstRetry = await process(retryService, `webhook-retry-${suffix}`);
    expect(firstRetry).toMatchObject({ claimed: 1, retried: 1, delivered: 0 });
    expect(retryCalls).toBe(1);
    const retryState = await scratchAdmin.query(
      `SELECT status, attempts, response_error, next_retry_at
         FROM webhook_deliveries WHERE account_id = $1 AND id = $2`,
      [accountA, retryId]
    );
    expect(retryState.rows[0]?.status).toBe('retrying');
    expect(retryState.rows[0]?.attempts).toBe(1);
    expect(retryState.rows[0]?.response_error).toBe('temporary upstream failure');
    expect(retryState.rows[0]?.next_retry_at).toBeTruthy();

    await scratchAdmin.query(
      'UPDATE webhook_deliveries SET next_retry_at = now() WHERE account_id = $1 AND id = $2',
      [accountA, retryId]
    );
    const secondRetry = await process(retryService, `webhook-retry-${suffix}`);
    expect(secondRetry).toMatchObject({ claimed: 1, retried: 0, delivered: 1 });
    expect(retryCalls).toBe(2);
    const completedRetry = await scratchAdmin.query(
      'SELECT status, attempts FROM webhook_deliveries WHERE account_id = $1 AND id = $2',
      [accountA, retryId]
    );
    expect(completedRetry.rows).toEqual([{ status: 'delivered', attempts: 2 }]);
  }, 60_000);

  it('takes over an expired webhook lease and rejects the stale worker transition', async () => {
    const deliveryId = `worker-webhook-takeover-${randomUUID()}`;
    await insertWebhookDelivery(scratchAdmin, {
      accountId: accountA,
      webhookId: accountAFixture.webhookId,
      id: deliveryId
    });
    const repositoryA = new DatabaseWebhookRepository(getDatabaseClient());
    const repositoryB = new DatabaseWebhookRepository(getDatabaseClient());
    const firstClaims = await repositoryA.claimPending(accountA as never, {
      limit: 1,
      leaseOwner: `webhook-crashed-${suffix}`,
      leaseMs: 1_000
    });
    expect(firstClaims).toHaveLength(1);
    const staleClaim = firstClaims[0]!;

    await new Promise((resolve) => setTimeout(resolve, 1_200));
    const takeoverService = new WebhooksService({
      repository: repositoryB,
      resolveHostname: async () => ['1.1.1.1'],
      deliverRequest: async () => ({ success: true, statusCode: 204 })
    });
    const takeover = await runWithTenantContext(
      { tenantId: accountA, accountId: accountA, correlationId: randomUUID() },
      () =>
        takeoverService.processPendingDeliveries(accountA as never, {
          workerId: `webhook-takeover-${suffix}`,
          limit: 1
        })
    );
    expect(takeover).toMatchObject({ claimed: 1, delivered: 1, leaseLost: 0 });
    expect(await repositoryA.completeClaim(staleClaim, staleClaim.delivery)).toBe(false);

    const persisted = await scratchAdmin.query(
      'SELECT status, attempts FROM webhook_deliveries WHERE account_id = $1 AND id = $2',
      [accountA, deliveryId]
    );
    expect(persisted.rows).toEqual([{ status: 'delivered', attempts: 2 }]);
  }, 30_000);

  it('rolls back card, billing and inbox effects when settlement fails after mutation', async () => {
    await processForAccount(accountBFixture);

    const sharedCardRows = await scratchAdmin.query(
      `SELECT account_id, transaction_id, status
         FROM card_transactions
        WHERE transaction_id = $1
        ORDER BY account_id`,
      [accountAFixture.cardIntentId]
    );
    expect(sharedCardRows.rows).toHaveLength(2);
    expect(sharedCardRows.rows).toEqual(
      expect.arrayContaining([
        { account_id: accountA, transaction_id: accountAFixture.cardIntentId, status: 'captured' },
        {
          account_id: accountB,
          transaction_id: accountBFixture.cardIntentId,
          status: 'authorized_pending_capture'
        }
      ])
    );

    const cardRepository = new DatabaseCardTransactionRepository();
    await expect(
      runWithTenantContext(
        { tenantId: accountA, accountId: accountA, correlationId: randomUUID() },
        () => cardRepository.findByTransactionId(accountAFixture.cardIntentId)
      )
    ).resolves.toMatchObject({ accountId: accountA });
    await expect(
      runWithTenantContext(
        { tenantId: accountB, accountId: accountB, correlationId: randomUUID() },
        () => cardRepository.findByTransactionId(accountBFixture.cardIntentId)
      )
    ).resolves.toMatchObject({ accountId: accountB });

    const partialPaymentId = randomUUID();
    await scratchAdmin.query(
      `UPDATE encounter_financial_accounts
          SET financial_status = 'partial', paid_amount = 25, balance_due = 100
        WHERE account_id = $1 AND id = $2`,
      [accountB, accountBFixture.financialAccountId]
    );
    await scratchAdmin.query(
      `UPDATE encounter_receivables
          SET status = 'open', amount_paid = 25, amount_outstanding = 100
        WHERE account_id = $1 AND id = $2`,
      [accountB, accountBFixture.receivableId]
    );
    await scratchAdmin.query(
      `INSERT INTO encounter_receivable_payments (
         id, account_id, encounter_id, financial_account_id, receivable_id,
         amount_paid, paid_at, paid_by_user_id, external_reference_type,
         external_reference_id, notes, created_at
       ) VALUES ($1, $2, $3, $4, $5, 25, now(), $6, 'billing_record', $7, 'pre-existing partial payment', now())`,
      [
        partialPaymentId,
        accountB,
        accountBFixture.encounterId,
        accountBFixture.financialAccountId,
        accountBFixture.receivableId,
        accountBFixture.actorUserId,
        accountBFixture.billingRecordId
      ]
    );

    const eventId = randomUUID();
    await insertOutboxEvent(scratchAdmin, {
      id: eventId,
      accountId: accountB,
      correlationId: randomUUID(),
      eventType: 'payment.card.completed',
      payload: {
        accountId: accountB,
        intentId: accountBFixture.cardIntentId,
        billingRecordId: accountBFixture.billingRecordId,
        provider: 'local-card',
        capturedAt: new Date().toISOString()
      }
    });

    await processForAccount(accountBFixture);

    const state = await scratchAdmin.query(
      `SELECT status, attempts FROM outbox_events WHERE account_id = $1 AND id = $2`,
      [accountB, eventId]
    );
    const inbox = await scratchAdmin.query(
      `SELECT COUNT(*)::int AS count FROM inbox_events WHERE account_id = $1 AND event_id = $2`,
      [accountB, eventId]
    );
    const card = await scratchAdmin.query(
      `SELECT status, billing_settlement_status
         FROM card_transactions
        WHERE account_id = $1 AND transaction_id = $2`,
      [accountB, accountBFixture.cardIntentId]
    );
    const billing = await scratchAdmin.query(
      `SELECT status FROM billing_records WHERE account_id = $1 AND id = $2`,
      [accountB, accountBFixture.billingRecordId]
    );
    const receivable = await scratchAdmin.query(
      `SELECT status, amount_paid, amount_outstanding
         FROM encounter_receivables
        WHERE account_id = $1 AND id = $2`,
      [accountB, accountBFixture.receivableId]
    );
    const cardPayments = await scratchAdmin.query(
      `SELECT COUNT(*)::int AS count
         FROM encounter_receivable_payments
        WHERE account_id = $1 AND external_reference_id = $2`,
      [accountB, accountBFixture.cardIntentId]
    );
    expect(state.rows).toEqual([{ status: 'failed', attempts: 1 }]);
    expect(inbox.rows).toEqual([{ count: 0 }]);
    expect(card.rows).toEqual([
      { status: 'authorized_pending_capture', billing_settlement_status: 'awaiting_capture' }
    ]);
    expect(billing.rows).toEqual([{ status: 'open' }]);
    expect(receivable.rows).toEqual([
      { status: 'open', amount_paid: '25.00', amount_outstanding: '100.00' }
    ]);
    expect(cardPayments.rows).toEqual([{ count: 0 }]);
  });

  it('rejects an unknown card completion without creating an intent or inbox receipt', async () => {
    const eventId = randomUUID();
    const unknownIntentId = randomUUID();
    await insertOutboxEvent(scratchAdmin, {
      id: eventId,
      accountId: accountB,
      correlationId: randomUUID(),
      eventType: 'payment.card.completed',
      payload: {
        accountId: accountB,
        intentId: unknownIntentId,
        billingRecordId: accountBFixture.billingRecordId,
        provider: 'local-card',
        capturedAt: new Date().toISOString()
      }
    });

    await processForAccount(accountBFixture);

    const state = await scratchAdmin.query(
      `SELECT status, attempts FROM outbox_events WHERE account_id = $1 AND id = $2`,
      [accountB, eventId]
    );
    const inbox = await scratchAdmin.query(
      `SELECT COUNT(*)::int AS count FROM inbox_events WHERE account_id = $1 AND event_id = $2`,
      [accountB, eventId]
    );
    const card = await scratchAdmin.query(
      `SELECT COUNT(*)::int AS count FROM card_transactions WHERE account_id = $1 AND transaction_id = $2`,
      [accountB, unknownIntentId]
    );
    expect(state.rows).toEqual([{ status: 'failed', attempts: 1 }]);
    expect(inbox.rows).toEqual([{ count: 0 }]);
    expect(card.rows).toEqual([{ count: 0 }]);
  });
});
