import { apiRequest } from './api';

export interface ServiceSummary {
  readonly id: string;
  readonly accountId: string;
  readonly name: string;
  readonly code: string | null;
  readonly description: string | null;
  readonly basePrice: number;
  readonly active: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

interface ServicesListResponse {
  items: readonly ServiceSummary[];
}

export interface ServiceListFilters {
  search?: string;
  active?: boolean;
}

export interface CreateServicePayload {
  name: string;
  code?: string | null;
  description?: string | null;
  basePrice: number;
  active?: boolean;
}

export interface UpdateServicePayload {
  name?: string;
  code?: string | null;
  description?: string | null;
  basePrice?: number;
  active?: boolean;
}

export const servicesService = {
  async list(filters?: string | ServiceListFilters): Promise<ServiceSummary[]> {
    const searchParams = new URLSearchParams();
    const normalizedFilters =
      typeof filters === 'string' ? ({ search: filters } satisfies ServiceListFilters) : filters;

    if (normalizedFilters?.search) {
      searchParams.set('search', normalizedFilters.search);
    }
    if (typeof normalizedFilters?.active === 'boolean') {
      searchParams.set('active', normalizedFilters.active ? 'true' : 'false');
    }

    const params = searchParams.toString();
    const response = await apiRequest<ServicesListResponse>(`/services${params ? `?${params}` : ''}`);
    return [...(response.items ?? [])];
  },

  async getById(serviceId: string): Promise<ServiceSummary> {
    return apiRequest<ServiceSummary>(`/services/${serviceId}`);
  },

  async create(payload: CreateServicePayload): Promise<ServiceSummary> {
    return apiRequest<ServiceSummary>('/services', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async update(serviceId: string, payload: UpdateServicePayload): Promise<ServiceSummary> {
    return apiRequest<ServiceSummary>(`/services/${serviceId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  }
};
