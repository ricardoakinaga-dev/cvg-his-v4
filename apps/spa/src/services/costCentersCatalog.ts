import { apiRequest } from './api';

export interface CostCenterCatalogItem {
  code: string;
  name: string;
  kind: string;
  owner: string;
  description: string;
}

export interface CostCenterCatalogFilters {
  search?: string;
  kind?: string;
  page?: number;
  pageSize?: number;
  sort?: 'name' | 'code' | 'kind' | 'owner';
  order?: 'asc' | 'desc';
}

export interface CreateCostCenterCatalogInput {
  code: string;
  name: string;
  kind: string;
  owner: string;
  description: string;
}

export interface UpdateCostCenterCatalogInput extends CreateCostCenterCatalogInput {}

export interface CostCenterCatalogListResponse {
  items: CostCenterCatalogItem[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  sort: string;
  order: string;
}

function buildQuery(filters?: CostCenterCatalogFilters): string {
  const params = new URLSearchParams();
  if (filters?.search) params.set('search', filters.search);
  if (filters?.kind) params.set('kind', filters.kind);
  if (filters?.page) params.set('page', String(filters.page));
  if (filters?.pageSize) params.set('pageSize', String(filters.pageSize));
  if (filters?.sort) params.set('sort', filters.sort);
  if (filters?.order) params.set('order', filters.order);
  const query = params.toString();
  return query ? `?${query}` : '';
}

export const costCentersCatalogService = {
  async list(filters?: CostCenterCatalogFilters): Promise<CostCenterCatalogListResponse> {
    return apiRequest<CostCenterCatalogListResponse>(`/cost-centers-catalog${buildQuery(filters)}`);
  },

  async create(input: CreateCostCenterCatalogInput): Promise<CostCenterCatalogItem> {
    return apiRequest<CostCenterCatalogItem>('/cost-centers-catalog', {
      method: 'POST',
      body: JSON.stringify(input)
    });
  },

  async update(code: string, input: UpdateCostCenterCatalogInput): Promise<CostCenterCatalogItem> {
    return apiRequest<CostCenterCatalogItem>(`/cost-centers-catalog/${encodeURIComponent(code)}`, {
      method: 'PATCH',
      body: JSON.stringify(input)
    });
  },

  async remove(code: string): Promise<{ ok: true }> {
    return apiRequest<{ ok: true }>(`/cost-centers-catalog/${encodeURIComponent(code)}`, {
      method: 'DELETE'
    });
  }
};
