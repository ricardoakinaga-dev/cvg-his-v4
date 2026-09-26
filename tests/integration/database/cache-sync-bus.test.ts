import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { PostgresCacheSyncBus } from '../../../packages/shared/database/src/cache-sync-bus.js';
import type { CacheSyncEvent } from '../../../packages/shared/types/src/index.js';
import { getTestPool } from '../../db/db-admin.js';
import { TEST_DB_URL } from '../../setup/env.js';

const CHANNEL = `cvg_cache_sync_test_${process.pid}`;

function waitFor<T>(predicate: () => T | undefined, timeoutMs = 5_000): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const tick = () => {
      const value = predicate();
      if (value !== undefined) return resolve(value);
      if (Date.now() > deadline) return reject(new Error('condition not met in time'));
      setTimeout(tick, 25);
    };
    tick();
  });
}

describe('PostgresCacheSyncBus (R2-ARC-03)', () => {
  let replicaA: PostgresCacheSyncBus;
  let replicaB: PostgresCacheSyncBus;
  const receivedByA: CacheSyncEvent[] = [];
  const receivedByB: CacheSyncEvent[] = [];

  beforeAll(async () => {
    replicaA = new PostgresCacheSyncBus({ connectionString: TEST_DB_URL, channel: CHANNEL, originId: 'replica-a' });
    replicaB = new PostgresCacheSyncBus({ connectionString: TEST_DB_URL, channel: CHANNEL, originId: 'replica-b' });
    replicaA.subscribe('owner', (event) => {
      receivedByA.push(event);
    });
    replicaB.subscribe('owner', (event) => {
      receivedByB.push(event);
    });
    replicaB.subscribe('patient', (event) => {
      receivedByB.push(event);
    });
    await replicaA.start();
    await replicaB.start();
  });

  afterAll(async () => {
    await replicaA.stop();
    await replicaB.stop();
  });

  it('delivers an event published by one replica to the other, never back to itself', async () => {
    await replicaA.publish({ entity: 'owner', accountId: 'acc-1', id: 'owner-1', op: 'upsert' });
    const event = await waitFor(() => receivedByB.find((item) => item.id === 'owner-1'));
    expect(event).toMatchObject({ entity: 'owner', accountId: 'acc-1', id: 'owner-1', op: 'upsert', origin: 'replica-a' });
    expect(typeof event.emittedAt).toBe('string');
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(receivedByA.find((item) => item.id === 'owner-1')).toBeUndefined();
  });

  it('dispatches only to handlers subscribed for the entity', async () => {
    await replicaA.publish({ entity: 'patient', accountId: 'acc-1', id: 'patient-1', op: 'delete' });
    const event = await waitFor(() => receivedByB.find((item) => item.id === 'patient-1'));
    expect(event.entity).toBe('patient');
    expect(receivedByA.find((item) => item.id === 'patient-1')).toBeUndefined();
  });

  it('ignores malformed payloads on the channel', async () => {
    const pool = getTestPool();
    await pool.query('SELECT pg_notify($1, $2)', [CHANNEL, 'not json']);
    await pool.query('SELECT pg_notify($1, $2)', [CHANNEL, JSON.stringify({ entity: 'nope', id: 'x' })]);
    await replicaA.publish({ entity: 'owner', accountId: 'acc-1', id: 'owner-after-noise', op: 'upsert' });
    const event = await waitFor(() => receivedByB.find((item) => item.id === 'owner-after-noise'));
    expect(event.op).toBe('upsert');
    expect(receivedByB.some((item) => (item as { entity: string }).entity === 'nope')).toBe(false);
  });

  it('refuses payloads above the NOTIFY size limit', async () => {
    await expect(
      replicaA.publish({ entity: 'owner', accountId: 'acc-1', id: 'x'.repeat(8_000), op: 'upsert' })
    ).rejects.toThrow(/NOTIFY size limit/);
  });

  it('is transactional: a NOTIFY inside a rolled-back transaction is never delivered', async () => {
    const pool = getTestPool();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_notify($1, $2)', [
        CHANNEL,
        JSON.stringify({
          entity: 'owner',
          accountId: 'acc-1',
          id: 'owner-rolled-back',
          op: 'upsert',
          origin: 'replica-a',
          emittedAt: new Date().toISOString()
        })
      ]);
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
    await replicaA.publish({ entity: 'owner', accountId: 'acc-1', id: 'owner-committed', op: 'upsert' });
    await waitFor(() => receivedByB.find((item) => item.id === 'owner-committed'));
    expect(receivedByB.find((item) => item.id === 'owner-rolled-back')).toBeUndefined();
  });
});
