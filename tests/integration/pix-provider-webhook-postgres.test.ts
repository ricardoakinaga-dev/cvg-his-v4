import { createHmac, randomUUID } from 'node:crypto';
import { request } from 'node:http';

import { Pool } from 'pg';
import { afterAll, afterEach, describe, expect, it } from 'vitest';

import { DatabasePixProviderEventIngressRepository } from '../../apps/api/src/pix-provider-event-ingress-repository.js';
import { createApiServer } from '../../apps/api/src/server.js';
import { getTestPool } from '../db/db-admin.js';
import { TEST_DB_URL } from '../setup/env.js';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';
const KEY_ID = 'local-key-01';
const SECRET = Buffer.alloc(32, 0x42);
const PATH = '/webhooks/pix/synthetic/v1';

const servers: Array<ReturnType<typeof createApiServer>> = [];

interface Fixture {
  readonly accountId: string;
  readonly attemptId: string;
  readonly amountCents: number;
}

function webhookClaims(fixture: Fixture, providerTransactionId: string) {
  return {
    type: 'pix.payment.confirmed.v1' as const,
    accountId: fixture.accountId,
    attemptId: fixture.attemptId,
    providerTransactionId,
    amountCents: fixture.amountCents,
    currency: 'BRL' as const,
    confirmedAt: new Date().toISOString()
  };
}

function signedHeaders(
  rawBody: Buffer,
  eventId: string,
  timestamp = Math.floor(Date.now() / 1_000)
): Record<string, string> {
  const signature = createHmac('sha256', SECRET)
    .update(`v1.${timestamp}.${eventId}.`, 'ascii')
    .update(rawBody)
    .digest('hex');
  return {
    'content-type': 'application/json',
    'x-cvg-pix-key-id': KEY_ID,
    'x-cvg-pix-timestamp': String(timestamp),
    'x-cvg-pix-event-id': eventId,
    'x-cvg-pix-signature': `v1=${signature}`
  };
}

