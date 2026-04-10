import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '@cvg-his-v2/shared-database';
import { WebhooksService, DatabaseWebhookRepository } from '@cvg-his-v2/module-webhooks';
import { queryOne, cleanupRegistry, uuid } from '../helpers/db-helpers.js';

// ============================================================================
// Webhook Persistence Integration Tests — Onda 3.2
// Validates end-to-end webhook registration and delivery dispatch with real
// PostgreSQL persistence.
// ============================================================================

const TEST_ACCOUNT_ID = 'acc_test_001';
const TEST_USER_ID = '00000000-0000-0000-0000-000000000001';
const TEST_URL = 'https://example.com/webhook';

let pool: Pool;
let db: ReturnType<typeof drizzle>;
let webhookRepo: DatabaseWebhookRepository;
let webhooksService: WebhooksService;

beforeAll(async () => {
  pool = new Pool({
    connectionString:
      process.env.DATABASE_URL_TEST ??
      process.env.DATABASE_URL ??
      'postgres://postgres:postgres@localhost:5433/cvg_his_v2_test',
    max: 2
  });

  db = drizzle(pool, { schema });
  webhookRepo = new DatabaseWebhookRepository(db as never);
  webhooksService = new WebhooksService({ repository: webhookRepo });

  await cleanupWebhooks();
});

afterAll(async () => {
  await cleanupWebhooks();
  await pool.end();
});

async function cleanupWebhooks(): Promise<void> {
  await pool.query(
    `DELETE FROM webhook_deliveries WHERE webhook_id IN (SELECT id FROM webhooks WHERE account_id = $1)`,
    [TEST_ACCOUNT_ID]
  );
  await pool.query(`DELETE FROM webhooks WHERE account_id = $1`, [TEST_ACCOUNT_ID]);
  cleanupRegistry.reset();
}

// ============================================================================
// WH-001: Webhook registration and persistence
// ============================================================================
describe('WH-001 — Webhook Registration with Database Persistence', () => {
  beforeEach(async () => {
    await cleanupWebhooks();
  });

  afterEach(async () => {
    await cleanupWebhooks();
  });

  it('registers a webhook and persists it to the database', async () => {
    const webhook = await webhooksService.register(
      TEST_USER_ID as never,
      TEST_ACCOUNT_ID as never,
      {
        url: TEST_URL,
        events: ['billing.record.created'],
        secret: 'test-secret-123'
      }
    );

    expect(webhook.id).toBeDefined();
    expect(webhook.url).toBe(TEST_URL);
    expect(webhook.accountId).toBe(TEST_ACCOUNT_ID);
    expect(webhook.events).toContain('billing.record.created');
    expect(webhook.isActive).toBe(true);

    cleanupRegistry.register('webhooks', webhook.id);
  });

  it('retrieves a registered webhook by id from the database', async () => {
    const created = await webhooksService.register(
      TEST_USER_ID as never,
      TEST_ACCOUNT_ID as never,
      { url: TEST_URL, events: ['billing.record.created'] }
    );

    cleanupRegistry.register('webhooks', created.id);

    const retrieved = await webhooksService.get(created.id);

    expect(retrieved).not.toBeNull();
    expect(retrieved!.id).toBe(created.id);
    expect(retrieved!.url).toBe(TEST_URL);
  });

  it('lists all webhooks for an account from the database', async () => {
    const created1 = await webhooksService.register(
      TEST_USER_ID as never,
      TEST_ACCOUNT_ID as never,
      { url: `${TEST_URL}/1`, events: ['billing.record.created'] }
    );
    const created2 = await webhooksService.register(
      TEST_USER_ID as never,
      TEST_ACCOUNT_ID as never,
      { url: `${TEST_URL}/2`, events: ['billing.record.created'] }
    );

    cleanupRegistry.register('webhooks', created1.id);
    cleanupRegistry.register('webhooks', created2.id);

    const list = await webhooksService.list(TEST_ACCOUNT_ID as never);

    expect(list.length).toBeGreaterThanOrEqual(2);
  });

  it('updates a webhook and persists the change', async () => {
    const created = await webhooksService.register(
      TEST_USER_ID as never,
      TEST_ACCOUNT_ID as never,
      { url: TEST_URL, events: ['billing.record.created'] }
    );

    cleanupRegistry.register('webhooks', created.id);

    const updated = await webhooksService.update(created.id, {
      url: `${TEST_URL}/updated`,
      isActive: false
    });

    expect(updated).not.toBeNull();
    expect(updated!.url).toBe(`${TEST_URL}/updated`);
    expect(updated!.isActive).toBe(false);
  });

  it('soft-deletes a webhook by setting isActive to false', async () => {
    const created = await webhooksService.register(
      TEST_USER_ID as never,
      TEST_ACCOUNT_ID as never,
      { url: TEST_URL, events: ['billing.record.created'] }
    );

    cleanupRegistry.register('webhooks', created.id);

    const deleted = await webhooksService.delete(created.id);

    expect(deleted).toBe(true);

    const retrieved = await webhooksService.get(created.id);
    expect(retrieved!.isActive).toBe(false);
  });
});

