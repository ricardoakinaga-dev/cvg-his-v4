import { z } from 'zod';
import { MedicationOrderStatusSchema } from '@cvg-his/domain';

export const medicationOrderIdParamSchema = z.object({
  id: z.string().uuid()
});

export const listMedicationOrdersQuerySchema = z.object({
  encounterId: z.string().uuid().optional(),
  stayId: z.string().uuid().optional(),
  status: MedicationOrderStatusSchema.optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20)
});

export type MedicationOrderStatus = z.infer<typeof MedicationOrderStatusSchema>;

export type MedicationOrderRecord = {
  id: string;
  accountId: string;
  encounterId: string | null;
  stayId: string | null;
  patientId: string;
  medicationName: string;
  doseValue: string;
  doseUnit: string;
  route: string;
  frequencyType: string;
  durationValue: number | null;
  durationUnit: string | null;
  startAt: Date;
  endAt: Date | null;
  status: MedicationOrderStatus;
  stopReason: string | null;
  createdByUserId: string;
  stoppedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
};

