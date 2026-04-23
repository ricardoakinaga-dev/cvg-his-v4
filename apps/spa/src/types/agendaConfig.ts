export interface AvailabilityRecord {
  id: string;
  accountId: string;
  professionalUserId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDurationMinutes: number;
  notes?: string | null;
}

export interface AppointmentTypeRecord {
  id: string;
  accountId: string;
  code: string;
  name: string;
  description?: string | null;
  defaultDurationMinutes: number;
  color?: string | null;
  active: boolean;
}

export interface PaginatedAgendaConfigResponse<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}
