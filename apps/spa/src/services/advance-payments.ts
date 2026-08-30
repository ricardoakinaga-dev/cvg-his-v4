import { apiRequest } from './api';
import type {
  AdvancePaymentListResponse,
  AdvancePaymentStatus,
  AdvancePaymentSummary,
  CreateAdvancePaymentAllocationRequest,
  CreateAdvancePaymentRequest
} from '@cvg-his-v2/shared-contracts';

export type {
  AdvancePaymentStatus,
  AdvancePaymentSummary,
  CreateAdvancePaymentAllocationRequest,
  CreateAdvancePaymentRequest
} from '@cvg-his-v2/shared-contracts';

export interface AdvancePaymentListFilters {
  readonly search?: string;
  readonly status?: AdvancePaymentStatus;
  readonly dateFrom?: string;
  readonly dateTo?: string;
}

function buildQuery(filters: AdvancePaymentListFilters): string {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.status) params.set('status', filters.status);
  if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
  if (filters.dateTo) params.set('dateTo', filters.dateTo);
  const query = params.toString();
  return query ? `?${query}` : '';
}

export const advancePaymentsService = {
  async list(filters: AdvancePaymentListFilters = {}): Promise<readonly AdvancePaymentSummary[]> {
    const response = await apiRequest<AdvancePaymentListResponse>(
      `/finance/advance-payments${buildQuery(filters)}`
    );
    return response.items;
  },

  create(payload: CreateAdvancePaymentRequest): Promise<AdvancePaymentSummary> {
    return apiRequest<AdvancePaymentSummary>('/finance/advance-payments', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  compensate(
    advancePaymentId: string,
    payload: CreateAdvancePaymentAllocationRequest
  ): Promise<AdvancePaymentSummary> {
    return apiRequest<AdvancePaymentSummary>(
      `/finance/advance-payments/${encodeURIComponent(advancePaymentId)}/allocations`,
      {
        method: 'POST',
        body: JSON.stringify(payload)
      }
    );
  }
};
