import { apiRequest } from './api';
import type {
  OwnerSummary,
  CreateOwnerRequest,
  UpdateOwnerRequest,
  OwnersListResponse,
  OwnerListFilters,
  OwnerSummaryResponse
} from '@/types/owner';

export const ownerService = {
  async list(filters?: string | OwnerListFilters): Promise<OwnerSummary[]> {
    const response = await this.listPage(filters);
    return response.items ?? [];
  },

  async listPage(filters?: string | OwnerListFilters): Promise<OwnersListResponse> {
    const searchParams = new URLSearchParams();
    const normalizedFilters =
      typeof filters === 'string' ? ({ search: filters } satisfies OwnerListFilters) : filters;

    if (normalizedFilters?.search) {
      searchParams.set('q', normalizedFilters.search);
    }
    if (normalizedFilters?.status && normalizedFilters.status !== 'all') {
      searchParams.set('status', normalizedFilters.status);
    }
    if (typeof normalizedFilters?.financialResponsible === 'boolean') {
      searchParams.set(
        'financialResponsible',
        normalizedFilters.financialResponsible ? 'true' : 'false'
      );
    }
    if (normalizedFilters?.page) {
      searchParams.set('page', String(normalizedFilters.page));
    }
    if (normalizedFilters?.pageSize) {
      searchParams.set('pageSize', String(normalizedFilters.pageSize));
    }

    const query = searchParams.toString();
    return apiRequest<OwnersListResponse>(`/owners${query ? `?${query}` : ''}`);
  },

  async getById(id: string): Promise<OwnerSummary> {
    return apiRequest<OwnerSummary>(`/owners/${id}`);
  },

  async getSummary(id: string): Promise<OwnerSummaryResponse> {
    return apiRequest<OwnerSummaryResponse>(`/owners/${id}/summary`);
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
