import { getPool } from '@cvg-his-v2/shared-database';
import { ValidationError } from '@cvg-his-v2/shared-errors';
import type { AccountId, UserId } from '@cvg-his-v2/shared-types';
import { createCorrelationId } from '@cvg-his-v2/shared-utils';
import { withTenantQuery } from '@cvg-his-v2/tenant-context';
import { nextRunAt } from './report-schedule-time.js';
import type {
  ReportColumn,
  ReportColumnType,
  ReportContentEncoding,
  ReportExecutionDetail,
  ReportExportSummary,
  ReportFormat,
  ReportRepository,
  ReportScheduleClaim,
  ReportScheduleDeliveryClaim,
  ReportScheduleDeliveryStatus,
  ReportScheduleDeliverySummary,
  ReportScheduleFrequency,
  ReportScheduleSummary
} from './index.js';

/* v8 ignore start -- SQL repository adapter covered by integration tests. */
export class DatabaseReportRepository implements ReportRepository {
  async saveExecution(execution: ReportExecutionDetail): Promise<void> {
    await withTenantQuery(getPool(), async (client) => {
      await client.query(
        `INSERT INTO report_executions (
          id, account_id, report_id, requested_by_user_id, status, filters, row_count,
          generated_at, expires_at, columns, rows
        ) VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10::jsonb, $11::jsonb)
        ON CONFLICT (account_id, id) DO NOTHING`,
        executionParams(execution)
      );
    });
  }

  async saveExport(exported: ReportExportSummary): Promise<void> {
    await withTenantQuery(getPool(), async (client) => {
      await client.query(
        `INSERT INTO report_exports (
          id, account_id, execution_id, format, filename, content_type, content,
          content_encoding, exported_by_user_id, exported_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $8, $7, $9, $10)
        ON CONFLICT (account_id, id) DO NOTHING`,
        exportParams(exported)
      );
    });
  }

