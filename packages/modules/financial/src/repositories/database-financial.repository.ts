import { getPool, withTenantTransaction } from '@cvg-his-v2/shared-database';
import { withTenantQuery } from '@cvg-his-v2/tenant-context';
import type { AccountId, EncounterId, UserId } from '@cvg-his-v2/shared-types';
import type {
  EncounterFinancialAccountRecord,
  EncounterFinancialRepository,
  EncounterReceivableListFilters,
  EncounterReceivablePaymentRecord,
  EncounterReceivableRecord,
  FinancialPayableListFilters,
  FinancialPayableRecord,
  FinancialPayablesRepository
} from '../index.js';

function mapFinancialAccount(row: Record<string, unknown>): EncounterFinancialAccountRecord {
  return {
    id: row.id as string,
    accountId: row.account_id as AccountId,
    encounterId: row.encounter_id as EncounterId,
    financialStatus: row.financial_status as EncounterFinancialAccountRecord['financialStatus'],
    subtotalSnapshot: Number(row.subtotal_snapshot),
    discountTotalSnapshot: Number(row.discount_total_snapshot),
    totalSnapshot: Number(row.total_snapshot),
    paidAmount: Number(row.paid_amount),
    balanceDue: Number(row.balance_due),
    closedByUserId: row.closed_by_user_id as
      | string
      | null as EncounterFinancialAccountRecord['closedByUserId'],
    closedAt: row.closed_at ? new Date(row.closed_at as string).toISOString() : null,
    notes: (row.notes as string | null) ?? null,
    snapshotJson: row.snapshot_json as string,
    createdAt: new Date(row.created_at as string).toISOString(),
    updatedAt: new Date(row.updated_at as string).toISOString()
  };
}

function mapReceivable(row: Record<string, unknown>): EncounterReceivableRecord {
  return {
    id: row.id as string,
    accountId: row.account_id as AccountId,
    encounterId: row.encounter_id as EncounterId,
    financialAccountId: row.financial_account_id as string,
    installmentNumber: Number(row.installment_number),
    installmentLabel: row.installment_label as string,
    dueAt: row.due_at ? new Date(row.due_at as string).toISOString() : null,
    status: row.status as EncounterReceivableRecord['status'],
    amountOriginal: Number(row.amount_original),
    amountPaid: Number(row.amount_paid),
    amountOutstanding: Number(row.amount_outstanding),
    issuedAt: new Date(row.issued_at as string).toISOString(),
    settledAt: row.settled_at ? new Date(row.settled_at as string).toISOString() : null,
    notes: (row.notes as string | null) ?? null,
    createdAt: new Date(row.created_at as string).toISOString(),
    updatedAt: new Date(row.updated_at as string).toISOString()
  };
}

