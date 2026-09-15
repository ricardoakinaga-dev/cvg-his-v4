import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  DatabaseOutboxRepository,
  EventBusService,
  TenantUnitOfWorkConsumerGuard,
  readEventEnvelopeMetadata
} from '../../../packages/modules/event-bus/src/index.js';
import { getPool, createDatabaseClient, createTenantUnitOfWork } from '@cvg-his-v2/shared-database';
import { runWithTenantContext } from '@cvg-his-v2/tenant-context';
import type { AccountId } from '@cvg-his-v2/shared-types';
import { TEST_DB_URL } from '../../setup/env.js';

// PROD-004-R1/CP-01: the worker must consume the rows effectively migrated by
// 0172 (not freshly inserted valid envelopes), exactly once per row.
const TENANT_ID = '00000000-0000-0000-0000-000000000171';
const ACCOUNT_ID = '71717171-7171-4771-8771-717171717171' as AccountId;

function metadataFixture(
  id: string,
  metadata: Record<string, unknown> = {},
  accountId = ACCOUNT_ID
): string {
  return JSON.stringify({
    note: id,
    accountId,
    _meta: {
      eventId: id,
      eventType: 'legacy.migrated',
      schemaVersion: 1,
      occurredAt: '2026-09-13T00:00:00.000Z',
      accountId: ACCOUNT_ID,
      sourceModule: 'legacy',
      actor: { type: 'system', id: 'legacy-outbox' },
      correlationId: 'corr-r1',
      causationId: null,
      ...metadata
    }
  });
}

const UNICODE_EVENT_ID = '😀'.repeat(128);

const LEGACY_FIXTURES: ReadonlyArray<readonly [string, string]> = [
  ['r1-absent', '{"note":"no meta at all"}'],
  ['r1-empty', '{"note":"empty","_meta":{}}'],
  ['r1-nullmeta', '{"note":"null","_meta":null}'],
  ['r1-partial-id', '{"note":"partial","_meta":{"eventId":"r1-partial-id"}}'],
  ['r1-partial-null-id', '{"note":"partial null","_meta":{"eventId":null}}'],
  [
    'r1-partial-no-id',
    '{"note":"partial keep","_meta":{"actor":{"type":"system","id":"legacy-outbox"},"custom":"keep"}}'
  ],
  ['r1-empty-id', metadataFixture('')],
  ['r1-invalid-id', metadataFixture('r1-invalid-id', { eventId: 42 })],
  ['r1-top-account', metadataFixture('r1-top-account', {}, 'wrong-account')],
  ['r1-source-empty', metadataFixture('r1-source-empty', { sourceModule: '' })],
  ['r1-correlation-type', metadataFixture('r1-correlation-type', { correlationId: 42 })],
  [
    'r1-correlation-mismatch',
    metadataFixture('r1-correlation-mismatch', { correlationId: 'wrong-correlation' })
  ],
  [
    'r1-actor-whitespace',
    metadataFixture('r1-actor-whitespace', { actor: { type: 'system', id: '   ' } })
  ],
  ['r1-time-no-zone', metadataFixture('r1-time-no-zone', { occurredAt: '2026-01-15T10:00' })],
  [UNICODE_EVENT_ID, metadataFixture(UNICODE_EVENT_ID)]
];

const MIGRATION_0172 = readFileSync(
  resolve(
    dirname(fileURLToPath(import.meta.url)),
    '../../../packages/db/migrations/0172_outbox_event_envelope_full_validity_backfill.sql'
  ),
  'utf8'
);

