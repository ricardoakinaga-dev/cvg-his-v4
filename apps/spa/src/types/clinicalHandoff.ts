export type ClinicalHandoffStatus =
  | 'ready_to_send'
  | 'sent_to_reception'
  | 'acknowledged_by_reception'
  | 'waiting_pending_resolution'
  | 'returned_to_clinic'
  | 'sent_to_finance';

export type ClinicalHandoffPriority = 'low' | 'medium' | 'high' | 'critical';

export interface ClinicalHandoffPendingIssueSummary {
  id: string;
  type: string;
  severity: ClinicalHandoffPriority;
  ownerType: 'sector' | 'person' | 'team';
  ownerId: string;
  reason: string;
  blocksFinance: boolean;
  status: 'open' | 'resolved';
  createdBy: string;
  createdAt: string;
  resolvedBy?: string;
  resolvedAt?: string;
  resolution?: string;
}

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
  pendingIssues: ClinicalHandoffPendingIssueSummary[];
  returnedToClinicBy?: string;
  returnedToClinicAt?: string;
  returnedToClinicReason?: string;
  returnedToClinicResponsibleId?: string;
  sentToFinanceBy?: string;
  sentToFinanceAt?: string;
  financeNote?: string;
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

export interface MarkClinicalHandoffPendingRequest {
  type: string;
  severity?: ClinicalHandoffPriority;
  ownerType?: 'sector' | 'person' | 'team';
  ownerId: string;
  reason: string;
  blocksFinance?: boolean;
}

export interface ResolveClinicalHandoffPendingRequest {
  resolution: string;
}

export interface ReturnClinicalHandoffToClinicRequest {
  reason: string;
  toResponsibleId?: string;
}

export interface SendClinicalHandoffToFinanceRequest {
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
