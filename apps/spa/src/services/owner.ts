import { apiRequest } from './api';
import type {
  OwnerSummary,
  CreateOwnerRequest,
  UpdateOwnerRequest,
  OwnersListResponse
} from '@/types/owner';

export const ownerService = {
  async list(search?: string): Promise<OwnerSummary[]> {
    const params = search ? `?q=${encodeURIComponent(search)}` : '';
    const response = await apiRequest<OwnersListResponse>(`/owners${params}`);
    return response.items ?? [];
  },

  async getById(id: string): Promise<OwnerSummary> {
    return apiRequest<OwnerSummary>(`/owners/${id}`);
  },

  async create(payload: CreateOwnerRequest): Promise<OwnerSummary> {
    return apiRequest<OwnerSummary>('/owners', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async update(id: string, payload: UpdateOwnerRequest): Promise<OwnerSummary> {
    return apiRequest<OwnerSummary>(`/owners/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  }
};
