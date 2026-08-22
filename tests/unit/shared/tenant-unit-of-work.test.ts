import { createHash } from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import type { Pool, PoolClient, QueryResult } from 'pg';

import {
  createTenantUnitOfWork,
  getTenantTransactionContext,
  hashIdempotencyPayload,
  runInTenantTransaction
} from '@cvg-his-v2/shared-database';

function queryResult(rows: unknown[] = []): QueryResult {
  return {
    command: '',
    rowCount: rows.length,
    oid: 0,
    fields: [],
    rows
  };
}

function createPoolDouble(options?: {
  failSetContext?: boolean;
  verificationMatches?: boolean;
  idempotencyMode?: 'inserted' | 'completed' | 'conflict' | 'in_progress' | 'missing';
}) {
  const queries: string[] = [];
  let lastRequestHash: unknown;
  const query = vi.fn(async (text: string, values?: unknown[]): Promise<QueryResult> => {
    queries.push(text.replace(/\s+/g, ' ').trim());
    if (options?.failSetContext && text.includes('set_config')) {
      throw new Error('tenant context failed');
    }
    if (text.includes("current_setting('app.current_account_id'")) {
      return queryResult([{ matches: options?.verificationMatches ?? true }]);
    }
    if (text.includes('INSERT INTO idempotency_requests')) {
      lastRequestHash = values?.[3];
      if (options?.idempotencyMode && options.idempotencyMode !== 'inserted') {
        return queryResult();
      }
      return queryResult([{
        request_hash: values?.[3],
        status: 'processing',
        response_body: null
      }]);
    }
    if (text.includes('SELECT request_hash')) {
      if (options?.idempotencyMode === 'completed') {
        return queryResult([{
          request_hash: lastRequestHash,
          status: 'completed',
          response_body: { replayed: true }
        }]);
      }
      if (options?.idempotencyMode === 'conflict') {
        return queryResult([{
          request_hash: 'different-request-hash',
          status: 'processing',
          response_body: null
        }]);
      }
      if (options?.idempotencyMode === 'in_progress') {
        return queryResult([{
          request_hash: lastRequestHash,
          status: 'processing',
          response_body: null
        }]);
      }
      return queryResult([]);
    }
    return queryResult();
  });
  const release = vi.fn();
  const client = {
    query,
    release,
    chain() {
      return this;
    }
  } as unknown as PoolClient;
  const pool = { connect: vi.fn(async () => client) } as unknown as Pool;
  return { pool, client, queries, query, release };
}

