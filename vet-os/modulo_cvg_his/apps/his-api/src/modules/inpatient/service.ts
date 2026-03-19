import { append } from '@cvg-his/audit';
import type {
  InpatientAdmitDto,
  InpatientDischargeDto,
  InpatientTransferDto
} from '@cvg-his/domain';

import type { RequestContext } from '../../plugins/requestContext.js';
import {
  bedBelongsToWard,
  isActiveBedConflictError,
  isActiveStay
} from './rules.js';
import { createInpatientRepo, type InpatientRepo, type InpatientStayRecord, type InpatientStayStatus } from './repo.js';

type DbClient = typeof import('@cvg-his/db').db;

type ServiceContext = {
  db: DbClient;
  requestContext: RequestContext;
};

type ServiceDependencies = {
  repo?: InpatientRepo;
  appendAudit?: typeof append;
};

type AccountActor = NonNullable<RequestContext['actor']> & {
  accountId: string;
};

type WriteActor = AccountActor & {
  userId: string;
};

export type AdmitResult =
  | { kind: 'patient_not_found' }
  | { kind: 'ward_not_found' }
  | { kind: 'bed_not_found' }
  | { kind: 'bed_inactive' }
  | { kind: 'bed_ward_mismatch' }
  | { kind: 'bed_occupied' }
  | { kind: 'admitted'; stay: InpatientStayRecord };

export type TransferResult =
  | { kind: 'stay_not_found' }
  | { kind: 'stay_not_active'; stay: InpatientStayRecord }
  | { kind: 'ward_not_found' }
  | { kind: 'bed_not_found' }
  | { kind: 'bed_inactive' }
  | { kind: 'bed_ward_mismatch' }
  | { kind: 'bed_occupied' }
  | { kind: 'transferred'; stay: InpatientStayRecord };

export type DischargeResult =
  | { kind: 'stay_not_found' }
  | { kind: 'stay_not_active'; stay: InpatientStayRecord }
  | { kind: 'discharged'; stay: InpatientStayRecord };

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

