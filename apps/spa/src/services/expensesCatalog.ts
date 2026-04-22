import { apiRequest } from './api';

export interface ExpenseCatalogItem {
  id: string;
  name: string;
  kind: string;
  category: string;
  costCenterCode: string;
  costCenterName: string;
  description: string;
}

export interface ExpenseCostCenterItem {
  code: string;
  name: string;
  kind: string;
  owner: string;
  description: string;
}

export interface ExpenseCatalogListFilters {
  search?: string;
  category?: string;
  costCenter?: string;
  page?: number;
  pageSize?: number;
  sort?: 'name' | 'category' | 'costCenterCode' | 'id';
  order?: 'asc' | 'desc';
}

export interface CreateExpenseCatalogItemInput {
  name: string;
  kind: string;
  category: string;
  costCenterCode: string;
  description: string;
}

export interface UpdateExpenseCatalogItemInput extends CreateExpenseCatalogItemInput {}

export interface ExpenseCatalogListResponse {
  items: ExpenseCatalogItem[];
  categories: string[];
  costCenters: ExpenseCostCenterItem[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  sort: string;
  order: string;
}

function buildQuery(filters?: ExpenseCatalogListFilters): string {
  const params = new URLSearchParams();
  if (filters?.search) params.set('search', filters.search);
  if (filters?.category) params.set('category', filters.category);
  if (filters?.costCenter) params.set('costCenterCode', filters.costCenter);
  if (filters?.page) params.set('page', String(filters.page));
  if (filters?.pageSize) params.set('pageSize', String(filters.pageSize));
  if (filters?.sort) params.set('sort', filters.sort);
  if (filters?.order) params.set('order', filters.order);
  const query = params.toString();
  return query ? `?${query}` : '';
}

export const expensesCatalogService = {
  async list(filters?: ExpenseCatalogListFilters): Promise<ExpenseCatalogListResponse> {
    return apiRequest<ExpenseCatalogListResponse>(`/expenses-catalog${buildQuery(filters)}`);
  },

  async create(input: CreateExpenseCatalogItemInput): Promise<ExpenseCatalogItem> {
    return apiRequest<ExpenseCatalogItem>('/expenses-catalog', {
      method: 'POST',
      body: JSON.stringify(input)
    });
  },

  async update(id: string, input: UpdateExpenseCatalogItemInput): Promise<ExpenseCatalogItem> {
    return apiRequest<ExpenseCatalogItem>(`/expenses-catalog/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(input)
    });
  },

  async remove(id: string): Promise<{ ok: true }> {
    return apiRequest<{ ok: true }>(`/expenses-catalog/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
  }
};
