import { randomUUID } from 'node:crypto';

import { Pool, type Pool as PoolType } from 'pg';
import { afterAll, describe, expect, it } from 'vitest';

import { DatabasePixProviderSettlementDlqRepository } from '../../../apps/api/src/pix-provider-settlement-dlq-repository.js';
import { DatabasePixProviderEventDeliveryRepository } from '../../../apps/worker/src/jobs/pix-provider-event-delivery-repository.js';
import { getAdminPool, getTestPool } from '../../db/db-admin.js';
import { TEST_DB_NAME, TEST_DB_URL } from '../../setup/env.js';

interface Fixture {
  readonly accountId: string;
  readonly actorUserId: string;
  readonly eventId: string;
  readonly deliveryId: string;
  readonly attemptId: string;
}

async function createFixture(pool: PoolType): Promise<Fixture> {
  const tenantId = randomUUID();
  const accountId = randomUUID();
  const actorUserId = randomUUID();
  const ownerId = randomUUID();
  const patientId = randomUUID();
  const encounterId = randomUUID();
  const billingRecordId = `pix-dlq-${randomUUID()}`;
  const attemptId = randomUUID();
  const eventId = randomUUID();
  const deliveryId = randomUUID();
  const suffix = accountId.replaceAll('-', '');

  await pool.query(
    `INSERT INTO tenants (id, slug, name, status) VALUES ($1, $2, $3, 'active')`,
    [tenantId, `pix-dlq-${suffix}`, `PIX DLQ tenant ${suffix}`]
  );
  await pool.query(
    `INSERT INTO accounts (id, tenant_id, slug, name) VALUES ($1, $2, $3, $4)`,
    [accountId, tenantId, `pix-dlq-${suffix}`, `PIX DLQ account ${suffix}`]
  );
  await pool.query(
    `INSERT INTO users (id, account_id, username, email, password_hash, full_name)
     VALUES ($1, $2, $3, $4, 'hash', 'PIX DLQ operator')`,
    [actorUserId, accountId, `pix_dlq_${suffix}`, `${suffix}@example.com`]
  );
  await pool.query(
    `INSERT INTO owners (id, account_id, full_name) VALUES ($1, $2, 'PIX DLQ owner')`,
    [ownerId, accountId]
  );
  await pool.query(
    `INSERT INTO patients (id, account_id, owner_id, name, species)
     VALUES ($1, $2, $3, 'PIX DLQ patient', 'canine')`,
    [patientId, accountId, ownerId]
  );
  await pool.query(
    `INSERT INTO encounters (id, account_id, patient_id, owner_id, status, opened_by_user_id)
     VALUES ($1, $2, $3, $4, 'open', $5)`,
    [encounterId, accountId, patientId, ownerId, actorUserId]
  );
  await pool.query(
    `INSERT INTO billing_records (id, account_id, encounter_id, patient_id, owner_id, status, subtotal_amount, currency)
     VALUES ($1, $2, $3, $4, $5, 'open', 12.34, 'BRL')`,
    [billingRecordId, accountId, encounterId, patientId, ownerId]
  );
  await pool.query(
    `INSERT INTO billing_items (id, account_id, billing_record_id, encounter_id, item_type, description,
       quantity, unit_price_amount, total_amount, created_by_user_id)
     VALUES ($1, $2, $3, $4, 'service', 'PIX DLQ item', 1, 12.34, 12.34, $5)`,
    [randomUUID(), accountId, billingRecordId, encounterId, actorUserId]
  );
  await pool.query(
    `INSERT INTO encounter_payment_attempts (
       id, account_id, encounter_id, billing_record_id, requested_by_user_id,
       payment_method, provider_key, state, amount_cents, currency,
       request_key_hash, provider_idempotency_key, next_attempt_at
     ) VALUES ($1, $2, $3, $4, $5, 'pix', 'local-pix', 'awaiting_confirmation',
       1234, 'BRL', $6, $7, NULL)`,
    [
      attemptId,
      accountId,
      encounterId,
      billingRecordId,
      actorUserId,
      randomUUID().replaceAll('-', '').padEnd(64, 'a').slice(0, 64),
      `cvg:pix:create:v1:${attemptId}`
    ]
  );
  await pool.query(
    `INSERT INTO pix_provider_events (
       id, account_id, provider, provider_event_id, event_type,
       payment_attempt_id, provider_transaction_id, amount_cents, currency,
       confirmed_at, body_fingerprint, claims_fingerprint, correlation_id
     ) VALUES ($1, $2, 'local-pix', $3, 'pix.payment.confirmed.v1', $4, $5, 1234,
       'BRL', now(), $6, $7, $8)`,
    [
      eventId,
      accountId,
      `provider-event-${randomUUID()}`,
      attemptId,
      `provider-tx-${randomUUID()}`,
      'a'.repeat(64),
      'b'.repeat(64),
      `corr-${randomUUID()}`
    ]
  );
  await pool.query(
    `INSERT INTO pix_provider_event_deliveries (
       id, account_id, event_id, state, attempts, max_attempts,
       next_attempt_at, last_error_code, last_error_class
     ) VALUES ($1, $2, $3, 'reconciliation_required', 8, 8, NULL,
       'SETTLEMENT_APPLY_FAILED', 'terminal')`,
    [deliveryId, accountId, eventId]
  );

  return { accountId, actorUserId, eventId, deliveryId, attemptId };
}

