import { createHash, randomUUID } from 'node:crypto';

import type { Pool } from 'pg';

export interface PixProviderWebhookSettlementFixture {
  readonly tenantId: string;
  readonly accountId: string;
  readonly userId: string;
  readonly reportServiceUserId: string;
  readonly attemptId: string;
  readonly billingRecordId: string;
  readonly providerTransactionId: string;
  readonly amountCents: number;
}

function requestHash(): string {
  return createHash('sha256').update(randomUUID(), 'utf8').digest('hex');
}

export async function createPixProviderWebhookSettlementFixture(
  pool: Pool
): Promise<PixProviderWebhookSettlementFixture> {
  const tenantId = randomUUID();
  const accountId = randomUUID();
  const userId = randomUUID();
  const ownerId = randomUUID();
  const patientId = randomUUID();
  const encounterId = randomUUID();
  const attemptId = randomUUID();
  const billingRecordId = `pix-webhook-settlement-${randomUUID()}`;
  const providerTransactionId = `provider-tx-${randomUUID()}`;
  const amountCents = 12_500;
  const amount = (amountCents / 100).toFixed(2);
  const suffix = accountId.replaceAll('-', '');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO tenants (id, slug, name, status, activated_at)
       VALUES ($1, $2, 'PIX webhook settlement tenant', 'active', clock_timestamp())`,
      [tenantId, `pix-webhook-settlement-${suffix}`]
    );
    await client.query(
      `INSERT INTO accounts (id, tenant_id, slug, name, is_active)
       VALUES ($1, $2, $3, 'PIX webhook settlement account', true)`,
      [accountId, tenantId, `pix-webhook-settlement-${suffix}`]
    );
    await client.query(
      `INSERT INTO users (id, account_id, username, email, password_hash, full_name, is_active)
       VALUES ($1, $2, $3, $4, 'cvg-his-v2-seed-salt-v1:fixture', 'PIX webhook operator', true)`,
      [userId, accountId, `pix_webhook_${suffix}`, `pix-webhook-${suffix}@example.test`]
    );
    await client.query(
      `INSERT INTO owners (id, account_id, full_name)
       VALUES ($1, $2, 'PIX webhook owner')`,
      [ownerId, accountId]
    );
    await client.query(
      `INSERT INTO patients (id, account_id, owner_id, name, species)
       VALUES ($1, $2, $3, 'PIX webhook patient', 'canine')`,
      [patientId, accountId, ownerId]
    );
    await client.query(
      `INSERT INTO encounters (id, account_id, patient_id, owner_id, status, opened_by_user_id, reason)
       VALUES ($1, $2, $3, $4, 'closed', $5, 'PIX webhook settlement process proof')`,
      [encounterId, accountId, patientId, ownerId, userId]
    );
    await client.query(
      `INSERT INTO billing_records (
         id, account_id, encounter_id, patient_id, owner_id, status,
         subtotal_amount, currency
       ) VALUES ($1, $2, $3, $4, $5, 'open', $6, $7)`,
      [billingRecordId, accountId, encounterId, patientId, ownerId, amount, 'BRL']
    );
    await client.query(
      `INSERT INTO billing_items (
         id, account_id, billing_record_id, encounter_id, item_type, description,
         quantity, unit_price_amount, total_amount, created_by_user_id
       ) VALUES ($1, $2, $3, $4, 'service', 'PIX webhook settlement', 1, $5, $5, $6)`,
      [randomUUID(), accountId, billingRecordId, encounterId, amount, userId]
    );
    await client.query(
      `INSERT INTO encounter_payment_attempts (
         id, account_id, encounter_id, billing_record_id, requested_by_user_id,
         payment_method, provider_key, state, amount_cents, currency,
         request_key_hash, provider_idempotency_key, next_attempt_at
       ) VALUES ($1, $2, $3, $4, $5, 'pix', 'local-pix', 'awaiting_confirmation',
                 $6, 'BRL', $7, $8, NULL)`,
      [
        attemptId,
        accountId,
        encounterId,
        billingRecordId,
        userId,
        amountCents,
        requestHash(),
        `cvg:pix:create:v1:${attemptId}`
      ]
    );
    const billingRecordUpdate = await client.query(
      `UPDATE billing_records
          SET active_payment_attempt_id = $2, updated_at = clock_timestamp()
        WHERE account_id = $1 AND id = $3`,
      [accountId, attemptId, billingRecordId]
    );
    if (billingRecordUpdate.rowCount !== 1) {
      throw new Error('PIX settlement fixture billing record was not linked');
    }
    const serviceUserId = randomUUID();
    const serviceSuffix = serviceUserId.replaceAll('-', '');
    await client.query(
      `INSERT INTO users (
         id, account_id, username, email, password_hash, full_name,
         principal_kind, interactive_login_enabled, is_active
       ) VALUES ($1, $2, $3, $4, 'cvg-his-v2-seed-salt-v1:service',
                 'PIX webhook settlement service', 'service', false, true)`,
      [
        serviceUserId,
        accountId,
        `pix_service_${serviceSuffix}`,
        `pix-service-${serviceSuffix}@example.test`
      ]
    );
    await client.query(
      `INSERT INTO account_service_principals (account_id, purpose, user_id)
       VALUES ($1, 'pix-settlement', $2)`,
      [accountId, serviceUserId]
    );
    await client.query(
      `INSERT INTO account_service_principals (account_id, purpose, user_id)
       VALUES ($1, 'report-execution', $2)`,
      [accountId, serviceUserId]
    );
    await client.query('COMMIT');

    return Object.freeze({
      tenantId,
      accountId,
      userId,
      reportServiceUserId: serviceUserId,
      attemptId,
      billingRecordId,
      providerTransactionId,
      amountCents
    });
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

export async function correlatePixProviderSettlement(
  pool: Pool,
  fixture: PixProviderWebhookSettlementFixture
): Promise<string> {
  const transactionId = randomUUID();
  const amount = (fixture.amountCents / 100).toFixed(2);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const attemptUpdate = await client.query(
      `UPDATE encounter_payment_attempts
          SET state = 'awaiting_confirmation', provider_transaction_id = $3,
              updated_at = clock_timestamp()
        WHERE account_id = $1 AND id = $2`,
      [fixture.accountId, fixture.attemptId, fixture.providerTransactionId]
    );
    if (attemptUpdate.rowCount !== 1) {
      throw new Error('PIX settlement fixture payment attempt was not found');
    }
    await client.query(
      `INSERT INTO pix_transactions (
         transaction_id, provider, account_id, billing_record_id, payment_attempt_id,
         amount, currency, description, qr_code_payload, qr_code_base64, expires_at,
         status, provider_transaction_id, billing_settlement_status,
         cash_reconciliation_status
       ) VALUES ($1, 'local-pix', $2, $3, $4, $6, 'BRL',
                 'PIX webhook settlement process', 'synthetic-payload', 'c3ludGhldGlj',
                 clock_timestamp() + interval '1 hour', 'pending', $5,
                 'awaiting_payment', 'pending')`,
      [
        transactionId,
        fixture.accountId,
        fixture.billingRecordId,
        fixture.attemptId,
        fixture.providerTransactionId,
        amount
      ]
    );
    await client.query('COMMIT');
    return transactionId;
  } catch (error) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}
