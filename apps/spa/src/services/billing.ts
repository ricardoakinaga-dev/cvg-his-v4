import { apiRequest } from './api';
import type {
  BillingRecordSummary,
  BillingItemSummary,
  CreateBillingEstimateRequest,
  CreateBillingItemRequest,
  UpdateBillingStatusRequest,
  BillingListResponse,
  BillingItemListResponse
} from '@/types/billing';

export const billingService = {
  async list(filters?: string | { encounterId?: string; patientId?: string; ownerId?: string }): Promise<BillingRecordSummary[]> {
    const normalized = typeof filters === 'string' ? { encounterId: filters } : filters;
    const search = new URLSearchParams();
    if (normalized?.encounterId) search.set('encounterId', normalized.encounterId);
    if (normalized?.patientId) search.set('patientId', normalized.patientId);
    if (normalized?.ownerId) search.set('ownerId', normalized.ownerId);
    const query = search.toString();
    const response = await apiRequest<BillingListResponse>(query ? `/billing?${query}` : '/billing');
    return response.items ?? [];
  },

  async getByEncounter(encounterId: string): Promise<BillingRecordSummary> {
    return apiRequest<BillingRecordSummary>(`/billing/${encounterId}`);
  },

  async createEstimate(payload: CreateBillingEstimateRequest): Promise<BillingRecordSummary> {
    return apiRequest<BillingRecordSummary>('/billing/estimate', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async addItem(payload: CreateBillingItemRequest): Promise<BillingItemSummary> {
    return apiRequest<BillingItemSummary>('/billing/items', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async listItems(encounterId: string): Promise<BillingItemSummary[]> {
    const response = await apiRequest<BillingItemListResponse>(`/billing/${encounterId}/items`);
    return response.items ?? [];
  },

  async updateStatus(
    encounterId: string,
    payload: UpdateBillingStatusRequest
  ): Promise<BillingRecordSummary> {
    return apiRequest<BillingRecordSummary>(`/billing/${encounterId}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  }
};
