export type AppointmentVisitType = 'walk_in' | 'scheduled' | 'return';
export type AppointmentStatus = 'scheduled' | 'checked_in' | 'completed' | 'cancelled';

export interface AppointmentSummary {
  id: string;
  accountId: string;
  patientId: string;
  ownerId: string;
  scheduledAt: string;
  visitType: AppointmentVisitType;
  reason: string;
  status: AppointmentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAppointmentRequest {
  patientId: string;
  ownerId: string;
  scheduledAt: string;
  visitType: AppointmentVisitType;
  reason: string;
}

export interface AppointmentsListResponse {
  items: AppointmentSummary[];
}