  async saveExecutionForScheduleClaim(
    execution: ReportExecutionDetail,
    scheduleId: string,
    scheduleClaimToken: string
  ): Promise<boolean> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `WITH active_schedule_claim AS (
           SELECT 1
             FROM report_schedules
            WHERE account_id = $2
              AND id = $12
              AND claim_token = $13
              AND claim_until > clock_timestamp()
            FOR UPDATE
         )
         INSERT INTO report_executions (
           id, account_id, report_id, requested_by_user_id, status, filters, row_count,
           generated_at, expires_at, columns, rows
         )
         SELECT $1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9, $10::jsonb, $11::jsonb
           FROM active_schedule_claim
         ON CONFLICT (account_id, id) DO UPDATE SET
           report_id = EXCLUDED.report_id,
           requested_by_user_id = EXCLUDED.requested_by_user_id,
           status = EXCLUDED.status,
           filters = EXCLUDED.filters,
           row_count = EXCLUDED.row_count,
           generated_at = EXCLUDED.generated_at,
           expires_at = EXCLUDED.expires_at,
           columns = EXCLUDED.columns,
           rows = EXCLUDED.rows
         WHERE report_executions.account_id = EXCLUDED.account_id
           AND EXISTS (
             SELECT 1
               FROM report_schedules
              WHERE account_id = EXCLUDED.account_id
                AND id = $12
                AND claim_token = $13
                AND claim_until > clock_timestamp()
           )
         RETURNING id`,
        [...executionParams(execution), scheduleId, scheduleClaimToken]
      );
      return result.rowCount === 1;
    });
  }

  async saveExportForScheduleClaim(
    exported: ReportExportSummary,
    scheduleId: string,
    scheduleClaimToken: string
  ): Promise<boolean> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `WITH active_schedule_claim AS (
           SELECT 1
             FROM report_schedules
            WHERE account_id = $2
              AND id = $11
              AND claim_token = $12
              AND claim_until > clock_timestamp()
            FOR UPDATE
         )
         INSERT INTO report_exports (
           id, account_id, execution_id, format, filename, content_type, content,
           content_encoding, exported_by_user_id, exported_at
         )
         SELECT $1, $2, $3, $4, $5, $6, $8, $7, $9, $10
           FROM active_schedule_claim
         ON CONFLICT (account_id, id) DO UPDATE SET
           execution_id = EXCLUDED.execution_id,
           format = EXCLUDED.format,
           filename = EXCLUDED.filename,
           content_type = EXCLUDED.content_type,
           content = EXCLUDED.content,
           content_encoding = EXCLUDED.content_encoding,
           exported_by_user_id = EXCLUDED.exported_by_user_id,
           exported_at = EXCLUDED.exported_at
         WHERE report_exports.account_id = EXCLUDED.account_id
           AND EXISTS (
             SELECT 1
               FROM report_schedules
              WHERE account_id = EXCLUDED.account_id
                AND id = $11
                AND claim_token = $12
                AND claim_until > clock_timestamp()
           )
         RETURNING id`,
        [...exportParams(exported), scheduleId, scheduleClaimToken]
      );
      return result.rowCount === 1;
    });
  }

  async saveSchedule(schedule: ReportScheduleSummary): Promise<void> {
    await withTenantQuery(getPool(), async (client) => {
      await client.query(
        `INSERT INTO report_schedules (
          id, account_id, report_id, name, frequency, format, filters, recipients,
          is_active, next_run_at, last_run_at, last_execution_id, last_error,
          created_by_user_id, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9, $10, $11, $12, $13, $14, $15, $16)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          frequency = EXCLUDED.frequency,
          format = EXCLUDED.format,
          filters = EXCLUDED.filters,
          recipients = EXCLUDED.recipients,
          is_active = EXCLUDED.is_active,
          next_run_at = EXCLUDED.next_run_at,
          last_run_at = EXCLUDED.last_run_at,
          last_execution_id = EXCLUDED.last_execution_id,
          last_error = EXCLUDED.last_error,
          claim_token = NULL,
          claim_until = NULL,
          claim_worker_id = NULL,
          updated_at = EXCLUDED.updated_at`,
        scheduleParams(schedule)
      );
    });
  }

  async saveClaimedSchedule(schedule: ReportScheduleSummary, claimToken: string): Promise<boolean> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `UPDATE report_schedules
            SET name = $3,
                frequency = $4,
                format = $5,
                filters = $6::jsonb,
                recipients = $7::jsonb,
                is_active = $8,
                next_run_at = $9,
                last_run_at = $10,
                last_execution_id = $11,
                last_error = $12,
                updated_at = $13,
                claim_token = NULL,
                claim_until = NULL,
                claim_worker_id = NULL
          WHERE id = $1
            AND account_id = $2
            AND claim_token = $14
            AND claim_until > clock_timestamp()`,
        [
          schedule.id,
          schedule.accountId,
          schedule.name,
          schedule.frequency,
          schedule.format,
          JSON.stringify(schedule.filters),
          JSON.stringify(schedule.recipients),
          schedule.isActive,
          new Date(schedule.nextRunAt),
          schedule.lastRunAt ? new Date(schedule.lastRunAt) : null,
          schedule.lastExecutionId,
          schedule.lastError,
          new Date(schedule.updatedAt),
          claimToken
        ]
      );
      return result.rowCount === 1;
    });
  }

  async saveDelivery(delivery: ReportScheduleDeliverySummary): Promise<void> {
    await withTenantQuery(getPool(), async (client) => {
      await client.query(
        `INSERT INTO report_schedule_deliveries (
          id, account_id, schedule_id, execution_id, export_id, recipient, status, format,
          delivered_at, error, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (id) DO UPDATE SET
          execution_id = EXCLUDED.execution_id,
          export_id = EXCLUDED.export_id,
          recipient = EXCLUDED.recipient,
          status = EXCLUDED.status,
          format = EXCLUDED.format,
          delivered_at = EXCLUDED.delivered_at,
          error = EXCLUDED.error
        WHERE report_schedule_deliveries.account_id = EXCLUDED.account_id`,
        deliveryParams(delivery)
      );
    });
  }

  async saveDeliveryForScheduleClaim(
    delivery: ReportScheduleDeliverySummary,
    scheduleClaimToken: string
  ): Promise<boolean> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `WITH active_schedule_claim AS (
           SELECT 1
             FROM report_schedules
            WHERE account_id = $2
              AND id = $3
              AND claim_token = $12
              AND claim_until > clock_timestamp()
           FOR UPDATE
         )
         INSERT INTO report_schedule_deliveries (
           id, account_id, schedule_id, execution_id, export_id, recipient, status, format,
           delivered_at, error, created_at
         )
         SELECT $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
           FROM active_schedule_claim
         ON CONFLICT (id) DO UPDATE SET
           execution_id = EXCLUDED.execution_id,
           export_id = EXCLUDED.export_id,
           recipient = EXCLUDED.recipient,
           status = EXCLUDED.status,
           format = EXCLUDED.format,
           delivered_at = EXCLUDED.delivered_at,
           error = EXCLUDED.error
         WHERE report_schedule_deliveries.account_id = EXCLUDED.account_id
           AND EXISTS (
             SELECT 1
               FROM report_schedules
              WHERE account_id = EXCLUDED.account_id
                AND id = EXCLUDED.schedule_id
                AND claim_token = $12
                AND claim_until > clock_timestamp()
           )
         RETURNING id`,
        [...deliveryParams(delivery), scheduleClaimToken]
      );
      return result.rowCount === 1;
    });
  }

  async saveClaimedDelivery(
    delivery: ReportScheduleDeliverySummary,
    claimToken: string
  ): Promise<boolean> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `UPDATE report_schedule_deliveries
            SET execution_id = $3,
                export_id = $4,
                recipient = $5,
                status = $6,
                format = $7,
                delivered_at = $8,
                error = $9,
                claim_token = NULL,
                claim_until = NULL,
                claim_worker_id = NULL
          WHERE account_id = $1
            AND id = $2
            AND claim_token = $10
            AND claim_until > clock_timestamp()`,
        [
          delivery.accountId,
          delivery.id,
          delivery.executionId,
          delivery.exportId,
          delivery.recipient,
          delivery.status,
          delivery.format,
          new Date(delivery.deliveredAt),
          delivery.error,
          claimToken
        ]
      );
      return result.rowCount === 1;
    });
  }

  async claimFailedDeliveries(
    accountId: AccountId,
    asOf: string,
    workerId: string,
    limit = 25,
    leaseMs = 120_000
  ): Promise<readonly ReportScheduleDeliveryClaim[]> {
    if (!workerId.trim() || !Number.isFinite(limit) || limit <= 0) {
      throw new ValidationError('workerId and limit are required for report delivery claims');
    }
    if (!Number.isFinite(leaseMs) || leaseMs <= 0) {
      throw new ValidationError('leaseMs is required for report delivery claims');
    }
    const normalizedLimit = Math.floor(limit);
    const normalizedLeaseMs = Math.floor(leaseMs);
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `WITH candidates AS (
           SELECT id
             FROM report_schedule_deliveries
            WHERE account_id = $1
              AND status = 'failed'
              AND (claim_until IS NULL OR claim_until <= $2::timestamptz)
            ORDER BY delivered_at ASC, id ASC
            LIMIT $4
            FOR UPDATE SKIP LOCKED
         )
         UPDATE report_schedule_deliveries AS deliveries
            SET claim_token = $3 || ':' || deliveries.id,
                claim_until = CURRENT_TIMESTAMP + ($5 * INTERVAL '1 millisecond'),
                claim_worker_id = $6
           FROM candidates
          WHERE deliveries.account_id = $1
            AND deliveries.id = candidates.id
         RETURNING deliveries.*`,
        [
          accountId,
          asOf,
          createCorrelationId('rep_deliv_claim'),
          normalizedLimit,
          normalizedLeaseMs,
          workerId.trim()
        ]
      );
      return result.rows.map(mapDeliveryClaim);
    });
  }

  async claimDueSchedulesWithLease(
    accountId: AccountId,
    asOf: string,
    workerId: string,
    leaseMs = 120_000
  ): Promise<readonly ReportScheduleClaim[]> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `WITH due AS (
           SELECT id
             FROM report_schedules
            WHERE account_id = $1
              AND is_active = TRUE
              AND next_run_at <= $2
            AND (claim_until IS NULL OR claim_until <= clock_timestamp())
            ORDER BY next_run_at ASC, id ASC
            LIMIT 25
            FOR UPDATE SKIP LOCKED
         )
         UPDATE report_schedules AS schedules
           SET claim_token = $3 || ':' || schedules.id,
                claim_until = clock_timestamp() + ($4 * INTERVAL '1 millisecond'),
                claim_worker_id = $5,
                updated_at = CURRENT_TIMESTAMP
           FROM due
          WHERE schedules.account_id = $1 AND schedules.id = due.id
         RETURNING schedules.*`,
        [accountId, asOf, createCorrelationId('rep_claim'), leaseMs, workerId]
      );
      return result.rows.map(mapScheduleClaim);
    });
  }

  async claimDueSchedules(
    accountId: AccountId,
    asOf: string,
    workerId: string,
    leaseMs = 120_000
  ): Promise<readonly ReportScheduleSummary[]> {
    const claimed = await this.claimDueSchedulesWithLease(accountId, asOf, workerId, leaseMs);
    return claimed.map(({ schedule }) => schedule);
  }

  async findExecutions(accountId: AccountId): Promise<readonly ReportExecutionDetail[]> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        'SELECT * FROM report_executions WHERE account_id = $1 ORDER BY generated_at DESC',
        [accountId]
      );
      return result.rows.map(mapExecution);
    });
  }

  async findExports(accountId: AccountId): Promise<readonly ReportExportSummary[]> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        'SELECT * FROM report_exports WHERE account_id = $1 ORDER BY exported_at DESC',
        [accountId]
      );
      return result.rows.map(mapExport);
    });
  }

  async findSchedules(accountId: AccountId): Promise<readonly ReportScheduleSummary[]> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        'SELECT * FROM report_schedules WHERE account_id = $1 ORDER BY name ASC',
        [accountId]
      );
      return result.rows.map(mapSchedule);
    });
  }

  async findDeliveries(accountId: AccountId): Promise<readonly ReportScheduleDeliverySummary[]> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        'SELECT * FROM report_schedule_deliveries WHERE account_id = $1 ORDER BY delivered_at DESC',
        [accountId]
      );
      return result.rows.map(mapDelivery);
    });
  }
}

