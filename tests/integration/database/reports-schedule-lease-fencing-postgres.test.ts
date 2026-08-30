import { randomUUID } from 'node:crypto';

import { describe, expect, it, beforeAll, afterAll } from 'vitest';

import {
  DatabaseReportRepository,
  ReportsService,
  type ReportExportSummary
} from '../../../packages/modules/reports/src/index.js';
import {
  createDatabaseClient,
  getPool,
  runInTenantTransactionContext
} from '../../../packages/shared/database/src/index.js';
import type { AccountId, UserId } from '../../../packages/shared/types/src/index.js';
import { runWithTenantContext } from '../../../packages/tenant-context/src/index.js';
import { getTestPool } from '../../db/db-admin.js';
import { TEST_DB_URL } from '../../setup/env.js';

const TENANT_ID = randomUUID();
const ACCOUNT_ID = randomUUID() as AccountId;
const USER_ID = randomUUID() as UserId;

describe('report schedule lease fencing on PostgreSQL', () => {
  const pool = getTestPool();

  async function command<T>(operation: () => Promise<T> | T): Promise<T> {
    const correlationId = `reports-schedule-lease-${randomUUID()}`;
    return runWithTenantContext({ tenantId: TENANT_ID, accountId: ACCOUNT_ID, correlationId }, () =>
      runInTenantTransactionContext(
        getPool(),
        { accountId: ACCOUNT_ID, actorUserId: USER_ID, correlationId },
        operation
      )
    );
  }

  beforeAll(async () => {
    createDatabaseClient(TEST_DB_URL);
    await pool.query(
      `INSERT INTO tenants (id, slug, name, status, activated_at)
       VALUES ($1, $2, 'Reports schedule lease tenant', 'active', now())`,
      [TENANT_ID, `reports-schedule-lease-${TENANT_ID.slice(0, 12)}`]
    );
    await pool.query(
      `INSERT INTO accounts (id, tenant_id, slug, name, is_active)
       VALUES ($1, $2, $3, 'Reports schedule lease account', true)`,
      [ACCOUNT_ID, TENANT_ID, `reports-schedule-lease-${ACCOUNT_ID.slice(0, 12)}`]
    );
    await pool.query(
      `INSERT INTO users (id, account_id, username, email, password_hash, full_name)
       VALUES ($1, $2, $3, $4, 'test-hash', 'Reports schedule lease operator')`,
      [
        USER_ID,
        ACCOUNT_ID,
        `reports-schedule-lease-${USER_ID}`,
        `reports-schedule-lease-${USER_ID}@example.test`
      ]
    );
  });

  afterAll(async () => {
    await pool.query('DELETE FROM accounts WHERE id = $1', [ACCOUNT_ID]);
    await pool.query('DELETE FROM tenants WHERE id = $1', [TENANT_ID]);
  });

  it('rejects a stale schedule worker and allows only the current lease holder to finalize', async () => {
    const repository = new DatabaseReportRepository();
    const workerA = new ReportsService({ repository });
    const workerB = new ReportsService({ repository });
    const schedule = await command(() =>
      workerA.createSchedule(ACCOUNT_ID, USER_ID, {
        reportId: 'administrative-executive',
        name: 'Persisted schedule lease',
        frequency: 'daily'
      })
    );

    const [firstClaim] = await command(() =>
      workerA.claimDueSchedulesWithLease(
        ACCOUNT_ID,
        schedule.nextRunAt,
        'reports-schedule-worker-a',
        60_000
      )
    );
    expect(firstClaim?.schedule.id).toBe(schedule.id);
    expect(firstClaim?.claimToken).toBeTruthy();

    await command(() => workerB.hydrateFromDatabase(ACCOUNT_ID));
    await pool.query(
      `UPDATE report_schedules
          SET claim_until = now() - interval '1 second'
        WHERE account_id = $1 AND id = $2`,
      [ACCOUNT_ID, schedule.id]
    );
    const [takeoverClaim] = await command(() =>
      workerB.claimDueSchedulesWithLease(
        ACCOUNT_ID,
        schedule.nextRunAt,
        'reports-schedule-worker-b',
        60_000
      )
    );
    expect(takeoverClaim?.schedule.id).toBe(schedule.id);
    expect(takeoverClaim?.claimToken).not.toBe(firstClaim?.claimToken);

    await expect(
      command(() =>
        workerA.recordScheduleExecution(ACCOUNT_ID, schedule.id, {
          claimToken: firstClaim!.claimToken,
          executionId: 'stale-execution',
          ranAt: new Date().toISOString(),
          error: 'stale worker'
        })
      )
    ).rejects.toThrow(/Report schedule lease was lost/);

    const afterStaleWrite = await pool.query(
      `SELECT last_run_at, last_execution_id, last_error, claim_token, claim_worker_id
         FROM report_schedules
        WHERE account_id = $1 AND id = $2`,
      [ACCOUNT_ID, schedule.id]
    );
    expect(afterStaleWrite.rows[0]).toMatchObject({
      last_run_at: null,
      last_execution_id: null,
      last_error: null,
      claim_token: takeoverClaim!.claimToken,
      claim_worker_id: 'reports-schedule-worker-b'
    });

    const execution = await command(() =>
      workerB.execute(ACCOUNT_ID, USER_ID, {
        reportId: schedule.reportId,
        rows: []
      })
    );
    const finalized = await command(() =>
      workerB.recordScheduleExecution(ACCOUNT_ID, schedule.id, {
        claimToken: takeoverClaim!.claimToken,
        executionId: execution.id,
        ranAt: new Date().toISOString()
      })
    );
    expect(finalized.lastExecutionId).toBe(execution.id);
    expect(finalized.lastRunAt).toBeTruthy();

    const afterFinalize = await pool.query(
      `SELECT next_run_at, last_run_at, last_execution_id, claim_token, claim_until, claim_worker_id
         FROM report_schedules
        WHERE account_id = $1 AND id = $2`,
      [ACCOUNT_ID, schedule.id]
    );
    expect(afterFinalize.rows[0]).toMatchObject({
      last_execution_id: execution.id,
      claim_token: null,
      claim_until: null,
      claim_worker_id: null
    });
    expect(afterFinalize.rows[0]?.next_run_at).not.toEqual(schedule.nextRunAt);
  });

  it('fences scheduled delivery rows after a schedule lease takeover', async () => {
    let providerCalls = 0;
    const repository = new DatabaseReportRepository();
    const provider = {
      deliver: async () => {
        providerCalls += 1;
      }
    };
    const workerA = new ReportsService({ repository, deliveryProvider: provider });
    const workerB = new ReportsService({ repository, deliveryProvider: provider });
    const schedule = await command(() =>
      workerA.createSchedule(ACCOUNT_ID, USER_ID, {
        reportId: 'administrative-executive',
        name: 'Persisted delivery schedule fence',
        frequency: 'daily',
        format: 'csv',
        recipients: ['schedule-fenced@example.test']
      })
    );
    const [firstClaim] = await command(() =>
      workerA.claimDueSchedulesWithLease(
        ACCOUNT_ID,
        schedule.nextRunAt,
        'reports-delivery-schedule-worker-a',
        60_000
      )
    );
    expect(firstClaim?.schedule.id).toBe(schedule.id);

    const execution = await command(() =>
      workerA.execute(ACCOUNT_ID, USER_ID, {
        reportId: schedule.reportId,
        rows: [{ domain: 'reports', metric: 'schedule-fence', value: 1, status: 'tracked' }]
      })
    );
    const exported = await command(() =>
      workerA.exportExecution(ACCOUNT_ID, USER_ID, execution.id, 'csv')
    );
    await command(() => workerB.hydrateFromDatabase(ACCOUNT_ID));
    await pool.query(
      `UPDATE report_schedules
          SET claim_until = now() - interval '1 second'
        WHERE account_id = $1 AND id = $2`,
      [ACCOUNT_ID, schedule.id]
    );
    const [takeoverClaim] = await command(() =>
      workerB.claimDueSchedulesWithLease(
        ACCOUNT_ID,
        schedule.nextRunAt,
        'reports-delivery-schedule-worker-b',
        60_000
      )
    );
    expect(takeoverClaim?.claimToken).not.toBe(firstClaim?.claimToken);

    const deliverWithScheduleClaim = workerA.deliverExport.bind(workerA) as unknown as (
      accountId: AccountId,
      scheduleId: string,
      executionId: string,
      reportExport: ReportExportSummary,
      recipients: readonly string[],
      deliveredAt: string | undefined,
      existingDeliveryId: string | undefined,
      deliveryClaimToken: string | undefined,
      scheduleClaimToken: string
    ) => Promise<{ readonly deliveries: readonly { readonly status: string }[] }>;

    await expect(
      command(() =>
        deliverWithScheduleClaim(
          ACCOUNT_ID,
          schedule.id,
          execution.id,
          exported,
          schedule.recipients,
          undefined,
          undefined,
          undefined,
          firstClaim!.claimToken
        )
      )
    ).rejects.toThrow(/Report schedule lease was lost/);
    expect(providerCalls).toBe(0);
    const staleRows = await pool.query(
      `SELECT COUNT(*)::int AS count
         FROM report_schedule_deliveries
        WHERE account_id = $1 AND schedule_id = $2`,
      [ACCOUNT_ID, schedule.id]
    );
    expect(staleRows.rows[0]).toEqual({ count: 0 });

    const currentDelivery = await command(() =>
      (
        workerB.deliverExport.bind(workerB) as unknown as (
          accountId: AccountId,
          scheduleId: string,
          executionId: string,
          reportExport: ReportExportSummary,
          recipients: readonly string[],
          deliveredAt: string | undefined,
          existingDeliveryId: string | undefined,
          deliveryClaimToken: string | undefined,
          scheduleClaimToken: string
        ) => Promise<{ readonly deliveries: readonly { readonly status: string }[] }>
      )(
        ACCOUNT_ID,
        schedule.id,
        execution.id,
        exported,
        schedule.recipients,
        undefined,
        undefined,
        undefined,
        takeoverClaim!.claimToken
      )
    );
    expect(currentDelivery.deliveries[0]?.status).toBe('sent');
    expect(providerCalls).toBe(1);
    const currentRows = await pool.query(
      `SELECT COUNT(*)::int AS count, MAX(status) AS status
         FROM report_schedule_deliveries
        WHERE account_id = $1 AND schedule_id = $2`,
      [ACCOUNT_ID, schedule.id]
    );
    expect(currentRows.rows[0]).toEqual({ count: 1, status: 'sent' });
  });

  it('serializes delivery persistence with schedule takeover locks', async () => {
    const repository = new DatabaseReportRepository();
    const workerA = new ReportsService({ repository });
    const workerB = new ReportsService({ repository });
    const schedule = await command(() =>
      workerA.createSchedule(ACCOUNT_ID, USER_ID, {
        reportId: 'administrative-executive',
        name: 'Persisted concurrent delivery fence',
        frequency: 'daily',
        format: 'csv',
        recipients: ['schedule-concurrent@example.test']
      })
    );
    const [firstClaim] = await command(() =>
      workerA.claimDueSchedulesWithLease(
        ACCOUNT_ID,
        schedule.nextRunAt,
        'reports-concurrent-worker-a',
        60_000
      )
    );
    expect(firstClaim?.schedule.id).toBe(schedule.id);

    await command(() => workerB.hydrateFromDatabase(ACCOUNT_ID));
    const execution = await command(() =>
      workerA.execute(ACCOUNT_ID, USER_ID, {
        reportId: schedule.reportId,
        rows: [{ domain: 'reports', metric: 'concurrent-delivery', value: 1, status: 'tracked' }]
      })
    );
    const [seededDelivery] = await command(() =>
      workerA.recordScheduleDeliveries(ACCOUNT_ID, schedule.id, {
        executionId: execution.id,
        recipients: schedule.recipients,
        status: 'failed',
        format: 'csv',
        deliveredAt: schedule.nextRunAt,
        error: 'seed'
      })
    );
    expect(seededDelivery).toBeTruthy();
    if (!seededDelivery) throw new Error('Expected a seeded delivery row');

    const updatedDelivery = {
      ...seededDelivery,
      status: 'sent' as const,
      deliveredAt: new Date().toISOString(),
      error: null
    };
    const blocker = await pool.connect();
    let staleWrite: Promise<boolean> | undefined;
    let expireClaim: Promise<unknown> | undefined;
    try {
      await blocker.query('BEGIN');
      await blocker.query(
        `SELECT id
           FROM report_schedule_deliveries
          WHERE account_id = $1 AND id = $2
          FOR UPDATE`,
        [ACCOUNT_ID, seededDelivery.id]
      );
      const blockerPid = Number(
        (await blocker.query('SELECT pg_backend_pid()')).rows[0]?.pg_backend_pid
      );

      staleWrite = command(() =>
        repository.saveDeliveryForScheduleClaim(updatedDelivery, firstClaim!.claimToken)
      );
      let writeWaiting = false;
      for (let attempt = 0; attempt < 200; attempt += 1) {
        const waiting = await pool.query(
          `SELECT 1
             FROM pg_stat_activity
            WHERE pid <> $1
              AND query LIKE '%active_schedule_claim%'
              AND wait_event_type = 'Lock'`,
          [blockerPid]
        );
        if (waiting.rowCount > 0) {
          writeWaiting = true;
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      expect(writeWaiting).toBe(true);

      expireClaim = pool.query(
        `UPDATE report_schedules
            SET claim_until = now() - interval '1 second'
          WHERE account_id = $1 AND id = $2`,
        [ACCOUNT_ID, schedule.id]
      );
      await new Promise((resolve) => setTimeout(resolve, 100));

      const [takeoverWhileDeliveryBlocked] = await command(() =>
        workerB.claimDueSchedulesWithLease(
          ACCOUNT_ID,
          schedule.nextRunAt,
          'reports-concurrent-worker-b',
          60_000
        )
      );
      expect(takeoverWhileDeliveryBlocked).toBeUndefined();

      await blocker.query('ROLLBACK');
      await staleWrite;
      await expireClaim;

      const [takeoverAfterDelivery] = await command(() =>
        workerB.claimDueSchedulesWithLease(
          ACCOUNT_ID,
          schedule.nextRunAt,
          'reports-concurrent-worker-b',
          60_000
        )
      );
      expect(takeoverAfterDelivery?.claimToken).toBeTruthy();
      expect(takeoverAfterDelivery?.claimToken).not.toBe(firstClaim?.claimToken);
    } finally {
      await blocker.query('ROLLBACK').catch(() => undefined);
      blocker.release();
      await staleWrite?.catch(() => undefined);
      await expireClaim?.catch(() => undefined);
    }
  });
});
