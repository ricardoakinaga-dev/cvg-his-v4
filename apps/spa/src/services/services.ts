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
  async list(search?: string): Promise<ServiceSummary[]> {
    const params = search ? `?search=${encodeURIComponent(search)}` : '';
    const response = await apiRequest<ServicesListResponse>(`/services${params}`);
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