export function createInpatientService(
  context: ServiceContext,
  dependencies: ServiceDependencies = {}
) {
  const repo = dependencies.repo ?? createInpatientRepo(context.db);
  const appendAudit = dependencies.appendAudit ?? append;

  return {
    async admit(input: InpatientAdmitDto): Promise<AdmitResult> {
      const actor = ensureWriteActor(context.requestContext);
      const patientRef = await repo.findPatientInAccount(actor.accountId, input.patientId);

      if (!patientRef) {
        return { kind: 'patient_not_found' };
      }

      const wardExists = await repo.wardExistsInAccount(actor.accountId, input.wardId);
      if (!wardExists) {
        return { kind: 'ward_not_found' };
      }

      const bed = await repo.findBedInAccount(actor.accountId, input.bedId);
      if (!bed) {
        return { kind: 'bed_not_found' };
      }

      if (!bed.isActive) {
        return { kind: 'bed_inactive' };
      }

      if (!bedBelongsToWard(bed.wardId, input.wardId)) {
        return { kind: 'bed_ward_mismatch' };
      }

      const occupied = await repo.hasActiveStayInBed(actor.accountId, input.bedId);
      if (occupied) {
        return { kind: 'bed_occupied' };
      }

      let stay: InpatientStayRecord;
      try {
        stay = await repo.admit({
          accountId: actor.accountId,
          patientId: patientRef.patientId,
          ownerId: patientRef.ownerId,
          encounterId: input.encounterId,
          wardId: input.wardId,
          bedId: input.bedId,
          admittedByUserId: actor.userId,
          chiefComplaint: input.chiefComplaint,
          reason: input.reason,
          planSummary: input.planSummary
        });
      } catch (error) {
        if (isActiveBedConflictError(error)) {
          return { kind: 'bed_occupied' };
        }
        throw error;
      }

      await appendAudit({
        accountId: actor.accountId,
        actorUserId: actor.userId,
        roles: actor.roles,
        action: 'InpatientAdmitted',
        entityType: 'inpatient_stay',
        entityId: stay.id,
        beforeJson: null,
        afterJson: stay,
        reason: input.reason ?? input.chiefComplaint,
        requestId: context.requestContext.requestId
      });

      return {
        kind: 'admitted',
        stay
      };
    },

    async transfer(stayId: string, input: InpatientTransferDto): Promise<TransferResult> {
      const actor = ensureWriteActor(context.requestContext);
      const before = await repo.findStayById(actor.accountId, stayId);

      if (!before) {
        return { kind: 'stay_not_found' };
      }

      if (!isActiveStay(before.status)) {
        return { kind: 'stay_not_active', stay: before };
      }

      const wardExists = await repo.wardExistsInAccount(actor.accountId, input.toWardId);
      if (!wardExists) {
        return { kind: 'ward_not_found' };
      }

      const bed = await repo.findBedInAccount(actor.accountId, input.toBedId);
      if (!bed) {
        return { kind: 'bed_not_found' };
      }

      if (!bed.isActive) {
        return { kind: 'bed_inactive' };
      }

      if (!bedBelongsToWard(bed.wardId, input.toWardId)) {
        return { kind: 'bed_ward_mismatch' };
      }

      const occupied = await repo.hasActiveStayInBed(actor.accountId, input.toBedId, stayId);
      if (occupied) {
        return { kind: 'bed_occupied' };
      }

      let after: InpatientStayRecord | null;
      try {
        after = await repo.transfer({
          accountId: actor.accountId,
          stayId,
          toWardId: input.toWardId,
          toBedId: input.toBedId,
          reason: input.reason
        });
      } catch (error) {
        if (isActiveBedConflictError(error)) {
          return { kind: 'bed_occupied' };
        }
        throw error;
      }

      if (!after) {
        const current = await repo.findStayById(actor.accountId, stayId);
        if (!current) {
          return { kind: 'stay_not_found' };
        }
        return { kind: 'stay_not_active', stay: current };
      }

      await appendAudit({
        accountId: actor.accountId,
        actorUserId: actor.userId,
        roles: actor.roles,
        action: 'InpatientTransferred',
        entityType: 'inpatient_stay',
        entityId: stayId,
        beforeJson: before,
        afterJson: after,
        reason: input.reason,
        requestId: context.requestContext.requestId
      });

      return {
        kind: 'transferred',
        stay: after
      };
    },

    async discharge(stayId: string, input: InpatientDischargeDto): Promise<DischargeResult> {
      const actor = ensureWriteActor(context.requestContext);
      const before = await repo.findStayById(actor.accountId, stayId);

      if (!before) {
        return { kind: 'stay_not_found' };
      }

      if (!isActiveStay(before.status)) {
        return { kind: 'stay_not_active', stay: before };
      }

      const after = await repo.discharge({
        accountId: actor.accountId,
        stayId,
        reason: input.reason,
        dischargedByUserId: actor.userId
      });

      if (!after) {
        const current = await repo.findStayById(actor.accountId, stayId);
        if (!current) {
          return { kind: 'stay_not_found' };
        }
        return { kind: 'stay_not_active', stay: current };
      }

      await appendAudit({
        accountId: actor.accountId,
        actorUserId: actor.userId,
        roles: actor.roles,
        action: 'InpatientDischarged',
        entityType: 'inpatient_stay',
        entityId: stayId,
        beforeJson: before,
        afterJson: after,
        reason: input.reason,
        requestId: context.requestContext.requestId
      });

      return {
        kind: 'discharged',
        stay: after
      };
    },

    async getById(stayId: string): Promise<InpatientStayRecord | null> {
      const actor = ensureAccountActor(context.requestContext);
      return repo.findStayById(actor.accountId, stayId);
    },

    async list(query: {
      page: number;
      pageSize: number;
      status?: InpatientStayStatus;
      wardId?: string;
    }) {
      const actor = ensureAccountActor(context.requestContext);
      return repo.list({
        accountId: actor.accountId,
        page: query.page,
        pageSize: query.pageSize,
        status: query.status,
        wardId: query.wardId
      });
    }
  };
}
