import { getPool } from '@cvg-his-v2/shared-database';
import { withTenantQuery } from '@cvg-his-v2/tenant-context';
import type { AccountId, UserId } from '@cvg-his-v2/shared-types';

export interface CounterSaleRecord {
  readonly id: string;
  readonly accountId: AccountId;
  readonly number: string;
  readonly ownerId: string | null;
  readonly status: 'open' | 'closed' | 'cancelled';
  readonly subtotal: number;
  readonly discountAmount: number;
  readonly total: number;
  readonly paidAmount: number;
  readonly balanceDue: number;
  readonly notes: string | null;
  readonly openedByUserId: UserId;
  readonly closedByUserId: UserId | null;
  readonly closedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CounterSaleItemRecord {
  readonly id: string;
  readonly counterSaleId: string;
  readonly accountId: AccountId;
  readonly itemType: 'product' | 'service';
  readonly catalogItemId: string | null;
  readonly nameSnapshot: string;
  readonly codeSnapshot: string | null;
  readonly unitPrice: number;
  readonly quantity: number;
  readonly discountAmount: number;
  readonly lineTotal: number;
  readonly notes: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CounterSalePaymentRecord {
  readonly id: string;
  readonly counterSaleId: string;
  readonly accountId: AccountId;
  readonly method:
    | 'cash'
    | 'credit_card'
    | 'debit_card'
    | 'pix'
    | 'bank_transfer'
    | 'check'
    | 'insurance'
    | 'other';
  readonly amount: number;
  readonly installments: number;
  readonly reference: string | null;
  readonly notes: string | null;
  readonly createdAt: string;
}

export interface CounterSalesRepository {
  create(sale: CounterSaleRecord): Promise<void>;
  update(sale: CounterSaleRecord): Promise<void>;
  findById(id: string): Promise<CounterSaleRecord | null>;
  findByAccountId(
    accountId: AccountId,
    filters?: { status?: string; search?: string; ownerId?: string }
  ): Promise<readonly CounterSaleRecord[]>;
  createItem(item: CounterSaleItemRecord): Promise<void>;
  updateItem(item: CounterSaleItemRecord): Promise<void>;
  deleteItem(id: string): Promise<void>;
  findItemsBySaleId(counterSaleId: string): Promise<readonly CounterSaleItemRecord[]>;
  createPayment(payment: CounterSalePaymentRecord): Promise<void>;
  findPaymentsBySaleId(counterSaleId: string): Promise<readonly CounterSalePaymentRecord[]>;
  getOpenSalesCount(accountId: AccountId): Promise<number>;
  getClosedTodayCount(accountId: AccountId): Promise<number>;
  getRevenueToday(accountId: AccountId): Promise<{ gross: number; net: number }>;
  getSalesByPaymentMethod(
    accountId: AccountId,
    dateFrom?: string,
    dateTo?: string
  ): Promise<readonly { method: string; total: number }[]>;
  getTopProducts(
    accountId: AccountId,
    dateFrom?: string,
    dateTo?: string,
    limit?: number
  ): Promise<readonly { name: string; quantity: number; revenue: number }[]>;
  getTopServices(
    accountId: AccountId,
    dateFrom?: string,
    dateTo?: string,
    limit?: number
  ): Promise<readonly { name: string; quantity: number; revenue: number }[]>;
  getLowStockAlerts(
    accountId: AccountId
  ): Promise<{ name: string; code: string; onHand: number; reorderLevel: number }[]>;
}

export class DatabaseCounterSalesRepository implements CounterSalesRepository {
  async create(sale: CounterSaleRecord): Promise<void> {
    return withTenantQuery(getPool(), async (client) => {
      await client.query(
        `INSERT INTO counter_sales (id, account_id, number, owner_id, status, subtotal, discount_amount, total, paid_amount, balance_due, notes, opened_by_user_id, closed_by_user_id, closed_at, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)`,
        [
          sale.id,
          sale.accountId,
          sale.number,
          sale.ownerId,
          sale.status,
          sale.subtotal.toString(),
          sale.discountAmount.toString(),
          sale.total.toString(),
          sale.paidAmount.toString(),
          sale.balanceDue.toString(),
          sale.notes,
          sale.openedByUserId,
          sale.closedByUserId,
          sale.closedAt ? new Date(sale.closedAt) : null,
          new Date(sale.createdAt),
          new Date(sale.updatedAt)
        ]
      );
    });
  }

  async update(sale: CounterSaleRecord): Promise<void> {
    return withTenantQuery(getPool(), async (client) => {
      await client.query(
        `UPDATE counter_sales SET status = $2, subtotal = $3, discount_amount = $4, total = $5, paid_amount = $6, balance_due = $7, notes = $8, closed_by_user_id = $9, closed_at = $10, updated_at = $11 WHERE id = $1`,
        [
          sale.id,
          sale.status,
          sale.subtotal.toString(),
          sale.discountAmount.toString(),
          sale.total.toString(),
          sale.paidAmount.toString(),
          sale.balanceDue.toString(),
          sale.notes,
          sale.closedByUserId,
          sale.closedAt ? new Date(sale.closedAt) : null,
          new Date(sale.updatedAt)
        ]
      );
    });
  }

  async findById(id: string): Promise<CounterSaleRecord | null> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query('SELECT * FROM counter_sales WHERE id = $1', [id]);
      if (result.rows.length === 0) return null;
      return this.mapSale(result.rows[0]);
    });
  }

  async findByAccountId(
    accountId: AccountId,
    filters?: { status?: string; search?: string; ownerId?: string }
  ): Promise<readonly CounterSaleRecord[]> {
    return withTenantQuery(getPool(), async (client) => {
      let sql = 'SELECT * FROM counter_sales WHERE account_id = $1';
      const params: unknown[] = [accountId];
      let paramIdx = 2;

      if (filters?.status) {
        sql += ` AND status = $${paramIdx}`;
        params.push(filters.status);
        paramIdx++;
      }
      if (filters?.ownerId) {
        sql += ` AND owner_id = $${paramIdx}`;
        params.push(filters.ownerId);
        paramIdx++;
      }
      if (filters?.search) {
        sql += ` AND (number ILIKE $${paramIdx} OR notes ILIKE $${paramIdx})`;
        params.push(`%${filters.search}%`);
        paramIdx++;
      }

      sql += ' ORDER BY created_at DESC';
      const result = await client.query(sql, params);
      return result.rows.map((r: Record<string, unknown>) => this.mapSale(r));
    });
  }

  async createItem(item: CounterSaleItemRecord): Promise<void> {
    return withTenantQuery(getPool(), async (client) => {
      await client.query(
        `INSERT INTO counter_sale_items (id, counter_sale_id, account_id, item_type, catalog_item_id, name_snapshot, code_snapshot, unit_price, quantity, discount_amount, line_total, notes, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          item.id,
          item.counterSaleId,
          item.accountId,
          item.itemType,
          item.catalogItemId,
          item.nameSnapshot,
          item.codeSnapshot,
          item.unitPrice.toString(),
          item.quantity,
          item.discountAmount.toString(),
          item.lineTotal.toString(),
          item.notes,
          new Date(item.createdAt),
          new Date(item.updatedAt)
        ]
      );
    });
  }

  async updateItem(item: CounterSaleItemRecord): Promise<void> {
    return withTenantQuery(getPool(), async (client) => {
      await client.query(
        `UPDATE counter_sale_items SET quantity = $2, discount_amount = $3, line_total = $4, notes = $5, updated_at = $6 WHERE id = $1`,
        [
          item.id,
          item.quantity,
          item.discountAmount.toString(),
          item.lineTotal.toString(),
          item.notes,
          new Date(item.updatedAt)
        ]
      );
    });
  }

  async deleteItem(id: string): Promise<void> {
    return withTenantQuery(getPool(), async (client) => {
      await client.query('DELETE FROM counter_sale_items WHERE id = $1', [id]);
    });
  }

  async findItemsBySaleId(counterSaleId: string): Promise<readonly CounterSaleItemRecord[]> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        'SELECT * FROM counter_sale_items WHERE counter_sale_id = $1 ORDER BY created_at',
        [counterSaleId]
      );
      return result.rows.map((r: Record<string, unknown>) => this.mapItem(r));
    });
  }

  async createPayment(payment: CounterSalePaymentRecord): Promise<void> {
    return withTenantQuery(getPool(), async (client) => {
      await client.query(
        `INSERT INTO counter_sale_payments (id, counter_sale_id, account_id, method, amount, installments, reference, notes, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          payment.id,
          payment.counterSaleId,
          payment.accountId,
          payment.method,
          payment.amount.toString(),
          payment.installments,
          payment.reference,
          payment.notes,
          new Date(payment.createdAt)
        ]
      );
    });
  }

  async findPaymentsBySaleId(counterSaleId: string): Promise<readonly CounterSalePaymentRecord[]> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        'SELECT * FROM counter_sale_payments WHERE counter_sale_id = $1 ORDER BY created_at',
        [counterSaleId]
      );
      return result.rows.map((r: Record<string, unknown>) => this.mapPayment(r));
    });
  }

  async getOpenSalesCount(accountId: AccountId): Promise<number> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        'SELECT COUNT(*) FROM counter_sales WHERE account_id = $1 AND status = $2',
        [accountId, 'open']
      );
      return parseInt(result.rows[0].count, 10);
    });
  }

  async getClosedTodayCount(accountId: AccountId): Promise<number> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        'SELECT COUNT(*) FROM counter_sales WHERE account_id = $1 AND status = $2 AND closed_at::date = CURRENT_DATE',
        [accountId, 'closed']
      );
      return parseInt(result.rows[0].count, 10);
    });
  }

  async getRevenueToday(accountId: AccountId): Promise<{ gross: number; net: number }> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `SELECT COALESCE(SUM(total), 0) as gross, COALESCE(SUM(paid_amount), 0) as net
         FROM counter_sales
         WHERE account_id = $1 AND status = $2 AND closed_at::date = CURRENT_DATE`,
        [accountId, 'closed']
      );
      return {
        gross: parseFloat(result.rows[0].gross),
        net: parseFloat(result.rows[0].net)
      };
    });
  }

  async getSalesByPaymentMethod(
    accountId: AccountId,
    dateFrom?: string,
    dateTo?: string
  ): Promise<readonly { method: string; total: number }[]> {
    return withTenantQuery(getPool(), async (client) => {
      let sql = `SELECT method, SUM(amount) as total FROM counter_sale_payments csp
                 JOIN counter_sales cs ON cs.id = csp.counter_sale_id
                 WHERE cs.account_id = $1 AND cs.status = 'closed'`;
      const params: unknown[] = [accountId];
      let paramIdx = 2;

      if (dateFrom) {
        sql += ` AND cs.closed_at >= $${paramIdx}`;
        params.push(dateFrom);
        paramIdx++;
      }
      if (dateTo) {
        sql += ` AND cs.closed_at <= $${paramIdx}`;
        params.push(dateTo);
        paramIdx++;
      }

      sql += ' GROUP BY method ORDER BY total DESC';
      const result = await client.query(sql, params);
      return result.rows.map((r: Record<string, unknown>) => ({
        method: r.method as string,
        total: parseFloat(r.total as string)
      }));
    });
  }

  async getTopProducts(
    accountId: AccountId,
    dateFrom?: string,
    dateTo?: string,
    limit = 10
  ): Promise<readonly { name: string; quantity: number; revenue: number }[]> {
    return withTenantQuery(getPool(), async (client) => {
      let sql = `SELECT csi.name_snapshot as name, SUM(csi.quantity) as quantity, SUM(csi.line_total) as revenue
                 FROM counter_sale_items csi
                 JOIN counter_sales cs ON cs.id = csi.counter_sale_id
                 WHERE cs.account_id = $1 AND cs.status = 'closed' AND csi.item_type = 'product'`;
      const params: unknown[] = [accountId];
      let paramIdx = 2;

      if (dateFrom) {
        sql += ` AND cs.closed_at >= $${paramIdx}`;
        params.push(dateFrom);
        paramIdx++;
      }
      if (dateTo) {
        sql += ` AND cs.closed_at <= $${paramIdx}`;
        params.push(dateTo);
        paramIdx++;
      }

      sql += ` GROUP BY csi.name_snapshot ORDER BY revenue DESC LIMIT $${paramIdx}`;
      params.push(limit);
      const result = await client.query(sql, params);
      return result.rows.map((r: Record<string, unknown>) => ({
        name: r.name as string,
        quantity: parseInt(r.quantity as string, 10),
        revenue: parseFloat(r.revenue as string)
      }));
    });
  }

  async getTopServices(
    accountId: AccountId,
    dateFrom?: string,
    dateTo?: string,
    limit = 10
  ): Promise<readonly { name: string; quantity: number; revenue: number }[]> {
    return withTenantQuery(getPool(), async (client) => {
      let sql = `SELECT csi.name_snapshot as name, SUM(csi.quantity) as quantity, SUM(csi.line_total) as revenue
                 FROM counter_sale_items csi
                 JOIN counter_sales cs ON cs.id = csi.counter_sale_id
                 WHERE cs.account_id = $1 AND cs.status = 'closed' AND csi.item_type = 'service'`;
      const params: unknown[] = [accountId];
      let paramIdx = 2;

      if (dateFrom) {
        sql += ` AND cs.closed_at >= $${paramIdx}`;
        params.push(dateFrom);
        paramIdx++;
      }
      if (dateTo) {
        sql += ` AND cs.closed_at <= $${paramIdx}`;
        params.push(dateTo);
        paramIdx++;
      }

      sql += ` GROUP BY csi.name_snapshot ORDER BY revenue DESC LIMIT $${paramIdx}`;
      params.push(limit);
      const result = await client.query(sql, params);
      return result.rows.map((r: Record<string, unknown>) => ({
        name: r.name as string,
        quantity: parseInt(r.quantity as string, 10),
        revenue: parseFloat(r.revenue as string)
      }));
    });
  }

  async getLowStockAlerts(
    accountId: AccountId
  ): Promise<{ name: string; code: string; onHand: number; reorderLevel: number }[]> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `SELECT name, sku AS code, on_hand_quantity AS "onHand", reorder_level AS "reorderLevel"
         FROM inventory_items
         WHERE account_id = $1 AND on_hand_quantity <= reorder_level
         ORDER BY on_hand_quantity ASC`,
        [accountId]
      );
      return result.rows.map((r: Record<string, unknown>) => ({
        name: r.name as string,
        code: r.code as string,
        onHand: Number(r.onHand),
        reorderLevel: Number(r.reorderLevel)
      }));
    });
  }

  private mapSale(row: Record<string, unknown>): CounterSaleRecord {
    return {
      id: row.id as string,
      accountId: row.account_id as AccountId,
      number: row.number as string,
      ownerId: (row.owner_id as string) ?? null,
      status: row.status as CounterSaleRecord['status'],
      subtotal: parseFloat(row.subtotal as string),
      discountAmount: parseFloat(row.discount_amount as string),
      total: parseFloat(row.total as string),
      paidAmount: parseFloat(row.paid_amount as string),
      balanceDue: parseFloat(row.balance_due as string),
      notes: (row.notes as string) ?? null,
      openedByUserId: row.opened_by_user_id as unknown as UserId,
      closedByUserId: (row.closed_by_user_id as unknown as UserId) ?? null,
      closedAt: row.closed_at ? new Date(row.closed_at as string).toISOString() : null,
      createdAt: new Date(row.created_at as string).toISOString(),
      updatedAt: new Date(row.updated_at as string).toISOString()
    };
  }

  private mapItem(row: Record<string, unknown>): CounterSaleItemRecord {
    return {
      id: row.id as string,
      counterSaleId: row.counter_sale_id as string,
      accountId: row.account_id as AccountId,
      itemType: row.item_type as CounterSaleItemRecord['itemType'],
      catalogItemId: (row.catalog_item_id as string) ?? null,
      nameSnapshot: row.name_snapshot as string,
      codeSnapshot: (row.code_snapshot as string) ?? null,
      unitPrice: parseFloat(row.unit_price as string),
      quantity: parseInt(row.quantity as string, 10),
      discountAmount: parseFloat(row.discount_amount as string),
      lineTotal: parseFloat(row.line_total as string),
      notes: (row.notes as string) ?? null,
      createdAt: new Date(row.created_at as string).toISOString(),
      updatedAt: new Date(row.updated_at as string).toISOString()
    };
  }

  private mapPayment(row: Record<string, unknown>): CounterSalePaymentRecord {
    return {
      id: row.id as string,
      counterSaleId: row.counter_sale_id as string,
      accountId: row.account_id as AccountId,
      method: row.method as CounterSalePaymentRecord['method'],
      amount: parseFloat(row.amount as string),
      installments: parseInt(row.installments as string, 10),
      reference: (row.reference as string) ?? null,
      notes: (row.notes as string) ?? null,
      createdAt: new Date(row.created_at as string).toISOString()
    };
  }
}
