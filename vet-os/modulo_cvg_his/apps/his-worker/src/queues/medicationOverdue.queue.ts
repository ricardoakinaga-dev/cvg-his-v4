import type { JobsOptions } from 'bullmq';
import { Queue } from 'bullmq';
import type { Redis } from 'ioredis';

export const MEDICATION_OVERDUE_QUEUE_NAME = 'medication-overdue';
export const MEDICATION_OVERDUE_SCAN_JOB_NAME = 'scan';

export type MedicationOverdueScanJobName = typeof MEDICATION_OVERDUE_SCAN_JOB_NAME;

export type MedicationOverdueScanJobData = {
  accountId?: string;
  requestId?: string;
  requestedByUserId?: string;
  trigger: 'manual' | 'scheduled';
  graceMinutes?: number;
  enqueuedAt: string;
};

export type MedicationOverdueScanJobResult = {
  status: 'ok';
  scannedAt: string;
  scannedOrders: number;
  createdAlerts: number;
  skippedOrders: number;
};

type MedicationOverdueScanJobIdInput = {
  intervalMs?: number;
};

export function medicationOverdueScanJobOptions(): JobsOptions {
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

function normalizeEnqueuedAt(value: string): number {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Date.now();
}

function slotBucketMs(payload: MedicationOverdueScanJobData, intervalMs: number): number {
  const base = normalizeEnqueuedAt(payload.enqueuedAt);
  return Math.floor(base / intervalMs) * intervalMs;
}

export function medicationOverdueScanJobId(
  payload: MedicationOverdueScanJobData,
  input: MedicationOverdueScanJobIdInput = {}
): string {
  const intervalMs = input.intervalMs && input.intervalMs > 0 ? input.intervalMs : 60_000;
  const accountKey = payload.accountId ?? 'all-accounts';
  const graceKey = payload.graceMinutes ?? 'default';
  const slotKey = slotBucketMs(payload, intervalMs);

  return `medication-overdue-scan-${payload.trigger}-${accountKey}-${slotKey}-${graceKey}`;
}

export function createMedicationOverdueQueue(
  connection: Redis,
  prefix: string
): Queue<
  MedicationOverdueScanJobData,
  MedicationOverdueScanJobResult,
  MedicationOverdueScanJobName
> {
  return new Queue<
    MedicationOverdueScanJobData,
    MedicationOverdueScanJobResult,
    MedicationOverdueScanJobName
  >(MEDICATION_OVERDUE_QUEUE_NAME, {
    connection,
    prefix
  });
}
