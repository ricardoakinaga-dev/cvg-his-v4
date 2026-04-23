export type EncounterVisitType = 'walk_in' | 'scheduled' | 'return';
export type EncounterStatus = 'reception' | 'in_triage' | 'in_care' | 'observation' | 'closed';
export type EncounterOrigin = 'reception' | 'schedule' | 'return';
export type EncounterNextStatus = 'reception' | 'in_triage' | 'in_care' | 'observation' | 'closed';

export interface EncounterSummary {
  id: string;
  accountId: string;
  patientId: string;
  ownerId: string;
  appointmentId?: string;
  queueEntryId?: string;
  visitType: EncounterVisitType;
  status: EncounterStatus;
  origin: EncounterOrigin;
  reason: string;
  openedAt: string;
  closedAt?: string;
  closeReason?: string;
  createdByUserId: string;
  updatedAt: string;
}

export interface CreateEncounterRequest {
  patientId: string;
  ownerId: string;
  appointmentId?: string;
  queueEntryId?: string;
  visitType: EncounterVisitType;
  origin: EncounterOrigin;
  reason: string;
}

export interface TransitionEncounterRequest {
  nextStatus: EncounterNextStatus;
}

export interface CloseEncounterRequest {
  closeReason: string;
}

export interface EncountersListResponse {
  items: EncounterSummary[];
}

export type EncounterTimelineEventType =
  | 'encounter_opened'
  | 'status_changed'
  | 'queue_checked_in'
  | 'queue_called'
  | 'triage_recorded'
  | 'encounter_closed';

export interface EncounterTimelineEventSummary {
  id: string;
  accountId: string;
  encounterId: string;
  eventType: EncounterTimelineEventType;
  summary: string;
  actorUserId: string;
  occurredAt: string;
}

export interface EncounterTimelineResponse {
  items: EncounterTimelineEventSummary[];
}

export interface EncounterFinancialReceivableSummary {
  id: string;
  installmentLabel: string;
  status: 'open' | 'settled';
  amountOriginal: number;
  amountPaid: number;
  amountOutstanding: number;
  dueAt?: string | null;
}

export interface EncounterFinancialSummary {
  encounterId: string;
  accountId: string;
  encounterStatus: 'open' | 'closed';
  financialStatus: 'pending' | 'partial' | 'paid';
  financialClosed: boolean;
  subtotal: number;
  discountTotal: number;
  total: number;
  paidAmount: number;
  balanceDue: number;
  closedAt?: string | null;
  closedByUserId?: string | null;
  notes?: string | null;
  receivables: EncounterFinancialReceivableSummary[];
}

export interface EncounterSummaryResponse {
  encounter: EncounterSummary;
  timeline: EncounterTimelineEventSummary[];
  diagnostics: {
    totalOrders: number;
    pendingOrders: number;
    releasedResults: number;
    latestOrders: Array<{
      id: string;
      examType: string;
      status: string;
      createdAt: string;
    }>;
  };
  financial: EncounterFinancialSummary | null;
}