describe('TenantUnitOfWork', () => {
  it('exposes the active transaction context only while the command is executing', async () => {
    const { pool } = createPoolDouble();
    const unitOfWork = createTenantUnitOfWork(pool);

    expect(getTenantTransactionContext()).toBeUndefined();
    await unitOfWork.execute(
      {
        accountId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        actorUserId: '11111111-1111-1111-1111-111111111111',
        correlationId: 'corr-context',
        operation: 'test.context',
        idempotencyKey: 'idem-context'
      },
      {},
      async (transaction) => {
        expect(getTenantTransactionContext()).toBe(transaction);
        return { ok: true };
      }
    );
    expect(getTenantTransactionContext()).toBeUndefined();
  });

  it('starts one transaction and establishes tenant context before the command', async () => {
    const { pool, queries, release } = createPoolDouble();
    const unitOfWork = createTenantUnitOfWork(pool);

    await unitOfWork.execute(
      {
        accountId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        actorUserId: '11111111-1111-1111-1111-111111111111',
        correlationId: 'corr-1',
        operation: 'test.create',
        idempotencyKey: 'idem-1'
      },
      { name: 'Rex' },
      async () => ({ ok: true })
    );

    expect(queries[0]).toBe('BEGIN');
    expect(queries[1]).toContain("set_config('app.current_account_id'");
    expect(queries.at(-1)).toBe('COMMIT');
    expect(queries).not.toContain('ROLLBACK');
    expect(release).toHaveBeenCalledOnce();
  });

  it('rolls back and releases when tenant context cannot be established', async () => {
    const { pool, queries, release } = createPoolDouble({ failSetContext: true });
    const unitOfWork = createTenantUnitOfWork(pool);

    await expect(
      unitOfWork.execute(
        {
          accountId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          actorUserId: '11111111-1111-1111-1111-111111111111',
          correlationId: 'corr-2',
          operation: 'test.create',
          idempotencyKey: 'idem-2'
        },
        {},
        async () => ({ ok: true })
      )
    ).rejects.toThrow('tenant context failed');

    expect(queries).toContain('ROLLBACK');
    expect(queries).not.toContain('COMMIT');
    expect(release).toHaveBeenCalledOnce();
  });

  it('rejects a detached task after the transaction scope is closed', async () => {
    const { pool } = createPoolDouble();
    const unitOfWork = createTenantUnitOfWork(pool);
    let resume!: () => void;
    const gate = new Promise<void>((resolve) => { resume = resolve; });
    let detached!: Promise<unknown>;

    await unitOfWork.execute(
      {
        accountId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        actorUserId: '11111111-1111-1111-1111-111111111111',
        correlationId: 'corr-detached',
        operation: 'test.detached',
        idempotencyKey: 'idem-detached'
      },
      {},
      async () => {
        detached = gate.then(() => runInTenantTransaction(
          pool,
          'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          async () => ({ ok: true })
        ));
        return { ok: true };
      }
    );

    resume();
    await expect(detached).rejects.toThrow('no longer active');
  });

  it('rejects direct client access retained after commit', async () => {
    const { pool } = createPoolDouble();
    const unitOfWork = createTenantUnitOfWork(pool);
    let retainedClient!: PoolClient;

    await unitOfWork.execute(
      {
        accountId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        actorUserId: '11111111-1111-1111-1111-111111111111',
        correlationId: 'corr-retained-client',
        operation: 'test.retained-client',
        idempotencyKey: 'idem-retained-client'
      },
      {},
      async (transaction) => {
        retainedClient = (transaction.client as unknown as { chain(): PoolClient }).chain();
        expect(retainedClient).toBe(transaction.client);
        return { ok: true };
      }
    );

    expect(() => retainedClient.query('SELECT 1')).toThrow('no longer active');
    expect(() => retainedClient['connection']).toThrow('lifecycle is managed');
  });

  it('guards a client retained from runInTenantTransaction', async () => {
    const { pool } = createPoolDouble();
    let retainedClient!: PoolClient;

    await runInTenantTransaction(
      pool,
      'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      async (client) => {
        retainedClient = client;
        return { ok: true };
      }
    );

    expect(() => retainedClient.query('SELECT 1')).toThrow('no longer active');
  });

  it('rejects a nested transaction from a different pool', async () => {
    const { pool } = createPoolDouble();
    const { pool: otherPool } = createPoolDouble();
    const unitOfWork = createTenantUnitOfWork(pool);

    await expect(unitOfWork.execute(
      {
        accountId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        actorUserId: '11111111-1111-1111-1111-111111111111',
        correlationId: 'corr-pool',
        operation: 'test.pool',
        idempotencyKey: 'idem-pool'
      },
      {},
      async () => runInTenantTransaction(
        otherPool,
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        async () => ({ ok: true })
      )
    )).rejects.toThrow('cannot change database pool');
  });

  it('rejects a nested idempotent command', async () => {
    const { pool } = createPoolDouble();
    const unitOfWork = createTenantUnitOfWork(pool);
    const context = {
      accountId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
      actorUserId: '11111111-1111-1111-1111-111111111111',
      correlationId: 'corr-nested-command',
      operation: 'test.outer',
      idempotencyKey: 'idem-outer'
    };

    await expect(unitOfWork.execute(context, {}, async () => {
      await unitOfWork.execute(
        { ...context, operation: 'test.inner', idempotencyKey: 'idem-inner' },
        {},
        async () => ({ ok: true })
      );
      return { ok: true };
    })).rejects.toThrow('Nested idempotent unit of work commands are not supported');
  });
});

