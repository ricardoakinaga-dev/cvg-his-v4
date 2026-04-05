import { apiRequest } from './api';
import type {
  PatientSummary,
  CreatePatientRequest,
  UpdatePatientRequest,
  PatientsListResponse
} from '@/types/patient';

export const patientService = {
  async list(search?: string): Promise<PatientSummary[]> {
    const params = search ? `?q=${encodeURIComponent(search)}` : '';
    const response = await apiRequest<PatientsListResponse>(`/patients${params}`);
    return response.items ?? [];
  },

  async getById(id: string): Promise<PatientSummary> {
    return apiRequest<PatientSummary>(`/patients/${id}`);
  },

  async create(payload: CreatePatientRequest): Promise<PatientSummary> {
    return apiRequest<PatientSummary>('/patients', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async update(id: string, payload: UpdatePatientRequest): Promise<PatientSummary> {
    return apiRequest<PatientSummary>(`/patients/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  }
};