function dateIso(value: unknown): string {
  return new Date(value as string).toISOString();
}

function jsonRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function jsonRecordArray(value: unknown): readonly Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter(
        (item): item is Record<string, unknown> =>
          item !== null && typeof item === 'object' && !Array.isArray(item)
      )
    : [];
}

function jsonColumnArray(value: unknown): readonly ReportColumn[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item): item is Record<string, unknown> =>
        item !== null && typeof item === 'object' && !Array.isArray(item)
    )
    .map((item) => ({
      key: String(item.key ?? ''),
      label: String(item.label ?? ''),
      type: item.type as ReportColumnType
    }))
    .filter((column) => column.key && column.label);
}

function jsonStringArray(value: unknown): readonly string[] {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}

function executionParams(execution: ReportExecutionDetail): unknown[] {
  return [
    execution.id,
    execution.accountId,
    execution.reportId,
    execution.requestedByUserId,
    execution.status,
    JSON.stringify(execution.filters),
    execution.rowCount,
    new Date(execution.generatedAt),
    new Date(execution.expiresAt),
    JSON.stringify(execution.columns),
    JSON.stringify(execution.rows)
  ];
}

function exportParams(exported: ReportExportSummary): unknown[] {
  return [
    exported.id,
    exported.accountId,
    exported.executionId,
    exported.format,
    exported.filename,
    exported.contentType,
    exported.contentEncoding,
    exported.content,
    exported.exportedByUserId,
    new Date(exported.exportedAt)
  ];
}

