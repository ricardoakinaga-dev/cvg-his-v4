import { apiRequest } from './api';
import type { ProfessionSummary, StaffSummary } from '@cvg-his-v2/shared-types';

interface StaffListResponse {
  items: readonly StaffSummary[];
}

interface ProfessionListResponse {
  items: readonly ProfessionSummary[];
}

export interface ListProfessionFilters {
  search?: string;
  isActive?: boolean;
}

export interface CreateProfessionPayload {
  code: string;
  name: string;
  description?: string | null;
}

export interface UpdateProfessionPayload {
  code?: string;
  name?: string;
  description?: string | null;
  isActive?: boolean;
}

export interface CreateStaffPayload {
  employeeCode: string;
  fullName: string;
  userId?: string | null;
  department?: string | null;
  jobTitle?: string | null;
  professionId?: string | null;
}

export interface UpdateStaffPayload {
  fullName?: string;
  department?: string | null;
  jobTitle?: string | null;
  professionId?: string | null;
  isActive?: boolean;
}

export const staffService = {
  async list(): Promise<StaffSummary[]> {
    const response = await apiRequest<StaffListResponse>('/staff');
    return [...(response.items ?? [])];
  },

  async getById(staffId: string): Promise<StaffSummary> {
    return apiRequest<StaffSummary>(`/staff/${staffId}`);
  },

  async create(payload: CreateStaffPayload): Promise<StaffSummary> {
    return apiRequest<StaffSummary>('/staff', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async update(staffId: string, payload: UpdateStaffPayload): Promise<StaffSummary> {
    return apiRequest<StaffSummary>(`/staff/${staffId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  },

  async toggleActive(staffId: string, isActive: boolean): Promise<StaffSummary> {
    return apiRequest<StaffSummary>(`/staff/${staffId}/toggle-active`, {
      method: 'POST',
      body: JSON.stringify({ isActive })
    });
  },

  async listProfessions(filters: ListProfessionFilters = {}): Promise<ProfessionSummary[]> {
    const params = new URLSearchParams();
    if (filters.search?.trim()) params.set('search', filters.search.trim());
    if (filters.isActive !== undefined) params.set('isActive', String(filters.isActive));
    const query = params.toString();
    const response = await apiRequest<ProfessionListResponse>(`/professions${query ? `?${query}` : ''}`);
    return [...(response.items ?? [])];
  },

  async createProfession(payload: CreateProfessionPayload): Promise<ProfessionSummary> {
    return apiRequest<ProfessionSummary>('/professions', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async updateProfession(
    professionId: string,
    payload: UpdateProfessionPayload
  ): Promise<ProfessionSummary> {
    return apiRequest<ProfessionSummary>(`/professions/${professionId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  },

  async toggleProfession(professionId: string, isActive: boolean): Promise<ProfessionSummary> {
    return apiRequest<ProfessionSummary>(`/professions/${professionId}/toggle-active`, {
      method: 'POST',
      body: JSON.stringify({ isActive })
    });
  }
};
