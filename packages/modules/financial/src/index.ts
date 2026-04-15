import type { BillingService } from '@cvg-his-v2/module-billing';
import type { EncountersService } from '@cvg-his-v2/module-encounters';
import type { OwnersService } from '@cvg-his-v2/module-owners';
import type { PatientsService } from '@cvg-his-v2/module-patients';
import { ConflictError, NotFoundError } from '@cvg-his-v2/shared-errors';
import type {
  AccountId,
  BillingRecordId,
  EncounterId,
  UserId
} from '@cvg-his-v2/shared-types';
import { createCorrelationId, nowIso } from '@cvg-his-v2/shared-utils';

export type EncounterFinancialStatus = 'pending' | 'partial' | 'paid';
export type EncounterReceivableStatus = 'open' | 'settled';
export type EncounterReceivablePaymentExternalReferenceType =
  | 'pix_transaction'
  | 'cash_movement'
  | 'billing_record'
  | 'other';

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

export interface EncounterFinancialServiceOptions {
  readonly repository: EncounterFinancialRepository;
  readonly onReceivablePaid?: (payment: EncounterReceivablePaymentRecord) => Promise<void>;
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
    const billingRecord = await this.#billing.getByEncounterOrThrow(encounterId);
    const items = await this.#billing.listItems(encounterId);
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
      id: existingAccount?.id ?? createCorrelationId('efa'),
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
        id: createCorrelationId('er'),
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
        owner.contacts.find((contact) => contact.primary)?.value
        ?? owner.contacts[0]?.value
        ?? null,
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
      const receivables: EncounterReceivableRecord[] = installments.map((installment, index) => ({
        id: createCorrelationId('er'),
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
    await this.#applyPayment(receivable.encounterId, receivable.financialAccountId, [
      {
        receivableId,
        amountPaid: input.amountPaid,
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
    billingRecordId: BillingRecordId,
    input: SettleEncounterReceivableInput
  ) {
    const billingRecord = this.#billing.getOrThrow(billingRecordId);
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
    for (const receivable of receivables) {
      const encounter = this.#encounters.getOrThrow(receivable.encounterId);
      const patient = this.#patients.getOrThrow(encounter.patientId);
      const owner = this.#owners.getOrThrow(encounter.ownerId);
      const account = await this.#repository.findFinancialAccountByEncounter(receivable.encounterId);
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
          owner.contacts.find((contact) => contact.primary)?.value
          ?? owner.contacts[0]?.value
          ?? null,
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
    const account = await this.#repository.findFinancialAccountByEncounter(encounterId);
    if (!account) {
      throw new NotFoundError('Encounter financial account not found', { encounterId });
    }
    const now = nowIso();
    for (const allocation of allocations) {
      const receivable = await this.#repository.findReceivableById(allocation.receivableId);
      if (!receivable) {
        throw new NotFoundError('Encounter receivable not found', {
          receivableId: allocation.receivableId
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
        id: createCorrelationId('erp'),
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

    const receivables = await this.#repository.listReceivablesByFinancialAccount(financialAccountId);
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
  }
}

export { DatabaseEncounterFinancialRepository } from './repositories/database-financial.repository.js';
