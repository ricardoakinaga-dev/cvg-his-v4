import { apiRequest } from './api';

export interface ManufacturerItem {
  id: string;
  accountId: string;
  displayId: number;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ManufacturerListResponse {
  items: ManufacturerItem[];
  totalItems: number;
}

export interface ManufacturerListFilters {
  search?: string;
  active?: boolean;
}

export interface ManufacturerPayload {
  name: string;
  active?: boolean;
}

function buildQuery(filters?: ManufacturerListFilters): string {
  const query = new URLSearchParams();
  if (filters?.search) query.set('search', filters.search);
  if (filters?.active === false) query.set('active', 'false');
  const serialized = query.toString();
  return serialized ? `?${serialized}` : '';
}

export const manufacturersService = {
  async list(filters?: ManufacturerListFilters): Promise<ManufacturerListResponse> {
    return apiRequest<ManufacturerListResponse>(`/manufacturers${buildQuery(filters)}`);
  },

  async create(payload: ManufacturerPayload): Promise<ManufacturerItem> {
    return apiRequest<ManufacturerItem>('/manufacturers', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async update(id: string, payload: ManufacturerPayload): Promise<ManufacturerItem> {
    return apiRequest<ManufacturerItem>(`/manufacturers/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  },

  async remove(id: string): Promise<void> {
    await apiRequest<void>(`/manufacturers/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
  }
};
