import { append } from '@cvg-his/audit';

import type { RequestContext } from '../../plugins/requestContext.js';
import { createPatientsRepo } from './repo.js';
import type {
  CreatePatientBody,
  ListPatientsQuery,
  PatientRecord,
  UpdatePatientBody
} from './types.js';

type DbClient = typeof import('@cvg-his/db').db;

type ServiceContext = {
  db: DbClient;
  requestContext: RequestContext;
};

type CreatePatientResult =
  | {
      kind: 'owner_not_found';
    }
  | {
      kind: 'created';
      patient: PatientRecord;
    };

type UpdatePatientResult =
  | {
      kind: 'patient_not_found';
    }
  | {
      kind: 'owner_not_found';
    }
  | {
      kind: 'updated';
      patient: PatientRecord;
    };

function ensureActor(context: RequestContext) {
  const actor = context.actor;

  if (!actor?.accountId) {
    throw new Error('Actor context is required to access patients.');
  }

  return actor;
}

export function createPatientsService(context: ServiceContext) {
  const repo = createPatientsRepo(context.db);

  return {
    async create(input: CreatePatientBody): Promise<CreatePatientResult> {
      const actor = ensureActor(context.requestContext);
      const ownerExists = await repo.ownerExistsInAccount(actor.accountId, input.ownerId);

      if (!ownerExists) {
        return { kind: 'owner_not_found' };
      }

      const created = await repo.create({
        accountId: actor.accountId,
        unitId: actor.unitId ?? null,
        ...input
      });

      await append({
        accountId: actor.accountId,
        actorUserId: actor.userId,
        roles: actor.roles,
        entityType: 'patient',
        entityId: created.id,
        action: 'patient.create',
        beforeJson: null,
        afterJson: created,
        requestId: context.requestContext.requestId
      });

      return { kind: 'created', patient: created };
    },

    async getById(patientId: string) {
      const actor = ensureActor(context.requestContext);
      return repo.findById(actor.accountId, patientId);
    },

    async update(patientId: string, patch: UpdatePatientBody): Promise<UpdatePatientResult> {
      const actor = ensureActor(context.requestContext);
      const before = await repo.findById(actor.accountId, patientId);

      if (!before) {
        return { kind: 'patient_not_found' };
      }

      if (patch.ownerId) {
        const ownerExists = await repo.ownerExistsInAccount(actor.accountId, patch.ownerId);
        if (!ownerExists) {
          return { kind: 'owner_not_found' };
        }
      }

      const after = await repo.updateById(actor.accountId, patientId, patch);

      if (!after) {
        return { kind: 'patient_not_found' };
      }

      await append({
        accountId: actor.accountId,
        actorUserId: actor.userId,
        roles: actor.roles,
        entityType: 'patient',
        entityId: patientId,
        action: 'patient.update',
        beforeJson: before,
        afterJson: after,
        requestId: context.requestContext.requestId
      });

      return { kind: 'updated', patient: after };
    },

    async list(query: ListPatientsQuery) {
      const actor = ensureActor(context.requestContext);
      return repo.list({
        accountId: actor.accountId,
        page: query.page,
        pageSize: query.pageSize,
        ownerId: query.ownerId,
        species: query.species,
        q: query.q
      });
    }
  };
}
