import { append, type AppendAuditInput } from '@cvg-his/audit';
import type { MedicationAdministrationCreateDto } from '@cvg-his/domain';

import type { RequestContext } from '../../plugins/requestContext.js';
import {
  createMedicationAdministrationsRepo,
  type MedicationAdministrationsRepo,
  type MedicationAdministrationRecord
} from './repo.js';
import { createAlertsRepo } from '../alerts/repo.js';
import {
  isDuplicateMedicationAdministrationError,
  isMedicationAdministrationReasonCheckError,
  isMedicationOrderActive
} from './rules.js';

type DbClient = typeof import('@cvg-his/db').db;

type ServiceContext = {
  db: DbClient;
  requestContext: RequestContext;
};

type ServiceDependencies = {
  repo?: MedicationAdministrationsRepo;
  appendAudit?: (input: AppendAuditInput) => Promise<unknown>;
};

type AccountActor = NonNullable<RequestContext['actor']> & {
  accountId: string;
};

type WriteActor = AccountActor & {
  userId: string;
};

/**
 * Patient confirmation for safety verification
 */
export type PatientConfirmation = {
  patientId: string;
  confirmedByName: string;
  confirmedBySpecies: string;
};

export type RecordMedicationAdministrationResult =
  | { kind: 'order_not_found' }
  | { kind: 'order_not_active' }
  | { kind: 'stay_mismatch' }
  | { kind: 'encounter_mismatch' }
  | { kind: 'already_recorded' }
  | { kind: 'invalid_reason' }
  | { kind: 'patient_mismatch' }
  | { kind: 'recorded'; administration: MedicationAdministrationRecord };

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

export function createMedicationAdministrationsService(
  context: ServiceContext,
  dependencies: ServiceDependencies = {}
) {
  const repo = dependencies.repo ?? createMedicationAdministrationsRepo(context.db);
  const appendAudit = dependencies.appendAudit ?? append;

  return {
    async record(
      input: MedicationAdministrationCreateDto,
      patientConfirmation?: PatientConfirmation
    ): Promise<RecordMedicationAdministrationResult> {
      const actor = ensureWriteActor(context.requestContext);
      const order = await repo.findOrderInAccount(actor.accountId, input.orderId);

      if (!order) {
        return { kind: 'order_not_found' };
      }

      if (!isMedicationOrderActive(order.status)) {
        return { kind: 'order_not_active' };
      }

      if (input.stayId && order.stayId && input.stayId !== order.stayId) {
        return { kind: 'stay_mismatch' };
      }

      if (input.encounterId && order.encounterId && input.encounterId !== order.encounterId) {
        return { kind: 'encounter_mismatch' };
      }

      // Validate patient confirmation if provided
      if (patientConfirmation) {
        if (patientConfirmation.patientId !== order.patientId) {
          return { kind: 'patient_mismatch' };
        }

        // Verify patient name and species match (case-insensitive)
        const patientInfo = await repo.findPatientInfo(actor.accountId, order.patientId);
        if (patientInfo) {
          const confirmedName = patientConfirmation.confirmedByName.toLowerCase().trim();
          const confirmedSpecies = patientConfirmation.confirmedBySpecies.toLowerCase().trim();
          const actualName = patientInfo.name.toLowerCase().trim();
          const actualSpecies = patientInfo.species.toLowerCase().trim();

          if (confirmedName !== actualName || confirmedSpecies !== actualSpecies) {
            return { kind: 'patient_mismatch' };
          }
        }
      }

      const payload: MedicationAdministrationCreateDto = {
        ...input,
        stayId: input.stayId ?? order.stayId ?? undefined,
        encounterId: input.encounterId ?? order.encounterId ?? undefined
      };

      let administration: MedicationAdministrationRecord;
      try {
        administration = await repo.create({
          ...payload,
          accountId: actor.accountId,
          administeredByUserId: actor.userId
        });
      } catch (error) {
        if (isDuplicateMedicationAdministrationError(error)) {
          return { kind: 'already_recorded' };
        }

        if (isMedicationAdministrationReasonCheckError(error)) {
          return { kind: 'invalid_reason' };
        }

        throw error;
      }

      await appendAudit({
        accountId: actor.accountId,
        actorUserId: actor.userId,
        roles: actor.roles,
        action: 'MedicationAdministrationRecorded',
        entityType: 'medication_administration',
        entityId: administration.id,
        beforeJson: null,
        afterJson: administration,
        reason: administration.reason ?? undefined,
        requestId: context.requestContext.requestId
      });

      if (administration.status === 'refused' && administration.stayId) {
        const alertsRepo = createAlertsRepo(context.db);
        const orderInfoResult = await context.db.$client.query(
          `
            select mo.medication_name, p.name as patient_name
            from medication_orders mo
            join patients p on p.id = mo.patient_id and p.account_id = mo.account_id
            where mo.id = $1 and mo.account_id = $2
          `,
          [input.orderId, actor.accountId]
        );
        const orderRow = orderInfoResult.rows[0] as Record<string, unknown> | undefined;
        const msg = orderRow
          ? `Dose refused: ${orderRow.medication_name} for ${orderRow.patient_name}`
          : `Dose refused for order ${input.orderId}`;

        await alertsRepo.create({
          accountId: actor.accountId,
          type: 'dose_refused_needs_review',
          stayId: administration.stayId,
          orderId: input.orderId,
          scheduledFor: new Date(input.scheduledFor),
          severity: 'medium',
          message: msg
        });
      }

      return {
        kind: 'recorded',
        administration
      };
    },

    async list(query: {
      stayId?: string;
      orderId?: string;
      page: number;
      pageSize: number;
    }) {
      const actor = ensureAccountActor(context.requestContext);
      return repo.list({
        accountId: actor.accountId,
        stayId: query.stayId,
        orderId: query.orderId,
        page: query.page,
        pageSize: query.pageSize
      });
    }
  };
}
