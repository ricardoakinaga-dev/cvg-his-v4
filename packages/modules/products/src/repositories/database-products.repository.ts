import { getPool } from '@cvg-his-v2/shared-database';
import { withTenantQuery } from '@cvg-his-v2/tenant-context';
import type { AccountId } from '@cvg-his-v2/shared-types';

export interface ProductRecord {
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

export interface ProductsRepository {
  create(product: ProductRecord): Promise<void>;
  update(product: ProductRecord): Promise<void>;
  findById(id: string): Promise<ProductRecord | null>;
  findByAccountId(
    accountId: AccountId,
    filters?: { search?: string; active?: boolean }
  ): Promise<readonly ProductRecord[]>;
}

export class DatabaseProductsRepository implements ProductsRepository {
  async create(product: ProductRecord): Promise<void> {
    return withTenantQuery(getPool(), async (client) => {
      await client.query(
        `INSERT INTO products (id, account_id, name, code, description, base_price, active, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          product.id,
          product.accountId,
          product.name,
          product.code,
          product.description,
          product.basePrice.toString(),
          product.active,
          new Date(product.createdAt),
          new Date(product.updatedAt)
        ]
      );
    });
  }

  async update(product: ProductRecord): Promise<void> {
    return withTenantQuery(getPool(), async (client) => {
      await client.query(
        `UPDATE products SET name = $2, code = $3, description = $4, base_price = $5, active = $6, updated_at = $7 WHERE id = $1`,
        [
          product.id,
          product.name,
          product.code,
          product.description,
          product.basePrice.toString(),
          product.active,
          new Date(product.updatedAt)
        ]
      );
    });
  }

  async findById(id: string): Promise<ProductRecord | null> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query('SELECT * FROM products WHERE id = $1', [id]);
      if (result.rows.length === 0) return null;
      return this.mapRow(result.rows[0]);
    });
  }

  async findByAccountId(
    accountId: AccountId,
    filters?: { search?: string; active?: boolean }
  ): Promise<readonly ProductRecord[]> {
    return withTenantQuery(getPool(), async (client) => {
      let sql = 'SELECT * FROM products WHERE account_id = $1';
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
      const result = await client.query(sql, params);
      return result.rows.map((r: Record<string, unknown>) => this.mapRow(r));
    });
  }

  private mapRow(row: Record<string, unknown>): ProductRecord {
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
