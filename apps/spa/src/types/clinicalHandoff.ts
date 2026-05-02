export type ClinicalHandoffStatus =
  | 'ready_to_send'
  | 'sent_to_reception'
  | 'acknowledged_by_reception';

export type ClinicalHandoffPriority = 'low' | 'medium' | 'high' | 'critical';

export interface ClinicalHandoffSummary {
  id: string;
  accountId: string;
  encounterId: string;
  queueEntryId?: string;
  appointmentId?: string;
  ownerId: string;
  patientId: string;
  originChannel: 'reception' | 'schedule' | 'return';
  fromSector: 'clinic';
  toSector: 'reception';
  fromResponsibleId: string;
  toResponsibleType: 'sector' | 'person' | 'team';
  toResponsibleId?: string;
  clinicalSummary: string;
  receptionInstructions: string;
  priority: ClinicalHandoffPriority;
  handoffStatus: ClinicalHandoffStatus;
  createdBy: string;
  sentBy: string;
  sentAt: string;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  acknowledgeNote?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SendClinicalHandoffRequest {
  encounterId: string;
  clinicalSummary: string;
  receptionInstructions: string;
  priority?: ClinicalHandoffPriority;
  toResponsibleType?: 'sector' | 'person' | 'team';
  toResponsibleId?: string;
}

export interface AcknowledgeClinicalHandoffRequest {
  note?: string;
}

export interface ClinicalHandoffListResponse {
  items: ClinicalHandoffSummary[];
}

export interface ClinicalHandoffListFilters {
  handoffStatus?: ClinicalHandoffStatus;
  encounterId?: string;
  ownerId?: string;
  patientId?: string;
  priority?: ClinicalHandoffPriority;
}
