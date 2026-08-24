import { randomUUID } from 'node:crypto';
import { ConflictError, NotFoundError } from '@cvg-his-v2/shared-errors';
import type { AccountId, UserId } from '@cvg-his-v2/shared-types';
import { createCorrelationId, nowIso } from '@cvg-his-v2/shared-utils';
import { requirePositiveNumber } from '@cvg-his-v2/shared-validation';
import type {
  CashRepository,
  CashRegisterRecord,
  CashMovementRecord
} from './repositories/database-cash.repository.js';

export interface CashRegisterSummary {
  readonly id: string;
  readonly accountId: AccountId;
  readonly openedByUserId: UserId;
  readonly closedByUserId: UserId | null;
  readonly openingAmount: number;
  readonly closingAmount: number | null;
  readonly expectedClosingAmount: number | null;
  readonly difference: number | null;
  readonly status: 'open' | 'closed';
  readonly openedAt: string;
  readonly closedAt: string | null;
  readonly notes: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CashMovementSummary {
  readonly id: string;
  readonly cashRegisterId: string;
  readonly accountId: AccountId;
  readonly movementType: 'opening' | 'closing' | 'payment' | 'supply' | 'deposit' | 'withdrawal' | 'adjustment';
  readonly amount: number;
  readonly runningBalance: number;
  readonly reference: string | null;
  readonly notes: string | null;
  readonly createdByUserId: UserId | null;
  readonly createdAt: string;
}

export interface CashReconciliationSummary {
  readonly registerId: string;
  readonly accountId: AccountId;
  readonly status: 'open' | 'closed';
  readonly openingAmount: number;
  readonly expectedAmount: number;
  readonly declaredAmount: number | null;
  readonly difference: number | null;
  readonly totalIn: number;
  readonly totalOut: number;
  readonly movementCount: number;
  readonly reconciledAt: string;
}

export interface CashServiceOptions {
  readonly repository?: CashRepository;
}

export interface CashRegisterOpenInput {
  readonly openingAmount: number;
  readonly notes?: string | null;
}

export interface CashRegisterCloseInput {
  readonly closingAmount: number;
  readonly notes?: string | null;
}

export interface CashMovementInput {
  readonly movementType: 'supply' | 'deposit' | 'withdrawal' | 'adjustment';
  readonly amount: number;
  readonly reference?: string | null;
  readonly notes?: string | null;
}

export class CashService {
  readonly #repository?: CashRepository;
  readonly #useUuidIdentifiers: boolean;
  readonly #registers = new Map<string, CashRegisterSummary>();
  readonly #movements = new Map<string, CashMovementSummary>();
  #movementOrder = 0;

  public constructor(options?: CashServiceOptions) {
    this.#repository = options?.repository;
    this.#useUuidIdentifiers = Boolean(options?.repository);
  }

  #nextId(prefix: string): string {
    return this.#useUuidIdentifiers ? randomUUID() : createCorrelationId(prefix);
  }

  public get persistenceMode(): 'database' | 'in-memory' {
    return this.#repository ? 'database' : 'in-memory';
  }

