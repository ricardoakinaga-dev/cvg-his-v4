import { randomUUID } from 'node:crypto';
import {
  AuthenticationError,
  ConflictError,
  NotFoundError,
  ValidationError
} from '@cvg-his-v2/shared-errors';
import type { AccountId, UserId } from '@cvg-his-v2/shared-types';
import { createCorrelationId, nowIso } from '@cvg-his-v2/shared-utils';
import type {
  CounterSalesRepository,
  CounterSaleRecord,
  CounterSaleDraft,
  CounterSaleItemRecord,
  CounterSalePaymentRecord,
  CounterSaleReceiptRecord,
  CounterSaleListFilters,
  CounterSaleCancellationHistoryRecord
} from './repositories/database-counter-sales.repository.js';
import {
  MAX_CHEQUE_REPORT_ROWS,
  MAX_COUNTER_SALE_REPORT_ROWS
} from './repositories/database-counter-sales.repository.js';

export interface CounterSaleSummary {
  readonly id: string;
  readonly accountId: AccountId;
  readonly number: string;
  readonly ownerId: string | null;
  readonly patientId: string | null;
  readonly encounterId: string | null;
  readonly queueEntryId: string | null;
  readonly billingRecordId: string | null;
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

export interface CounterSaleReceiptSummary {
  readonly id: string;
  readonly accountId: AccountId;
  readonly counterSaleId: string;
  readonly amount: number;
  readonly currency: 'BRL';
  readonly receivedByUserId: UserId;
  readonly receivedAt: string;
  readonly cashRegisterId: string | null;
  readonly cashMovementId: string | null;
  readonly journalEntryId: string | null;
  readonly createdAt: string;
}

export interface CounterSaleItemSummary {
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

export interface CounterSaleItemParentContext {
  readonly saleId: string;
  readonly accountId: AccountId;
}

export interface CounterSalePaymentSummary {
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

export interface CounterSaleChequePaymentSummary extends CounterSalePaymentSummary {
  readonly saleNumber: string;
  readonly saleStatus: CounterSaleSummary['status'];
}

export interface CounterSalePaymentInput {
  readonly method: CounterSalePaymentSummary['method'];
  readonly amount: number;
  readonly installments?: number;
  readonly reference?: string | null;
  readonly notes?: string | null;
  readonly idempotencyKey?: string | null;
}

export interface InventoryConsumption {
  readonly id: string;
  readonly inventoryItemId: string;
  readonly quantity: number;
  readonly unit: string;
  readonly costAmount: number;
}

export interface CashMovement {
  readonly id: string;
  readonly cashRegisterId: string;
  readonly movementType: 'payment' | 'opening' | 'closing' | 'supply' | 'withdrawal' | 'adjustment';
  readonly amount: number;
  readonly runningBalance: number;
  readonly reference: string | null;
  readonly notes: string | null;
}

export interface CounterSaleCloseTransactionInput {
  readonly sale: CounterSaleSummary;
  readonly items: readonly CounterSaleItemSummary[];
  readonly payments: readonly CounterSalePaymentSummary[];
  readonly closedByUserId: UserId;
}

export interface CounterSaleCloseResult {
  readonly sale: CounterSaleSummary;
  readonly receipt: CounterSaleReceiptSummary;
  readonly inventoryConsumptions?: readonly InventoryConsumption[];
  readonly cashMovements?: readonly CashMovement[];
}

export type CounterSaleClosePreview = Omit<CounterSaleCloseResult, 'receipt'>;

export interface CounterSaleCloseEffects {
  readonly journalEntryId?: string;
}

export interface CounterSaleCancellationInput {
  readonly accountId: AccountId;
  readonly cancelledByUserId: UserId;
  readonly reason: string;
  readonly correlationId: string;
}

export interface CounterSaleCancellationTransactionInput {
  readonly accountId: AccountId;
  readonly sale: CounterSaleSummary;
  readonly cancelledByUserId: UserId;
  readonly reason: string;
  readonly correlationId: string;
}

export interface CounterSaleCancellationExecution {
  readonly before: CounterSaleSummary;
  readonly sale: CounterSaleSummary;
  readonly transitioned: boolean;
}

export interface CounterSaleCancellationHistory {
  readonly eventId: string;
  readonly accountId: AccountId;
  readonly counterSaleId: string;
  readonly cancelledByUserId: UserId;
  readonly cancelledAt: string;
  readonly reason: string;
  readonly correlationId: string;
}

export interface CounterSaleSettlementInput {
  readonly payments: readonly CounterSalePaymentInput[];
}

function normalizeCancellationInput(
  input: CounterSaleCancellationInput
): CounterSaleCancellationInput {
  if (typeof input !== 'object' || input === null) {
    throw new ValidationError('Counter sale cancellation body is required');
  }

  const accountId = typeof input.accountId === 'string' ? input.accountId.trim() : '';
  if (accountId.length === 0 || accountId.length > 255) {
    throw new ValidationError('Counter sale cancellation account is required');
  }

  const rawReason = typeof input.reason === 'string' ? input.reason : '';
  if (/[\u0000-\u001f\u007f-\u009f]/u.test(rawReason)) {
    throw new ValidationError('Counter sale cancellation reason cannot contain control characters');
  }
  const reason = rawReason.trim();
  if (reason.length === 0 || reason.length > 500) {
    throw new ValidationError('Counter sale cancellation reason must contain 1 to 500 characters');
  }

  const cancelledByUserId =
    typeof input.cancelledByUserId === 'string' ? input.cancelledByUserId.trim() : '';
  if (cancelledByUserId.length === 0 || cancelledByUserId.length > 255) {
    throw new ValidationError('Counter sale cancellation actor is required');
  }

  const correlationId = typeof input.correlationId === 'string' ? input.correlationId.trim() : '';
  if (correlationId.length === 0 || correlationId.length > 255) {
    throw new ValidationError('Counter sale cancellation correlation is required');
  }

  return {
    accountId: accountId as AccountId,
    cancelledByUserId: cancelledByUserId as UserId,
    reason,
    correlationId
  };
}

export interface CounterSalesServiceOptions {
  readonly repository?: CounterSalesRepository;
  readonly closeTransaction?: (
    input: CounterSaleCloseTransactionInput,
    execute: () => Promise<CounterSaleCloseResult>
  ) => Promise<CounterSaleCloseResult>;
  /**
   * Persists effects belonging to the close command (for example the
   * canonical financial journal entry) before the transaction returns.
   */
  readonly onClose?: (
    input: CounterSaleCloseTransactionInput,
    result: CounterSaleClosePreview
  ) => Promise<CounterSaleCloseEffects | void>;
  /**
   * Owns the transaction boundary for cancellation. Database-backed callers
   * must persist the status transition and its audit event through this hook
   * before the command returns.
   */
  readonly cancelTransaction?: (
    input: CounterSaleCancellationTransactionInput,
    execute: () => Promise<CounterSaleCancellationExecution>
  ) => Promise<CounterSaleCancellationExecution>;
  readonly inventoryService?: {
    consumeForSale: (
      accountId: AccountId,
      codeSnapshot: string,
      quantity: number
    ) => Promise<InventoryConsumption>;
  };
  readonly cashService?: {
    getOpenRegister: (
      accountId: AccountId
    ) => Promise<{ id: string; runningBalance: number } | null>;
    recordMovement: (
      cashRegisterId: string,
      accountId: AccountId,
      movementType: string,
      amount: number,
      runningBalance: number,
      reference: string | null,
      notes: string | null,
      createdByUserId: UserId
    ) => Promise<CashMovement>;
  };
}

export class CounterSalesService {
  readonly #repository?: CounterSalesRepository;
  readonly #useUuidIdentifiers: boolean;
  readonly #closeTransaction?: CounterSalesServiceOptions['closeTransaction'];
  readonly #onClose?: CounterSalesServiceOptions['onClose'];
  readonly #cancelTransaction?: CounterSalesServiceOptions['cancelTransaction'];
  readonly #inventoryService?: CounterSalesServiceOptions['inventoryService'];
  readonly #cashService?: CounterSalesServiceOptions['cashService'];
  readonly #sales = new Map<string, CounterSaleSummary>();
  readonly #receipts = new Map<string, CounterSaleReceiptSummary>();
  readonly #items = new Map<string, CounterSaleItemSummary>();
  readonly #payments = new Map<string, CounterSalePaymentSummary>();
  readonly #inMemoryPaymentIdempotency = new Map<
    string,
    {
      readonly counterSaleId: string;
      readonly paymentId: string;
      readonly method: CounterSalePaymentSummary['method'];
      readonly amountCents: number;
      readonly installments: number;
      readonly reference: string | null;
      readonly notes: string | null;
    }
  >();
  readonly #closeLocks = new Map<string, Promise<CounterSaleCloseResult>>();
  readonly #cancelLocks = new Map<string, Promise<CounterSaleSummary>>();
  readonly #cancellationHistory = new Map<string, readonly CounterSaleCancellationHistory[]>();
  readonly #numberCounters = new Map<AccountId, number>();

