import { append } from '@cvg-his/audit';

import type { RequestContext } from '../../plugins/requestContext.js';
import { createProductsRepo } from './repo.js';
import type { CreateProductBody, ListProductsQuery, UpdateProductBody } from './types.js';

type DbClient = typeof import('@cvg-his/db').db;

type ServiceContext = {
  db: DbClient;
  requestContext: RequestContext;
};

function ensureActor(context: RequestContext) {
  const actor = context.actor;

  if (!actor?.accountId) {
    throw new Error('Actor context is required to access products.');
  }

  return actor;
}

type ProductsServiceDeps = {
  repo?: ReturnType<typeof createProductsRepo>;
  appendAudit?: typeof append;
};

export function createProductsService(context: ServiceContext, deps: ProductsServiceDeps = {}) {
  const repo = deps.repo ?? createProductsRepo(context.db);
  const appendAudit = deps.appendAudit ?? append;

  return {
    async create(input: CreateProductBody) {
      const actor = ensureActor(context.requestContext);

      if (input.code) {
        const existing = await repo.findByCode(actor.accountId, input.code);
        if (existing) {
          const error = new Error('Product code already exists for this account.');
          Object.assign(error, { statusCode: 409 });
          throw error;
        }
      }

      const created = await repo.create({
        accountId: actor.accountId,
        ...input
      });

      await appendAudit({
        accountId: actor.accountId,
        actorUserId: actor.userId,
        roles: actor.roles,
        entityType: 'product',
        entityId: created.id,
        action: 'product.create',
        beforeJson: null,
        afterJson: created,
        requestId: context.requestContext.requestId
      });

      return created;
    },

    async getById(id: string) {
      const actor = ensureActor(context.requestContext);
      return repo.findById(actor.accountId, id);
    },

    async update(id: string, patch: UpdateProductBody) {
      const actor = ensureActor(context.requestContext);
      const before = await repo.findById(actor.accountId, id);

      if (!before) {
        return null;
      }

      if (patch.code && patch.code !== before.code) {
        const existing = await repo.findByCode(actor.accountId, patch.code);
        if (existing && existing.id !== id) {
          const error = new Error('Product code already exists for this account.');
          Object.assign(error, { statusCode: 409 });
          throw error;
        }
      }

      const after = await repo.updateById(actor.accountId, id, patch);

      if (!after) {
        return null;
      }

      await appendAudit({
        accountId: actor.accountId,
        actorUserId: actor.userId,
        roles: actor.roles,
        entityType: 'product',
        entityId: id,
        action: 'product.update',
        beforeJson: before,
        afterJson: after,
        requestId: context.requestContext.requestId
      });

      return after;
    },

    async list(query: ListProductsQuery) {
      const actor = ensureActor(context.requestContext);
      return repo.list({
        accountId: actor.accountId,
        page: query.page,
        pageSize: query.pageSize,
        q: query.q,
        active: query.active
      });
    }
  };
}
