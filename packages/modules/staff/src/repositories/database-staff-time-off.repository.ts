import { randomUUID } from 'node:crypto';

import { getPool } from '@cvg-his-v2/shared-database';
import { withTenantQuery } from '@cvg-his-v2/tenant-context';
import type { AccountId, StaffId, UserId } from '@cvg-his-v2/shared-types';

export type StaffTimeOffStatus = 'scheduled' | 'cancelled';

export interface StaffTimeOffSummary {
  readonly id: string;
  readonly accountId: AccountId;
  readonly staffId: StaffId;
  readonly startsAt: string;
  readonly endsAt: string;
  readonly reason: string;
  readonly status: StaffTimeOffStatus;
  readonly createdByUserId: UserId;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface StaffTimeOffRepository {
  save(timeOff: StaffTimeOffSummary): Promise<void>;
  /**
   * Persists a scheduled interval only when no active interval overlaps it.
   * The database implementation serializes this operation per account/staff.
   */
  createIfNoOverlap?(timeOff: StaffTimeOffSummary): Promise<boolean>;
  findByAccountId(accountId?: AccountId): Promise<readonly StaffTimeOffSummary[]>;
  findOverlaps(
    accountId: AccountId,
    staffId: StaffId,
    startsAt: string,
    endsAt: string
  ): Promise<readonly StaffTimeOffSummary[]>;
}

export class DatabaseStaffTimeOffRepository implements StaffTimeOffRepository {
  async createIfNoOverlap(timeOff: StaffTimeOffSummary): Promise<boolean> {
    return withTenantQuery(getPool(), async (client) => {
      return client.query(
        `SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`,
        [`staff-time-off:${timeOff.accountId}:${timeOff.staffId}`]
      ).then(async () => {
        const overlap = await client.query(
          `SELECT 1
           FROM staff_time_off
           WHERE account_id = $1
             AND staff_id = $2
             AND status = 'scheduled'
             AND starts_at < $4
             AND ends_at > $3
           LIMIT 1`,
          [
            timeOff.accountId,
            timeOff.staffId,
            new Date(timeOff.startsAt),
            new Date(timeOff.endsAt)
          ]
        );
        if (overlap.rowCount !== 0) return false;

        await client.query(
          `INSERT INTO staff_time_off (
             id, account_id, staff_id, starts_at, ends_at, reason, status,
             created_by_user_id, created_at, updated_at
           ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
          [
            timeOff.id,
            timeOff.accountId,
            timeOff.staffId,
            new Date(timeOff.startsAt),
            new Date(timeOff.endsAt),
            timeOff.reason,
            timeOff.status,
            timeOff.createdByUserId,
            new Date(timeOff.createdAt),
            new Date(timeOff.updatedAt)
          ]
        );
        return true;
      });
    });
  }

  async save(timeOff: StaffTimeOffSummary): Promise<void> {
    await withTenantQuery(getPool(), async (client) => {
      await client.query(
        `INSERT INTO staff_time_off (
           id, account_id, staff_id, starts_at, ends_at, reason, status,
           created_by_user_id, created_at, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (id) DO UPDATE SET
           starts_at = EXCLUDED.starts_at,
           ends_at = EXCLUDED.ends_at,
           reason = EXCLUDED.reason,
           status = EXCLUDED.status,
           updated_at = EXCLUDED.updated_at
         WHERE staff_time_off.account_id = EXCLUDED.account_id`,
        [
          timeOff.id,
          timeOff.accountId,
          timeOff.staffId,
          new Date(timeOff.startsAt),
          new Date(timeOff.endsAt),
          timeOff.reason,
          timeOff.status,
          timeOff.createdByUserId,
          new Date(timeOff.createdAt),
          new Date(timeOff.updatedAt)
        ]
      );
    });
  }

  async findByAccountId(accountId?: AccountId): Promise<readonly StaffTimeOffSummary[]> {
    return withTenantQuery(getPool(), async (client) => {
      const result = accountId
        ? await client.query(
            `SELECT * FROM staff_time_off
             WHERE account_id = $1
             ORDER BY starts_at ASC`,
            [accountId]
          )
        : await client.query(`SELECT * FROM staff_time_off ORDER BY starts_at ASC`);
      return result.rows.map((row: Record<string, unknown>) => this.mapRow(row));
    });
  }

  async findOverlaps(
    accountId: AccountId,
    staffId: StaffId,
    startsAt: string,
    endsAt: string
  ): Promise<readonly StaffTimeOffSummary[]> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `SELECT * FROM staff_time_off
         WHERE account_id = $1
           AND staff_id = $2
           AND status = 'scheduled'
           AND starts_at < $4
           AND ends_at > $3
         ORDER BY starts_at ASC`,
        [accountId, staffId, new Date(startsAt), new Date(endsAt)]
      );
      return result.rows.map((row: Record<string, unknown>) => this.mapRow(row));
    });
  }

  private mapRow(row: Record<string, unknown>): StaffTimeOffSummary {
    return {
      id: row.id as string,
      accountId: row.account_id as AccountId,
      staffId: row.staff_id as StaffId,
      startsAt: new Date(row.starts_at as string).toISOString(),
      endsAt: new Date(row.ends_at as string).toISOString(),
      reason: row.reason as string,
      status: row.status as StaffTimeOffStatus,
      createdByUserId: row.created_by_user_id as UserId,
      createdAt: new Date(row.created_at as string).toISOString(),
      updatedAt: new Date(row.updated_at as string).toISOString()
    };
  }
}

export function createStaffTimeOffId(useUuid: boolean): string {
  return useUuid ? randomUUID() : `staff-time-off-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
