import { apiRequest } from './api';
import type { StaffSummary } from '@cvg-his-v2/shared-types';

interface StaffListResponse {
  items: readonly StaffSummary[];
}

export interface CreateStaffPayload {
  employeeCode: string;
  fullName: string;
  userId?: string | null;
  department?: string | null;
  jobTitle?: string | null;
}

export interface UpdateStaffPayload {
  fullName?: string;
  department?: string | null;
  jobTitle?: string | null;
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
  }
};