import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import {
  DatabaseOutboxRepository,
  EventBusService,
  TenantUnitOfWorkConsumerGuard,
  type OutboxEvent,
  type OutboxRepository
} from '../../../packages/modules/event-bus/src/index.js';
import { createDatabaseClient, createTenantUnitOfWork, getPool } from '@cvg-his-v2/shared-database';
import { runWithTenantContext } from '@cvg-his-v2/tenant-context';
import type { AccountId } from '@cvg-his-v2/shared-types';
import { TEST_DB_URL } from '../../setup/env.js';

const TENANT_ID = '00000000-0000-0000-0000-000000000077';
const ACCOUNT_ID = '77777777-7777-4777-8777-777777777777' as AccountId;
const OTHER_ACCOUNT_ID = '77777777-7777-4777-8777-777777777778' as AccountId;

interface DeliveryClaim {
  readonly event: OutboxEvent;
  readonly leaseOwner: string;
  readonly leaseToken: string;
  readonly leaseVersion: number;
}

interface LeaseRepository {
  claimPending(input: {
    readonly limit: number;
    readonly leaseOwner: string;
    readonly leaseMs: number;
  }): Promise<readonly DeliveryClaim[]>;
  renewClaim(claim: DeliveryClaim, leaseMs: number): Promise<boolean>;
  completeClaim(claim: DeliveryClaim, processedAt: string): Promise<boolean>;
}

