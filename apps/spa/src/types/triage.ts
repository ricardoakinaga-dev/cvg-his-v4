export type TriagePriority = 'low' | 'medium' | 'high' | 'critical';
export type TriageDestination = 'in_care' | 'observation';

export interface TriageSummary {
  id: string;
  accountId: string;
  encounterId: string;
  patientId: string;
  priority: TriagePriority;
  chiefComplaint: string;
  initialNotes: string | null;
  alerts: string[];
  destination: TriageDestination;
  triagedByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface TriageVersionSummary {
  id: string;
  triageId: string;
  accountId: string;
  encounterId: string;
  changedFields: string[];
  previousSnapshot: Record<string, unknown> | null;
  nextSnapshot: Record<string, unknown> | null;
  changedByUserId: string | null;
  createdAt: string;
}

export interface CreateTriageRequest {
  encounterId: string;
  patientId: string;
  priority: TriagePriority;
  chiefComplaint: string;
  initialNotes?: string;
  alerts?: string[];
  destination: TriageDestination;
}

export interface UpdateTriageRequest {
  priority?: TriagePriority;
  chiefComplaint?: string;
  initialNotes?: string;
  alerts?: string[];
  destination?: TriageDestination;
}

export interface TriageListResponse {
  records: TriageSummary[];
}

export interface TriageHistoryResponse {
  versions: TriageVersionSummary[];
}
