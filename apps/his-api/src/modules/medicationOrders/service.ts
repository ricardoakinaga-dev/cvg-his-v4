import { append, type AppendAuditInput } from '@cvg-his/audit';
import type {
  MedicationOrderCreateDto,
  MedicationOrderStopDto,
  MedicationOrderUpdateDto
} from '@cvg-his/domain';

import type { RequestContext } from '../../plugins/requestContext.js';
import {
  createMedicationOrdersRepo,
  type MedicationOrdersRepo
} from './repo.js';
import type { MedicationOrderRecord } from './types.js';

type DbClient = typeof import('@cvg-his/db').db;

type ServiceContext = {
  db: DbClient;
  requestContext: RequestContext;
};

type ServiceDependencies = {
  repo?: MedicationOrdersRepo;
  appendAudit?: (input: AppendAuditInput) => Promise<unknown>;
};

type AccountActor = NonNullable<RequestContext['actor']> & {
  accountId: string;
};

type WriteActor = AccountActor & {
  userId: string;
};

export type CreateMedicationOrderResult =
  | { kind: 'patient_not_found' }
  | { kind: 'stay_not_found' }
  | { kind: 'encounter_not_found' }
  | { kind: 'patient_mismatch'; message: string }
  | { kind: 'created'; order: MedicationOrderRecord };

export type UpdateMedicationOrderResult =
  | { kind: 'order_not_found' }
  | { kind: 'order_stopped'; order: MedicationOrderRecord }
  | { kind: 'updated'; order: MedicationOrderRecord };

export type StopMedicationOrderResult =
  | { kind: 'order_not_found' }
  | { kind: 'already_stopped'; order: MedicationOrderRecord }
  | { kind: 'stopped'; order: MedicationOrderRecord };

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

export function createMedicationOrdersService(
  context: ServiceContext,
  dependencies: ServiceDependencies = {}
) {
  const repo = dependencies.repo ?? createMedicationOrdersRepo(context.db);
  const appendAudit = dependencies.appendAudit ?? append;

  return {
    async create(input: MedicationOrderCreateDto): Promise<CreateMedicationOrderResult> {
      const actor = ensureWriteActor(context.requestContext);
      const patient = await repo.findPatientInAccount(actor.accountId, input.patientId);

      if (!patient) {
        return { kind: 'patient_not_found' };
      }

      if (input.stayId) {
        const stay = await repo.findStayInAccount(actor.accountId, input.stayId);
        if (!stay) {
          return { kind: 'stay_not_found' };
        }
        if (stay.patientId !== input.patientId) {
          return {
            kind: 'patient_mismatch',
            message: 'O paciente da internação não corresponde ao paciente selecionado.'
          };
        }
      }

      if (input.encounterId) {
        const encounter = await repo.findEncounterInAccount(actor.accountId, input.encounterId);
        if (!encounter) {
          return { kind: 'encounter_not_found' };
        }
        if (encounter.patientId !== input.patientId) {
          return {
            kind: 'patient_mismatch',
            message: 'O paciente do atendimento não corresponde ao paciente selecionado.'
          };
        }
      }

      const order = await repo.create({
        accountId: actor.accountId,
        createdByUserId: actor.userId,
        ...input
      });

      await appendAudit({
        accountId: actor.accountId,
        actorUserId: actor.userId,
        roles: actor.roles,
        action: 'MedicationOrderCreated',
        entityType: 'medication_order',
        entityId: order.id,
        beforeJson: null,
        afterJson: order,
        requestId: context.requestContext.requestId
      });

      return {
        kind: 'created',
        order
      };
    },

    async getById(orderId: string): Promise<MedicationOrderRecord | null> {
      const actor = ensureAccountActor(context.requestContext);
      return repo.findById(actor.accountId, orderId);
    },

    async list(query: {
      encounterId?: string;
      stayId?: string;
      status?: 'active' | 'stopped';
      page: number;
      pageSize: number;
    }) {
      const actor = ensureAccountActor(context.requestContext);
      return repo.list({
        accountId: actor.accountId,
        encounterId: query.encounterId,
        stayId: query.stayId,
        status: query.status,
        page: query.page,
        pageSize: query.pageSize
      });
    },

    async update(
      orderId: string,
      patch: MedicationOrderUpdateDto
    ): Promise<UpdateMedicationOrderResult> {
      const actor = ensureWriteActor(context.requestContext);
      const before = await repo.findById(actor.accountId, orderId);

      if (!before) {
        return { kind: 'order_not_found' };
      }

      if (before.status === 'stopped') {
        return {
          kind: 'order_stopped',
          order: before
        };
      }

      const after = await repo.updateById({
        accountId: actor.accountId,
        orderId,
        patch
      });

      if (!after) {
        return { kind: 'order_not_found' };
      }

      await appendAudit({
        accountId: actor.accountId,
        actorUserId: actor.userId,
        roles: actor.roles,
        action: 'MedicationOrderUpdated',
        entityType: 'medication_order',
        entityId: orderId,
        beforeJson: before,
        afterJson: after,
        requestId: context.requestContext.requestId
      });

      return {
        kind: 'updated',
        order: after
      };
    },

    async stop(orderId: string, input: MedicationOrderStopDto): Promise<StopMedicationOrderResult> {
      const actor = ensureWriteActor(context.requestContext);
      const before = await repo.findById(actor.accountId, orderId);

      if (!before) {
        return { kind: 'order_not_found' };
      }

      if (before.status === 'stopped') {
        return {
          kind: 'already_stopped',
          order: before
        };
      }

      const after = await repo.stopById({
        accountId: actor.accountId,
        orderId,
        stopReason: input.stopReason,
        stoppedByUserId: actor.userId
      });

      if (!after) {
        return {
          kind: 'already_stopped',
          order: before
        };
      }

      await appendAudit({
        accountId: actor.accountId,
        actorUserId: actor.userId,
        roles: actor.roles,
        action: 'MedicationOrderStopped',
        entityType: 'medication_order',
        entityId: orderId,
        beforeJson: before,
        afterJson: after,
        reason: input.stopReason,
        requestId: context.requestContext.requestId
      });

      return {
        kind: 'stopped',
        order: after
      };
    }
  };
}

