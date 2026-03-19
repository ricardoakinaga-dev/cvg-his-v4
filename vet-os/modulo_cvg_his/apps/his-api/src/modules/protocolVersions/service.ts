import { append, type AppendAuditInput } from '@cvg-his/audit';
import type { ProtocolContentDto } from '@cvg-his/domain';

import type { RequestContext } from '../../plugins/requestContext.js';
import {
  createProtocolVersionsRepo,
  type ProtocolVersionRecord,
  type ProtocolVersionsRepo
} from './repo.js';
import {
  hasChangeReason,
  hasCriticalProtocolContentChange,
  isDraftVersion
} from './rules.js';

type DbClient = typeof import('@cvg-his/db').db;

type ServiceContext = {
  db: DbClient;
  requestContext: RequestContext;
};

type ServiceDependencies = {
  repo?: ProtocolVersionsRepo;
  appendAudit?: (input: AppendAuditInput) => Promise<unknown>;
};

type AccountActor = NonNullable<RequestContext['actor']> & {
  accountId: string;
};

type WriteActor = AccountActor & {
  userId: string;
};

export type CreateProtocolVersionResult =
  | { kind: 'protocol_not_found' }
  | { kind: 'created'; version: ProtocolVersionRecord };

export type ListProtocolVersionsResult =
  | { kind: 'protocol_not_found' }
  | {
      kind: 'ok';
      versions: {
        data: ProtocolVersionRecord[];
        page: number;
        pageSize: number;
        total: number;
      };
    };

export type EditProtocolVersionResult =
  | { kind: 'version_not_found' }
  | { kind: 'version_not_editable'; version: ProtocolVersionRecord }
  | { kind: 'change_reason_required' }
  | { kind: 'edited'; version: ProtocolVersionRecord };

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
    throw unauthorizedError('Missing actor context. Provide x-account-id header.');
  }

  return actor as AccountActor;
}

function ensureWriteActor(requestContext: RequestContext): WriteActor {
  const actor = ensureAccountActor(requestContext);

  if (!actor.userId) {
    throw unauthorizedError('Missing actor user context. Provide x-user-id header.');
  }

  return actor as WriteActor;
}

export function createProtocolVersionsService(
  context: ServiceContext,
  dependencies: ServiceDependencies = {}
) {
  const repo = dependencies.repo ?? createProtocolVersionsRepo(context.db);
  const appendAudit = dependencies.appendAudit ?? append;

  return {
    async createDraft(protocolId: string): Promise<CreateProtocolVersionResult> {
      const actor = ensureWriteActor(context.requestContext);
      const protocol = await repo.findProtocolInAccount(actor.accountId, protocolId);

      if (!protocol) {
        return { kind: 'protocol_not_found' };
      }

      const version = await repo.createDraftVersion({
        accountId: actor.accountId,
        protocolId,
        createdByUserId: actor.userId
      });

      if (!version) {
        return { kind: 'protocol_not_found' };
      }

      await appendAudit({
        accountId: actor.accountId,
        actorUserId: actor.userId,
        roles: actor.roles,
        action: 'ProtocolVersionCreated',
        entityType: 'protocol_version',
        entityId: version.id,
        beforeJson: null,
        afterJson: version,
        requestId: context.requestContext.requestId
      });

      return {
        kind: 'created',
        version
      };
    },

    async listByProtocol(
      protocolId: string,
      query: {
        page: number;
        pageSize: number;
      }
    ): Promise<ListProtocolVersionsResult> {
      const actor = ensureAccountActor(context.requestContext);
      const protocol = await repo.findProtocolInAccount(actor.accountId, protocolId);

      if (!protocol) {
        return { kind: 'protocol_not_found' };
      }

      const versions = await repo.listByProtocol({
        accountId: actor.accountId,
        protocolId,
        page: query.page,
        pageSize: query.pageSize
      });

      return {
        kind: 'ok',
        versions
      };
    },

    async getById(versionId: string): Promise<ProtocolVersionRecord | null> {
      const actor = ensureAccountActor(context.requestContext);
      return repo.findById(actor.accountId, versionId);
    },

    async editDraft(
      versionId: string,
      patch: {
        contentJson: ProtocolContentDto;
        changeReason?: string;
      }
    ): Promise<EditProtocolVersionResult> {
      const actor = ensureWriteActor(context.requestContext);
      const before = await repo.findById(actor.accountId, versionId);

      if (!before) {
        return { kind: 'version_not_found' };
      }

      if (!isDraftVersion(before.status)) {
        return {
          kind: 'version_not_editable',
          version: before
        };
      }

      const criticalChanged = hasCriticalProtocolContentChange(before.contentJson, patch.contentJson);
      if (criticalChanged && !hasChangeReason(patch.changeReason)) {
        return { kind: 'change_reason_required' };
      }

      const after = await repo.updateDraftById({
        accountId: actor.accountId,
        versionId,
        contentJson: patch.contentJson,
        changeReason: patch.changeReason,
        updatedByUserId: actor.userId
      });

      if (!after) {
        const current = await repo.findById(actor.accountId, versionId);
        if (!current) {
          return { kind: 'version_not_found' };
        }

        return {
          kind: 'version_not_editable',
          version: current
        };
      }

      await appendAudit({
        accountId: actor.accountId,
        actorUserId: actor.userId,
        roles: actor.roles,
        action: 'ProtocolVersionEdited',
        entityType: 'protocol_version',
        entityId: versionId,
        beforeJson: before,
        afterJson: after,
        reason: patch.changeReason,
        requestId: context.requestContext.requestId
      });

      return {
        kind: 'edited',
        version: after
      };
    }
  };
}