  public constructor(options?: CounterSalesServiceOptions) {
    this.#repository = options?.repository;
    this.#useUuidIdentifiers = Boolean(options?.repository);
    this.#closeTransaction = options?.closeTransaction;
    this.#onClose = options?.onClose;
    this.#cancelTransaction = options?.cancelTransaction;
    this.#inventoryService = options?.inventoryService;
    this.#cashService = options?.cashService;
  }

  #nextId(prefix: string): string {
    return this.#useUuidIdentifiers ? randomUUID() : createCorrelationId(prefix);
  }

  public get persistenceMode(): 'database' | 'in-memory' {
    return this.#repository ? 'database' : 'in-memory';
  }

  public async hydrateFromDatabase(accountId: AccountId): Promise<void> {
    if (!this.#repository) return;
    const sales = await this.#repository.findByAccountId(accountId);

    for (const sale of sales) {
      this.#sales.set(sale.id, sale);
      const items = await this.#repository.findItemsBySaleId(accountId, sale.id);
      for (const item of items) {
        this.#items.set(item.id, item);
      }
      const payments = await this.#repository.findPaymentsBySaleId(sale.id);
      for (const payment of payments) {
        this.#payments.set(payment.id, payment);
      }
      const receipt = await this.#repository.findReceipt(sale.id);
      if (receipt) {
        this.#receipts.set(sale.id, this.#toReceiptSummary(receipt));
      }
    }
  }

  #nextNumber(accountId: AccountId): string {
    const current = this.#numberCounters.get(accountId) ?? 0;
    const next = current + 1;
    if (!Number.isSafeInteger(next)) {
      throw new ConflictError('Counter sale number sequence is exhausted', { accountId });
    }
    this.#numberCounters.set(accountId, next);
    return `CS-${String(next).padStart(6, '0')}`;
  }

  #recalculate(saleId: string): CounterSaleSummary {
    const sale = this.#sales.get(saleId);
    if (!sale) throw new NotFoundError('Counter sale not found', { saleId });

    const items = Array.from(this.#items.values()).filter((i) => i.counterSaleId === saleId);
    const subtotal = items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
    const discountAmount = items.reduce((sum, i) => sum + i.discountAmount, 0);
    const total = Math.round((subtotal - discountAmount) * 100) / 100;
    const payments = Array.from(this.#payments.values()).filter((p) => p.counterSaleId === saleId);
    const paidAmount = payments.reduce((sum, p) => sum + p.amount, 0);
    const balanceDue = Math.round((total - paidAmount) * 100) / 100;
    const roundedPaidAmount = Math.round(paidAmount * 100) / 100;

    if (total < -0.01) {
      throw new ConflictError('Counter sale total cannot be negative', { total });
    }

    if (roundedPaidAmount > total + 0.01) {
      throw new ConflictError('Counter sale payments exceed recalculated total', {
        total,
        paidAmount: roundedPaidAmount
      });
    }

    const updated: CounterSaleSummary = {
      ...sale,
      subtotal: Math.round(subtotal * 100) / 100,
      discountAmount: Math.round(discountAmount * 100) / 100,
      total,
      paidAmount: roundedPaidAmount,
      balanceDue,
      updatedAt: nowIso()
    };
    this.#sales.set(saleId, updated);
    return updated;
  }

  async #persistSale(updatedSale: CounterSaleSummary): Promise<void> {
    if (this.#repository) {
      const record: CounterSaleRecord = updatedSale;
      await this.#repository.update(record);
    }
  }

  async #refreshSaleFromDatabase(saleId: string, expectedAccountId?: AccountId): Promise<void> {
    const repository = this.#repository;
    if (!repository?.lockSaleForUpdate) return;

    const sale = await repository.lockSaleForUpdate(saleId, expectedAccountId);
    if (!sale) throw new NotFoundError('Counter sale not found', { saleId });

    const [items, payments, receipt] = await Promise.all([
      repository.findItemsBySaleId(sale.accountId, saleId),
      repository.findPaymentsBySaleId(saleId),
      repository.findReceipt(saleId)
    ]);

    for (const [itemId, item] of this.#items) {
      if (item.counterSaleId === saleId) this.#items.delete(itemId);
    }
    for (const [paymentId, payment] of this.#payments) {
      if (payment.counterSaleId === saleId) this.#payments.delete(paymentId);
    }
    for (const item of items) this.#items.set(item.id, item);
    for (const payment of payments) this.#payments.set(payment.id, payment);
    this.#sales.set(saleId, sale);
    if (receipt) this.#receipts.set(saleId, this.#toReceiptSummary(receipt));
    else this.#receipts.delete(saleId);
  }

  #toReceiptSummary(receipt: CounterSaleReceiptRecord): CounterSaleReceiptSummary {
    return {
      id: receipt.id,
      accountId: receipt.accountId,
      counterSaleId: receipt.counterSaleId,
      amount: receipt.amount,
      currency: receipt.currency,
      receivedByUserId: receipt.receivedByUserId,
      receivedAt: receipt.receivedAt,
      cashRegisterId: receipt.cashRegisterId,
      cashMovementId: receipt.cashMovementId,
      journalEntryId: receipt.journalEntryId,
      createdAt: receipt.createdAt
    };
  }

