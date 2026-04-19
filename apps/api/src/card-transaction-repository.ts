import { nowIso } from '@cvg-his-v2/shared-utils';

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

function cloneRecord(record: CardTransactionRecord): CardTransactionRecord {
  return { ...record };
}

export class InMemoryCardTransactionRepository implements CardTransactionRepository {
  readonly #records = new Map<string, CardTransactionRecord>();

  async create(transaction: CardTransactionRecord): Promise<void> {
    this.#records.set(transaction.transactionId, cloneRecord(transaction));
  }

  async findByTransactionId(transactionId: string): Promise<CardTransactionRecord | null> {
    const record = this.#records.get(transactionId);
    return record ? cloneRecord(record) : null;
  }

  async updateStatus(
    input: UpdateCardTransactionStatusInput
  ): Promise<CardTransactionRecord | null> {
    const existing = this.#records.get(input.transactionId);
    if (!existing) {
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
      billingSettlementStatus:
        input.billingSettlementStatus ?? existing.billingSettlementStatus
    };
    this.#records.set(updated.transactionId, updated);
    return cloneRecord(updated);
  }

  async updateBillingSettlement(
    input: UpdateCardBillingSettlementInput
  ): Promise<CardTransactionRecord | null> {
    const existing = this.#records.get(input.transactionId);
    if (!existing) {
      return null;
    }

    const updated: CardTransactionRecord = {
      ...existing,
      updatedAt: input.updatedAt ?? nowIso(),
      billingSettlementStatus: input.billingSettlementStatus,
      billingSettledAt: input.billingSettledAt,
      billingSettlementError: input.billingSettlementError
    };
    this.#records.set(updated.transactionId, updated);
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
}
