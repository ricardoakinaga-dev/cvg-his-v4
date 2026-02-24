import { append, type AppendAuditInput } from '@cvg-his/audit';
import type { HandoverDraftDto } from '@cvg-his/domain';

import type { HandoverBuildEnqueueResult, HandoverBuildJobData } from '../../lib/queues.js';
import type { RequestContext } from '../../plugins/requestContext.js';
import {
  createHandoversRepo,
  type HandoverDocumentRecord,
  type HandoversRepo,
  type HandoverWithItems,
  type InpatientStayReference
} from './repo.js';
import { validateHandoverPublishOrThrow } from './validator.js';

type DbClient = typeof import('@cvg-his/db').db;

type ServiceContext = {
  db: DbClient;
  requestContext: RequestContext;
};

type ServiceDependencies = {
  repo?: HandoversRepo;
  appendAudit?: (input: AppendAuditInput) => Promise<unknown>;
  enqueueHandoverBuild?: (payload: HandoverBuildJobData) => Promise<HandoverBuildEnqueueResult>;
};

type AccountActor = NonNullable<RequestContext['actor']> & {
  accountId: string;
};

type WriteActor = AccountActor & {
  userId: string;
};

type BuildDraftItem = HandoverDraftDto['items'][number] & {
  stayRef: InpatientStayReference;
};

export type CreateDraftResult =
  | { kind: 'ward_not_found' }
  | { kind: 'stay_not_found'; stayId: string }
  | { kind: 'stay_ward_mismatch'; stayId: string }
  | { kind: 'created'; handover: HandoverWithItems };

export type PublishResult =
  | { kind: 'handover_not_found' }
  | { kind: 'handover_not_draft'; handover: HandoverWithItems }
  | {
      kind: 'published';
      handover: HandoverWithItems;
      job: HandoverBuildEnqueueResult;
    };

export type HandoverDocumentResult =
  | { kind: 'handover_not_found' }
  | { kind: 'document_not_found' }
  | { kind: 'found'; document: HandoverDocumentRecord };

function unauthorizedError(message: string): Error & { statusCode: 401; code: 'UNAUTHORIZED' } {
  const error = new Error(message) as Error & {
    statusCode: 401;
    code: 'UNAUTHORIZED';
  };

  error.statusCode = 401;
  error.code = 'UNAUTHORIZED';
  return error;
}

function queueUnavailableError(message: string): Error & { statusCode: 503; code: 'QUEUE_UNAVAILABLE' } {
  const error = new Error(message) as Error & {
    statusCode: 503;
    code: 'QUEUE_UNAVAILABLE';
  };

  error.statusCode = 503;
  error.code = 'QUEUE_UNAVAILABLE';
  return error;
}

function normalizeBuildError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  return message.slice(0, 4000);
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

function dedupe(values: string[]): string[] {
  return Array.from(new Set(values));
}

function buildPatientSnapshot(
  item: HandoverDraftDto['items'][number],
  stayRef: InpatientStayReference
): Record<string, unknown> {
  if (item.patient_snapshot_json && Object.keys(item.patient_snapshot_json).length > 0) {
    return item.patient_snapshot_json;
  }

  return {
    patientId: stayRef.patientId,
    patientName: stayRef.patientName,
    species: stayRef.species,
    ownerId: stayRef.ownerId,
    wardId: stayRef.wardId
  };
}

