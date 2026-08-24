import { getPool, withTenantTransaction } from '@cvg-his-v2/shared-database';
import { ConflictError, NotFoundError, ValidationError } from '@cvg-his-v2/shared-errors';
import type { AccountId, UserId } from '@cvg-his-v2/shared-types';
import { createCorrelationId, nowIso } from '@cvg-his-v2/shared-utils';
import { withTenantQuery } from '@cvg-his-v2/tenant-context';

export type CommissionRuleScope = 'global' | 'department' | 'job_title' | 'staff';
export type CommissionItemKind = 'service' | 'product' | 'procedure' | 'exam' | 'other';
export type CommissionCalculationStatus = 'draft' | 'reviewed' | 'paid' | 'cancelled';
export type CommissionSourceType = 'billing_item' | 'counter_sale_item' | 'package_consumption' | 'manual';
export type CommissionPayableStatus = 'open' | 'partial' | 'paid' | 'cancelled';

export interface CommissionStaffAuthorityRecord {
  readonly id: string;
  readonly accountId: AccountId;
  readonly fullName: string;
  readonly department: string | null;
  readonly jobTitle: string | null;
  readonly isActive: boolean;
  readonly professionId: string | null;
  readonly professionName: string | null;
  readonly professionIsActive: boolean | null;
}

export interface CommissionBillingItemAuthorityRecord {
  readonly id: string;
  readonly accountId: AccountId;
  readonly status: 'draft' | 'estimated' | 'open' | 'settled';
  readonly itemKind: CommissionItemKind;
  readonly description: string;
  readonly baseAmount: number;
  readonly occurredAt: string;
}

/**
 * Resolves commission inputs from persisted, tenant-scoped sources.
 * Client-provided display values are never authoritative.
 */
export interface CommissionSourceAuthority {
  findStaff(accountId: AccountId, staffId: string): Promise<CommissionStaffAuthorityRecord | null>;
  findBillingItem(accountId: AccountId, billingItemId: string): Promise<CommissionBillingItemAuthorityRecord | null>;
}

export interface CommissionRuleSummary {
  readonly id: string;
  readonly accountId: AccountId;
  readonly description: string;
  readonly scope: CommissionRuleScope;
  readonly staffId: string | null;
  readonly department: string | null;
  readonly jobTitle: string | null;
  readonly itemKind: CommissionItemKind | 'any';
  readonly percentage: number;
  readonly isActive: boolean;
  readonly createdByUserId: UserId;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CommissionSourceLineInput {
  readonly staffId: string;
  readonly staffName: string;
  readonly department?: string | null;
  readonly jobTitle?: string | null;
  readonly itemKind: CommissionItemKind;
  readonly sourceType: CommissionSourceType;
  readonly sourceId: string;
  readonly sourceDescription: string;
  readonly baseAmount: number;
  readonly occurredAt: string;
}

export interface CommissionLineSummary extends CommissionSourceLineInput {
  readonly id: string;
  readonly accountId: AccountId;
  readonly calculationId: string;
  readonly ruleId: string | null;
  readonly professionId: string | null;
  readonly professionName: string | null;
  readonly percentage: number;
  readonly commissionAmount: number;
}

export interface CommissionCalculationSummary {
  readonly id: string;
  readonly accountId: AccountId;
  readonly number: string;
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly status: CommissionCalculationStatus;
  readonly totalBaseAmount: number;
  readonly totalCommissionAmount: number;
  readonly createdByUserId: UserId;
  readonly reviewedByUserId: UserId | null;
  readonly paidByUserId: UserId | null;
  readonly cancelledByUserId: UserId | null;
  readonly payableId: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly reviewedAt: string | null;
  readonly paidAt: string | null;
  readonly cancelledAt: string | null;
  readonly notes: string | null;
}

export interface CommissionCalculationDetail extends CommissionCalculationSummary {
  readonly lines: readonly CommissionLineSummary[];
}

export interface CommissionPayableReference {
  readonly id: string;
  readonly accountId: AccountId;
  readonly status: CommissionPayableStatus;
}

export interface CreateCommissionRuleInput {
  readonly description: string;
  readonly scope?: CommissionRuleScope;
  readonly staffId?: string | null;
  readonly department?: string | null;
  readonly jobTitle?: string | null;
  readonly itemKind?: CommissionItemKind | 'any';
  readonly percentage: number;
  readonly isActive?: boolean;
}

export interface CalculateCommissionsInput {
  readonly periodStart: string;
  readonly periodEnd: string;
  readonly lines: readonly CommissionSourceLineInput[];
  readonly notes?: string | null;
}

export interface CommissionRepository {
  saveRule(rule: CommissionRuleSummary): Promise<void>;
  saveCalculation(calculation: CommissionCalculationSummary): Promise<void>;
  updateCalculation(calculation: CommissionCalculationSummary): Promise<void>;
  saveLine(line: CommissionLineSummary): Promise<void>;
  findRules(accountId: AccountId): Promise<readonly CommissionRuleSummary[]>;
  findCalculations(accountId: AccountId): Promise<readonly CommissionCalculationSummary[]>;
  findLines(accountId: AccountId): Promise<readonly CommissionLineSummary[]>;
  findLineBySource?(
    accountId: AccountId,
    sourceType: CommissionSourceType,
    sourceId: string
  ): Promise<CommissionLineSummary | null>;
  /**
   * Holds the calculation row lock for the complete payment transition.
   * Database implementations must execute the callback in the same transaction
   * as the SELECT ... FOR UPDATE so payable creation and payment cannot race.
   */
  withCalculationLock?<T>(
    accountId: AccountId,
    calculationId: string,
    operation: (calculation: CommissionCalculationSummary | null) => Promise<T>
  ): Promise<T>;
  findPayableBySourceExpense?(
    accountId: AccountId,
    sourceExpenseId: string
  ): Promise<CommissionPayableReference | null>;
  /**
   * Runs payable creation in a savepoint so a raced unique violation can be
   * recovered by reading the winner in the surrounding tenant transaction.
   */
  withPayableCreateSavepoint?<T>(
    accountId: AccountId,
    operation: () => Promise<T>
  ): Promise<T>;
}

export interface CommissionsServiceOptions {
  readonly repository?: CommissionRepository;
  readonly payableGateway?: CommissionPayableGateway;
  readonly sourceAuthority?: CommissionSourceAuthority;
  readonly requireAuthoritativeSources?: boolean;
  /**
   * Executes compound commission mutations in the caller's tenant transaction.
   * Database adapters already reuse an active tenant transaction scope.
   */
  readonly transaction?: <T>(accountId: AccountId, operation: () => Promise<T>) => Promise<T>;
}

export type CommissionPaymentMethod = 'cash' | 'bank_transfer' | 'pix' | 'card' | 'cheque' | 'other';

export interface CommissionPayableGateway {
  createPayable(
    accountId: AccountId,
    createdByUserId: UserId,
    input: {
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
  ): Promise<{ readonly id: string }>;
  payPayable(
    accountId: AccountId,
    paidByUserId: UserId,
    payableId: string,
    input: {
      readonly amountPaid: number;
      readonly paymentMethod?: CommissionPaymentMethod | null;
      readonly paymentReference?: string | null;
      readonly notes?: string | null;
    }
  ): Promise<unknown>;
}

export interface MarkCommissionPaidInput {
  readonly paymentMethod?: CommissionPaymentMethod | null;
  readonly paymentReference?: string | null;
}

interface ResolvedCommissionSourceLine extends CommissionSourceLineInput {
  readonly professionId?: string | null;
  readonly professionName?: string | null;
}

export class CommissionsService {
  readonly #repository?: CommissionRepository;
  readonly #payableGateway?: CommissionPayableGateway;
  readonly #sourceAuthority?: CommissionSourceAuthority;
  readonly #requiresAuthoritativeSources: boolean;
  readonly #requiresPayableGateway: boolean;
  readonly #transaction?: <T>(accountId: AccountId, operation: () => Promise<T>) => Promise<T>;
  readonly #rules = new Map<string, CommissionRuleSummary>();
  readonly #calculations = new Map<string, CommissionCalculationSummary>();
  readonly #lines = new Map<string, CommissionLineSummary>();
  readonly #paymentLocks = new Map<string, Promise<void>>();
  #numberCounter = 0;

