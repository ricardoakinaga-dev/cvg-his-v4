import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { createDatabaseClient } from '../../../packages/shared/database/src/index.js';
import { runWithTenantContext } from '../../../packages/tenant-context/src/index.js';
import type { AccountId, UserId } from '../../../packages/shared/types/src/index.js';
import { CounterSalesService } from '../../../packages/modules/counter-sales/src/index.js';
import { DatabaseCounterSalesRepository } from '../../../packages/modules/counter-sales/src/repositories/database-counter-sales.repository.js';
import { getTestPool } from '../../db/db-admin.js';
import { TEST_DB_URL } from '../../setup/env.js';
import { activateRlsRole, setAccountContext } from '../../helpers/rls-helpers.js';

const tenantId = randomUUID();
const accountA = randomUUID() as AccountId;
const accountB = randomUUID() as AccountId;
const userA = randomUUID() as UserId;
const userB = randomUUID() as UserId;

describe('cancellation report event source on PostgreSQL', () => {
  const pool = getTestPool();
  const repository = new DatabaseCounterSalesRepository();
  const service = new CounterSalesService({ repository });
  const within = <T>(accountId: AccountId, operation: () => Promise<T>) =>
    runWithTenantContext(
      { tenantId, accountId, correlationId: 'cancellation-report-test' },
      operation
    );

  beforeAll(async () => {
    createDatabaseClient(TEST_DB_URL);
    await pool.query(
      `INSERT INTO tenants (id, slug, name, status, activated_at)
       VALUES ($1, $2, 'Cancellation report tenant', 'active', now())`,
      [tenantId, `cancel-report-${tenantId}`]
    );
    await pool.query(
      `INSERT INTO accounts (id, tenant_id, slug, name)
       VALUES ($1, $3, $4, 'Cancellation report A'), ($2, $3, $5, 'Cancellation report B')`,
      [accountA, accountB, tenantId, `cancel-report-a-${accountA}`, `cancel-report-b-${accountB}`]
    );
    await pool.query(
      `INSERT INTO users (id, account_id, username, email, password_hash, full_name)
       VALUES ($1, $3, $5, $7, 'hash', 'Cancellation reporter A'),
              ($2, $4, $6, $8, 'hash', 'Cancellation reporter B')`,
      [
        userA,
        userB,
        accountA,
        accountB,
        `report-a-${userA}`,
        `report-b-${userB}`,
        `report-a-${userA}@example.test`,
        `report-b-${userB}@example.test`
      ]
    );
  });

  beforeEach(async () => {
    await pool.query('DELETE FROM audit_events WHERE account_id IN ($1, $2)', [accountA, accountB]);
  });

  afterAll(async () => {
    await pool.query('DELETE FROM audit_events WHERE account_id IN ($1, $2)', [accountA, accountB]);
    await pool.query('DELETE FROM accounts WHERE id IN ($1, $2)', [accountA, accountB]);
    await pool.query('DELETE FROM tenants WHERE id = $1', [tenantId]);
  });

  async function appendEvent(
    input: {
      accountId?: AccountId;
      id?: string;
      saleId?: string;
      time?: string;
      reason?: string;
      after?: Record<string, unknown> | null;
      action?: string;
      entityType?: string;
    } = {}
  ) {
    const accountId = input.accountId ?? accountA;
    const id = input.id ?? randomUUID();
    const saleId = input.saleId ?? randomUUID();
    const actorId = accountId === accountA ? userA : userB;
    const after =
      input.after === undefined
        ? {
            id: saleId,
            accountId,
            number: `CS-${saleId}`,
            status: 'cancelled',
            ownerId: null,
            total: 125.5,
            discountAmount: 4.5,
            paidAmount: 25.5,
            balanceDue: 100,
            createdAt: '2026-08-01T09:00:00.000Z'
          }
        : input.after;
    await pool.query(
      `INSERT INTO audit_events
       (id, account_id, entity_type, entity_id, action, actor_user_id, occurred_at,
        reason, correlation_id, after_json)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)`,
      [
        id,
        accountId,
        input.entityType ?? 'counter-sale',
        saleId,
        input.action ?? 'cancelled',
        actorId,
        input.time ?? '2026-09-04T12:00:00.000Z',
        input.reason ?? 'Cliente desistiu',
        `correlation-${id}`,
        after === null ? null : JSON.stringify(after)
      ]
    );
    return { id, saleId, after, actorId };
  }

  it('uses cancellation dates including exact UTC day boundaries with stable event ordering', async () => {
    const start = await appendEvent({ time: '2026-09-04T00:00:00.000Z' });
    const end = await appendEvent({ time: '2026-09-04T23:59:59.999Z' });
    const tied = await appendEvent({ time: '2026-09-04T23:59:59.999Z' });
    await appendEvent({ time: '2026-09-03T23:59:59.999Z' });
    await appendEvent({ time: '2026-09-05T00:00:00.000Z' });
    await appendEvent({ entityType: 'encounter' });
    await appendEvent({ action: 'updated' });
    const rows = await within(accountA, () =>
      service.listCancellationReportRows(accountA, {
        dateFrom: '2026-09-04',
        dateTo: '2026-09-04'
      })
    );
    expect(rows.map((row) => row.eventId)).toEqual([
      ...[end.id, tied.id].sort().reverse(),
      start.id
    ]);
    expect(rows.map((row) => row.total)).toEqual([125.5, 125.5, 125.5]);
  });

  it('retains event-time amounts after the live sale changes and across fresh service instances', async () => {
    const saleId = randomUUID();
    const original = {
      id: saleId,
      accountId: accountA,
      number: `ORIGINAL-${saleId}`,
      ownerId: null,
      patientId: null,
      encounterId: null,
      queueEntryId: null,
      billingRecordId: null,
      status: 'cancelled' as const,
      subtotal: 130,
      total: 125.5,
      discountAmount: 4.5,
      paidAmount: 25.5,
      balanceDue: 100,
      notes: null,
      openedByUserId: userA,
      closedByUserId: null,
      closedAt: null,
      createdAt: '2026-08-01T09:00:00.000Z',
      updatedAt: '2026-09-04T12:00:00.000Z'
    };
    await within(accountA, () => repository.create(original));
    await appendEvent({ saleId, after: original });
    await within(accountA, () => repository.update({ ...original, total: 900, number: 'CHANGED' }));
    const freshService = new CounterSalesService({
      repository: new DatabaseCounterSalesRepository()
    });
    const rows = await within(accountA, () => freshService.listCancellationReportRows(accountA));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      number: original.number,
      total: 125.5,
      discountAmount: 4.5,
      paidAmount: 25.5,
      balanceDue: 100,
      cancelledByUserId: userA,
      reason: 'Cliente desistiu'
    });
  });

  it('searches recorded reasons literally and without relying on live sale rows', async () => {
    const match = await appendEvent({ reason: 'Desconto 50%_OFF não autorizado' });
    await appendEvent({ reason: 'Desconto 50XOFF não autorizado' });
    const rows = await within(accountA, () =>
      service.listCancellationReportRows(accountA, {
        search: '50%_off'
      })
    );
    expect(rows.map((row) => row.eventId)).toEqual([match.id]);
  });

  it('fails explicitly on a legacy event with no snapshot rather than returning a partial report', async () => {
    await appendEvent();
    await appendEvent({ after: null });
    await expect(
      within(accountA, () => service.listCancellationReportRows(accountA))
    ).rejects.toThrow(/audit snapshot/);
  });

  it('rejects a snapshot from a different account even when the audit envelope matches', async () => {
    const saleId = randomUUID();
    await appendEvent({
      saleId,
      after: {
        id: saleId,
        accountId: accountB,
        number: 'FORGED',
        status: 'cancelled',
        ownerId: null,
        total: 10,
        discountAmount: 0,
        paidAmount: 0,
        balanceDue: 10
      }
    });
    await expect(
      within(accountA, () => service.listCancellationReportRows(accountA))
    ).rejects.toThrow(/identity/);
  });

  it('rejects invalid periods at the repository boundary', async () => {
    await expect(
      within(accountA, () =>
        repository.listCancellationReportRows(accountA, {
          dateFrom: '2026-02-30'
        })
      )
    ).rejects.toThrow(/ISO calendar date/);
  });

  it('isolates accounts through source context, explicit predicates and real RLS', async () => {
    const first = await appendEvent();
    const second = await appendEvent({ accountId: accountB });
    const rowsA = await within(accountA, () => service.listCancellationReportRows(accountA));
    const rowsB = await within(accountB, () => service.listCancellationReportRows(accountB));
    expect(rowsA.map((row) => row.eventId)).toEqual([first.id]);
    expect(rowsB.map((row) => row.eventId)).toEqual([second.id]);
    await expect(service.listCancellationReportRows(accountA)).rejects.toThrow(/context/);
    await expect(
      within(accountB, () => service.listCancellationReportRows(accountA))
    ).rejects.toThrow(/context/);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await activateRlsRole(client);
      await setAccountContext(client, accountA);
      const scoped = await client.query(
        'SELECT id FROM audit_events WHERE account_id IN ($1, $2)',
        [accountA, accountB]
      );
      expect(scoped.rows.map((row) => row.id)).toEqual([first.id]);
      await setAccountContext(client, null);
      const missing = await client.query(
        'SELECT id FROM audit_events WHERE account_id IN ($1, $2)',
        [accountA, accountB]
      );
      expect(missing.rows).toEqual([]);
    } finally {
      await client.query('ROLLBACK');
      client.release();
    }
  });

  it('reports overflow at 10001 events and accepts exactly 10000 without truncation', async () => {
    await pool.query(
      `INSERT INTO audit_events
       (id, account_id, entity_type, entity_id, action, actor_user_id, occurred_at,
        reason, correlation_id, after_json)
       SELECT gen_random_uuid(), $1::uuid, 'counter-sale', 'sale-' || n, 'cancelled', $2::uuid,
              '2026-09-04T12:00:00.000Z'::timestamptz, 'Volume fixture', 'volume-' || n,
              jsonb_build_object('id', 'sale-' || n, 'accountId', $1::text, 'number', 'CS-' || n,
                'status', 'cancelled', 'ownerId', NULL, 'total', 1, 'discountAmount', 0,
                'paidAmount', 0, 'balanceDue', 1)
         FROM generate_series(1, 10000) AS n`,
      [accountA, userA]
    );
    const rows = await within(accountA, () => service.listCancellationReportRows(accountA));
    expect(rows).toHaveLength(10_000);
    await appendEvent();
    await expect(
      within(accountA, () => service.listCancellationReportRows(accountA))
    ).rejects.toThrow(/maximum supported row count/);
  });
});
