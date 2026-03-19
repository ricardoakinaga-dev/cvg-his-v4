import { append } from '@cvg-his/audit';
import type { RequestContext } from '../../plugins/requestContext.js';
import { createExamOrdersRepo, createExamResultsRepo } from './repo.js';
import type { CreateExamOrderBody, UpdateExamOrderBody, ListExamOrdersQuery, CreateExamResultBody, UpdateExamResultBody, ListExamResultsQuery } from './types.js';

type DbClient = typeof import('@cvg-his/db').db;
type Ctx = { db: DbClient; requestContext: RequestContext };

function actor(ctx: RequestContext) {
  const a = ctx.actor;
  if (!a?.accountId) throw new Error('Actor context required.');
  return a;
}

// Exam Orders
export function createExamOrdersService(ctx: Ctx, deps: { repo?: ReturnType<typeof createExamOrdersRepo>; appendAudit?: typeof append } = {}) {
  const repo = deps.repo ?? createExamOrdersRepo(ctx.db);
  const audit = deps.appendAudit ?? append;

  return {
    async create(input: CreateExamOrderBody) {
      const a = actor(ctx.requestContext);
      const created = await repo.create({
        accountId: a.accountId, patientId: input.patientId, encounterId: input.encounterId,
        requestedByUserId: a.userId ?? 'unknown', category: (input.category ?? 'laboratory') as string,
        examName: input.examName!, examCode: input.examCode!, priority: input.priority ?? undefined, notes: input.notes ?? null
      });
      await audit({ accountId: a.accountId, actorUserId: a.userId, roles: a.roles, entityType: 'examOrder', entityId: created.id, action: 'examOrder.create', beforeJson: null, afterJson: created, requestId: ctx.requestContext.requestId });
      return created;
    },
    async getById(id: string) { const a = actor(ctx.requestContext); return repo.findById(a.accountId, id); },
    async list(q: ListExamOrdersQuery) {
      const a = actor(ctx.requestContext);
      return repo.list({ accountId: a.accountId, page: q.page, pageSize: q.pageSize, q: q.q, patientId: q.patientId, encounterId: q.encounterId, status: q.status, category: q.category, dateFrom: q.dateFrom, dateTo: q.dateTo });
    },
    async update(id: string, patch: UpdateExamOrderBody) {
      const a = actor(ctx.requestContext);
      const before = await repo.findById(a.accountId, id);
      if (!before) return null;
      const after = await repo.updateById(a.accountId, id, patch);
      if (!after) return null;
      await audit({ accountId: a.accountId, actorUserId: a.userId, roles: a.roles, entityType: 'examOrder', entityId: id, action: 'examOrder.update', beforeJson: before, afterJson: after, requestId: ctx.requestContext.requestId });
      return after;
    }
  };
}

// Exam Results
export function createExamResultsService(ctx: Ctx, deps: { repo?: ReturnType<typeof createExamResultsRepo>; ordersRepo?: ReturnType<typeof createExamOrdersRepo>; appendAudit?: typeof append } = {}) {
  const repo = deps.repo ?? createExamResultsRepo(ctx.db);
  const ordersRepo = deps.ordersRepo ?? createExamOrdersRepo(ctx.db);
  const audit = deps.appendAudit ?? append;

  return {
    async create(input: CreateExamResultBody) {
      const a = actor(ctx.requestContext);
      // Verify order exists and belongs to same account
      const order = await ordersRepo.findById(a.accountId, input.examOrderId);
      if (!order) {
        const err = new Error('Exam order not found');
        Object.assign(err, { statusCode: 404 });
        throw err;
      }
      const created = await repo.create({
        accountId: a.accountId, patientId: order.patientId, examOrderId: input.examOrderId,
        category: order.category, examName: order.examName, examCode: order.examCode,
        requestedAt: order.requestedAt, findings: input.findings, interpretation: input.interpretation,
        resultValues: input.resultValues, normalRange: input.normalRange, notes: input.notes
      });
      await audit({ accountId: a.accountId, actorUserId: a.userId, roles: a.roles, entityType: 'examResult', entityId: created.id, action: 'examResult.create', beforeJson: null, afterJson: created, requestId: ctx.requestContext.requestId });
      return created;
    },
    async getById(id: string) { const a = actor(ctx.requestContext); return repo.findById(a.accountId, id); },
    async list(q: ListExamResultsQuery) {
      const a = actor(ctx.requestContext);
      return repo.list({ accountId: a.accountId, page: q.page, pageSize: q.pageSize, q: q.q, patientId: q.patientId, examOrderId: q.examOrderId, status: q.status, category: q.category });
    },
    async update(id: string, patch: UpdateExamResultBody) {
      const a = actor(ctx.requestContext);
      const before = await repo.findById(a.accountId, id);
      if (!before) return null;
      const after = await repo.updateById(a.accountId, id, patch);
      if (!after) return null;
      await audit({ accountId: a.accountId, actorUserId: a.userId, roles: a.roles, entityType: 'examResult', entityId: id, action: 'examResult.update', beforeJson: before, afterJson: after, requestId: ctx.requestContext.requestId });
      return after;
    }
  };
}
