import { getPool } from '@cvg-his-v2/shared-database';
import { withTenantQuery } from '@cvg-his-v2/tenant-context';
import type { AccountId, EncounterId } from '@cvg-his-v2/shared-types';
import type {
  EncounterFinancialAccountRecord,
  EncounterFinancialRepository,
  EncounterReceivableListFilters,
  EncounterReceivablePaymentRecord,
  EncounterReceivableRecord
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
    closedByUserId: (row.closed_by_user_id as string | null) as EncounterFinancialAccountRecord['closedByUserId'],
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
    paidByUserId: (row.paid_by_user_id as string | null) as EncounterReceivablePaymentRecord['paidByUserId'],
    externalReferenceType:
      (row.external_reference_type as string | null) as EncounterReceivablePaymentRecord['externalReferenceType'],
    externalReferenceId: (row.external_reference_id as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    createdAt: new Date(row.created_at as string).toISOString()
  };
}

export class DatabaseEncounterFinancialRepository implements EncounterFinancialRepository {
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
      await client.query('DELETE FROM encounter_receivable_payments WHERE financial_account_id = $1', [
        financialAccountId
      ]);
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

  async listPaymentsByFinancialAccount(
    financialAccountId: string
  ): Promise<readonly EncounterReceivablePaymentRecord[]> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `SELECT * FROM encounter_receivable_payments
         WHERE financial_account_id = $1
         ORDER BY paid_at ASC`,
        [financialAccountId]
      );
      return result.rows.map((row: Record<string, unknown>) => mapPayment(row));
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
