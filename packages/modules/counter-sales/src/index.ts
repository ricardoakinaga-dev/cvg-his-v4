import { randomUUID } from 'node:crypto';
import { ConflictError, NotFoundError } from '@cvg-his-v2/shared-errors';
import type { AccountId, UserId } from '@cvg-his-v2/shared-types';
import { createCorrelationId, nowIso } from '@cvg-his-v2/shared-utils';
import type {
  CounterSalesRepository,
  CounterSaleRecord,
  CounterSaleItemRecord,
  CounterSalePaymentRecord
} from './repositories/database-counter-sales.repository.js';

export interface CounterSaleSummary {
  readonly id: string;
  readonly accountId: AccountId;
  readonly number: string;
  readonly ownerId: string | null;
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
  readonly inventoryConsumptions?: readonly InventoryConsumption[];
  readonly cashMovements?: readonly CashMovement[];
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
    result: CounterSaleCloseResult
  ) => Promise<void>;
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
  readonly #inventoryService?: CounterSalesServiceOptions['inventoryService'];
  readonly #cashService?: CounterSalesServiceOptions['cashService'];
  readonly #sales = new Map<string, CounterSaleSummary>();
  readonly #items = new Map<string, CounterSaleItemSummary>();
  readonly #payments = new Map<string, CounterSalePaymentSummary>();
  readonly #closeLocks = new Map<string, Promise<CounterSaleCloseResult>>();
  #numberCounter = 0;

  public constructor(options?: CounterSalesServiceOptions) {
    this.#repository = options?.repository;
    this.#useUuidIdentifiers = Boolean(options?.repository);
    this.#closeTransaction = options?.closeTransaction;
    this.#onClose = options?.onClose;
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
      const items = await this.#repository.findItemsBySaleId(sale.id);
      for (const item of items) {
        this.#items.set(item.id, item);
      }
      const payments = await this.#repository.findPaymentsBySaleId(sale.id);
      for (const payment of payments) {
        this.#payments.set(payment.id, payment);
      }
    }
  }

  #nextNumber(): string {
    this.#numberCounter++;
    return `CS-${String(this.#numberCounter).padStart(6, '0')}`;
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

  async open(
    accountId: AccountId,
    openedByUserId: UserId,
    input?: { ownerId?: string | null; notes?: string | null }
  ): Promise<CounterSaleSummary> {
    const now = nowIso();
    const sale: CounterSaleSummary = {
      id: this.#nextId('cs'),
      accountId,
      number: this.#nextNumber(),
      ownerId: input?.ownerId ?? null,
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

    this.#sales.set(sale.id, sale);

    if (this.#repository) {
      const record: CounterSaleRecord = sale;
      await this.#repository.create(record);
    }

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
    }
  ): Promise<{ sale: CounterSaleSummary; item: CounterSaleItemSummary }> {
    const sale = this.#sales.get(saleId);
    if (!sale) throw new NotFoundError('Counter sale not found', { saleId });
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
    input: { quantity?: number; discountAmount?: number; notes?: string | null }
  ): Promise<{ sale: CounterSaleSummary; item: CounterSaleItemSummary }> {
    const item = this.#items.get(itemId);
    if (!item) throw new NotFoundError('Counter sale item not found', { itemId });

    const sale = this.#sales.get(item.counterSaleId);
    if (!sale) throw new NotFoundError('Counter sale not found', { saleId: item.counterSaleId });
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

  async removeItem(itemId: string): Promise<CounterSaleSummary> {
    const item = this.#items.get(itemId);
    if (!item) throw new NotFoundError('Counter sale item not found', { itemId });

    const sale = this.#sales.get(item.counterSaleId);
    if (!sale) throw new NotFoundError('Counter sale not found', { saleId: item.counterSaleId });
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
      await this.#repository.deleteItem(itemId);
      await this.#persistSale(updatedSale);
    }

    return updatedSale;
  }

  async addPayment(
    saleId: string,
    input: {
      method: CounterSalePaymentSummary['method'];
      amount: number;
      installments?: number;
      reference?: string | null;
      notes?: string | null;
    }
  ): Promise<{ sale: CounterSaleSummary; payment: CounterSalePaymentSummary }> {
    const sale = this.#sales.get(saleId);
    if (!sale) throw new NotFoundError('Counter sale not found', { saleId });
    if (sale.status !== 'open')
      throw new ConflictError('Cannot add payments to a non-open sale', { status: sale.status });

    const remaining = sale.total - sale.paidAmount;
    if (input.amount <= 0) {
      throw new ConflictError('Payment amount must be greater than zero', { amount: input.amount });
    }
    if (input.installments !== undefined && input.installments < 1) {
      throw new ConflictError('Payment installments must be greater than zero', {
        installments: input.installments
      });
    }
    if (input.amount > remaining + 0.01) {
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
      reference: input.reference?.trim() ?? null,
      notes: input.notes?.trim() ?? null,
      createdAt: now
    };

    this.#payments.set(payment.id, payment);

    if (this.#repository) {
      const record: CounterSalePaymentRecord = payment;
      await this.#repository.createPayment(record);
    }

    const updatedSale = this.#recalculate(saleId);
    if (this.#repository) {
      await this.#persistSale(updatedSale);
    }
    return { sale: updatedSale, payment };
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
    const sale = this.#sales.get(saleId);
    if (!sale) throw new NotFoundError('Counter sale not found', { saleId });
    if (sale.status !== 'open')
      throw new ConflictError('Sale is not open', { status: sale.status });

    const payments = Array.from(this.#payments.values()).filter((p) => p.counterSaleId === saleId);
    const paidAmount = payments.reduce((sum, p) => sum + p.amount, 0);
    if (Math.round(paidAmount * 100) / 100 < sale.total - 0.01) {
      throw new ConflictError('Cannot close sale with outstanding balance', {
        total: sale.total,
        paid: Math.round(paidAmount * 100) / 100,
        balanceDue: sale.balanceDue
      });
    }

    if (this.#repository && !this.#closeTransaction) {
      throw new ConflictError('Database-backed counter sale close requires a transaction boundary', {
        saleId
      });
    }

    const items = Array.from(this.#items.values()).filter((item) => item.counterSaleId === saleId);
    const executeClose = async (): Promise<CounterSaleCloseResult> => {
      // Block 1: Automatic inventory consumption for product items
      const inventoryConsumptions: InventoryConsumption[] = [];
      if (this.#inventoryService) {
        const productItems = items.filter((item) => item.itemType === 'product' && item.codeSnapshot);
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

      const result: CounterSaleCloseResult = {
        sale: updated,
        inventoryConsumptions: inventoryConsumptions.length > 0 ? inventoryConsumptions : undefined,
        cashMovements: cashMovements.length > 0 ? cashMovements : undefined
      };
      await this.#onClose?.({ sale, items, payments, closedByUserId }, result);
      return result;
    };

    try {
      return this.#closeTransaction
        ? await this.#closeTransaction(
            { sale, items, payments, closedByUserId },
            executeClose
          )
        : await executeClose();
    } catch (error) {
      // The durable transaction rolls back external effects. Restore this service's
      // in-memory projection as well so a failed close cannot be observed as closed.
      this.#sales.set(saleId, sale);
      throw error;
    }
  }

  async cancel(saleId: string): Promise<CounterSaleSummary> {
    const sale = this.#sales.get(saleId);
    if (!sale) throw new NotFoundError('Counter sale not found', { saleId });
    if (sale.status === 'closed') throw new ConflictError('Cannot cancel a closed sale');

    const now = nowIso();
    const updated: CounterSaleSummary = {
      ...sale,
      status: 'cancelled',
      updatedAt: now
    };
    this.#sales.set(saleId, updated);

    if (this.#repository) {
      const record: CounterSaleRecord = updated;
      await this.#repository.update(record);
    }

    return updated;
  }

  async reopen(saleId: string): Promise<CounterSaleSummary> {
    const sale = this.#sales.get(saleId);
    if (!sale) throw new NotFoundError('Counter sale not found', { saleId });
    if (sale.status !== 'closed')
      throw new ConflictError('Can only reopen closed sales', { status: sale.status });

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

  getOrThrow(id: string): CounterSaleSummary {
    const sale = this.#sales.get(id);
    if (!sale) throw new NotFoundError('Counter sale not found', { id });
    return sale;
  }

  getItems(saleId: string): CounterSaleItemSummary[] {
    return Array.from(this.#items.values())
      .filter((i) => i.counterSaleId === saleId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  getPayments(saleId: string): CounterSalePaymentSummary[] {
    return Array.from(this.#payments.values())
      .filter((p) => p.counterSaleId === saleId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  list(
    accountId: AccountId,
    filters?: { status?: string; search?: string; ownerId?: string; dateFrom?: string; dateTo?: string }
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
  type CounterSaleRecord,
  type CounterSaleItemRecord,
  type CounterSalePaymentRecord
} from './repositories/database-counter-sales.repository.js';
