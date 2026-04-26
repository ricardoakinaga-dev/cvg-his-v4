import { apiRequest } from './api';

export interface WarehouseItem {
  id: string;
  accountId: string;
  displayId: number;
  description: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WarehouseListResponse {
  items: WarehouseItem[];
  totalItems: number;
}

export interface WarehouseListFilters {
  search?: string;
  active?: boolean;
}

export interface WarehousePayload {
  description: string;
  active?: boolean;
}

function buildQuery(filters?: WarehouseListFilters): string {
  const query = new URLSearchParams();
  if (filters?.search) query.set('search', filters.search);
  if (filters?.active === false) query.set('active', 'false');
  const serialized = query.toString();
  return serialized ? `?${serialized}` : '';
}

export const warehousesService = {
  async list(filters?: WarehouseListFilters): Promise<WarehouseListResponse> {
    return apiRequest<WarehouseListResponse>(`/warehouses${buildQuery(filters)}`);
  },

  async create(payload: WarehousePayload): Promise<WarehouseItem> {
    return apiRequest<WarehouseItem>('/warehouses', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async update(id: string, payload: WarehousePayload): Promise<WarehouseItem> {
    return apiRequest<WarehouseItem>(`/warehouses/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  },

  async remove(id: string): Promise<void> {
    await apiRequest<void>(`/warehouses/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
  }
};
