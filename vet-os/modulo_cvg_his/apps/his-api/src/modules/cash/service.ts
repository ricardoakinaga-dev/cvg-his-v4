import { append } from '@cvg-his/audit';

import type { RequestContext } from '../../plugins/requestContext.js';
import { createCashRepo } from './repo.js';
import type { OpenCashRegisterBody, CloseCashRegisterBody, CreateCashMovementBody, ListCashMovementsQuery } from './types.js';

type DbClient = typeof import('@cvg-his/db').db;
type CashContext = { db: DbClient; requestContext: RequestContext };

function ensureActor(ctx: RequestContext): { accountId: string; userId: string; roles: string[] } {
  const actor = ctx.actor;
  if (!actor?.accountId || !actor?.userId) throw new Error('Actor context is required.');
  return actor as { accountId: string; userId: string; roles: string[] };
}

type CashDeps = {
  repo?: ReturnType<typeof createCashRepo>;
  appendAudit?: typeof append;
};

export function createCashService(ctx: CashContext, deps: CashDeps = {}) {
  const repo = deps.repo ?? createCashRepo(ctx.db);
  const audit = deps.appendAudit ?? append;

  return {
    // =====================
    // Cash Registers
    // =====================

    async getOpenRegister() {
      const actor = ensureActor(ctx.requestContext);
      return repo.findOpenRegister(actor.accountId);
    },

    async getRegisterById(id: string) {
      const actor = ensureActor(ctx.requestContext);
      return repo.findRegisterById(actor.accountId, id);
    },

    async listRegisters(options: { page?: number; pageSize?: number; status?: string } = {}) {
      const actor = ensureActor(ctx.requestContext);
      return repo.listRegisters(actor.accountId, options);
    },

    async open(input: OpenCashRegisterBody) {
      const actor = ensureActor(ctx.requestContext);

      // Check if there's already an open register
      const existing = await repo.findOpenRegister(actor.accountId);
      if (existing) {
        const error = new Error('There is already an open cash register. Close it before opening a new one.');
        Object.assign(error, { statusCode: 409 });
        throw error;
      }

      // Open register
      const register = await repo.openRegister({
        accountId: actor.accountId,
        openedByUserId: actor.userId,
        openingAmount: input.openingAmount,
        notes: input.notes ?? undefined
      });

      // Record opening movement
      await repo.createMovement({
        cashRegisterId: register.id,
        accountId: actor.accountId,
        movementType: 'opening',
        amount: input.openingAmount,
        runningBalance: input.openingAmount,
        notes: 'Abertura de caixa',
        createdByUserId: actor.userId
      });

      await audit({
        accountId: actor.accountId,
        actorUserId: actor.userId,
        roles: actor.roles,
        entityType: 'cashRegister',
        entityId: register.id,
        action: 'cashRegister.open',
        beforeJson: null,
        afterJson: register,
        requestId: ctx.requestContext.requestId
      });

      return register;
    },

    async close(input: CloseCashRegisterBody) {
      const actor = ensureActor(ctx.requestContext);

      // Find open register
      const register = await repo.findOpenRegister(actor.accountId);
      if (!register) {
        const error = new Error('No open cash register found.');
        Object.assign(error, { statusCode: 404 });
        throw error;
      }

      // Calculate expected balance
      const summary = await repo.getSummary(register.id);
      const expectedBalance = register.openingAmount + summary.totalPayments + summary.totalSupplies - summary.totalWithdrawals;
      const difference = input.closingAmount - expectedBalance;

      // Close register
      const closed = await repo.closeRegister({
        accountId: actor.accountId,
        registerId: register.id,
        closedByUserId: actor.userId,
        closingAmount: input.closingAmount,
        expectedClosingAmount: expectedBalance,
        difference,
        notes: input.notes ?? undefined
      });

      // Record closing movement
      await repo.createMovement({
        cashRegisterId: register.id,
        accountId: actor.accountId,
        movementType: 'closing',
        amount: input.closingAmount,
        runningBalance: input.closingAmount,
        notes: `Fechamento de caixa (esperado: ${expectedBalance.toFixed(2)}, diferença: ${difference.toFixed(2)})`,
        createdByUserId: actor.userId
      });

      await audit({
        accountId: actor.accountId,
        actorUserId: actor.userId,
        roles: actor.roles,
        entityType: 'cashRegister',
        entityId: register.id,
        action: 'cashRegister.close',
        beforeJson: register,
        afterJson: closed,
        requestId: ctx.requestContext.requestId
      });

      return closed;
    },

    // =====================
    // Cash Movements
    // =====================

    async createMovement(input: CreateCashMovementBody) {
      const actor = ensureActor(ctx.requestContext);

      // Verify register is open
      const register = await repo.findRegisterById(actor.accountId, input.cashRegisterId);
      if (!register) {
        const error = new Error('Cash register not found.');
        Object.assign(error, { statusCode: 404 });
        throw error;
      }
      if (register.status !== 'open') {
        const error = new Error('Cash register is closed. Cannot add movements.');
        Object.assign(error, { statusCode: 409 });
        throw error;
      }

      // Get current balance from last movement
      const lastMovements = await repo.listMovements(actor.accountId, {
        cashRegisterId: input.cashRegisterId,
        pageSize: 1
      });
      const currentBalance = lastMovements.data.length > 0 ? lastMovements.data[0].runningBalance : register.openingAmount;

      // Calculate new balance
      const isIncoming = ['payment', 'supply'].includes(input.movementType);
      const isOutgoing = ['withdrawal'].includes(input.movementType);
      const newBalance = isIncoming
        ? currentBalance + input.amount
        : isOutgoing
          ? currentBalance - input.amount
          : currentBalance + input.amount; // adjustment can be + or -

      // Create movement
      const movement = await repo.createMovement({
        cashRegisterId: input.cashRegisterId,
        accountId: actor.accountId,
        movementType: input.movementType,
        amount: input.amount,
        runningBalance: newBalance,
        reference: input.reference ?? undefined,
        notes: input.notes ?? undefined,
        createdByUserId: actor.userId
      });

      await audit({
        accountId: actor.accountId,
        actorUserId: actor.userId,
        roles: actor.roles,
        entityType: 'cashMovement',
        entityId: movement.id,
        action: 'cashMovement.create',
        beforeJson: { balance: currentBalance },
        afterJson: { ...movement, newBalance },
        requestId: ctx.requestContext.requestId
      });

      return movement;
    },

    async listMovements(query: ListCashMovementsQuery) {
      const actor = ensureActor(ctx.requestContext);
      return repo.listMovements(actor.accountId, {
        page: query.page,
        pageSize: query.pageSize,
        cashRegisterId: query.cashRegisterId,
        movementType: query.movementType,
        dateFrom: query.dateFrom,
        dateTo: query.dateTo
      });
    },

    async getSummary(registerId: string) {
      const actor = ensureActor(ctx.requestContext);
      const register = await repo.findRegisterById(actor.accountId, registerId);
      if (!register) return null;

      const summary = await repo.getSummary(registerId);
      const movements = await repo.listMovements(actor.accountId, { cashRegisterId: registerId, pageSize: 10000 });

      const currentBalance = movements.data.length > 0
        ? movements.data[0].runningBalance
        : register.openingAmount;

      return {
        registerId: register.id,
        status: register.status,
        openingAmount: register.openingAmount,
        currentBalance,
        totalPayments: summary.totalPayments,
        totalSupplies: summary.totalSupplies,
        totalWithdrawals: summary.totalWithdrawals,
        movementCount: movements.total
      };
    }
  };
}
