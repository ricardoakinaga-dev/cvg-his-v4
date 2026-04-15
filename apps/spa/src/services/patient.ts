import { apiRequest } from './api';
import type {
  PatientSummary,
  CreatePatientRequest,
  UpdatePatientRequest,
  PatientsListResponse,
  PatientListFilters
} from '@/types/patient';

export const patientService = {
  async list(filters?: string | PatientListFilters): Promise<PatientSummary[]> {
    const response = await this.listPage(filters);
    return response.items ?? [];
  },

  async listPage(filters?: string | PatientListFilters): Promise<PatientsListResponse> {
    const searchParams = new URLSearchParams();
    const normalizedFilters =
      typeof filters === 'string' ? ({ search: filters } satisfies PatientListFilters) : filters;

    if (normalizedFilters?.search) {
      searchParams.set('q', normalizedFilters.search);
    }
    if (normalizedFilters?.ownerId) {
      searchParams.set('ownerId', normalizedFilters.ownerId);
    }
    if (normalizedFilters?.species) {
      searchParams.set('species', normalizedFilters.species);
    }
    if (normalizedFilters?.status && normalizedFilters.status !== 'all') {
      searchParams.set('status', normalizedFilters.status);
    }
    if (normalizedFilters?.page) {
      searchParams.set('page', String(normalizedFilters.page));
    }
    if (normalizedFilters?.pageSize) {
      searchParams.set('pageSize', String(normalizedFilters.pageSize));
    }

    const query = searchParams.toString();
    return apiRequest<PatientsListResponse>(`/patients${query ? `?${query}` : ''}`);
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
