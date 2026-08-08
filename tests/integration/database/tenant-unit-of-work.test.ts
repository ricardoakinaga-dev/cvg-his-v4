import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import {
  IdempotencyConflictError,
  createTenantUnitOfWork,
  runInTenantTransaction
} from '@cvg-his-v2/shared-database';
import { withTenantQueryExplicit } from '@cvg-his-v2/tenant-context';
import { activateRlsRole, setAccountContext } from '../../helpers/rls-helpers.js';
import { TEST_DB_URL } from '../../setup/env.js';

const TENANT_ID = '00000000-0000-0000-0000-000000000001';
const ACCOUNT_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const ACCOUNT_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
const ACTOR_ID = '11111111-1111-1111-1111-111111111111';

describe('tenant unit of work persistence', () => {
  const pool = new Pool({ connectionString: TEST_DB_URL });

  beforeAll(async () => {
    await pool.query(
      `INSERT INTO tenants (id, slug, name, status)
       VALUES ($1, 'uow-test-tenant', 'UOW Test Tenant', 'active')
       ON CONFLICT (id) DO NOTHING`,
      [TENANT_ID]
    );
    await pool.query(
      `INSERT INTO accounts (id, tenant_id, slug, name)
       VALUES ($1, $3, 'uow-account-a', 'UOW Account A'),
              ($2, $3, 'uow-account-b', 'UOW Account B')
       ON CONFLICT (id) DO NOTHING`,
      [ACCOUNT_A, ACCOUNT_B, TENANT_ID]
    );
  });

  afterAll(async () => {
    await pool.end();
  });

  it('replays a completed request without executing the command twice', async () => {
    const unitOfWork = createTenantUnitOfWork(pool);
    const idempotencyKey = randomUUID();
    let executions = 0;
    const context = {
      accountId: ACCOUNT_A,
      actorUserId: ACTOR_ID,
      correlationId: randomUUID(),
      operation: 'patient.create',
      idempotencyKey
    };

    const first = await unitOfWork.execute(context, { name: 'Rex', species: 'dog' }, async () => {
      executions += 1;
      return { id: 'patient-1', created: true };
    });
    const replay = await unitOfWork.execute(context, { species: 'dog', name: 'Rex' }, async () => {
      executions += 1;
      return { id: 'should-not-run', created: true };
    });

    expect(first).toEqual({ value: { id: 'patient-1', created: true }, replayed: false });
    expect(replay).toEqual({ value: { id: 'patient-1', created: true }, replayed: true });
    expect(executions).toBe(1);
  });

  it('executes concurrent requests with the same key only once', async () => {
    const unitOfWork = createTenantUnitOfWork(pool);
    const idempotencyKey = randomUUID();
    let executions = 0;
    let releaseFirst!: () => void;
    let signalStarted!: () => void;
    const firstMayFinish = new Promise<void>((resolve) => { releaseFirst = resolve; });
    const firstStarted = new Promise<void>((resolve) => { signalStarted = resolve; });
    const context = {
      accountId: ACCOUNT_A,
      actorUserId: ACTOR_ID,
      correlationId: randomUUID(),
      operation: 'patient.concurrent-create',
      idempotencyKey
    };

    const first = unitOfWork.execute(context, { name: 'Rex' }, async () => {
      executions += 1;
      signalStarted();
      await firstMayFinish;
      return { id: 'patient-concurrent' };
    });
    await firstStarted;
    const second = unitOfWork.execute(context, { name: 'Rex' }, async () => {
      executions += 1;
      return { id: 'should-not-run' };
    });
    await new Promise((resolve) => setTimeout(resolve, 25));
    releaseFirst();

    const results = await Promise.all([first, second]);
    expect(results).toEqual([
      { value: { id: 'patient-concurrent' }, replayed: false },
      { value: { id: 'patient-concurrent' }, replayed: true }
    ]);
    expect(executions).toBe(1);
  });

  it('rejects reuse of a key with a different payload', async () => {
    const unitOfWork = createTenantUnitOfWork(pool);
    const idempotencyKey = randomUUID();
    const context = {
      accountId: ACCOUNT_A,
      actorUserId: ACTOR_ID,
      correlationId: randomUUID(),
      operation: 'patient.update',
      idempotencyKey
    };

    await unitOfWork.execute(context, { name: 'Rex' }, async () => ({ ok: true }));

    await expect(
      unitOfWork.execute(context, { name: 'Max' }, async () => ({ ok: true }))
    ).rejects.toBeInstanceOf(IdempotencyConflictError);
  });

  it('rolls back outbox and idempotency state when the command fails', async () => {
    const unitOfWork = createTenantUnitOfWork(pool);
    const idempotencyKey = randomUUID();
    const eventId = randomUUID();

    await expect(
      unitOfWork.execute(
        {
          accountId: ACCOUNT_A,
          actorUserId: ACTOR_ID,
          correlationId: randomUUID(),
          operation: 'billing.close',
          idempotencyKey
        },
        { billingId: 'bill-1' },
        async (transaction) => {
          await transaction.outbox.append({
            id: eventId,
            moduleName: 'billing',
            eventType: 'billing.closed',
            payload: { billingId: 'bill-1' }
          });
          throw new Error('injected failure');
        }
      )
    ).rejects.toThrow('injected failure');

    const idempotency = await pool.query(
      'SELECT id FROM idempotency_requests WHERE account_id = $1 AND operation = $2 AND idempotency_key = $3',
      [ACCOUNT_A, 'billing.close', idempotencyKey]
    );
    const outbox = await pool.query('SELECT id FROM outbox_events WHERE id = $1', [eventId]);
    expect(idempotency.rowCount).toBe(0);
    expect(outbox.rowCount).toBe(0);
  });

  it('writes canonical tenant identity into transactional outbox payloads', async () => {
    const unitOfWork = createTenantUnitOfWork(pool);
    const eventId = randomUUID();

    await unitOfWork.execute(
      {
        accountId: ACCOUNT_A,
        actorUserId: ACTOR_ID,
        correlationId: randomUUID(),
        operation: 'outbox.canonical-tenant',
        idempotencyKey: randomUUID()
      },
      {},
      async (transaction) => {
        await transaction.outbox.append({
          id: eventId,
          moduleName: 'test',
          eventType: 'test.canonical-tenant',
          payload: { value: 1 }
        });
        return { eventId };
      }
    );

    const persisted = await pool.query(
      `SELECT payload ->> 'accountId' AS account_id,
              payload #>> '{_meta,accountId}' AS meta_account_id
       FROM outbox_events WHERE id = $1`,
      [eventId]
    );
    expect(persisted.rows).toEqual([{ account_id: ACCOUNT_A, meta_account_id: ACCOUNT_A }]);

    await expect(unitOfWork.execute(
      {
        accountId: ACCOUNT_A,
        actorUserId: ACTOR_ID,
        correlationId: randomUUID(),
        operation: 'outbox.invalid-tenant',
        idempotencyKey: randomUUID()
      },
      {},
      async (transaction) => {
        await transaction.outbox.append({
          moduleName: 'test',
          eventType: 'test.invalid-tenant',
          payload: { accountId: 42 }
        });
        return { ok: true };
      }
    )).rejects.toThrow('does not match transaction account');
  });

  it('claims an inbox event once per tenant and consumer', async () => {
    const unitOfWork = createTenantUnitOfWork(pool);
    const eventId = randomUUID();

    async function claim(accountId: string, key: string) {
      return unitOfWork.execute(
        {
          accountId,
          actorUserId: ACTOR_ID,
          correlationId: randomUUID(),
          operation: 'consumer.claim',
          idempotencyKey: key
        },
        { eventId },
        async (transaction) => ({ claimed: await transaction.inbox.claim('billing-consumer', eventId) })
      );
    }

    await expect(claim(ACCOUNT_A, randomUUID())).resolves.toMatchObject({ value: { claimed: true } });
    await expect(claim(ACCOUNT_A, randomUUID())).resolves.toMatchObject({ value: { claimed: false } });
    await expect(claim(ACCOUNT_B, randomUUID())).resolves.toMatchObject({ value: { claimed: true } });
  });

  it('reuses the same PostgreSQL transaction for nested work in the same tenant', async () => {
    const unitOfWork = createTenantUnitOfWork(pool);

    const result = await unitOfWork.execute(
      {
        accountId: ACCOUNT_A,
        actorUserId: ACTOR_ID,
        correlationId: randomUUID(),
        operation: 'transaction.nested',
        idempotencyKey: randomUUID()
      },
      {},
      async (transaction) => {
        const outer = await transaction.client.query<{ pid: number; txid: string }>(
          'SELECT pg_backend_pid() AS pid, txid_current()::text AS txid'
        );
        const inner = await runInTenantTransaction(pool, ACCOUNT_A, async (client) => {
          return client.query<{ pid: number; txid: string }>(
            'SELECT pg_backend_pid() AS pid, txid_current()::text AS txid'
          );
        });
        return { outer: outer.rows[0]!, inner: inner.rows[0]! };
      }
    );

    expect(result.value.inner).toEqual(result.value.outer);
  });

  it('reuses the unit of work connection through the existing tenant query helper', async () => {
    const unitOfWork = createTenantUnitOfWork(pool);

    const result = await unitOfWork.execute(
      {
        accountId: ACCOUNT_A,
        actorUserId: ACTOR_ID,
        correlationId: randomUUID(),
        operation: 'transaction.tenant-helper',
        idempotencyKey: randomUUID()
      },
      {},
      async (transaction) => {
        const direct = await transaction.client.query<{ pid: number; txid: string }>(
          'SELECT pg_backend_pid() AS pid, txid_current()::text AS txid'
        );
        const throughHelper = await withTenantQueryExplicit(pool, ACCOUNT_A, async (client) => {
          return client.query<{ pid: number; txid: string }>(
            'SELECT pg_backend_pid() AS pid, txid_current()::text AS txid'
          );
        });
        return { direct: direct.rows[0]!, throughHelper: throughHelper.rows[0]! };
      }
    );

    expect(result.value.throughHelper).toEqual(result.value.direct);
  });

  it('rejects a nested transaction that attempts to change tenant', async () => {
    const unitOfWork = createTenantUnitOfWork(pool);

    await expect(
      unitOfWork.execute(
        {
          accountId: ACCOUNT_A,
          actorUserId: ACTOR_ID,
          correlationId: randomUUID(),
          operation: 'transaction.cross-tenant',
          idempotencyKey: randomUUID()
        },
        {},
        async () => runInTenantTransaction(pool, ACCOUNT_B, async () => ({ ok: true }))
      )
    ).rejects.toThrow('cannot change account');
  });

  it('enforces RLS for idempotency and inbox records', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await activateRlsRole(client);
      await setAccountContext(client, ACCOUNT_A);
      const idempotency = await client.query(
        'SELECT DISTINCT account_id::text FROM idempotency_requests ORDER BY account_id::text'
      );
      const inbox = await client.query(
        'SELECT DISTINCT account_id::text FROM inbox_events ORDER BY account_id::text'
      );
      expect(idempotency.rows).toEqual([{ account_id: ACCOUNT_A }]);
      expect(inbox.rows).toEqual([{ account_id: ACCOUNT_A }]);
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  });

  it('runs the unit of work through a NOBYPASSRLS role', async () => {
    const restrictedUrl = new URL(TEST_DB_URL);
    restrictedUrl.searchParams.set('options', '-c role=cvg_test_rls');
    const restrictedPool = new Pool({ connectionString: restrictedUrl.toString() });
    try {
      const unitOfWork = createTenantUnitOfWork(restrictedPool);
      const result = await unitOfWork.execute(
        {
          accountId: ACCOUNT_A,
          actorUserId: ACTOR_ID,
          correlationId: randomUUID(),
          operation: 'transaction.restricted-role',
          idempotencyKey: randomUUID()
        },
        {},
        async (transaction) => {
          const role = await transaction.client.query<{ current_user: string; bypassrls: boolean }>(
            `SELECT current_user, rolbypassrls AS bypassrls
             FROM pg_roles
             WHERE rolname = current_user`
          );
          const otherTenant = await transaction.client.query<{ count: string }>(
            'SELECT count(*)::text AS count FROM idempotency_requests WHERE account_id = $1',
            [ACCOUNT_B]
          );
          return { role: role.rows[0]!, otherTenantCount: otherTenant.rows[0]!.count };
        }
      );

      expect(result.value).toEqual({
        role: { current_user: 'cvg_test_rls', bypassrls: false },
        otherTenantCount: '0'
      });
    } finally {
      await restrictedPool.end();
    }
  });
});
