import type {
  MedicationOverdueScanEnqueueResult,
  MedicationOverdueScanJobData
} from '../../lib/queues.js';
import type { RequestContext } from '../../plugins/requestContext.js';
import { createAlertsRepo, type AlertType, type AlertsRepo, type AlertRecord } from './repo.js';

type DbClient = typeof import('@cvg-his/db').db;

type ServiceContext = {
  db: DbClient;
  requestContext: RequestContext;
};

type ServiceDependencies = {
  repo?: AlertsRepo;
  enqueueMedicationOverdueScan?: (
    payload: MedicationOverdueScanJobData
  ) => Promise<MedicationOverdueScanEnqueueResult>;
};

type AccountActor = NonNullable<RequestContext['actor']> & {
  accountId: string;
};

type WriteActor = AccountActor & {
  userId: string;
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

function queueUnavailableError(message: string): Error & { statusCode: 503; code: 'QUEUE_UNAVAILABLE' } {
  const error = new Error(message) as Error & {
    statusCode: 503;
    code: 'QUEUE_UNAVAILABLE';
  };

  error.statusCode = 503;
  error.code = 'QUEUE_UNAVAILABLE';
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

export function createAlertsService(context: ServiceContext, dependencies: ServiceDependencies = {}) {
  const repo = dependencies.repo ?? createAlertsRepo(context.db);

  return {
    async list(query: {
      stayId?: string;
      type?: AlertType;
      page: number;
      pageSize: number;
    }) {
      const actor = ensureAccountActor(context.requestContext);

      return repo.list({
        accountId: actor.accountId,
        stayId: query.stayId,
        type: query.type,
        page: query.page,
        pageSize: query.pageSize
      });
    },

    async enqueueOverdueScan(input: {
      graceMinutes?: number;
    }): Promise<MedicationOverdueScanEnqueueResult> {
      const actor = ensureWriteActor(context.requestContext);
      const enqueueMedicationOverdueScan = dependencies.enqueueMedicationOverdueScan;

      if (!enqueueMedicationOverdueScan) {
        throw queueUnavailableError('Queue publisher is not configured for medication overdue scans.');
      }

      try {
        return await enqueueMedicationOverdueScan({
          accountId: actor.accountId,
          requestId: context.requestContext.requestId,
          requestedByUserId: actor.userId,
          trigger: 'manual',
          graceMinutes: input.graceMinutes,
          enqueuedAt: new Date().toISOString()
        });
      } catch (error) {
        throw queueUnavailableError(
          `Failed to enqueue medication overdue scan job: ${error instanceof Error ? error.message : 'unknown error'}`
        );
      }
    },

    /**
     * Acknowledge an alert - confirms that a clinician has seen the alert
     */
    async acknowledge(alertId: string, notes?: string): Promise<AlertRecord | null> {
      const actor = ensureWriteActor(context.requestContext);
      return repo.acknowledge({
        alertId,
        accountId: actor.accountId,
        acknowledgedByUserId: actor.userId,
        notes
      });
    },

    /**
     * Resolve an alert - marks the alert as resolved after action taken
     */
    async resolve(alertId: string, notes?: string): Promise<AlertRecord | null> {
      const actor = ensureWriteActor(context.requestContext);
      return repo.resolve({
        alertId,
        accountId: actor.accountId,
        resolvedByUserId: actor.userId,
        notes
      });
    },

    /**
     * Acknowledge multiple alerts at once
     */
    async acknowledgeMany(alertIds: string[], notes?: string): Promise<{
      acknowledged: string[];
      notFound: string[];
      alreadyAcknowledged: string[];
    }> {
      const actor = ensureWriteActor(context.requestContext);
      const results = await repo.acknowledgeMany({
        alertIds,
        accountId: actor.accountId,
        acknowledgedByUserId: actor.userId,
        notes
      });
      return results;
    },

    /**
     * Resolve multiple alerts at once
     */
    async resolveMany(alertIds: string[], notes?: string): Promise<{
      resolved: string[];
      notFound: string[];
      alreadyResolved: string[];
    }> {
      const actor = ensureWriteActor(context.requestContext);
      const results = await repo.resolveMany({
        alertIds,
        accountId: actor.accountId,
        resolvedByUserId: actor.userId,
        notes
      });
      return results;
    }
  };
}