  public constructor(options?: CommissionsServiceOptions) {
    this.#repository = options?.repository;
    this.#payableGateway = options?.payableGateway;
    this.#sourceAuthority = options?.sourceAuthority ?? (options?.repository ? new DatabaseCommissionSourceAuthority() : undefined);
    this.#requiresAuthoritativeSources = options?.requireAuthoritativeSources
      ?? Boolean(options?.repository || options?.sourceAuthority);
    this.#requiresPayableGateway = Boolean(
      options?.repository || options?.sourceAuthority || options?.requireAuthoritativeSources
    );
    this.#transaction = options?.transaction;
  }

  public get persistenceMode(): 'database' | 'in-memory' {
    return this.#repository ? 'database' : 'in-memory';
  }

  public async hydrateFromDatabase(accountId: AccountId): Promise<void> {
    if (!this.#repository) return;
    const [rules, calculations, lines] = await Promise.all([
      this.#repository.findRules(accountId),
      this.#repository.findCalculations(accountId),
      this.#repository.findLines(accountId)
    ]);
    for (const rule of rules) this.#rules.set(rule.id, rule);
    for (const calculation of calculations) {
      this.#calculations.set(calculation.id, calculation);
      this.#numberCounter = Math.max(this.#numberCounter, commissionNumberCounter(calculation.number));
    }
    for (const line of lines) this.#lines.set(line.id, line);
  }

  public async createRule(
    accountId: AccountId,
    createdByUserId: UserId,
    input: CreateCommissionRuleInput
  ): Promise<CommissionRuleSummary> {
    return this.#runInTransaction(accountId, async () => {
      const scope = input.scope ?? inferRuleScope(input);
      validateRuleScope(scope, input);
      const staffId = normalizeOptional(input.staffId);
      if (scope === 'staff' && staffId && this.#requiresAuthoritativeSources) {
        await this.#assertEligibleStaff(accountId, staffId);
      }
      const now = nowIso();
      const rule: CommissionRuleSummary = {
        id: createCorrelationId('comm_rule'),
        accountId,
        description: requireTrimmed(input.description, 'description'),
        scope,
        staffId,
        department: normalizeOptional(input.department),
        jobTitle: normalizeOptional(input.jobTitle),
        itemKind: input.itemKind ?? 'any',
        percentage: requirePercentage(input.percentage),
        isActive: input.isActive ?? true,
        createdByUserId,
        createdAt: now,
        updatedAt: now
      };
      this.#rules.set(rule.id, rule);
      await this.#repository?.saveRule(rule);
      return rule;
    });
  }

