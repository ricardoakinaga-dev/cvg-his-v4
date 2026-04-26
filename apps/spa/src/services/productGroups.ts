import { apiRequest } from './api';

export interface ProductGroupItem {
  id: string;
  accountId: string;
  displayId: number;
  description: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductGroupListResponse {
  items: ProductGroupItem[];
  totalItems: number;
}

export interface ProductGroupListFilters {
  search?: string;
  active?: boolean;
}

export interface ProductGroupPayload {
  description: string;
  active?: boolean;
}

function buildQuery(filters?: ProductGroupListFilters): string {
  const query = new URLSearchParams();
  if (filters?.search) query.set('search', filters.search);
  if (filters?.active === false) query.set('active', 'false');
  const serialized = query.toString();
  return serialized ? `?${serialized}` : '';
}

export const productGroupsService = {
  async list(filters?: ProductGroupListFilters): Promise<ProductGroupListResponse> {
    return apiRequest<ProductGroupListResponse>(`/product-groups${buildQuery(filters)}`);
  },

  async create(payload: ProductGroupPayload): Promise<ProductGroupItem> {
    return apiRequest<ProductGroupItem>('/product-groups', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async update(id: string, payload: ProductGroupPayload): Promise<ProductGroupItem> {
    return apiRequest<ProductGroupItem>(`/product-groups/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  },

  async remove(id: string): Promise<void> {
    await apiRequest<void>(`/product-groups/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
  }
};