describe('hashIdempotencyPayload', () => {
  it('is stable across object key ordering without mutating the payload', () => {
    const left = { patient: { id: 'p1', alerts: ['allergy'] }, amount: 10 };
    const right = { amount: 10, patient: { alerts: ['allergy'], id: 'p1' } };
    const snapshot = structuredClone(left);

    const leftHash = hashIdempotencyPayload(left);
    const rightHash = hashIdempotencyPayload(right);

    expect(leftHash).toBe(rightHash);
    expect(leftHash).toBe(createHash('sha256').update(JSON.stringify({ amount: 10, patient: { alerts: ['allergy'], id: 'p1' } })).digest('hex'));
    expect(left).toEqual(snapshot);
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    'rejects non-finite JSON numbers: %s',
    (value) => {
      expect(() => hashIdempotencyPayload({ value })).toThrow('numbers must be finite');
    }
  );

  it('rejects circular and excessively deep payloads', () => {
    const circular: Record<string, unknown> = {};
    circular['self'] = circular;
    expect(() => hashIdempotencyPayload(circular as never)).toThrow('circular');

    let deep: Record<string, unknown> = {};
    const root = deep;
    for (let index = 0; index < 66; index += 1) {
      const next: Record<string, unknown> = {};
      deep['next'] = next;
      deep = next;
    }
    expect(() => hashIdempotencyPayload(root as never)).toThrow('maximum depth');
  });

  it('rejects sparse arrays', () => {
    const sparse = Array(2) as unknown[];
    expect(() => hashIdempotencyPayload(sparse as never)).toThrow('sparse arrays');
  });

  it('rejects unsupported values, non-plain objects and oversized requests', () => {
    expect(() => hashIdempotencyPayload(undefined as never)).toThrow('unsupported value');
    expect(() => hashIdempotencyPayload(new Date() as never)).toThrow('plain objects');
    expect(() => hashIdempotencyPayload({ value: 'x'.repeat(1024 * 1024) })).toThrow('exceeds 1 MiB');
    expect(() => hashIdempotencyPayload(Array.from({ length: 100_001 }, () => 1) as never))
      .toThrow('too complex');
  });
});

describe('TenantUnitOfWork validation and idempotency branches', () => {
  const baseContext = {
    accountId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    actorUserId: '11111111-1111-1111-1111-111111111111',
    correlationId: 'corr-validation',
    operation: 'test.validation',
    idempotencyKey: 'idem-validation'
  };

  it.each([
    ['accountId', { accountId: 'invalid' }],
    ['actorUserId', { actorUserId: '' }],
    ['correlationId', { correlationId: '' }],
    ['operation', { operation: '' }],
    ['idempotencyKey', { idempotencyKey: '' }]
  ])('rejects an invalid %s before opening a database connection', async (_label, patch) => {
    const { pool } = createPoolDouble();
    const unitOfWork = createTenantUnitOfWork(pool);
    await expect(unitOfWork.execute({ ...baseContext, ...patch }, {}, async () => ({ ok: true })))
      .rejects.toThrow();
    expect(pool.connect).not.toHaveBeenCalled();
  });

  it('rejects an invalid account in the direct transaction helper', async () => {
    const { pool } = createPoolDouble();
    await expect(runInTenantTransaction(pool, 'invalid', async () => ({ ok: true })))
      .rejects.toThrow('valid account id');
  });

  it('fails closed when PostgreSQL does not confirm the tenant context', async () => {
    const { pool, queries } = createPoolDouble({ verificationMatches: false });
    const unitOfWork = createTenantUnitOfWork(pool);
    await expect(unitOfWork.execute(baseContext, {}, async () => ({ ok: true })))
      .rejects.toThrow('Failed to establish tenant database context');
    expect(queries).toContain('ROLLBACK');
  });

  it('replays completed requests and rejects conflicts, in-progress and missing records', async () => {
    const completed = createTenantUnitOfWork(createPoolDouble({ idempotencyMode: 'completed' }).pool);
    await expect(completed.execute(baseContext, {}, async () => ({ ok: false })))
      .resolves.toEqual({ value: { replayed: true }, replayed: true });

    const conflict = createTenantUnitOfWork(createPoolDouble({ idempotencyMode: 'conflict' }).pool);
    await expect(conflict.execute(baseContext, {}, async () => ({ ok: true })))
      .rejects.toThrow('different request');

    const inProgress = createTenantUnitOfWork(createPoolDouble({ idempotencyMode: 'in_progress' }).pool);
    await expect(inProgress.execute(baseContext, {}, async () => ({ ok: true })))
      .rejects.toThrow('still processing');

    const missing = createTenantUnitOfWork(createPoolDouble({ idempotencyMode: 'missing' }).pool);
    await expect(missing.execute(baseContext, {}, async () => ({ ok: true })))
      .rejects.toThrow('could not be acquired');
  });

  it('executes transactional outbox, inbox and audit contracts with explicit metadata', async () => {
    const { pool, queries } = createPoolDouble();
    const unitOfWork = createTenantUnitOfWork(pool);
    const scheduledAt = new Date('2026-08-07T12:00:00.000Z');
    const result = await unitOfWork.execute(baseContext, {}, async (transaction) => {
      const outboxId = await transaction.outbox.append({
        id: 'outbox-explicit-id',
        moduleName: 'test-module',
        eventType: 'test.event',
        payload: { source: 'test', _meta: { trace: 'trace-1' } },
        maxAttempts: 5,
        scheduledAt
      });
      const claimed = await transaction.inbox.claim('consumer-test', 'event-test');
      const auditId = await transaction.audit.append({
        entityType: 'test-entity',
        entityId: 'entity-1',
        action: 'created',
        metadata: { source: 'test' },
        before: {},
        after: { ok: true },
        reason: 'coverage'
      });
      return { outboxId, claimed, auditId };
    });

    expect(result.replayed).toBe(false);
    expect(result.value.outboxId).toBe('outbox-explicit-id');
    expect(result.value.claimed).toBe(false);
    expect(result.value.auditId).toEqual(expect.any(String));
    expect(queries.some((query) => query.includes('INSERT INTO outbox_events'))).toBe(true);
    expect(queries.some((query) => query.includes('INSERT INTO inbox_events'))).toBe(true);
    expect(queries.some((query) => query.includes('INSERT INTO audit_events'))).toBe(true);
  });

  it('rejects invalid outbox names and oversized idempotency responses', async () => {
    const { pool } = createPoolDouble();
    const unitOfWork = createTenantUnitOfWork(pool);
    await expect(unitOfWork.execute(baseContext, {}, async (transaction) => {
      await transaction.outbox.append({
        moduleName: '',
        eventType: 'test.event',
        payload: {}
      });
      return { ok: true };
    })).rejects.toThrow('Outbox module name');

    await expect(unitOfWork.execute(
      { ...baseContext, idempotencyKey: 'idem-large-response' },
      {},
      async () => 'x'.repeat(256 * 1024)
    )).rejects.toThrow('exceeds 256 KiB');
  });

  it('reuses the active tenant transaction and rejects a different account', async () => {
    const { pool } = createPoolDouble();
    const unitOfWork = createTenantUnitOfWork(pool);
    await unitOfWork.execute(baseContext, {}, async () => {
      await expect(runInTenantTransaction(pool, baseContext.accountId, async () => ({ ok: true })))
        .resolves.toEqual({ ok: true });
      await expect(runInTenantTransaction(pool, 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', async () => ({ ok: true })))
        .rejects.toThrow('cannot change account');
      return { ok: true };
    });
  });
});