  public async hydrateFromDatabase(accountId: AccountId): Promise<void> {
    if (!this.#repository) return;
    const registers = await this.#repository.findRegistersByAccount(accountId, 100);
    for (const reg of registers) {
      this.#registers.set(reg.id, reg);
      const movements = await this.#repository.findMovementsByRegister(reg.id);
      for (const mov of movements) {
        this.#movements.set(mov.id, mov);
      }
    }
  }

  async openRegister(
    accountId: AccountId,
    openedByUserId: UserId,
    input: CashRegisterOpenInput
  ): Promise<CashRegisterSummary> {
    const existing = await this.findOpenRegister(accountId);
    if (existing) {
      throw new ConflictError('There is already an open cash register', {
        registerId: existing.id
      });
    }

    const openingAmount = requirePositiveNumber(input.openingAmount, 'openingAmount');
    const now = nowIso();
    const register: CashRegisterSummary = {
      id: this.#nextId('cr'),
      accountId,
      openedByUserId,
      closedByUserId: null,
      openingAmount: Math.round(openingAmount * 100) / 100,
      closingAmount: null,
      expectedClosingAmount: null,
      difference: null,
      status: 'open',
      openedAt: now,
      closedAt: null,
      notes: input.notes?.trim() ?? null,
      createdAt: now,
      updatedAt: now
    };

    const openingMovement: CashMovementSummary = {
      id: this.#nextId('cm'),
      cashRegisterId: register.id,
      accountId,
      movementType: 'opening',
      amount: openingAmount,
      runningBalance: openingAmount,
      reference: null,
      notes: input.notes?.trim() ?? null,
      createdByUserId: openedByUserId,
      createdAt: now
    };
    if (this.#repository) {
      const record: CashRegisterRecord = register;
      if (this.#repository.openRegisterWithMovement) {
        await this.#repository.openRegisterWithMovement(record, openingMovement);
      } else {
        await this.#repository.openRegister(record);
        await this.#repository.createMovement(openingMovement);
      }
    }

    this.#registers.set(register.id, register);
    this.#movements.set(openingMovement.id, openingMovement);

    return register;
  }

  async closeRegister(
    registerId: string,
    closedByUserId: UserId,
    input: CashRegisterCloseInput
  ): Promise<{ register: CashRegisterSummary; difference: number }> {
    const register = this.#registers.get(registerId);
    if (!register) throw new NotFoundError('Cash register not found', { registerId });
    if (register.status === 'closed') throw new ConflictError('Register is already closed');

    const closingAmount = requirePositiveNumber(input.closingAmount, 'closingAmount');
    const now = nowIso();
    let currentBalance: number;
    let difference: number;
    let closingMovement: CashMovementSummary = {
      id: this.#nextId('cm'),
      cashRegisterId: registerId,
      accountId: register.accountId,
      movementType: 'closing',
      amount: closingAmount,
      runningBalance: 0,
      reference: null,
      notes: input.notes?.trim() ?? null,
      createdByUserId: closedByUserId,
      createdAt: now
    };
    if (this.#repository?.closeRegisterWithMovement) {
      const closed = await this.#repository.closeRegisterWithMovement(
          register.accountId,
          registerId,
          closingAmount,
          closedByUserId,
          now,
          now,
          closingMovement
      );
      currentBalance = closed.expectedClosingAmount;
      difference = closed.difference;
      closingMovement = closed.movement;
    } else {
      currentBalance = await this.getCurrentBalance(registerId);
      difference = Math.round((closingAmount - currentBalance) * 100) / 100;
      closingMovement = { ...closingMovement, runningBalance: currentBalance };
      if (this.#repository) {
        await this.#repository.closeRegister(
          registerId,
          closingAmount,
          currentBalance,
          difference,
          closedByUserId,
          now,
          now
        );
        await this.#repository.createMovement(closingMovement);
      }
    }

    const updated: CashRegisterSummary = {
      ...register,
      status: 'closed',
      closedByUserId,
      closingAmount: Math.round(closingAmount * 100) / 100,
      expectedClosingAmount: Math.round(currentBalance * 100) / 100,
      difference,
      closedAt: now,
      updatedAt: now
    };

    this.#registers.set(registerId, updated);
    this.#movements.set(closingMovement.id, closingMovement);

