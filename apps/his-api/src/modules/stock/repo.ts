type DbClient = typeof import('@cvg-his/db').db;

// =====================
// Stock Items Repo
// =====================

export function createStockItemsRepo(db: DbClient) {
  return {
    async findById(accountId: string, id: string) {
      const result = await db.$client.query(
        `SELECT si.*, p.name as product_name, p.code as product_code
         FROM stock_items si
         LEFT JOIN products p ON p.id = si.product_id
         WHERE si.id = $1 AND si.account_id = $2
         LIMIT 1`,
        [id, accountId]
      );
      return result.rows[0] ? mapStockItem(result.rows[0]) : null;
    },

    async findByProductId(accountId: string, productId: string) {
      const result = await db.$client.query(
        'SELECT * FROM stock_items WHERE account_id = $1 AND product_id = $2 LIMIT 1',
        [accountId, productId]
      );
      return result.rows[0] ? mapStockItem(result.rows[0]) : null;
    },

    async list(accountId: string, options: {
      page?: number;
      pageSize?: number;
      active?: boolean;
      lowStock?: boolean;
      productId?: string;
    } = {}) {
      const page = options.page ?? 1;
      const pageSize = options.pageSize ?? 20;
      const offset = (page - 1) * pageSize;

      const conditions = ['si.account_id = $1'];
      const params: any[] = [accountId];
      let paramIndex = 2;

      if (options.active !== undefined) {
        conditions.push(`si.active = $${paramIndex}`);
        params.push(options.active);
        paramIndex++;
      }
      if (options.productId) {
        conditions.push(`si.product_id = $${paramIndex}`);
        params.push(options.productId);
        paramIndex++;
      }
      if (options.lowStock) {
        conditions.push('si.quantity < si.min_quantity');
      }

      const whereClause = conditions.join(' AND ');

      const [dataResult, countResult] = await Promise.all([
        db.$client.query(
          `SELECT si.*, p.name as product_name, p.code as product_code
           FROM stock_items si
           LEFT JOIN products p ON p.id = si.product_id
           WHERE ${whereClause}
           ORDER BY p.name ASC
           LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
          [...params, pageSize, offset]
        ),
        db.$client.query(
          `SELECT COUNT(*) as count FROM stock_items si WHERE ${whereClause}`,
          params
        )
      ]);

      return {
        data: dataResult.rows.map(mapStockItem),
        page,
        pageSize,
        total: parseInt(countResult.rows[0].count, 10)
      };
    },

    async updateQuantity(accountId: string, productId: string, newQuantity: number) {
      const result = await db.$client.query(
        `UPDATE stock_items SET quantity = $1, updated_at = now()
         WHERE account_id = $2 AND product_id = $3
         RETURNING *`,
        [newQuantity, accountId, productId]
      );
      return result.rows[0] ? mapStockItem(result.rows[0]) : null;
    },

    async ensureExists(accountId: string, productId: string) {
      const existing = await this.findByProductId(accountId, productId);
      if (existing) return existing;

      const result = await db.$client.query(
        `INSERT INTO stock_items (account_id, product_id, quantity, min_quantity, active)
         VALUES ($1, $2, 0, 0, true)
         ON CONFLICT (account_id, product_id) DO UPDATE SET updated_at = now()
         RETURNING *`,
        [accountId, productId]
      );
      return mapStockItem(result.rows[0]);
    },

    async update(accountId: string, id: string, patch: Record<string, unknown>) {
      const sets: string[] = [];
      const params: any[] = [];
      let paramIndex = 1;

      for (const [key, value] of Object.entries(patch)) {
        if (value !== undefined) {
          const dbKey = camelToSnake(key);
          sets.push(`${dbKey} = $${paramIndex}`);
          params.push(value);
          paramIndex++;
        }
      }

      if (sets.length === 0) return null;

      sets.push('updated_at = now()');
      params.push(id, accountId);

      const result = await db.$client.query(
        `UPDATE stock_items SET ${sets.join(', ')}
         WHERE id = $${paramIndex} AND account_id = $${paramIndex + 1}
         RETURNING *`,
        params
      );
      return result.rows[0] ? mapStockItem(result.rows[0]) : null;
    }
  };
}

// =====================
// Stock Lots Repo
// =====================

export function createStockLotsRepo(db: DbClient) {
  return {
    async findById(accountId: string, id: string) {
      const result = await db.$client.query(
        `SELECT sl.*, p.name as product_name
         FROM stock_lots sl
         LEFT JOIN products p ON p.id = sl.product_id
         WHERE sl.id = $1 AND sl.account_id = $2
         LIMIT 1`,
        [id, accountId]
      );
      return result.rows[0] ? mapStockLot(result.rows[0]) : null;
    },

    async list(accountId: string, options: {
      page?: number;
      pageSize?: number;
      productId?: string;
      status?: string;
      expiringBefore?: Date;
      supplier?: string;
    } = {}) {
      const page = options.page ?? 1;
      const pageSize = options.pageSize ?? 20;
      const offset = (page - 1) * pageSize;

      const conditions = ['sl.account_id = $1'];
      const params: any[] = [accountId];
      let paramIndex = 2;

      if (options.productId) {
        conditions.push(`sl.product_id = $${paramIndex}`);
        params.push(options.productId);
        paramIndex++;
      }
      if (options.status) {
        conditions.push(`sl.status = $${paramIndex}`);
        params.push(options.status);
        paramIndex++;
      }
      if (options.expiringBefore) {
        conditions.push(`sl.expiry_date < $${paramIndex}`);
        params.push(options.expiringBefore);
        paramIndex++;
      }
      if (options.supplier) {
        conditions.push(`sl.supplier ILIKE $${paramIndex}`);
        params.push(`%${options.supplier}%`);
        paramIndex++;
      }

      const whereClause = conditions.join(' AND ');

      const [dataResult, countResult] = await Promise.all([
        db.$client.query(
          `SELECT sl.*, p.name as product_name
           FROM stock_lots sl
           LEFT JOIN products p ON p.id = sl.product_id
           WHERE ${whereClause}
           ORDER BY sl.created_at DESC
           LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
          [...params, pageSize, offset]
        ),
        db.$client.query(
          `SELECT COUNT(*) as count FROM stock_lots sl WHERE ${whereClause}`,
          params
        )
      ]);

      return {
        data: dataResult.rows.map(mapStockLot),
        page,
        pageSize,
        total: parseInt(countResult.rows[0].count, 10)
      };
    },

    async create(data: {
      accountId: string;
      productId: string;
      lotNumber: string;
      quantity: number;
      manufactureDate?: Date;
      expiryDate?: Date;
      supplier?: string;
      status?: string;
    }) {
      const result = await db.$client.query(
        `INSERT INTO stock_lots (account_id, product_id, lot_number, quantity, manufacture_date, expiry_date, supplier, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [data.accountId, data.productId, data.lotNumber, data.quantity,
         data.manufactureDate ?? null, data.expiryDate ?? null,
         data.supplier ?? null, data.status ?? 'active']
      );
      return mapStockLot(result.rows[0]);
    },

    async updateQuantity(accountId: string, id: string, newQuantity: number) {
      const status = newQuantity <= 0 ? 'depleted' : undefined;
      const result = await db.$client.query(
        `UPDATE stock_lots SET quantity = $1, status = COALESCE($2, status), updated_at = now()
         WHERE id = $3 AND account_id = $4
         RETURNING *`,
        [newQuantity, status ?? null, id, accountId]
      );
      return result.rows[0] ? mapStockLot(result.rows[0]) : null;
    }
  };
}

// =====================
// Stock Movements Repo
// =====================

export function createStockMovementsRepo(db: DbClient) {
  return {
    async create(data: {
      accountId: string;
      productId: string;
      lotId?: string;
      movementType: string;
      quantity: number;
      previousQuantity: number;
      newQuantity: number;
      unitCost?: number;
      reference?: string;
      notes?: string;
      createdByUserId?: string;
    }) {
      const result = await db.$client.query(
        `INSERT INTO stock_movements (account_id, product_id, lot_id, movement_type, quantity, previous_quantity, new_quantity, unit_cost, reference, notes, created_by_user_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [data.accountId, data.productId, data.lotId ?? null, data.movementType,
         data.quantity, data.previousQuantity, data.newQuantity,
         data.unitCost ?? null, data.reference ?? null, data.notes ?? null,
         data.createdByUserId ?? null]
      );
      return mapStockMovement(result.rows[0]);
    },

    async list(accountId: string, options: {
      page?: number;
      pageSize?: number;
      productId?: string;
      lotId?: string;
      movementType?: string;
      dateFrom?: Date;
      dateTo?: Date;
    } = {}) {
      const page = options.page ?? 1;
      const pageSize = options.pageSize ?? 20;
      const offset = (page - 1) * pageSize;

      const conditions = ['sm.account_id = $1'];
      const params: any[] = [accountId];
      let paramIndex = 2;

      if (options.productId) {
        conditions.push(`sm.product_id = $${paramIndex}`);
        params.push(options.productId);
        paramIndex++;
      }
      if (options.lotId) {
        conditions.push(`sm.lot_id = $${paramIndex}`);
        params.push(options.lotId);
        paramIndex++;
      }
      if (options.movementType) {
        conditions.push(`sm.movement_type = $${paramIndex}`);
        params.push(options.movementType);
        paramIndex++;
      }
      if (options.dateFrom) {
        conditions.push(`sm.created_at > $${paramIndex}`);
        params.push(options.dateFrom);
        paramIndex++;
      }
      if (options.dateTo) {
        conditions.push(`sm.created_at < $${paramIndex}`);
        params.push(options.dateTo);
        paramIndex++;
      }

      const whereClause = conditions.join(' AND ');

      const [dataResult, countResult] = await Promise.all([
        db.$client.query(
          `SELECT sm.*, p.name as product_name
           FROM stock_movements sm
           LEFT JOIN products p ON p.id = sm.product_id
           WHERE ${whereClause}
           ORDER BY sm.created_at DESC
           LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
          [...params, pageSize, offset]
        ),
        db.$client.query(
          `SELECT COUNT(*) as count FROM stock_movements sm WHERE ${whereClause}`,
          params
        )
      ]);

      return {
        data: dataResult.rows.map(mapStockMovement),
        page,
        pageSize,
        total: parseInt(countResult.rows[0].count, 10)
      };
    }
  };
}

// =====================
// Mappers
// =====================

function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

function mapStockItem(row: any) {
  return {
    id: row.id,
    accountId: row.account_id,
    productId: row.product_id,
    productName: row.product_name,
    productCode: row.product_code,
    quantity: row.quantity,
    minQuantity: row.min_quantity,
    maxQuantity: row.max_quantity,
    location: row.location,
    active: row.active,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapStockLot(row: any) {
  return {
    id: row.id,
    accountId: row.account_id,
    productId: row.product_id,
    productName: row.product_name,
    lotNumber: row.lot_number,
    quantity: row.quantity,
    manufactureDate: row.manufacture_date,
    expiryDate: row.expiry_date,
    supplier: row.supplier,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapStockMovement(row: any) {
  return {
    id: row.id,
    accountId: row.account_id,
    productId: row.product_id,
    productName: row.product_name,
    lotId: row.lot_id,
    movementType: row.movement_type,
    quantity: row.quantity,
    previousQuantity: row.previous_quantity,
    newQuantity: row.new_quantity,
    unitCost: row.unit_cost,
    reference: row.reference,
    notes: row.notes,
    createdByUserId: row.created_by_user_id,
    createdAt: row.created_at
  };
}
