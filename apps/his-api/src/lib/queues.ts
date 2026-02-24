import type { FastifyBaseLogger } from 'fastify';
import { Queue, type JobsOptions } from 'bullmq';
import { Redis } from 'ioredis';

/**
 * 🔥 IMPORTANTE
 * BullMQ NÃO permite ":" no nome da fila.
 * Use "-" ou "__" para namespace.
 * Prefixo deve separar ambiente / tenant.
 */

export const HANDOVER_BUILD_QUEUE_NAME = 'handover-build';
export const HANDOVER_BUILD_JOB_NAME = 'build';

export const MEDICATION_OVERDUE_QUEUE_NAME = 'medication-overdue';
export const MEDICATION_OVERDUE_SCAN_JOB_NAME = 'scan';

export const PROTOCOL_PUBLISH_QUEUE_NAME = 'protocol-publish';
export const PROTOCOL_PUBLISH_JOB_NAME = 'publish';

/**
 * 🔐 Guardrail para evitar erro em produção
 */
function assertBullMqQueueName(name: string): void {
  if (name.includes(':')) {
    throw new Error(`Invalid BullMQ queue name (contains ":"): ${name}`);
  }
}

/**
 * =========================
 * JOB DATA TYPES
 * =========================
 */

export type HandoverBuildJobData = {
  handoverId: string;
  accountId: string;
  wardId: string;
  requestedByUserId: string;
  requestId: string;
};

export type HandoverBuildEnqueueResult = {
  jobId: string | null;
};

export type MedicationOverdueScanJobData = {
  accountId?: string;
  requestId?: string;
  requestedByUserId?: string;
  trigger: 'manual' | 'scheduled';
  graceMinutes?: number;
  enqueuedAt: string;
};

export type MedicationOverdueScanEnqueueResult = {
  jobId: string | null;
};

export type ProtocolPublishJobData = {
  accountId: string;
  protocolId: string;
  versionId: string;
  requestedByUserId: string;
  requestId: string;
};

export type ProtocolPublishEnqueueResult = {
  jobId: string | null;
};

type CreateApiQueuesInput = {
  redisUrl: string;
  prefix: string;
  logger?: FastifyBaseLogger;
};

export type ApiQueues = {
  enqueueHandoverBuild: (
    payload: HandoverBuildJobData
  ) => Promise<HandoverBuildEnqueueResult>;

  enqueueMedicationOverdueScan: (
    payload: MedicationOverdueScanJobData
  ) => Promise<MedicationOverdueScanEnqueueResult>;

  enqueueProtocolPublish: (
    payload: ProtocolPublishJobData
  ) => Promise<ProtocolPublishEnqueueResult>;

  close: () => Promise<void>;
};

/**
 * =========================
 * JOB OPTIONS (retry / backoff)
 * =========================
 */

function handoverBuildJobOptions(): JobsOptions {
  return {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    removeOnComplete: 500,
    removeOnFail: 1000
  };
}

function medicationOverdueScanJobOptions(): JobsOptions {
  return {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    removeOnComplete: 200,
    removeOnFail: 500
  };
}

function protocolPublishJobOptions(): JobsOptions {
  return {
    attempts: 5,
    backoff: {
      type: 'exponential',
      delay: 2000
    },
    removeOnComplete: 500,
    removeOnFail: 1000
  };
}

function handoverBuildJobId(payload: HandoverBuildJobData): string {
  return `handover-build-${payload.accountId}-${payload.handoverId}`;
}

function protocolPublishJobId(payload: ProtocolPublishJobData): string {
  return `protocol-publish-${payload.accountId}-${payload.protocolId}-${payload.versionId}`;
}

function normalizeEnqueuedAt(value: string): number {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Date.now();
}

function medicationOverdueScanJobId(payload: MedicationOverdueScanJobData): string {
  const intervalMs = 60_000;
  const slotKey = Math.floor(normalizeEnqueuedAt(payload.enqueuedAt) / intervalMs) * intervalMs;
  const accountKey = payload.accountId ?? 'all-accounts';
  const graceKey = payload.graceMinutes ?? 'default';
  return `medication-overdue-scan-${payload.trigger}-${accountKey}-${slotKey}-${graceKey}`;
}

