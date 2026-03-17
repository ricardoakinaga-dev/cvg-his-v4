import { z } from 'zod';

export const medicationLogsQuerySchema = z.object({
  stayId: z.string().uuid()
});

export type MedicationLogsQuery = z.infer<typeof medicationLogsQuerySchema>;

export type MedicationLogOrder = {
  id: string;
  medicationName: string;
  dose: string;
  route: string;
  frequencyType: string;
  status: 'active' | 'stopped';
  nextDueAt: string | null;
};

export type MedicationLogAdministration = {
  id: string;
  orderId: string;
  scheduledFor: string;
  status: 'administered' | 'refused' | 'delayed' | 'held';
  effectiveAt: string | null;
  delayedUntil: string | null;
  administeredAt: string | null;
  reason: string | null;
  byUserId: string;
};

export type MedicationLogsResponse = {
  stayId: string;
  orders: MedicationLogOrder[];
  administrations: MedicationLogAdministration[];
};
