import { randomUUID } from 'node:crypto';

import { append, type AppendAuditInput } from '@cvg-his/audit';
import type { DocumentCreateDto } from '@cvg-his/domain';

import type { RequestContext } from '../../plugins/requestContext.js';
import { appendSensitiveReadAudit } from '../iam/auditSensitiveAccess.js';
import {
  createDocumentsRepo,
  type DocumentRecord,
  type DocumentsRepo,
  type EncounterDocumentRecord
} from './repo.js';

type DbClient = typeof import('@cvg-his/db').db;

type ServiceContext = {
  db: DbClient;
  requestContext: RequestContext;
};

type ServiceDependencies = {
  repo?: DocumentsRepo;
  appendAudit?: (input: AppendAuditInput) => Promise<unknown>;
};

type AccountActor = NonNullable<RequestContext['actor']> & {
  accountId: string;
};

type WriteActor = AccountActor & {
  userId: string;
};

export type AttachDocumentResult =
  | {
      kind: 'encounter_not_found';
    }
  | {
      kind: 'document_not_found';
    }
  | {
      kind: 'attached';
      relation: EncounterDocumentRecord;
      alreadyAttached: boolean;
    };

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

function buildStorageKey(accountId: string, filename: string): string {
  const safeName = filename.replace(/[^\w.\-]/g, '_');
  return `${accountId}/${Date.now()}-${randomUUID()}-${safeName}`;
}

export function createDocumentsService(context: ServiceContext, dependencies: ServiceDependencies = {}) {
  const repo = dependencies.repo ?? createDocumentsRepo(context.db);
  const appendAudit = dependencies.appendAudit ?? append;

  return {
    async create(input: DocumentCreateDto): Promise<DocumentRecord> {
      const actor = ensureWriteActor(context.requestContext);
      const storageKey = buildStorageKey(actor.accountId, input.filename);
      const document = await repo.create({
        accountId: actor.accountId,
        storageKey,
        createdByUserId: actor.userId,
        payload: input
      });

      await appendAudit({
        accountId: actor.accountId,
        actorUserId: actor.userId,
        roles: actor.roles,
        entityType: 'document',
        entityId: document.id,
        action: 'document.create',
        beforeJson: null,
        afterJson: document,
        requestId: context.requestContext.requestId
      });

      return document;
    },

    async getById(documentId: string): Promise<DocumentRecord | null> {
      const actor = ensureAccountActor(context.requestContext);
      const document = await repo.findById(actor.accountId, documentId);

      if (document) {
        await appendSensitiveReadAudit({
          requestContext: context.requestContext,
          entityType: 'document',
          entityId: documentId,
          action: 'document.read',
          reason: 'medical_record_document_access',
          afterJson: {
            filename: document.filename,
            mimeType: document.mimeType
          }
        });
      }

      return document;
    },

    async attachToEncounter(encounterId: string, documentId: string): Promise<AttachDocumentResult> {
      const actor = ensureWriteActor(context.requestContext);
      const encounterExists = await repo.encounterExistsInAccount(actor.accountId, encounterId);

      if (!encounterExists) {
        return { kind: 'encounter_not_found' };
      }

      const document = await repo.findById(actor.accountId, documentId);

      if (!document) {
        return { kind: 'document_not_found' };
      }

      const attached = await repo.attachToEncounter({
        accountId: actor.accountId,
        encounterId,
        documentId,
        attachedByUserId: actor.userId
      });

      if (!attached) {
        return { kind: 'document_not_found' };
      }

      await appendAudit({
        accountId: actor.accountId,
        actorUserId: actor.userId,
        roles: actor.roles,
        entityType: 'encounter',
        entityId: encounterId,
        action: attached.alreadyAttached ? 'encounter.document.attach.duplicate' : 'encounter.document.attach',
        beforeJson: null,
        afterJson: {
          documentId,
          relationId: attached.relation.id,
          alreadyAttached: attached.alreadyAttached
        },
        requestId: context.requestContext.requestId
      });

      return {
        kind: 'attached',
        relation: attached.relation,
        alreadyAttached: attached.alreadyAttached
      };
    }
  };
}