  public listRules(accountId: AccountId, filters?: { active?: boolean }): readonly CommissionRuleSummary[] {
    return [...this.#rules.values()]
      .filter((rule) => rule.accountId === accountId)
      .filter((rule) => filters?.active === undefined || rule.isActive === filters.active)
      .sort((left, right) => ruleSpecificity(right) - ruleSpecificity(left) || left.description.localeCompare(right.description));
  }

  public async calculate(
    accountId: AccountId,
    createdByUserId: UserId,
    input: CalculateCommissionsInput
  ): Promise<CommissionCalculationDetail> {
    return this.#runInTransaction(accountId, async () => {
      const periodStart = normalizeDate(input.periodStart, 'periodStart');
      const periodEnd = normalizeDate(input.periodEnd, 'periodEnd');
      if (periodStart > periodEnd) {
        throw new ValidationError('periodStart must be before or equal to periodEnd', { periodStart, periodEnd });
      }

      if (!Array.isArray(input.lines)) {
        throw new ValidationError('lines must be an array');
      }

      const resolvedLines = await Promise.all(
        input.lines.map((line) => this.#resolveSourceLine(accountId, line))
      );
      const linesWithinPeriod = resolvedLines.filter((line) =>
        isWithinPeriod(normalizeDate(line.occurredAt, 'occurredAt'), periodStart, periodEnd)
      );
      await this.#assertNoDuplicateSources(accountId, linesWithinPeriod);

      const now = nowIso();
      const calculation: CommissionCalculationSummary = {
        id: createCorrelationId('comm_calc'),
        accountId,
        number: this.#nextNumber(),
        periodStart,
        periodEnd,
        status: 'draft',
        totalBaseAmount: 0,
        totalCommissionAmount: 0,
        createdByUserId,
        reviewedByUserId: null,
        paidByUserId: null,
        cancelledByUserId: null,
        payableId: null,
        createdAt: now,
        updatedAt: now,
        reviewedAt: null,
        paidAt: null,
        cancelledAt: null,
        notes: normalizeOptional(input.notes)
      };
      this.#calculations.set(calculation.id, calculation);
      await this.#repository?.saveCalculation(calculation);

      const lines = linesWithinPeriod.map((line) => this.#calculateLine(accountId, calculation.id, line));

      for (const line of lines) {
        this.#lines.set(line.id, line);
        try {
          await this.#repository?.saveLine(line);
        } catch (error) {
          if (line.sourceType === 'billing_item' && isUniqueViolation(error)) {
            throw new ConflictError('Billing item has already been used in a commission calculation', {
              sourceId: line.sourceId
            });
          }
          throw error;
        }
      }

      const completed = this.#replaceCalculation(calculation, {
        totalBaseAmount: roundMoney(lines.reduce((total, line) => total + line.baseAmount, 0)),
        totalCommissionAmount: roundMoney(lines.reduce((total, line) => total + line.commissionAmount, 0))
      });
      await this.#repository?.updateCalculation(completed);
      return this.detail(accountId, completed.id);
    });
  }

  public async review(accountId: AccountId, calculationId: string, reviewedByUserId: UserId): Promise<CommissionCalculationDetail> {
    return this.#runInTransaction(accountId, async () => {
      const calculation = this.#getCalculation(accountId, calculationId);
      if (calculation.status !== 'draft') {
        throw new ConflictError('Only draft commission calculations can be reviewed', {
          calculationId,
          status: calculation.status
        });
      }
      const reviewed = this.#replaceCalculation(calculation, {
        status: 'reviewed',
        reviewedByUserId,
        reviewedAt: nowIso()
      });
      await this.#repository?.updateCalculation(reviewed);
      return this.detail(accountId, reviewed.id);
    });
  }

  public async markPaid(
    accountId: AccountId,
    calculationId: string,
    paidByUserId: UserId,
    input: MarkCommissionPaidInput = {}
  ): Promise<CommissionCalculationDetail> {
    return this.#withPaymentLock(accountId, calculationId, () =>
      this.#runInTransaction(accountId, async () => {
        const markLockedCalculation = async (lockedCalculation?: CommissionCalculationSummary | null) => {
          const calculation = lockedCalculation === undefined
            ? this.#getCalculation(accountId, calculationId)
            : lockedCalculation;
          if (!calculation || calculation.accountId !== accountId || calculation.id !== calculationId) {
            throw new NotFoundError('Commission calculation not found', { calculationId });
          }
          this.#calculations.set(calculation.id, calculation);
          return this.#markPaidLocked(accountId, calculation, paidByUserId, input);
        };

        return this.#repository?.withCalculationLock
          ? this.#repository.withCalculationLock(accountId, calculationId, markLockedCalculation)
          : markLockedCalculation();
      })
    );
  }

  public async cancel(accountId: AccountId, calculationId: string, cancelledByUserId: UserId): Promise<CommissionCalculationDetail> {
    return this.#runInTransaction(accountId, async () => {
      const calculation = this.#getCalculation(accountId, calculationId);
      if (calculation.status === 'paid') {
        throw new ConflictError('Paid commission calculations cannot be cancelled', { calculationId });
      }
      const cancelled = this.#replaceCalculation(calculation, {
        status: 'cancelled',
        cancelledByUserId,
        cancelledAt: nowIso()
      });
      await this.#repository?.updateCalculation(cancelled);
      return this.detail(accountId, cancelled.id);
    });
  }

  public listCalculations(accountId: AccountId): readonly CommissionCalculationDetail[] {
    return [...this.#calculations.values()]
      .filter((calculation) => calculation.accountId === accountId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .map((calculation) => this.detail(accountId, calculation.id));
  }

  public detail(accountId: AccountId, calculationId: string): CommissionCalculationDetail {
    const calculation = this.#getCalculation(accountId, calculationId);
    const lines = [...this.#lines.values()]
      .filter((line) => line.accountId === accountId && line.calculationId === calculationId)
      .sort((left, right) => left.staffName.localeCompare(right.staffName) || left.sourceDescription.localeCompare(right.sourceDescription));
    return {
      ...calculation,
      lines
    };
  }

  #calculateLine(
    accountId: AccountId,
    calculationId: string,
    input: ResolvedCommissionSourceLine
  ): CommissionLineSummary {
    const occurredAt = normalizeDate(input.occurredAt, 'occurredAt');
    const baseAmount = requireMoney(input.baseAmount, 'baseAmount');
    const normalized: CommissionSourceLineInput = {
      ...input,
      staffId: requireTrimmed(input.staffId, 'staffId'),
      staffName: requireTrimmed(input.staffName, 'staffName'),
      department: normalizeOptional(input.department),
      jobTitle: normalizeOptional(input.jobTitle),
      itemKind: normalizeItemKind(input.itemKind),
      sourceId: requireTrimmed(input.sourceId, 'sourceId'),
      sourceDescription: requireTrimmed(input.sourceDescription, 'sourceDescription'),
      baseAmount,
      occurredAt
    };
    const rule = this.#matchRule(accountId, normalized);
    const percentage = rule?.percentage ?? 0;
    return {
      ...normalized,
      id: createCorrelationId('comm_line'),
      accountId,
      calculationId,
      ruleId: rule?.id ?? null,
      professionId: normalizeOptional(input.professionId),
      professionName: normalizeOptional(input.professionName),
      percentage,
      commissionAmount: roundMoney(baseAmount * percentage / 100)
    };
  }

  async #resolveSourceLine(
    accountId: AccountId,
    input: CommissionSourceLineInput
  ): Promise<ResolvedCommissionSourceLine> {
    if (!this.#requiresAuthoritativeSources) return { ...input };
    if (!this.#sourceAuthority) {
      throw new ValidationError('An authoritative commission source is required');
    }
    if (input.sourceType !== 'billing_item') {
      throw new ValidationError('Only settled billing items can generate authoritative commissions', {
        sourceType: input.sourceType
      });
    }

    const staffId = requireTrimmed(input.staffId, 'staffId');
    const sourceId = requireTrimmed(input.sourceId, 'sourceId');
    const staff = await this.#getEligibleStaff(accountId, staffId);
    const billingItem = await this.#sourceAuthority.findBillingItem(accountId, sourceId);
    if (!billingItem || billingItem.accountId !== accountId || billingItem.id !== sourceId) {
      throw new ValidationError('Billing item is not authoritative for this account', {
        sourceId
      });
    }
    if (billingItem.status !== 'settled') {
      throw new ConflictError('Commission source billing item must be settled before calculation', {
        sourceId,
        status: billingItem.status
      });
    }

    return {
      ...input,
      staffId: staff.id,
      staffName: staff.fullName,
      department: staff.department,
      jobTitle: staff.jobTitle,
      itemKind: billingItem.itemKind,
      sourceDescription: billingItem.description,
      baseAmount: billingItem.baseAmount,
      occurredAt: billingItem.occurredAt,
      professionId: staff.professionId,
      professionName: staff.professionName
    };
  }

  async #assertEligibleStaff(accountId: AccountId, staffId: string): Promise<void> {
    await this.#getEligibleStaff(accountId, staffId);
  }

  async #getEligibleStaff(accountId: AccountId, staffId: string): Promise<CommissionStaffAuthorityRecord> {
    if (!this.#sourceAuthority) {
      throw new ValidationError('An authoritative staff source is required', { staffId });
    }
    const staff = await this.#sourceAuthority.findStaff(accountId, staffId);
    if (!staff || staff.accountId !== accountId || staff.id !== staffId) {
      throw new ValidationError('Staff is not authoritative for this account', { staffId });
    }
    if (!staff.isActive) {
      throw new ConflictError('Staff must be active for commission calculation', { staffId });
    }
    if (!staff.professionId?.trim()) {
      throw new ConflictError('Staff profession is required for commission calculation', {
        staffId
      });
    }
    if (staff.professionIsActive !== true || !staff.professionName?.trim()) {
      throw new ConflictError('Staff profession must be active for commission calculation', {
        staffId,
        professionId: staff.professionId
      });
    }
    return staff;
  }

  async #assertNoDuplicateSources(
    accountId: AccountId,
    lines: readonly ResolvedCommissionSourceLine[]
  ): Promise<void> {
    const seen = new Set<string>();
    for (const line of lines) {
      if (line.sourceType !== 'billing_item') continue;
      const sourceId = requireTrimmed(line.sourceId, 'sourceId');
      const key = `${line.sourceType}:${sourceId}`;
      if (seen.has(key)) {
        throw new ConflictError('Billing item is duplicated in the commission calculation', {
          sourceId
        });
      }
      seen.add(key);

      const cached = [...this.#lines.values()].find((candidate) =>
        candidate.accountId === accountId &&
        candidate.sourceType === line.sourceType &&
        candidate.sourceId === sourceId
      );
      const persisted = cached ?? await this.#repository?.findLineBySource?.(accountId, line.sourceType, sourceId);
      if (persisted) {
        throw new ConflictError('Billing item has already been used in a commission calculation', {
          sourceId,
          calculationId: persisted.calculationId
        });
      }
    }
  }

  #matchRule(accountId: AccountId, line: CommissionSourceLineInput): CommissionRuleSummary | null {
    return this.listRules(accountId, { active: true })
      .filter((rule) => rule.itemKind === 'any' || rule.itemKind === line.itemKind)
      .find((rule) => ruleMatchesLine(rule, line)) ?? null;
  }

  #nextNumber(): string {
    this.#numberCounter++;
    return `COM-${String(this.#numberCounter).padStart(6, '0')}`;
  }

  #getCalculation(accountId: AccountId, calculationId: string): CommissionCalculationSummary {
    const calculation = this.#calculations.get(calculationId);
    if (!calculation || calculation.accountId !== accountId) {
      throw new NotFoundError('Commission calculation not found', { calculationId });
    }
    return calculation;
  }

  #replaceCalculation(
    calculation: CommissionCalculationSummary,
    patch: Partial<Omit<CommissionCalculationSummary, 'id' | 'accountId' | 'createdAt' | 'createdByUserId'>>
  ): CommissionCalculationSummary {
    const updated: CommissionCalculationSummary = {
      ...calculation,
      ...patch,
      updatedAt: nowIso()
    };
    this.#calculations.set(updated.id, updated);
    return updated;
  }

  async #markPaidLocked(
    accountId: AccountId,
    calculation: CommissionCalculationSummary,
    paidByUserId: UserId,
    input: MarkCommissionPaidInput
  ): Promise<CommissionCalculationDetail> {
    // A replay after the durable transition is a successful no-op. This check
    // intentionally precedes payment-input validation and gateway calls.
    if (calculation.status === 'paid') return this.detail(accountId, calculation.id);
    if (calculation.status !== 'reviewed') {
      throw new ConflictError('Only reviewed commission calculations can be paid', {
        calculationId: calculation.id,
        status: calculation.status
      });
    }

    if (this.#requiresPayableGateway && !this.#payableGateway) {
      throw new ValidationError('A payable gateway is required before paying commissions', {
        calculationId: calculation.id
      });
    }
    if (calculation.totalCommissionAmount <= 0) {
      throw new ValidationError('A commission calculation must have a positive payable amount', {
        calculationId: calculation.id
      });
    }

    let currentCalculation = calculation;
    let payableId = calculation.payableId;
    let payableStatus: CommissionPayableStatus | null = null;
    if (this.#payableGateway) {
      if (!input.paymentMethod) {
        throw new ValidationError('paymentMethod is required when commission payment is connected to finance');
      }

      const existingPayable = await this.#repository?.findPayableBySourceExpense?.(
        accountId,
        calculation.id
      );
      if (existingPayable) {
        if (payableId && payableId !== existingPayable.id) {
          throw new ConflictError('Commission calculation points to a different payable than its source expense', {
            calculationId: calculation.id,
            payableId,
            sourcePayableId: existingPayable.id
          });
        }
        payableId = existingPayable.id;
        payableStatus = existingPayable.status;
      }

      if (!payableId) {
        const issuedAt = nowIso().slice(0, 10);
        const dueAt = issuedAt > calculation.periodEnd ? issuedAt : calculation.periodEnd;
        const staffNames = [...new Set(
          this.detail(accountId, calculation.id).lines.map((line) => line.staffName.trim()).filter(Boolean)
        )];
        try {
          const createPayable = () => this.#payableGateway!.createPayable(accountId, paidByUserId, {
            supplierName: staffNames.length > 0 ? `Comissões: ${staffNames.join(', ')}` : 'Comissões de profissionais',
            description: `Pagamento da apuração ${calculation.number}`,
            category: 'comissoes',
            costCenterCode: '4.2.01-comissoes',
            costCenterName: 'Comissões de profissionais',
            issuedAt,
            dueAt,
            totalAmount: calculation.totalCommissionAmount,
            sourceExpenseId: calculation.id,
            notes: calculation.notes
          });
          const payable = this.#repository?.withPayableCreateSavepoint
            ? await this.#repository.withPayableCreateSavepoint(accountId, createPayable)
            : await createPayable();
          payableId = requireTrimmed(payable.id, 'payableId');
          payableStatus = 'open';
        } catch (error) {
          if (!isUniqueViolation(error)) throw error;
          const racedPayable = await this.#repository?.findPayableBySourceExpense?.(
            accountId,
            calculation.id
          );
          if (!racedPayable) throw error;
          payableId = racedPayable.id;
          payableStatus = racedPayable.status;
        }
      }

      if (!payableId) {
        throw new ValidationError('A payable id is required before paying commissions', {
          calculationId: calculation.id
        });
      }
      if (payableId !== currentCalculation.payableId) {
        currentCalculation = this.#replaceCalculation(currentCalculation, { payableId });
        await this.#repository?.updateCalculation(currentCalculation);
      }

      if (payableStatus !== 'paid') {
        await this.#payableGateway.payPayable(accountId, paidByUserId, payableId, {
          amountPaid: calculation.totalCommissionAmount,
          paymentMethod: input.paymentMethod,
          paymentReference: input.paymentReference ?? calculation.number,
          notes: `Pagamento da apuração ${calculation.number}`
        });
      }
    }

    const paid = this.#replaceCalculation(currentCalculation, {
      status: 'paid',
      paidByUserId,
      paidAt: nowIso(),
      payableId
    });
    await this.#repository?.updateCalculation(paid);
    return this.detail(accountId, paid.id);
  }

  async #withPaymentLock<T>(
    accountId: AccountId,
    calculationId: string,
    operation: () => Promise<T>
  ): Promise<T> {
    const key = `${accountId}:${calculationId}`;
    const previous = this.#paymentLocks.get(key) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    const queued = previous.then(() => current);
    this.#paymentLocks.set(key, queued);

    await previous;
    try {
      return await operation();
    } finally {
      release();
      if (this.#paymentLocks.get(key) === queued) this.#paymentLocks.delete(key);
    }
  }

  async #runInTransaction<T>(accountId: AccountId, operation: () => Promise<T>): Promise<T> {
    const rules = new Map(this.#rules);
    const calculations = new Map(this.#calculations);
    const lines = new Map(this.#lines);
    const numberCounter = this.#numberCounter;
    try {
      return await (this.#transaction
        ? this.#transaction(accountId, operation)
        : operation());
    } catch (error) {
      this.#rules.clear();
      for (const [id, rule] of rules) this.#rules.set(id, rule);
      this.#calculations.clear();
      for (const [id, calculation] of calculations) this.#calculations.set(id, calculation);
      this.#lines.clear();
      for (const [id, line] of lines) this.#lines.set(id, line);
      this.#numberCounter = numberCounter;
      throw error;
    }
  }
}

/* v8 ignore start -- SQL repository adapter covered by integration tests. */
export class DatabaseCommissionRepository implements CommissionRepository {
  async saveRule(rule: CommissionRuleSummary): Promise<void> {
    await withTenantQuery(getPool(), async (client) => {
      await client.query(
        `INSERT INTO commission_rules (
          id, account_id, description, scope, staff_id, department, job_title, item_kind,
          percentage, is_active, created_by_user_id, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        ruleParams(rule)
      );
    });
  }

  async saveCalculation(calculation: CommissionCalculationSummary): Promise<void> {
    await withTenantQuery(getPool(), async (client) => {
      await client.query(
        `INSERT INTO commission_calculations (
          id, account_id, calculation_number, period_start, period_end, status,
          total_base_amount, total_commission_amount, created_by_user_id, reviewed_by_user_id,
          paid_by_user_id, cancelled_by_user_id, created_at, updated_at, reviewed_at,
          paid_at, cancelled_at, notes, payable_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)`,
        calculationParams(calculation)
      );
    });
  }

  async updateCalculation(calculation: CommissionCalculationSummary): Promise<void> {
    await withTenantQuery(getPool(), async (client) => {
      await client.query(
        `UPDATE commission_calculations
         SET calculation_number = $3, period_start = $4, period_end = $5, status = $6,
             total_base_amount = $7, total_commission_amount = $8, created_by_user_id = $9,
             reviewed_by_user_id = $10, paid_by_user_id = $11, cancelled_by_user_id = $12,
             created_at = $13, updated_at = $14, reviewed_at = $15, paid_at = $16,
             cancelled_at = $17, notes = $18, payable_id = $19
         WHERE id = $1 AND account_id = $2`,
        calculationParams(calculation)
      );
    });
  }

  async withCalculationLock<T>(
    accountId: AccountId,
    calculationId: string,
    operation: (calculation: CommissionCalculationSummary | null) => Promise<T>
  ): Promise<T> {
    return withTenantTransaction(accountId, async () => {
      const result = await withTenantQuery(getPool(), async (client) => client.query(
        `SELECT *
           FROM commission_calculations
          WHERE account_id = $1 AND id = $2
          FOR UPDATE`,
        [accountId, calculationId]
      ));
      const row = result.rows[0] as Record<string, unknown> | undefined;
      return operation(row ? mapCalculation(row) : null);
    });
  }

  async saveLine(line: CommissionLineSummary): Promise<void> {
    await withTenantQuery(getPool(), async (client) => {
      await client.query(
        `INSERT INTO commission_lines (
          id, account_id, calculation_id, rule_id, staff_id, staff_name, department,
          job_title, profession_id, profession_name, item_kind, source_type, source_id,
          source_description, base_amount, percentage, commission_amount, occurred_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
        lineParams(line)
      );
    });
  }

  async findRules(accountId: AccountId): Promise<readonly CommissionRuleSummary[]> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query('SELECT * FROM commission_rules WHERE account_id = $1 ORDER BY created_at DESC', [accountId]);
      return result.rows.map(mapRule);
    });
  }

  async findCalculations(accountId: AccountId): Promise<readonly CommissionCalculationSummary[]> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query('SELECT * FROM commission_calculations WHERE account_id = $1 ORDER BY created_at DESC', [accountId]);
      return result.rows.map(mapCalculation);
    });
  }

  async findLines(accountId: AccountId): Promise<readonly CommissionLineSummary[]> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query('SELECT * FROM commission_lines WHERE account_id = $1 ORDER BY occurred_at DESC, id DESC', [accountId]);
      return result.rows.map(mapLine);
    });
  }

  async findLineBySource(
    accountId: AccountId,
    sourceType: CommissionSourceType,
    sourceId: string
  ): Promise<CommissionLineSummary | null> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `SELECT * FROM commission_lines
         WHERE account_id = $1 AND source_type = $2 AND source_id = $3
         LIMIT 1`,
        [accountId, sourceType, sourceId]
      );
      return result.rows[0] ? mapLine(result.rows[0] as Record<string, unknown>) : null;
    });
  }

  async findPayableBySourceExpense(
    accountId: AccountId,
    sourceExpenseId: string
  ): Promise<CommissionPayableReference | null> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `SELECT id, account_id, status
           FROM financial_payables
          WHERE account_id = $1 AND source_expense_id = $2
          LIMIT 1
          FOR UPDATE`,
        [accountId, sourceExpenseId]
      );
      const row = result.rows[0] as Record<string, unknown> | undefined;
      if (!row) return null;
      return {
        id: row.id as string,
        accountId: row.account_id as AccountId,
        status: row.status as CommissionPayableStatus
      };
    });
  }

  async withPayableCreateSavepoint<T>(
    accountId: AccountId,
    operation: () => Promise<T>
  ): Promise<T> {
    return withTenantTransaction(accountId, () => withTenantQuery(getPool(), async (client) => {
      await client.query('SAVEPOINT commission_payable_create');
      try {
        const result = await operation();
        await client.query('RELEASE SAVEPOINT commission_payable_create');
        return result;
      } catch (error) {
        await client.query('ROLLBACK TO SAVEPOINT commission_payable_create');
        await client.query('RELEASE SAVEPOINT commission_payable_create');
        throw error;
      }
    }));
  }
}

