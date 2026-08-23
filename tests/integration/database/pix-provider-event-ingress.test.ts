import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { DatabasePixProviderEventIngressRepository } from '../../../apps/api/src/pix-provider-event-ingress-repository.js';
import type { PixProviderWebhookClaims } from '../../../apps/api/src/pix-provider-webhook-payload.js';
import { getAdminPool, getTestPool } from '../../db/db-admin.js';
import { TEST_DB_NAME, TEST_DB_URL } from '../../setup/env.js';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';
const PROVIDER = 'local-pix';
const EVENT_TYPE = 'pix.payment.confirmed.v1';

interface Fixture {
  readonly accountId: string;
  readonly attemptId: string;
  readonly encounterId: string;
  readonly actorUserId: string;
  readonly amountCents: number;
}

function fingerprints(seed: string): { readonly body: string; readonly claims: string } {
  const body = seed.padStart(64, 'a').slice(0, 64);
  const claims = seed.padStart(64, 'b').slice(0, 64);
  return { body, claims };
}

function ingressClaims(
  fixture: Fixture,
  providerTransactionId = `provider-tx-${randomUUID()}`
): PixProviderWebhookClaims {
  return {
    type: 'pix.payment.confirmed.v1',
    accountId: fixture.accountId,
    attemptId: fixture.attemptId,
    providerTransactionId,
    amountCents: fixture.amountCents,
    currency: 'BRL',
    confirmedAt: new Date().toISOString()
  };
}

function ingressInput(fixture: Fixture, providerEventId = `provider-event-${randomUUID()}`) {
  const claims = ingressClaims(fixture);
  return {
    rawBody: Buffer.from(JSON.stringify(claims), 'utf8'),
    claims,
    providerEventId,
    correlationId: `corr-${randomUUID()}`
  };
}

async function createFixture(): Promise<Fixture> {
  const pool = getTestPool();
  const accountId = randomUUID();
  const actorUserId = randomUUID();
  const ownerId = randomUUID();
  const patientId = randomUUID();
  const encounterId = randomUUID();
  const billingRecordId = `pix-ingress-${randomUUID()}`;
  const attemptId = randomUUID();
  const suffix = accountId.replaceAll('-', '');
  const amountCents = 12_345;

  await pool.query(
    `INSERT INTO accounts (id, tenant_id, slug, name)
     VALUES ($1, $2, $3, 'PIX ingress test account')`,
    [accountId, TENANT_ID, `pix-ingress-${suffix}`]
  );
  await pool.query(
    `INSERT INTO users (id, account_id, username, email, password_hash, full_name)
     VALUES ($1, $2, $3, $4, 'hash', 'PIX ingress test operator')`,
    [actorUserId, accountId, `pix_ingress_${suffix}`, `pix-ingress-${suffix}@example.com`]
  );
  await pool.query(
    `INSERT INTO owners (id, account_id, full_name) VALUES ($1, $2, 'PIX ingress owner')`,
    [ownerId, accountId]
  );
  await pool.query(
    `INSERT INTO patients (id, account_id, owner_id, name, species)
     VALUES ($1, $2, $3, 'PIX ingress patient', 'canine')`,
    [patientId, accountId, ownerId]
  );
  await pool.query(
    `INSERT INTO encounters (
       id, account_id, patient_id, owner_id, status, opened_by_user_id
     ) VALUES ($1, $2, $3, $4, 'open', $5)`,
    [encounterId, accountId, patientId, ownerId, actorUserId]
  );
  await pool.query(
    `INSERT INTO billing_records (
       id, account_id, encounter_id, patient_id, owner_id, status, subtotal_amount, currency
     ) VALUES ($1, $2, $3, $4, $5, 'open', $6, 'BRL')`,
    [billingRecordId, accountId, encounterId, patientId, ownerId, amountCents / 100]
  );
  await pool.query(
    `INSERT INTO billing_items (
       id, account_id, billing_record_id, encounter_id, item_type, description,
       quantity, unit_price_amount, total_amount, created_by_user_id
     ) VALUES ($1, $2, $3, $4, 'service', 'PIX ingress item', 1, $5, $5, $6)`,
    [randomUUID(), accountId, billingRecordId, encounterId, amountCents / 100, actorUserId]
  );
  await pool.query(
    `INSERT INTO encounter_payment_attempts (
       id, account_id, encounter_id, billing_record_id, requested_by_user_id,
       payment_method, provider_key, state, amount_cents, currency,
       request_key_hash, provider_idempotency_key, next_attempt_at
     ) VALUES ($1, $2, $3, $4, $5, 'pix', $6, 'awaiting_confirmation', $7, 'BRL', $8, $9, NULL)`,
    [
      attemptId,
      accountId,
      encounterId,
      billingRecordId,
      actorUserId,
      PROVIDER,
      amountCents,
      fingerprints(randomUUID().replaceAll('-', '')).body,
      `cvg:pix:create:v1:${attemptId}`
    ]
  );

  return { accountId, attemptId, encounterId, actorUserId, amountCents };
}