async function createFixture(): Promise<Fixture> {
  const pool = getTestPool();
  const accountId = randomUUID();
  const userId = randomUUID();
  const ownerId = randomUUID();
  const patientId = randomUUID();
  const encounterId = randomUUID();
  const billingRecordId = `pix-http-db-${randomUUID()}`;
  const attemptId = randomUUID();
  const suffix = accountId.replaceAll('-', '');
  const amountCents = 1_234;

  await pool.query(
    `INSERT INTO accounts (id, tenant_id, slug, name)
     VALUES ($1, $2, $3, 'PIX HTTP PostgreSQL account')`,
    [accountId, TENANT_ID, `pix-http-db-${suffix}`]
  );
  await pool.query(
    `INSERT INTO users (id, account_id, username, email, password_hash, full_name)
     VALUES ($1, $2, $3, $4, 'hash', 'PIX HTTP PostgreSQL operator')`,
    [userId, accountId, `pix_http_db_${suffix}`, `pix-http-db-${suffix}@example.com`]
  );
  await pool.query(
    `INSERT INTO owners (id, account_id, full_name) VALUES ($1, $2, 'PIX HTTP owner')`,
    [ownerId, accountId]
  );
  await pool.query(
    `INSERT INTO patients (id, account_id, owner_id, name, species)
     VALUES ($1, $2, $3, 'PIX HTTP patient', 'canine')`,
    [patientId, accountId, ownerId]
  );
  await pool.query(
    `INSERT INTO encounters (id, account_id, patient_id, owner_id, status, opened_by_user_id)
     VALUES ($1, $2, $3, $4, 'open', $5)`,
    [encounterId, accountId, patientId, ownerId, userId]
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
     ) VALUES ($1, $2, $3, $4, 'service', 'PIX HTTP item', 1, $5, $5, $6)`,
    [randomUUID(), accountId, billingRecordId, encounterId, amountCents / 100, userId]
  );
  await pool.query(
    `INSERT INTO encounter_payment_attempts (
       id, account_id, encounter_id, billing_record_id, requested_by_user_id,
       payment_method, provider_key, state, amount_cents, currency,
       request_key_hash, provider_idempotency_key, next_attempt_at
     ) VALUES ($1, $2, $3, $4, $5, 'pix', 'local-pix', 'awaiting_confirmation', $6, 'BRL', $7, $8, NULL)`,
    [
      attemptId,
      accountId,
      encounterId,
      billingRecordId,
      userId,
      amountCents,
      randomUUID().replaceAll('-', '').padEnd(64, 'a').slice(0, 64),
      `cvg:pix:create:v1:${attemptId}`
    ]
  );

  return { accountId, attemptId, amountCents };
}

async function post(port: number, body: Buffer, headers: Record<string, string>) {
  return new Promise<{ readonly status: number; readonly body: string }>((resolve, reject) => {
    const req = request(
      {
        host: '127.0.0.1',
        port,
        method: 'POST',
        path: PATH,
        headers: { ...headers, 'content-length': String(body.length) }
      },
      (response) => {
        const chunks: Buffer[] = [];
        response.on('data', (chunk: Buffer) => chunks.push(Buffer.from(chunk)));
        response.on('end', () =>
          resolve({
            status: response.statusCode ?? 0,
            body: Buffer.concat(chunks).toString('utf8')
          })
        );
      }
    );
    req.on('error', reject);
    req.end(body);
  });
}

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      (server) =>
        new Promise<void>((resolve, reject) => {
          server.close((error) => (error ? reject(error) : resolve()));
        })
    )
  );
});

afterAll(async () => {
  await getTestPool().end();
});

describe('synthetic PIX HTTP callback with durable PostgreSQL ingress', () => {
  it('returns 202 only after receipt and delivery are visible on another connection', async () => {
    const fixture = await createFixture();
    const repository = new DatabasePixProviderEventIngressRepository(getTestPool());
    const keyring = new Map([[KEY_ID, { accountId: fixture.accountId, secret: SECRET }]]);
    const server = createApiServer({
      appName: 'pix-http-postgres-test',
      environment: 'test',
      version: '0.1.0',
      authSecret: 'test-secret',
      accessTokenTtlSeconds: 900,
      refreshTokenTtlSeconds: 3_600,
      pixProviderWebhookSyntheticEnabled: true,
      pixProviderWebhookKeyring: keyring,
      pixProviderEventIngressRepository: repository
    } as never);
    servers.push(server);
    await server.ready;
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string')
      throw new Error('PIX HTTP test server did not bind');

    const providerEventId = `provider-event-${randomUUID()}`;
    const claims = webhookClaims(fixture, `provider-tx-${randomUUID()}`);
    const rawBody = Buffer.from(JSON.stringify(claims), 'utf8');
    const response = await post(address.port, rawBody, signedHeaders(rawBody, providerEventId));

    expect(response.status).toBe(202);
    expect(JSON.parse(response.body)).toEqual({ accepted: true });

    const observerPool = new Pool({ connectionString: TEST_DB_URL, max: 2 });
    try {
      const result = await observerPool.query<{
        readonly receipt_count: string;
        readonly delivery_count: string;
        readonly state: string;
      }>(
        `SELECT
           (SELECT COUNT(*) FROM pix_provider_events WHERE account_id = $1 AND provider_event_id = $2)::TEXT AS receipt_count,
           (SELECT COUNT(*) FROM pix_provider_event_deliveries d
             JOIN pix_provider_events e ON e.id = d.event_id
            WHERE e.account_id = $1 AND e.provider_event_id = $2)::TEXT AS delivery_count,
           (SELECT d.state FROM pix_provider_event_deliveries d
             JOIN pix_provider_events e ON e.id = d.event_id
            WHERE e.account_id = $1 AND e.provider_event_id = $2) AS state`,
        [fixture.accountId, providerEventId]
      );
      expect(result.rows[0]).toEqual({ receipt_count: '1', delivery_count: '1', state: 'pending' });
    } finally {
      await observerPool.end();
    }
  });

  it('returns 503 and rolls back the receipt when persistence fails after the receipt insert', async () => {
    const fixture = await createFixture();
    const repository = new DatabasePixProviderEventIngressRepository(getTestPool(), {
      onCheckpoint: async (checkpoint) => {
        if (checkpoint === 'after_receipt_insert') throw new Error('test failpoint');
      }
    });
    const keyring = new Map([[KEY_ID, { accountId: fixture.accountId, secret: SECRET }]]);
    const server = createApiServer({
      appName: 'pix-http-postgres-failpoint-test',
      environment: 'test',
      version: '0.1.0',
      authSecret: 'test-secret',
      accessTokenTtlSeconds: 900,
      refreshTokenTtlSeconds: 3_600,
      pixProviderWebhookSyntheticEnabled: true,
      pixProviderWebhookKeyring: keyring,
      pixProviderEventIngressRepository: repository
    } as never);
    servers.push(server);
    await server.ready;
    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    if (!address || typeof address === 'string')
      throw new Error('PIX HTTP test server did not bind');

    const providerEventId = `provider-event-${randomUUID()}`;
    const claims = webhookClaims(fixture, `provider-tx-${randomUUID()}`);
    const rawBody = Buffer.from(JSON.stringify(claims), 'utf8');
    const response = await post(address.port, rawBody, signedHeaders(rawBody, providerEventId));

    expect(response.status).toBe(503);
    expect(JSON.parse(response.body)).toMatchObject({ code: 'PIX_WEBHOOK_UNAVAILABLE' });

    const result = await getTestPool().query<{ readonly count: string }>(
      `SELECT COUNT(*)::TEXT AS count
         FROM pix_provider_events
        WHERE account_id = $1 AND provider_event_id = $2`,
      [fixture.accountId, providerEventId]
    );
    expect(result.rows[0]?.count).toBe('0');
  });
});