export class DatabaseCommissionSourceAuthority implements CommissionSourceAuthority {
  async findStaff(accountId: AccountId, staffId: string): Promise<CommissionStaffAuthorityRecord | null> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `SELECT s.id::text, s.account_id, s.full_name, s.department, s.job_title,
                s.is_active, s.profession_id::text,
                p.name AS profession_name, p.is_active AS profession_is_active
           FROM staff AS s
           LEFT JOIN professions AS p
             ON p.account_id = s.account_id AND p.id = s.profession_id
          WHERE s.account_id = $1 AND s.id = $2
          LIMIT 1`,
        [accountId, staffId]
      );
      const row = result.rows[0] as Record<string, unknown> | undefined;
      if (!row) return null;
      return {
        id: row.id as string,
        accountId: row.account_id as AccountId,
        fullName: row.full_name as string,
        department: row.department as string | null,
        jobTitle: row.job_title as string | null,
        isActive: Boolean(row.is_active),
        professionId: row.profession_id as string | null,
        professionName: row.profession_name as string | null,
        professionIsActive: row.profession_is_active === null || row.profession_is_active === undefined
          ? null
          : Boolean(row.profession_is_active)
      };
    });
  }

  async findBillingItem(
    accountId: AccountId,
    billingItemId: string
  ): Promise<CommissionBillingItemAuthorityRecord | null> {
    return withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `SELECT bi.id::text, bi.account_id, bi.item_type, bi.description,
                bi.total_amount, bi.created_at, br.status
           FROM billing_items AS bi
           JOIN billing_records AS br
             ON br.account_id = bi.account_id AND br.id = bi.billing_record_id
          WHERE bi.account_id = $1 AND bi.id = $2
          LIMIT 1`,
        [accountId, billingItemId]
      );
      const row = result.rows[0] as Record<string, unknown> | undefined;
      if (!row) return null;
      return {
        id: row.id as string,
        accountId: row.account_id as AccountId,
        status: row.status as CommissionBillingItemAuthorityRecord['status'],
        itemKind: mapBillingItemKind(row.item_type as string),
        description: row.description as string,
        baseAmount: Number(row.total_amount),
        occurredAt: dateOnly(row.created_at)
      };
    });
  }
}