describe('outbox legacy envelope worker (PROD-004-R1)', () => {
  const adminPool = new Pool({ connectionString: TEST_DB_URL });

  beforeAll(async () => {
    createDatabaseClient(TEST_DB_URL);
    await adminPool.query(
      `INSERT INTO tenants (id, slug, name, status)
       VALUES ($1, 'legacy-envelope-tenant', 'Legacy Envelope Tenant', 'active')
       ON CONFLICT (id) DO NOTHING`,
      [TENANT_ID]
    );
    await adminPool.query(
      `INSERT INTO accounts (id, tenant_id, slug, name)
       VALUES ($1, $2, 'legacy-envelope-account', 'Legacy Envelope Account')
       ON CONFLICT (id) DO NOTHING`,
      [ACCOUNT_ID, TENANT_ID]
    );
  });

  afterAll(async () => {
    await adminPool.end();
  });

  async function asTenant<T>(operation: () => Promise<T>): Promise<T> {
    return runWithTenantContext(
      { tenantId: TENANT_ID, accountId: ACCOUNT_ID, correlationId: randomUUID() },
      operation
    );
  }

  it('migrates partial legacy envelopes and consumes each migrated row exactly once', async () => {
    const received: string[] = [];
    await adminPool.query('DELETE FROM outbox_events WHERE account_id = $1', [ACCOUNT_ID]);
    await adminPool.query('DELETE FROM audit_events WHERE account_id = $1', [ACCOUNT_ID]);
    for (const [id, payload] of LEGACY_FIXTURES) {
      await adminPool.query(
        `INSERT INTO outbox_events
           (id, account_id, correlation_id, module_name, event_type, payload, status,
            attempts, max_attempts, scheduled_at, created_at)
         VALUES ($1, $2, 'corr-r1', 'legacy', 'legacy.migrated', $3::jsonb, 'pending', 0, 3, now(), now())`,
        [id, ACCOUNT_ID, payload]
      );
    }
    // Run the shipped migration artifact itself against the legacy rows.
    await adminPool.query(MIGRATION_0172);
    const migrated = await adminPool.query(
      'SELECT id, payload FROM outbox_events WHERE account_id = $1 ORDER BY id',
      [ACCOUNT_ID]
    );
    expect(migrated.rows).toHaveLength(LEGACY_FIXTURES.length);
    for (const row of migrated.rows) {
      // Every migrated row must be accepted by the real consumer parser.
      expect(() => readEventEnvelopeMetadata(row.payload)).not.toThrow();
      expect(row.payload._meta.eventId).toBe(row.id);
    }
    expect(
      migrated.rows.find((row) => row.id === 'r1-time-no-zone')?.payload._meta.occurredAt
    ).toBe('2026-01-15T10:00');
    // Second execution of the shipped 0172 statement repairs nothing further:
    // payload digests are a fixpoint.
    const digestBefore = (
      await adminPool.query(
        `SELECT md5(string_agg(payload::text, '' ORDER BY id)) AS d FROM outbox_events WHERE account_id = $1`,
        [ACCOUNT_ID]
      )
    ).rows[0].d;
    await adminPool.query(MIGRATION_0172);
    const digestAfter = (
      await adminPool.query(
        `SELECT md5(string_agg(payload::text, '' ORDER BY id)) AS d FROM outbox_events WHERE account_id = $1`,
        [ACCOUNT_ID]
      )
    ).rows[0].d;
    expect(digestAfter).toBe(digestBefore);

    const repository = new DatabaseOutboxRepository();
    const service = new EventBusService(
      repository,
      { baseMs: 1, maxMs: 1 },
      {
        workerId: 'legacy-envelope-worker',
        leaseMs: 60_000,
        consumerGuard: new TenantUnitOfWorkConsumerGuard(createTenantUnitOfWork(getPool()))
      }
    );
    service.subscribe('legacy-envelope-consumer', async (event) => {
      received.push(event.id);
      await getPool().query(
        `INSERT INTO audit_events
           (id, account_id, entity_type, entity_id, action, metadata, correlation_id,
            occurred_at, created_at)
         VALUES ($1, $2, 'outbox-test', $3, 'legacy-envelope-effect', '{}'::jsonb, $4, now(), now())`,
        [randomUUID(), ACCOUNT_ID, event.id, randomUUID()]
      );
    });
    const processed = await asTenant(() => service.processPending(20));
    expect(processed.map((event) => event.id).sort()).toEqual(
      LEGACY_FIXTURES.map(([id]) => id).sort()
    );
    expect([...received].sort()).toEqual(LEGACY_FIXTURES.map(([id]) => id).sort());
    const effects = await adminPool.query(
      `SELECT count(*)::int AS n, count(DISTINCT entity_id)::int AS distinct_ids
         FROM audit_events WHERE account_id = $1 AND action = 'legacy-envelope-effect'`,
      [ACCOUNT_ID]
    );
    expect(effects.rows[0]).toEqual({
      n: LEGACY_FIXTURES.length,
      distinct_ids: LEGACY_FIXTURES.length
    });
    const inboxBeforeRetry = await adminPool.query(
      `SELECT count(*)::int AS n FROM inbox_events
        WHERE account_id = $1 AND consumer_name = 'legacy-envelope-consumer'`,
      [ACCOUNT_ID]
    );
    expect(inboxBeforeRetry.rows[0].n).toBe(LEGACY_FIXTURES.length);

    // The normal EventBus replay is short-circuited by the completed command
    // idempotency record. Probe the same migrated event through the durable
    // inbox claim itself to prove the unique receipt also rejects duplicates.
    const probeEvent = processed[0];
    if (!probeEvent) throw new Error('worker did not return a migrated event for inbox probe');
    const inboxProbe = await asTenant(() =>
      createTenantUnitOfWork(getPool()).execute(
        {
          accountId: ACCOUNT_ID,
          actorUserId: 'system:event-bus',
          correlationId: probeEvent.correlationId,
          operation: 'event.consume.legacy-envelope-inbox-probe',
          idempotencyKey: `${probeEvent.id}:inbox-probe`
        },
        {
          eventId: probeEvent.id,
          eventType: probeEvent.eventType,
          consumerName: 'legacy-envelope-consumer'
        },
        async (transaction) => ({
          claimed: await transaction.inbox.claim('legacy-envelope-consumer', probeEvent.id)
        })
      )
    );
    expect(inboxProbe.value).toEqual({ claimed: false });

    // Requeue the same completed rows to exercise the durable inbox duplicate
    // path rather than merely proving that an empty queue stays empty.
    await adminPool.query(
      `UPDATE outbox_events
          SET status = 'pending', attempts = 0, processed_at = NULL, error = NULL,
              lease_owner = NULL, lease_token = NULL, lease_expires_at = NULL,
              scheduled_at = now()
        WHERE account_id = $1`,
      [ACCOUNT_ID]
    );
    const receivedBeforeRetry = [...received];
    const again = await asTenant(() => service.processPending(20));
    expect(again.map((event) => event.id).sort()).toEqual(LEGACY_FIXTURES.map(([id]) => id).sort());
    expect(received).toEqual(receivedBeforeRetry);
    const effectsAfter = await adminPool.query(
      `SELECT count(*)::int AS n FROM audit_events
        WHERE account_id = $1 AND action = 'legacy-envelope-effect'`,
      [ACCOUNT_ID]
    );
    expect(effectsAfter.rows[0].n).toBe(LEGACY_FIXTURES.length);
    const inboxAfterRetry = await adminPool.query(
      `SELECT count(*)::int AS n FROM inbox_events
        WHERE account_id = $1 AND consumer_name = 'legacy-envelope-consumer'`,
      [ACCOUNT_ID]
    );
    expect(inboxAfterRetry.rows[0].n).toBe(LEGACY_FIXTURES.length);
  });
});
