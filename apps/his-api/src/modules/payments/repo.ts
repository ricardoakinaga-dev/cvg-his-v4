type DbClient = typeof import('@cvg-his/db').db;

export function createPaymentsRepo(db: DbClient) {
  return {
    async findById(accountId: string, id: string) {
      const result = await db.$client.query(
        `SELECT p.*, 
                efa.encounter_id,
                enc.patient_id,
                pat.name as patient_name
         FROM payments p
         LEFT JOIN encounter_financial_accounts efa ON efa.id = p.financial_account_id
         LEFT JOIN encounters enc ON enc.id = efa.encounter_id
         LEFT JOIN patients pat ON pat.id = enc.patient_id
         WHERE p.id = $1 AND p.account_id = $2
         LIMIT 1`,
        [id, accountId]
      );
      return result.rows[0] ? mapPayment(result.rows[0]) : null;
    },

    async list(accountId: string, options: {
      page?: number;
      pageSize?: number;
      financialAccountId?: string;
      method?: string;
      status?: string;
      dateFrom?: Date;
      dateTo?: Date;
    } = {}) {
      const page = options.page ?? 1;
      const pageSize = options.pageSize ?? 20;
      const offset = (page - 1) * pageSize;

      const conditions = ['p.account_id = $1'];
      const params: any[] = [accountId];
      let idx = 2;

      if (options.financialAccountId) {
        conditions.push(`p.financial_account_id = $${idx}`);
        params.push(options.financialAccountId);
        idx++;
      }
      if (options.method) {
        conditions.push(`p.method = $${idx}`);
        params.push(options.method);
        idx++;
      }
      if (options.status) {
        conditions.push(`p.status = $${idx}`);
        params.push(options.status);
        idx++;
      }
      if (options.dateFrom) {
        conditions.push(`p.created_at >= $${idx}`);
        params.push(options.dateFrom);
        idx++;
      }
      if (options.dateTo) {
        conditions.push(`p.created_at <= $${idx}`);
        params.push(options.dateTo);
        idx++;
      }

      const where = conditions.join(' AND ');

      const [dataResult, countResult] = await Promise.all([
        db.$client.query(
          `SELECT p.*,
                  efa.encounter_id,
                  enc.patient_id,
                  pat.name as patient_name
           FROM payments p
           LEFT JOIN encounter_financial_accounts efa ON efa.id = p.financial_account_id
           LEFT JOIN encounters enc ON enc.id = efa.encounter_id
           LEFT JOIN patients pat ON pat.id = enc.patient_id
           WHERE ${where}
           ORDER BY p.created_at DESC
           LIMIT $${idx} OFFSET $${idx + 1}`,
          [...params, pageSize, offset]
        ),
        db.$client.query(
          `SELECT COUNT(*) as count FROM payments p WHERE ${where}`,
          params
        )
      ]);

      return {
        data: dataResult.rows.map(mapPayment),
        page,
        pageSize,
        total: parseInt(countResult.rows[0].count, 10)
      };
    },

    async create(data: {
      accountId: string;
      financialAccountId: string;
      amount: number;
      method: string;
      status?: string;
      installments?: number;
      installmentNumber?: number;
      reference?: string;
      notes?: string;
      processedByUserId?: string;
    }) {
      const result = await db.$client.query(
        `INSERT INTO payments (account_id, financial_account_id, amount, method, status, installments, installment_number, reference, notes, processed_by_user_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [data.accountId, data.financialAccountId, data.amount, data.method,
         data.status ?? 'completed', data.installments ?? 1, data.installmentNumber ?? 1,
         data.reference ?? null, data.notes ?? null, data.processedByUserId ?? null]
      );
      return mapPayment(result.rows[0]);
    },

    async updateStatus(accountId: string, id: string, status: string) {
      const result = await db.$client.query(
        `UPDATE payments SET status = $1, updated_at = now()
         WHERE id = $2 AND account_id = $3
         RETURNING *`,
        [status, id, accountId]
      );
      return result.rows[0] ? mapPayment(result.rows[0]) : null;
    },

    async getSummaryByDateRange(accountId: string, dateFrom: Date, dateTo: Date) {
      const result = await db.$client.query(
        `SELECT method, COUNT(*) as count, COALESCE(SUM(amount), 0) as total_amount
         FROM payments
         WHERE account_id = $1 AND status = 'completed'
           AND created_at >= $2 AND created_at <= $3
         GROUP BY method
         ORDER BY method`,
        [accountId, dateFrom, dateTo]
      );

      const data = result.rows.map(r => ({
        method: r.method,
        count: parseInt(r.count, 10),
        totalAmount: parseFloat(r.total_amount)
      }));

      const totalPayments = data.reduce((sum, d) => sum + d.count, 0);
      const totalAmount = data.reduce((sum, d) => sum + d.totalAmount, 0);

      return { data, totalPayments, totalAmount };
    }
  };
}

function mapPayment(row: any) {
  return {
    id: row.id,
    accountId: row.account_id,
    financialAccountId: row.financial_account_id,
    encounterId: row.encounter_id,
    patientName: row.patient_name,
    amount: parseFloat(row.amount),
    method: row.method,
    status: row.status,
    installments: row.installments,
    installmentNumber: row.installment_number,
    reference: row.reference,
    notes: row.notes,
    processedByUserId: row.processed_by_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