async function insertReceipt(
  fixture: Fixture,
  providerEventId = `provider-event-${randomUUID()}`,
  seed = randomUUID().replaceAll('-', '')
): Promise<string> {
  const pool = getTestPool();
  const id = randomUUID();
  const hashes = fingerprints(seed);
  await pool.query(
    `INSERT INTO pix_provider_events (
       id, account_id, provider, provider_event_id, event_type,
       payment_attempt_id, provider_transaction_id, amount_cents, currency,
       confirmed_at, body_fingerprint, claims_fingerprint, correlation_id
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'BRL', $9, $10, $11, $12)`,
    [
      id,
      fixture.accountId,
      PROVIDER,
      providerEventId,
      EVENT_TYPE,
      fixture.attemptId,
      `provider-tx-${randomUUID()}`,
      fixture.amountCents,
      new Date().toISOString(),
      hashes.body,
      hashes.claims,
      `corr-${randomUUID()}`
    ]
  );
  return id;
}

describe('PIX provider event ingress schema', () => {
  beforeAll(async () => {
    await getTestPool().query('SELECT 1');
  });

  afterAll(async () => {
    await getTestPool().end();
  });

  it('creates an append-only receipt and exactly one pending delivery in one transaction', async () => {
    const fixture = await createFixture();
    const pool = getTestPool();
    const receiptId = randomUUID();
    const deliveryId = randomUUID();
    const hashes = fingerprints(randomUUID().replaceAll('-', ''));
    const eventId = `provider-event-${randomUUID()}`;
    const client = await pool.connect();

    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO pix_provider_events (
           id, account_id, provider, provider_event_id, event_type,
           payment_attempt_id, provider_transaction_id, amount_cents, currency,
           confirmed_at, body_fingerprint, claims_fingerprint, correlation_id
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'BRL', $9, $10, $11, $12)`,
        [
          receiptId,
          fixture.accountId,
          PROVIDER,
          eventId,
          EVENT_TYPE,
          fixture.attemptId,
          `provider-tx-${randomUUID()}`,
          fixture.amountCents,
          new Date().toISOString(),
          hashes.body,
          hashes.claims,
          `corr-${randomUUID()}`
        ]
      );
      await client.query(
        `INSERT INTO pix_provider_event_deliveries (
           id, account_id, event_id, state, attempts, max_attempts, next_attempt_at
         ) VALUES ($1, $2, $3, 'pending', 0, 8, now())`,
        [deliveryId, fixture.accountId, receiptId]
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

    const result = await pool.query<{
      readonly receipt_count: string;
      readonly delivery_count: string;
      readonly state: string;
    }>(
      `SELECT
         (SELECT COUNT(*) FROM pix_provider_events WHERE id = $1)::TEXT AS receipt_count,
         (SELECT COUNT(*) FROM pix_provider_event_deliveries WHERE event_id = $1)::TEXT AS delivery_count,
         (SELECT state FROM pix_provider_event_deliveries WHERE event_id = $1) AS state`,
      [receiptId]
    );
    expect(result.rows[0]).toEqual({ receipt_count: '1', delivery_count: '1', state: 'pending' });
  });

  it('allows distinct provider event IDs for one attempt without first-event-wins uniqueness', async () => {
    const fixture = await createFixture();
    await insertReceipt(fixture);
    await expect(insertReceipt(fixture)).resolves.toBeTruthy();

    const count = await getTestPool().query<{ readonly count: string }>(
      `SELECT COUNT(*)::TEXT AS count
         FROM pix_provider_events
        WHERE account_id = $1 AND payment_attempt_id = $2`,
      [fixture.accountId, fixture.attemptId]
    );
    expect(count.rows[0]?.count).toBe('2');
  });

  it('rejects duplicate account/provider event IDs', async () => {
    const fixture = await createFixture();
    const eventId = `provider-event-${randomUUID()}`;
    await insertReceipt(fixture, eventId);
    await expect(insertReceipt(fixture, eventId)).rejects.toThrow();
  });

  it('serializes twenty concurrent identical callbacks to one receipt and one delivery', async () => {
    const fixture = await createFixture();
    const repository = new DatabasePixProviderEventIngressRepository(getTestPool());
    const input = ingressInput(fixture);

    const results = await Promise.all(Array.from({ length: 20 }, () => repository.persist(input)));
    const created = results.filter((result) => result.status === 'created');
    const replayed = results.filter((result) => result.status === 'replayed');
    expect(created).toHaveLength(1);
    expect(replayed).toHaveLength(19);
    expect(new Set(results.map((result) => result.eventId)).size).toBe(1);
    expect(new Set(results.map((result) => result.deliveryId)).size).toBe(1);

    const counts = await getTestPool().query<{
      readonly receipts: string;
      readonly deliveries: string;
    }>(
      `SELECT
         (SELECT COUNT(*) FROM pix_provider_events WHERE account_id = $1 AND provider_event_id = $2)::TEXT AS receipts,
         (SELECT COUNT(*)
            FROM pix_provider_event_deliveries
           WHERE account_id = $1
             AND event_id = (SELECT id FROM pix_provider_events WHERE account_id = $1 AND provider_event_id = $2))::TEXT AS deliveries`,
      [fixture.accountId, input.providerEventId]
    );
    expect(counts.rows[0]).toEqual({ receipts: '1', deliveries: '1' });
  });

  it('rejects a receipt for a terminal attempt without leaving a row behind', async () => {
    const fixture = await createFixture();
    const providerEventId = `provider-event-${randomUUID()}`;
    await getTestPool().query(
      `UPDATE encounter_payment_attempts
          SET state = 'cancelled', updated_at = now()
        WHERE account_id = $1 AND id = $2`,
      [fixture.accountId, fixture.attemptId]
    );

    await expect(insertReceipt(fixture, providerEventId)).rejects.toThrow();
    const count = await getTestPool().query<{ readonly count: string }>(
      `SELECT COUNT(*)::TEXT AS count
         FROM pix_provider_events
        WHERE account_id = $1 AND provider_event_id = $2`,
      [fixture.accountId, providerEventId]
    );
    expect(count.rows[0]?.count).toBe('0');
  });

  it('rejects a receipt for a missing or cross-tenant attempt through the composite foreign key', async () => {
    const fixture = await createFixture();
    const hashes = fingerprints(randomUUID().replaceAll('-', ''));
    await expect(
      getTestPool().query(
        `INSERT INTO pix_provider_events (
           account_id, provider, provider_event_id, event_type,
           payment_attempt_id, provider_transaction_id, amount_cents, currency,
           confirmed_at, body_fingerprint, claims_fingerprint, correlation_id
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'BRL', now(), $8, $9, $10)`,
        [
          fixture.accountId,
          PROVIDER,
          `provider-event-${randomUUID()}`,
          EVENT_TYPE,
          randomUUID(),
          `provider-tx-${randomUUID()}`,
          fixture.amountCents,
          hashes.body,
          hashes.claims,
          `corr-${randomUUID()}`
        ]
      )
    ).rejects.toThrow();
  });

  it('rejects updates and deletes to a receipt', async () => {
    const fixture = await createFixture();
    const receiptId = await insertReceipt(fixture);
    await getTestPool().query(
      `INSERT INTO pix_provider_event_deliveries (account_id, event_id)
       VALUES ($1, $2)`,
      [fixture.accountId, receiptId]
    );

    await expect(
      getTestPool().query(
        `UPDATE pix_provider_events SET provider_transaction_id = 'tampered' WHERE id = $1`,
        [receiptId]
      )
    ).rejects.toThrow();
    await expect(
      getTestPool().query('DELETE FROM pix_provider_events WHERE id = $1', [receiptId])
    ).rejects.toThrow();
  });

  it('enforces RLS and the delivery lease invariant at the schema boundary', async () => {
    const tables = await getTestPool().query<{
      readonly relrowsecurity: boolean;
      readonly relforcerowsecurity: boolean;
    }>(
      `SELECT c.relrowsecurity, c.relforcerowsecurity
         FROM pg_class c
         JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public'
          AND c.relname IN ('pix_provider_events', 'pix_provider_event_deliveries')
        ORDER BY c.relname`
    );
    expect(tables.rows).toEqual([
      { relrowsecurity: true, relforcerowsecurity: true },
      { relrowsecurity: true, relforcerowsecurity: true }
    ]);

    const fixture = await createFixture();
    const receiptId = await insertReceipt(fixture);
    await getTestPool().query(
      `INSERT INTO pix_provider_event_deliveries (account_id, event_id)
       VALUES ($1, $2)`,
      [fixture.accountId, receiptId]
    );
    await expect(
      getTestPool().query(
        `UPDATE pix_provider_event_deliveries
            SET state = 'processing', lease_owner = NULL, lease_token = NULL, lease_expires_at = NULL
          WHERE event_id = $1`,
        [receiptId]
      )
    ).rejects.toThrow();
    await expect(
      getTestPool().query(
        `UPDATE pix_provider_event_deliveries
            SET state = 'pending', next_attempt_at = NULL
          WHERE event_id = $1`,
        [receiptId]
      )
    ).rejects.toThrow();

    const leaseToken = randomUUID();
    await getTestPool().query(
      `UPDATE pix_provider_event_deliveries
          SET state = 'processing',
              attempts = 1,
              next_attempt_at = NULL,
              lease_owner = 'pix-ingress-test',
              lease_token = $2,
              lease_version = 1,
              lease_expires_at = now() + interval '1 minute'
        WHERE event_id = $1`,
      [receiptId, leaseToken]
    );
    await getTestPool().query(
      `UPDATE pix_provider_event_deliveries
          SET state = 'applied',
              next_attempt_at = NULL,
              lease_owner = NULL,
              lease_token = NULL,
              lease_expires_at = NULL,
              applied_at = now()
        WHERE event_id = $1`,
      [receiptId]
    );
    const applied = await getTestPool().query<{ readonly state: string }>(
      'SELECT state FROM pix_provider_event_deliveries WHERE event_id = $1',
      [receiptId]
    );
    expect(applied.rows[0]?.state).toBe('applied');
  });

  it('proves cross-tenant receipt isolation under the non-bypass RLS role', async () => {
    const fixtureA = await createFixture();
    const fixtureB = await createFixture();
    const receiptA = await insertReceipt(fixtureA);
    const receiptB = await insertReceipt(fixtureB);
    const restrictedUrl = new URL(TEST_DB_URL);
    restrictedUrl.searchParams.set('options', '-c role=cvg_test_rls');
    const restrictedPool = new Pool({ connectionString: restrictedUrl.toString(), max: 1 });
    const client = await restrictedPool.connect();

    try {
      await client.query('BEGIN');
      await client.query("SELECT set_config('app.current_account_id', $1, true)", [
        fixtureA.accountId
      ]);
      const visible = await client.query<{ readonly id: string }>(
        `SELECT id::text
           FROM pix_provider_events
          WHERE id IN ($1, $2)
          ORDER BY id`,
        [receiptA, receiptB]
      );
      expect(visible.rows).toEqual([{ id: receiptA }]);

      await client.query('SAVEPOINT cross_tenant_receipt');
      await expect(
        client.query(
          `INSERT INTO pix_provider_events (
             account_id, provider, provider_event_id, event_type,
             payment_attempt_id, provider_transaction_id, amount_cents, currency,
             confirmed_at, body_fingerprint, claims_fingerprint, correlation_id
           ) VALUES ($1, 'local-pix', $2, 'pix.payment.confirmed.v1', $3, $4, $5, 'BRL', now(), $6, $7, $8)`,
          [
            fixtureB.accountId,
            `cross-tenant-${randomUUID()}`,
            fixtureB.attemptId,
            `provider-tx-${randomUUID()}`,
            fixtureB.amountCents,
            'a'.repeat(64),
            'b'.repeat(64),
            `corr-${randomUUID()}`
          ]
        )
      ).rejects.toThrow();
      await client.query('ROLLBACK TO SAVEPOINT cross_tenant_receipt');
      await client.query('COMMIT');
    } finally {
      client.release();
      await restrictedPool.end();
    }
  });

  it('reapplies the receipt/delivery ACL matrix for disposable runtime roles', async () => {
    process.env.DATABASE_URL ??= TEST_DB_URL;
    const { reconcileRuntimeRoles } =
      await import('../../../packages/db/src/reconcile-runtime-roles.js');
    const suffix = randomUUID().replaceAll('-', '');
    const apiRole = `pix_acl_api_${suffix}`;
    const workerRole = `pix_acl_worker_${suffix}`;
    const adminPool = getAdminPool();
    const testPool = getTestPool();
    const dbIdentifier = TEST_DB_NAME.replaceAll('"', '""');

    try {
      await adminPool.query(
        `CREATE ROLE "${apiRole}" NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS`
      );
      await adminPool.query(
        `CREATE ROLE "${workerRole}" NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION NOBYPASSRLS`
      );
      await adminPool.query(
        `GRANT CONNECT ON DATABASE "${dbIdentifier}" TO "${apiRole}", "${workerRole}"`
      );

      const client = await testPool.connect();
      try {
        await reconcileRuntimeRoles(client, { apiRole, workerRole });
        await reconcileRuntimeRoles(client, { apiRole, workerRole });
      } finally {
        client.release();
      }

      const privileges = await testPool.query<{
        readonly api_receipt_insert: boolean;
        readonly api_receipt_update: boolean;
        readonly api_receipt_delete: boolean;
        readonly api_receipt_truncate: boolean;
        readonly api_delivery_insert: boolean;
        readonly api_delivery_update: boolean;
        readonly api_delivery_delete: boolean;
        readonly api_delivery_truncate: boolean;
        readonly worker_receipt_select: boolean;
        readonly worker_receipt_insert: boolean;
        readonly worker_receipt_update: boolean;
        readonly worker_receipt_delete: boolean;
        readonly worker_receipt_truncate: boolean;
        readonly worker_delivery_insert: boolean;
        readonly worker_delivery_update: boolean;
        readonly worker_delivery_delete: boolean;
        readonly worker_delivery_truncate: boolean;
      }>(
        `SELECT
           has_table_privilege($1, 'public.pix_provider_events', 'INSERT') AS api_receipt_insert,
           has_table_privilege($1, 'public.pix_provider_events', 'UPDATE') AS api_receipt_update,
           has_table_privilege($1, 'public.pix_provider_events', 'DELETE') AS api_receipt_delete,
           has_table_privilege($1, 'public.pix_provider_events', 'TRUNCATE') AS api_receipt_truncate,
           has_table_privilege($1, 'public.pix_provider_event_deliveries', 'INSERT') AS api_delivery_insert,
           has_table_privilege($1, 'public.pix_provider_event_deliveries', 'UPDATE') AS api_delivery_update,
           has_table_privilege($1, 'public.pix_provider_event_deliveries', 'DELETE') AS api_delivery_delete,
           has_table_privilege($1, 'public.pix_provider_event_deliveries', 'TRUNCATE') AS api_delivery_truncate,
           has_table_privilege($2, 'public.pix_provider_events', 'SELECT') AS worker_receipt_select,
           has_table_privilege($2, 'public.pix_provider_events', 'INSERT') AS worker_receipt_insert,
           has_table_privilege($2, 'public.pix_provider_events', 'UPDATE') AS worker_receipt_update,
           has_table_privilege($2, 'public.pix_provider_events', 'DELETE') AS worker_receipt_delete,
           has_table_privilege($2, 'public.pix_provider_events', 'TRUNCATE') AS worker_receipt_truncate,
           has_table_privilege($2, 'public.pix_provider_event_deliveries', 'INSERT') AS worker_delivery_insert,
           has_table_privilege($2, 'public.pix_provider_event_deliveries', 'UPDATE') AS worker_delivery_update,
           has_table_privilege($2, 'public.pix_provider_event_deliveries', 'DELETE') AS worker_delivery_delete,
           has_table_privilege($2, 'public.pix_provider_event_deliveries', 'TRUNCATE') AS worker_delivery_truncate`,
        [apiRole, workerRole]
      );
      expect(privileges.rows[0]).toEqual({
        api_receipt_insert: true,
        api_receipt_update: false,
        api_receipt_delete: false,
        api_receipt_truncate: false,
        api_delivery_insert: true,
        api_delivery_update: false,
        api_delivery_delete: false,
        api_delivery_truncate: false,
        worker_receipt_select: true,
        worker_receipt_insert: false,
        worker_receipt_update: false,
        worker_receipt_delete: false,
        worker_receipt_truncate: false,
        worker_delivery_insert: false,
        worker_delivery_update: true,
        worker_delivery_delete: false,
        worker_delivery_truncate: false
      });
    } finally {
      await testPool.query(`DROP OWNED BY "${apiRole}"`);
      await testPool.query(`DROP OWNED BY "${workerRole}"`);
      await adminPool.query(`DROP ROLE IF EXISTS "${apiRole}"`);
      await adminPool.query(`DROP ROLE IF EXISTS "${workerRole}"`);
    }
  });

  it('persists receipt and delivery atomically, replays identical claims, and rejects divergence', async () => {
    const fixture = await createFixture();
    const repository = new DatabasePixProviderEventIngressRepository(getTestPool());
    const input = ingressInput(fixture);

    const created = await repository.persist(input);
    expect(created.status).toBe('created');

    const replayed = await repository.persist(input);
    expect(replayed).toEqual({ ...created, status: 'replayed' });

    const counts = await getTestPool().query<{
      readonly receipts: string;
      readonly deliveries: string;
    }>(
      `SELECT
         (SELECT COUNT(*) FROM pix_provider_events WHERE account_id = $1 AND provider_event_id = $2)::TEXT AS receipts,
         (SELECT COUNT(*) FROM pix_provider_event_deliveries WHERE account_id = $1 AND event_id = $3)::TEXT AS deliveries`,
      [fixture.accountId, input.providerEventId, created.eventId]
    );
    expect(counts.rows[0]).toEqual({ receipts: '1', deliveries: '1' });

    await expect(
      repository.persist({
        ...input,
        claims: { ...input.claims, amountCents: input.claims.amountCents + 1 }
      })
    ).rejects.toMatchObject({ code: 'PIX_PROVIDER_EVENT_INVALID_INPUT', statusCode: 400 });

    const divergentClaims = { ...input.claims, providerTransactionId: 'provider-tx-divergent' };
    await expect(
      repository.persist({
        ...input,
        claims: divergentClaims,
        rawBody: Buffer.from(JSON.stringify(divergentClaims), 'utf8')
      })
    ).rejects.toMatchObject({ code: 'PIX_PROVIDER_EVENT_CONFLICT', statusCode: 409 });

    const failpointInput = {
      ...input,
      providerEventId: `provider-event-${randomUUID()}`
    };
    const failingRepository = new DatabasePixProviderEventIngressRepository(getTestPool(), {
      onCheckpoint: (checkpoint) => {
        if (checkpoint === 'after_receipt_insert') throw new Error('synthetic failpoint');
      }
    });
    await expect(failingRepository.persist(failpointInput)).rejects.toThrow('synthetic failpoint');
    const rolledBack = await getTestPool().query<{ readonly count: string }>(
      `SELECT COUNT(*)::TEXT AS count
         FROM pix_provider_events
        WHERE account_id = $1 AND provider_event_id = $2`,
      [fixture.accountId, failpointInput.providerEventId]
    );
    expect(rolledBack.rows[0]?.count).toBe('0');

    const deliveryFailpointInput = {
      ...input,
      providerEventId: `provider-event-${randomUUID()}`
    };
    const failingAfterDeliveryRepository = new DatabasePixProviderEventIngressRepository(
      getTestPool(),
      {
        onCheckpoint: (checkpoint) => {
          if (checkpoint === 'after_delivery_insert')
            throw new Error('synthetic delivery failpoint');
        }
      }
    );
    await expect(failingAfterDeliveryRepository.persist(deliveryFailpointInput)).rejects.toThrow(
      'synthetic delivery failpoint'
    );
    const rolledBackDelivery = await getTestPool().query<{
      readonly receipts: string;
      readonly deliveries: string;
    }>(
      `SELECT
         (SELECT COUNT(*) FROM pix_provider_events WHERE account_id = $1 AND provider_event_id = $2)::TEXT AS receipts,
         (SELECT COUNT(*)
            FROM pix_provider_event_deliveries AS delivery
            JOIN pix_provider_events AS event
              ON event.account_id = delivery.account_id AND event.id = delivery.event_id
           WHERE event.account_id = $1 AND event.provider_event_id = $2)::TEXT AS deliveries`,
      [fixture.accountId, deliveryFailpointInput.providerEventId]
    );
    expect(rolledBackDelivery.rows[0]).toEqual({ receipts: '0', deliveries: '0' });
  });
});
