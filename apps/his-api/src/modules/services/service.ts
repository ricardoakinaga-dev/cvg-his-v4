import { append, type AppendAuditInput } from '@cvg-his/audit';

import type { RequestContext } from '../../plugins/requestContext.js';
import { createServicesRepo, type ServicesRepo } from './repo.js';
import type { ServiceCreateInput, ServiceRecord, ServiceUpdateInput } from './types.js';

type DbClient = typeof import('@cvg-his/db').db;

type ServiceContext = {
  db: DbClient;
  requestContext: RequestContext;
};

type ServiceDependencies = {
  repo?: ServicesRepo;
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

export type CreateServiceResult =
  | { kind: 'code_conflict' }
  | { kind: 'created'; service: ServiceRecord };

export type UpdateServiceResult =
  | { kind: 'service_not_found' }
  | { kind: 'code_conflict' }
  | { kind: 'updated'; service: ServiceRecord };

export type DeleteServiceResult =
  | { kind: 'service_not_found' }
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

function isDuplicateCodeError(error: unknown): error is MaybeDbError {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const maybeDbError = error as MaybeDbError;
  return maybeDbError.code === '23505' && maybeDbError.constraint === 'services_account_code_unique';
}

export function createServicesService(
  context: ServiceContext,
  dependencies: ServiceDependencies = {}
) {
  const repo = dependencies.repo ?? createServicesRepo(context.db);
  const appendAuditFn = dependencies.appendAudit ?? append;

  return {
    async list(params: {
      page: number;
      pageSize: number;
      q?: string;
      group?: string;
      sector?: string;
      active?: boolean;
    }): Promise<{ items: ServiceRecord[]; total: number; page: number; pageSize: number }> {
      const actor = ensureAccountActor(context.requestContext);
      const { items, total } = await repo.list({
        accountId: actor.accountId,
        ...params
      });

      return {
        items: items as ServiceRecord[],
        total,
        page: params.page,
        pageSize: params.pageSize
      };
    },

    async getById(serviceId: string): Promise<ServiceRecord | null> {
      const actor = ensureAccountActor(context.requestContext);
      return repo.findById(actor.accountId, serviceId) as Promise<ServiceRecord | null>;
    },

    async create(input: ServiceCreateInput): Promise<CreateServiceResult> {
      const actor = ensureWriteActor(context.requestContext);
      let service: ServiceRecord;

      try {
        service = (await repo.create({
          accountId: actor.accountId,
          ...input
        })) as ServiceRecord;
      } catch (error) {
        if (isDuplicateCodeError(error)) {
          return { kind: 'code_conflict' };
        }

        throw error;
      }

      await appendAuditFn({
        accountId: actor.accountId,
        actorUserId: actor.userId,
        roles: actor.roles,
        action: 'ServiceCreated',
        entityType: 'service',
        entityId: service.id,
        beforeJson: null,
        afterJson: service,
        requestId: context.requestContext.requestId
      });

      return {
        kind: 'created',
        service
      };
    },

    async update(
      serviceId: string,
      patch: ServiceUpdateInput
    ): Promise<UpdateServiceResult> {
      const actor = ensureWriteActor(context.requestContext);
      const before = await repo.findById(actor.accountId, serviceId);

      if (!before) {
        return { kind: 'service_not_found' };
      }

      let after: ServiceRecord | null;
      try {
        after = (await repo.updateById({
          accountId: actor.accountId,
          serviceId,
          patch
        })) as ServiceRecord | null;
      } catch (error) {
        if (isDuplicateCodeError(error)) {
          return { kind: 'code_conflict' };
        }

        throw error;
      }

      if (!after) {
        return { kind: 'service_not_found' };
      }

      await appendAuditFn({
        accountId: actor.accountId,
        actorUserId: actor.userId,
        roles: actor.roles,
        action: 'ServiceUpdated',
        entityType: 'service',
        entityId: after.id,
        beforeJson: before,
        afterJson: after,
        requestId: context.requestContext.requestId
      });

      return {
        kind: 'updated',
        service: after
      };
    },

    async delete(serviceId: string): Promise<DeleteServiceResult> {
      const actor = ensureWriteActor(context.requestContext);
      const before = await repo.findById(actor.accountId, serviceId);

      if (!before) {
        return { kind: 'service_not_found' };
      }

      await repo.deleteById(actor.accountId, serviceId);

      await appendAuditFn({
        accountId: actor.accountId,
        actorUserId: actor.userId,
        roles: actor.roles,
        action: 'ServiceDeleted',
        entityType: 'service',
        entityId: serviceId,
        beforeJson: before,
        afterJson: null,
        requestId: context.requestContext.requestId
      });

      return { kind: 'deleted' };
    }
  };
}