function mapPayment(row: Record<string, unknown>): EncounterReceivablePaymentRecord {
  return {
    id: row.id as string,
    accountId: row.account_id as AccountId,
    encounterId: row.encounter_id as EncounterId,
    financialAccountId: row.financial_account_id as string,
    receivableId: row.receivable_id as string,
    amountPaid: Number(row.amount_paid),
    paidAt: new Date(row.paid_at as string).toISOString(),
    paidByUserId: row.paid_by_user_id as
      | string
      | null as EncounterReceivablePaymentRecord['paidByUserId'],
    externalReferenceType: row.external_reference_type as
      | string
      | null as EncounterReceivablePaymentRecord['externalReferenceType'],
    externalReferenceId: (row.external_reference_id as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    createdAt: new Date(row.created_at as string).toISOString()
  };
}

function mapPayable(row: Record<string, unknown>): FinancialPayableRecord {
  return {
    id: row.id as string,
    accountId: row.account_id as AccountId,
    supplierName: row.supplier_name as string,
    description: row.description as string,
    category: row.category as string,
    costCenterCode: row.cost_center_code as string,
    costCenterName: row.cost_center_name as string,
    issuedAt: new Date(row.issued_at as string).toISOString().slice(0, 10),
    dueAt: new Date(row.due_at as string).toISOString().slice(0, 10),
    totalAmount: Number(row.total_amount),
    paidAmount: Number(row.paid_amount),
    outstandingAmount: Number(row.outstanding_amount),
    status: row.status as FinancialPayableRecord['status'],
    sourceExpenseId: (row.source_expense_id as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    paymentMethod: (row.payment_method as FinancialPayableRecord['paymentMethod']) ?? null,
    paymentReference: (row.payment_reference as string | null) ?? null,
    reconciliationStatus:
      (row.reconciliation_status as FinancialPayableRecord['reconciliationStatus'] | null) ??
      'not_required',
    reconciliationReference: (row.reconciliation_reference as string | null) ?? null,
    createdByUserId: row.created_by_user_id as UserId,
    paidByUserId: (row.paid_by_user_id as UserId | null) ?? null,
    cancelledByUserId: (row.cancelled_by_user_id as UserId | null) ?? null,
    reconciledByUserId: (row.reconciled_by_user_id as UserId | null) ?? null,
    createdAt: new Date(row.created_at as string).toISOString(),
    updatedAt: new Date(row.updated_at as string).toISOString(),
    paidAt: row.paid_at ? new Date(row.paid_at as string).toISOString() : null,
    cancelledAt: row.cancelled_at ? new Date(row.cancelled_at as string).toISOString() : null,
    reconciledAt: row.reconciled_at ? new Date(row.reconciled_at as string).toISOString() : null
  };
}

export class DatabaseEncounterFinancialRepository implements EncounterFinancialRepository {
  async withTransaction<T>(accountId: AccountId, operation: () => Promise<T>): Promise<T> {
    return withTenantTransaction(accountId, operation);
  }

  async findFinancialAccountByEncounter(
    encounterId: EncounterId
  ): Promise<EncounterFinancialAccountRecord | null> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        'SELECT * FROM encounter_financial_accounts WHERE encounter_id = $1 LIMIT 1',
        [encounterId]
      );
      return result.rows[0] ? mapFinancialAccount(result.rows[0] as Record<string, unknown>) : null;
    });
  }

  async findFinancialAccountByEncounterForUpdate(
    encounterId: EncounterId
  ): Promise<EncounterFinancialAccountRecord | null> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        'SELECT * FROM encounter_financial_accounts WHERE encounter_id = $1 LIMIT 1 FOR UPDATE',
        [encounterId]
      );
      return result.rows[0] ? mapFinancialAccount(result.rows[0] as Record<string, unknown>) : null;
    });
  }

  async upsertFinancialAccount(account: EncounterFinancialAccountRecord): Promise<void> {
    await withTenantQuery(getPool(), async (client) => {
      return await client.query(
        `INSERT INTO encounter_financial_accounts (
           id, account_id, encounter_id, financial_status, subtotal_snapshot,
           discount_total_snapshot, total_snapshot, paid_amount, balance_due,
           closed_by_user_id, closed_at, notes, snapshot_json, created_at, updated_at
         ) VALUES (
           $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
         )
         ON CONFLICT (encounter_id) DO UPDATE SET
           financial_status = EXCLUDED.financial_status,
           subtotal_snapshot = EXCLUDED.subtotal_snapshot,
           discount_total_snapshot = EXCLUDED.discount_total_snapshot,
           total_snapshot = EXCLUDED.total_snapshot,
           paid_amount = EXCLUDED.paid_amount,
           balance_due = EXCLUDED.balance_due,
           closed_by_user_id = EXCLUDED.closed_by_user_id,
           closed_at = EXCLUDED.closed_at,
           notes = EXCLUDED.notes,
           snapshot_json = EXCLUDED.snapshot_json,
           updated_at = EXCLUDED.updated_at`,
        [
          account.id,
          account.accountId,
          account.encounterId,
          account.financialStatus,
          account.subtotalSnapshot,
          account.discountTotalSnapshot,
          account.totalSnapshot,
          account.paidAmount,
          account.balanceDue,
          account.closedByUserId,
          account.closedAt ? new Date(account.closedAt) : null,
          account.notes,
          account.snapshotJson,
          new Date(account.createdAt),
          new Date(account.updatedAt)
        ]
      );
    });
  }

  async listReceivablesByFinancialAccount(
    financialAccountId: string
  ): Promise<readonly EncounterReceivableRecord[]> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `SELECT * FROM encounter_receivables
         WHERE financial_account_id = $1
         ORDER BY installment_number ASC`,
        [financialAccountId]
      );
      return result.rows.map((row: Record<string, unknown>) => mapReceivable(row));
    });
  }

  async replaceReceivables(
    financialAccountId: string,
    receivables: readonly EncounterReceivableRecord[]
  ): Promise<void> {
    return withTenantQuery(getPool(), async (client) => {
      await client.query(
        'DELETE FROM encounter_receivable_payments WHERE financial_account_id = $1',
        [financialAccountId]
      );
      await client.query('DELETE FROM encounter_receivables WHERE financial_account_id = $1', [
        financialAccountId
      ]);
      for (const receivable of receivables) {
        await client.query(
          `INSERT INTO encounter_receivables (
             id, account_id, encounter_id, financial_account_id, installment_number,
             installment_label, due_at, status, amount_original, amount_paid,
             amount_outstanding, issued_at, settled_at, notes, created_at, updated_at
           ) VALUES (
             $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
           )`,
          [
            receivable.id,
            receivable.accountId,
            receivable.encounterId,
            receivable.financialAccountId,
            receivable.installmentNumber,
            receivable.installmentLabel,
            receivable.dueAt ? new Date(receivable.dueAt) : null,
            receivable.status,
            receivable.amountOriginal,
            receivable.amountPaid,
            receivable.amountOutstanding,
            new Date(receivable.issuedAt),
            receivable.settledAt ? new Date(receivable.settledAt) : null,
            receivable.notes,
            new Date(receivable.createdAt),
            new Date(receivable.updatedAt)
          ]
        );
      }
    });
  }

  async updateReceivable(receivable: EncounterReceivableRecord): Promise<void> {
    await withTenantQuery(getPool(), async (client) => {
      return await client.query(
        `UPDATE encounter_receivables
         SET status = $2,
             amount_original = $3,
             amount_paid = $4,
             amount_outstanding = $5,
             due_at = $6,
             settled_at = $7,
             notes = $8,
             updated_at = $9
         WHERE id = $1`,
        [
          receivable.id,
          receivable.status,
          receivable.amountOriginal,
          receivable.amountPaid,
          receivable.amountOutstanding,
          receivable.dueAt ? new Date(receivable.dueAt) : null,
          receivable.settledAt ? new Date(receivable.settledAt) : null,
          receivable.notes,
          new Date(receivable.updatedAt)
        ]
      );
    });
  }

  async findReceivableById(receivableId: string): Promise<EncounterReceivableRecord | null> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        'SELECT * FROM encounter_receivables WHERE id = $1 LIMIT 1',
        [receivableId]
      );
      return result.rows[0] ? mapReceivable(result.rows[0] as Record<string, unknown>) : null;
    });
  }

  async findReceivableByIdForUpdate(
    receivableId: string
  ): Promise<EncounterReceivableRecord | null> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        'SELECT * FROM encounter_receivables WHERE id = $1 LIMIT 1 FOR UPDATE',
        [receivableId]
      );
      return result.rows[0] ? mapReceivable(result.rows[0] as Record<string, unknown>) : null;
    });
  }

  async listPaymentsByFinancialAccount(
    financialAccountId: string
  ): Promise<readonly EncounterReceivablePaymentRecord[]> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `SELECT * FROM encounter_receivable_payments
         WHERE financial_account_id = $1
           AND NOT EXISTS (
             SELECT 1
               FROM encounter_cash_receipt_reversals AS reversal
              WHERE reversal.account_id = encounter_receivable_payments.account_id
                AND reversal.receivable_payment_id = encounter_receivable_payments.id
           )
         ORDER BY paid_at ASC`,
        [financialAccountId]
      );
      return result.rows.map((row: Record<string, unknown>) => mapPayment(row));
    });
  }

  async hasReversedCashReceiptForFinancialAccount(financialAccountId: string): Promise<boolean> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query<{ readonly exists: boolean }>(
        `SELECT EXISTS (
           SELECT 1
             FROM encounter_cash_receipt_reversals
            WHERE financial_account_id = $1
         ) AS exists`,
        [financialAccountId]
      );
      return result.rows[0]?.exists === true;
    });
  }

  async createPayment(payment: EncounterReceivablePaymentRecord): Promise<void> {
    await withTenantQuery(getPool(), async (client) => {
      return await client.query(
        `INSERT INTO encounter_receivable_payments (
           id, account_id, encounter_id, financial_account_id, receivable_id,
           amount_paid, paid_at, paid_by_user_id, external_reference_type,
           external_reference_id, notes, created_at
         ) VALUES (
           $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12
         )`,
        [
          payment.id,
          payment.accountId,
          payment.encounterId,
          payment.financialAccountId,
          payment.receivableId,
          payment.amountPaid,
          new Date(payment.paidAt),
          payment.paidByUserId,
          payment.externalReferenceType,
          payment.externalReferenceId,
          payment.notes,
          new Date(payment.createdAt)
        ]
      );
    });
  }

  async listReceivables(
    filters?: EncounterReceivableListFilters
  ): Promise<readonly EncounterReceivableRecord[]> {
    return withTenantQuery(getPool(), async (client) => {
      const clauses: string[] = [];
      const params: unknown[] = [];

      if (filters?.accountId) {
        params.push(filters.accountId);
        clauses.push(`account_id = $${params.length}`);
      }
      if (filters?.status) {
        params.push(filters.status);
        clauses.push(`status = $${params.length}`);
      }
      if (filters?.encounterId) {
        params.push(filters.encounterId);
        clauses.push(`encounter_id = $${params.length}`);
      }

      const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
      const result = await client.query(
        `SELECT * FROM encounter_receivables ${whereClause} ORDER BY created_at DESC`,
        params
      );
      return result.rows.map((row: Record<string, unknown>) => mapReceivable(row));
    });
  }
}

