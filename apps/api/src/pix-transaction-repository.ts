import { getPool } from '@cvg-his-v2/shared-database';
import { nowIso } from '@cvg-his-v2/shared-utils';
import { withTenantQuery } from '@cvg-his-v2/tenant-context';

export type PixTransactionPersistenceStatus = 'pending' | 'completed' | 'expired' | 'cancelled';
export type PixBillingSettlementStatus =
  | 'not_applicable'
  | 'awaiting_payment'
  | 'pending_billing'
  | 'applied'
  | 'failed';
export type PixCashReconciliationStatus =
  | 'pending'
  | 'not_applicable'
  | 'applied'
  | 'skipped_no_open_register'
  | 'failed';
export type PixGatewayProviderName = 'local-pix' | 'mock' | 'pagarme';

export interface PixTransactionRecord {
  readonly transactionId: string;
  readonly provider: PixGatewayProviderName;
  readonly accountId: string;
  readonly billingRecordId?: string;
  readonly paymentAttemptId?: string;
  readonly amount: number;
  readonly currency: 'BRL';
  readonly description: string;
  readonly qrCodePayload: string;
  readonly qrCodeBase64: string;
  readonly expiresAt: string;
  readonly status: PixTransactionPersistenceStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly providerTransactionId?: string;
  readonly providerConfirmationId?: string;
  readonly providerWebhookEventId?: string;
  readonly completedAt?: string;
  readonly lastProviderSyncAt?: string;
  readonly billingSettlementStatus: PixBillingSettlementStatus;
  readonly billingSettledAt?: string;
  readonly billingSettlementError?: string;
  readonly cashReconciliationStatus: PixCashReconciliationStatus;
  readonly cashReconciledAt?: string;
  readonly cashReconciliationError?: string;
  readonly cashRegisterId?: string;
  readonly cashMovementId?: string;
}

export interface UpdatePixTransactionStatusInput {
  readonly transactionId: string;
  readonly status: PixTransactionPersistenceStatus;
  readonly updatedAt?: string;
  readonly providerTransactionId?: string;
  readonly providerConfirmationId?: string;
  readonly providerWebhookEventId?: string;
  readonly completedAt?: string;
  readonly lastProviderSyncAt?: string;
  readonly billingSettlementStatus?: PixBillingSettlementStatus;
}

export interface UpdatePixBillingSettlementInput {
  readonly transactionId: string;
  readonly billingSettlementStatus: PixBillingSettlementStatus;
  readonly updatedAt?: string;
  readonly billingSettledAt?: string;
  readonly billingSettlementError?: string;
}

export interface UpdatePixCashReconciliationInput {
  readonly transactionId: string;
  readonly cashReconciliationStatus: PixCashReconciliationStatus;
  readonly updatedAt?: string;
  readonly cashReconciledAt?: string;
  readonly cashReconciliationError?: string;
  readonly cashRegisterId?: string;
  readonly cashMovementId?: string;
}

export interface ListPixTransactionsFilters {
  readonly accountId?: string;
  readonly status?: PixTransactionPersistenceStatus;
  readonly provider?: PixGatewayProviderName;
}

export interface PixTransactionRepository {
  create(transaction: PixTransactionRecord): Promise<void>;
  findByTransactionId(transactionId: string): Promise<PixTransactionRecord | null>;
  findByProviderTransactionId(
    provider: PixGatewayProviderName,
    providerTransactionId: string
  ): Promise<PixTransactionRecord | null>;
  updateStatus(input: UpdatePixTransactionStatusInput): Promise<PixTransactionRecord | null>;
  updateBillingSettlement(
    input: UpdatePixBillingSettlementInput
  ): Promise<PixTransactionRecord | null>;
  updateCashReconciliation(
    input: UpdatePixCashReconciliationInput
  ): Promise<PixTransactionRecord | null>;
  list(filters?: ListPixTransactionsFilters): Promise<readonly PixTransactionRecord[]>;
  listCanonicalSettlementTransactionIds(accountId: string): Promise<readonly string[]>;
}

function cloneRecord(record: PixTransactionRecord): PixTransactionRecord {
  return { ...record };
}

