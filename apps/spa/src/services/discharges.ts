import { apiRequest } from './api';
import type {
  CreateDischargeRequest,
  UpdateDischargeRequest,
  DischargeListResponse
} from '@cvg-his-v2/shared-contracts';
import type { DischargeSummary } from '@cvg-his-v2/shared-types';

export const dischargeService = {
  async list(): Promise<DischargeSummary[]> {
    const response = await apiRequest<DischargeListResponse>('/discharges');
    return [...(response.items ?? [])];
  },

  async getById(dischargeId: string): Promise<DischargeSummary> {
    return apiRequest<DischargeSummary>(`/discharges/${dischargeId}`);
  },

  async create(payload: CreateDischargeRequest): Promise<DischargeSummary> {
    return apiRequest<DischargeSummary>('/discharges', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async update(
    dischargeId: string,
    payload: UpdateDischargeRequest & { expectedVersion?: number }
  ): Promise<DischargeSummary> {
    return apiRequest<DischargeSummary>(`/discharges/${dischargeId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  }
};
