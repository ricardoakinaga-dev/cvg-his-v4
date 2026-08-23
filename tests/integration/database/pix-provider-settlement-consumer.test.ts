import { createHash, randomUUID } from 'node:crypto';

import { Pool } from 'pg';
import { beforeEach, describe, expect, it } from 'vitest';

import { DatabasePixProviderEventDeliveryRepository } from '../../../apps/worker/src/jobs/pix-provider-event-delivery-repository.js';
import { PixProviderSettlementConsumer } from '../../../apps/worker/src/jobs/pix-provider-settlement-consumer.js';
import {
  ConfirmedPixSettlementCommand,
  DatabaseConfirmedPixSettlementRepository
} from '@cvg-his-v2/module-pix';
import { getTenantTransactionContext } from '@cvg-his-v2/shared-database';
import { getTestPool } from '../../db/db-admin.js';
import { TEST_DB_URL } from '../../setup/env.js';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';

async function createPendingDelivery() {
  const pool = getTestPool();
  const accountId = randomUUID();
  const actorUserId = randomUUID();
  const ownerId = randomUUID();
  const patientId = randomUUID();
  const encounterId = randomUUID();
  const attemptId = randomUUID();
  const eventId = randomUUID();
  const deliveryId = randomUUID();
  const billingRecordId = `pix-settlement-${randomUUID()}`;
  const providerEventId = `event-${randomUUID()}`;
  const providerTransactionId = `provider-${randomUUID()}`;
  const suffix = accountId.replaceAll('-', '');
  const amountCents = 12_500;
  await pool.query(
    `INSERT INTO accounts (id, tenant_id, slug, name) VALUES ($1, $2, $3, 'PIX settlement')`,
    [accountId, TENANT_ID, `pix-settlement-${suffix}`]
  );
  await pool.query(
    `INSERT INTO users (id, account_id, username, email, password_hash, full_name)
     VALUES ($1, $2, $3, $4, 'hash', 'PIX human')`,
    [actorUserId, accountId, `pix_settlement_${suffix}`, `pix-${suffix}@example.test`]
  );
  await pool.query(`INSERT INTO owners (id, account_id, full_name) VALUES ($1, $2, 'Owner')`, [
    ownerId,
    accountId
  ]);
  await pool.query(
    `INSERT INTO patients (id, account_id, owner_id, name, species) VALUES ($1, $2, $3, 'Patient', 'canine')`,
    [patientId, accountId, ownerId]
  );
  await pool.query(
    `INSERT INTO encounters (id, account_id, patient_id, owner_id, status, opened_by_user_id)
     VALUES ($1, $2, $3, $4, 'closed', $5)`,
    [encounterId, accountId, patientId, ownerId, actorUserId]
  );
  await pool.query(
    `INSERT INTO billing_records (
       id, account_id, encounter_id, patient_id, owner_id, status, subtotal_amount, currency
     ) VALUES ($1, $2, $3, $4, $5, 'open', '125.00', 'BRL')`,
    [billingRecordId, accountId, encounterId, patientId, ownerId]
  );
  await pool.query(
    `INSERT INTO billing_items (
       id, account_id, billing_record_id, encounter_id, item_type, description,
       quantity, unit_price_amount, total_amount, created_by_user_id
     ) VALUES ($1, $2, $3, $4, 'service', 'PIX settlement', 1, '125.00', '125.00', $5)`,
    [randomUUID(), accountId, billingRecordId, encounterId, actorUserId]
  );
  await pool.query(
    `INSERT INTO encounter_payment_attempts (
       id, account_id, encounter_id, billing_record_id, requested_by_user_id,
       provider_key, state, amount_cents, request_key_hash, provider_idempotency_key
     ) VALUES ($1, $2, $3, $4, $5, 'local-pix', 'pending_dispatch', $6, $7, $8)`,
    [
      attemptId,
      accountId,
      encounterId,
      billingRecordId,
      actorUserId,
      amountCents,
      createHash('sha256').update(randomUUID()).digest('hex'),
      `cvg:pix:create:v1:${attemptId}`
    ]
  );
  const correlationId = `correlation-${randomUUID()}`;
  await pool.query(
    `INSERT INTO pix_provider_events (
       id, account_id, provider, provider_event_id, event_type, payment_attempt_id,
       provider_transaction_id, amount_cents, currency, confirmed_at,
       body_fingerprint, claims_fingerprint, correlation_id
     ) VALUES ($1, $2, 'local-pix', $3, 'pix.payment.confirmed.v1', $4, $5, $6,
               'BRL', clock_timestamp(), $7, $8, $9)`,
    [
      eventId,
      accountId,
      providerEventId,
      attemptId,
      providerTransactionId,
      amountCents,
      createHash('sha256').update('body').digest('hex'),
      createHash('sha256').update('claims').digest('hex'),
      correlationId
    ]
  );
  await pool.query(
    `INSERT INTO pix_provider_event_deliveries (id, account_id, event_id)
     VALUES ($1, $2, $3)`,
    [deliveryId, accountId, eventId]
  );
  return {
    accountId,
    actorUserId,
    attemptId,
    billingRecordId,
    deliveryId,
    providerTransactionId
  };
}

