import { Queue } from 'bullmq';
import type { JobsOptions } from 'bullmq';
import type { Redis } from 'ioredis';

// =====================
// Queue Name
// =====================

export const NOTIFICATION_QUEUE_NAME = 'notification' as const;

// =====================
// Job Names
// =====================

export const NOTIFICATION_SEND_JOB_NAME = 'notification:send' as const;
export const NOTIFICATION_PROCESS_QUEUE_JOB_NAME = 'notification:process-queue' as const;

// =====================
// Job Data Types
// =====================

export type NotificationSendJobData = {
  notificationId: string;
  accountId: string;
  channel: 'sms' | 'whatsapp' | 'email';
  recipient: string;
  body: string;
  subject?: string;
  metadata?: Record<string, unknown>;
};

export type NotificationProcessQueueJobData = {
  trigger: 'scheduled' | 'manual';
  enqueuedAt: string;
};

// =====================
// Job Result Types
// =====================

export type NotificationSendJobResult = {
  success: boolean;
  providerId?: string;
  error?: string;
  processedAt: string;
};

export type NotificationProcessQueueJobResult = {
  processed: number;
  failed: number;
  skipped: number;
  processedAt: string;
};

// =====================
// Job Name Types
// =====================

export type NotificationSendJobName = typeof NOTIFICATION_SEND_JOB_NAME;
export type NotificationProcessQueueJobName = typeof NOTIFICATION_PROCESS_QUEUE_JOB_NAME;

// =====================
// Queue Factory
// =====================

export function createNotificationQueue(connection: Redis, prefix: string): Queue<NotificationSendJobData, NotificationSendJobResult, NotificationSendJobName> {
  return new Queue<NotificationSendJobData, NotificationSendJobResult, NotificationSendJobName>(
    `${prefix}:${NOTIFICATION_QUEUE_NAME}`,
    { connection }
  );
}

export function createNotificationProcessQueue(connection: Redis, prefix: string): Queue<NotificationProcessQueueJobData, NotificationProcessQueueJobResult, NotificationProcessQueueJobName> {
  return new Queue<NotificationProcessQueueJobData, NotificationProcessQueueJobResult, NotificationProcessQueueJobName>(
    `${prefix}:${NOTIFICATION_QUEUE_NAME}`,
    { connection }
  );
}

// =====================
// Job Options
// =====================

export function notificationSendJobOptions(): JobsOptions {
  return {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000 // 5 segundos
    },
    removeOnComplete: {
      age: 24 * 3600 // 24 horas
    },
    removeOnFail: {
      age: 7 * 24 * 3600 // 7 dias
    }
  };
}

export function notificationProcessQueueJobOptions(): JobsOptions {
  return {
    attempts: 1,
    removeOnComplete: {
      age: 24 * 3600
    },
    removeOnFail: {
      age: 7 * 24 * 3600
    }
  };
}

// =====================
// Job ID Generators
// =====================

export function notificationSendJobId(data: NotificationSendJobData): string {
  return `notification:send:${data.notificationId}`;
}

export function notificationProcessQueueJobId(data: NotificationProcessQueueJobData): string {
  return `notification:process-queue:${data.enqueuedAt}`;
}
