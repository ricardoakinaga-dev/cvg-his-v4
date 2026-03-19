type DbClient = typeof import('@cvg-his/db').db;

export function createDashboardRepo(db: DbClient) {
  return {
    // =====================
    // Appointments KPIs
    // =====================

    async getAppointmentsKPIs(accountId: string, dateFrom: Date, dateTo: Date) {
      const result = await db.$client.query(
        `SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'completed') as completed,
          COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
          COUNT(*) FILTER (WHERE status = 'no_show') as no_show,
          COUNT(*) FILTER (WHERE status = 'scheduled') as scheduled,
          COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress
         FROM appointments
         WHERE account_id = $1 AND start_at >= $2 AND start_at <= $3`,
        [accountId, dateFrom, dateTo]
      );
      const r = result.rows[0];
      return {
        total: parseInt(r.total, 10),
        completed: parseInt(r.completed, 10),
        cancelled: parseInt(r.cancelled, 10),
        noShow: parseInt(r.no_show, 10),
        scheduled: parseInt(r.scheduled, 10),
        inProgress: parseInt(r.in_progress, 10)
      };
    },

    async getAppointmentsByDay(accountId: string, dateFrom: Date, dateTo: Date) {
      const result = await db.$client.query(
        `SELECT 
          DATE(start_at) as date,
          COUNT(*) as count,
          COUNT(*) FILTER (WHERE status = 'completed') as completed
         FROM appointments
         WHERE account_id = $1 AND start_at >= $2 AND start_at <= $3
         GROUP BY DATE(start_at)
         ORDER BY date`,
        [accountId, dateFrom, dateTo]
      );
      return result.rows.map(r => ({
        date: r.date,
        count: parseInt(r.count, 10),
        completed: parseInt(r.completed, 10)
      }));
    },

    // =====================
    // Financial KPIs
    // =====================

    async getFinancialKPIs(accountId: string, dateFrom: Date, dateTo: Date) {
      // Payments received
      const paymentsResult = await db.$client.query(
        `SELECT 
          COALESCE(SUM(amount), 0) as total_received,
          COUNT(*) as payment_count
         FROM payments
         WHERE account_id = $1 AND status = 'completed'
           AND created_at >= $2 AND created_at <= $3`,
        [accountId, dateFrom, dateTo]
      );

      // Receivables (open balance)
      const receivablesResult = await db.$client.query(
        `SELECT 
          COALESCE(SUM(amount_outstanding), 0) as total_outstanding,
          COUNT(*) FILTER (WHERE status = 'open') as open_count
         FROM encounter_receivables
         WHERE account_id = $1`,
        [accountId]
      );

      // By payment method
      const methodResult = await db.$client.query(
        `SELECT method, COALESCE(SUM(amount), 0) as total, COUNT(*) as count
         FROM payments
         WHERE account_id = $1 AND status = 'completed'
           AND created_at >= $2 AND created_at <= $3
         GROUP BY method
         ORDER BY total DESC`,
        [accountId, dateFrom, dateTo]
      );

      return {
        totalReceived: parseFloat(paymentsResult.rows[0].total_received),
        paymentCount: parseInt(paymentsResult.rows[0].payment_count, 10),
        totalOutstanding: parseFloat(receivablesResult.rows[0].total_outstanding),
        openReceivables: parseInt(receivablesResult.rows[0].open_count, 10),
        byMethod: methodResult.rows.map(r => ({
          method: r.method,
          total: parseFloat(r.total),
          count: parseInt(r.count, 10)
        }))
      };
    },

    async getRevenueByDay(accountId: string, dateFrom: Date, dateTo: Date) {
      const result = await db.$client.query(
        `SELECT 
          DATE(created_at) as date,
          COALESCE(SUM(amount), 0) as total
         FROM payments
         WHERE account_id = $1 AND status = 'completed'
           AND created_at >= $2 AND created_at <= $3
         GROUP BY DATE(created_at)
         ORDER BY date`,
        [accountId, dateFrom, dateTo]
      );
      return result.rows.map(r => ({
        date: r.date,
        total: parseFloat(r.total)
      }));
    },

    // =====================
    // Stock KPIs
    // =====================

    async getStockKPIs(accountId: string) {
      const result = await db.$client.query(
        `SELECT 
          COUNT(*) as total_products,
          COALESCE(SUM(quantity), 0) as total_units,
          COUNT(*) FILTER (WHERE quantity < min_quantity AND min_quantity > 0) as low_stock
         FROM stock_items
         WHERE account_id = $1 AND active = true`,
        [accountId]
      );

      const expiringResult = await db.$client.query(
        `SELECT COUNT(*) as expiring
         FROM stock_lots
         WHERE account_id = $1 AND status = 'active'
           AND expiry_date < NOW() + INTERVAL '30 days'`,
        [accountId]
      );

      return {
        totalProducts: parseInt(result.rows[0].total_products, 10),
        totalUnits: parseInt(result.rows[0].total_units, 10),
        lowStock: parseInt(result.rows[0].low_stock, 10),
        expiringLots: parseInt(expiringResult.rows[0].expiring, 10)
      };
    },

    // =====================
    // Cash KPIs
    // =====================

    async getCashKPIs(accountId: string) {
      // Current open register
      const openResult = await db.$client.query(
        `SELECT id, opening_amount, opened_at
         FROM cash_registers
         WHERE account_id = $1 AND status = 'open'
         LIMIT 1`,
        [accountId]
      );

      if (openResult.rows.length === 0) {
        return { hasOpenRegister: false };
      }

      const reg = openResult.rows[0];

      // Get current balance
      const balanceResult = await db.$client.query(
        `SELECT running_balance
         FROM cash_movements
         WHERE cash_register_id = $1
         ORDER BY created_at DESC
         LIMIT 1`,
        [reg.id]
      );

      const currentBalance = balanceResult.rows.length > 0
        ? parseFloat(balanceResult.rows[0].running_balance)
        : parseFloat(reg.opening_amount);

      return {
        hasOpenRegister: true,
        registerId: reg.id,
        openingAmount: parseFloat(reg.opening_amount),
        currentBalance,
        openedAt: reg.opened_at
      };
    },

    // =====================
    // Patients KPIs
    // =====================

    async getPatientsKPIs(accountId: string) {
      const result = await db.$client.query(
        `SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as new_this_month
         FROM patients
         WHERE account_id = $1`,
        [accountId]
      );
      return {
        total: parseInt(result.rows[0].total, 10),
        newThisMonth: parseInt(result.rows[0].new_this_month, 10)
      };
    },

    // =====================
    // Exams KPIs
    // =====================

    async getExamsKPIs(accountId: string, dateFrom: Date, dateTo: Date) {
      const result = await db.$client.query(
        `SELECT 
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'requested') as pending,
          COUNT(*) FILTER (WHERE status = 'completed') as completed
         FROM exam_orders
         WHERE account_id = $1 AND requested_at >= $2 AND requested_at <= $3`,
        [accountId, dateFrom, dateTo]
      );
      return {
        total: parseInt(result.rows[0].total, 10),
        pending: parseInt(result.rows[0].pending, 10),
        completed: parseInt(result.rows[0].completed, 10)
      };
    },

    // =====================
    // Inpatient KPIs
    // =====================

    async getInpatientKPIs(accountId: string) {
      const result = await db.$client.query(
        `SELECT 
          COUNT(*) FILTER (WHERE status = 'active') as active_stays,
          COUNT(*) FILTER (WHERE status = 'discharged' AND discharged_at >= NOW() - INTERVAL '7 days') as discharged_week
         FROM inpatient_stays
         WHERE account_id = $1`,
        [accountId]
      );

      const bedsResult = await db.$client.query(
        `SELECT 
          COUNT(*) as total_beds
         FROM beds
         WHERE account_id = $1 AND is_active = true`,
        [accountId]
      );

      // Count occupied beds from active stays
      const occupiedResult = await db.$client.query(
        `SELECT COUNT(DISTINCT bed_id) as occupied
         FROM inpatient_stays
         WHERE account_id = $1 AND status = 'active' AND bed_id IS NOT NULL`,
        [accountId]
      );

      return {
        activeStays: parseInt(result.rows[0].active_stays, 10),
        dischargedThisWeek: parseInt(result.rows[0].discharged_week, 10),
        totalBeds: parseInt(bedsResult.rows[0].total_beds, 10),
        occupiedBeds: parseInt(occupiedResult.rows[0].occupied, 10)
      };
    }
  };
}
