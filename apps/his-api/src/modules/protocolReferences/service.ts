import { append, type AppendAuditInput } from '@cvg-his/audit';

import type { RequestContext } from '../../plugins/requestContext.js';
import {
  createProtocolReferencesRepo,
  type ProtocolReferenceRecord,
  type ProtocolReferenceType,
  type ProtocolReferencesRepo
} from './repo.js';
import type { ProtocolReferenceSuggestHit, ProtocolReferencesSuggestAdapter } from './qdrant.js';

type DbClient = typeof import('@cvg-his/db').db;

type ServiceContext = {
  db: DbClient;
  requestContext: RequestContext;
};

type ServiceDependencies = {
  repo?: ProtocolReferencesRepo;
  appendAudit?: (input: AppendAuditInput) => Promise<unknown>;
  suggestAdapter?: ProtocolReferencesSuggestAdapter | null;
};

type AccountActor = NonNullable<RequestContext['actor']> & {
  accountId: string;
};

type WriteActor = AccountActor & {
  userId: string;
};

type AddReferenceInput = {
  refType: ProtocolReferenceType;
  title?: string;
  url?: string;
  sourceId?: string;
  score?: number;
  metadataJson?: Record<string, unknown>;
};

export type ListProtocolReferencesResult =
  | { kind: 'protocol_not_found' }
  | { kind: 'ok'; references: ProtocolReferenceRecord[] };

export type AddProtocolReferenceResult =
  | { kind: 'protocol_not_found' }
  | { kind: 'created'; reference: ProtocolReferenceRecord };

export type RemoveProtocolReferenceResult =
  | { kind: 'protocol_not_found' }
  | { kind: 'reference_not_found' }
  | { kind: 'removed'; reference: ProtocolReferenceRecord };

export type SuggestProtocolReferencesResult =
  | { kind: 'protocol_not_found' }
  | { kind: 'qdrant_unavailable'; message: string }
  | { kind: 'ok'; hits: ProtocolReferenceSuggestHit[] };

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

export function createProtocolReferencesService(
  context: ServiceContext,
  dependencies: ServiceDependencies = {}
) {
  const repo = dependencies.repo ?? createProtocolReferencesRepo(context.db);
  const appendAudit = dependencies.appendAudit ?? append;
  const suggestAdapter = dependencies.suggestAdapter ?? null;

  return {
    async list(protocolId: string): Promise<ListProtocolReferencesResult> {
      const actor = ensureAccountActor(context.requestContext);
      const protocolExists = await repo.protocolExistsInAccount(actor.accountId, protocolId);

      if (!protocolExists) {
        return { kind: 'protocol_not_found' };
      }

      const references = await repo.listByProtocol(actor.accountId, protocolId);
      return { kind: 'ok', references };
    },

    async add(protocolId: string, input: AddReferenceInput): Promise<AddProtocolReferenceResult> {
      const actor = ensureWriteActor(context.requestContext);
      const protocolExists = await repo.protocolExistsInAccount(actor.accountId, protocolId);

      if (!protocolExists) {
        return { kind: 'protocol_not_found' };
      }

      const created = await repo.create({
        accountId: actor.accountId,
        protocolId,
        refType: input.refType,
        title: input.title,
        url: input.url,
        sourceId: input.sourceId,
        score: input.score,
        metadataJson: input.metadataJson,
        createdByUserId: actor.userId
      });

      await appendAudit({
        accountId: actor.accountId,
        actorUserId: actor.userId,
        roles: actor.roles,
        action: 'ProtocolReferenceAdded',
        entityType: 'protocol_reference',
        entityId: created.id,
        beforeJson: null,
        afterJson: created,
        requestId: context.requestContext.requestId
      });

      return {
        kind: 'created',
        reference: created
      };
    },

    async remove(protocolId: string, refId: string): Promise<RemoveProtocolReferenceResult> {
      const actor = ensureWriteActor(context.requestContext);
      const protocolExists = await repo.protocolExistsInAccount(actor.accountId, protocolId);

      if (!protocolExists) {
        return { kind: 'protocol_not_found' };
      }

      const before = await repo.findById(actor.accountId, protocolId, refId);
      if (!before) {
        return { kind: 'reference_not_found' };
      }

      const removed = await repo.deleteById(actor.accountId, protocolId, refId);
      if (!removed) {
        return { kind: 'reference_not_found' };
      }

      await appendAudit({
        accountId: actor.accountId,
        actorUserId: actor.userId,
        roles: actor.roles,
        action: 'ProtocolReferenceRemoved',
        entityType: 'protocol_reference',
        entityId: refId,
        beforeJson: before,
        afterJson: null,
        requestId: context.requestContext.requestId
      });

      return {
        kind: 'removed',
        reference: removed
      };
    },

    async suggest(
      protocolId: string,
      query: {
        q: string;
        limit: number;
      }
    ): Promise<SuggestProtocolReferencesResult> {
      const actor = ensureAccountActor(context.requestContext);
      const protocolExists = await repo.protocolExistsInAccount(actor.accountId, protocolId);

      if (!protocolExists) {
        return { kind: 'protocol_not_found' };
      }

      if (!suggestAdapter) {
        return {
          kind: 'qdrant_unavailable',
          message: 'QDRANT_URL is not configured. Suggestions are unavailable.'
        };
      }

      try {
        const hits = await suggestAdapter.suggest({
          q: query.q,
          limit: query.limit
        });

        return {
          kind: 'ok',
          hits
        };
      } catch (error) {
        return {
          kind: 'qdrant_unavailable',
          message: `Failed to query Qdrant: ${error instanceof Error ? error.message : 'unknown error'}`
        };
      }
    }
  };
}