  #requireItemParent(
    item: CounterSaleItemSummary,
    parent?: CounterSaleItemParentContext
  ): CounterSaleSummary {
    const sale = this.#sales.get(item.counterSaleId);
    if (!sale) {
      throw new NotFoundError('Counter sale not found', { saleId: item.counterSaleId });
    }

    if (
      sale.accountId !== item.accountId ||
      (parent !== undefined &&
        (parent.saleId !== item.counterSaleId || parent.accountId !== item.accountId))
    ) {
      throw new AuthenticationError('Counter sale item not found for current account', {
        itemId: item.id
      });
    }

    return sale;
  }

  async open(
    accountId: AccountId,
    openedByUserId: UserId,
    input?: {
      ownerId?: string | null;
      patientId?: string | null;
      encounterId?: string | null;
      queueEntryId?: string | null;
      billingRecordId?: string | null;
      notes?: string | null;
    }
  ): Promise<CounterSaleSummary> {
    const normalizeContextId = (value: string | null | undefined, field: string): string | null => {
      if (value === undefined || value === null) return null;
      if (typeof value !== 'string' || value.trim().length === 0 || value.trim().length > 255) {
        throw new ConflictError(`${field} must contain 1 to 255 characters`, { field });
      }
      return value.trim();
    };
    const ownerId = input?.ownerId ?? null;
    const patientId = normalizeContextId(input?.patientId, 'patientId');
    const encounterId = normalizeContextId(input?.encounterId, 'encounterId');
    const queueEntryId = normalizeContextId(input?.queueEntryId, 'queueEntryId');
    const billingRecordId = normalizeContextId(input?.billingRecordId, 'billingRecordId');

    const now = nowIso();
    const saleDraft: CounterSaleDraft = {
      id: this.#nextId('cs'),
      accountId,
      ownerId,
      patientId,
      encounterId,
      queueEntryId,
      billingRecordId,
      status: 'open',
      subtotal: 0,
      discountAmount: 0,
      total: 0,
      paidAmount: 0,
      balanceDue: 0,
      notes: input?.notes ?? null,
      openedByUserId,
      closedByUserId: null,
      closedAt: null,
      createdAt: now,
      updatedAt: now
    };

    if (this.#repository) {
      const persisted = await this.#repository.createWithNextNumber(saleDraft);
      if (persisted.accountId !== accountId) {
        throw new AuthenticationError('Counter sale repository returned a foreign account row', {
          saleId: persisted.id
        });
      }
      this.#sales.set(persisted.id, persisted);
      return persisted;
    }

    const sale: CounterSaleSummary = {
      ...saleDraft,
      number: this.#nextNumber(accountId)
    };
    this.#sales.set(sale.id, sale);
    return sale;
  }

  async addItem(
    saleId: string,
    input: {
      itemType: 'product' | 'service';
      catalogItemId?: string | null;
      nameSnapshot: string;
      codeSnapshot?: string | null;
      unitPrice: number;
      quantity?: number;
      discountAmount?: number;
      notes?: string | null;
    },
    parent?: CounterSaleItemParentContext
  ): Promise<{ sale: CounterSaleSummary; item: CounterSaleItemSummary }> {
    const sale = this.#sales.get(saleId);
    if (!sale) throw new NotFoundError('Counter sale not found', { saleId });
    if (parent !== undefined && (parent.saleId !== saleId || parent.accountId !== sale.accountId)) {
      throw new AuthenticationError('Counter sale not found for current account', { saleId });
    }
    if (sale.status !== 'open')
      throw new ConflictError('Cannot add items to a non-open sale', { status: sale.status });

    const quantity = input.quantity ?? 1;
    const discountAmount = input.discountAmount ?? 0;
    if (quantity <= 0) {
      throw new ConflictError('Counter sale item quantity must be greater than zero', { quantity });
    }
    if (input.unitPrice < 0) {
      throw new ConflictError('Counter sale item unit price cannot be negative', {
        unitPrice: input.unitPrice
      });
    }
    if (discountAmount < 0) {
      throw new ConflictError('Counter sale item discount cannot be negative', { discountAmount });
    }
    if (!input.nameSnapshot.trim()) {
      throw new ConflictError('Counter sale item name is required');
    }
    const lineTotal = Math.round((input.unitPrice * quantity - discountAmount) * 100) / 100;
    const now = nowIso();

    const item: CounterSaleItemSummary = {
      id: this.#nextId('csi'),
      counterSaleId: saleId,
      accountId: sale.accountId,
      itemType: input.itemType,
      catalogItemId: input.catalogItemId ?? null,
      nameSnapshot: input.nameSnapshot.trim(),
      codeSnapshot: input.codeSnapshot?.trim() ?? null,
      unitPrice: Math.round(input.unitPrice * 100) / 100,
      quantity,
      discountAmount: Math.round(discountAmount * 100) / 100,
      lineTotal,
      notes: input.notes?.trim() ?? null,
      createdAt: now,
      updatedAt: now
    };

    this.#items.set(item.id, item);
    let updatedSale: CounterSaleSummary;
    try {
      updatedSale = this.#recalculate(saleId);
    } catch (error) {
      this.#items.delete(item.id);
      throw error;
    }

    if (this.#repository) {
      const record: CounterSaleItemRecord = item;
      await this.#repository.createItem(record);
      await this.#persistSale(updatedSale);
    }

    return { sale: updatedSale, item };
  }

  async updateItem(
    itemId: string,
    input: { quantity?: number; discountAmount?: number; notes?: string | null },
    parent?: CounterSaleItemParentContext
  ): Promise<{ sale: CounterSaleSummary; item: CounterSaleItemSummary }> {
    const item = this.#items.get(itemId);
    if (!item) throw new NotFoundError('Counter sale item not found', { itemId });

    const sale = this.#requireItemParent(item, parent);
    if (sale.status !== 'open')
      throw new ConflictError('Cannot update items in a non-open sale', { status: sale.status });

    const quantity = input.quantity ?? item.quantity;
    const discountAmount =
      input.discountAmount !== undefined
        ? Math.round(input.discountAmount * 100) / 100
        : item.discountAmount;
    if (quantity <= 0) {
      throw new ConflictError('Counter sale item quantity must be greater than zero', { quantity });
    }
    if (discountAmount < 0) {
      throw new ConflictError('Counter sale item discount cannot be negative', { discountAmount });
    }

    const updated: CounterSaleItemSummary = {
      ...item,
      quantity,
      discountAmount,
      notes: input.notes !== undefined ? (input.notes?.trim() ?? null) : item.notes,
      updatedAt: nowIso()
    };
    const lineTotal =
      Math.round((updated.unitPrice * updated.quantity - updated.discountAmount) * 100) / 100;
    const finalItem: CounterSaleItemSummary = { ...updated, lineTotal };

    this.#items.set(itemId, finalItem);
    let updatedSale: CounterSaleSummary;
    try {
      updatedSale = this.#recalculate(item.counterSaleId);
    } catch (error) {
      this.#items.set(itemId, item);
      throw error;
    }

    if (this.#repository) {
      const record: CounterSaleItemRecord = finalItem;
      await this.#repository.updateItem(record);
      await this.#persistSale(updatedSale);
    }

    return { sale: updatedSale, item: finalItem };
  }

  async removeItem(
    itemId: string,
    parent?: CounterSaleItemParentContext
  ): Promise<CounterSaleSummary> {
    const item = this.#items.get(itemId);
    if (!item) throw new NotFoundError('Counter sale item not found', { itemId });

    const sale = this.#requireItemParent(item, parent);
    if (sale.status !== 'open')
      throw new ConflictError('Cannot remove items from a non-open sale', { status: sale.status });

    this.#items.delete(itemId);
    let updatedSale: CounterSaleSummary;
    try {
      updatedSale = this.#recalculate(item.counterSaleId);
    } catch (error) {
      this.#items.set(itemId, item);
      throw error;
    }

    if (this.#repository) {
      await this.#repository.deleteItem(itemId, item.accountId, item.counterSaleId);
      await this.#persistSale(updatedSale);
    }

    return updatedSale;
  }

  async addPayment(
    saleId: string,
    input: CounterSalePaymentInput
  ): Promise<{ sale: CounterSaleSummary; payment: CounterSalePaymentSummary }> {
    const sale = this.#sales.get(saleId);
    if (!sale) throw new NotFoundError('Counter sale not found', { saleId });
    const canRecordAtomically = Boolean(this.#repository?.recordPayment);
    if (!canRecordAtomically && sale.status !== 'open')
      throw new ConflictError('Cannot add payments to a non-open sale', { status: sale.status });

    const remaining = sale.total - sale.paidAmount;
    if (!Number.isFinite(input.amount) || input.amount <= 0) {
      throw new ConflictError('Payment amount must be greater than zero', { amount: input.amount });
    }
    if (
      input.installments !== undefined &&
      (!Number.isInteger(input.installments) || input.installments < 1)
    ) {
      throw new ConflictError('Payment installments must be greater than zero', {
        installments: input.installments
      });
    }
    const idempotencyKey = input.idempotencyKey?.trim() || null;
    if (idempotencyKey && idempotencyKey.length > 255) {
      throw new ConflictError('Payment idempotency key is too long', { maxLength: 255 });
    }
    const normalizedReference = input.reference?.trim() ?? null;
    const normalizedNotes = input.notes?.trim() ?? null;
    const amountCents = Math.round(input.amount * 100);
    const idempotencyMapKey = idempotencyKey ? `${sale.accountId}:${idempotencyKey}` : null;

    if (!canRecordAtomically && idempotencyMapKey) {
      const previous = this.#inMemoryPaymentIdempotency.get(idempotencyMapKey);
      if (previous) {
        const matches =
          previous.counterSaleId === saleId &&
          previous.method === input.method &&
          previous.amountCents === amountCents &&
          previous.installments === (input.installments ?? 1) &&
          previous.reference === normalizedReference &&
          previous.notes === normalizedNotes;
        if (!matches) {
          throw new ConflictError(
            'Payment idempotency key was already used with a different payload'
          );
        }
        const previousPayment = this.#payments.get(previous.paymentId);
        const previousSale = this.#sales.get(saleId);
        if (previousPayment && previousSale) {
          return { sale: previousSale, payment: previousPayment };
        }
        throw new ConflictError('Payment idempotency record is no longer available');
      }
    }
    if (!canRecordAtomically && input.amount > remaining + 0.01) {
      throw new ConflictError('Payment amount exceeds balance due', {
        balanceDue: remaining,
        paymentAmount: input.amount
      });
    }

    const now = nowIso();
    const payment: CounterSalePaymentSummary = {
      id: this.#nextId('csp'),
      counterSaleId: saleId,
      accountId: sale.accountId,
      method: input.method,
      amount: Math.round(input.amount * 100) / 100,
      installments: input.installments ?? 1,
      reference: normalizedReference,
      notes: normalizedNotes,
      createdAt: now
    };
    const paymentRecord: CounterSalePaymentRecord = {
      ...payment,
      idempotencyKey
    };

    if (canRecordAtomically) {
      const result = await this.#repository!.recordPayment!(paymentRecord);
      this.#sales.set(saleId, result.sale);
      this.#payments.set(result.payment.id, result.payment);
      return { sale: result.sale, payment: result.payment };
    }

    this.#payments.set(payment.id, payment);

    if (this.#repository) {
      try {
        await this.#repository.createPayment(paymentRecord);
      } catch (error) {
        this.#payments.delete(payment.id);
        throw error;
      }
    }

    const updatedSale = this.#recalculate(saleId);
    if (this.#repository) {
      await this.#persistSale(updatedSale);
    }
    if (idempotencyMapKey) {
      this.#inMemoryPaymentIdempotency.set(idempotencyMapKey, {
        counterSaleId: saleId,
        paymentId: payment.id,
        method: payment.method,
        amountCents,
        installments: payment.installments,
        reference: payment.reference,
        notes: payment.notes
      });
    }
    return { sale: updatedSale, payment };
  }

  async settle(
    saleId: string,
    closedByUserId: UserId,
    input: CounterSaleSettlementInput
  ): Promise<CounterSaleCloseResult> {
    const sale = this.#sales.get(saleId);
    if (!sale) throw new NotFoundError('Counter sale not found', { saleId });
    if (this.#repository && !this.#closeTransaction) {
      throw new ConflictError(
        'Database-backed counter sale settlement requires a transaction boundary',
        {
          saleId
        }
      );
    }
    if (input.payments.length === 0) {
      throw new ConflictError('Counter sale settlement requires at least one payment');
    }

    const previousPaymentIds = new Set(
      Array.from(this.#payments.values())
        .filter((payment) => payment.counterSaleId === saleId)
        .map((payment) => payment.id)
    );
    try {
      for (const payment of input.payments) {
        await this.addPayment(saleId, payment);
      }
      return await this.close(saleId, closedByUserId);
    } catch (error) {
      const removedPaymentIds = new Set<string>();
      for (const payment of this.#payments.values()) {
        if (payment.counterSaleId === saleId && !previousPaymentIds.has(payment.id)) {
          removedPaymentIds.add(payment.id);
          this.#payments.delete(payment.id);
        }
      }
      for (const [key, record] of this.#inMemoryPaymentIdempotency) {
        if (removedPaymentIds.has(record.paymentId)) {
          this.#inMemoryPaymentIdempotency.delete(key);
        }
      }
      this.#sales.set(saleId, sale);
      this.#receipts.delete(saleId);
      throw error;
    }
  }

  async close(saleId: string, closedByUserId: UserId): Promise<CounterSaleCloseResult> {
    const activeClose = this.#closeLocks.get(saleId);
    if (activeClose) return activeClose;

    const operation = this.#closeInternal(saleId, closedByUserId);
    const trackedOperation = operation.finally(() => {
      if (this.#closeLocks.get(saleId) === trackedOperation) {
        this.#closeLocks.delete(saleId);
      }
    });
    this.#closeLocks.set(saleId, trackedOperation);
    return trackedOperation;
  }

  async #closeInternal(saleId: string, closedByUserId: UserId): Promise<CounterSaleCloseResult> {
    if (this.#repository && !this.#closeTransaction) {
      throw new ConflictError(
        'Database-backed counter sale close requires a transaction boundary',
        {
          saleId
        }
      );
    }

    await this.#refreshSaleFromDatabase(saleId);
    const initialSale = this.#sales.get(saleId);
    if (!initialSale) throw new NotFoundError('Counter sale not found', { saleId });
    const initialItems = Array.from(this.#items.values()).filter(
      (item) => item.counterSaleId === saleId
    );
    const initialPayments = Array.from(this.#payments.values()).filter(
      (payment) => payment.counterSaleId === saleId
    );

    const executeClose = async (): Promise<CounterSaleCloseResult> => {
      // The production closeTransaction wrapper enters the tenant UoW before
      // invoking this callback. Reloading here keeps the row lock, items, and
      // payments in the same transaction instead of using the pre-UoW snapshot.
      if (this.#repository) await this.#refreshSaleFromDatabase(saleId);
      const sale = this.#sales.get(saleId);
      if (!sale) throw new NotFoundError('Counter sale not found', { saleId });
      if (sale.status !== 'open')
        throw new ConflictError('Sale is not open', { status: sale.status });

      const payments = Array.from(this.#payments.values()).filter(
        (payment) => payment.counterSaleId === saleId
      );
      const paidAmount = payments.reduce((sum, payment) => sum + payment.amount, 0);
      if (Math.round(paidAmount * 100) / 100 < sale.total - 0.01) {
        throw new ConflictError('Cannot close sale with outstanding balance', {
          total: sale.total,
          paid: Math.round(paidAmount * 100) / 100,
          balanceDue: sale.balanceDue
        });
      }

      const items = Array.from(this.#items.values()).filter(
        (item) => item.counterSaleId === saleId
      );
      // Block 1: Automatic inventory consumption for product items
      const inventoryConsumptions: InventoryConsumption[] = [];
      if (this.#inventoryService) {
        const productItems = items.filter(
          (item) => item.itemType === 'product' && item.codeSnapshot
        );
        for (const item of productItems) {
          try {
            const consumption = await this.#inventoryService.consumeForSale(
              sale.accountId,
              item.codeSnapshot!,
              item.quantity
            );
            inventoryConsumptions.push(consumption);
          } catch (err) {
            throw new ConflictError(
              `Insufficient stock for product "${item.nameSnapshot}" (${item.codeSnapshot}): ${err instanceof Error ? err.message : String(err)}`,
              { saleId, codeSnapshot: item.codeSnapshot, quantity: item.quantity }
            );
          }
        }
      }

      // Block 2: Cash register movements for applicable payments
      const cashMovements: CashMovement[] = [];
      if (this.#cashService) {
        const register = await this.#cashService.getOpenRegister(sale.accountId);
        if (register) {
          let runningBalance = register.runningBalance;
          const cashMethods = new Set(['cash', 'pix', 'debit_card']);
          for (const payment of payments) {
            if (cashMethods.has(payment.method)) {
              runningBalance += payment.amount;
              const movement = await this.#cashService.recordMovement(
                register.id,
                sale.accountId,
                'payment',
                payment.amount,
                runningBalance,
                payment.reference ?? sale.number,
                `Payment for sale ${sale.number} via ${payment.method}`,
                closedByUserId
              );
              cashMovements.push(movement);
            }
          }
        }
      }

      const now = nowIso();
      const updated: CounterSaleSummary = {
        ...sale,
        status: 'closed',
        closedByUserId,
        closedAt: now,
        updatedAt: now
      };
      this.#sales.set(saleId, updated);

      if (this.#repository) {
        const record: CounterSaleRecord = updated;
        await this.#repository.update(record);
      }

      const preview: CounterSaleClosePreview = {
        sale: updated,
        inventoryConsumptions: inventoryConsumptions.length > 0 ? inventoryConsumptions : undefined,
        cashMovements: cashMovements.length > 0 ? cashMovements : undefined
      };
      const effects = await this.#onClose?.({ sale, items, payments, closedByUserId }, preview);
      const cashMovement = cashMovements.length === 1 ? cashMovements[0] : undefined;
      const receipt: CounterSaleReceiptRecord = {
        id: this.#nextId('csr'),
        accountId: sale.accountId,
        counterSaleId: sale.id,
        amount: sale.total,
        currency: 'BRL',
        receivedByUserId: closedByUserId,
        receivedAt: updated.closedAt ?? now,
        cashRegisterId: cashMovement?.cashRegisterId ?? null,
        cashMovementId: cashMovement?.id ?? null,
        journalEntryId: effects?.journalEntryId ?? null,
        createdAt: now
      };
      const persistedReceipt = this.#repository
        ? await this.#repository.createReceipt(receipt)
        : receipt;
      return {
        ...preview,
        receipt: this.#toReceiptSummary(persistedReceipt)
      };
    };

    try {
      const result = this.#closeTransaction
        ? await this.#closeTransaction(
            { sale: initialSale, items: initialItems, payments: initialPayments, closedByUserId },
            executeClose
          )
        : await executeClose();
      this.#receipts.set(saleId, result.receipt);
      return result;
    } catch (error) {
      // The durable transaction rolls back external effects. Restore this service's
      // in-memory projection as well so a failed close cannot be observed as closed.
      this.#sales.set(saleId, initialSale);
      this.#receipts.delete(saleId);
      throw error;
    }
  }

  async cancel(saleId: string, input: CounterSaleCancellationInput): Promise<CounterSaleSummary> {
    const normalizedInput = normalizeCancellationInput(input);
    const cancellationLockKey = JSON.stringify([normalizedInput.accountId, saleId]);
    const activeCancellation = this.#cancelLocks.get(cancellationLockKey);
    if (activeCancellation) return activeCancellation;

    const operation = this.#cancelInternal(saleId, normalizedInput);
    const trackedOperation = operation.finally(() => {
      if (this.#cancelLocks.get(cancellationLockKey) === trackedOperation) {
        this.#cancelLocks.delete(cancellationLockKey);
      }
    });
    this.#cancelLocks.set(cancellationLockKey, trackedOperation);
    return trackedOperation;
  }

  async #cancelInternal(
    saleId: string,
    input: CounterSaleCancellationInput
  ): Promise<CounterSaleSummary> {
    if (this.#repository && !this.#cancelTransaction) {
      throw new ConflictError(
        'Database-backed counter sale cancellation requires a transaction boundary',
        { saleId }
      );
    }

    await this.#refreshSaleFromDatabase(saleId, input.accountId);
    const initialSale = this.#sales.get(saleId);
    if (!initialSale) throw new NotFoundError('Counter sale not found', { saleId });
    if (initialSale.accountId !== input.accountId) {
      throw new AuthenticationError('Counter sale not found for current account', { saleId });
    }
    if (initialSale.status === 'closed') {
      throw new ConflictError('Cannot cancel a closed sale');
    }
    if (initialSale.status === 'cancelled') return initialSale;

    const executeCancellation = async (): Promise<CounterSaleCancellationExecution> => {
      // The production wrapper enters the tenant UoW before invoking this
      // callback. Refreshing again makes the row lock authoritative for
      // concurrent requests with different idempotency keys.
      if (this.#repository) await this.#refreshSaleFromDatabase(saleId, input.accountId);
      const sale = this.#sales.get(saleId);
      if (!sale) throw new NotFoundError('Counter sale not found', { saleId });
      if (sale.status === 'closed') {
        throw new ConflictError('Cannot cancel a closed sale');
      }
      if (sale.status === 'cancelled') {
        return { before: sale, sale, transitioned: false };
      }

      const now = nowIso();
      const updated: CounterSaleSummary = {
        ...sale,
        status: 'cancelled',
        updatedAt: now
      };
      if (this.#repository) {
        const record: CounterSaleRecord = updated;
        await this.#repository.update(record);
      }
      return { before: sale, sale: updated, transitioned: true };
    };

    try {
      const execution = this.#cancelTransaction
        ? await this.#cancelTransaction(
            {
              accountId: input.accountId,
              sale: initialSale,
              cancelledByUserId: input.cancelledByUserId,
              reason: input.reason,
              correlationId: input.correlationId
            },
            executeCancellation
          )
        : await executeCancellation();

      this.#sales.set(saleId, execution.sale);
      if (execution.transitioned && !this.#repository) {
        this.#recordInMemoryCancellation(input, execution);
      }
      return execution.sale;
    } catch (error) {
      // The transaction wrapper rolls back durable writes. Restore this
      // projection too, so a failed audit append cannot expose a phantom
      // cancellation to subsequent reads.
      this.#sales.set(saleId, initialSale);
      throw error;
    }
  }

  #recordInMemoryCancellation(
    input: CounterSaleCancellationInput,
    execution: CounterSaleCancellationExecution
  ): void {
    const history: CounterSaleCancellationHistory = {
      eventId: randomUUID(),
      accountId: execution.sale.accountId,
      counterSaleId: execution.sale.id,
      cancelledByUserId: input.cancelledByUserId,
      cancelledAt: nowIso(),
      reason: input.reason,
      correlationId: input.correlationId
    };
    const current = this.#cancellationHistory.get(execution.sale.id) ?? [];
    this.#cancellationHistory.set(execution.sale.id, [...current, history]);
  }

  async listCancellationHistory(
    accountId: AccountId,
    saleId: string
  ): Promise<readonly CounterSaleCancellationHistory[]> {
    const sale = this.#sales.get(saleId);
    if (sale && sale.accountId !== accountId) {
      throw new AuthenticationError('Counter sale not found for current account', { saleId });
    }

    if (this.#repository?.listCancellationHistory) {
      const rows = await this.#repository.listCancellationHistory(accountId, saleId);
      return rows.map((row) => this.#toCancellationHistory(row));
    }

    return (this.#cancellationHistory.get(saleId) ?? [])
      .filter((event) => event.accountId === accountId)
      .map((event) => ({ ...event }))
      .sort(
        (left, right) =>
          right.cancelledAt.localeCompare(left.cancelledAt) ||
          right.eventId.localeCompare(left.eventId)
      );
  }

  #toCancellationHistory(
    row: CounterSaleCancellationHistoryRecord
  ): CounterSaleCancellationHistory {
    return {
      eventId: row.eventId,
      accountId: row.accountId,
      counterSaleId: row.counterSaleId,
      cancelledByUserId: row.cancelledByUserId,
      cancelledAt: row.cancelledAt,
      reason: row.reason,
      correlationId: row.correlationId
    };
  }

  async reopen(saleId: string): Promise<CounterSaleSummary> {
    const sale = this.#sales.get(saleId);
    if (!sale) throw new NotFoundError('Counter sale not found', { saleId });
    if (sale.status !== 'closed')
      throw new ConflictError('Can only reopen closed sales', { status: sale.status });
    const receipt =
      this.#receipts.get(saleId) ??
      (this.#repository
        ? await this.#repository
            .findReceipt(saleId)
            .then((record) => (record ? this.#toReceiptSummary(record) : undefined))
        : undefined);
    if (receipt) {
      throw new ConflictError('Cannot reopen a sale after its financial receipt was issued', {
        saleId,
        receiptId: receipt.id
      });
    }

    const now = nowIso();
    const updated: CounterSaleSummary = {
      ...sale,
      status: 'open',
      closedByUserId: null,
      closedAt: null,
      updatedAt: now
    };
    this.#sales.set(saleId, updated);

    if (this.#repository) {
      const record: CounterSaleRecord = updated;
      await this.#repository.update(record);
    }

    return updated;
  }

  findById(id: string): CounterSaleSummary | undefined {
    return this.#sales.get(id);
  }

  async getByIdForAccount(accountId: AccountId, saleId: string): Promise<CounterSaleSummary> {
    if (this.#repository) await this.#refreshSaleFromDatabase(saleId, accountId);

    const sale = this.#sales.get(saleId);
    if (!sale) throw new NotFoundError('Counter sale not found', { saleId });
    if (sale.accountId !== accountId) {
      throw new AuthenticationError('Counter sale not found for current account', { saleId });
    }
    return sale;
  }

  getReceipt(saleId: string): CounterSaleReceiptSummary | undefined {
    return this.#receipts.get(saleId);
  }

  getOrThrow(id: string): CounterSaleSummary {
    const sale = this.#sales.get(id);
    if (!sale) throw new NotFoundError('Counter sale not found', { id });
    return sale;
  }

  getItems(saleId: string, accountId?: AccountId): CounterSaleItemSummary[] {
    return Array.from(this.#items.values())
      .filter(
        (i) => i.counterSaleId === saleId && (accountId === undefined || i.accountId === accountId)
      )
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  getPayments(saleId: string): CounterSalePaymentSummary[] {
    return Array.from(this.#payments.values())
      .filter((p) => p.counterSaleId === saleId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async listChequePayments(
    accountId: AccountId,
    filters: { readonly dateFrom?: string; readonly dateTo?: string } = {}
  ): Promise<readonly CounterSaleChequePaymentSummary[]> {
    if (this.#repository?.listChequePayments) {
      const rows = await this.#repository.listChequePayments(accountId, filters);
      if (rows.length > MAX_CHEQUE_REPORT_ROWS) {
        throw new ValidationError('Cheque report exceeds the maximum supported row count', {
          maxRows: MAX_CHEQUE_REPORT_ROWS
        });
      }
      return rows.map((row) => ({ ...row }));
    }

    const from = filters.dateFrom
      ? Date.parse(`${filters.dateFrom}T00:00:00.000Z`)
      : Number.NEGATIVE_INFINITY;
    const toExclusive = filters.dateTo
      ? Date.parse(`${filters.dateTo}T00:00:00.000Z`) + 24 * 60 * 60 * 1000
      : Number.POSITIVE_INFINITY;
    let rows: CounterSaleChequePaymentSummary[] = [];
    for (const payment of this.#payments.values()) {
      if (payment.accountId !== accountId || payment.method !== 'check') continue;
      const sale = this.#sales.get(payment.counterSaleId);
      if (!sale || sale.accountId !== accountId) continue;
      const timestamp = Date.parse(payment.createdAt);
      if (!Number.isFinite(timestamp) || timestamp < from || timestamp >= toExclusive) continue;
      const row = {
        ...payment,
        saleNumber: sale.number,
        saleStatus: sale.status
      } satisfies CounterSaleChequePaymentSummary;
      rows = [...rows, row]
        .sort(
          (left, right) =>
            left.createdAt.localeCompare(right.createdAt) || left.id.localeCompare(right.id)
        )
        .slice(0, MAX_CHEQUE_REPORT_ROWS + 1);
    }

    if (rows.length > MAX_CHEQUE_REPORT_ROWS) {
      throw new ValidationError('Cheque report exceeds the maximum supported row count', {
        maxRows: MAX_CHEQUE_REPORT_ROWS
      });
    }
    return rows;
  }

  list(
    accountId: AccountId,
    filters?: {
      status?: string;
      search?: string;
      ownerId?: string;
      dateFrom?: string;
      dateTo?: string;
    }
  ): CounterSaleSummary[] {
    let items = Array.from(this.#sales.values()).filter((s) => s.accountId === accountId);

    if (filters?.status) {
      items = items.filter((s) => s.status === filters.status);
    }
    if (filters?.ownerId) {
      items = items.filter((s) => s.ownerId === filters.ownerId);
    }
    if (filters?.search) {
      const search = filters.search.toLowerCase();
      items = items.filter(
        (s) =>
          s.number.toLowerCase().includes(search) ||
          (s.notes?.toLowerCase().includes(search) ?? false)
      );
    }
    if (filters?.dateFrom) {
      items = items.filter((s) => s.createdAt >= `${filters.dateFrom}T00:00:00`);
    }
    if (filters?.dateTo) {
      items = items.filter((s) => s.createdAt <= `${filters.dateTo}T23:59:59`);
    }

    return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  /**
   * Reads a report source from the authoritative repository instead of the
   * process-local projection. This keeps on-demand reports fresh across API
   * instances while retaining the existing synchronous list API for screens
   * that intentionally use the hydrated operational projection.
   */
  async listPersisted(
    accountId: AccountId,
    filters?: CounterSaleListFilters
  ): Promise<readonly CounterSaleSummary[]> {
    if (!this.#repository) {
      throw new ConflictError('Persisted counter-sale reports require a database repository');
    }

    const sales = await this.#repository.findByAccountId(accountId, {
      ...(filters?.status ? { status: filters.status } : {}),
      ...(filters?.search ? { search: filters.search } : {}),
      ...(filters?.ownerId ? { ownerId: filters.ownerId } : {}),
      ...(filters?.dateFrom ? { dateFrom: filters.dateFrom } : {}),
      ...(filters?.dateTo ? { dateTo: filters.dateTo } : {}),
      limit: MAX_COUNTER_SALE_REPORT_ROWS + 1
    });
    const filteredSales = sales.filter(
      (sale) =>
        sale.accountId === accountId &&
        (!filters?.dateFrom || sale.createdAt.slice(0, 10) >= filters.dateFrom) &&
        (!filters?.dateTo || sale.createdAt.slice(0, 10) <= filters.dateTo)
    );
    if (filteredSales.length > MAX_COUNTER_SALE_REPORT_ROWS) {
      throw new ValidationError('Counter-sale report exceeds the maximum supported row count', {
        maxRows: MAX_COUNTER_SALE_REPORT_ROWS
      });
    }
    return filteredSales.map((sale) => ({ ...sale }));
  }

  async getCommercialDashboard(
    accountId: AccountId,
    dateFrom?: string,
    dateTo?: string
  ): Promise<{
    openSales: number;
    closedToday: number;
    grossRevenueToday: number;
    netRevenueToday: number;
    avgTicket: number;
    salesByPaymentMethod: { method: string; total: number }[];
    topProducts: { name: string; quantity: number; revenue: number }[];
    topServices: { name: string; quantity: number; revenue: number }[];
    quotesIssued: number;
    quotesConverted: number;
    lowStockAlerts: { name: string; code: string; onHand: number; reorderLevel: number }[];
  }> {
    if (this.#repository) {
      const [openSales, closedToday, revenue, byMethod, topProducts, topServices] =
        await Promise.all([
          this.#repository.getOpenSalesCount(accountId),
          this.#repository.getClosedTodayCount(accountId),
          this.#repository.getRevenueToday(accountId),
          this.#repository.getSalesByPaymentMethod(accountId, dateFrom, dateTo),
          this.#repository.getTopProducts(accountId, dateFrom, dateTo),
          this.#repository.getTopServices(accountId, dateFrom, dateTo)
        ]);

      const avgTicket = closedToday > 0 ? revenue.gross / closedToday : 0;

      const lowStockAlerts = this.#repository.getLowStockAlerts
        ? await this.#repository.getLowStockAlerts(accountId)
        : [];

      return {
        openSales,
        closedToday,
        grossRevenueToday: revenue.gross,
        netRevenueToday: revenue.net,
        avgTicket: Math.round(avgTicket * 100) / 100,
        salesByPaymentMethod: [...byMethod],
        topProducts: [...topProducts],
        topServices: [...topServices],
        quotesIssued: 0,
        quotesConverted: 0,
        lowStockAlerts
      };
    }

    // In-memory fallback
    const sales = Array.from(this.#sales.values()).filter((s) => s.accountId === accountId);
    const openSales = sales.filter((s) => s.status === 'open').length;
    const today = new Date().toISOString().slice(0, 10);
    const closedToday = sales.filter(
      (s) => s.status === 'closed' && s.closedAt?.startsWith(today)
    ).length;
    const closedSales = sales.filter((s) => s.status === 'closed' && s.closedAt?.startsWith(today));
    const grossRevenueToday = closedSales.reduce((sum, s) => sum + s.total, 0);
    const netRevenueToday = closedSales.reduce((sum, s) => sum + s.paidAmount, 0);
    const avgTicket = closedToday > 0 ? grossRevenueToday / closedToday : 0;

    const payments = Array.from(this.#payments.values());
    const closedSaleIds = new Set(closedSales.map((s) => s.id));
    const methodTotals = new Map<string, number>();
    for (const p of payments) {
      if (closedSaleIds.has(p.counterSaleId)) {
        methodTotals.set(p.method, (methodTotals.get(p.method) ?? 0) + p.amount);
      }
    }

    const items = Array.from(this.#items.values());
    const productMap = new Map<string, { name: string; quantity: number; revenue: number }>();
    const serviceMap = new Map<string, { name: string; quantity: number; revenue: number }>();
    for (const item of items) {
      if (!closedSaleIds.has(item.counterSaleId)) continue;
      const map = item.itemType === 'product' ? productMap : serviceMap;
      const existing = map.get(item.nameSnapshot) ?? {
        name: item.nameSnapshot,
        quantity: 0,
        revenue: 0
      };
      existing.quantity += item.quantity;
      existing.revenue += item.lineTotal;
      map.set(item.nameSnapshot, existing);
    }

    return {
      openSales,
      closedToday,
      grossRevenueToday: Math.round(grossRevenueToday * 100) / 100,
      netRevenueToday: Math.round(netRevenueToday * 100) / 100,
      avgTicket: Math.round(avgTicket * 100) / 100,
      salesByPaymentMethod: Array.from(methodTotals.entries())
        .map(([method, total]) => ({ method, total: Math.round(total * 100) / 100 }))
        .sort((a, b) => b.total - a.total),
      topProducts: Array.from(productMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10),
      topServices: Array.from(serviceMap.values())
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10),
      quotesIssued: 0,
      quotesConverted: 0,
      lowStockAlerts: []
    };
  }

  async getCommercialReport(
    accountId: AccountId,
    reportType: 'sales' | 'payments' | 'products' | 'services' | 'quotes' | 'summary',
    dateFrom?: string,
    dateTo?: string
  ): Promise<{
    type: string;
    dateFrom: string | null;
    dateTo: string | null;
    generatedAt: string;
    data: unknown;
  }> {
    const sales = this.list(accountId).filter((s) => {
      if (dateFrom && s.closedAt && s.closedAt < dateFrom) return false;
      if (dateTo && s.closedAt && s.closedAt > dateTo + 'T23:59:59') return false;
      return true;
    });

    const closedSales = sales.filter((s) => s.status === 'closed');
    const allItems = Array.from(this.#items.values());
    const allPayments = Array.from(this.#payments.values());

    let data: unknown;

    switch (reportType) {
      case 'sales':
        data = {
          totalSales: sales.length,
          openSales: sales.filter((s) => s.status === 'open').length,
          closedSales: closedSales.length,
          cancelledSales: sales.filter((s) => s.status === 'cancelled').length,
          grossRevenue: closedSales.reduce((sum, s) => sum + s.total, 0),
          netRevenue: closedSales.reduce((sum, s) => sum + s.paidAmount, 0),
          avgTicket:
            closedSales.length > 0
              ? closedSales.reduce((sum, s) => sum + s.total, 0) / closedSales.length
              : 0,
          sales: closedSales.map((s) => ({
            number: s.number,
            total: s.total,
            paidAmount: s.paidAmount,
            closedAt: s.closedAt,
            closedBy: s.closedByUserId
          }))
        };
        break;

      case 'payments': {
        const methodMap = new Map<string, { count: number; total: number }>();
        for (const p of allPayments) {
          const sale = this.#sales.get(p.counterSaleId);
          if (!sale || sale.status !== 'closed') continue;
          if (dateFrom && p.createdAt < dateFrom) continue;
          if (dateTo && p.createdAt > dateTo + 'T23:59:59') continue;
          const existing = methodMap.get(p.method) ?? { count: 0, total: 0 };
          existing.count++;
          existing.total += p.amount;
          methodMap.set(p.method, existing);
        }
        data = {
          byMethod: Array.from(methodMap.entries())
            .map(([method, v]) => ({ method, ...v }))
            .sort((a, b) => b.total - a.total)
        };
        break;
      }

      case 'products': {
        const productMap = new Map<string, { name: string; quantity: number; revenue: number }>();
        for (const item of allItems) {
          if (item.itemType !== 'product') continue;
          const sale = this.#sales.get(item.counterSaleId);
          if (!sale || sale.status !== 'closed') continue;
          const existing = productMap.get(item.nameSnapshot) ?? {
            name: item.nameSnapshot,
            quantity: 0,
            revenue: 0
          };
          existing.quantity += item.quantity;
          existing.revenue += item.lineTotal;
          productMap.set(item.nameSnapshot, existing);
        }
        data = {
          products: Array.from(productMap.values()).sort((a, b) => b.revenue - a.revenue)
        };
        break;
      }

      case 'services': {
        const serviceMap = new Map<string, { name: string; quantity: number; revenue: number }>();
        for (const item of allItems) {
          if (item.itemType !== 'service') continue;
          const sale = this.#sales.get(item.counterSaleId);
          if (!sale || sale.status !== 'closed') continue;
          const existing = serviceMap.get(item.nameSnapshot) ?? {
            name: item.nameSnapshot,
            quantity: 0,
            revenue: 0
          };
          existing.quantity += item.quantity;
          existing.revenue += item.lineTotal;
          serviceMap.set(item.nameSnapshot, existing);
        }
        data = {
          services: Array.from(serviceMap.values()).sort((a, b) => b.revenue - a.revenue)
        };
        break;
      }

      case 'quotes':
        data = {
          note: 'Quotes report data available via quotes module'
        };
        break;

      case 'summary':
      default: {
        const methodTotals = new Map<string, number>();
        for (const p of allPayments) {
          const sale = this.#sales.get(p.counterSaleId);
          if (sale && sale.status === 'closed') {
            methodTotals.set(p.method, (methodTotals.get(p.method) ?? 0) + p.amount);
          }
        }
        const productRevenue = allItems
          .filter(
            (i) => i.itemType === 'product' && this.#sales.get(i.counterSaleId)?.status === 'closed'
          )
          .reduce((sum, i) => sum + i.lineTotal, 0);
        const serviceRevenue = allItems
          .filter(
            (i) => i.itemType === 'service' && this.#sales.get(i.counterSaleId)?.status === 'closed'
          )
          .reduce((sum, i) => sum + i.lineTotal, 0);
        data = {
          totalSales: sales.length,
          closedSales: closedSales.length,
          grossRevenue: closedSales.reduce((sum, s) => sum + s.total, 0),
          productRevenue: Math.round(productRevenue * 100) / 100,
          serviceRevenue: Math.round(serviceRevenue * 100) / 100,
          byPaymentMethod: Array.from(methodTotals.entries())
            .map(([method, total]) => ({ method, total: Math.round(total * 100) / 100 }))
            .sort((a, b) => b.total - a.total)
        };
        break;
      }
    }

    return {
      type: reportType,
      dateFrom: dateFrom ?? null,
      dateTo: dateTo ?? null,
      generatedAt: nowIso(),
      data
    };
  }
}

export {
  DatabaseCounterSalesRepository,
  type CounterSalesRepository,
  type CounterSaleDraft,
  type CounterSaleRecord,
  type CounterSaleItemRecord,
  type CounterSalePaymentRecord,
  type CounterSaleReceiptRecord
} from './repositories/database-counter-sales.repository.js';