describe('PIX settlement DLQ operator repository', () => {
  afterAll(async () => {
    await getTestPool().end();
  });

  it('lists terminal deliveries and redrives exactly once with an atomic audit', async () => {
    const pool = getTestPool();
    const fixture = await createFixture(pool);
    const repository = new DatabasePixProviderSettlementDlqRepository(pool);
    const settlementRepository = new DatabasePixProviderEventDeliveryRepository(pool);
    const beforeArtifacts = await pool.query<{ events: string; attempts: string }>(
      `SELECT
         (SELECT COUNT(*) FROM pix_provider_events WHERE account_id = $1)::text AS events,
         (SELECT COUNT(*) FROM encounter_payment_attempts WHERE account_id = $1)::text AS attempts`,
      [fixture.accountId]
    );

    const listed = await repository.list({
      accountId: fixture.accountId,
      state: 'reconciliation_required',
      limit: 10
    });
    expect(listed).toHaveLength(1);
    expect(listed[0]).toMatchObject({
      id: fixture.deliveryId,
      eventId: fixture.eventId,
      state: 'reconciliation_required',
      attempts: 8,
      maxAttempts: 8,
      lastErrorCode: 'SETTLEMENT_APPLY_FAILED'
    });
    await expect(
      settlementRepository.countReconciliationRequired(fixture.accountId)
    ).resolves.toBe(1);

    await expect(
      repository.redrive({
        accountId: fixture.accountId,
        deliveryId: fixture.deliveryId,
        eventId: fixture.eventId,
        actorUserId: fixture.actorUserId,
        correlationId: `corr-redrive-${randomUUID()}`,
        reason: 'manual reconciliation review'
      })
    ).resolves.toBe(true);
    await expect(
      settlementRepository.countReconciliationRequired(fixture.accountId)
    ).resolves.toBe(0);

    const state = await pool.query<{
      state: string;
      attempts: number;
      next_attempt_at: string | null;
      lease_owner: string | null;
      lease_token: string | null;
      lease_expires_at: string | null;
      lease_version: number;
      last_error_code: string | null;
      last_error_class: string | null;
      applied_at: string | null;
    }>(
      `SELECT state, attempts, next_attempt_at, lease_owner, lease_token, lease_expires_at,
              lease_version, last_error_code, last_error_class, applied_at
         FROM pix_provider_event_deliveries WHERE id = $1`,
      [fixture.deliveryId]
    );
    expect(state.rows[0]).toMatchObject({
      state: 'pending',
      attempts: 0,
      lease_owner: null,
      lease_token: null,
      lease_expires_at: null,
      lease_version: '1',
      last_error_code: null,
      last_error_class: null,
      applied_at: null
    });
    expect(state.rows[0]?.next_attempt_at).not.toBeNull();

    const audit = await pool.query<{ count: string; action: string; entity_id: string }>(
      `SELECT COUNT(*)::text AS count, MAX(action) AS action, MAX(entity_id) AS entity_id
         FROM audit_events
        WHERE account_id = $1 AND entity_type = 'pix_provider_event_delivery' AND entity_id = $2`,
      [fixture.accountId, fixture.deliveryId]
    );
    expect(audit.rows[0]).toEqual({ count: '1', action: 'pix_settlement_redrive', entity_id: fixture.deliveryId });

    await expect(
      repository.redrive({
        accountId: fixture.accountId,
        deliveryId: fixture.deliveryId,
        eventId: fixture.eventId,
        actorUserId: fixture.actorUserId,
        correlationId: `corr-redrive-duplicate-${randomUUID()}`,
        reason: 'duplicate redrive must be opaque'
      })
    ).resolves.toBe(false);

    const afterArtifacts = await pool.query<{ events: string; attempts: string }>(
      `SELECT
         (SELECT COUNT(*) FROM pix_provider_events WHERE account_id = $1)::text AS events,
         (SELECT COUNT(*) FROM encounter_payment_attempts WHERE account_id = $1)::text AS attempts`,
      [fixture.accountId]
    );
    expect(afterArtifacts.rows[0]).toEqual(beforeArtifacts.rows[0]);
    expect(
      (await pool.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count
           FROM audit_events
          WHERE account_id = $1 AND entity_type = 'pix_provider_event_delivery' AND entity_id = $2`,
        [fixture.accountId, fixture.deliveryId]
      )).rows[0]?.count
    ).toBe('1');
  });

  it('keeps cross-tenant delivery IDs opaque', async () => {
    const pool = getTestPool();
    const fixtureA = await createFixture(pool);
    const fixtureB = await createFixture(pool);
    const repository = new DatabasePixProviderSettlementDlqRepository(pool);

    await expect(
      repository.list({ accountId: fixtureA.accountId, state: 'reconciliation_required', limit: 10 })
    ).resolves.toHaveLength(1);
    await expect(
      repository.redrive({
        accountId: fixtureA.accountId,
        deliveryId: fixtureB.deliveryId,
        eventId: fixtureB.eventId,
        actorUserId: fixtureA.actorUserId,
        correlationId: `corr-cross-tenant-${randomUUID()}`,
        reason: 'cross tenant probe'
      })
    ).resolves.toBe(false);

    const state = await pool.query<{ state: string }>(
      'SELECT state FROM pix_provider_event_deliveries WHERE id = $1',
      [fixtureB.deliveryId]
    );
    expect(state.rows[0]?.state).toBe('reconciliation_required');
  });

  it('keeps direct API UPDATE denied while granting only the redrive function', async () => {
    const pool = getTestPool();
    const fixture = await createFixture(pool);
    const adminPool = getAdminPool();
    const suffix = randomUUID().replaceAll('-', '');
    const apiRole = `pix_dlq_api_${suffix}`;
    const workerRole = `pix_dlq_worker_${suffix}`;
    const dbIdentifier = TEST_DB_NAME.replaceAll('"', '""');

    try {
      await adminPool.query(
        `CREATE ROLE "${apiRole}" NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS`
      );
      await adminPool.query(
        `CREATE ROLE "${workerRole}" NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS`
      );
      await adminPool.query(`GRANT CONNECT ON DATABASE "${dbIdentifier}" TO "${apiRole}", "${workerRole}"`);

      const { reconcileRuntimeRoles } = await import('../../../packages/db/src/reconcile-runtime-roles.js');
      const client = await pool.connect();
      try {
        await reconcileRuntimeRoles(client, { apiRole, workerRole });
      } finally {
        client.release();
      }

      const privileges = await pool.query<{
        api_update: boolean;
        api_execute: boolean;
        worker_execute: boolean;
      }>(
        `SELECT
           has_table_privilege($1, 'public.pix_provider_event_deliveries', 'UPDATE') AS api_update,
           has_function_privilege($1, 'app.redrive_pix_provider_event_delivery(uuid,uuid,uuid,text,text)', 'EXECUTE') AS api_execute,
           has_function_privilege($2, 'app.redrive_pix_provider_event_delivery(uuid,uuid,uuid,text,text)', 'EXECUTE') AS worker_execute`,
        [apiRole, workerRole]
      );
      expect(privileges.rows[0]).toEqual({ api_update: false, api_execute: true, worker_execute: false });

      const apiUrl = new URL(TEST_DB_URL);
      apiUrl.searchParams.set('options', `-c role=${apiRole}`);
      const apiPool = new Pool({ connectionString: apiUrl.toString(), max: 1 });
      const apiClient = await apiPool.connect();
      try {
        await apiClient.query("SELECT set_config('app.current_account_id', $1, false)", [fixture.accountId]);
        await expect(
          apiClient.query(
            'UPDATE pix_provider_event_deliveries SET attempts = 3 WHERE id = $1',
            [fixture.deliveryId]
          )
        ).rejects.toThrow();
        await expect(
          apiClient.query(
            `SELECT app.redrive_pix_provider_event_delivery($1::uuid, $2::uuid, $3::uuid, $4, $5)`,
            [fixture.deliveryId, fixture.eventId, fixture.actorUserId, `corr-api-${randomUUID()}`, 'API function path']
          )
        ).resolves.toBeTruthy();
      } finally {
        apiClient.release();
        await apiPool.end();
      }
    } finally {
      await pool.query(`DROP OWNED BY "${apiRole}"`);
      await pool.query(`DROP OWNED BY "${workerRole}"`);
      await adminPool.query(`DROP ROLE IF EXISTS "${apiRole}"`);
      await adminPool.query(`DROP ROLE IF EXISTS "${workerRole}"`);
    }
  });
});