function scheduleParams(schedule: ReportScheduleSummary): unknown[] {
  return [
    schedule.id,
    schedule.accountId,
    schedule.reportId,
    schedule.name,
    schedule.frequency,
    schedule.format,
    JSON.stringify(schedule.filters),
    JSON.stringify(schedule.recipients),
    schedule.isActive,
    new Date(schedule.nextRunAt),
    schedule.lastRunAt ? new Date(schedule.lastRunAt) : null,
    schedule.lastExecutionId,
    schedule.lastError,
    schedule.createdByUserId,
    new Date(schedule.createdAt),
    new Date(schedule.updatedAt)
  ];
}

function deliveryParams(delivery: ReportScheduleDeliverySummary): unknown[] {
  return [
    delivery.id,
    delivery.accountId,
    delivery.scheduleId,
    delivery.executionId,
    delivery.exportId,
    delivery.recipient,
    delivery.status,
    delivery.format,
    new Date(delivery.deliveredAt),
    delivery.error,
    new Date(delivery.createdAt)
  ];
}

function mapExecution(row: Record<string, unknown>): ReportExecutionDetail {
  return {
    id: row.id as string,
    accountId: row.account_id as AccountId,
    reportId: row.report_id as string,
    requestedByUserId: row.requested_by_user_id as UserId,
    status: row.status as 'completed',
    filters: jsonRecord(row.filters),
    rowCount: Number(row.row_count),
    generatedAt: dateIso(row.generated_at),
    expiresAt: dateIso(row.expires_at),
    columns: jsonColumnArray(row.columns),
    rows: jsonRecordArray(row.rows)
  };
}