export function createHandoversService(
  context: ServiceContext,
  dependencies: ServiceDependencies = {}
) {
  const repo = dependencies.repo ?? createHandoversRepo(context.db);
  const appendAudit = dependencies.appendAudit ?? append;

  return {
    async createDraft(input: HandoverDraftDto): Promise<CreateDraftResult> {
      const actor = ensureWriteActor(context.requestContext);
      const wardExists = await repo.wardExistsInAccount(actor.accountId, input.wardId);

      if (!wardExists) {
        return { kind: 'ward_not_found' };
      }

      const stayIds = dedupe(input.items.map((item) => item.stayId));
      const stayRefs = await repo.findStaysByIds(actor.accountId, stayIds);
      const stayById = new Map(stayRefs.map((stay) => [stay.stayId, stay]));

      const itemsWithStays: BuildDraftItem[] = [];

      for (const item of input.items) {
        const stayRef = stayById.get(item.stayId);
        if (!stayRef) {
          return {
            kind: 'stay_not_found',
            stayId: item.stayId
          };
        }

        if (stayRef.wardId !== input.wardId) {
          return {
            kind: 'stay_ward_mismatch',
            stayId: item.stayId
          };
        }

        itemsWithStays.push({
          ...item,
          stayRef
        });
      }

      const created = await repo.createDraft({
        accountId: actor.accountId,
        wardId: input.wardId,
        shiftDate: input.shiftDate,
        shiftPeriod: input.shiftPeriod,
        items: itemsWithStays.map((item) => ({
          stayId: item.stayId,
          patientSnapshotJson: buildPatientSnapshot(item, item.stayRef),
          problemsJson: item.problems_json,
          planJson: item.plan_json,
          criticalMedsJson: item.critical_meds_json,
          alertsJson: item.alerts_json,
          pendingJson: item.pending_json,
          escalationJson: item.escalation_json,
          notes: item.notes
        }))
      });

      await appendAudit({
        accountId: actor.accountId,
        actorUserId: actor.userId,
        roles: actor.roles,
        action: 'HandoverDraftCreated',
        entityType: 'shift_handover',
        entityId: created.handover.id,
        beforeJson: null,
        afterJson: created,
        requestId: context.requestContext.requestId
      });

      return {
        kind: 'created',
        handover: created
      };
    },

    async publish(handoverId: string): Promise<PublishResult> {
      const actor = ensureWriteActor(context.requestContext);
      const enqueueHandoverBuild = dependencies.enqueueHandoverBuild;
      if (!enqueueHandoverBuild) {
        throw queueUnavailableError('Queue publisher is not configured for handover build jobs.');
      }

      const before = await repo.findById(actor.accountId, handoverId);

      if (!before) {
        return { kind: 'handover_not_found' };
      }

      let after: HandoverWithItems | null = null;

      if (before.handover.status === 'draft') {
        validateHandoverPublishOrThrow(before);

        const published = await repo.publish({
          accountId: actor.accountId,
          handoverId,
          publishedByUserId: actor.userId
        });

        if (!published) {
          const current = await repo.findById(actor.accountId, handoverId);
          if (!current) {
            return { kind: 'handover_not_found' };
          }

          return {
            kind: 'handover_not_draft',
            handover: current
          };
        }

        after = await repo.findById(actor.accountId, handoverId);
        if (!after) {
          return { kind: 'handover_not_found' };
        }

        await appendAudit({
          accountId: actor.accountId,
          actorUserId: actor.userId,
          roles: actor.roles,
          action: 'HandoverPublished',
          entityType: 'shift_handover',
          entityId: handoverId,
          beforeJson: before,
          afterJson: after,
          requestId: context.requestContext.requestId
        });
      } else if (before.handover.status === 'published' && before.handover.buildStatus === 'failed') {
        const retried = await repo.markBuildPendingForRetry({
          accountId: actor.accountId,
          handoverId
        });

        if (!retried) {
          const current = await repo.findById(actor.accountId, handoverId);
          if (!current) {
            return { kind: 'handover_not_found' };
          }

          return {
            kind: 'handover_not_draft',
            handover: current
          };
        }

        after = await repo.findById(actor.accountId, handoverId);
        if (!after) {
          return { kind: 'handover_not_found' };
        }

        await appendAudit({
          accountId: actor.accountId,
          actorUserId: actor.userId,
          roles: actor.roles,
          action: 'HandoverPublishRetryQueued',
          entityType: 'shift_handover',
          entityId: handoverId,
          beforeJson: before,
          afterJson: after,
          requestId: context.requestContext.requestId
        });
      } else {
        return {
          kind: 'handover_not_draft',
          handover: before
        };
      }

      if (!after) {
        return { kind: 'handover_not_found' };
      }

      let job: HandoverBuildEnqueueResult;
      try {
        job = await enqueueHandoverBuild({
          handoverId,
          accountId: actor.accountId,
          wardId: after.handover.wardId,
          requestedByUserId: actor.userId,
          requestId: context.requestContext.requestId
        });
      } catch (error) {
        const failedHandover = await repo.markBuildFailed({
          accountId: actor.accountId,
          handoverId,
          buildError: `enqueue_failed: ${normalizeBuildError(error)}`
        });

        if (!failedHandover) {
          throw queueUnavailableError(
            'Failed to enqueue handover build job and failed to persist build_status=failed'
          );
        }

        throw queueUnavailableError(
          `Failed to enqueue handover build job: ${error instanceof Error ? error.message : 'unknown error'}`
        );
      }

      return {
        kind: 'published',
        handover: after,
        job
      };
    },

    async getById(handoverId: string): Promise<HandoverWithItems | null> {
      const actor = ensureAccountActor(context.requestContext);
      return repo.findById(actor.accountId, handoverId);
    },

    async getLatestByWard(wardId: string): Promise<HandoverWithItems | null> {
      const actor = ensureAccountActor(context.requestContext);
      return repo.findLatestPublished(actor.accountId, wardId);
    },

    async getDocumentByHandoverId(handoverId: string): Promise<HandoverDocumentResult> {
      const actor = ensureAccountActor(context.requestContext);
      const handover = await repo.findById(actor.accountId, handoverId);

      if (!handover) {
        return { kind: 'handover_not_found' };
      }

      const document = await repo.findDocumentByHandoverId(actor.accountId, handoverId);

      if (!document) {
        return { kind: 'document_not_found' };
      }

      return {
        kind: 'found',
        document
      };
    }
  };
}
