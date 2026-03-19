import { append } from '@cvg-his/audit';

import type { RequestContext } from '../../plugins/requestContext.js';
import { createPaymentsRepo } from './repo.js';
import type { CreatePaymentBody, ListPaymentsQuery } from './types.js';

type DbClient = typeof import('@cvg-his/db').db;
type PaymentContext = { db: DbClient; requestContext: RequestContext };

function ensureActor(ctx: RequestContext) {
  const actor = ctx.actor;
  if (!actor?.accountId) throw new Error('Actor context is required.');
  return actor;
}

type PaymentsDeps = {
  repo?: ReturnType<typeof createPaymentsRepo>;
  appendAudit?: typeof append;
};

export function createPaymentsService(ctx: PaymentContext, deps: PaymentsDeps = {}) {
  const repo = deps.repo ?? createPaymentsRepo(ctx.db);
  const audit = deps.appendAudit ?? append;

  return {
    async getById(id: string) {
      const actor = ensureActor(ctx.requestContext);
      return repo.findById(actor.accountId, id);
    },

    async list(query: ListPaymentsQuery) {
      const actor = ensureActor(ctx.requestContext);
      return repo.list(actor.accountId, {
        page: query.page,
        pageSize: query.pageSize,
        financialAccountId: query.financialAccountId,
        method: query.method,
        status: query.status,
        dateFrom: query.dateFrom,
        dateTo: query.dateTo
      });
    },

    async create(input: CreatePaymentBody) {
      const actor = ensureActor(ctx.requestContext);

      // If installments > 1, create multiple payment records
      if (input.installments && input.installments > 1) {
        const installmentAmount = Math.round((input.amount / input.installments) * 100) / 100;
        const lastInstallmentAmount = input.amount - (installmentAmount * (input.installments - 1));

        const payments = [];
        for (let i = 1; i <= input.installments; i++) {
          const amount = i === input.installments ? lastInstallmentAmount : installmentAmount;
          const payment = await repo.create({
            accountId: actor.accountId,
            financialAccountId: input.financialAccountId,
            amount,
            method: input.method,
            installments: input.installments,
            installmentNumber: i,
            reference: input.reference ? `${input.reference} (${i}/${input.installments})` : undefined,
            notes: i === 1 ? input.notes ?? undefined : undefined,
            processedByUserId: actor.userId
          });
          payments.push(payment);

          await audit({
            accountId: actor.accountId,
            actorUserId: actor.userId,
            roles: actor.roles,
            entityType: 'payment',
            entityId: payment.id,
            action: 'payment.create',
            beforeJson: null,
            afterJson: { ...payment, installmentInfo: `${i}/${input.installments}` },
            requestId: ctx.requestContext.requestId
          });
        }

        return payments;
      }

      // Single payment
      const payment = await repo.create({
        accountId: actor.accountId,
        financialAccountId: input.financialAccountId,
        amount: input.amount,
        method: input.method,
        reference: input.reference ?? undefined,
        notes: input.notes ?? undefined,
        processedByUserId: actor.userId
      });

      await audit({
        accountId: actor.accountId,
        actorUserId: actor.userId,
        roles: actor.roles,
        entityType: 'payment',
        entityId: payment.id,
        action: 'payment.create',
        beforeJson: null,
        afterJson: payment,
        requestId: ctx.requestContext.requestId
      });

      return payment;
    },

    async refund(id: string) {
      const actor = ensureActor(ctx.requestContext);
      const before = await repo.findById(actor.accountId, id);
      if (!before) return null;

      if (before.status !== 'completed') {
        const error = new Error('Only completed payments can be refunded.');
        Object.assign(error, { statusCode: 400 });
        throw error;
      }

      const after = await repo.updateStatus(actor.accountId, id, 'refunded');
      if (!after) return null;

      await audit({
        accountId: actor.accountId,
        actorUserId: actor.userId,
        roles: actor.roles,
        entityType: 'payment',
        entityId: id,
        action: 'payment.refund',
        beforeJson: before,
        afterJson: after,
        requestId: ctx.requestContext.requestId
      });

      return after;
    },

    async cancel(id: string) {
      const actor = ensureActor(ctx.requestContext);
      const before = await repo.findById(actor.accountId, id);
      if (!before) return null;

      if (before.status === 'refunded') {
        const error = new Error('Refunded payments cannot be cancelled.');
        Object.assign(error, { statusCode: 400 });
        throw error;
      }

      const after = await repo.updateStatus(actor.accountId, id, 'cancelled');
      if (!after) return null;

      await audit({
        accountId: actor.accountId,
        actorUserId: actor.userId,
        roles: actor.roles,
        entityType: 'payment',
        entityId: id,
        action: 'payment.cancel',
        beforeJson: before,
        afterJson: after,
        requestId: ctx.requestContext.requestId
      });

      return after;
    },

    async getSummary(dateFrom: Date, dateTo: Date) {
      const actor = ensureActor(ctx.requestContext);
      return repo.getSummaryByDateRange(actor.accountId, dateFrom, dateTo);
    }
  };
}
