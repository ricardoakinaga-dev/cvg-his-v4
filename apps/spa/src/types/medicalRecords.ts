export type MedicalRecordStatus = 'open' | 'completed';

export type ClinicalEntryType =
  | 'anamnesis'
  | 'physical_exam'
  | 'progress_note'
  | 'assessment'
  | 'plan'
  | 'prescription'
  | 'conduct';

export type ClinicalTimelineEventType =
  | 'record_created'
  | 'entry_added'
  | 'entry_updated'
  | 'entry_archived'
  | 'attachment_added'
  | 'inpatient_admitted'
  | 'inpatient_progressed'
  | 'surgery_requested'
  | 'surgery_status_changed'
  | 'diagnostic_requested'
  | 'diagnostic_collected'
  | 'diagnostic_resulted'
  | 'inpatient_transferred'
  | 'inpatient_discharged'
  | 'surgery_pre_op'
  | 'surgery_in_progress';

export interface MedicalRecordSummary {
  id: string;
  accountId: string;
  encounterId: string;
  patientId: string;
  status: MedicalRecordStatus;
  createdAt: string;
  updatedAt: string;
}

export interface ClinicalEntrySummary {
  id: string;
  accountId: string;
  medicalRecordId: string;
  encounterId: string;
  patientId: string;
  entryType: ClinicalEntryType;
  title: string;
  content: string;
  authoredByUserId: string;
  version: number;
  deletedAt?: string;
  deletedByUserId?: string;
  deleteReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClinicalTimelineEventSummary {
  id: string;
  accountId: string;
  encounterId: string;
  medicalRecordId: string;
  clinicalEntryId?: string;
  attachmentId?: string;
  eventType: ClinicalTimelineEventType;
  summary: string;
  actorUserId: string;
  occurredAt: string;
}

export interface EntryRevisionSummary {
  id: string;
  entryId: string;
  version: number;
  title: string;
  content: string;
  authorUserId: string;
  reason?: string;
  createdAt: string;
}

export interface CreateClinicalEntryRequest {
  encounterId: string;
  patientId: string;
  entryType: ClinicalEntryType;
  title: string;
  content: string;
}

export interface UpdateClinicalEntryRequest {
  title?: string;
  content?: string;
  reason?: string;
  expectedVersion?: number;
}

export interface ArchiveClinicalEntryRequest {
  reason: string;
  expectedVersion?: number;
}

export interface MedicalRecordResponse {
  record: MedicalRecordSummary;
  entries: ClinicalEntrySummary[];
}

export interface ClinicalEntryListResponse {
  items: ClinicalEntrySummary[];
}

export interface ClinicalTimelineResponse {
  items: ClinicalTimelineEventSummary[];
}

export interface EntryRevisionListResponse {
  items: EntryRevisionSummary[];
}

export interface MedicalRecordListSummary {
  record: MedicalRecordSummary;
  entryCount: number;
}

export interface MedicalRecordsListResponse {
  items: MedicalRecordListSummary[];
}
