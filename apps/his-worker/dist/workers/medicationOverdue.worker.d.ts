import { Worker } from 'bullmq';
import type { Redis } from 'ioredis';
import { type MedicationOverdueScanJobData, type MedicationOverdueScanJobName, type MedicationOverdueScanJobResult } from '../queues/medicationOverdue.queue.js';
export declare function createMedicationOverdueWorker(connection: Redis, prefix: string): Worker<MedicationOverdueScanJobData, MedicationOverdueScanJobResult, MedicationOverdueScanJobName>;
//# sourceMappingURL=medicationOverdue.worker.d.ts.map