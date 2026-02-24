import { append, type AppendAuditInput } from '@cvg-his/audit';
import type {
  ProtocolCreateDto,
  ProtocolUpdateDto
} from '@cvg-his/domain';

import type { RequestContext } from '../../plugins/requestContext.js';
import { createProtocolsRepo, type ProtocolsRepo } from './repo.js';
import type { ProtocolRecord } from './types.js';

type DbClient = typeof import('@cvg-his/db').db;

type ServiceContext = {
  db: DbClient;
  requestContext: RequestContext;
};

type ServiceDependencies = {
  repo?: ProtocolsRepo;
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

export type CreateProtocolResult =
  | { kind: 'slug_conflict' }
  | { kind: 'created'; protocol: ProtocolRecord };

export type UpdateProtocolResult =
  | { kind: 'protocol_not_found' }
  | { kind: 'slug_conflict' }
  | { kind: 'updated'; protocol: ProtocolRecord };

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

function isDuplicateProtocolSlugError(error: unknown): error is MaybeDbError {
  if (typeof error !== 'object' || error === null) {
    return false;
  }

  const maybeDbError = error as MaybeDbError;
  return maybeDbError.code === '23505' && maybeDbError.constraint === 'uq_protocols_account_slug';
}

export function createProtocolsService(
  context: ServiceContext,
  dependencies: ServiceDependencies = {}
) {
  const repo = dependencies.repo ?? createProtocolsRepo(context.db);
  const appendAudit = dependencies.appendAudit ?? append;

  return {
    async create(input: ProtocolCreateDto): Promise<CreateProtocolResult> {
      const actor = ensureWriteActor(context.requestContext);
      let protocol: ProtocolRecord;

      try {
        protocol = await repo.create({
          accountId: actor.accountId,
          createdByUserId: actor.userId,
          ...input
        });
      } catch (error) {
        if (isDuplicateProtocolSlugError(error)) {
          return { kind: 'slug_conflict' };
        }

        throw error;
      }

      await appendAudit({
        accountId: actor.accountId,
        actorUserId: actor.userId,
        roles: actor.roles,
        action: 'ProtocolCreated',
        entityType: 'protocol',
        entityId: protocol.id,
        beforeJson: null,
        afterJson: protocol,
        requestId: context.requestContext.requestId
      });

      return {
        kind: 'created',
        protocol
      };
    },

    async getById(protocolId: string): Promise<ProtocolRecord | null> {
      const actor = ensureAccountActor(context.requestContext);
      return repo.findById(actor.accountId, protocolId);
    },

    async update(
      protocolId: string,
      patch: ProtocolUpdateDto
    ): Promise<UpdateProtocolResult> {
      const actor = ensureWriteActor(context.requestContext);
      const before = await repo.findById(actor.accountId, protocolId);

      if (!before) {
        return { kind: 'protocol_not_found' };
      }

      let after: ProtocolRecord | null;
      try {
        after = await repo.updateById({
          accountId: actor.accountId,
          protocolId,
          patch,
          updatedByUserId: actor.userId
        });
      } catch (error) {
        if (isDuplicateProtocolSlugError(error)) {
          return { kind: 'slug_conflict' };
        }

        throw error;
      }

      if (!after) {
        return { kind: 'protocol_not_found' };
      }

      await appendAudit({
        accountId: actor.accountId,
        actorUserId: actor.userId,
        roles: actor.roles,
        action: 'ProtocolUpdated',
        entityType: 'protocol',
        entityId: protocolId,
        beforeJson: before,
        afterJson: after,
        requestId: context.requestContext.requestId
      });

      return {
        kind: 'updated',
        protocol: after
      };
    },

    async list(query: {
      q?: string;
      status?: 'draft' | 'published';
      specialty?: string;
      domain?: string;
      page: number;
      pageSize: number;
    }) {
      const actor = ensureAccountActor(context.requestContext);
      return repo.list({
        accountId: actor.accountId,
        q: query.q,
        status: query.status,
        specialty: query.specialty,
        domain: query.domain,
        page: query.page,
        pageSize: query.pageSize
      });
    }
  };
}
