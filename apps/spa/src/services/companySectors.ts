import { apiRequest } from './api';

export interface CompanySectorItem {
  id: string;
  accountId: string;
  code: string;
  name: string;
  kind: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CompanySectorListResponse {
  items: CompanySectorItem[];
  totalItems: number;
}

export interface CompanySectorListFilters {
  search?: string;
  kind?: string;
  active?: boolean;
}

export interface CompanySectorPayload {
  code: string;
  name: string;
  kind?: string;
  active?: boolean;
}

function buildQuery(filters?: CompanySectorListFilters): string {
  const query = new URLSearchParams();
  if (filters?.search) query.set('search', filters.search);
  if (filters?.kind) query.set('kind', filters.kind);
  if (filters?.active === false) query.set('active', 'false');
  const serialized = query.toString();
  return serialized ? `?${serialized}` : '';
}

export const companySectorsService = {
  async list(filters?: CompanySectorListFilters): Promise<CompanySectorListResponse> {
    return apiRequest<CompanySectorListResponse>(`/company-sectors${buildQuery(filters)}`);
  },

  async create(payload: CompanySectorPayload): Promise<CompanySectorItem> {
    return apiRequest<CompanySectorItem>('/company-sectors', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async update(id: string, payload: CompanySectorPayload): Promise<CompanySectorItem> {
    return apiRequest<CompanySectorItem>(`/company-sectors/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  },

  async remove(id: string): Promise<void> {
    await apiRequest<void>(`/company-sectors/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
  }
};