async function makeDeliverySettlementReady(
  fixture: Pick<
    Awaited<ReturnType<typeof createPendingDelivery>>,
    'accountId' | 'attemptId' | 'billingRecordId' | 'providerTransactionId'
  >
): Promise<void> {
  const pool = getTestPool();
  const serviceUserId = randomUUID();
  const suffix = serviceUserId.replaceAll('-', '');
  await pool.query(
    `INSERT INTO users (
       id, account_id, username, email, password_hash, full_name,
       principal_kind, interactive_login_enabled
     ) VALUES ($1, $2, $3, $4, 'hash', 'PIX service', 'service', false)`,
    [serviceUserId, fixture.accountId, `service_${suffix}`, `service-${suffix}@example.test`]
  );
  await pool.query(
    `INSERT INTO account_service_principals (account_id, purpose, user_id)
     VALUES ($1, 'pix-settlement', $2)`,
    [fixture.accountId, serviceUserId]
  );
  await pool.query(
    `UPDATE encounter_payment_attempts
        SET state = 'awaiting_confirmation', provider_transaction_id = $3,
            next_attempt_at = NULL
      WHERE account_id = $1 AND id = $2`,
    [fixture.accountId, fixture.attemptId, fixture.providerTransactionId]
  );
  await pool.query(
    `INSERT INTO pix_transactions (
       transaction_id, provider, account_id, billing_record_id, payment_attempt_id,
       amount, currency, description, qr_code_payload, qr_code_base64, expires_at,
       status, provider_transaction_id,
       billing_settlement_status, cash_reconciliation_status
     ) VALUES ($1::varchar, 'local-pix', $2, $3, $1::uuid, '125.00', 'BRL',
               'PIX worker restart test', 'test-payload', 'dGVzdA==',
               clock_timestamp() + interval '1 hour', 'pending', $4,
               'awaiting_payment', 'pending')`,
    [fixture.attemptId, fixture.accountId, fixture.billingRecordId, fixture.providerTransactionId]
  );
}

