import { createHash, randomUUID } from 'node:crypto';

import { Pool } from 'pg';
import { beforeEach, describe, expect, it } from 'vitest';

import { DatabasePixProviderEventDeliveryRepository } from '../../../apps/worker/src/jobs/pix-provider-event-delivery-repository.js';
import { PixProviderSettlementConsumer } from '../../../apps/worker/src/jobs/pix-provider-settlement-consumer.js';
import { DatabasePixProviderEventIngressRepository } from '../../../apps/api/src/pix-provider-event-ingress-repository.js';
import {
  ConfirmedPixSettlementCommand,
  DatabaseConfirmedPixSettlementRepository
} from '@cvg-his-v2/module-pix';
import { getTenantTransactionContext } from '@cvg-his-v2/shared-database';
import { getTestPool } from '../../db/db-admin.js';
import { TEST_DB_IS_EPHEMERAL, TEST_DB_URL } from '../../setup/env.js';

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
    eventId,
    providerEventId,
    providerTransactionId
  };
}

async function createEquivalentProviderEvent(
  fixture: Pick<
    Awaited<ReturnType<typeof createPendingDelivery>>,
    'accountId' | 'attemptId' | 'eventId'
  >
) {
  const pool = getTestPool();
  const source = await pool.query<{
    readonly amount_cents: string;
    readonly claims_fingerprint: string;
    readonly confirmed_at: Date;
    readonly provider_transaction_id: string;
  }>(
    `SELECT amount_cents::text, claims_fingerprint, confirmed_at, provider_transaction_id
       FROM pix_provider_events
      WHERE account_id = $1 AND id = $2`,
    [fixture.accountId, fixture.eventId]
  );
  const sourceEvent = source.rows[0];
  if (!sourceEvent) throw new Error('source PIX provider event was not found');
  const eventId = randomUUID();
  const providerEventId = `event-equivalent-${randomUUID()}`;
  const deliveryId = randomUUID();
  await pool.query(
    `INSERT INTO pix_provider_events (
       id, account_id, provider, provider_event_id, event_type, payment_attempt_id,
       provider_transaction_id, amount_cents, currency, confirmed_at,
       body_fingerprint, claims_fingerprint, correlation_id
     ) VALUES ($1, $2, 'local-pix', $3, 'pix.payment.confirmed.v1', $4, $5, $6,
               'BRL', $7, $8, $9, $10)`,
    [
      eventId,
      fixture.accountId,
      providerEventId,
      fixture.attemptId,
      sourceEvent.provider_transaction_id,
      sourceEvent.amount_cents,
      sourceEvent.confirmed_at,
      createHash('sha256').update(randomUUID()).digest('hex'),
      sourceEvent.claims_fingerprint,
      `equivalent-correlation-${randomUUID()}`
    ]
  );
  await pool.query(
    `INSERT INTO pix_provider_event_deliveries (id, account_id, event_id)
     VALUES ($1, $2, $3)`,
    [deliveryId, fixture.accountId, eventId]
  );
  return Object.freeze({ deliveryId, eventId, providerEventId });
}

