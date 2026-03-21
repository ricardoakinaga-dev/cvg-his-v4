import { append, type AppendAuditInput } from '@cvg-his/audit';
import type { EncounterCloseDto, EncounterCreateDto } from '@cvg-his/domain';

import type { RequestContext } from '../../plugins/requestContext.js';
import { appendSensitiveReadAudit } from '../iam/auditSensitiveAccess.js';
import {
  createEncountersRepo,
  type EncounterRecord,
  type EncountersRepo
} from './repo.js';

type DbClient = typeof import('@cvg-his/db').db;

type ServiceContext = {
  db: DbClient;
  requestContext: RequestContext;
};

type ServiceDependencies = {
  repo?: EncountersRepo;
  appendAudit?: (input: AppendAuditInput) => Promise<unknown>;
};

type AccountActor = NonNullable<RequestContext['actor']> & {
  accountId: string;
};

type WriteActor = AccountActor & {
  userId: string;
};

export type CreateEncounterResult =
  | {
      kind: 'patient_not_found';
    }
  | {
      kind: 'created';
      encounter: EncounterRecord;
    };

export type CloseEncounterResult =
  | {
      kind: 'encounter_not_found';
    }
  | {
      kind: 'already_closed';
      encounter: EncounterRecord;
    }
  | {
      kind: 'closed';
      encounter: EncounterRecord;
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

export function createEncountersService(context: ServiceContext, dependencies: ServiceDependencies = {}) {
  const repo = dependencies.repo ?? createEncountersRepo(context.db);
  const appendAudit = dependencies.appendAudit ?? append;

  return {
    async create(input: EncounterCreateDto): Promise<CreateEncounterResult> {
      const actor = ensureWriteActor(context.requestContext);
      const patientRef = await repo.findPatientInAccount(actor.accountId, input.patientId);

      if (!patientRef) {
        return { kind: 'patient_not_found' };
      }

      const encounter = await repo.create({
        accountId: actor.accountId,
        patientId: input.patientId,
        ownerId: patientRef.ownerId,
        openedByUserId: actor.userId,
        reason: input.reason
      });

      await appendAudit({
        accountId: actor.accountId,
        actorUserId: actor.userId,
        roles: actor.roles,
        entityType: 'encounter',
        entityId: encounter.id,
        action: 'encounter.create',
        beforeJson: null,
        afterJson: encounter,
        requestId: context.requestContext.requestId
      });

      return {
        kind: 'created',
        encounter
      };
    },

    async getById(encounterId: string): Promise<EncounterRecord | null> {
      const actor = ensureAccountActor(context.requestContext);
      const encounter = await repo.findById(actor.accountId, encounterId);

      if (encounter) {
        await appendSensitiveReadAudit({
          requestContext: context.requestContext,
          entityType: 'encounter',
          entityId: encounterId,
          action: 'encounter.read',
          reason: 'medical_record_detail_access',
          afterJson: {
            status: encounter.status,
            patientId: encounter.patientId
          }
        });
      }

      return encounter;
    },

    async list(input: { patientId?: string; page: number; pageSize: number }) {
      const actor = ensureAccountActor(context.requestContext);
      return repo.list({
        accountId: actor.accountId,
        patientId: input.patientId,
        page: input.page,
        pageSize: input.pageSize
      });
    },

    async getTimeline(encounterId: string) {
      const actor = ensureAccountActor(context.requestContext);
      const timeline = await repo.getTimeline(actor.accountId, encounterId);

      if (timeline) {
        await appendSensitiveReadAudit({
          requestContext: context.requestContext,
          entityType: 'encounter',
          entityId: encounterId,
          action: 'encounter.timeline.read',
          reason: 'medical_record_timeline_access',
          afterJson: {
            itemCount: Array.isArray(timeline.timeline) ? timeline.timeline.length : undefined
          }
        });
      }

      return timeline;
    },

    async close(encounterId: string, input: EncounterCloseDto): Promise<CloseEncounterResult> {
      const actor = ensureWriteActor(context.requestContext);
      const before = await repo.findById(actor.accountId, encounterId);

      if (!before) {
        return { kind: 'encounter_not_found' };
      }

      if (before.status === 'closed') {
        return {
          kind: 'already_closed',
          encounter: before
        };
      }

      const after = await repo.closeById({
        accountId: actor.accountId,
        encounterId,
        closedByUserId: actor.userId,
        reason: input.reason
      });

      if (!after) {
        return {
          kind: 'already_closed',
          encounter: before
        };
      }

      await appendAudit({
        accountId: actor.accountId,
        actorUserId: actor.userId,
        roles: actor.roles,
        entityType: 'encounter',
        entityId: encounterId,
        action: 'encounter.close',
        beforeJson: before,
        afterJson: after,
        reason: input.reason,
        requestId: context.requestContext.requestId
      });

      return {
        kind: 'closed',
        encounter: after
      };
    }
  };
}
