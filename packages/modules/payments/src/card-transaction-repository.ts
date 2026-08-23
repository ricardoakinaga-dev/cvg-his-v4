import { getPool } from '@cvg-his-v2/shared-database';
import { nowIso } from '@cvg-his-v2/shared-utils';
import { getTenantContext, withTenantQuery } from '@cvg-his-v2/tenant-context';

export type CardGatewayProviderName = 'local-card' | 'pagarme-card';
export type CardTransactionStatus =
  | 'pending'
  | 'authorized_pending_capture'
  | 'captured'
  | 'not_authorized'
  | 'failed'
  | 'voided';
export type CardBillingSettlementStatus =
  | 'not_applicable'
  | 'awaiting_capture'
  | 'pending_billing'
  | 'applied'
  | 'failed';

export interface CardTransactionRecord {
  readonly transactionId: string;
  readonly provider: CardGatewayProviderName;
  readonly accountId: string;
  readonly billingRecordId?: string;
  readonly amount: number;
  readonly currency: 'BRL';
  readonly description: string;
  readonly installments: number;
  readonly status: CardTransactionStatus;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly capturedAt?: string;
  readonly lastProviderSyncAt?: string;
  readonly providerOrderId?: string;
  readonly providerChargeId?: string;
  readonly providerAuthorizationCode?: string;
  readonly providerReferenceId?: string;
  readonly failureReason?: string;
  readonly cardHolderName?: string;
  readonly cardBrand?: string;
  readonly cardLast4?: string;
  readonly billingSettlementStatus: CardBillingSettlementStatus;
  readonly billingSettledAt?: string;
  readonly billingSettlementError?: string;
}

export interface UpdateCardTransactionStatusInput {
  readonly transactionId: string;
  readonly status: CardTransactionStatus;
  readonly updatedAt?: string;
  readonly capturedAt?: string;
  readonly lastProviderSyncAt?: string;
  readonly providerOrderId?: string;
  readonly providerChargeId?: string;
  readonly providerAuthorizationCode?: string;
  readonly providerReferenceId?: string;
  readonly failureReason?: string;
  readonly billingSettlementStatus?: CardBillingSettlementStatus;
}

export interface UpdateCardBillingSettlementInput {
  readonly transactionId: string;
  readonly billingSettlementStatus: CardBillingSettlementStatus;
  readonly updatedAt?: string;
  readonly billingSettledAt?: string;
  readonly billingSettlementError?: string;
}

export interface ListCardTransactionsFilters {
  readonly accountId?: string;
  readonly status?: CardTransactionStatus;
  readonly provider?: CardGatewayProviderName;
}

export interface CardTransactionRepository {
  create(transaction: CardTransactionRecord): Promise<void>;
  findByTransactionId(transactionId: string): Promise<CardTransactionRecord | null>;
  updateStatus(input: UpdateCardTransactionStatusInput): Promise<CardTransactionRecord | null>;
  updateBillingSettlement(
    input: UpdateCardBillingSettlementInput
  ): Promise<CardTransactionRecord | null>;
  list(filters?: ListCardTransactionsFilters): Promise<readonly CardTransactionRecord[]>;
}

function toIso(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  return value instanceof Date ? value.toISOString() : new Date(String(value)).toISOString();
}

function mapRow(row: Record<string, unknown>): CardTransactionRecord {
  return {
    transactionId: String(row.transaction_id),
    provider: row.provider as CardGatewayProviderName,
    accountId: String(row.account_id),
    billingRecordId: (row.billing_record_id as string | null) ?? undefined,
    amount: Number(row.amount),
    currency: row.currency as 'BRL',
    description: String(row.description),
    installments: Number(row.installments),
    status: row.status as CardTransactionStatus,
    createdAt: toIso(row.created_at) as string,
    updatedAt: toIso(row.updated_at) as string,
    capturedAt: toIso(row.captured_at),
    lastProviderSyncAt: toIso(row.last_provider_sync_at),
    providerOrderId: (row.provider_order_id as string | null) ?? undefined,
    providerChargeId: (row.provider_charge_id as string | null) ?? undefined,
    providerAuthorizationCode: (row.provider_authorization_code as string | null) ?? undefined,
    providerReferenceId: (row.provider_reference_id as string | null) ?? undefined,
    failureReason: (row.failure_reason as string | null) ?? undefined,
    cardHolderName: (row.card_holder_name as string | null) ?? undefined,
    cardBrand: (row.card_brand as string | null) ?? undefined,
    cardLast4: (row.card_last4 as string | null) ?? undefined,
    billingSettlementStatus: row.billing_settlement_status as CardBillingSettlementStatus,
    billingSettledAt: toIso(row.billing_settled_at),
    billingSettlementError: (row.billing_settlement_error as string | null) ?? undefined
  };
}