async function createDivergentProviderEvent(
  fixture: Pick<
    Awaited<ReturnType<typeof createPendingDelivery>>,
    'accountId' | 'attemptId' | 'eventId'
  >
) {
  const pool = getTestPool();
  const source = await pool.query<{
    readonly amount_cents: string;
    readonly confirmed_at: Date;
    readonly provider_transaction_id: string;
  }>(
    `SELECT amount_cents::text, confirmed_at, provider_transaction_id
       FROM pix_provider_events
      WHERE account_id = $1 AND id = $2`,
    [fixture.accountId, fixture.eventId]
  );
  const sourceEvent = source.rows[0];
  if (!sourceEvent) throw new Error('source PIX provider event was not found');
  const providerEventId = `event-divergent-${randomUUID()}`;
  const claims = Object.freeze({
    type: 'pix.payment.confirmed.v1' as const,
    accountId: fixture.accountId,
    attemptId: fixture.attemptId,
    providerTransactionId: sourceEvent.provider_transaction_id,
    amountCents: Number(sourceEvent.amount_cents),
    currency: 'BRL' as const,
    confirmedAt: new Date(new Date(sourceEvent.confirmed_at).getTime() + 1_000).toISOString()
  });
  const result = await new DatabasePixProviderEventIngressRepository(pool).persist({
    rawBody: Buffer.from(JSON.stringify(claims), 'utf8'),
    claims,
    providerEventId,
    correlationId: `divergent-correlation-${randomUUID()}`
  });
  return Object.freeze({ ...result, providerEventId });
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

async function waitForAuthorizationLockWait(pool: Pool, accountId: string): Promise<boolean> {
  const deadline = Date.now() + 5_000;
  while (Date.now() < deadline) {
    const result = await pool.query<{ readonly waiting: boolean }>(
      `SELECT EXISTS (
         SELECT 1
           FROM pg_locks
          WHERE locktype = 'advisory'
            AND granted = false
            AND classid = ((hashtextextended($1, 0) >> 32) & 4294967295)::oid
            AND objid = (hashtextextended($1, 0) & 4294967295)::oid
       ) AS waiting`,
      [accountId]
    );
    if (result.rows[0]?.waiting === true) return true;
    await new Promise((resolveSleep) => setTimeout(resolveSleep, 10));
  }
  return false;
}

describe.skipIf(!TEST_DB_IS_EPHEMERAL)(
  'PIX provider settlement consumer PostgreSQL fencing',
  () => {
    beforeEach(async () => {
      if (TEST_DB_IS_EPHEMERAL) {
        await getTestPool().query('TRUNCATE TABLE accounts CASCADE');
      }
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
      }>(
        `SELECT attempts, last_error_code, state FROM pix_provider_event_deliveries WHERE id = $1`,
        [fixture.deliveryId]
      );
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

    it('converges an equivalent distinct provider event to the canonical settlement', async () => {
      const fixture = await createPendingDelivery();
      await makeDeliverySettlementReady(fixture);
      const equivalent = await createEquivalentProviderEvent(fixture);
      const consumer = new PixProviderSettlementConsumer(
        new DatabasePixProviderEventDeliveryRepository(getTestPool()),
        {
          workerId: 'worker-semantic-replay',
          leaseMs: 60_000,
          allowSyntheticProviders: true
        }
      );

      const first = await consumer.processNext(fixture.accountId);
      const replay = await consumer.processNext(fixture.accountId);

      expect(first.status).toBe('applied');
      expect(replay.status).toBe('applied');
      const deliveries = await getTestPool().query<{
        readonly last_error_code: string | null;
        readonly provider_event_id: string;
        readonly state: string;
      }>(
        `SELECT event.provider_event_id, delivery.state, delivery.last_error_code
           FROM pix_provider_event_deliveries AS delivery
           JOIN pix_provider_events AS event
             ON event.account_id = delivery.account_id AND event.id = delivery.event_id
          WHERE delivery.account_id = $1
          ORDER BY delivery.created_at ASC, delivery.id ASC`,
        [fixture.accountId]
      );
      expect(deliveries.rows).toEqual([
        {
          provider_event_id: fixture.providerEventId,
          state: 'applied',
          last_error_code: null
        },
        {
          provider_event_id: equivalent.providerEventId,
          state: 'applied',
          last_error_code: 'PIX_SETTLEMENT_CANONICAL_REPLAY'
        }
      ]);
      const effects = await getTestPool().query<{
        readonly audits: number;
        readonly inbox_events: number;
        readonly journal_entries: number;
        readonly outbox_events: number;
        readonly payments: number;
        readonly proofs: number;
      }>(
        `SELECT
           (SELECT COUNT(*)::int FROM encounter_non_cash_receipts
             WHERE account_id = $1 AND transaction_id = $2) AS proofs,
           (SELECT COUNT(*)::int FROM encounter_receivable_payments
             WHERE account_id = $1 AND external_reference_type = 'pix_transaction'
               AND external_reference_id = $2) AS payments,
           (SELECT COUNT(*)::int FROM financial_journal_entries
             WHERE account_id = $1 AND source_type = 'encounter_non_cash_receipt') AS journal_entries,
           (SELECT COUNT(*)::int FROM audit_events
             WHERE account_id = $1 AND entity_type = 'encounter_non_cash_receipt') AS audits,
           (SELECT COUNT(*)::int FROM outbox_events
             WHERE account_id = $1 AND event_type = 'encounter.non-cash-receipt.created') AS outbox_events,
           (SELECT COUNT(*)::int FROM inbox_events
             WHERE account_id = $1 AND consumer_name = 'confirmed-pix-settlement') AS inbox_events`,
        [fixture.accountId, fixture.attemptId]
      );
      expect(effects.rows[0]).toEqual({
        proofs: 1,
        payments: 1,
        journal_entries: 1,
        audits: 1,
        outbox_events: 1,
        inbox_events: 2
      });
    });

    it('fails closed when a distinct provider event has divergent claims', async () => {
      const fixture = await createPendingDelivery();
      await makeDeliverySettlementReady(fixture);
      const divergent = await createDivergentProviderEvent(fixture);
      const consumer = new PixProviderSettlementConsumer(
        new DatabasePixProviderEventDeliveryRepository(getTestPool()),
        {
          workerId: 'worker-semantic-divergent',
          leaseMs: 60_000,
          allowSyntheticProviders: true
        }
      );

      expect((await consumer.processNext(fixture.accountId)).status).toBe('applied');
      const result = await consumer.processNext(fixture.accountId);

      expect(result).toMatchObject({
        status: 'reconciliation_required',
        failureCode: 'PIX_SETTLEMENT_CLAIMS_DIVERGENT',
        failureClass: 'terminal'
      });
      const delivery = await getTestPool().query<{
        readonly last_error_code: string | null;
        readonly provider_event_id: string;
        readonly state: string;
      }>(
        `SELECT event.provider_event_id, delivery.state, delivery.last_error_code
           FROM pix_provider_event_deliveries AS delivery
           JOIN pix_provider_events AS event
             ON event.account_id = delivery.account_id AND event.id = delivery.event_id
          WHERE delivery.account_id = $1 AND event.provider_event_id = $2`,
        [fixture.accountId, divergent.providerEventId]
      );
      expect(delivery.rows[0]).toEqual({
        provider_event_id: divergent.providerEventId,
        state: 'reconciliation_required',
        last_error_code: 'PIX_SETTLEMENT_CLAIMS_DIVERGENT'
      });
      const effects = await getTestPool().query<{
        readonly inbox_events: number;
        readonly proofs: number;
      }>(
        `SELECT
           (SELECT COUNT(*)::int FROM encounter_non_cash_receipts
             WHERE account_id = $1 AND transaction_id = $2) AS proofs,
           (SELECT COUNT(*)::int FROM inbox_events
             WHERE account_id = $1 AND consumer_name = 'confirmed-pix-settlement') AS inbox_events`,
        [fixture.accountId, fixture.attemptId]
      );
      // The divergent B1 transaction rolls back its inbox claim together with
      // the rejected attempt; the append-only provider event and DLQ delivery
      // remain the forensic record.
      expect(effects.rows[0]).toEqual({ proofs: 1, inbox_events: 1 });
    });

    it('converges equivalent events under two concurrent consumers', async () => {
      const fixture = await createPendingDelivery();
      await makeDeliverySettlementReady(fixture);
      await createEquivalentProviderEvent(fixture);
      const poolA = new Pool({ connectionString: TEST_DB_URL, max: 1 });
      const poolB = new Pool({ connectionString: TEST_DB_URL, max: 1 });
      let afterClaimArrivals = 0;
      let releaseAfterClaim: (() => void) | undefined;
      const afterClaimBarrier = new Promise<void>((resolve) => {
        releaseAfterClaim = resolve;
      });
      const synchronizeAfterClaim = async (checkpoint: string): Promise<void> => {
        if (checkpoint !== 'after_claim_commit') return;
        afterClaimArrivals += 1;
        if (afterClaimArrivals === 2) releaseAfterClaim?.();
        await afterClaimBarrier;
      };
      try {
        const [first, second] = await Promise.all([
          new PixProviderSettlementConsumer(
            new DatabasePixProviderEventDeliveryRepository(poolA),
            {
              workerId: 'worker-semantic-concurrent-a',
              leaseMs: 60_000,
              allowSyntheticProviders: true,
              onCheckpoint: synchronizeAfterClaim
            }
          ).processNext(fixture.accountId),
          new PixProviderSettlementConsumer(
            new DatabasePixProviderEventDeliveryRepository(poolB),
            {
              workerId: 'worker-semantic-concurrent-b',
              leaseMs: 60_000,
              allowSyntheticProviders: true,
              onCheckpoint: synchronizeAfterClaim
            }
          ).processNext(fixture.accountId)
        ]);

        expect([first.status, second.status].sort()).toEqual(['applied', 'applied']);
        const effects = await getTestPool().query<{
          readonly audits: number;
          readonly canonical_replays: number;
          readonly financial_accounts: number;
          readonly inbox_events: number;
          readonly journal_entries: number;
          readonly journal_lines: number;
          readonly outbox_events: number;
          readonly payments: number;
          readonly proofs: number;
          readonly receivables: number;
        }>(
          `SELECT
             (SELECT COUNT(*)::int FROM encounter_non_cash_receipts
               WHERE account_id = $1 AND transaction_id = $2) AS proofs,
             (SELECT COUNT(*)::int FROM encounter_receivable_payments
               WHERE account_id = $1 AND external_reference_type = 'pix_transaction'
                 AND external_reference_id = $2) AS payments,
             (SELECT COUNT(*)::int FROM encounter_financial_accounts
               WHERE account_id = $1) AS financial_accounts,
             (SELECT COUNT(*)::int FROM encounter_receivables
               WHERE account_id = $1) AS receivables,
             (SELECT COUNT(*)::int FROM financial_journal_entries
               WHERE account_id = $1 AND source_type = 'encounter_non_cash_receipt') AS journal_entries,
             (SELECT COUNT(*)::int FROM financial_journal_lines
               WHERE account_id = $1) AS journal_lines,
             (SELECT COUNT(*)::int FROM audit_events
               WHERE account_id = $1 AND entity_type = 'encounter_non_cash_receipt') AS audits,
             (SELECT COUNT(*)::int FROM outbox_events
               WHERE account_id = $1 AND event_type = 'encounter.non-cash-receipt.created') AS outbox_events,
             (SELECT COUNT(*)::int FROM inbox_events
               WHERE account_id = $1 AND consumer_name = 'confirmed-pix-settlement') AS inbox_events,
             (SELECT COUNT(*)::int FROM pix_provider_event_deliveries
               WHERE account_id = $1 AND last_error_code = 'PIX_SETTLEMENT_CANONICAL_REPLAY') AS canonical_replays`,
          [fixture.accountId, fixture.attemptId]
        );
        expect(effects.rows[0]).toEqual({
          audits: 1,
          proofs: 1,
          payments: 1,
          financial_accounts: 1,
          receivables: 1,
          journal_entries: 1,
          journal_lines: 2,
          outbox_events: 1,
          inbox_events: 2,
          canonical_replays: 1
        });
      } finally {
        await Promise.all([poolA.end(), poolB.end()]);
      }
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
      const delivery = await pool.query<{
        readonly last_error_code: string;
        readonly state: string;
      }>(`SELECT last_error_code, state FROM pix_provider_event_deliveries WHERE id = $1`, [
        fixture.deliveryId
      ]);
      expect(delivery.rows[0]).toEqual({ last_error_code: 'PIX_NOT_CORRELATED', state: 'pending' });
    });

    it('linearizes service-principal revocation before settlement reads the principal', async () => {
      const fixture = await createPendingDelivery();
      await makeDeliverySettlementReady(fixture);
      const pool = getTestPool();
      const repository = new DatabasePixProviderEventDeliveryRepository(pool);
      const claim = await repository.claimNext({
        accountId: fixture.accountId,
        leaseOwner: 'worker-revocation-race',
        leaseMs: 60_000
      });
      expect(claim).not.toBeNull();

      const revocationPool = new Pool({ connectionString: TEST_DB_URL, max: 1 });
      const revocationClient = await revocationPool.connect();
      let settled = false;
      let b1Calls = 0;
      try {
        await revocationClient.query('BEGIN');
        await revocationClient.query("SELECT set_config('app.current_account_id', $1, true)", [
          fixture.accountId
        ]);
        await revocationClient.query('SELECT pg_advisory_xact_lock(hashtextextended($1, 0))', [
          fixture.accountId
        ]);
        await revocationClient.query(
          `UPDATE account_service_principals
            SET is_active = false
          WHERE account_id = $1 AND purpose = 'pix-settlement'`,
          [fixture.accountId]
        );

        const execution = repository
          .executeSettlement(claim!, async () => {
            b1Calls += 1;
          })
          .finally(() => {
            settled = true;
          });
        const waitDeadline = Date.now() + 5_000;
        let authorizationLockWaitObserved = false;
        while (Date.now() < waitDeadline) {
          const lockState = await revocationClient.query<{ readonly waiting: boolean }>(
            `SELECT EXISTS (
             SELECT 1
               FROM pg_locks
              WHERE locktype = 'advisory'
                AND NOT granted
           ) AS waiting`
          );
          if (lockState.rows[0]?.waiting === true) {
            authorizationLockWaitObserved = true;
            break;
          }
          await new Promise((resolveSleep) => setTimeout(resolveSleep, 10));
        }
        expect(authorizationLockWaitObserved).toBe(true);
        expect(settled).toBe(false);
        expect(b1Calls).toBe(0);

        await revocationClient.query('COMMIT');
        await expect(execution).rejects.toMatchObject({
          code: 'PIX_SETTLEMENT_PRINCIPAL_INVALID'
        });
        expect(b1Calls).toBe(0);
      } finally {
        await revocationClient.query('ROLLBACK').catch(() => undefined);
        revocationClient.release();
        await revocationPool.end();
      }
    });

    it('re-reads a direct writer commit and fails closed before B1', async () => {
      const fixture = await createPendingDelivery();
      await makeDeliverySettlementReady(fixture);
      const pool = getTestPool();
      const repository = new DatabasePixProviderEventDeliveryRepository(pool);
      const claim = await repository.claimNext({
        accountId: fixture.accountId,
        leaseOwner: 'worker-direct-writer-commit',
        leaseMs: 60_000
      });
      expect(claim).not.toBeNull();

      const writer = await pool.connect();
      let execution: Promise<unknown> | undefined;
      let b1Calls = 0;
      try {
        await writer.query('BEGIN');
        await writer.query(
          `UPDATE account_service_principals
              SET is_active = false
            WHERE account_id = $1 AND purpose = 'pix-settlement'`,
          [fixture.accountId]
        );

        execution = repository.executeSettlement(claim!, async () => {
          b1Calls += 1;
        });
        expect(await waitForAuthorizationLockWait(pool, fixture.accountId)).toBe(true);
        expect(b1Calls).toBe(0);

        await writer.query('COMMIT');
        await expect(execution).rejects.toMatchObject({ code: 'PIX_SETTLEMENT_PRINCIPAL_INVALID' });
        expect(b1Calls).toBe(0);
      } finally {
        await writer.query('ROLLBACK').catch(() => undefined);
        await execution?.catch(() => undefined);
        writer.release();
      }
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
        const result = await workerB.executeSettlement(
          takeoverClaim!,
          async (input, transaction) => {
            b1Calls += 1;
            await new ConfirmedPixSettlementCommand(
              new DatabaseConfirmedPixSettlementRepository(),
              { allowSyntheticProviders: true },
              () => transaction
            ).execute(input);
          }
        );
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
        [
          fixture.attemptId,
          fixture.accountId,
          fixture.billingRecordId,
          fixture.providerTransactionId
        ]
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
  }
);
