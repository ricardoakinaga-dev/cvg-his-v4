import { createHash, randomUUID } from 'node:crypto';

import type { Pool } from 'pg';

import { getTestPool } from '../db/db-admin.js';

export const PROCESS_FIXTURE_TENANT_ID = '00000000-0000-0000-0000-000000000001';

export interface PixSettlementProcessFixture {
  readonly accountId: string;
  readonly actorUserId: string;
  readonly attemptId: string;
  readonly billingRecordId: string;
  readonly deliveryId: string;
  readonly providerTransactionId: string;
}

export async function createPixSettlementProcessFixture(
  pool: Pool = getTestPool()
): Promise<PixSettlementProcessFixture> {
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
    `INSERT INTO accounts (id, tenant_id, slug, name) VALUES ($1, $2, $3, 'PIX process settlement')`,
    [accountId, PROCESS_FIXTURE_TENANT_ID, `pix-process-${suffix}`]
  );
  await pool.query(
    `INSERT INTO users (id, account_id, username, email, password_hash, full_name)
     VALUES ($1, $2, $3, $4, 'hash', 'PIX process human')`,
    [actorUserId, accountId, `pix_process_${suffix}`, `pix-process-${suffix}@example.test`]
  );
  await pool.query(`INSERT INTO owners (id, account_id, full_name) VALUES ($1, $2, 'Process Owner')`, [
    ownerId,
    accountId
  ]);
  await pool.query(
    `INSERT INTO patients (id, account_id, owner_id, name, species) VALUES ($1, $2, $3, 'Process Patient', 'canine')`,
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
     ) VALUES ($1, $2, $3, $4, 'service', 'PIX process settlement', 1, '125.00', '125.00', $5)`,
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
      createHash('sha256').update('process-body').digest('hex'),
      createHash('sha256').update('process-claims').digest('hex'),
      `process-correlation-${randomUUID()}`
    ]
  );
  await pool.query(
    `INSERT INTO pix_provider_event_deliveries (id, account_id, event_id)
     VALUES ($1, $2, $3)`,
    [deliveryId, accountId, eventId]
  );

  return Object.freeze({
    accountId,
    actorUserId,
    attemptId,
    billingRecordId,
    deliveryId,
    providerTransactionId
  });
}

export async function makePixSettlementProcessFixtureReady(
  fixture: PixSettlementProcessFixture,
  pool: Pool = getTestPool()
): Promise<void> {
  const serviceUserId = randomUUID();
  const suffix = serviceUserId.replaceAll('-', '');
  await pool.query(
    `INSERT INTO users (
       id, account_id, username, email, password_hash, full_name,
       principal_kind, interactive_login_enabled
     ) VALUES ($1, $2, $3, $4, 'hash', 'PIX process service', 'service', false)`,
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
               'PIX process restart test', 'test-payload', 'dGVzdA==',
               clock_timestamp() + interval '1 hour', 'pending', $4,
               'awaiting_payment', 'pending')`,
    [fixture.attemptId, fixture.accountId, fixture.billingRecordId, fixture.providerTransactionId]
  );
}
