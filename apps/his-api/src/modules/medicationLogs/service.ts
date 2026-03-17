import type { RequestContext } from '../../plugins/requestContext.js';
import {
  createMedicationLogsRepo,
  type MedicationLogAdministrationRow,
  type MedicationLogOrderRow,
  type MedicationLogsRepo
} from './repo.js';
import type {
  MedicationLogAdministration,
  MedicationLogOrder,
  MedicationLogsResponse
} from './types.js';

type DbClient = typeof import('@cvg-his/db').db;

type ServiceContext = {
  db: DbClient;
  requestContext: RequestContext;
};

type ServiceDependencies = {
  repo?: MedicationLogsRepo;
};

type AccountActor = NonNullable<RequestContext['actor']> & {
  accountId: string;
};

type ViewMode = 'vet' | 'enfermagem' | 'default';

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

function resolveViewMode(actor: AccountActor): ViewMode {
  if (actor.roles.includes('vet')) {
    return 'vet';
  }

  if (actor.roles.includes('enfermagem')) {
    return 'enfermagem';
  }

  return 'default';
}

function mapOrder(row: MedicationLogOrderRow): MedicationLogOrder {
  return {
    id: row.id,
    medicationName: row.medicationName,
    dose: `${row.doseValue} ${row.doseUnit}`,
    route: row.route,
    frequencyType: row.frequencyType,
    status: row.status,
    nextDueAt: row.nextDueAt ? row.nextDueAt.toISOString() : null
  };
}

function mapAdministration(row: MedicationLogAdministrationRow): MedicationLogAdministration {
  return {
    id: row.id,
    orderId: row.orderId,
    scheduledFor: row.scheduledFor.toISOString(),
    status: row.status,
    effectiveAt: row.effectiveAt ? row.effectiveAt.toISOString() : null,
    delayedUntil: row.delayedUntil ? row.delayedUntil.toISOString() : null,
    administeredAt: row.administeredAt ? row.administeredAt.toISOString() : null,
    reason: row.reason,
    byUserId: row.byUserId
  };
}

function nextDueSort(left: MedicationLogOrder, right: MedicationLogOrder): number {
  const leftValue = left.nextDueAt ? new Date(left.nextDueAt).getTime() : Number.POSITIVE_INFINITY;
  const rightValue = right.nextDueAt ? new Date(right.nextDueAt).getTime() : Number.POSITIVE_INFINITY;
  return leftValue - rightValue;
}

function administrationRecentSort(
  left: MedicationLogAdministration,
  right: MedicationLogAdministration
): number {
  return new Date(right.scheduledFor).getTime() - new Date(left.scheduledFor).getTime();
}

export function createMedicationLogsService(
  context: ServiceContext,
  dependencies: ServiceDependencies = {}
) {
  const repo = dependencies.repo ?? createMedicationLogsRepo(context.db);

  return {
    async getByStay(stayId: string): Promise<MedicationLogsResponse> {
      const actor = ensureAccountActor(context.requestContext);
      const viewMode = resolveViewMode(actor);
      const administrationLimit = viewMode === 'vet' ? 120 : viewMode === 'enfermagem' ? 80 : 100;

      const [orderRows, administrationRows] = await Promise.all([
        repo.listActiveOrdersByStay(actor.accountId, stayId),
        repo.listRecentAdministrationsByStay(actor.accountId, stayId, administrationLimit)
      ]);

      const orders = orderRows.map(mapOrder);
      const administrations = administrationRows.map(mapAdministration);

      if (viewMode === 'enfermagem') {
        orders.sort(nextDueSort);
      } else if (viewMode === 'vet') {
        orders.sort((left, right) => left.medicationName.localeCompare(right.medicationName));
      } else {
        orders.sort(nextDueSort);
      }

      administrations.sort(administrationRecentSort);

      return {
        stayId,
        orders,
        administrations
      };
    }
  };
}
