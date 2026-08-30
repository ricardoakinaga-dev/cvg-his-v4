import { randomUUID } from 'node:crypto';

import { describe, expect, it, beforeAll, afterAll } from 'vitest';

import {
  DatabaseReportRepository,
  ReportScheduleLeaseLostError,
  ReportsService
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

describe('scheduled report execution/export lease fencing on PostgreSQL', () => {
  const pool = getTestPool();

  async function command<T>(operation: () => Promise<T> | T): Promise<T> {
    const correlationId = `reports-scheduled-artifacts-${randomUUID()}`;
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
       VALUES ($1, $2, 'Reports scheduled artifact tenant', 'active', now())`,
      [TENANT_ID, `reports-scheduled-artifacts-${TENANT_ID.slice(0, 12)}`]
    );
    await pool.query(
      `INSERT INTO accounts (id, tenant_id, slug, name, is_active)
       VALUES ($1, $2, $3, 'Reports scheduled artifact account', true)`,
      [ACCOUNT_ID, TENANT_ID, `reports-scheduled-artifacts-${ACCOUNT_ID.slice(0, 12)}`]
    );
    await pool.query(
      `INSERT INTO users (id, account_id, username, email, password_hash, full_name)
       VALUES ($1, $2, $3, $4, 'test-hash', 'Reports scheduled artifact operator')`,
      [
        USER_ID,
        ACCOUNT_ID,
        `reports-scheduled-artifacts-${USER_ID}`,
        `reports-scheduled-artifacts-${USER_ID}@example.test`
      ]
    );
  });

  afterAll(async () => {
    await pool.query('DELETE FROM accounts WHERE id = $1', [ACCOUNT_ID]);
    await pool.query('DELETE FROM tenants WHERE id = $1', [TENANT_ID]);
  });

  it('rejects stale artifact writes and refreshes deterministic ids after takeover', async () => {
    const repository = new DatabaseReportRepository();
    const workerA = new ReportsService({ repository });
    const workerB = new ReportsService({ repository });
    const schedule = await command(() =>
      workerA.createSchedule(ACCOUNT_ID, USER_ID, {
        reportId: 'administrative-executive',
        name: 'Persisted scheduled artifact refresh',
        frequency: 'daily',
        format: 'csv'
      })
    );
    const [firstClaim] = await command(() =>
      workerA.claimDueSchedulesWithLease(
        ACCOUNT_ID,
        schedule.nextRunAt,
        'reports-artifact-worker-a',
        60_000
      )
    );
    expect(firstClaim?.schedule.id).toBe(schedule.id);

    const capabilityA = {
      scheduleId: schedule.id,
      claimToken: firstClaim!.claimToken
    };
    const executionId = 'rep-scheduled-postgres-refresh';
    const baselineExecution = await command(() =>
      workerA.executeScheduled(
        ACCOUNT_ID,
        USER_ID,
        {
          reportId: schedule.reportId,
          executionId,
          rows: [{ domain: 'reports', metric: 'baseline', value: 1, status: 'old' }]
        },
        capabilityA
      )
    );
    const baselineExport = await command(() =>
      workerA.exportScheduled(ACCOUNT_ID, USER_ID, executionId, 'csv', capabilityA)
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
        'reports-artifact-worker-b',
        60_000
      )
    );
    expect(takeoverClaim?.claimToken).toBeTruthy();
    expect(takeoverClaim?.claimToken).not.toBe(firstClaim?.claimToken);

    await expect(
      command(() =>
        workerA.executeScheduled(
          ACCOUNT_ID,
          USER_ID,
          {
            reportId: schedule.reportId,
            executionId,
            rows: [{ domain: 'reports', metric: 'stale', value: 2, status: 'stale' }]
          },
          capabilityA
        )
      )
    ).rejects.toBeInstanceOf(ReportScheduleLeaseLostError);
    await expect(
      command(() => workerA.exportScheduled(ACCOUNT_ID, USER_ID, executionId, 'csv', capabilityA))
    ).rejects.toBeInstanceOf(ReportScheduleLeaseLostError);

    const staleArtifacts = await pool.query(
      `SELECT e.id AS execution_id, e.rows AS execution_rows,
              x.id AS export_id, x.content AS export_content
         FROM report_executions e
         LEFT JOIN report_exports x
           ON x.account_id = e.account_id AND x.execution_id = e.id AND x.format = 'csv'
        WHERE e.account_id = $1 AND e.id = $2`,
      [ACCOUNT_ID, executionId]
    );
    expect(staleArtifacts.rows[0]).toMatchObject({
      execution_id: baselineExecution.id,
      execution_rows: [{ domain: 'reports', metric: 'baseline', value: 1, status: 'old' }],
      export_id: baselineExport.id,
      export_content: baselineExport.content
    });

    const capabilityB = {
      scheduleId: schedule.id,
      claimToken: takeoverClaim!.claimToken
    };
    const refreshedExecution = await command(() =>
      workerB.executeScheduled(
        ACCOUNT_ID,
        USER_ID,
        {
          reportId: schedule.reportId,
          executionId,
          rows: [{ domain: 'reports', metric: 'fresh', value: 99, status: 'current' }]
        },
        capabilityB
      )
    );
    const refreshedExport = await command(() =>
      workerB.exportScheduled(ACCOUNT_ID, USER_ID, executionId, 'csv', capabilityB)
    );
    expect(refreshedExecution.id).toBe(baselineExecution.id);
    expect(refreshedExport.id).toBe(baselineExport.id);

    const refreshedArtifacts = await pool.query(
      `SELECT e.id AS execution_id, e.rows AS execution_rows,
              x.id AS export_id, x.content AS export_content
         FROM report_executions e
         LEFT JOIN report_exports x
           ON x.account_id = e.account_id AND x.execution_id = e.id AND x.format = 'csv'
        WHERE e.account_id = $1 AND e.id = $2`,
      [ACCOUNT_ID, executionId]
    );
    expect(refreshedArtifacts.rows[0]).toMatchObject({
      execution_id: executionId,
      execution_rows: [{ domain: 'reports', metric: 'fresh', value: 99, status: 'current' }],
      export_id: baselineExport.id
    });
    expect(refreshedArtifacts.rows[0]?.export_content).not.toBe(baselineExport.content);
    expect(refreshedArtifacts.rows[0]?.export_content).toContain('fresh');
  });

  it('serializes scheduled execution persistence with schedule takeover locks', async () => {
    const repository = new DatabaseReportRepository();
    const workerA = new ReportsService({ repository });
    const workerB = new ReportsService({ repository });
    const schedule = await command(() =>
      workerA.createSchedule(ACCOUNT_ID, USER_ID, {
        reportId: 'administrative-executive',
        name: 'Persisted concurrent scheduled artifact fence',
        frequency: 'daily',
        format: 'csv'
      })
    );
    const [firstClaim] = await command(() =>
      workerA.claimDueSchedulesWithLease(
        ACCOUNT_ID,
        schedule.nextRunAt,
        'reports-artifact-concurrent-worker-a',
        60_000
      )
    );
    expect(firstClaim?.schedule.id).toBe(schedule.id);
    await command(() => workerB.hydrateFromDatabase(ACCOUNT_ID));

    const executionId = 'rep-scheduled-postgres-concurrent';
    const baselineExecution = await command(() =>
      workerA.execute(ACCOUNT_ID, USER_ID, {
        reportId: schedule.reportId,
        executionId,
        rows: [{ domain: 'reports', metric: 'baseline', value: 1, status: 'old' }]
      })
    );
    const baselineExport = await command(() =>
      workerA.exportExecution(ACCOUNT_ID, USER_ID, executionId, 'csv')
    );
    const blocker = await pool.connect();
    let staleWrite: Promise<unknown> | undefined;
    let staleExport: Promise<unknown> | undefined;
    let expireClaim: Promise<unknown> | undefined;
    try {
      await blocker.query('BEGIN');
      await blocker.query(
        `SELECT id
           FROM report_schedules
          WHERE account_id = $1 AND id = $2
          FOR UPDATE`,
        [ACCOUNT_ID, schedule.id]
      );
      const blockerPid = Number(
        (await blocker.query('SELECT pg_backend_pid()')).rows[0]?.pg_backend_pid
      );

      expireClaim = pool.query(
        `UPDATE report_schedules
            SET claim_until = now() - interval '1 second'
          WHERE account_id = $1 AND id = $2`,
        [ACCOUNT_ID, schedule.id]
      );
      let expiryWaiting = false;
      for (let attempt = 0; attempt < 200; attempt += 1) {
        const waiting = await pool.query(
          `SELECT 1
             FROM pg_stat_activity
            WHERE pid <> $1
              AND query LIKE '%UPDATE report_schedules%'
              AND wait_event_type = 'Lock'`,
          [blockerPid]
        );
        if (waiting.rowCount > 0) {
          expiryWaiting = true;
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      expect(expiryWaiting).toBe(true);

      staleWrite = command(() =>
        workerA.executeScheduled(
          ACCOUNT_ID,
          USER_ID,
          {
            reportId: schedule.reportId,
            executionId,
            rows: [{ domain: 'reports', metric: 'blocked', value: 2, status: 'blocked' }]
          },
          { scheduleId: schedule.id, claimToken: firstClaim!.claimToken }
        )
      );
      staleExport = command(() =>
        workerA.exportScheduled(ACCOUNT_ID, USER_ID, executionId, 'csv', {
          scheduleId: schedule.id,
          claimToken: firstClaim!.claimToken
        })
      );
      let artifactWritesWaiting = false;
      for (let attempt = 0; attempt < 200; attempt += 1) {
        const waiting = await pool.query(
          `SELECT 1
             FROM pg_stat_activity
            WHERE pid <> $1
              AND query LIKE '%active_schedule_claim%'
              AND wait_event_type = 'Lock'`,
          [blockerPid]
        );
        if (waiting.rowCount >= 2) {
          artifactWritesWaiting = true;
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      expect(artifactWritesWaiting).toBe(true);

      const [takeoverWhileBlocked] = await command(() =>
        workerB.claimDueSchedulesWithLease(
          ACCOUNT_ID,
          schedule.nextRunAt,
          'reports-artifact-concurrent-worker-b',
          60_000
        )
      );
      expect(takeoverWhileBlocked).toBeUndefined();

      await blocker.query('ROLLBACK');
      await expireClaim;
      await expect(staleWrite).rejects.toThrow(/Report schedule lease was lost/);
      await expect(staleExport).rejects.toThrow(/Report schedule lease was lost/);

      const unchangedArtifacts = await pool.query(
        `SELECT e.rows AS execution_rows, x.content AS export_content
           FROM report_executions e
           LEFT JOIN report_exports x
             ON x.account_id = e.account_id AND x.execution_id = e.id AND x.format = 'csv'
          WHERE e.account_id = $1 AND e.id = $2`,
        [ACCOUNT_ID, executionId]
      );
      expect(unchangedArtifacts.rows[0]).toMatchObject({
        execution_rows: baselineExecution.rows,
        export_content: baselineExport.content
      });

      const [takeoverAfterWrite] = await command(() =>
        workerB.claimDueSchedulesWithLease(
          ACCOUNT_ID,
          schedule.nextRunAt,
          'reports-artifact-concurrent-worker-b',
          60_000
        )
      );
      expect(takeoverAfterWrite?.claimToken).toBeTruthy();
      expect(baselineExecution.id).toBe(executionId);
    } finally {
      await blocker.query('ROLLBACK').catch(() => undefined);
      blocker.release();
      await staleWrite?.catch(() => undefined);
      await staleExport?.catch(() => undefined);
      await expireClaim?.catch(() => undefined);
    }
  });
});