function mapRow(row: Record<string, unknown>): PixTransactionRecord {
  return {
    transactionId: row.transaction_id as string,
    provider: row.provider as PixGatewayProviderName,
    accountId: row.account_id as string,
    billingRecordId: (row.billing_record_id as string | null) ?? undefined,
    paymentAttemptId: (row.payment_attempt_id as string | null) ?? undefined,
    amount: Number(row.amount),
    currency: row.currency as 'BRL',
    description: row.description as string,
    qrCodePayload: row.qr_code_payload as string,
    qrCodeBase64: row.qr_code_base64 as string,
    expiresAt: new Date(row.expires_at as string).toISOString(),
    status: row.status as PixTransactionPersistenceStatus,
    createdAt: new Date(row.created_at as string).toISOString(),
    updatedAt: new Date(row.updated_at as string).toISOString(),
    providerTransactionId: (row.provider_transaction_id as string | null) ?? undefined,
    providerConfirmationId: (row.provider_confirmation_id as string | null) ?? undefined,
    providerWebhookEventId: (row.provider_webhook_event_id as string | null) ?? undefined,
    completedAt: row.completed_at ? new Date(row.completed_at as string).toISOString() : undefined,
    lastProviderSyncAt: row.last_provider_sync_at
      ? new Date(row.last_provider_sync_at as string).toISOString()
      : undefined,
    billingSettlementStatus: row.billing_settlement_status as PixBillingSettlementStatus,
    billingSettledAt: row.billing_settled_at
      ? new Date(row.billing_settled_at as string).toISOString()
      : undefined,
    billingSettlementError: (row.billing_settlement_error as string | null) ?? undefined,
    cashReconciliationStatus: row.cash_reconciliation_status as PixCashReconciliationStatus,
    cashReconciledAt: row.cash_reconciled_at
      ? new Date(row.cash_reconciled_at as string).toISOString()
      : undefined,
    cashReconciliationError: (row.cash_reconciliation_error as string | null) ?? undefined,
    cashRegisterId: (row.cash_register_id as string | null) ?? undefined,
    cashMovementId: (row.cash_movement_id as string | null) ?? undefined
  };
}

export class InMemoryPixTransactionRepository implements PixTransactionRepository {
  readonly #records = new Map<string, PixTransactionRecord>();

  async create(transaction: PixTransactionRecord): Promise<void> {
    this.#records.set(transaction.transactionId, cloneRecord(transaction));
  }

  async findByTransactionId(transactionId: string): Promise<PixTransactionRecord | null> {
    const record = this.#records.get(transactionId);
    return record ? cloneRecord(record) : null;
  }

  async findByProviderTransactionId(
    provider: PixGatewayProviderName,
    providerTransactionId: string
  ): Promise<PixTransactionRecord | null> {
    for (const record of this.#records.values()) {
      if (record.provider === provider && record.providerTransactionId === providerTransactionId) {
        return cloneRecord(record);
      }
    }

    return null;
  }

  async updateStatus(input: UpdatePixTransactionStatusInput): Promise<PixTransactionRecord | null> {
    const existing = this.#records.get(input.transactionId);
    if (!existing) {
      return null;
    }

    const updated: PixTransactionRecord = {
      ...existing,
      status: input.status,
      updatedAt: input.updatedAt ?? nowIso(),
      providerTransactionId: input.providerTransactionId ?? existing.providerTransactionId,
      providerConfirmationId: input.providerConfirmationId ?? existing.providerConfirmationId,
      providerWebhookEventId: input.providerWebhookEventId ?? existing.providerWebhookEventId,
      completedAt: input.completedAt ?? existing.completedAt,
      lastProviderSyncAt: input.lastProviderSyncAt ?? existing.lastProviderSyncAt,
      billingSettlementStatus: input.billingSettlementStatus ?? existing.billingSettlementStatus
    };
    this.#records.set(updated.transactionId, updated);
    return cloneRecord(updated);
  }

  async updateBillingSettlement(
    input: UpdatePixBillingSettlementInput
  ): Promise<PixTransactionRecord | null> {
    const existing = this.#records.get(input.transactionId);
    if (!existing) {
      return null;
    }

    const updated: PixTransactionRecord = {
      ...existing,
      updatedAt: input.updatedAt ?? nowIso(),
      billingSettlementStatus: input.billingSettlementStatus,
      billingSettledAt: input.billingSettledAt,
      billingSettlementError: input.billingSettlementError
    };
    this.#records.set(updated.transactionId, updated);
    return cloneRecord(updated);
  }

