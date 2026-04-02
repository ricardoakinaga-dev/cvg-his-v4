import { getPool } from '@cvg-his-v2/shared-database';
import type { AccountId, UserId } from '@cvg-his-v2/shared-types';
import { nowIso } from '@cvg-his-v2/shared-utils';

export interface StaffRecord {
  readonly id: string;
  readonly accountId: AccountId;
  readonly userId: UserId | null;
  readonly employeeCode: string;
  readonly fullName: string;
  readonly department: string | null;
  readonly jobTitle: string | null;
  readonly isActive: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface StaffCreateInput {
  readonly accountId: AccountId;
  readonly userId?: UserId | null;
  readonly employeeCode: string;
  readonly fullName: string;
  readonly department?: string | null;
  readonly jobTitle?: string | null;
}

export interface StaffUpdateInput {
  readonly fullName?: string;
  readonly department?: string | null;
  readonly jobTitle?: string | null;
  readonly isActive?: boolean;
}

export interface StaffRepository {
  create(input: StaffCreateInput): Promise<StaffRecord>;
  findById(id: string): Promise<StaffRecord | null>;
  findByAccountId(accountId?: AccountId): Promise<readonly StaffRecord[]>;
  findByUserId(accountId: AccountId, userId: UserId): Promise<StaffRecord | null>;
  update(id: string, input: StaffUpdateInput): Promise<StaffRecord>;
}

export class DatabaseStaffRepository implements StaffRepository {
  async create(input: StaffCreateInput): Promise<StaffRecord> {
    const pool = getPool();
    const now = nowIso();
    const id = `staff-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    await pool.query(
      `INSERT INTO staff (id, account_id, user_id, employee_code, full_name, department, job_title, is_active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        id,
        input.accountId,
        input.userId ?? null,
        input.employeeCode,
        input.fullName,
        input.department ?? null,
        input.jobTitle ?? null,
        true,
        new Date(now),
        new Date(now)
      ]
    );
    return {
      id,
      accountId: input.accountId,
      userId: input.userId ?? null,
      employeeCode: input.employeeCode,
      fullName: input.fullName,
      department: input.department ?? null,
      jobTitle: input.jobTitle ?? null,
      isActive: true,
      createdAt: now,
      updatedAt: now
    };
  }

  async findById(id: string): Promise<StaffRecord | null> {
    const pool = getPool();
    const result = await pool.query(`SELECT * FROM staff WHERE id = $1`, [id]);
    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  async findByAccountId(accountId?: AccountId): Promise<readonly StaffRecord[]> {
    const pool = getPool();
    const result = accountId
      ? await pool.query(`SELECT * FROM staff WHERE account_id = $1 ORDER BY full_name ASC`, [
          accountId
        ])
      : await pool.query(`SELECT * FROM staff ORDER BY full_name ASC`);
    return result.rows.map((r: Record<string, unknown>) => this.mapRow(r));
  }

  async findByUserId(accountId: AccountId, userId: UserId): Promise<StaffRecord | null> {
    const pool = getPool();
    const result = await pool.query(`SELECT * FROM staff WHERE account_id = $1 AND user_id = $2`, [
      accountId,
      userId
    ]);
    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  async update(id: string, input: StaffUpdateInput): Promise<StaffRecord> {
    const pool = getPool();
    const existing = await this.findById(id);
    if (!existing) throw new Error(`Staff not found: ${id}`);

    const now = nowIso();
    const sets: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (input.fullName !== undefined) {
      sets.push(`full_name = $${idx++}`);
      values.push(input.fullName);
    }
    if (input.department !== undefined) {
      sets.push(`department = $${idx++}`);
      values.push(input.department);
    }
    if (input.jobTitle !== undefined) {
      sets.push(`job_title = $${idx++}`);
      values.push(input.jobTitle);
    }
    if (input.isActive !== undefined) {
      sets.push(`is_active = $${idx++}`);
      values.push(input.isActive);
    }
    sets.push(`updated_at = $${idx++}`);
    values.push(new Date(now));
    values.push(id);

    await pool.query(`UPDATE staff SET ${sets.join(', ')} WHERE id = $${idx}`, values);

    return {
      ...existing,
      fullName: input.fullName ?? existing.fullName,
      department: input.department !== undefined ? input.department : existing.department,
      jobTitle: input.jobTitle !== undefined ? input.jobTitle : existing.jobTitle,
      isActive: input.isActive !== undefined ? input.isActive : existing.isActive,
      updatedAt: now
    };
  }

  private mapRow(row: Record<string, unknown>): StaffRecord {
    return {
      id: row.id as string,
      accountId: row.account_id as AccountId,
      userId: (row.user_id as UserId) ?? null,
      employeeCode: row.employee_code as string,
      fullName: row.full_name as string,
      department: (row.department as string) ?? null,
      jobTitle: (row.job_title as string) ?? null,
      isActive: row.is_active as boolean,
      createdAt: new Date(row.created_at as string).toISOString(),
      updatedAt: new Date(row.updated_at as string).toISOString()
    };
  }
}
