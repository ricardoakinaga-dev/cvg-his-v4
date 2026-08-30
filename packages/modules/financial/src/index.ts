import { randomUUID } from 'node:crypto';
import type { BillingService } from '@cvg-his-v2/module-billing';
import type { EncountersService } from '@cvg-his-v2/module-encounters';
import type { OwnersService } from '@cvg-his-v2/module-owners';
import type { PatientsService } from '@cvg-his-v2/module-patients';
import { ConflictError, NotFoundError, ValidationError } from '@cvg-his-v2/shared-errors';
import type { AccountId, BillingRecordId, EncounterId, UserId } from '@cvg-his-v2/shared-types';
import { createCorrelationId, nowIso } from '@cvg-his-v2/shared-utils';

export {
  FinancialLedgerService,
  InMemoryFinancialLedgerRepository,
  type FinancialJournalEntry,
  type FinancialJournalEntryInput,
  type FinancialJournalLine,
  type FinancialJournalLineInput,
  type FinancialLedgerRepository
} from './ledger.js';
export { DatabaseFinancialLedgerRepository } from './repositories/database-ledger.repository.js';

export type EncounterFinancialStatus = 'pending' | 'partial' | 'paid';
export type EncounterReceivableStatus = 'open' | 'settled';
export type EncounterReceivablePaymentExternalReferenceType =
  | 'pix_transaction'
  | 'cash_movement'
  | 'billing_record'
  | 'other';
export type FinancialPayableStatus = 'open' | 'partial' | 'paid' | 'cancelled';
export type FinancialPayablePaymentMethod =
  | 'cash'
  | 'bank_transfer'
  | 'pix'
  | 'card'
  | 'cheque'
  | 'other';
export type FinancialPayableReconciliationStatus = 'not_required' | 'pending' | 'reconciled';