export class DatabaseFinancialPayablesRepository implements FinancialPayablesRepository {
  async withTransaction<T>(accountId: AccountId, operation: () => Promise<T>): Promise<T> {
    return withTenantTransaction(accountId, operation);
  }

  async savePayable(payable: FinancialPayableRecord): Promise<void> {
    await withTenantQuery(getPool(), async (client) => {
      await client.query(
        `INSERT INTO financial_payables (
          id, account_id, supplier_name, description, category, cost_center_code,
          cost_center_name, issued_at, due_at, total_amount, paid_amount,
          outstanding_amount, status, source_expense_id, notes, created_by_user_id,
          paid_by_user_id, cancelled_by_user_id, created_at, updated_at, paid_at, cancelled_at,
          payment_method, payment_reference, reconciliation_status, reconciliation_reference,
          reconciled_by_user_id, reconciled_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
          $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24,
          $25, $26, $27, $28
        )`,
        payableParams(payable)
      );
    });
  }

  async updatePayable(payable: FinancialPayableRecord): Promise<void> {
    await withTenantQuery(getPool(), async (client) => {
      await client.query(
        `UPDATE financial_payables
         SET supplier_name = $3,
             description = $4,
             category = $5,
             cost_center_code = $6,
             cost_center_name = $7,
             issued_at = $8,
             due_at = $9,
             total_amount = $10,
             paid_amount = $11,
             outstanding_amount = $12,
             status = $13,
             source_expense_id = $14,
             notes = $15,
             created_by_user_id = $16,
             paid_by_user_id = $17,
             cancelled_by_user_id = $18,
             created_at = $19,
             updated_at = $20,
             paid_at = $21,
             cancelled_at = $22,
             payment_method = $23,
             payment_reference = $24,
             reconciliation_status = $25,
             reconciliation_reference = $26,
             reconciled_by_user_id = $27,
             reconciled_at = $28
         WHERE id = $1 AND account_id = $2`,
        payableParams(payable)
      );
    });
  }