describe('outbox delivery leases', () => {
  const adminPool = new Pool({ connectionString: TEST_DB_URL });

  beforeAll(async () => {
    createDatabaseClient(TEST_DB_URL);
    await adminPool.query(
      `INSERT INTO tenants (id, slug, name, status)
       VALUES ($1, 'outbox-delivery-tenant', 'Outbox Delivery Tenant', 'active')
       ON CONFLICT (id) DO NOTHING`,
      [TENANT_ID]
    );
    await adminPool.query(
      `INSERT INTO accounts (id, tenant_id, slug, name)
       VALUES ($1, $2, 'outbox-delivery-account', 'Outbox Delivery Account')
       ON CONFLICT (id) DO NOTHING`,
      [ACCOUNT_ID, TENANT_ID]
    );
    await adminPool.query(
      `INSERT INTO accounts (id, tenant_id, slug, name)
       VALUES ($1, $2, 'outbox-delivery-other', 'Outbox Delivery Other Account')
       ON CONFLICT (id) DO NOTHING`,
      [OTHER_ACCOUNT_ID, TENANT_ID]
    );
  });

  beforeEach(async () => {
    await adminPool.query('DELETE FROM inbox_events WHERE account_id = $1', [ACCOUNT_ID]);
    await adminPool.query('DELETE FROM idempotency_requests WHERE account_id = $1', [ACCOUNT_ID]);
    await adminPool.query('DELETE FROM audit_events WHERE account_id = $1', [ACCOUNT_ID]);
    await adminPool.query('DELETE FROM outbox_events WHERE account_id = $1', [ACCOUNT_ID]);
    await adminPool.query('DELETE FROM outbox_events WHERE account_id = $1', [OTHER_ACCOUNT_ID]);
  });

  afterAll(async () => {
    await adminPool.end();
  });

  async function insertEvents(count: number): Promise<readonly string[]> {
    const ids = Array.from({ length: count }, () => randomUUID());
    for (const id of ids) {
      await adminPool.query(
        `INSERT INTO outbox_events
           (id, account_id, correlation_id, module_name, event_type, payload, status,
            attempts, max_attempts, scheduled_at, created_at)
         VALUES ($1, $2, $3, 'test', 'test.delivery', $4::jsonb, 'pending', 0, 3, now(), now())`,
        [
          id,
          ACCOUNT_ID,
          randomUUID(),
          JSON.stringify({ accountId: ACCOUNT_ID, id, _meta: { accountId: ACCOUNT_ID } })
        ]
      );
    }
    return ids;
  }

  async function asTenant<T>(operation: () => Promise<T>): Promise<T> {
    return runWithTenantContext(
      { tenantId: TENANT_ID, accountId: ACCOUNT_ID, correlationId: randomUUID() },
      operation
    );
  }

  it('gives concurrent workers disjoint claims', async () => {
    const ids = await insertEvents(4);
    const first = new DatabaseOutboxRepository() as unknown as LeaseRepository;
    const second = new DatabaseOutboxRepository() as unknown as LeaseRepository;

    const [claimsA, claimsB] = await asTenant(() =>
      Promise.all([
        first.claimPending({ limit: 2, leaseOwner: 'worker-a', leaseMs: 60_000 }),
        second.claimPending({ limit: 2, leaseOwner: 'worker-b', leaseMs: 60_000 })
      ])
    );

    const claimedA = claimsA.map((claim) => claim.event.id);
    const claimedB = claimsB.map((claim) => claim.event.id);
    expect(claimedA).toHaveLength(2);
    expect(claimedB).toHaveLength(2);
    expect(claimedA.filter((id) => claimedB.includes(id))).toEqual([]);
    expect(new Set([...claimedA, ...claimedB])).toEqual(new Set(ids));
    expect([...claimsA, ...claimsB].every((claim) => claim.leaseToken.length > 0)).toBe(true);
  });

  it('never reads or claims work belonging to another account', async () => {
    const foreignEventId = randomUUID();
    await adminPool.query(
      `INSERT INTO outbox_events
         (id, account_id, correlation_id, module_name, event_type, payload, status,
          attempts, max_attempts, scheduled_at, created_at)
       VALUES ($1, $2, $3, 'test', 'test.foreign', $4::jsonb, 'pending', 0, 3,
               now() - interval '1 minute', now() - interval '1 minute')`,
      [
        foreignEventId,
        OTHER_ACCOUNT_ID,
        randomUUID(),
        JSON.stringify({
          accountId: OTHER_ACCOUNT_ID,
          id: foreignEventId,
          _meta: { accountId: OTHER_ACCOUNT_ID }
        })
      ]
    );
    const [ownEventId] = await insertEvents(1);
    const repository = new DatabaseOutboxRepository();

    const foreignRead = await asTenant(() => repository.findById(ACCOUNT_ID, foreignEventId));
    const [claim] = await asTenant(() =>
      repository.claimPending({
        limit: 1,
        leaseOwner: 'tenant-isolation-worker',
        leaseMs: 60_000
      })
    );
    const foreignRow = await adminPool.query(
      'SELECT status, lease_owner FROM outbox_events WHERE id = $1',
      [foreignEventId]
    );

    expect(foreignRead).toBeNull();
    expect(claim.event.id).toBe(ownEventId);
    expect(foreignRow.rows[0]).toEqual({ status: 'pending', lease_owner: null });
  });

  it('scopes all administrative reads, counts and redrive to the explicit account', async () => {
    const foreignEventId = randomUUID();
    const foreignCorrelationId = randomUUID();
    await adminPool.query(
      `INSERT INTO outbox_events
         (id, account_id, correlation_id, module_name, event_type, payload, status,
          attempts, max_attempts, scheduled_at, created_at)
       VALUES ($1, $2, $3, 'test', 'test.foreign.failed', $4::jsonb, 'failed', 1, 1,
               now(), now())`,
      [
        foreignEventId,
        OTHER_ACCOUNT_ID,
        foreignCorrelationId,
        JSON.stringify({ accountId: OTHER_ACCOUNT_ID, id: foreignEventId })
      ]
    );
    const [ownEventId] = await insertEvents(1);
    const repository = new DatabaseOutboxRepository();

    await asTenant(async () => {
      expect(await repository.findById(ACCOUNT_ID, foreignEventId)).toBeNull();
      expect(await repository.findFailed(ACCOUNT_ID, 10)).toEqual([]);
      expect(await repository.findByCorrelationId(ACCOUNT_ID, foreignCorrelationId, 10)).toEqual(
        []
      );
      expect(await repository.reprocess(ACCOUNT_ID, foreignEventId)).toBeNull();
      expect((await repository.peekPending(ACCOUNT_ID, 10)).map((event) => event.id)).toEqual([
        ownEventId
      ]);
      expect(await repository.countByStatus(ACCOUNT_ID)).toEqual({
        pending: 1,
        retrying: 0,
        completed: 0,
        failed: 0,
        total: 1
      });
    });

    const foreignRow = await adminPool.query(
      'SELECT status, attempts FROM outbox_events WHERE id = $1',
      [foreignEventId]
    );
    expect(foreignRow.rows[0]).toEqual({ status: 'failed', attempts: 1 });
  });

  it('rejects an explicit administrative account that differs from ambient tenant context', async () => {
    const [eventId] = await insertEvents(1);
    const repository = new DatabaseOutboxRepository();

    await expect(asTenant(() => repository.findById(OTHER_ACCOUNT_ID, eventId))).rejects.toThrow(
      'Outbox administration account does not match tenant context'
    );
    await expect(asTenant(() => repository.countByStatus(OTHER_ACCOUNT_ID))).rejects.toThrow(
      'Outbox administration account does not match tenant context'
    );
  });

  it('bounds database correlation searches to the requested limit', async () => {
    const correlationId = randomUUID();
    const eventIds = [randomUUID(), randomUUID()];
    for (const eventId of eventIds) {
      await adminPool.query(
        `INSERT INTO outbox_events
           (id, account_id, correlation_id, module_name, event_type, payload, status,
            attempts, max_attempts, scheduled_at, created_at)
         VALUES ($1, $2, $3, 'test', 'test.correlation', $4::jsonb, 'completed', 1, 1,
                 now(), now())`,
        [eventId, ACCOUNT_ID, correlationId, JSON.stringify({ accountId: ACCOUNT_ID, id: eventId })]
      );
    }

    const repository = new DatabaseOutboxRepository();
    await asTenant(async () => {
      const events = await repository.findByCorrelationId(ACCOUNT_ID, correlationId, 1);
      expect(events).toHaveLength(1);
      expect(eventIds).toContain(events[0]?.id);
    });
  });

  it('allows takeover only after lease expiry', async () => {
    const [eventId] = await insertEvents(1);
    const first = new DatabaseOutboxRepository() as unknown as LeaseRepository;
    const second = new DatabaseOutboxRepository() as unknown as LeaseRepository;

    const [claimA] = await asTenant(() =>
      first.claimPending({
        limit: 1,
        leaseOwner: 'worker-a',
        leaseMs: 60_000
      })
    );
    const beforeExpiry = await asTenant(() =>
      second.claimPending({
        limit: 1,
        leaseOwner: 'worker-b',
        leaseMs: 60_000
      })
    );
    expect(beforeExpiry).toEqual([]);

    await adminPool.query(
      `UPDATE outbox_events SET lease_expires_at = now() - interval '1 second' WHERE id = $1`,
      [eventId]
    );
    const [claimB] = await asTenant(() =>
      second.claimPending({
        limit: 1,
        leaseOwner: 'worker-b',
        leaseMs: 60_000
      })
    );

    expect(claimB.event.id).toBe(claimA.event.id);
    expect(claimB.leaseToken).not.toBe(claimA.leaseToken);
    expect(claimB.leaseVersion).toBeGreaterThan(claimA.leaseVersion);
  });

  it('rejects completion by a stale lease owner', async () => {
    const [eventId] = await insertEvents(1);
    const first = new DatabaseOutboxRepository() as unknown as LeaseRepository;
    const second = new DatabaseOutboxRepository() as unknown as LeaseRepository;
    const [claimA] = await asTenant(() =>
      first.claimPending({
        limit: 1,
        leaseOwner: 'worker-a',
        leaseMs: 60_000
      })
    );
    await adminPool.query(
      `UPDATE outbox_events SET lease_expires_at = now() - interval '1 second' WHERE id = $1`,
      [eventId]
    );
    const [claimB] = await asTenant(() =>
      second.claimPending({
        limit: 1,
        leaseOwner: 'worker-b',
        leaseMs: 60_000
      })
    );

    await expect(asTenant(() => first.renewClaim(claimA, 60_000))).resolves.toBe(false);
    await expect(
      asTenant(() => first.completeClaim(claimA, new Date().toISOString()))
    ).resolves.toBe(false);
    const stillOwnedByB = await adminPool.query(
      'SELECT status, lease_owner, lease_token::text, processed_at FROM outbox_events WHERE id = $1',
      [eventId]
    );
    expect(stillOwnedByB.rows[0]).toMatchObject({
      status: 'processing',
      lease_owner: 'worker-b',
      lease_token: claimB.leaseToken,
      processed_at: null
    });

    await expect(
      asTenant(() => second.completeClaim(claimB, new Date().toISOString()))
    ).resolves.toBe(true);
    await expect(
      asTenant(() => second.completeClaim(claimB, new Date().toISOString()))
    ).resolves.toBe(false);
  });

  it('moves an expired final attempt to DLQ before claiming more work', async () => {
    const [eventId] = await insertEvents(1);
    await adminPool.query('UPDATE outbox_events SET max_attempts = 1 WHERE id = $1', [eventId]);
    const repository = new DatabaseOutboxRepository() as unknown as LeaseRepository;
    await asTenant(() =>
      repository.claimPending({
        limit: 1,
        leaseOwner: 'worker-final-attempt',
        leaseMs: 60_000
      })
    );
    await adminPool.query(
      `UPDATE outbox_events SET lease_expires_at = now() - interval '1 second' WHERE id = $1`,
      [eventId]
    );

    const next = await asTenant(() =>
      repository.claimPending({
        limit: 1,
        leaseOwner: 'worker-takeover',
        leaseMs: 60_000
      })
    );
    const row = await adminPool.query(
      `SELECT status, attempts, lease_owner, lease_token, lease_expires_at, error
       FROM outbox_events WHERE id = $1`,
      [eventId]
    );

    expect(next).toEqual([]);
    expect(row.rows[0]).toMatchObject({
      status: 'failed',
      attempts: 1,
      lease_owner: null,
      lease_token: null,
      lease_expires_at: null
    });
    expect(row.rows[0].error).toContain('Lease expired after final attempt');
  });

  it('does not repeat committed effects after losing the lease before outbox completion', async () => {
    const [eventId] = await insertEvents(1);
    const repository = new DatabaseOutboxRepository();
    const completeClaim = repository.completeClaim.bind(repository);
    let rejectFirstCompletion = true;
    const completionWindowRepository: OutboxRepository = {
      deliveryGuarantees: 'durable',
      create: repository.create.bind(repository),
      update: repository.update.bind(repository),
      findById: repository.findById.bind(repository),
      claimPending: repository.claimPending.bind(repository),
      renewClaim: repository.renewClaim.bind(repository),
      completeClaim: async (claim, processedAt) => {
        if (rejectFirstCompletion) {
          rejectFirstCompletion = false;
          return false;
        }
        return completeClaim(claim, processedAt);
      },
      retryClaim: repository.retryClaim.bind(repository),
      failClaim: repository.failClaim.bind(repository),
      reprocess: repository.reprocess.bind(repository),
      peekPending: repository.peekPending.bind(repository),
      findFailed: repository.findFailed.bind(repository),
      findByCorrelationId: repository.findByCorrelationId.bind(repository),
      countByStatus: repository.countByStatus.bind(repository)
    };
    let handlerCalls = 0;
    const createService = (workerId: string) => {
      const service = new EventBusService(
        completionWindowRepository,
        { baseMs: 1, maxMs: 1 },
        {
          workerId,
          leaseMs: 60_000,
          consumerGuard: new TenantUnitOfWorkConsumerGuard(createTenantUnitOfWork(getPool()))
        }
      );
      service.subscribe('completion-window-consumer', async () => {
        handlerCalls += 1;
        await getPool().query(
          `INSERT INTO audit_events
             (id, account_id, entity_type, entity_id, action, metadata, correlation_id,
              occurred_at, created_at)
           VALUES ($1, $2, 'outbox-test', $3, 'completion-window-effect', '{}'::jsonb,
                   $4, now(), now())`,
          [randomUUID(), ACCOUNT_ID, eventId, randomUUID()]
        );
      });
      return service;
    };

    const first = await asTenant(() => createService('worker-before-crash').processPending(1));
    const afterLostCompletion = await adminPool.query(
      'SELECT status FROM outbox_events WHERE id = $1',
      [eventId]
    );
    expect(first).toEqual([]);
    expect(afterLostCompletion.rows[0]).toEqual({ status: 'processing' });
    expect(handlerCalls).toBe(1);

    await adminPool.query(
      `UPDATE outbox_events SET lease_expires_at = now() - interval '1 second' WHERE id = $1`,
      [eventId]
    );
    const completed = await asTenant(() => createService('worker-after-crash').processPending(1));
    const effects = await adminPool.query(
      `SELECT COUNT(*)::int AS count
       FROM audit_events
       WHERE entity_id = $1 AND action = 'completion-window-effect'`,
      [eventId]
    );

    expect(completed.map((event) => event.id)).toEqual([eventId]);
    expect(handlerCalls).toBe(1);
    expect(effects.rows[0]).toEqual({ count: 1 });
  });

  it('commits each consumer receipt with its effect and skips it on partial retry', async () => {
    const [eventId] = await insertEvents(1);
    const repository = new DatabaseOutboxRepository();
    const service = new EventBusService(
      repository,
      { baseMs: 1, maxMs: 1 },
      {
        workerId: 'worker-inbox-integration',
        leaseMs: 60_000,
        consumerGuard: new TenantUnitOfWorkConsumerGuard(createTenantUnitOfWork(getPool()))
      }
    );
    let callsA = 0;
    let callsB = 0;
    const recordEffect = async (consumerName: string) => {
      await getPool().query(
        `INSERT INTO audit_events
           (id, account_id, entity_type, entity_id, action, metadata, correlation_id, occurred_at, created_at)
         VALUES ($1, $2, 'outbox-test', $3, 'consumer-effect', $4::jsonb, $5, now(), now())`,
        [
          randomUUID(),
          ACCOUNT_ID,
          eventId,
          JSON.stringify({ deliveryEventId: eventId, consumerName }),
          randomUUID()
        ]
      );
    };
    service.subscribe('consumer-a', async () => {
      callsA += 1;
      await recordEffect('consumer-a');
    });
    service.subscribe('consumer-b', async () => {
      callsB += 1;
      await recordEffect('consumer-b');
      if (callsB === 1) throw new Error('injected consumer failure');
    });

    await asTenant(() => service.processPending(1));
    await new Promise((resolve) => setTimeout(resolve, 10));
    const completed = await asTenant(() => service.processPending(1));

    expect(completed.map((event) => event.id)).toEqual([eventId]);
    expect(callsA).toBe(1);
    expect(callsB).toBe(2);
    const effects = await adminPool.query(
      `SELECT metadata ->> 'consumerName' AS consumer_name
       FROM audit_events
       WHERE metadata ->> 'deliveryEventId' = $1
       ORDER BY consumer_name`,
      [eventId]
    );
    expect(effects.rows).toEqual([
      { consumer_name: 'consumer-a' },
      { consumer_name: 'consumer-b' }
    ]);
    const receipts = await adminPool.query(
      `SELECT consumer_name
       FROM inbox_events
       WHERE account_id = $1 AND event_id = $2
       ORDER BY consumer_name`,
      [ACCOUNT_ID, eventId]
    );
    expect(receipts.rows).toEqual([
      { consumer_name: 'consumer-a' },
      { consumer_name: 'consumer-b' }
    ]);
  });
});
