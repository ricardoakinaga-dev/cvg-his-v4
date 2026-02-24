import type { JobsOptions } from 'bullmq';
import { Queue } from 'bullmq';
import type { Redis } from 'ioredis';
export declare const MEDICATION_OVERDUE_QUEUE_NAME = "medication-overdue";
export declare const MEDICATION_OVERDUE_SCAN_JOB_NAME = "scan";
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
export declare function medicationOverdueScanJobOptions(): JobsOptions;
export declare function medicationOverdueScanJobId(payload: MedicationOverdueScanJobData, input?: MedicationOverdueScanJobIdInput): string;
export declare function createMedicationOverdueQueue(connection: Redis, prefix: string): Queue<MedicationOverdueScanJobData, MedicationOverdueScanJobResult, MedicationOverdueScanJobName>;
export {};
//# sourceMappingURL=medicationOverdue.queue.d.ts.map