function cloneRecord(record: CardTransactionRecord): CardTransactionRecord {
  return { ...record };
}

function recordKey(accountId: string, transactionId: string): string {
  return `${accountId}\u0000${transactionId}`;
}

export class InMemoryCardTransactionRepository implements CardTransactionRepository {
  readonly #records = new Map<string, CardTransactionRecord>();

  async create(transaction: CardTransactionRecord): Promise<void> {
    const key = recordKey(transaction.accountId, transaction.transactionId);
    if (!this.#records.has(key)) {
      this.#records.set(key, cloneRecord(transaction));
    }
  }

  async findByTransactionId(transactionId: string): Promise<CardTransactionRecord | null> {
    const key = this.#resolveKey(transactionId);
    const record = key ? this.#records.get(key) : undefined;
    return record ? cloneRecord(record) : null;
  }

  async updateStatus(
    input: UpdateCardTransactionStatusInput
  ): Promise<CardTransactionRecord | null> {
    const key = this.#resolveKey(input.transactionId);
    const existing = key ? this.#records.get(key) : undefined;
    if (!key || !existing) {
      return null;
    }

    const updated: CardTransactionRecord = {
      ...existing,
      status: input.status,
      updatedAt: input.updatedAt ?? nowIso(),
      capturedAt: input.capturedAt ?? existing.capturedAt,
      lastProviderSyncAt: input.lastProviderSyncAt ?? existing.lastProviderSyncAt,
      providerOrderId: input.providerOrderId ?? existing.providerOrderId,
      providerChargeId: input.providerChargeId ?? existing.providerChargeId,
      providerAuthorizationCode:
        input.providerAuthorizationCode ?? existing.providerAuthorizationCode,
      providerReferenceId: input.providerReferenceId ?? existing.providerReferenceId,
      failureReason: input.failureReason ?? existing.failureReason,
      billingSettlementStatus: input.billingSettlementStatus ?? existing.billingSettlementStatus
    };
    this.#records.set(key, updated);
    return cloneRecord(updated);
  }

  async updateBillingSettlement(
    input: UpdateCardBillingSettlementInput
  ): Promise<CardTransactionRecord | null> {
    const key = this.#resolveKey(input.transactionId);
    const existing = key ? this.#records.get(key) : undefined;
    if (!key || !existing) {
      return null;
    }

    const updated: CardTransactionRecord = {
      ...existing,
      updatedAt: input.updatedAt ?? nowIso(),
      billingSettlementStatus: input.billingSettlementStatus,
      billingSettledAt: input.billingSettledAt,
      billingSettlementError: input.billingSettlementError
    };
    this.#records.set(key, updated);
    return cloneRecord(updated);
  }

  async list(filters?: ListCardTransactionsFilters): Promise<readonly CardTransactionRecord[]> {
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

  #resolveKey(transactionId: string): string | undefined {
    const accountId = getTenantContext()?.accountId;
    if (accountId) {
      const scopedKey = recordKey(accountId, transactionId);
      return this.#records.has(scopedKey) ? scopedKey : undefined;
    }

    const matches = Array.from(this.#records.entries()).filter(
      ([, record]) => record.transactionId === transactionId
    );
    return matches.length === 1 ? matches[0]?.[0] : undefined;
  }
}

