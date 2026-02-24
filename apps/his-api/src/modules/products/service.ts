import { append, type AppendAuditInput } from '@cvg-his/audit';

import type { RequestContext } from '../../plugins/requestContext.js';
import { createProductsRepo, type ProductsRepo } from './repo.js';
import type { ProductCreateInput, ProductRecord, ProductUpdateInput } from './types.js';

type DbClient = typeof import('@cvg-his/db').db;

type ServiceContext = {
  db: DbClient;
  requestContext: RequestContext;
};

type ServiceDependencies = {
  repo?: ProductsRepo;
  appendAudit?: (input: AppendAuditInput) => Promise<unknown>;
};

type AccountActor = NonNullable<RequestContext['actor']> & {
  accountId: string;
};

type WriteActor = AccountActor & {
  userId: string;
};

type MaybeDbError = {
  code?: string;
  constraint?: string;
};

export type CreateProductResult =
  | { kind: 'sku_conflict' }
  | { kind: 'created'; product: ProductRecord };

export type UpdateProductResult =
  | { kind: 'product_not_found' }
  | { kind: 'sku_conflict' }
  | { kind: 'updated'; product: ProductRecord };

export type DeleteProductResult =
  | { kind: 'product_not_found' }
  | { kind: 'deleted' };

function unauthorizedError(message: string): Error & { statusCode: 401; code: 'UNAUTHORIZED' } {
  const error = new Error(message) as Error & {
    statusCode: 401;
    code: 'UNAUTHORIZED';
  };

  error.statusCode = 401;
  error.code = 'UNAUTHORIZED';
  return error;
}

function ensureAccountActor(requestContext: RequestContext): AccountActor {
  const actor = requestContext.actor;

  if (!actor?.accountId) {
    throw unauthorizedError('Missing actor context. Provide a valid Bearer token.');
  }

  return actor as AccountActor;
}

function ensureWriteActor(requestContext: RequestContext): WriteActor {
  const actor = ensureAccountActor(requestContext);

  if (!actor.userId) {
    throw unauthorizedError('Missing actor user context in token.');
  }

  return actor as WriteActor;
}

function isDuplicateSkuError(error: unknown): error is MaybeDbError {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const maybeDbError = error as MaybeDbError;
  return maybeDbError.code === '23505' && maybeDbError.constraint === 'products_account_sku_unique';
}

export function createProductsService(
  context: ServiceContext,
  dependencies: ServiceDependencies = {}
) {
  const repo = dependencies.repo ?? createProductsRepo(context.db);
  const appendAuditFn = dependencies.appendAudit ?? append;

  return {
    async list(params: {
      page: number;
      pageSize: number;
      q?: string;
      active?: boolean;
      category?: string;
    }): Promise<{ items: ProductRecord[]; total: number; page: number; pageSize: number }> {
      const actor = ensureAccountActor(context.requestContext);
      const { items, total } = await repo.list({
        accountId: actor.accountId,
        ...params
      });

      return {
        items: items as ProductRecord[],
        total,
        page: params.page,
        pageSize: params.pageSize
      };
    },

    async getById(productId: string): Promise<ProductRecord | null> {
      const actor = ensureAccountActor(context.requestContext);
      return repo.findById(actor.accountId, productId) as Promise<ProductRecord | null>;
    },

    async create(input: ProductCreateInput): Promise<CreateProductResult> {
      const actor = ensureWriteActor(context.requestContext);
      let product: ProductRecord;

      try {
        product = (await repo.create({
          accountId: actor.accountId,
          ...input
        })) as ProductRecord;
      } catch (error) {
        if (isDuplicateSkuError(error)) {
          return { kind: 'sku_conflict' };
        }

        throw error;
      }

      await appendAuditFn({
        accountId: actor.accountId,
        actorUserId: actor.userId,
        roles: actor.roles,
        action: 'ProductCreated',
        entityType: 'product',
        entityId: product.id,
        beforeJson: null,
        afterJson: product,
        requestId: context.requestContext.requestId
      });

      return {
        kind: 'created',
        product
      };
    },

    async update(
      productId: string,
      patch: ProductUpdateInput
    ): Promise<UpdateProductResult> {
      const actor = ensureWriteActor(context.requestContext);
      const before = await repo.findById(actor.accountId, productId);

      if (!before) {
        return { kind: 'product_not_found' };
      }

      let after: ProductRecord | null;
      try {
        after = (await repo.updateById({
          accountId: actor.accountId,
          productId,
          patch
        })) as ProductRecord | null;
      } catch (error) {
        if (isDuplicateSkuError(error)) {
          return { kind: 'sku_conflict' };
        }

        throw error;
      }

      if (!after) {
        return { kind: 'product_not_found' };
      }

      await appendAuditFn({
        accountId: actor.accountId,
        actorUserId: actor.userId,
        roles: actor.roles,
        action: 'ProductUpdated',
        entityType: 'product',
        entityId: after.id,
        beforeJson: before,
        afterJson: after,
        requestId: context.requestContext.requestId
      });

      return {
        kind: 'updated',
        product: after
      };
    },

    async delete(productId: string): Promise<DeleteProductResult> {
      const actor = ensureWriteActor(context.requestContext);
      const before = await repo.findById(actor.accountId, productId);

      if (!before) {
        return { kind: 'product_not_found' };
      }

      await repo.deleteById(actor.accountId, productId);

      await appendAuditFn({
        accountId: actor.accountId,
        actorUserId: actor.userId,
        roles: actor.roles,
        action: 'ProductDeleted',
        entityType: 'product',
        entityId: productId,
        beforeJson: before,
        afterJson: null,
        requestId: context.requestContext.requestId
      });

      return { kind: 'deleted' };
    }
  };
}