describe('PIX provider settlement consumer PostgreSQL fencing', () => {
  beforeEach(async () => {
    await getTestPool().query('TRUNCATE TABLE accounts CASCADE');
  });

  it('claims once with SKIP LOCKED, retries absent principal and never uses idempotency_requests', async () => {
    const fixture = await createPendingDelivery();
    const pool = getTestPool();
    const before = await pool.query<{ readonly count: string }>(
      `SELECT COUNT(*)::text AS count FROM idempotency_requests WHERE account_id = $1`,
      [fixture.accountId]
    );
    const repository = new DatabasePixProviderEventDeliveryRepository(pool);
    const [first, second] = await Promise.all([
      repository.claimNext({
        accountId: fixture.accountId,
        leaseOwner: 'worker-a',
        leaseMs: 60_000
      }),
      repository.claimNext({
        accountId: fixture.accountId,
        leaseOwner: 'worker-b',
        leaseMs: 60_000
      })
    ]);
    const claimed = first ?? second;
    expect(claimed).not.toBeNull();
    expect([first, second].filter(Boolean)).toHaveLength(1);
    const consumerRepository = new DatabasePixProviderEventDeliveryRepository(pool);
    await pool.query(
      `UPDATE pix_provider_event_deliveries
          SET lease_expires_at = clock_timestamp() - interval '1 second'
        WHERE id = $1`,
      [fixture.deliveryId]
    );
    const consumer = new PixProviderSettlementConsumer(consumerRepository, {
      workerId: 'worker-c',
      leaseMs: 60_000,
      createSettlementExecutor: () => ({ execute: async () => ({}) })
    });
    const result = await consumer.processNext(fixture.accountId);
    expect(result.status).toBe('retry_scheduled');
    const delivery = await pool.query<{
      readonly attempts: number;
      readonly last_error_code: string;
      readonly state: string;
    }>(`SELECT attempts, last_error_code, state FROM pix_provider_event_deliveries WHERE id = $1`, [
      fixture.deliveryId
    ]);
    expect(delivery.rows[0]).toEqual({
      attempts: 2,
      last_error_code: 'PIX_SETTLEMENT_PRINCIPAL_NOT_FOUND',
      state: 'pending'
    });
    const after = await pool.query<{ readonly count: string }>(
      `SELECT COUNT(*)::text AS count FROM idempotency_requests WHERE account_id = $1`,
      [fixture.accountId]
    );
    expect(after.rows[0]?.count).toBe(before.rows[0]?.count);
  });

  it('revalidates a tenant-local service principal then retries missing provider correlation', async () => {
    const fixture = await createPendingDelivery();
    const pool = getTestPool();
    const serviceUserId = randomUUID();
    const suffix = serviceUserId.replaceAll('-', '');
    await pool.query(
      `INSERT INTO users (
         id, account_id, username, email, password_hash, full_name,
         principal_kind, interactive_login_enabled
       ) VALUES ($1, $2, $3, $4, 'hash', 'PIX service', 'service', false)`,
      [serviceUserId, fixture.accountId, `service_${suffix}`, `service-${suffix}@example.test`]
    );
    await pool.query(
      `INSERT INTO account_service_principals (account_id, purpose, user_id)
       VALUES ($1, 'pix-settlement', $2)`,
      [fixture.accountId, serviceUserId]
    );
    const repository = new DatabasePixProviderEventDeliveryRepository(pool);
    const consumer = new PixProviderSettlementConsumer(repository, {
      workerId: 'worker-principal',
      leaseMs: 60_000,
      createSettlementExecutor: () => ({ execute: async () => ({}) })
    });
    expect((await consumer.processNext(fixture.accountId)).status).toBe('retry_scheduled');
    const delivery = await pool.query<{ readonly last_error_code: string; readonly state: string }>(
      `SELECT last_error_code, state FROM pix_provider_event_deliveries WHERE id = $1`,
      [fixture.deliveryId]
    );
    expect(delivery.rows[0]).toEqual({ last_error_code: 'PIX_NOT_CORRELATED', state: 'pending' });
  });

  it('rejects a stale fence before invoking B1', async () => {
    const fixture = await createPendingDelivery();
    const pool = getTestPool();
    const repository = new DatabasePixProviderEventDeliveryRepository(pool);
    const claim = await repository.claimNext({
      accountId: fixture.accountId,
      leaseOwner: 'worker-stale',
      leaseMs: 60_000
    });
    expect(claim).not.toBeNull();
    await pool.query(
      `UPDATE pix_provider_event_deliveries
          SET lease_expires_at = clock_timestamp() - interval '1 second'
        WHERE id = $1`,
      [fixture.deliveryId]
    );
    let b1Calls = 0;
    const result = await repository.executeSettlement(claim!, async () => {
      b1Calls += 1;
    });
    expect(result).toBe('lease_lost');
    expect(b1Calls).toBe(0);
  });

  it('recovers after worker crash on a fresh pool, fences the stale claim and applies B1 once', async () => {
    const fixture = await createPendingDelivery();
    await makeDeliverySettlementReady(fixture);
    const pool = getTestPool();
    const beforeIdempotency = await pool.query<{ readonly count: string }>(
      `SELECT COUNT(*)::text AS count FROM idempotency_requests WHERE account_id = $1`,
      [fixture.accountId]
    );
    const workerAPool = new Pool({ connectionString: TEST_DB_URL, max: 1 });
    const workerBPool = new Pool({ connectionString: TEST_DB_URL, max: 1 });

    try {
      const workerAConnection = await workerAPool.query<{ readonly backend_pid: number }>(
        'SELECT pg_backend_pid() AS backend_pid'
      );
      const workerA = new DatabasePixProviderEventDeliveryRepository(workerAPool);
      const staleClaim = await workerA.claimNext({
        accountId: fixture.accountId,
        leaseOwner: 'worker-crashed-a',
        leaseMs: 1
      });
      expect(staleClaim).not.toBeNull();

      // A completed its claim transaction, then its process/connection disappeared before B1/CAS.
      await workerAPool.end();
      await new Promise<void>((resolve) => setTimeout(resolve, 25));

      const workerB = new DatabasePixProviderEventDeliveryRepository(workerBPool);
      const workerBConnection = await workerBPool.query<{ readonly backend_pid: number }>(
        'SELECT pg_backend_pid() AS backend_pid'
      );
      expect(workerBConnection.rows[0]?.backend_pid).not.toBe(
        workerAConnection.rows[0]?.backend_pid
      );
      const takeoverClaim = await workerB.claimNext({
        accountId: fixture.accountId,
        leaseOwner: 'worker-restarted-b',
        leaseMs: 60_000
      });
      expect(takeoverClaim).not.toBeNull();
      expect(takeoverClaim?.deliveryId).toBe(staleClaim?.deliveryId);
      expect(takeoverClaim?.leaseVersion).toBe((staleClaim?.leaseVersion ?? 0) + 1);
      expect(takeoverClaim?.leaseToken).not.toBe(staleClaim?.leaseToken);

      let staleB1Calls = 0;
      expect(
        await workerB.executeSettlement(staleClaim!, async () => {
          staleB1Calls += 1;
        })
      ).toBe('lease_lost');
      expect(staleB1Calls).toBe(0);

      let b1Calls = 0;
      const result = await workerB.executeSettlement(takeoverClaim!, async (input, transaction) => {
        b1Calls += 1;
        await new ConfirmedPixSettlementCommand(
          new DatabaseConfirmedPixSettlementRepository(),
          { allowSyntheticProviders: true },
          () => transaction
        ).execute(input);
      });
      expect(result).toBe('applied');
      expect(b1Calls).toBe(1);
      expect(
        await workerB.claimNext({
          accountId: fixture.accountId,
          leaseOwner: 'worker-restarted-b-second-tick',
          leaseMs: 60_000
        })
      ).toBeNull();

      const delivery = await pool.query<{
        readonly attempts: number;
        readonly lease_version: string;
        readonly state: string;
      }>(
        `SELECT attempts, lease_version::text, state
           FROM pix_provider_event_deliveries
          WHERE account_id = $1 AND id = $2`,
        [fixture.accountId, fixture.deliveryId]
      );
      expect(delivery.rows[0]).toEqual({
        attempts: 2,
        lease_version: String(takeoverClaim?.leaseVersion),
        state: 'applied'
      });
      const receipts = await pool.query<{ readonly count: string }>(
        `SELECT COUNT(*)::text AS count
           FROM encounter_non_cash_receipts
          WHERE account_id = $1 AND transaction_id = $2`,
        [fixture.accountId, fixture.attemptId]
      );
      expect(receipts.rows[0]?.count).toBe('1');
      const afterIdempotency = await pool.query<{ readonly count: string }>(
        `SELECT COUNT(*)::text AS count FROM idempotency_requests WHERE account_id = $1`,
        [fixture.accountId]
      );
      expect(afterIdempotency.rows[0]?.count).toBe(beforeIdempotency.rows[0]?.count);
    } finally {
      await workerAPool.end().catch(() => undefined);
      await workerBPool.end();
    }
  });

  it('redrives terminal delivery only through an explicit audited operator action', async () => {
    const fixture = await createPendingDelivery();
    const pool = getTestPool();
    const repository = new DatabasePixProviderEventDeliveryRepository(pool);
    const claim = await repository.claimNext({
      accountId: fixture.accountId,
      leaseOwner: 'worker-redrive',
      leaseMs: 60_000
    });
    expect(claim).not.toBeNull();
    expect(
      await repository.completeFailure(claim!, {
        code: 'PIX_SETTLEMENT_CLAIMS_DIVERGENT',
        errorClass: 'terminal',
        retryDelaySeconds: 0
      })
    ).toBe('reconciliation_required');

    expect(
      await repository.redrive({
        accountId: fixture.accountId,
        deliveryId: fixture.deliveryId,
        eventId: claim!.eventId,
        actorUserId: fixture.actorUserId,
        correlationId: `redrive-${randomUUID()}`,
        reason: 'Operator verified provider receipt and requested a bounded replay'
      })
    ).toBe(true);

    const delivery = await pool.query<{
      readonly state: string;
      readonly attempts: number;
      readonly last_error_code: string | null;
      readonly next_attempt_at: Date | null;
    }>(
      `SELECT state, attempts, last_error_code, next_attempt_at
         FROM pix_provider_event_deliveries
        WHERE id = $1`,
      [fixture.deliveryId]
    );
    expect(delivery.rows[0]?.state).toBe('pending');
    expect(delivery.rows[0]?.attempts).toBe(0);
    expect(delivery.rows[0]?.last_error_code).toBeNull();
    expect(delivery.rows[0]?.next_attempt_at).not.toBeNull();

    const audit = await pool.query<{ readonly action: string; readonly reason: string | null }>(
      `SELECT action, reason
         FROM audit_events
        WHERE account_id = $1 AND entity_type = 'pix_provider_event_delivery'
          AND entity_id = $2 AND action = 'pix_settlement_redrive'
        ORDER BY created_at DESC
        LIMIT 1`,
      [fixture.accountId, fixture.deliveryId]
    );
    expect(audit.rows[0]?.action).toBe('pix_settlement_redrive');
    expect(audit.rows[0]?.reason).toBe(
      'Operator verified provider receipt and requested a bounded replay'
    );
    expect(
      await repository.redrive({
        accountId: fixture.accountId,
        deliveryId: fixture.deliveryId,
        eventId: claim!.eventId,
        actorUserId: fixture.actorUserId,
        correlationId: `redrive-repeat-${randomUUID()}`,
        reason: 'Repeated redrive must be a no-op after the state leaves reconciliation'
      })
    ).toBe(false);
  });

  it('runs settlement and applied CAS inside the canonical non-idempotent context', async () => {
    const fixture = await createPendingDelivery();
    const pool = getTestPool();
    const serviceUserId = randomUUID();
    const suffix = serviceUserId.replaceAll('-', '');
    await pool.query(
      `INSERT INTO users (
         id, account_id, username, email, password_hash, full_name,
         principal_kind, interactive_login_enabled
       ) VALUES ($1, $2, $3, $4, 'hash', 'PIX service', 'service', false)`,
      [serviceUserId, fixture.accountId, `service_${suffix}`, `service-${suffix}@example.test`]
    );
    await pool.query(
      `INSERT INTO account_service_principals (account_id, purpose, user_id)
       VALUES ($1, 'pix-settlement', $2)`,
      [fixture.accountId, serviceUserId]
    );
    await pool.query(
      `UPDATE encounter_payment_attempts
          SET state = 'awaiting_confirmation', provider_transaction_id = $3,
              next_attempt_at = NULL
        WHERE account_id = $1 AND id = $2`,
      [fixture.accountId, fixture.attemptId, fixture.providerTransactionId]
    );
    await pool.query(
      `INSERT INTO pix_transactions (
         transaction_id, provider, account_id, billing_record_id, payment_attempt_id,
         amount, currency, description, qr_code_payload, qr_code_base64, expires_at,
         status, provider_transaction_id,
         billing_settlement_status, cash_reconciliation_status
       ) VALUES ($1::varchar, 'local-pix', $2, $3, $1::uuid, '125.00', 'BRL',
                 'PIX settlement context test', 'test-payload', 'dGVzdA==',
                 clock_timestamp() + interval '1 hour', 'pending', $4,
                 'awaiting_payment', 'pending')`,
      [fixture.attemptId, fixture.accountId, fixture.billingRecordId, fixture.providerTransactionId]
    );
    const before = await pool.query<{ readonly count: string }>(
      `SELECT COUNT(*)::text AS count FROM idempotency_requests WHERE account_id = $1`,
      [fixture.accountId]
    );
    const repository = new DatabasePixProviderEventDeliveryRepository(pool);
    const claim = await repository.claimNext({
      accountId: fixture.accountId,
      leaseOwner: 'worker-context',
      leaseMs: 60_000
    });
    expect(claim).not.toBeNull();
    const result = await repository.executeSettlement(claim!, async (_input, transaction) => {
      expect(getTenantTransactionContext()).toBe(transaction);
      expect(transaction.actorUserId).toBe(serviceUserId);
      expect(await transaction.inbox.claim('pix-context-test', fixture.deliveryId)).toBe(true);
    });
    expect(result).toBe('applied');
    expect(getTenantTransactionContext()).toBeUndefined();
    const after = await pool.query<{ readonly count: string }>(
      `SELECT COUNT(*)::text AS count FROM idempotency_requests WHERE account_id = $1`,
      [fixture.accountId]
    );
    expect(after.rows[0]?.count).toBe(before.rows[0]?.count);
  });
});