  async findPayableById(payableId: string): Promise<FinancialPayableRecord | null> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query('SELECT * FROM financial_payables WHERE id = $1 LIMIT 1', [
        payableId
      ]);
      return result.rows[0] ? mapPayable(result.rows[0] as Record<string, unknown>) : null;
    });
  }

  async findPayableByIdForUpdate(payableId: string): Promise<FinancialPayableRecord | null> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        'SELECT * FROM financial_payables WHERE id = $1 LIMIT 1 FOR UPDATE',
        [payableId]
      );
      return result.rows[0] ? mapPayable(result.rows[0] as Record<string, unknown>) : null;
    });
  }

  async listPayables(
    filters?: FinancialPayableListFilters
  ): Promise<readonly FinancialPayableRecord[]> {
    return withTenantQuery(getPool(), async (client) => {
      const clauses: string[] = [];
      const params: unknown[] = [];
      if (filters?.accountId) {
        params.push(filters.accountId);
        clauses.push(`account_id = $${params.length}`);
      }
      if (filters?.status) {
        params.push(filters.status);
        clauses.push(`status = $${params.length}`);
      }
      const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
      const result = await client.query(
        `SELECT * FROM financial_payables ${whereClause} ORDER BY due_at ASC, supplier_name ASC`,
        params
      );
      return result.rows.map((row: Record<string, unknown>) => mapPayable(row));
    });
  }
}

function payableParams(payable: FinancialPayableRecord): unknown[] {
  return [
    payable.id,
    payable.accountId,
    payable.supplierName,
    payable.description,
    payable.category,
    payable.costCenterCode,
    payable.costCenterName,
    payable.issuedAt,
    payable.dueAt,
    payable.totalAmount,
    payable.paidAmount,
    payable.outstandingAmount,
    payable.status,
    payable.sourceExpenseId,
    payable.notes,
    payable.createdByUserId,
    payable.paidByUserId,
    payable.cancelledByUserId,
    new Date(payable.createdAt),
    new Date(payable.updatedAt),
    payable.paidAt ? new Date(payable.paidAt) : null,
    payable.cancelledAt ? new Date(payable.cancelledAt) : null,
    payable.paymentMethod,
    payable.paymentReference,
    payable.reconciliationStatus,
    payable.reconciliationReference,
    payable.reconciledByUserId,
    payable.reconciledAt ? new Date(payable.reconciledAt) : null
  ];
}
