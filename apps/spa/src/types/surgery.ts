export type SurgeryStatus =
  | 'requested'
  | 'pre_op'
  | 'in_progress'
  | 'recovery'
  | 'completed'
  | 'cancelled';

export interface SurgeryCaseSummary {
  id: string;
  accountId: string;
  encounterId: string;
  patientId: string;
  procedureName: string;
  status: SurgeryStatus;
  surgeonUserId?: string;
  surgicalTeam?: string[];
  preparationNotes?: string;
  operativeNotes?: string;
  scheduledAt?: string;
  startedAt?: string;
  endedAt?: string;
  createdAt: string;
  updatedAt: string;
}