// ============================================================================
// WH-002: Webhook delivery log persistence
// ============================================================================
describe('WH-002 — Webhook Delivery Dispatch and Delivery Log', () => {
  beforeEach(async () => {
    await cleanupWebhooks();
  });

  afterEach(async () => {
    await cleanupWebhooks();
  });

  it('dispatches an event and creates a delivery record in the database', async () => {
    const webhook = await webhooksService.register(
      TEST_USER_ID as never,
      TEST_ACCOUNT_ID as never,
      { url: 'http://localhost:99999/webhook', events: ['billing.record.created'] }
    );

    cleanupRegistry.register('webhooks', webhook.id);

    const dispatched = await webhooksService.dispatch(
      TEST_ACCOUNT_ID as never,
      'billing.record.created',
      {
        id: uuid(),
        accountId: TEST_ACCOUNT_ID,
        encounterId: uuid(),
        patientId: uuid(),
        ownerId: uuid(),
        status: 'pending',
        createdAt: new Date().toISOString()
      }
    );

    expect(dispatched).toBe(1);

    const deliveries = await webhooksService.listDeliveries(webhook.id);
    expect(deliveries.length).toBe(1);
    expect(deliveries[0].status).toBe('failed');
    expect(deliveries[0].event).toBe('billing.record.created');
  });

  it('does not dispatch to inactive webhooks', async () => {
    const webhook = await webhooksService.register(
      TEST_USER_ID as never,
      TEST_ACCOUNT_ID as never,
      { url: TEST_URL, events: ['billing.record.created'] }
    );

    cleanupRegistry.register('webhooks', webhook.id);

    await webhooksService.update(webhook.id, { isActive: false });

    const dispatched = await webhooksService.dispatch(
      TEST_ACCOUNT_ID as never,
      'billing.record.created',
      { id: uuid() }
    );

    expect(dispatched).toBe(0);
  });

  it('finds no webhooks for an event with no registered subscriptions', async () => {
    const dispatched = await webhooksService.dispatch(
      TEST_ACCOUNT_ID as never,
      'nonexistent.event',
      { id: uuid() }
    );

    expect(dispatched).toBe(0);
  });
});

// ============================================================================
// WH-003: Database constraint — webhook_deliveries references webhooks
// ============================================================================
describe('WH-003 — Delivery Log Cascade Delete', () => {
  beforeEach(async () => {
    await cleanupWebhooks();
  });

  afterEach(async () => {
    await cleanupWebhooks();
  });

  it('cascade deletes deliveries when webhook is deleted', async () => {
    const webhook = await webhooksService.register(
      TEST_USER_ID as never,
      TEST_ACCOUNT_ID as never,
      { url: 'http://localhost:99999/delivery-test', events: ['billing.record.created'] }
    );

    cleanupRegistry.register('webhooks', webhook.id);

    await webhooksService.dispatch(TEST_ACCOUNT_ID as never, 'billing.record.created', {
      id: uuid()
    });

    const beforeDelete = await queryOne<{ count: number }>(
      `SELECT COUNT(*)::int as count FROM webhook_deliveries WHERE webhook_id = $1`,
      [webhook.id]
    );
    expect(beforeDelete?.count).toBeGreaterThan(0);

    await webhooksService.delete(webhook.id);

    const afterDelete = await queryOne<{ count: number }>(
      `SELECT COUNT(*)::int as count FROM webhook_deliveries WHERE webhook_id = $1`,
      [webhook.id]
    );
    expect(afterDelete?.count).toBe(0);
  });
});