function inferRuleScope(input: CreateCommissionRuleInput): CommissionRuleScope {
  if (input.staffId?.trim()) return 'staff';
  if (input.jobTitle?.trim()) return 'job_title';
  if (input.department?.trim()) return 'department';
  return 'global';
}

function validateRuleScope(scope: CommissionRuleScope, input: CreateCommissionRuleInput): void {
  if (scope === 'staff' && !input.staffId?.trim()) throw new ValidationError('staffId is required for staff commission rules');
  if (scope === 'department' && !input.department?.trim()) throw new ValidationError('department is required for department commission rules');
  if (scope === 'job_title' && !input.jobTitle?.trim()) throw new ValidationError('jobTitle is required for job title commission rules');
}

function ruleSpecificity(rule: CommissionRuleSummary): number {
  const scopeScore = { global: 0, department: 1, job_title: 2, staff: 3 }[rule.scope];
  return scopeScore * 10 + (rule.itemKind === 'any' ? 0 : 1);
}

function ruleMatchesLine(rule: CommissionRuleSummary, line: CommissionSourceLineInput): boolean {
  if (rule.scope === 'global') return true;
  if (rule.scope === 'staff') return rule.staffId === line.staffId;
  if (rule.scope === 'department') return normalizeComparable(rule.department) === normalizeComparable(line.department);
  return normalizeComparable(rule.jobTitle) === normalizeComparable(line.jobTitle);
}

