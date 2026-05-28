export type AppointmentVisitType = 'walk_in' | 'scheduled' | 'return';
export type AppointmentStatus = 'scheduled' | 'checked_in' | 'completed' | 'cancelled';

export interface AppointmentSummary {
  id: string;
  accountId: string;
  patientId: string;
  ownerId: string;
  scheduledAt: string;
  durationMinutes?: number;
  visitType: AppointmentVisitType;
  reason: string;
  practitionerStaffId?: string;
  serviceId?: string;
  unit?: string;
  specialty?: string;
  resourceLabel?: string;
  status: AppointmentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAppointmentRequest {
  patientId: string;
  ownerId: string;
  scheduledAt: string;
  durationMinutes?: number;
  visitType: AppointmentVisitType;
  reason: string;
  practitionerStaffId?: string;
  serviceId?: string;
  unit?: string;
  specialty?: string;
  resourceLabel?: string;
  smartSchedulingRecommendationId?: string;
}

export interface RescheduleAppointmentRequest {
  scheduledAt: string;
  durationMinutes?: number;
  visitType?: AppointmentVisitType;
  reason?: string;
  practitionerStaffId?: string;
  serviceId?: string;
  unit?: string;
  specialty?: string;
  resourceLabel?: string;
}

export interface AppointmentsListResponse {
  items: AppointmentSummary[];
}

export interface SchedulingConflictSummary {
  type:
    | 'patient_overlap'
    | 'staff_overlap'
    | 'resource_overlap'
    | 'operational_block'
    | 'outside_hours';
  severity: 'warning' | 'critical';
  message: string;
  startsAt: string;
  endsAt: string;
  appointmentId?: string;
  blockId?: string;
}

export interface SchedulingOperationalBlockSummary {
  id: string;
  accountId: string;
  title: string;
  kind: 'lunch_break' | 'team_huddle' | 'resource_block';
  startsAt: string;
  endsAt: string;
  practitionerStaffId?: string;
  unit?: string;
  resourceLabel?: string;
}

export interface SchedulingAppointmentOperationalSummary {
  stage:
    | 'scheduled'
    | 'checked_in'
    | 'called'
    | 'in_triage'
    | 'in_care'
    | 'observation'
    | 'completed'
    | 'cancelled';
  label: string;
  source: 'appointment' | 'queue';
  queueEntryId?: string;
  queueStatus?: 'waiting' | 'called' | 'in_triage' | 'in_care' | 'observation' | 'completed' | 'cancelled';
  encounterId?: string;
  updatedAt: string;
}

export interface SchedulingProfessionalSummary {
  id: string;
  fullName: string;
  department: string;
  jobTitle: string;
  specialty?: string;
  unit?: string;
  status: 'active' | 'inactive';
}

export interface SchedulingCockpitAppointmentSummary extends AppointmentSummary {
  endsAt: string;
  practitionerName?: string;
  serviceName?: string;
  conflicts: SchedulingConflictSummary[];
  operational: SchedulingAppointmentOperationalSummary;
}

export interface SchedulingOverviewResponse {
  viewMode: 'day' | 'week' | 'month';
  windowStart: string;
  windowEnd: string;
  stats: {
    total: number;
    scheduled: number;
    checkedIn: number;
    completed: number;
    cancelled: number;
    conflicts: number;
    unassigned: number;
  };
  professionals: SchedulingProfessionalSummary[];
  blocks: SchedulingOperationalBlockSummary[];
  filterOptions: {
    units: string[];
    specialties: string[];
    statuses: AppointmentStatus[];
  };
  items: SchedulingCockpitAppointmentSummary[];
}

export interface SchedulingAvailabilityResponse {
  available: boolean;
  requestedSlot: {
    startsAt: string;
    endsAt: string;
    durationMinutes: number;
  };
  conflicts: SchedulingConflictSummary[];
  blocks: SchedulingOperationalBlockSummary[];
  suggestions: Array<{
    startsAt: string;
    endsAt: string;
    available: boolean;
    reason: string;
  }>;
}

export interface SmartSchedulingRecommendationRequest {
  patientId: string;
  scheduledAt: string;
  visitType?: AppointmentVisitType;
  reason?: string;
  practitionerStaffId?: string;
  serviceId?: string;
  specialty?: string;
  unit?: string;
  resourceLabel?: string;
}

export interface SmartSchedulingRecommendationResponse {
  recommendationId: string;
  predictedDurationMinutes: number;
  confidence: number;
  historicalAverageMinutes: number;
  suggestedBufferMinutes: number;
  factors: string[];
  basedOn: {
    patientId: string;
    previousVisits: number;
    visitType: AppointmentVisitType;
  };
}
