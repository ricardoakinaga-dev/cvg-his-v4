import { randomUUID } from 'node:crypto';
import { getPool } from '@cvg-his-v2/shared-database';
import { withTenantQuery } from '@cvg-his-v2/tenant-context';
import type { AccountId, UserId } from '@cvg-his-v2/shared-types';
import { nowIso } from '@cvg-his-v2/shared-utils';

export interface ProfessionRecord {
  readonly id: string;
  readonly accountId: AccountId;
  readonly code: string;
  readonly name: string;
  readonly description: string | null;
  readonly isActive: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ProfessionCreateInput {
  readonly accountId: AccountId;
  readonly code: string;
  readonly name: string;
  readonly description?: string | null;
}

export interface ProfessionUpdateInput {
  readonly code?: string;
  readonly name?: string;
  readonly description?: string | null;
  readonly isActive?: boolean;
}

export interface StaffRecord {
  readonly id: string;
  readonly accountId: AccountId;
  readonly userId: UserId | null;
  readonly employeeCode: string;
  readonly fullName: string;
  readonly department: string | null;
  readonly jobTitle: string | null;
  readonly professionId?: string | null;
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
  readonly professionId?: string | null;
}

export interface StaffUpdateInput {
  readonly fullName?: string;
  readonly department?: string | null;
  readonly jobTitle?: string | null;
  readonly professionId?: string | null;
  readonly isActive?: boolean;
}

export interface StaffRepository {
  create(input: StaffCreateInput): Promise<StaffRecord>;
  findById(id: string): Promise<StaffRecord | null>;
  findByAccountId(accountId?: AccountId): Promise<readonly StaffRecord[]>;
  findByUserId(accountId: AccountId, userId: UserId): Promise<StaffRecord | null>;
  update(id: string, input: StaffUpdateInput): Promise<StaffRecord>;
  createProfession?(input: ProfessionCreateInput): Promise<ProfessionRecord>;
  findProfessionById?(id: string): Promise<ProfessionRecord | null>;
  findProfessionsByAccountId?(accountId: AccountId): Promise<readonly ProfessionRecord[]>;
  updateProfession?(id: string, input: ProfessionUpdateInput): Promise<ProfessionRecord>;
}

export class DatabaseStaffRepository implements StaffRepository {
  async create(input: StaffCreateInput): Promise<StaffRecord> {
    return withTenantQuery(getPool(), async (client) => {
      const now = nowIso();
      const id = randomUUID();
      await client.query(
        `INSERT INTO staff (id, account_id, user_id, employee_code, full_name, department, job_title, profession_id, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          id,
          input.accountId,
          input.userId ?? null,
          input.employeeCode,
          input.fullName,
          input.department ?? null,
          input.jobTitle ?? null,
          input.professionId ?? null,
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
        professionId: input.professionId ?? null,
        isActive: true,
        createdAt: now,
        updatedAt: now
      };
    });
  }

  async findById(id: string): Promise<StaffRecord | null> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(`SELECT * FROM staff WHERE id = $1`, [id]);
      if (result.rows.length === 0) return null;
      return this.mapRow(result.rows[0]);
    });
  }

  async findByAccountId(accountId?: AccountId): Promise<readonly StaffRecord[]> {
    return withTenantQuery(getPool(), async (client) => {
      const result = accountId
        ? await client.query(`SELECT * FROM staff WHERE account_id = $1 ORDER BY full_name ASC`, [
            accountId
          ])
        : await client.query(`SELECT * FROM staff ORDER BY full_name ASC`);
      return result.rows.map((r: Record<string, unknown>) => this.mapRow(r));
    });
  }

  async findByUserId(accountId: AccountId, userId: UserId): Promise<StaffRecord | null> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(`SELECT * FROM staff WHERE account_id = $1 AND user_id = $2`, [
        accountId,
        userId
      ]);
      if (result.rows.length === 0) return null;
      return this.mapRow(result.rows[0]);
    });
  }

  async update(id: string, input: StaffUpdateInput): Promise<StaffRecord> {
    return withTenantQuery(getPool(), async (client) => {
      const existingResult = await client.query(`SELECT * FROM staff WHERE id = $1`, [id]);
      if (existingResult.rows.length === 0) throw new Error(`Staff not found: ${id}`);
      const existing = this.mapRow(existingResult.rows[0]);

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
      if (input.professionId !== undefined) {
        sets.push(`profession_id = $${idx++}`);
        values.push(input.professionId);
      }
      if (input.isActive !== undefined) {
        sets.push(`is_active = $${idx++}`);
        values.push(input.isActive);
      }
      sets.push(`updated_at = $${idx++}`);
      values.push(new Date(now));
      values.push(id);

      await client.query(`UPDATE staff SET ${sets.join(', ')} WHERE id = $${idx}`, values);

      return {
        ...existing,
        fullName: input.fullName ?? existing.fullName,
        department: input.department !== undefined ? input.department : existing.department,
        jobTitle: input.jobTitle !== undefined ? input.jobTitle : existing.jobTitle,
        professionId:
          input.professionId !== undefined ? input.professionId : existing.professionId,
        isActive: input.isActive !== undefined ? input.isActive : existing.isActive,
        updatedAt: now
      };
    });
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
      professionId: (row.profession_id as string) ?? null,
      isActive: row.is_active as boolean,
      createdAt: new Date(row.created_at as string).toISOString(),
      updatedAt: new Date(row.updated_at as string).toISOString()
    };
  }

  async createProfession(input: ProfessionCreateInput): Promise<ProfessionRecord> {
    return withTenantQuery(getPool(), async (client) => {
      const now = nowIso();
      const id = randomUUID();
      await client.query(
        `INSERT INTO professions (id, account_id, code, name, description, is_active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, true, $6, $7)`,
        [id, input.accountId, input.code, input.name, input.description ?? null, new Date(now), new Date(now)]
      );
      return {
        id,
        accountId: input.accountId,
        code: input.code,
        name: input.name,
        description: input.description ?? null,
        isActive: true,
        createdAt: now,
        updatedAt: now
      };
    });
  }

  async findProfessionById(id: string): Promise<ProfessionRecord | null> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query('SELECT * FROM professions WHERE id = $1', [id]);
      return result.rows[0] ? this.mapProfessionRow(result.rows[0]) : null;
    });
  }

  async findProfessionsByAccountId(accountId: AccountId): Promise<readonly ProfessionRecord[]> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        'SELECT * FROM professions WHERE account_id = $1 ORDER BY name ASC',
        [accountId]
      );
      return result.rows.map((row: Record<string, unknown>) => this.mapProfessionRow(row));
    });
  }

  async updateProfession(id: string, input: ProfessionUpdateInput): Promise<ProfessionRecord> {
    return withTenantQuery(getPool(), async (client) => {
      const existingResult = await client.query('SELECT * FROM professions WHERE id = $1', [id]);
      if (existingResult.rows.length === 0) throw new Error(`Profession not found: ${id}`);
      const existing = this.mapProfessionRow(existingResult.rows[0]);
      const now = nowIso();
      const sets: string[] = [];
      const values: unknown[] = [];
      let index = 1;
      if (input.code !== undefined) {
        sets.push(`code = $${index++}`);
        values.push(input.code);
      }
      if (input.name !== undefined) {
        sets.push(`name = $${index++}`);
        values.push(input.name);
      }
      if (input.description !== undefined) {
        sets.push(`description = $${index++}`);
        values.push(input.description);
      }
      if (input.isActive !== undefined) {
        sets.push(`is_active = $${index++}`);
        values.push(input.isActive);
      }
      sets.push(`updated_at = $${index++}`);
      values.push(new Date(now));
      values.push(id);
      await client.query(`UPDATE professions SET ${sets.join(', ')} WHERE id = $${index}`, values);
      return {
        ...existing,
        code: input.code ?? existing.code,
        name: input.name ?? existing.name,
        description: input.description !== undefined ? input.description : existing.description,
        isActive: input.isActive ?? existing.isActive,
        updatedAt: now
      };
    });
  }

  private mapProfessionRow(row: Record<string, unknown>): ProfessionRecord {
    return {
      id: row.id as string,
      accountId: row.account_id as AccountId,
      code: row.code as string,
      name: row.name as string,
      description: (row.description as string) ?? null,
      isActive: row.is_active as boolean,
      createdAt: new Date(row.created_at as string).toISOString(),
      updatedAt: new Date(row.updated_at as string).toISOString()
    };
  }
}
