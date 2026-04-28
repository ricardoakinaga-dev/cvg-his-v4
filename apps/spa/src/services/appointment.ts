import { apiRequest } from './api';
import type {
  AppointmentSummary,
  CreateAppointmentRequest,
  AppointmentsListResponse,
  SchedulingAvailabilityResponse,
  SmartSchedulingRecommendationRequest,
  SmartSchedulingRecommendationResponse
} from '@/types/appointment';

export const appointmentService = {
  async list(filters?: { patientId?: string }): Promise<AppointmentSummary[]> {
    const search = new URLSearchParams();
    if (filters?.patientId) {
      search.set('patientId', filters.patientId);
    }
    const query = search.toString();
    const response = await apiRequest<AppointmentsListResponse>(
      query ? `/appointments?${query}` : '/appointments'
    );
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

  async recommendDuration(
    payload: SmartSchedulingRecommendationRequest
  ): Promise<SmartSchedulingRecommendationResponse> {
    return apiRequest<SmartSchedulingRecommendationResponse>('/scheduling/recommendations/duration', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async getAvailability(params: {
    scheduledAt: string;
    patientId: string;
    durationMinutes?: number;
    practitionerStaffId?: string;
    resourceLabel?: string;
    ignoreAppointmentId?: string;
  }): Promise<SchedulingAvailabilityResponse> {
    const search = new URLSearchParams({
      scheduledAt: params.scheduledAt,
      patientId: params.patientId
    });

    if (params.durationMinutes !== undefined) {
      search.set('durationMinutes', String(params.durationMinutes));
    }
    if (params.practitionerStaffId) {
      search.set('practitionerStaffId', params.practitionerStaffId);
    }
    if (params.resourceLabel) {
      search.set('resourceLabel', params.resourceLabel);
    }
    if (params.ignoreAppointmentId) {
      search.set('ignoreAppointmentId', params.ignoreAppointmentId);
    }

    return apiRequest<SchedulingAvailabilityResponse>(`/scheduling/availability?${search.toString()}`);
  },

  async cancel(id: string, reason?: string): Promise<AppointmentSummary> {
    return apiRequest<AppointmentSummary>(`/appointments/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify(reason ? { reason } : {})
    });
  },

  async startEncounter(id: string) {
    return apiRequest<{ id: string }>(`/appointments/${id}/start-encounter`, {
      method: 'POST'
    });
  }
};