  async updateCashReconciliation(
    input: UpdatePixCashReconciliationInput
  ): Promise<PixTransactionRecord | null> {
    const existing = this.#records.get(input.transactionId);
    if (!existing) {
      return null;
    }

    const updated: PixTransactionRecord = {
      ...existing,
      updatedAt: input.updatedAt ?? nowIso(),
      cashReconciliationStatus: input.cashReconciliationStatus,
      cashReconciledAt: input.cashReconciledAt ?? existing.cashReconciledAt,
      cashReconciliationError: input.cashReconciliationError ?? existing.cashReconciliationError,
      cashRegisterId: input.cashRegisterId ?? existing.cashRegisterId,
      cashMovementId: input.cashMovementId ?? existing.cashMovementId
    };
    this.#records.set(updated.transactionId, updated);
    return cloneRecord(updated);
  }

  async list(filters?: ListPixTransactionsFilters): Promise<readonly PixTransactionRecord[]> {
    let items = Array.from(this.#records.values());
    if (filters?.accountId) {
      items = items.filter((item) => item.accountId === filters.accountId);
    }
    if (filters?.status) {
      items = items.filter((item) => item.status === filters.status);
    }
    if (filters?.provider) {
      items = items.filter((item) => item.provider === filters.provider);
    }
    return items
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .map((item) => cloneRecord(item));
  }

  async listCanonicalSettlementTransactionIds(accountId: string): Promise<readonly string[]> {
    // The in-memory gateway cannot create the PostgreSQL-authoritative proof.
    void accountId;
    return [];
  }
}

export class DatabasePixTransactionRepository implements PixTransactionRepository {
  async create(transaction: PixTransactionRecord): Promise<void> {
    return withTenantQuery(getPool(), async (client) => {
      await client.query(
        `INSERT INTO pix_transactions (
           transaction_id,
           provider,
           account_id,
           billing_record_id,
           payment_attempt_id,
           amount,
           currency,
           description,
           qr_code_payload,
           qr_code_base64,
           expires_at,
           status,
           created_at,
           updated_at,
           provider_transaction_id,
           provider_confirmation_id,
           provider_webhook_event_id,
           completed_at,
           last_provider_sync_at,
           billing_settlement_status,
           billing_settled_at,
           billing_settlement_error,
           cash_reconciliation_status,
           cash_reconciled_at,
           cash_reconciliation_error,
           cash_register_id,
           cash_movement_id
         ) VALUES (
           $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
           $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21,
           $22, $23, $24, $25, $26, $27
         )`,
        [
          transaction.transactionId,
          transaction.provider,
          transaction.accountId,
          transaction.billingRecordId ?? null,
          transaction.paymentAttemptId ?? null,
          transaction.amount,
          transaction.currency,
          transaction.description,
          transaction.qrCodePayload,
          transaction.qrCodeBase64,
          new Date(transaction.expiresAt),
          transaction.status,
          new Date(transaction.createdAt),
          new Date(transaction.updatedAt),
          transaction.providerTransactionId ?? null,
          transaction.providerConfirmationId ?? null,
          transaction.providerWebhookEventId ?? null,
          transaction.completedAt ? new Date(transaction.completedAt) : null,
          transaction.lastProviderSyncAt ? new Date(transaction.lastProviderSyncAt) : null,
          transaction.billingSettlementStatus,
          transaction.billingSettledAt ? new Date(transaction.billingSettledAt) : null,
          transaction.billingSettlementError ?? null,
          transaction.cashReconciliationStatus,
          transaction.cashReconciledAt ? new Date(transaction.cashReconciledAt) : null,
          transaction.cashReconciliationError ?? null,
          transaction.cashRegisterId ?? null,
          transaction.cashMovementId ?? null
        ]
      );
    });
  }