function normalizeComparable(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? '';
}

function requireTrimmed(value: string | null | undefined, field: string): string {
  const normalized = value?.trim();
  if (!normalized) throw new ValidationError(`${field} is required`, { field });
  return normalized;
}

function normalizeOptional(value: string | null | undefined): string | null {
  return value?.trim() || null;
}

function requirePercentage(value: number): number {
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw new ValidationError('percentage must be between 0 and 100', { value });
  }
  return roundMoney(value);
}

function requireMoney(value: number, field: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new ValidationError(`${field} must be a positive money value`, { field, value });
  }
  return roundMoney(value);
}

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function normalizeDate(value: string, field: string): string {
  const date = new Date(`${value.slice(0, 10)}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime())) {
    throw new ValidationError(`${field} must be a valid ISO date`, { field, value });
  }
  return date.toISOString().slice(0, 10);
}

function normalizeItemKind(value: CommissionItemKind): CommissionItemKind {
  if (value === 'service' || value === 'product' || value === 'procedure' || value === 'exam' || value === 'other') {
    return value;
  }
  throw new ValidationError('itemKind is invalid', { value });
}

function mapBillingItemKind(value: string): CommissionItemKind {
  if (value === 'service' || value === 'procedure' || value === 'exam') return value;
  if (value === 'supply') return 'product';
  if (value === 'daily_rate' || value === 'other') return 'other';
  throw new ValidationError('Billing item kind is not commissionable', { value });
}

function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === '23505';
}

function isWithinPeriod(value: string, periodStart: string, periodEnd: string): boolean {
  return value >= periodStart && value <= periodEnd;
}

function commissionNumberCounter(number: string): number {
  const match = /^COM-(\d+)$/.exec(number);
  return match ? Number(match[1]) : 0;
}

function dateIso(value: unknown): string {
  return new Date(value as string).toISOString();
}

function dateOnly(value: unknown): string {
  return new Date(value as string).toISOString().slice(0, 10);
}

function nullableTimestamp(value: string | null): Date | null {
  return value ? new Date(value) : null;
}

function ruleParams(rule: CommissionRuleSummary): unknown[] {
  return [
    rule.id,
    rule.accountId,
    rule.description,
    rule.scope,
    rule.staffId,
    rule.department,
    rule.jobTitle,
    rule.itemKind,
    rule.percentage,
    rule.isActive,
    rule.createdByUserId,
    new Date(rule.createdAt),
    new Date(rule.updatedAt)
  ];
}

function calculationParams(calculation: CommissionCalculationSummary): unknown[] {
  return [
    calculation.id,
    calculation.accountId,
    calculation.number,
    calculation.periodStart,
    calculation.periodEnd,
    calculation.status,
    calculation.totalBaseAmount,
    calculation.totalCommissionAmount,
    calculation.createdByUserId,
    calculation.reviewedByUserId,
    calculation.paidByUserId,
    calculation.cancelledByUserId,
    new Date(calculation.createdAt),
    new Date(calculation.updatedAt),
    nullableTimestamp(calculation.reviewedAt),
    nullableTimestamp(calculation.paidAt),
    nullableTimestamp(calculation.cancelledAt),
    calculation.notes,
    calculation.payableId
  ];
}

function lineParams(line: CommissionLineSummary): unknown[] {
  return [
    line.id,
    line.accountId,
    line.calculationId,
    line.ruleId,
    line.staffId,
    line.staffName,
    line.department ?? null,
    line.jobTitle ?? null,
    line.professionId ?? null,
    line.professionName ?? null,
    line.itemKind,
    line.sourceType,
    line.sourceId,
    line.sourceDescription,
    line.baseAmount,
    line.percentage,
    line.commissionAmount,
    line.occurredAt
  ];
}

function mapRule(row: Record<string, unknown>): CommissionRuleSummary {
  return {
    id: row.id as string,
    accountId: row.account_id as AccountId,
    description: row.description as string,
    scope: row.scope as CommissionRuleScope,
    staffId: row.staff_id as string | null,
    department: row.department as string | null,
    jobTitle: row.job_title as string | null,
    itemKind: row.item_kind as CommissionItemKind | 'any',
    percentage: Number(row.percentage),
    isActive: Boolean(row.is_active),
    createdByUserId: row.created_by_user_id as UserId,
    createdAt: dateIso(row.created_at),
    updatedAt: dateIso(row.updated_at)
  };
}

function mapCalculation(row: Record<string, unknown>): CommissionCalculationSummary {
  return {
    id: row.id as string,
    accountId: row.account_id as AccountId,
    number: row.calculation_number as string,
    periodStart: dateOnly(row.period_start),
    periodEnd: dateOnly(row.period_end),
    status: row.status as CommissionCalculationStatus,
    totalBaseAmount: Number(row.total_base_amount),
    totalCommissionAmount: Number(row.total_commission_amount),
    createdByUserId: row.created_by_user_id as UserId,
    reviewedByUserId: row.reviewed_by_user_id as UserId | null,
    paidByUserId: row.paid_by_user_id as UserId | null,
    cancelledByUserId: row.cancelled_by_user_id as UserId | null,
    payableId: (row.payable_id as string | null) ?? null,
    createdAt: dateIso(row.created_at),
    updatedAt: dateIso(row.updated_at),
    reviewedAt: row.reviewed_at ? dateIso(row.reviewed_at) : null,
    paidAt: row.paid_at ? dateIso(row.paid_at) : null,
    cancelledAt: row.cancelled_at ? dateIso(row.cancelled_at) : null,
    notes: row.notes as string | null
  };
}

function mapLine(row: Record<string, unknown>): CommissionLineSummary {
  return {
    id: row.id as string,
    accountId: row.account_id as AccountId,
    calculationId: row.calculation_id as string,
    ruleId: row.rule_id as string | null,
    staffId: row.staff_id as string,
    staffName: row.staff_name as string,
    department: row.department as string | null,
    jobTitle: row.job_title as string | null,
    professionId: row.profession_id as string | null,
    professionName: row.profession_name as string | null,
    itemKind: row.item_kind as CommissionItemKind,
    sourceType: row.source_type as CommissionSourceType,
    sourceId: row.source_id as string,
    sourceDescription: row.source_description as string,
    baseAmount: Number(row.base_amount),
    percentage: Number(row.percentage),
    commissionAmount: Number(row.commission_amount),
    occurredAt: dateOnly(row.occurred_at)
  };
}
/* v8 ignore stop */
