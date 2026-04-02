import { getPool } from '@cvg-his-v2/shared-database';
import type { AccountId } from '@cvg-his-v2/shared-types';

export interface ServiceRecord {
  readonly id: string;
  readonly accountId: AccountId;
  readonly name: string;
  readonly code: string | null;
  readonly description: string | null;
  readonly basePrice: number;
  readonly active: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ServicesRepository {
  create(service: ServiceRecord): Promise<void>;
  update(service: ServiceRecord): Promise<void>;
  findById(id: string): Promise<ServiceRecord | null>;
  findByAccountId(
    accountId: AccountId,
    filters?: { search?: string; active?: boolean }
  ): Promise<readonly ServiceRecord[]>;
}

export class DatabaseServicesRepository implements ServicesRepository {
  async create(service: ServiceRecord): Promise<void> {
    const pool = getPool();
    await pool.query(
      `INSERT INTO services (id, account_id, name, code, description, base_price, active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        service.id,
        service.accountId,
        service.name,
        service.code,
        service.description,
        service.basePrice.toString(),
        service.active,
        new Date(service.createdAt),
        new Date(service.updatedAt)
      ]
    );
  }

  async update(service: ServiceRecord): Promise<void> {
    const pool = getPool();
    await pool.query(
      `UPDATE services SET name = $2, code = $3, description = $4, base_price = $5, active = $6, updated_at = $7 WHERE id = $1`,
      [
        service.id,
        service.name,
        service.code,
        service.description,
        service.basePrice.toString(),
        service.active,
        new Date(service.updatedAt)
      ]
    );
  }

  async findById(id: string): Promise<ServiceRecord | null> {
    const pool = getPool();
    const result = await pool.query('SELECT * FROM services WHERE id = $1', [id]);
    if (result.rows.length === 0) return null;
    return this.mapRow(result.rows[0]);
  }

  async findByAccountId(
    accountId: AccountId,
    filters?: { search?: string; active?: boolean }
  ): Promise<readonly ServiceRecord[]> {
    const pool = getPool();
    let sql = 'SELECT * FROM services WHERE account_id = $1';
    const params: unknown[] = [accountId];
    let paramIdx = 2;

    if (filters?.active !== undefined) {
      sql += ` AND active = $${paramIdx}`;
      params.push(filters.active);
      paramIdx++;
    }

    if (filters?.search) {
      sql += ` AND (name ILIKE $${paramIdx} OR code ILIKE $${paramIdx})`;
      params.push(`%${filters.search}%`);
      paramIdx++;
    }

    sql += ' ORDER BY name';
    const result = await pool.query(sql, params);
    return result.rows.map((r: Record<string, unknown>) => this.mapRow(r));
  }

  private mapRow(row: Record<string, unknown>): ServiceRecord {
    return {
      id: row.id as string,
      accountId: row.account_id as AccountId,
      name: row.name as string,
      code: (row.code as string) ?? null,
      description: (row.description as string) ?? null,
      basePrice: parseFloat(row.base_price as string),
      active: row.active as boolean,
      createdAt: new Date(row.created_at as string).toISOString(),
      updatedAt: new Date(row.updated_at as string).toISOString()
    };
  }
}
