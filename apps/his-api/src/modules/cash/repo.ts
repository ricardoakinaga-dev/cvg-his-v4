type DbClient = typeof import('@cvg-his/db').db;

export function createCashRepo(db: DbClient) {
  return {
    // =====================
    // Cash Registers
    // =====================

    async findOpenRegister(accountId: string) {
      const result = await db.$client.query(
        `SELECT cr.*, 
                u1.full_name as opened_by_name,
                u2.full_name as closed_by_name
         FROM cash_registers cr
         LEFT JOIN users u1 ON u1.id = cr.opened_by_user_id
         LEFT JOIN users u2 ON u2.id = cr.closed_by_user_id
         WHERE cr.account_id = $1 AND cr.status = 'open'
         LIMIT 1`,
        [accountId]
      );
      return result.rows[0] ? mapCashRegister(result.rows[0]) : null;
    },

    async findRegisterById(accountId: string, id: string) {
      const result = await db.$client.query(
        `SELECT cr.*,
                u1.full_name as opened_by_name,
                u2.full_name as closed_by_name
         FROM cash_registers cr
         LEFT JOIN users u1 ON u1.id = cr.opened_by_user_id
         LEFT JOIN users u2 ON u2.id = cr.closed_by_user_id
         WHERE cr.id = $1 AND cr.account_id = $2
         LIMIT 1`,
        [id, accountId]
      );
      return result.rows[0] ? mapCashRegister(result.rows[0]) : null;
    },

    async listRegisters(accountId: string, options: { page?: number; pageSize?: number; status?: string } = {}) {
      const page = options.page ?? 1;
      const pageSize = options.pageSize ?? 20;
      const offset = (page - 1) * pageSize;

      const conditions = ['cr.account_id = $1'];
      const params: any[] = [accountId];
      let idx = 2;

      if (options.status) {
        conditions.push(`cr.status = $${idx}`);
        params.push(options.status);
        idx++;
      }

      const where = conditions.join(' AND ');

      const [dataResult, countResult] = await Promise.all([
        db.$client.query(
          `SELECT cr.*,
                  u1.full_name as opened_by_name,
                  u2.full_name as closed_by_name
           FROM cash_registers cr
           LEFT JOIN users u1 ON u1.id = cr.opened_by_user_id
           LEFT JOIN users u2 ON u2.id = cr.closed_by_user_id
           WHERE ${where}
           ORDER BY cr.opened_at DESC
           LIMIT $${idx} OFFSET $${idx + 1}`,
          [...params, pageSize, offset]
        ),
        db.$client.query(
          `SELECT COUNT(*) as count FROM cash_registers cr WHERE ${where}`,
          params
        )
      ]);

      return {
        data: dataResult.rows.map(mapCashRegister),
        page,
        pageSize,
        total: parseInt(countResult.rows[0].count, 10)
      };
    },

    async openRegister(data: {
      accountId: string;
      openedByUserId: string;
      openingAmount: number;
      notes?: string;
    }) {
      const result = await db.$client.query(
        `INSERT INTO cash_registers (account_id, opened_by_user_id, opening_amount, status, notes)
         VALUES ($1, $2, $3, 'open', $4)
         RETURNING *`,
        [data.accountId, data.openedByUserId, data.openingAmount, data.notes ?? null]
      );
      return mapCashRegister(result.rows[0]);
    },

    async closeRegister(data: {
      accountId: string;
      registerId: string;
      closedByUserId: string;
      closingAmount: number;
      expectedClosingAmount: number;
      difference: number;
      notes?: string;
    }) {
      const result = await db.$client.query(
        `UPDATE cash_registers 
         SET status = 'closed', closed_by_user_id = $1, closing_amount = $2,
             expected_closing_amount = $3, difference = $4, notes = COALESCE($5, notes),
             closed_at = now(), updated_at = now()
         WHERE id = $6 AND account_id = $7 AND status = 'open'
         RETURNING *`,
        [data.closedByUserId, data.closingAmount, data.expectedClosingAmount,
         data.difference, data.notes ?? null, data.registerId, data.accountId]
      );
      return result.rows[0] ? mapCashRegister(result.rows[0]) : null;
    },

    // =====================
    // Cash Movements
    // =====================

    async createMovement(data: {
      cashRegisterId: string;
      accountId: string;
      movementType: string;
      amount: number;
      runningBalance: number;
      reference?: string;
      notes?: string;
      createdByUserId?: string;
    }) {
      const result = await db.$client.query(
        `INSERT INTO cash_movements (cash_register_id, account_id, movement_type, amount, running_balance, reference, notes, created_by_user_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [data.cashRegisterId, data.accountId, data.movementType, data.amount,
         data.runningBalance, data.reference ?? null, data.notes ?? null, data.createdByUserId ?? null]
      );
      return mapCashMovement(result.rows[0]);
    },

    async listMovements(accountId: string, options: {
      page?: number;
      pageSize?: number;
      cashRegisterId?: string;
      movementType?: string;
      dateFrom?: Date;
      dateTo?: Date;
    } = {}) {
      const page = options.page ?? 1;
      const pageSize = options.pageSize ?? 50;
      const offset = (page - 1) * pageSize;

      const conditions = ['cm.account_id = $1'];
      const params: any[] = [accountId];
      let idx = 2;

      if (options.cashRegisterId) {
        conditions.push(`cm.cash_register_id = $${idx}`);
        params.push(options.cashRegisterId);
        idx++;
      }
      if (options.movementType) {
        conditions.push(`cm.movement_type = $${idx}`);
        params.push(options.movementType);
        idx++;
      }
      if (options.dateFrom) {
        conditions.push(`cm.created_at >= $${idx}`);
        params.push(options.dateFrom);
        idx++;
      }
      if (options.dateTo) {
        conditions.push(`cm.created_at <= $${idx}`);
        params.push(options.dateTo);
        idx++;
      }

      const where = conditions.join(' AND ');

      const [dataResult, countResult] = await Promise.all([
        db.$client.query(
          `SELECT cm.*,
                  u.full_name as created_by_name
           FROM cash_movements cm
           LEFT JOIN users u ON u.id = cm.created_by_user_id
           WHERE ${where}
           ORDER BY cm.created_at DESC
           LIMIT $${idx} OFFSET $${idx + 1}`,
          [...params, pageSize, offset]
        ),
        db.$client.query(
          `SELECT COUNT(*) as count FROM cash_movements cm WHERE ${where}`,
          params
        )
      ]);

      return {
        data: dataResult.rows.map(mapCashMovement),
        page,
        pageSize,
        total: parseInt(countResult.rows[0].count, 10)
      };
    },

    async getSummary(registerId: string) {
      const result = await db.$client.query(
        `SELECT 
          cm.movement_type,
          COUNT(*) as count,
          COALESCE(SUM(
            CASE WHEN cm.movement_type IN ('opening', 'payment', 'supply') THEN cm.amount
                 WHEN cm.movement_type IN ('withdrawal', 'closing') THEN -cm.amount
                 ELSE cm.amount
            END
          ), 0) as total
         FROM cash_movements cm
         WHERE cm.cash_register_id = $1
         GROUP BY cm.movement_type`,
        [registerId]
      );

      let totalPayments = 0;
      let totalSupplies = 0;
      let totalWithdrawals = 0;

      for (const row of result.rows) {
        const amount = parseFloat(row.total);
        if (row.movement_type === 'payment') totalPayments = amount;
        if (row.movement_type === 'supply') totalSupplies = amount;
        if (row.movement_type === 'withdrawal') totalWithdrawals = amount;
      }

      return { totalPayments, totalSupplies, totalWithdrawals };
    }
  };
}

function mapCashRegister(row: any) {
  return {
    id: row.id,
    accountId: row.account_id,
    openedByUserId: row.opened_by_user_id,
    openedByName: row.opened_by_name,
    closedByUserId: row.closed_by_user_id,
    closedByName: row.closed_by_name,
    openingAmount: parseFloat(row.opening_amount),
    closingAmount: row.closing_amount ? parseFloat(row.closing_amount) : null,
    expectedClosingAmount: row.expected_closing_amount ? parseFloat(row.expected_closing_amount) : null,
    difference: row.difference ? parseFloat(row.difference) : null,
    status: row.status,
    openedAt: row.opened_at,
    closedAt: row.closed_at,
    notes: row.notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapCashMovement(row: any) {
  return {
    id: row.id,
    cashRegisterId: row.cash_register_id,
    accountId: row.account_id,
    movementType: row.movement_type,
    amount: parseFloat(row.amount),
    runningBalance: parseFloat(row.running_balance),
    reference: row.reference,
    notes: row.notes,
    createdByName: row.created_by_name,
    createdByUserId: row.created_by_user_id,
    createdAt: row.created_at
  };
}