/**
 * =========================
 * FACTORY
 * =========================
 */

export function createApiQueues(input: CreateApiQueuesInput): ApiQueues {
  const { redisUrl, prefix, logger } = input;

  /**
   * 🔐 Segurança adicional
   */
  if (prefix.includes(':')) {
    logger?.warn(
      { prefix },
      'BullMQ prefix contains ":" which may generate Redis key issues. Prefer "-"'
    );
  }

  /**
   * Redis connection (reutilizável)
   */
  const connection = new Redis(redisUrl, {
    lazyConnect: true,
    enableReadyCheck: false,
    maxRetriesPerRequest: null
  });

  connection.on('error', (error: unknown) => {
    logger?.warn({ err: error }, 'api queue redis error');
  });

  /**
   * Guardrails
   */
  assertBullMqQueueName(HANDOVER_BUILD_QUEUE_NAME);
  assertBullMqQueueName(MEDICATION_OVERDUE_QUEUE_NAME);
  assertBullMqQueueName(PROTOCOL_PUBLISH_QUEUE_NAME);

  /**
   * Filas
   */
  const handoverBuildQueue = new Queue(HANDOVER_BUILD_QUEUE_NAME, {
    connection,
    prefix
  });

  const medicationOverdueQueue = new Queue(
    MEDICATION_OVERDUE_QUEUE_NAME,
    {
      connection,
      prefix
    }
  );

  const protocolPublishQueue = new Queue(
    PROTOCOL_PUBLISH_QUEUE_NAME,
    {
      connection,
      prefix
    }
  );

  /**
   * =========================
   * API
   * =========================
   */

  return {
    async enqueueHandoverBuild(
      payload: HandoverBuildJobData
    ): Promise<HandoverBuildEnqueueResult> {
      const job = await handoverBuildQueue.add(
        HANDOVER_BUILD_JOB_NAME,
        payload,
        {
          ...handoverBuildJobOptions(),
          jobId: handoverBuildJobId(payload)
        }
      );

      logger?.info(
        { jobId: job.id, queue: HANDOVER_BUILD_QUEUE_NAME },
        'handover build job enqueued'
      );

      return {
        jobId: job.id?.toString() ?? null
      };
    },

    async enqueueMedicationOverdueScan(
      payload: MedicationOverdueScanJobData
    ): Promise<MedicationOverdueScanEnqueueResult> {
      const job = await medicationOverdueQueue.add(
        MEDICATION_OVERDUE_SCAN_JOB_NAME,
        payload,
        {
          ...medicationOverdueScanJobOptions(),
          jobId: medicationOverdueScanJobId(payload)
        }
      );

      logger?.info(
        { jobId: job.id, queue: MEDICATION_OVERDUE_QUEUE_NAME },
        'medication overdue scan job enqueued'
      );

      return {
        jobId: job.id?.toString() ?? null
      };
    },

    async enqueueProtocolPublish(
      payload: ProtocolPublishJobData
    ): Promise<ProtocolPublishEnqueueResult> {
      const job = await protocolPublishQueue.add(
        PROTOCOL_PUBLISH_JOB_NAME,
        payload,
        {
          ...protocolPublishJobOptions(),
          jobId: protocolPublishJobId(payload)
        }
      );

      logger?.info(
        { jobId: job.id, queue: PROTOCOL_PUBLISH_QUEUE_NAME },
        'protocol publish job enqueued'
      );

      return {
        jobId: job.id?.toString() ?? null
      };
    },

    async close(): Promise<void> {
      await Promise.all([
        handoverBuildQueue.close(),
        medicationOverdueQueue.close(),
        protocolPublishQueue.close()
      ]);

      try {
        await connection.quit();
      } catch {
        connection.disconnect();
      }
    }
  };
}