  async findByTransactionId(transactionId: string): Promise<PixTransactionRecord | null> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        'SELECT * FROM pix_transactions WHERE transaction_id = $1 LIMIT 1',
        [transactionId]
      );
      return result.rows[0] ? mapRow(result.rows[0] as Record<string, unknown>) : null;
    });
  }

  async findByProviderTransactionId(
    provider: PixGatewayProviderName,
    providerTransactionId: string
  ): Promise<PixTransactionRecord | null> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `SELECT * FROM pix_transactions
         WHERE provider = $1 AND provider_transaction_id = $2
         LIMIT 1`,
        [provider, providerTransactionId]
      );
      return result.rows[0] ? mapRow(result.rows[0] as Record<string, unknown>) : null;
    });
  }

  async updateStatus(input: UpdatePixTransactionStatusInput): Promise<PixTransactionRecord | null> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `UPDATE pix_transactions
         SET status = $2,
             updated_at = $3,
             provider_transaction_id = COALESCE($4, provider_transaction_id),
             provider_confirmation_id = COALESCE($5, provider_confirmation_id),
             provider_webhook_event_id = COALESCE($6, provider_webhook_event_id),
             completed_at = COALESCE($7, completed_at),
             last_provider_sync_at = COALESCE($8, last_provider_sync_at),
             billing_settlement_status = COALESCE($9, billing_settlement_status)
         WHERE transaction_id = $1
         RETURNING *`,
        [
          input.transactionId,
          input.status,
          new Date(input.updatedAt ?? nowIso()),
          input.providerTransactionId ?? null,
          input.providerConfirmationId ?? null,
          input.providerWebhookEventId ?? null,
          input.completedAt ? new Date(input.completedAt) : null,
          input.lastProviderSyncAt ? new Date(input.lastProviderSyncAt) : null,
          input.billingSettlementStatus ?? null
        ]
      );
      return result.rows[0] ? mapRow(result.rows[0] as Record<string, unknown>) : null;
    });
  }

  async updateBillingSettlement(
    input: UpdatePixBillingSettlementInput
  ): Promise<PixTransactionRecord | null> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `UPDATE pix_transactions
         SET billing_settlement_status = $2,
             billing_settled_at = $3,
             billing_settlement_error = $4,
             updated_at = $5
         WHERE transaction_id = $1
         RETURNING *`,
        [
          input.transactionId,
          input.billingSettlementStatus,
          input.billingSettledAt ? new Date(input.billingSettledAt) : null,
          input.billingSettlementError ?? null,
          new Date(input.updatedAt ?? nowIso())
        ]
      );
      return result.rows[0] ? mapRow(result.rows[0] as Record<string, unknown>) : null;
    });
  }

  async updateCashReconciliation(
    input: UpdatePixCashReconciliationInput
  ): Promise<PixTransactionRecord | null> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `UPDATE pix_transactions
         SET cash_reconciliation_status = $2,
             cash_reconciled_at = $3,
             cash_reconciliation_error = $4,
             cash_register_id = COALESCE($5, cash_register_id),
             cash_movement_id = COALESCE($6, cash_movement_id),
             updated_at = $7
         WHERE transaction_id = $1
         RETURNING *`,
        [
          input.transactionId,
          input.cashReconciliationStatus,
          input.cashReconciledAt ? new Date(input.cashReconciledAt) : null,
          input.cashReconciliationError ?? null,
          input.cashRegisterId ?? null,
          input.cashMovementId ?? null,
          new Date(input.updatedAt ?? nowIso())
        ]
      );
      return result.rows[0] ? mapRow(result.rows[0] as Record<string, unknown>) : null;
    });
  }

  async list(filters?: ListPixTransactionsFilters): Promise<readonly PixTransactionRecord[]> {
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
      if (filters?.provider) {
        params.push(filters.provider);
        clauses.push(`provider = $${params.length}`);
      }

      const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
      const result = await client.query(
        `SELECT * FROM pix_transactions ${whereClause} ORDER BY created_at DESC`,
        params
      );
      return result.rows.map((row: Record<string, unknown>) => mapRow(row));
    });
  }

  async listCanonicalSettlementTransactionIds(accountId: string): Promise<readonly string[]> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query<{ readonly transaction_id: string }>(
        `SELECT transaction_id
           FROM encounter_non_cash_receipts
          WHERE account_id = $1
          ORDER BY confirmed_at DESC`,
        [accountId]
      );
      return result.rows.map((row) => row.transaction_id);
    });
  }
}