export interface EncounterFinancialAccountRecord {
  readonly id: string;
  readonly accountId: AccountId;
  readonly encounterId: EncounterId;
  readonly financialStatus: EncounterFinancialStatus;
  readonly subtotalSnapshot: number;
  readonly discountTotalSnapshot: number;
  readonly totalSnapshot: number;
  readonly paidAmount: number;
  readonly balanceDue: number;
  readonly closedByUserId: UserId | null;
  readonly closedAt: string | null;
  readonly notes: string | null;
  readonly snapshotJson: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface EncounterReceivableRecord {
  readonly id: string;
  readonly accountId: AccountId;
  readonly encounterId: EncounterId;
  readonly financialAccountId: string;
  readonly installmentNumber: number;
  readonly installmentLabel: string;
  readonly dueAt: string | null;
  readonly status: EncounterReceivableStatus;
  readonly amountOriginal: number;
  readonly amountPaid: number;
  readonly amountOutstanding: number;
  readonly issuedAt: string;
  readonly settledAt: string | null;
  readonly notes: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface EncounterReceivablePaymentRecord {
  readonly id: string;
  readonly accountId: AccountId;
  readonly encounterId: EncounterId;
  readonly financialAccountId: string;
  readonly receivableId: string;
  readonly amountPaid: number;
  readonly paidAt: string;
  readonly paidByUserId: UserId | null;
  readonly externalReferenceType: EncounterReceivablePaymentExternalReferenceType | null;
  readonly externalReferenceId: string | null;
  readonly notes: string | null;
  readonly createdAt: string;
}

export interface EncounterReceivableListFilters {
  readonly accountId?: AccountId;
  readonly status?: EncounterReceivableStatus;
  readonly encounterId?: EncounterId;
  readonly search?: string;
}

export interface FinancialPayableRecord {
  readonly id: string;
  readonly accountId: AccountId;
  readonly supplierName: string;
  readonly description: string;
  readonly category: string;
  readonly costCenterCode: string;
  readonly costCenterName: string;
  readonly issuedAt: string;
  readonly dueAt: string;
  readonly totalAmount: number;
  readonly paidAmount: number;
  readonly outstandingAmount: number;
  readonly status: FinancialPayableStatus;
  readonly sourceExpenseId: string | null;
  readonly notes: string | null;
  readonly paymentMethod: FinancialPayablePaymentMethod | null;
  readonly paymentReference: string | null;
  readonly reconciliationStatus: FinancialPayableReconciliationStatus;
  readonly reconciliationReference: string | null;
  readonly createdByUserId: UserId;
  readonly paidByUserId: UserId | null;
  readonly cancelledByUserId: UserId | null;
  readonly reconciledByUserId: UserId | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly paidAt: string | null;
  readonly cancelledAt: string | null;
  readonly reconciledAt: string | null;
}

export interface FinancialPayableListFilters {
  readonly accountId?: AccountId;
  readonly status?: FinancialPayableStatus;
  readonly search?: string;
}

export interface FinancialPayablesRepository {
  savePayable(payable: FinancialPayableRecord): Promise<void>;
  updatePayable(payable: FinancialPayableRecord): Promise<void>;
  findPayableById(payableId: string): Promise<FinancialPayableRecord | null>;
  findPayableByIdForUpdate?(payableId: string): Promise<FinancialPayableRecord | null>;
  listPayables(filters?: FinancialPayableListFilters): Promise<readonly FinancialPayableRecord[]>;
  withTransaction?<T>(accountId: AccountId, operation: () => Promise<T>): Promise<T>;
}

export interface EncounterFinancialRepository {
  findFinancialAccountByEncounter(
    encounterId: EncounterId
  ): Promise<EncounterFinancialAccountRecord | null>;
  upsertFinancialAccount(account: EncounterFinancialAccountRecord): Promise<void>;
  listReceivablesByFinancialAccount(
    financialAccountId: string
  ): Promise<readonly EncounterReceivableRecord[]>;
  replaceReceivables(
    financialAccountId: string,
    receivables: readonly EncounterReceivableRecord[]
  ): Promise<void>;
  updateReceivable(receivable: EncounterReceivableRecord): Promise<void>;
  findReceivableById(receivableId: string): Promise<EncounterReceivableRecord | null>;
  listPaymentsByFinancialAccount(
    financialAccountId: string
  ): Promise<readonly EncounterReceivablePaymentRecord[]>;
  createPayment(payment: EncounterReceivablePaymentRecord): Promise<void>;
  listReceivables(
    filters?: EncounterReceivableListFilters
  ): Promise<readonly EncounterReceivableRecord[]>;
  withTransaction?<T>(accountId: AccountId, operation: () => Promise<T>): Promise<T>;
  findFinancialAccountByEncounterForUpdate?(
    encounterId: EncounterId
  ): Promise<EncounterFinancialAccountRecord | null>;
  findReceivableByIdForUpdate?(receivableId: string): Promise<EncounterReceivableRecord | null>;
  /** True when append-only cash-receipt history keeps payment rows attached. */
  hasReversedCashReceiptForFinancialAccount?(financialAccountId: string): Promise<boolean>;
}

export interface CloseEncounterFinancialInput {
  readonly paidAmount?: number;
  readonly notes?: string | null;
  readonly installments?: ReadonlyArray<{
    readonly label?: string;
    readonly amount: number;
    readonly dueAt?: string | null;
    readonly notes?: string | null;
  }>;
}

export interface SettleEncounterReceivableInput {
  readonly amountPaid: number;
  readonly notes?: string | null;
  readonly paidByUserId?: UserId | null;
  readonly externalReferenceType?: EncounterReceivablePaymentExternalReferenceType | null;
  readonly externalReferenceId?: string | null;
}

export interface CreateFinancialPayableInput {
  readonly supplierName: string;
  readonly description: string;
  readonly category: string;
  readonly costCenterCode: string;
  readonly costCenterName: string;
  readonly issuedAt?: string;
  readonly dueAt: string;
  readonly totalAmount: number;
  readonly sourceExpenseId?: string | null;
  readonly notes?: string | null;
}

export interface PayFinancialPayableInput {
  readonly amountPaid: number;
  readonly paymentMethod?: FinancialPayablePaymentMethod | null;
  readonly paymentReference?: string | null;
  readonly notes?: string | null;
}

export interface ReconcileFinancialPayableInput {
  readonly reconciliationReference?: string | null;
  readonly notes?: string | null;
}

export interface FinancialPayableReconciliationFilters {
  readonly status?: FinancialPayableReconciliationStatus;
  readonly search?: string;
  readonly page?: number;
  readonly pageSize?: number;
}

export interface FinancialPayablePaidEvent {
  readonly payable: FinancialPayableRecord;
  readonly amountPaid: number;
  readonly paymentMethod: FinancialPayablePaymentMethod | null;
  readonly paymentReference: string | null;
  readonly paidByUserId: UserId;
  readonly paidAt: string;
}

export interface FinancialPayablesServiceOptions {
  readonly onPayablePaid?: (event: FinancialPayablePaidEvent) => Promise<void>;
}

export interface FinancialStatementPeriod {
  readonly dateFrom?: string | null;
  readonly dateTo?: string | null;
}

export interface FinancialIncomeStatement {
  readonly generatedAt: string;
  readonly period: {
    readonly dateFrom: string;
    readonly dateTo: string;
  };
  readonly revenue: {
    readonly grossRevenue: number;
    readonly realizedRevenue: number;
    readonly outstandingReceivables: number;
    readonly receivableCount: number;
    readonly settledReceivableCount: number;
    readonly openReceivableCount: number;
  };
  readonly expenses: {
    readonly accruedExpenses: number;
    readonly paidExpenses: number;
    readonly outstandingPayables: number;
    readonly payableCount: number;
    readonly paidPayableCount: number;
    readonly openPayableCount: number;
    readonly byCategory: ReadonlyArray<{
      readonly category: string;
      readonly accruedAmount: number;
      readonly paidAmount: number;
      readonly outstandingAmount: number;
    }>;
  };
  readonly result: {
    readonly realizedNetResult: number;
    readonly accrualNetResult: number;
    readonly grossMarginPercent: number | null;
    readonly cashConversionPercent: number | null;
  };
}

export interface EncounterFinancialServiceOptions {
  readonly repository: EncounterFinancialRepository;
  readonly onReceivablePaid?: (payment: EncounterReceivablePaymentRecord) => Promise<void>;
}

function requireTrimmed(value: string | null | undefined, field: string): string {
  const normalized = value?.trim();
  if (!normalized) throw new ValidationError(`${field} is required`, { field });
  return normalized;
}

function normalizeOptional(value: string | null | undefined): string | null {
  return value?.trim() || null;
}

function normalizePayablePaymentMethod(
  value: FinancialPayablePaymentMethod | null | undefined
): FinancialPayablePaymentMethod | null {
  return value ?? null;
}

function normalizeDate(value: string | undefined, field: string): string {
  const source = value ?? nowIso();
  const date = new Date(`${source.slice(0, 10)}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new ValidationError(`${field} must be a valid ISO date`, { field, value });
  }
  return date.toISOString().slice(0, 10);
}

function normalizePeriodDate(
  value: string | null | undefined,
  fallback: string,
  field: string
): string {
  return normalizeDate(value ?? fallback, field);
}

function currentMonthPeriod(): { dateFrom: string; dateTo: string } {
  const today = new Date();
  const year = today.getUTCFullYear();
  const month = today.getUTCMonth();
  return {
    dateFrom: new Date(Date.UTC(year, month, 1)).toISOString().slice(0, 10),
    dateTo: new Date(Date.UTC(year, month + 1, 0)).toISOString().slice(0, 10)
  };
}

function isDateWithinPeriod(
  value: string | null | undefined,
  dateFrom: string,
  dateTo: string
): boolean {
  if (!value) return false;
  const normalized = value.slice(0, 10);
  return normalized >= dateFrom && normalized <= dateTo;
}

function requirePositiveCurrency(value: number, field: string): number {
  if (!Number.isFinite(value) || value <= 0) {
    throw new ValidationError(`${field} must be greater than zero`, { field, value });
  }
  return roundCurrency(value);
}

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function deriveFinancialStatus(
  balanceDue: number,
  paidAmount: number,
  totalSnapshot: number
): EncounterFinancialStatus {
  if (balanceDue <= 0) return 'paid';
  if (paidAmount > 0 && paidAmount < totalSnapshot) return 'partial';
  return 'pending';
}

function buildSnapshotJson(recordId: BillingRecordId, itemCount: number, total: number): string {
  return JSON.stringify({ billingRecordId: recordId, itemCount, total });
}

function attachPayments(
  receivable: EncounterReceivableRecord,
  payments: readonly EncounterReceivablePaymentRecord[]
) {
  return {
    id: receivable.id,
    encounterId: receivable.encounterId,
    financialAccountId: receivable.financialAccountId,
    installmentNumber: receivable.installmentNumber,
    installmentLabel: receivable.installmentLabel,
    dueAt: receivable.dueAt,
    status: receivable.status,
    amountOriginal: receivable.amountOriginal,
    amountPaid: receivable.amountPaid,
    amountOutstanding: receivable.amountOutstanding,
    issuedAt: receivable.issuedAt,
    settledAt: receivable.settledAt,
    notes: receivable.notes,
    payments: payments
      .filter((payment) => payment.receivableId === receivable.id)
      .map((payment) => ({
        id: payment.id,
        receivableId: payment.receivableId,
        financialAccountId: payment.financialAccountId,
        encounterId: payment.encounterId,
        amountPaid: payment.amountPaid,
        paidAt: payment.paidAt,
        paidByUserId: payment.paidByUserId,
        externalReferenceType: payment.externalReferenceType,
        externalReferenceId: payment.externalReferenceId,
        notes: payment.notes
      }))
  };
}

export class InMemoryEncounterFinancialRepository implements EncounterFinancialRepository {
  readonly #accountsByEncounterId = new Map<string, EncounterFinancialAccountRecord>();
  readonly #receivablesById = new Map<string, EncounterReceivableRecord>();
  readonly #paymentsById = new Map<string, EncounterReceivablePaymentRecord>();

  async findFinancialAccountByEncounter(
    encounterId: EncounterId
  ): Promise<EncounterFinancialAccountRecord | null> {
    return this.#accountsByEncounterId.get(encounterId) ?? null;
  }

  async upsertFinancialAccount(account: EncounterFinancialAccountRecord): Promise<void> {
    this.#accountsByEncounterId.set(account.encounterId, { ...account });
  }

  async listReceivablesByFinancialAccount(
    financialAccountId: string
  ): Promise<readonly EncounterReceivableRecord[]> {
    return Array.from(this.#receivablesById.values())
      .filter((receivable) => receivable.financialAccountId === financialAccountId)
      .sort((left, right) => left.installmentNumber - right.installmentNumber);
  }

  async replaceReceivables(
    financialAccountId: string,
    receivables: readonly EncounterReceivableRecord[]
  ): Promise<void> {
    for (const receivable of Array.from(this.#receivablesById.values())) {
      if (receivable.financialAccountId === financialAccountId) {
        this.#receivablesById.delete(receivable.id);
      }
    }
    for (const payment of Array.from(this.#paymentsById.values())) {
      if (payment.financialAccountId === financialAccountId) {
        this.#paymentsById.delete(payment.id);
      }
    }
    for (const receivable of receivables) {
      this.#receivablesById.set(receivable.id, { ...receivable });
    }
  }

  async updateReceivable(receivable: EncounterReceivableRecord): Promise<void> {
    this.#receivablesById.set(receivable.id, { ...receivable });
  }

  async findReceivableById(receivableId: string): Promise<EncounterReceivableRecord | null> {
    return this.#receivablesById.get(receivableId) ?? null;
  }

  async listPaymentsByFinancialAccount(
    financialAccountId: string
  ): Promise<readonly EncounterReceivablePaymentRecord[]> {
    return Array.from(this.#paymentsById.values())
      .filter((payment) => payment.financialAccountId === financialAccountId)
      .sort((left, right) => left.paidAt.localeCompare(right.paidAt));
  }

  async createPayment(payment: EncounterReceivablePaymentRecord): Promise<void> {
    this.#paymentsById.set(payment.id, { ...payment });
  }

  async listReceivables(
    filters?: EncounterReceivableListFilters
  ): Promise<readonly EncounterReceivableRecord[]> {
    let items = Array.from(this.#receivablesById.values());
    if (filters?.accountId) {
      items = items.filter((item) => item.accountId === filters.accountId);
    }
    if (filters?.status) {
      items = items.filter((item) => item.status === filters.status);
    }
    if (filters?.encounterId) {
      items = items.filter((item) => item.encounterId === filters.encounterId);
    }
    return items.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  }
}

export class InMemoryFinancialPayablesRepository implements FinancialPayablesRepository {
  readonly #payables = new Map<string, FinancialPayableRecord>();

  async savePayable(payable: FinancialPayableRecord): Promise<void> {
    this.#payables.set(payable.id, { ...payable });
  }

  async updatePayable(payable: FinancialPayableRecord): Promise<void> {
    this.#payables.set(payable.id, { ...payable });
  }

  async findPayableById(payableId: string): Promise<FinancialPayableRecord | null> {
    return this.#payables.get(payableId) ?? null;
  }

  async listPayables(
    filters?: FinancialPayableListFilters
  ): Promise<readonly FinancialPayableRecord[]> {
    let items = Array.from(this.#payables.values());
    if (filters?.accountId) {
      items = items.filter((item) => item.accountId === filters.accountId);
    }
    if (filters?.status) {
      items = items.filter((item) => item.status === filters.status);
    }
    return items.sort(
      (left, right) =>
        left.dueAt.localeCompare(right.dueAt) || left.supplierName.localeCompare(right.supplierName)
    );
  }
}

export class FinancialPayablesService {
  readonly #repository: FinancialPayablesRepository;
  readonly #onPayablePaid?: (event: FinancialPayablePaidEvent) => Promise<void>;

  public constructor(
    repository: FinancialPayablesRepository = new InMemoryFinancialPayablesRepository(),
    options: FinancialPayablesServiceOptions = {}
  ) {
    this.#repository = repository;
    this.#onPayablePaid = options.onPayablePaid;
  }

  public async createPayable(
    accountId: AccountId,
    createdByUserId: UserId,
    input: CreateFinancialPayableInput
  ): Promise<FinancialPayableRecord> {
    const issuedAt = normalizeDate(input.issuedAt, 'issuedAt');
    const dueAt = normalizeDate(input.dueAt, 'dueAt');
    if (issuedAt > dueAt) {
      throw new ValidationError('issuedAt must be before or equal to dueAt', { issuedAt, dueAt });
    }
    const now = nowIso();
    const totalAmount = requirePositiveCurrency(input.totalAmount, 'totalAmount');
    const payable: FinancialPayableRecord = {
      id: createCorrelationId('payable'),
      accountId,
      supplierName: requireTrimmed(input.supplierName, 'supplierName'),
      description: requireTrimmed(input.description, 'description'),
      category: requireTrimmed(input.category, 'category'),
      costCenterCode: requireTrimmed(input.costCenterCode, 'costCenterCode'),
      costCenterName: requireTrimmed(input.costCenterName, 'costCenterName'),
      issuedAt,
      dueAt,
      totalAmount,
      paidAmount: 0,
      outstandingAmount: totalAmount,
      status: 'open',
      sourceExpenseId: normalizeOptional(input.sourceExpenseId),
      notes: normalizeOptional(input.notes),
      paymentMethod: null,
      paymentReference: null,
      reconciliationStatus: 'not_required',
      reconciliationReference: null,
      createdByUserId,
      paidByUserId: null,
      cancelledByUserId: null,
      reconciledByUserId: null,
      createdAt: now,
      updatedAt: now,
      paidAt: null,
      cancelledAt: null,
      reconciledAt: null
    };
    await this.#repository.savePayable(payable);
    return payable;
  }

  public async listPayables(
    accountId: AccountId,
    filters: Omit<FinancialPayableListFilters, 'accountId'> & {
      readonly page?: number;
      readonly pageSize?: number;
    } = {}
  ) {
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.max(1, Math.min(100, filters.pageSize ?? 20));
    const search = filters.search?.trim().toLowerCase();
    let data = [...(await this.#repository.listPayables({ accountId, status: filters.status }))];
    if (search) {
      data = data.filter((item) =>
        [item.supplierName, item.description, item.category, item.costCenterName, item.notes ?? '']
          .join(' ')
          .toLowerCase()
          .includes(search)
      );
    }
    const total = data.length;
    const paged = data.slice((page - 1) * pageSize, page * pageSize);
    return {
      data: paged,
      page,
      pageSize,
      total,
      openCount: data.filter((item) => item.status === 'open' || item.status === 'partial').length,
      paidCount: data.filter((item) => item.status === 'paid').length,
      cancelledCount: data.filter((item) => item.status === 'cancelled').length,
      totalAmount: roundCurrency(data.reduce((sum, item) => sum + item.totalAmount, 0)),
      totalPaid: roundCurrency(data.reduce((sum, item) => sum + item.paidAmount, 0)),
      totalOutstanding: roundCurrency(data.reduce((sum, item) => sum + item.outstandingAmount, 0))
    };
  }

  public async payPayable(
    accountId: AccountId,
    paidByUserId: UserId,
    payableId: string,
    input: PayFinancialPayableInput
  ): Promise<FinancialPayableRecord> {
    const amountPaid = requirePositiveCurrency(input.amountPaid, 'amountPaid');
    const execute = async (): Promise<FinancialPayableRecord> => {
      const payable = this.#repository.findPayableByIdForUpdate
        ? await this.#repository.findPayableByIdForUpdate(payableId)
        : await this.#repository.findPayableById(payableId);
      if (!payable || payable.accountId !== accountId) {
        throw new NotFoundError('Financial payable not found', { payableId });
      }
      if (payable.status !== 'open' && payable.status !== 'partial') {
        throw new ConflictError('Only open or partial payables can be paid', {
          payableId,
          status: payable.status
        });
      }
      if (amountPaid > payable.outstandingAmount) {
        throw new ConflictError('Payment exceeds outstanding payable balance', {
          payableId,
          amountPaid,
          outstandingAmount: payable.outstandingAmount
        });
      }
      const now = nowIso();
      const nextPaid = roundCurrency(payable.paidAmount + amountPaid);
      const nextOutstanding = roundCurrency(Math.max(payable.totalAmount - nextPaid, 0));
      const paymentMethod = normalizePayablePaymentMethod(input.paymentMethod);
      const paymentReference = normalizeOptional(input.paymentReference);
      const updated: FinancialPayableRecord = {
        ...payable,
        paidAmount: nextPaid,
        outstandingAmount: nextOutstanding,
        status: nextOutstanding <= 0 ? 'paid' : 'partial',
        notes: normalizeOptional(input.notes) ?? payable.notes,
        paymentMethod,
        paymentReference,
        reconciliationStatus: this.#derivePayableReconciliationStatus(
          paymentMethod,
          nextOutstanding
        ),
        reconciliationReference: null,
        paidByUserId,
        paidAt: nextOutstanding <= 0 ? now : payable.paidAt,
        updatedAt: now
      };
      await this.#onPayablePaid?.({
        payable: updated,
        amountPaid,
        paymentMethod,
        paymentReference,
        paidByUserId,
        paidAt: now
      });
      await this.#repository.updatePayable(updated);
      return updated;
    };
    return this.#repository.withTransaction
      ? this.#repository.withTransaction(accountId, execute)
      : execute();
  }

  public async cancelPayable(
    accountId: AccountId,
    cancelledByUserId: UserId,
    payableId: string,
    notes?: string | null
  ): Promise<FinancialPayableRecord> {
    const payable = await this.#getPayable(accountId, payableId);
    if (payable.status === 'paid') {
      throw new ConflictError('Paid payables cannot be cancelled', { payableId });
    }
    const now = nowIso();
    const updated: FinancialPayableRecord = {
      ...payable,
      status: 'cancelled',
      outstandingAmount: 0,
      notes: normalizeOptional(notes) ?? payable.notes,
      cancelledByUserId,
      reconciliationStatus: 'not_required',
      cancelledAt: now,
      updatedAt: now
    };
    await this.#repository.updatePayable(updated);
    return updated;
  }

  public async listPayableReconciliation(
    accountId: AccountId,
    filters: FinancialPayableReconciliationFilters = {}
  ) {
    const page = Math.max(1, filters.page ?? 1);
    const pageSize = Math.max(1, Math.min(100, filters.pageSize ?? 20));
    const search = filters.search?.trim().toLowerCase();
    let data = [...(await this.#repository.listPayables({ accountId }))].filter(
      (item) =>
        item.status === 'paid' &&
        item.paymentMethod !== null &&
        item.paymentMethod !== 'cash' &&
        item.reconciliationStatus !== 'not_required'
    );
    if (filters.status) {
      data = data.filter((item) => item.reconciliationStatus === filters.status);
    }
    if (search) {
      data = data.filter((item) =>
        [
          item.supplierName,
          item.description,
          item.category,
          item.costCenterName,
          item.paymentReference ?? '',
          item.reconciliationReference ?? '',
          item.notes ?? ''
        ]
          .join(' ')
          .toLowerCase()
          .includes(search)
      );
    }
    const total = data.length;
    const paged = data.slice((page - 1) * pageSize, page * pageSize);
    return {
      data: paged,
      page,
      pageSize,
      total,
      pendingCount: data.filter((item) => item.reconciliationStatus === 'pending').length,
      reconciledCount: data.filter((item) => item.reconciliationStatus === 'reconciled').length,
      pendingAmount: roundCurrency(
        data
          .filter((item) => item.reconciliationStatus === 'pending')
          .reduce((sum, item) => sum + item.paidAmount, 0)
      ),
      reconciledAmount: roundCurrency(
        data
          .filter((item) => item.reconciliationStatus === 'reconciled')
          .reduce((sum, item) => sum + item.paidAmount, 0)
      )
    };
  }

  public async reconcilePayablePayment(
    accountId: AccountId,
    reconciledByUserId: UserId,
    payableId: string,
    input: ReconcileFinancialPayableInput
  ): Promise<FinancialPayableRecord> {
    const payable = await this.#getPayable(accountId, payableId);
    if (payable.status !== 'paid') {
      throw new ConflictError('Only paid payables can be reconciled', {
        payableId,
        status: payable.status
      });
    }
    if (!payable.paymentMethod || payable.paymentMethod === 'cash') {
      throw new ConflictError('Only non-cash payable payments require reconciliation', {
        payableId,
        paymentMethod: payable.paymentMethod
      });
    }
    const now = nowIso();
    const updated: FinancialPayableRecord = {
      ...payable,
      reconciliationStatus: 'reconciled',
      reconciliationReference:
        normalizeOptional(input.reconciliationReference) ?? payable.reconciliationReference,
      notes: normalizeOptional(input.notes) ?? payable.notes,
      reconciledByUserId,
      reconciledAt: now,
      updatedAt: now
    };
    await this.#repository.updatePayable(updated);
    return updated;
  }

  #derivePayableReconciliationStatus(
    paymentMethod: FinancialPayablePaymentMethod | null,
    outstandingAmount: number
  ): FinancialPayableReconciliationStatus {
    if (outstandingAmount > 0) return 'not_required';
    if (!paymentMethod || paymentMethod === 'cash') return 'not_required';
    return 'pending';
  }

  async #getPayable(accountId: AccountId, payableId: string): Promise<FinancialPayableRecord> {
    const payable = await this.#repository.findPayableById(payableId);
    if (!payable || payable.accountId !== accountId) {
      throw new NotFoundError('Financial payable not found', { payableId });
    }
    return payable;
  }
}

export class FinancialIncomeStatementService {
  readonly #receivables: EncounterFinancialRepository;
  readonly #payables: FinancialPayablesRepository;

  public constructor(options: {
    readonly receivables: EncounterFinancialRepository;
    readonly payables: FinancialPayablesRepository;
  }) {
    this.#receivables = options.receivables;
    this.#payables = options.payables;
  }

  public async getIncomeStatement(
    accountId: AccountId,
    period: FinancialStatementPeriod = {}
  ): Promise<FinancialIncomeStatement> {
    const defaults = currentMonthPeriod();
    const dateFrom = normalizePeriodDate(period.dateFrom, defaults.dateFrom, 'dateFrom');
    const dateTo = normalizePeriodDate(period.dateTo, defaults.dateTo, 'dateTo');
    if (dateFrom > dateTo) {
      throw new ValidationError('dateFrom must be before or equal to dateTo', { dateFrom, dateTo });
    }

    const allReceivables = await this.#receivables.listReceivables({ accountId });
    const periodReceivables = allReceivables.filter(
      (receivable) =>
        isDateWithinPeriod(receivable.issuedAt, dateFrom, dateTo) ||
        isDateWithinPeriod(receivable.dueAt, dateFrom, dateTo) ||
        isDateWithinPeriod(receivable.settledAt, dateFrom, dateTo)
    );
    const allPayables = await this.#payables.listPayables({ accountId });
    const periodPayables = allPayables.filter(
      (payable) =>
        payable.status !== 'cancelled' &&
        (isDateWithinPeriod(payable.issuedAt, dateFrom, dateTo) ||
          isDateWithinPeriod(payable.dueAt, dateFrom, dateTo) ||
          isDateWithinPeriod(payable.paidAt, dateFrom, dateTo))
    );

    const grossRevenue = roundCurrency(
      periodReceivables.reduce((sum, receivable) => sum + receivable.amountOriginal, 0)
    );
    const realizedRevenue = roundCurrency(
      periodReceivables
        .filter((receivable) => isDateWithinPeriod(receivable.settledAt, dateFrom, dateTo))
        .reduce((sum, receivable) => sum + receivable.amountPaid, 0)
    );
    const outstandingReceivables = roundCurrency(
      periodReceivables.reduce((sum, receivable) => sum + receivable.amountOutstanding, 0)
    );
    const accruedExpenses = roundCurrency(
      periodPayables.reduce((sum, payable) => sum + payable.totalAmount, 0)
    );
    const paidExpenses = roundCurrency(
      periodPayables.reduce((sum, payable) => sum + payable.paidAmount, 0)
    );
    const outstandingPayables = roundCurrency(
      periodPayables.reduce((sum, payable) => sum + payable.outstandingAmount, 0)
    );

    return {
      generatedAt: nowIso(),
      period: { dateFrom, dateTo },
      revenue: {
        grossRevenue,
        realizedRevenue,
        outstandingReceivables,
        receivableCount: periodReceivables.length,
        settledReceivableCount: periodReceivables.filter(
          (receivable) => receivable.status === 'settled'
        ).length,
        openReceivableCount: periodReceivables.filter((receivable) => receivable.status === 'open')
          .length
      },
      expenses: {
        accruedExpenses,
        paidExpenses,
        outstandingPayables,
        payableCount: periodPayables.length,
        paidPayableCount: periodPayables.filter((payable) => payable.status === 'paid').length,
        openPayableCount: periodPayables.filter(
          (payable) => payable.status === 'open' || payable.status === 'partial'
        ).length,
        byCategory: this.#buildCategoryBreakdown(periodPayables)
      },
      result: {
        realizedNetResult: roundCurrency(realizedRevenue - paidExpenses),
        accrualNetResult: roundCurrency(grossRevenue - accruedExpenses),
        grossMarginPercent:
          grossRevenue > 0
            ? roundCurrency(((grossRevenue - accruedExpenses) / grossRevenue) * 100)
            : null,
        cashConversionPercent:
          grossRevenue > 0 ? roundCurrency((realizedRevenue / grossRevenue) * 100) : null
      }
    };
  }

  #buildCategoryBreakdown(
    payables: readonly FinancialPayableRecord[]
  ): FinancialIncomeStatement['expenses']['byCategory'] {
    const byCategory = new Map<
      string,
      { accruedAmount: number; paidAmount: number; outstandingAmount: number }
    >();
    for (const payable of payables) {
      const current = byCategory.get(payable.category) ?? {
        accruedAmount: 0,
        paidAmount: 0,
        outstandingAmount: 0
      };
      byCategory.set(payable.category, {
        accruedAmount: roundCurrency(current.accruedAmount + payable.totalAmount),
        paidAmount: roundCurrency(current.paidAmount + payable.paidAmount),
        outstandingAmount: roundCurrency(current.outstandingAmount + payable.outstandingAmount)
      });
    }
    return Array.from(byCategory.entries())
      .map(([category, values]) => ({ category, ...values }))
      .sort(
        (left, right) =>
          right.accruedAmount - left.accruedAmount || left.category.localeCompare(right.category)
      );
  }
}

export class EncounterFinancialService {
  readonly #encounters: EncountersService;
  readonly #billing: BillingService;
  readonly #patients: PatientsService;
  readonly #owners: OwnersService;
  readonly #repository: EncounterFinancialRepository;
  readonly #onReceivablePaid?: (payment: EncounterReceivablePaymentRecord) => Promise<void>;

  public constructor(
    encounters: EncountersService,
    billing: BillingService,
    patients: PatientsService,
    owners: OwnersService,
    options: EncounterFinancialServiceOptions
  ) {
    this.#encounters = encounters;
    this.#billing = billing;
    this.#patients = patients;
    this.#owners = owners;
    this.#repository = options.repository;
    this.#onReceivablePaid = options.onReceivablePaid;
  }

  public async syncEncounter(encounterId: EncounterId): Promise<void> {
    const encounter = this.#encounters.getOrThrow(encounterId);
    const billingRecord = await this.#billing.getByEncounterOrThrow(
      encounter.accountId,
      encounterId
    );
    const items = await this.#billing.listItems(encounter.accountId, encounterId);
    const total = roundCurrency(items.reduce((sum, item) => sum + item.totalAmount, 0));
    const existingAccount = await this.#repository.findFinancialAccountByEncounter(encounterId);
    const existingReceivables = existingAccount
      ? await this.#repository.listReceivablesByFinancialAccount(existingAccount.id)
      : [];
    const existingPayments = existingAccount
      ? await this.#repository.listPaymentsByFinancialAccount(existingAccount.id)
      : [];
    const paidAmount = roundCurrency(
      existingPayments.reduce((sum, payment) => sum + payment.amountPaid, 0)
    );
    const balanceDue = roundCurrency(Math.max(total - paidAmount, 0));
    const now = nowIso();

    const account: EncounterFinancialAccountRecord = {
      id: existingAccount?.id ?? randomUUID(),
      accountId: encounter.accountId,
      encounterId: encounter.id,
      financialStatus: deriveFinancialStatus(balanceDue, paidAmount, total),
      subtotalSnapshot: total,
      discountTotalSnapshot: 0,
      totalSnapshot: total,
      paidAmount,
      balanceDue,
      closedByUserId: existingAccount?.closedByUserId ?? null,
      closedAt: existingAccount?.closedAt ?? null,
      notes: existingAccount?.notes ?? null,
      snapshotJson: buildSnapshotJson(billingRecord.id, items.length, total),
      createdAt: existingAccount?.createdAt ?? now,
      updatedAt: now
    };
    await this.#repository.upsertFinancialAccount(account);

    if (existingReceivables.length === 0) {
      const receivable: EncounterReceivableRecord = {
        id: randomUUID(),
        accountId: encounter.accountId,
        encounterId: encounter.id,
        financialAccountId: account.id,
        installmentNumber: 1,
        installmentLabel: 'Parcela 1/1',
        dueAt: null,
        status: balanceDue <= 0 ? 'settled' : 'open',
        amountOriginal: total,
        amountPaid: Math.min(paidAmount, total),
        amountOutstanding: roundCurrency(Math.max(total - paidAmount, 0)),
        issuedAt: now,
        settledAt: balanceDue <= 0 ? now : null,
        notes: null,
        createdAt: now,
        updatedAt: now
      };
      await this.#repository.replaceReceivables(account.id, [receivable]);
      return;
    }

    if (existingPayments.length === 0 && existingReceivables.length === 1) {
      const current = existingReceivables[0];
      await this.#repository.updateReceivable({
        ...current,
        amountOriginal: total,
        amountPaid: 0,
        amountOutstanding: total,
        status: total === 0 ? 'settled' : 'open',
        settledAt: total === 0 ? now : null,
        updatedAt: now
      });
    }
  }

  public async getSummary(encounterId: EncounterId) {
    await this.syncEncounter(encounterId);
    const encounter = this.#encounters.getOrThrow(encounterId);
    const patient = this.#patients.getOrThrow(encounter.patientId);
    const owner = this.#owners.getOrThrow(encounter.ownerId);
    const account = await this.#repository.findFinancialAccountByEncounter(encounterId);
    if (!account) {
      throw new NotFoundError('Encounter financial account not found', { encounterId });
    }
    const receivables = await this.#repository.listReceivablesByFinancialAccount(account.id);
    const payments = await this.#repository.listPaymentsByFinancialAccount(account.id);

    return {
      encounterId,
      accountId: account.accountId,
      encounterStatus: encounter.status === 'closed' ? 'closed' : 'open',
      patientId: patient.id,
      patientName: patient.name,
      patientSpecies: patient.species ?? null,
      ownerId: owner.id,
      ownerName: owner.fullName,
      ownerPhoneMain:
        owner.contacts.find((contact) => contact.primary)?.value ??
        owner.contacts[0]?.value ??
        null,
      financialStatus: account.financialStatus,
      financialClosed: account.closedAt !== null,
      subtotal: account.subtotalSnapshot,
      discountTotal: account.discountTotalSnapshot,
      total: account.totalSnapshot,
      paidAmount: account.paidAmount,
      balanceDue: account.balanceDue,
      closedAt: account.closedAt,
      closedByUserId: account.closedByUserId,
      notes: account.notes,
      receivable: receivables[0] ? attachPayments(receivables[0], payments) : null,
      receivables: receivables.map((receivable) => attachPayments(receivable, payments)),
      payments: payments.map((payment) => ({
        id: payment.id,
        receivableId: payment.receivableId,
        financialAccountId: payment.financialAccountId,
        encounterId: payment.encounterId,
        amountPaid: payment.amountPaid,
        paidAt: payment.paidAt,
        paidByUserId: payment.paidByUserId,
        externalReferenceType: payment.externalReferenceType,
        externalReferenceId: payment.externalReferenceId,
        notes: payment.notes
      }))
    };
  }

  public async closeEncounterFinancial(
    encounterId: EncounterId,
    actorUserId: UserId,
    input: CloseEncounterFinancialInput
  ) {
    await this.syncEncounter(encounterId);
    const account = await this.#repository.findFinancialAccountByEncounter(encounterId);
    if (!account) {
      throw new NotFoundError('Encounter financial account not found', { encounterId });
    }
    const existingPayments = await this.#repository.listPaymentsByFinancialAccount(account.id);
    if (existingPayments.length > 0 && input.installments && input.installments.length > 0) {
      throw new ConflictError(
        'Cannot redefine receivable installments after payments have already been recorded'
      );
    }

    const total = account.totalSnapshot;
    const existingReceivables = await this.#repository.listReceivablesByFinancialAccount(
      account.id
    );
    const hasReversedCashReceipt = this.#repository.hasReversedCashReceiptForFinancialAccount
      ? await this.#repository.hasReversedCashReceiptForFinancialAccount(account.id)
      : false;
    const installments =
      input.installments && input.installments.length > 0
        ? input.installments
        : [{ amount: total, label: 'Parcela 1/1', dueAt: null, notes: input.notes ?? null }];
    const sumInstallments = roundCurrency(
      installments.reduce((sum, installment) => sum + installment.amount, 0)
    );
    if (sumInstallments !== roundCurrency(total)) {
      throw new ConflictError('Installment total must match encounter financial total', {
        total,
        installmentsTotal: sumInstallments
      });
    }

    if (existingPayments.length === 0) {
      const now = nowIso();
      if (hasReversedCashReceipt) {
        const installment = installments[0];
        const existing = existingReceivables[0];
        if (
          installments.length !== 1 ||
          !installment ||
          !existing ||
          roundCurrency(installment.amount) !== roundCurrency(total)
        ) {
          throw new ConflictError(
            'A cash-receipt reversal preserves its original receivable; a new installment schedule cannot replace it'
          );
        }
        await this.#repository.updateReceivable({
          ...existing,
          installmentLabel: installment.label?.trim() || existing.installmentLabel,
          dueAt: installment.dueAt ?? existing.dueAt,
          notes: installment.notes?.trim() ?? existing.notes,
          updatedAt: now
        });
      } else {
        const receivables: EncounterReceivableRecord[] = installments.map((installment, index) => ({
          id: randomUUID(),
          accountId: account.accountId,
          encounterId,
          financialAccountId: account.id,
          installmentNumber: index + 1,
          installmentLabel:
            installment.label?.trim() || `Parcela ${index + 1}/${installments.length}`,
          dueAt: installment.dueAt ?? null,
          status: 'open',
          amountOriginal: roundCurrency(installment.amount),
          amountPaid: 0,
          amountOutstanding: roundCurrency(installment.amount),
          issuedAt: now,
          settledAt: null,
          notes: installment.notes?.trim() ?? null,
          createdAt: now,
          updatedAt: now
        }));
        await this.#repository.replaceReceivables(account.id, receivables);
      }
    }

    await this.#repository.upsertFinancialAccount({
      ...account,
      closedAt: nowIso(),
      closedByUserId: actorUserId,
      notes: input.notes?.trim() ?? account.notes,
      updatedAt: nowIso()
    });

    if (input.paidAmount && input.paidAmount > 0) {
      await this.recordPaymentForEncounter(encounterId, {
        amountPaid: input.paidAmount,
        notes: input.notes ?? 'Settlement captured during financial close',
        paidByUserId: actorUserId
      });
    }

    return this.getSummary(encounterId);
  }

  public async settleReceivable(receivableId: string, input: SettleEncounterReceivableInput) {
    const receivable = await this.#repository.findReceivableById(receivableId);
    if (!receivable) {
      throw new NotFoundError('Encounter receivable not found', { receivableId });
    }
    const amountPaid = roundCurrency(input.amountPaid);
    if (amountPaid <= 0) {
      throw new ConflictError('amountPaid must be greater than zero');
    }
    if (amountPaid > receivable.amountOutstanding) {
      throw new ConflictError('Payment exceeds outstanding receivable balance', {
        receivableId,
        amountPaid,
        outstandingAmount: receivable.amountOutstanding
      });
    }
    await this.#applyPayment(receivable.encounterId, receivable.financialAccountId, [
      {
        receivableId,
        amountPaid,
        notes: input.notes ?? null,
        paidByUserId: input.paidByUserId ?? null,
        externalReferenceType: input.externalReferenceType ?? null,
        externalReferenceId: input.externalReferenceId ?? null
      }
    ]);
    const updated = await this.#repository.findReceivableById(receivableId);
    if (!updated) {
      throw new NotFoundError('Encounter receivable not found after settlement', { receivableId });
    }
    const payments = await this.#repository.listPaymentsByFinancialAccount(
      updated.financialAccountId
    );
    return attachPayments(updated, payments);
  }

  public async recordPaymentForBillingRecord(
    accountId: AccountId,
    billingRecordId: BillingRecordId,
    input: SettleEncounterReceivableInput
  ) {
    const billingRecord = this.#billing.getOrThrow(accountId, billingRecordId);
    return this.recordPaymentForEncounter(billingRecord.encounterId, input);
  }

  public async recordPaymentForEncounter(
    encounterId: EncounterId,
    input: SettleEncounterReceivableInput
  ) {
    await this.syncEncounter(encounterId);
    const account = await this.#repository.findFinancialAccountByEncounter(encounterId);
    if (!account) {
      throw new NotFoundError('Encounter financial account not found', { encounterId });
    }
    const receivables = await this.#repository.listReceivablesByFinancialAccount(account.id);
    const openReceivables = receivables
      .filter((receivable) => receivable.amountOutstanding > 0)
      .sort((left, right) => left.installmentNumber - right.installmentNumber);
    const totalOutstanding = roundCurrency(
      openReceivables.reduce((sum, receivable) => sum + receivable.amountOutstanding, 0)
    );
    const amountPaid = roundCurrency(input.amountPaid);
    if (amountPaid <= 0) {
      throw new ConflictError('amountPaid must be greater than zero');
    }
    if (amountPaid > totalOutstanding) {
      throw new ConflictError('Payment exceeds outstanding receivable balance', {
        encounterId,
        amountPaid,
        totalOutstanding
      });
    }

    const allocations: Array<{
      receivableId: string;
      amountPaid: number;
      notes: string | null;
      paidByUserId: UserId | null;
      externalReferenceType: EncounterReceivablePaymentExternalReferenceType | null;
      externalReferenceId: string | null;
    }> = [];
    let remaining = amountPaid;
    for (const receivable of openReceivables) {
      if (remaining <= 0) break;
      const applied = roundCurrency(Math.min(receivable.amountOutstanding, remaining));
      if (applied > 0) {
        allocations.push({
          receivableId: receivable.id,
          amountPaid: applied,
          notes: input.notes?.trim() ?? null,
          paidByUserId: input.paidByUserId ?? null,
          externalReferenceType: input.externalReferenceType ?? null,
          externalReferenceId: input.externalReferenceId ?? null
        });
        remaining = roundCurrency(remaining - applied);
      }
    }

    await this.#applyPayment(encounterId, account.id, allocations);
    return this.getSummary(encounterId);
  }

  public async listReceivables(params: {
    readonly accountId: AccountId;
    readonly status?: EncounterReceivableStatus;
    readonly encounterId?: EncounterId;
    readonly search?: string;
    readonly page?: number;
    readonly pageSize?: number;
  }) {
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.max(1, Math.min(100, params.pageSize ?? 20));
    const search = params.search?.trim().toLowerCase();
    const receivables = await this.#repository.listReceivables({
      accountId: params.accountId,
      status: params.status,
      encounterId: params.encounterId
    });

    const data = [];
    const resolveOrSkipMissing = <T>(resolve: () => T): T | null => {
      try {
        return resolve();
      } catch (error) {
        if (error instanceof NotFoundError) {
          return null;
        }
        throw error;
      }
    };

    for (const receivable of receivables) {
      const encounter = resolveOrSkipMissing(() =>
        this.#encounters.getOrThrow(receivable.encounterId)
      );
      if (!encounter) continue;
      const patient = resolveOrSkipMissing(() => this.#patients.getOrThrow(encounter.patientId));
      if (!patient) continue;
      const owner = resolveOrSkipMissing(() => this.#owners.getOrThrow(encounter.ownerId));
      if (!owner) continue;
      const account = await this.#repository.findFinancialAccountByEncounter(
        receivable.encounterId
      );
      if (!account) continue;
      const row = {
        ...attachPayments(
          receivable,
          await this.#repository.listPaymentsByFinancialAccount(receivable.financialAccountId)
        ),
        encounterStatus: encounter.status === 'closed' ? 'closed' : 'open',
        patientId: patient.id,
        patientName: patient.name,
        patientSpecies: patient.species ?? null,
        ownerId: owner.id,
        ownerName: owner.fullName,
        ownerPhoneMain:
          owner.contacts.find((contact) => contact.primary)?.value ??
          owner.contacts[0]?.value ??
          null,
        financialStatus: account.financialStatus,
        totalAmount: account.totalSnapshot,
        lastClosedAt: account.closedAt
      };
      if (search) {
        const haystack = [row.patientName, row.ownerName, row.installmentLabel, row.notes ?? '']
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(search)) {
          continue;
        }
      }
      data.push(row);
    }

    const total = data.length;
    const paged = data.slice((page - 1) * pageSize, page * pageSize);
    const openCount = data.filter((item) => item.status === 'open').length;
    const settledCount = data.filter((item) => item.status === 'settled').length;
    const totalOutstanding = roundCurrency(
      data.reduce((sum, item) => sum + item.amountOutstanding, 0)
    );
    const totalSettled = roundCurrency(data.reduce((sum, item) => sum + item.amountPaid, 0));

    return {
      data: paged,
      page,
      pageSize,
      total,
      openCount,
      settledCount,
      totalOutstanding,
      totalSettled
    };
  }

  async #applyPayment(
    encounterId: EncounterId,
    financialAccountId: string,
    allocations: Array<{
      receivableId: string;
      amountPaid: number;
      notes: string | null;
      paidByUserId: UserId | null;
      externalReferenceType: EncounterReceivablePaymentExternalReferenceType | null;
      externalReferenceId: string | null;
    }>
  ): Promise<void> {
    const initialAccount = await this.#repository.findFinancialAccountByEncounter(encounterId);
    if (!initialAccount) {
      throw new NotFoundError('Encounter financial account not found', { encounterId });
    }
    const execute = async (): Promise<void> => {
      const account = this.#repository.findFinancialAccountByEncounterForUpdate
        ? await this.#repository.findFinancialAccountByEncounterForUpdate(encounterId)
        : initialAccount;
      if (!account) {
        throw new NotFoundError('Encounter financial account not found', { encounterId });
      }
      const now = nowIso();
      for (const allocation of allocations) {
        const receivable = this.#repository.findReceivableByIdForUpdate
          ? await this.#repository.findReceivableByIdForUpdate(allocation.receivableId)
          : await this.#repository.findReceivableById(allocation.receivableId);
        if (!receivable || receivable.accountId !== account.accountId) {
          throw new NotFoundError('Encounter receivable not found', {
            receivableId: allocation.receivableId
          });
        }
        if (allocation.amountPaid <= 0 || allocation.amountPaid > receivable.amountOutstanding) {
          throw new ConflictError('Payment exceeds outstanding receivable balance', {
            receivableId: allocation.receivableId,
            amountPaid: allocation.amountPaid,
            outstandingAmount: receivable.amountOutstanding
          });
        }
        const nextPaid = roundCurrency(receivable.amountPaid + allocation.amountPaid);
        const nextOutstanding = roundCurrency(Math.max(receivable.amountOriginal - nextPaid, 0));
        const updatedReceivable: EncounterReceivableRecord = {
          ...receivable,
          amountPaid: nextPaid,
          amountOutstanding: nextOutstanding,
          status: nextOutstanding <= 0 ? 'settled' : 'open',
          settledAt: nextOutstanding <= 0 ? now : receivable.settledAt,
          updatedAt: now
        };
        await this.#repository.updateReceivable(updatedReceivable);

        const payment: EncounterReceivablePaymentRecord = {
          id: randomUUID(),
          accountId: account.accountId,
          encounterId,
          financialAccountId,
          receivableId: receivable.id,
          amountPaid: allocation.amountPaid,
          paidAt: now,
          paidByUserId: allocation.paidByUserId,
          externalReferenceType: allocation.externalReferenceType,
          externalReferenceId: allocation.externalReferenceId,
          notes: allocation.notes,
          createdAt: now
        };
        await this.#repository.createPayment(payment);
        await this.#onReceivablePaid?.(payment);
      }

      const receivables =
        await this.#repository.listReceivablesByFinancialAccount(financialAccountId);
      const totalAmount = roundCurrency(
        receivables.reduce((sum, receivable) => sum + receivable.amountOriginal, 0)
      );
      const totalPaid = roundCurrency(
        receivables.reduce((sum, receivable) => sum + receivable.amountPaid, 0)
      );
      const totalOutstanding = roundCurrency(
        receivables.reduce((sum, receivable) => sum + receivable.amountOutstanding, 0)
      );

      await this.#repository.upsertFinancialAccount({
        ...account,
        totalSnapshot: totalAmount,
        subtotalSnapshot: totalAmount,
        paidAmount: totalPaid,
        balanceDue: totalOutstanding,
        financialStatus: deriveFinancialStatus(totalOutstanding, totalPaid, totalAmount),
        updatedAt: now
      });
    };
    if (this.#repository.withTransaction) {
      await this.#repository.withTransaction(initialAccount.accountId, execute);
    } else {
      await execute();
    }
  }
}

export {
  DatabaseEncounterFinancialRepository,
  DatabaseFinancialPayablesRepository
} from './repositories/database-financial.repository.js';
export {
  DatabaseAdvancePaymentsReportSource,
  MAX_ADVANCE_PAYMENT_REPORT_ROWS
} from './advance-payments-report.js';
export type {
  AdvancePaymentReportRow,
  AdvancePaymentReportStatus,
  AdvancePaymentsReportFilters,
  AdvancePaymentsReportSource
} from './advance-payments-report.js';
export {
  DatabaseFinancialReceivablesReportSource,
  MAX_FINANCIAL_RECEIVABLE_REPORT_ROWS
} from './receivables-report.js';
export type {
  FinancialReceivableReportFinancialStatus,
  FinancialReceivablesReportFilters,
  FinancialReceivablesReportRow,
  FinancialReceivablesReportSource,
  FinancialReceivablesReportStatus
} from './receivables-report.js';
export {
  DatabaseFinanceCatalogReportSource,
  MAX_FINANCE_CATALOG_REPORT_ROWS
} from './finance-catalog-report.js';
export type {
  FinanceCatalogReportFilters,
  FinanceCatalogReportRow,
  FinanceCatalogReportSource
} from './finance-catalog-report.js';