/** PostgreSQL-authoritative card transaction persistence used by API and worker runtimes. */
export class DatabaseCardTransactionRepository implements CardTransactionRepository {
  async create(transaction: CardTransactionRecord): Promise<void> {
    await withTenantQuery(getPool(), async (client) => {
      await client.query(
        `INSERT INTO card_transactions (
           transaction_id, provider, account_id, billing_record_id, amount, currency,
           description, installments, status, created_at, updated_at, captured_at,
           last_provider_sync_at, provider_order_id, provider_charge_id,
           provider_authorization_code, provider_reference_id, failure_reason,
           card_holder_name, card_brand, card_last4, billing_settlement_status,
           billing_settled_at, billing_settlement_error
         ) VALUES (
           $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
           $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24
         ) ON CONFLICT (account_id, transaction_id) DO NOTHING`,
        [
          transaction.transactionId,
          transaction.provider,
          transaction.accountId,
          transaction.billingRecordId ?? null,
          transaction.amount,
          transaction.currency,
          transaction.description,
          transaction.installments,
          transaction.status,
          new Date(transaction.createdAt),
          new Date(transaction.updatedAt),
          transaction.capturedAt ? new Date(transaction.capturedAt) : null,
          transaction.lastProviderSyncAt ? new Date(transaction.lastProviderSyncAt) : null,
          transaction.providerOrderId ?? null,
          transaction.providerChargeId ?? null,
          transaction.providerAuthorizationCode ?? null,
          transaction.providerReferenceId ?? null,
          transaction.failureReason ?? null,
          transaction.cardHolderName ?? null,
          transaction.cardBrand ?? null,
          transaction.cardLast4 ?? null,
          transaction.billingSettlementStatus,
          transaction.billingSettledAt ? new Date(transaction.billingSettledAt) : null,
          transaction.billingSettlementError ?? null
        ]
      );
    });
  }

  async findByTransactionId(transactionId: string): Promise<CardTransactionRecord | null> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        'SELECT * FROM card_transactions WHERE transaction_id = $1 LIMIT 1',
        [transactionId]
      );
      return result.rows[0] ? mapRow(result.rows[0] as Record<string, unknown>) : null;
    });
  }

  async updateStatus(
    input: UpdateCardTransactionStatusInput
  ): Promise<CardTransactionRecord | null> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `UPDATE card_transactions
            SET status = $2,
                updated_at = $3,
                captured_at = COALESCE($4, captured_at),
                last_provider_sync_at = COALESCE($5, last_provider_sync_at),
                provider_order_id = COALESCE($6, provider_order_id),
                provider_charge_id = COALESCE($7, provider_charge_id),
                provider_authorization_code = COALESCE($8, provider_authorization_code),
                provider_reference_id = COALESCE($9, provider_reference_id),
                failure_reason = COALESCE($10, failure_reason),
                billing_settlement_status = COALESCE($11, billing_settlement_status)
          WHERE transaction_id = $1
          RETURNING *`,
        [
          input.transactionId,
          input.status,
          new Date(input.updatedAt ?? nowIso()),
          input.capturedAt ? new Date(input.capturedAt) : null,
          input.lastProviderSyncAt ? new Date(input.lastProviderSyncAt) : null,
          input.providerOrderId ?? null,
          input.providerChargeId ?? null,
          input.providerAuthorizationCode ?? null,
          input.providerReferenceId ?? null,
          input.failureReason ?? null,
          input.billingSettlementStatus ?? null
        ]
      );
      return result.rows[0] ? mapRow(result.rows[0] as Record<string, unknown>) : null;
    });
  }

  async updateBillingSettlement(
    input: UpdateCardBillingSettlementInput
  ): Promise<CardTransactionRecord | null> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `UPDATE card_transactions
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

  async list(filters?: ListCardTransactionsFilters): Promise<readonly CardTransactionRecord[]> {
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
      const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
      const result = await client.query(
        `SELECT * FROM card_transactions ${where} ORDER BY created_at DESC`,
        params
      );
      return result.rows.map((row: Record<string, unknown>) => mapRow(row));
    });
  }
}
