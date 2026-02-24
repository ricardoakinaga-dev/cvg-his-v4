// Agenda API client functions
import { api, ApiError } from '@/lib/api/client';

// Types
export interface AppointmentType {
  id: string;
  accountId: string;
  code: string;
  name: string;
  sector: string;
  defaultDurationMinutes: number;
  requiresResource: boolean;
  requiresTeam: boolean;
  active: boolean;
  createdAt?: string;
}

export interface Collaborator {
  id: string;
  accountId: string;
  userId?: string;
  name: string;
  roleTitle?: string;
  specialty?: string;
  licenseType?: string;
  licenseNumber?: string;
  phone?: string;
  email?: string;
  status: 'active' | 'inactive';
  defaultAppointmentDurationMinutes: number;
  createdAt: string;
  updatedAt: string;
}

export interface CollaboratorAvailability {
  id: string;
  accountId: string;
  collaboratorId: string;
  weekday: number;
  startTime: string;
  endTime: string;
  breaksJson: Array<{ start: string; end: string }>;
  active: boolean;
}

export interface CollaboratorTimeOff {
  id: string;
  accountId: string;
  collaboratorId: string;
  startAt: string;
  endAt: string;
  reason?: string;
}

export interface Resource {
  id: string;
  accountId: string;
  name: string;
  type: 'room' | 'surgery_room' | 'equipment';
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Appointment {
  id: string;
  typeId: string;
  typeName?: string;
  typeCode?: string;
  typeSector?: string;
  typeRequiresTeam?: boolean;
  typeRequiresResource?: boolean;
  serviceId?: string;
  serviceName?: string;
  ownerId?: string;
  ownerName?: string;
  ownerPhone?: string;
  patientId?: string;
  patientName?: string;
  patientSpecies?: string;
  primaryCollaboratorId: string;
  collaboratorName?: string;
  collaboratorRoleTitle?: string;
  resourceId?: string;
  resourceName?: string;
  resourceType?: string;
  startAt: string;
  endAt: string;
  status: 'scheduled' | 'confirmed' | 'arrived' | 'in_progress' | 'done' | 'canceled' | 'no_show';
  notes?: string;
  team?: Array<{
    id: string;
    collaboratorId: string;
    collaboratorName?: string;
    teamRole: string;
  }>;
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SlotInfo {
  start: string;
  end: string;
}

export interface AvailabilitySlotsResponse {
  date: string;
  collaboratorId: string;
  collaboratorName: string;
  durationMinutes: number;
  isTimeOff: boolean;
  windows: SlotInfo[];
  freeWindows: SlotInfo[];
  slots: SlotInfo[];
  conflicts: Array<{
    id: string;
    startAt: string;
    endAt: string;
    status: string;
  }>;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// Appointment Types API
export const appointmentTypesApi = {
  list: async (params?: { query?: string; sector?: string; active?: boolean; page?: number; pageSize?: number }) => {
    return api.get<PaginatedResponse<AppointmentType>>('/agenda/appointment-types', params);
  },
  
  get: async (id: string) => {
    return api.get<AppointmentType>(`/agenda/appointment-types/${id}`);
  },
  
  create: async (data: Partial<AppointmentType>) => {
    return api.post<AppointmentType>('/agenda/appointment-types', data);
  },
  
  update: async (id: string, data: Partial<AppointmentType>) => {
    return api.put<AppointmentType>(`/agenda/appointment-types/${id}`, data);
  }
};

// Collaborators API
export const collaboratorsApi = {
  list: async (params?: { query?: string; status?: string; roleTitle?: string; page?: number; pageSize?: number }) => {
    return api.get<PaginatedResponse<Collaborator>>('/agenda/collaborators', params);
  },
  
  get: async (id: string) => {
    return api.get<Collaborator>(`/agenda/collaborators/${id}`);
  },
  
  create: async (data: Partial<Collaborator>) => {
    return api.post<Collaborator>('/agenda/collaborators', data);
  },
  
  update: async (id: string, data: Partial<Collaborator>) => {
    return api.put<Collaborator>(`/agenda/collaborators/${id}`, data);
  },
  
  getAvailability: async (id: string) => {
    return api.get<{ collaboratorId: string; availability: CollaboratorAvailability[]; timeOffs: CollaboratorTimeOff[] }>(
      `/agenda/collaborators/${id}/availability`
    );
  },
  
  updateAvailability: async (id: string, availability: Partial<CollaboratorAvailability>[]) => {
    return api.put<{ collaboratorId: string; availability: CollaboratorAvailability[] }>(
      `/agenda/collaborators/${id}/availability`,
      { availability }
    );
  },
  
  getTimeOff: async (id: string) => {
    return api.get<{ collaboratorId: string; timeOffs: CollaboratorTimeOff[] }>(
      `/agenda/collaborators/${id}/time-off`
    );
  },
  
  createTimeOff: async (id: string, data: { startAt: string; endAt: string; reason?: string }) => {
    return api.post<CollaboratorTimeOff>(`/agenda/collaborators/${id}/time-off`, data);
  },
  
  deleteTimeOff: async (id: string, timeOffId: string) => {
    return api.delete<{ success: boolean }>(`/agenda/collaborators/${id}/time-off/${timeOffId}`);
  }
};

// Resources API
export const resourcesApi = {
  list: async (params?: { query?: string; type?: string; active?: boolean; page?: number; pageSize?: number }) => {
    return api.get<PaginatedResponse<Resource>>('/agenda/resources', params);
  },
  
  get: async (id: string) => {
    return api.get<Resource>(`/agenda/resources/${id}`);
  },
  
  create: async (data: Partial<Resource>) => {
    return api.post<Resource>('/agenda/resources', data);
  },
  
  update: async (id: string, data: Partial<Resource>) => {
    return api.put<Resource>(`/agenda/resources/${id}`, data);
  }
};

// Appointments API
export const appointmentsApi = {
  list: async (params?: {
    from?: string;
    to?: string;
    collaboratorId?: string;
    resourceId?: string;
    typeId?: string;
    sector?: string;
    ownerId?: string;
    patientId?: string;
    status?: string;
    page?: number;
    pageSize?: number;
  }) => {
    return api.get<PaginatedResponse<Appointment>>('/agenda/appointments', params);
  },
  
  get: async (id: string) => {
    return api.get<Appointment>(`/agenda/appointments/${id}`);
  },
  
  create: async (data: {
    typeId: string;
    serviceId?: string;
    ownerId?: string;
    patientId?: string;
    primaryCollaboratorId: string;
    resourceId?: string;
    startAt: string;
    endAt: string;
    notes?: string;
    team?: Array<{ collaboratorId: string; role: string }>;
    forceOverbook?: boolean;
  }) => {
    return api.post<Appointment>('/agenda/appointments', data);
  },
  
  update: async (id: string, data: Partial<{
    typeId: string;
    serviceId?: string;
    ownerId?: string;
    patientId?: string;
    primaryCollaboratorId: string;
    resourceId?: string;
    startAt: string;
    endAt: string;
    notes?: string;
    team: Array<{ collaboratorId: string; role: string }>;
    forceOverbook: boolean;
  }>) => {
    return api.put<Appointment>(`/agenda/appointments/${id}`, data);
  },
  
  cancel: async (id: string, reason?: string) => {
    return api.post<Appointment>(`/agenda/appointments/${id}/cancel`, { reason });
  },
  
  confirm: async (id: string) => {
    return api.post<Appointment>(`/agenda/appointments/${id}/confirm`);
  }
};

// Availability/Slots API
export const availabilityApi = {
  getSlots: async (params: {
    collaboratorId: string;
    date: string;
    typeId?: string;
    resourceId?: string;
  }) => {
    return api.get<AvailabilitySlotsResponse>('/agenda/availability/slots', params);
  },
  
  getAvailability: async (collaboratorId: string) => {
    return api.get<{ collaboratorId: string; availability: CollaboratorAvailability[]; timeOffs: CollaboratorTimeOff[] }>(
      '/agenda/availability',
      { collaboratorId }
    );
  },
  
  updateAvailability: async (collaboratorId: string, availability: Partial<CollaboratorAvailability>[]) => {
    return api.put<{ collaboratorId: string; availability: CollaboratorAvailability[] }>(
      `/agenda/availability?collaboratorId=${collaboratorId}`,
      { availability }
    );
  },
  
  createTimeOff: async (collaboratorId: string, data: { startAt: string; endAt: string; reason?: string }) => {
    return api.post<CollaboratorTimeOff>(`/agenda/availability/time-off?collaboratorId=${collaboratorId}`, data);
  },
  
  deleteTimeOff: async (collaboratorId: string, timeOffId: string) => {
    return api.delete<{ success: boolean }>(`/agenda/availability/time-off/${timeOffId}?collaboratorId=${collaboratorId}`);
  }
};