function mapExport(row: Record<string, unknown>): ReportExportSummary {
  return {
    id: row.id as string,
    accountId: row.account_id as AccountId,
    executionId: row.execution_id as string,
    format: row.format as ReportFormat,
    filename: row.filename as string,
    contentType: row.content_type as string,
    contentEncoding: (row.content_encoding as ReportContentEncoding | undefined) ?? 'utf8',
    content: row.content as string,
    exportedByUserId: row.exported_by_user_id as UserId,
    exportedAt: dateIso(row.exported_at)
  };
}

function mapDelivery(row: Record<string, unknown>): ReportScheduleDeliverySummary {
  return {
    id: row.id as string,
    accountId: row.account_id as AccountId,
    scheduleId: row.schedule_id as string,
    executionId: typeof row.execution_id === 'string' ? row.execution_id : null,
    exportId: typeof row.export_id === 'string' ? row.export_id : null,
    recipient: row.recipient as string,
    status: row.status as ReportScheduleDeliveryStatus,
    format: row.format as ReportFormat,
    deliveredAt: dateIso(row.delivered_at),
    error: typeof row.error === 'string' ? row.error : null,
    createdAt: dateIso(row.created_at)
  };
}

function mapDeliveryClaim(row: Record<string, unknown>): ReportScheduleDeliveryClaim {
  return {
    delivery: mapDelivery(row),
    claimToken: String(row.claim_token),
    claimUntil: dateIso(row.claim_until),
    claimWorkerId: String(row.claim_worker_id)
  };
}

function mapScheduleClaim(row: Record<string, unknown>): ReportScheduleClaim {
  return {
    schedule: mapSchedule(row),
    claimToken: String(row.claim_token),
    claimUntil: dateIso(row.claim_until),
    claimWorkerId: String(row.claim_worker_id)
  };
}

function mapSchedule(row: Record<string, unknown>): ReportScheduleSummary {
  return {
    id: row.id as string,
    accountId: row.account_id as AccountId,
    reportId: row.report_id as string,
    name: row.name as string,
    frequency: row.frequency as ReportScheduleFrequency,
    format: row.format as ReportFormat,
    filters: jsonRecord(row.filters),
    recipients: jsonStringArray(row.recipients),
    isActive: Boolean(row.is_active),
    nextRunAt: row.next_run_at
      ? dateIso(row.next_run_at)
      : nextRunAt(
          dateIso(row.created_at),
          row.frequency as ReportScheduleFrequency,
          dateIso(row.created_at)
        ),
    lastRunAt: row.last_run_at ? dateIso(row.last_run_at) : null,
    lastExecutionId: typeof row.last_execution_id === 'string' ? row.last_execution_id : null,
    lastError: typeof row.last_error === 'string' ? row.last_error : null,
    createdByUserId: row.created_by_user_id as UserId,
    createdAt: dateIso(row.created_at),
    updatedAt: dateIso(row.updated_at)
  };
}
/* v8 ignore stop */
