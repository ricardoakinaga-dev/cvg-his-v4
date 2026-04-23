import { apiRequest } from './api';
import type {
  AppointmentTypeRecord,
  AvailabilityRecord,
  PaginatedAgendaConfigResponse
} from '@/types/agendaConfig';

export const agendaConfigService = {
  async listAvailability(): Promise<PaginatedAgendaConfigResponse<AvailabilityRecord>> {
    return apiRequest<PaginatedAgendaConfigResponse<AvailabilityRecord>>('/availability');
  },

  async createAvailability(
    payload: Omit<AvailabilityRecord, 'id' | 'accountId'>
  ): Promise<AvailabilityRecord> {
    return apiRequest<AvailabilityRecord>('/availability', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async listAppointmentTypes(): Promise<PaginatedAgendaConfigResponse<AppointmentTypeRecord>> {
    return apiRequest<PaginatedAgendaConfigResponse<AppointmentTypeRecord>>('/appointment-types');
  },

  async createAppointmentType(
    payload: Omit<AppointmentTypeRecord, 'id' | 'accountId'>
  ): Promise<AppointmentTypeRecord> {
    return apiRequest<AppointmentTypeRecord>('/appointment-types', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }
};
