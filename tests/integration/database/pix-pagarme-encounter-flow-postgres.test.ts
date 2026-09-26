import { createHash, randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';

import { describe, expect, it } from 'vitest';

import { DatabasePixProviderEventIngressRepository } from '../../../apps/api/src/pix-provider-event-ingress-repository.js';
import {
  handlePagarMePixWebhookRoutes,
  PAGARME_PIX_WEBHOOK_PATH
} from '../../../apps/api/src/routes/pagarme-pix-webhook-routes.js';
import {
  createExternalPixPaymentDispatchRuntime,
  createPixProviderSettlementRuntime
} from '../../../apps/worker/src/bootstrap.js';
import { getTestPool } from '../../db/db-admin.js';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';
const AMOUNT_CENTS = 12_500;

async function createPagarMeAttempt() {
  const pool = getTestPool();
  const ids = {
    accountId: randomUUID(),
    actorUserId: randomUUID(),
    serviceUserId: randomUUID(),
    ownerId: randomUUID(),
    patientId: randomUUID(),
    encounterId: randomUUID(),
    attemptId: randomUUID(),
    billingRecordId: `pix-pagarme-${randomUUID()}`
  };
  const suffix = ids.accountId.replaceAll('-', '');
  await pool.query(
    `INSERT INTO accounts (id, tenant_id, slug, name) VALUES ($1, $2, $3, 'PIX Pagar.me')`,
    [ids.accountId, TENANT_ID, `pix-pagarme-${suffix}`]
  );
  await pool.query(
    `INSERT INTO users (id, account_id, username, email, password_hash, full_name)
     VALUES ($1, $2, $3, $4, 'hash', 'Recepção')`,
    [ids.actorUserId, ids.accountId, `pix_pagarme_${suffix}`, `pix-${suffix}@example.test`]
  );
  await pool.query(
    `INSERT INTO users (
       id, account_id, username, email, password_hash, full_name,
       principal_kind, interactive_login_enabled
     ) VALUES ($1, $2, $3, $4, 'hash', 'PIX service', 'service', false)`,
    [ids.serviceUserId, ids.accountId, `svc_${suffix}`, `svc-${suffix}@example.test`]
  );
  await pool.query(
    `INSERT INTO account_service_principals (account_id, purpose, user_id)
     VALUES ($1, 'pix-settlement', $2)`,
    [ids.accountId, ids.serviceUserId]
  );
  await pool.query(`INSERT INTO owners (id, account_id, full_name) VALUES ($1, $2, 'Tutor')`, [
    ids.ownerId,
    ids.accountId
  ]);
  await pool.query(
    `INSERT INTO patients (id, account_id, owner_id, name, species) VALUES ($1, $2, $3, 'Luna', 'canine')`,
    [ids.patientId, ids.accountId, ids.ownerId]
  );
  await pool.query(
    `INSERT INTO encounters (id, account_id, patient_id, owner_id, status, opened_by_user_id)
     VALUES ($1, $2, $3, $4, 'closed', $5)`,
    [ids.encounterId, ids.accountId, ids.patientId, ids.ownerId, ids.actorUserId]
  );
  await pool.query(
    `INSERT INTO billing_records (
       id, account_id, encounter_id, patient_id, owner_id, status, subtotal_amount, currency
     ) VALUES ($1, $2, $3, $4, $5, 'open', '125.00', 'BRL')`,
    [ids.billingRecordId, ids.accountId, ids.encounterId, ids.patientId, ids.ownerId]
  );
  await pool.query(
    `INSERT INTO billing_items (
       id, account_id, billing_record_id, encounter_id, item_type, description,
       quantity, unit_price_amount, total_amount, created_by_user_id
     ) VALUES ($1, $2, $3, $4, 'service', 'Consulta', 1, '125.00', '125.00', $5)`,
    [randomUUID(), ids.accountId, ids.billingRecordId, ids.encounterId, ids.actorUserId]
  );
  await pool.query(
    `INSERT INTO encounter_payment_attempts (
       id, account_id, encounter_id, billing_record_id, requested_by_user_id,
       provider_key, state, amount_cents, request_key_hash, provider_idempotency_key
     ) VALUES ($1, $2, $3, $4, $5, 'pagarme', 'pending_dispatch', $6, $7, $8)`,
    [
      ids.attemptId,
      ids.accountId,
      ids.encounterId,
      ids.billingRecordId,
      ids.actorUserId,
      AMOUNT_CENTS,
      createHash('sha256').update(randomUUID()).digest('hex'),
      `cvg:pix:create:v1:${ids.attemptId}`
    ]
  );
  return ids;
}

function webhookRequest(body: unknown) {
  const stream = Readable.from([Buffer.from(JSON.stringify(body))]) as Readable & Record<string, unknown>;
  stream.method = 'POST';
  stream.url = PAGARME_PIX_WEBHOOK_PATH;
  stream.headers = { 'content-type': 'application/json' };
  stream.socket = { remoteAddress: '203.0.113.10' };
  return stream as never;
}

function capturedResponse() {
  const state = { statusCode: 0, body: '' };
  return {
    state,
    res: {
      set statusCode(value: number) {
        state.statusCode = value;
      },
      get statusCode() {
        return state.statusCode;
      },
      setHeader() {},
      end(chunk?: string) {
        state.body = chunk ?? '';
      }
    } as never
  };
}

describe('encounter PIX through Pagar.me on PostgreSQL', () => {
  it('dispatches, verifies the provider confirmation and settles the billing exactly once', async () => {
    const pool = getTestPool();
    const fixture = await createPagarMeAttempt();
    const providerRequests: Array<{ headers: Headers; body: Record<string, unknown> }> = [];
    const chargeId = `qr_${fixture.attemptId.slice(0, 8)}`;

    // 1. Dispatch creates the real charge with the stable key and metadata.
    const dispatch = createExternalPixPaymentDispatchRuntime({
      pool,
      environment: 'production',
      workerId: 'pix-pagarme-test',
      apiKey: 'sk_test',
      pixKey: 'pix@clinic.test',
      fetchImpl: (async (_url: string, init: RequestInit) => {
        providerRequests.push({
          headers: new Headers(init.headers),
          body: JSON.parse(String(init.body))
        });
        return Response.json({
          id: chargeId,
          qr_code: '000201pagarme',
          qr_code_base64: 'cXI=',
          expires_at: new Date(Date.now() + 30 * 60 * 1000).toISOString()
        });
      }) as typeof fetch
    });
    await expect(dispatch.dispatcher.processNext(fixture.accountId)).resolves.toMatchObject({
      status: 'dispatched',
      attemptId: fixture.attemptId
    });
    expect(providerRequests).toHaveLength(1);
    expect(providerRequests[0]?.headers.get('idempotency-key')).toBe(`cvg:pix:create:v1:${fixture.attemptId}`);
    const metadata = providerRequests[0]?.body.metadata as Record<string, string>;
    expect(metadata).toEqual({ cvg_account_id: fixture.accountId, cvg_attempt_id: fixture.attemptId });

    const afterDispatch = await pool.query(
      `SELECT attempt.state, attempt.provider_transaction_id, tx.provider
         FROM encounter_payment_attempts attempt
         JOIN pix_transactions tx ON tx.account_id = attempt.account_id AND tx.payment_attempt_id = attempt.id
        WHERE attempt.id = $1`,
      [fixture.attemptId]
    );
    expect(afterDispatch.rows).toEqual([
      { state: 'awaiting_confirmation', provider_transaction_id: chargeId, provider: 'pagarme' }
    ]);

    // 2. The webhook body is only a hint; the charge is re-read from the provider.
    const ingress = new DatabasePixProviderEventIngressRepository(pool);
    // The provider reports a stable paid_at; a late webhook is still valid.
    const paidAt = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const client = {
      getCharge: async (id: string) =>
        id === chargeId
          ? {
              id: chargeId,
              status: 'paid',
              amountCents: AMOUNT_CENTS,
              paidAt,
              metadata
            }
          : null
    };
    for (let delivery = 0; delivery < 2; delivery += 1) {
      const { res, state } = capturedResponse();
      await handlePagarMePixWebhookRoutes(
        PAGARME_PIX_WEBHOOK_PATH,
        webhookRequest({ type: 'charge.paid', data: { id: chargeId } }),
        res,
        `corr-pagarme-${delivery}`,
        { client, repository: ingress }
      );
      expect(state.statusCode).toBe(202);
      expect(JSON.parse(state.body).status).toBe(delivery === 0 ? 'created' : 'replayed');
    }

    // 3. External settlement applies the receipt once.
    const settlement = createPixProviderSettlementRuntime({
      enabled: true,
      externalProviders: true,
      allowSyntheticProviders: false,
      environment: 'production',
      pool,
      workerId: 'pix-settlement-pagarme-test'
    });
    expect(settlement).toBeDefined();
    await expect(settlement!.consumer.processNext(fixture.accountId)).resolves.toMatchObject({
      status: 'applied'
    });
    await expect(settlement!.consumer.processNext(fixture.accountId)).resolves.toMatchObject({
      status: 'idle'
    });

    const effects = await pool.query(
      `SELECT
         (SELECT COUNT(*)::int FROM pix_provider_events
           WHERE account_id = $1 AND provider = 'pagarme') AS receipts,
         (SELECT COUNT(*)::int FROM encounter_receivable_payments
           WHERE account_id = $1 AND external_reference_type = 'pix_transaction'
             AND external_reference_id = $2) AS payments,
         (SELECT COUNT(*)::int FROM encounter_non_cash_receipts
           WHERE account_id = $1 AND transaction_id = $2) AS proofs`,
      [fixture.accountId, fixture.attemptId]
    );
    expect(effects.rows[0]).toEqual({ receipts: 1, payments: 1, proofs: 1 });
  });

  it('never settles synthetic receipts through the external settlement runtime', async () => {
    const settlement = createPixProviderSettlementRuntime({
      enabled: true,
      externalProviders: true,
      allowSyntheticProviders: false,
      environment: 'production',
      pool: getTestPool(),
      workerId: 'pix-settlement-guard-test'
    });
    expect(settlement).toBeDefined();
    expect(() =>
      createPixProviderSettlementRuntime({
        enabled: true,
        allowSyntheticProviders: false,
        environment: 'production',
        pool: getTestPool()
      })
    ).toThrow(/synthetic provider capability/);
  });
});
