import { apiRequest } from './api';
import type {
  AppointmentSummary,
  CreateAppointmentRequest,
  AppointmentsListResponse
} from '@/types/appointment';

export const appointmentService = {
  async list(): Promise<AppointmentSummary[]> {
    const response = await apiRequest<AppointmentsListResponse>('/appointments');
    return response.items ?? [];
  },

  async getById(id: string): Promise<AppointmentSummary> {
    return apiRequest<AppointmentSummary>(`/appointments/${id}`);
  },

  async create(payload: CreateAppointmentRequest): Promise<AppointmentSummary> {
    return apiRequest<AppointmentSummary>('/appointments', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async cancel(id: string, reason?: string): Promise<AppointmentSummary> {
    return apiRequest<AppointmentSummary>(`/appointments/${id}/cancel`, {
      method: 'POST',
      body: reason ? JSON.stringify({ reason }) : undefined
    });
  }
};