    return { register: updated, difference };
  }

  async recordMovement(
    registerId: string,
    accountId: AccountId,
    input: CashMovementInput,
    createdByUserId: UserId
  ): Promise<CashMovementSummary> {
    const register = this.#registers.get(registerId);
    if (!register) throw new NotFoundError('Cash register not found', { registerId });
    if (register.status === 'closed')
      throw new ConflictError('Cannot record movement on closed register');

    const amount = requirePositiveNumber(input.amount, 'amount');
    const currentBalance = await this.getCurrentBalance(registerId);
    const newBalance =
      input.movementType === 'withdrawal' || input.movementType === 'deposit'
        ? currentBalance - amount
        : currentBalance + amount;

    if (newBalance < 0) {
      throw new ConflictError('Insufficient balance for withdrawal', {
        currentBalance,
        requestedAmount: amount
      });
    }

    const now = nowIso();
    const movement: CashMovementSummary = {
      id: this.#nextId('cm'),
      cashRegisterId: registerId,
      accountId,
      movementType: input.movementType,
      amount: Math.round(amount * 100) / 100,
      runningBalance: Math.round(newBalance * 100) / 100,
      reference: input.reference?.trim() ?? null,
      notes: input.notes?.trim() ?? null,
      createdByUserId,
      createdAt: now
    };

    if (this.#repository) {
      const record: CashMovementRecord = movement;
      const persisted = this.#repository.recordMovementAtomically
        ? await this.#repository.recordMovementAtomically(accountId, registerId, record)
        : await (async () => {
            await this.#repository!.createMovement(record);
            return record;
          })();
      const summary = persisted as CashMovementSummary;
      this.#movements.set(summary.id, summary);
      return summary;
    }

    this.#movements.set(movement.id, movement);

    return movement;
  }

  async recordPaymentMovement(
    registerId: string,
    accountId: AccountId,
    amount: number,
    reference: string | null,
    notes: string | null,
    createdByUserId: UserId
  ): Promise<CashMovementSummary> {
    const register = this.#registers.get(registerId);
    if (!register) throw new NotFoundError('Cash register not found', { registerId });
    if (register.status === 'closed')
      throw new ConflictError('Cannot record payment on closed register');

    const normalizedAmount = requirePositiveNumber(amount, 'amount');
    const currentBalance = await this.getCurrentBalance(registerId);
    const newBalance = currentBalance + normalizedAmount;
    const now = nowIso();

    const movement: CashMovementSummary = {
      id: this.#nextId('cm'),
      cashRegisterId: registerId,
      accountId,
      movementType: 'payment',
      amount: Math.round(normalizedAmount * 100) / 100,
      runningBalance: Math.round(newBalance * 100) / 100,
      reference: reference ?? null,
      notes: notes ?? null,
      createdByUserId,
      createdAt: now
    };

    if (this.#repository) {
      const record: CashMovementRecord = movement;
      const persisted = this.#repository.recordMovementAtomically
        ? await this.#repository.recordMovementAtomically(accountId, registerId, record)
        : await (async () => {
            await this.#repository!.createMovement(record);
            return record;
          })();
      const summary = persisted as CashMovementSummary;
      this.#movements.set(summary.id, summary);
      return summary;
    }

    this.#movements.set(movement.id, movement);

    return movement;
  }

  async findOpenRegister(accountId: AccountId): Promise<CashRegisterSummary | null> {
    if (this.#repository) {
      const reg = await this.#repository.findOpenRegister(accountId);
      if (reg) {
        this.#registers.set(reg.id, reg);
        return reg;
      }
    }

    const regs = Array.from(this.#registers.values());
    const open = regs.find((r) => r.accountId === accountId && r.status === 'open');
    return open ?? null;
  }

  async getCurrentBalance(registerId: string): Promise<number> {
    if (this.#repository) {
      return this.#repository.calculateCurrentBalance(registerId);
    }

    const movements = Array.from(this.#movements.values()).filter(
      (m) => m.cashRegisterId === registerId
    );
    return movements.length > 0 ? movements[movements.length - 1].runningBalance : 0;
  }

  async getMovements(registerId: string): Promise<CashMovementSummary[]> {
    if (this.#repository) {
      const movements = await this.#repository.findMovementsByRegister(registerId);
      for (const m of movements) {
        this.#movements.set(m.id, m);
      }
      return movements as CashMovementSummary[];
    }

    return Array.from(this.#movements.values())
      .filter((m) => m.cashRegisterId === registerId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  }

  async getReconciliation(
    registerId: string,
    accountId: AccountId
  ): Promise<CashReconciliationSummary> {
    const register = this.#registers.get(registerId) ?? (await this.#repository?.findById(registerId));
    if (!register || register.accountId !== accountId) {
      throw new NotFoundError('Cash register not found', { registerId });
    }
    if (this.#repository && !this.#registers.has(registerId)) {
      this.#registers.set(registerId, register);
    }
    const movements = await this.getMovements(registerId);
    const totalIn = movements
      .filter((movement) => !['withdrawal', 'deposit', 'closing'].includes(movement.movementType))
      .reduce((sum, movement) => sum + movement.amount, 0);
    const totalOut = movements
      .filter((movement) => movement.movementType === 'withdrawal' || movement.movementType === 'deposit')
      .reduce((sum, movement) => sum + movement.amount, 0);
    const expectedAmount = register.status === 'closed'
      ? register.expectedClosingAmount ?? 0
      : await this.getCurrentBalance(registerId);
    return {
      registerId,
      accountId,
      status: register.status,
      openingAmount: register.openingAmount,
      expectedAmount: Math.round(expectedAmount * 100) / 100,
      declaredAmount: register.closingAmount,
      difference: register.difference,
      totalIn: Math.round(totalIn * 100) / 100,
      totalOut: Math.round(totalOut * 100) / 100,
      movementCount: movements.length,
      reconciledAt: nowIso()
    };
  }

  listRegisters(accountId: AccountId, limit = 30): CashRegisterSummary[] {
    return Array.from(this.#registers.values())
      .filter((r) => r.accountId === accountId)
      .sort((a, b) => b.openedAt.localeCompare(a.openedAt))
      .slice(0, limit);
  }

  findById(id: string): CashRegisterSummary | undefined {
    return this.#registers.get(id);
  }

  getOrThrow(id: string): CashRegisterSummary {
    const reg = this.#registers.get(id);
    if (!reg) throw new NotFoundError('Cash register not found', { id });
    return reg;
  }
}

export {
  DatabaseCashRepository,
  type CashRepository,
  type CashRegisterRecord,
  type CashMovementRecord
} from './repositories/database-cash.repository.js';
