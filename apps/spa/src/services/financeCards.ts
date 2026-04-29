import { apiRequest } from './api';

export interface FinanceCardRow {
  transactionId: string;
  provider: string;
  status: string;
  amount: number;
  netAmount?: number | null;
  feeAmount?: number | null;
  currency?: string;
  description: string;
  installments: number;
  createdAt?: string;
  updatedAt?: string;
  capturedAt?: string | null;
  providerOrderId?: string | null;
  providerChargeId?: string | null;
  providerAuthorizationCode?: string | null;
  providerReferenceId?: string | null;
  billingRecordId?: string | null;
  billingSettlementStatus?: string | null;
  billingSettledAt?: string | null;
  billingSettlementError?: string | null;
  failureReason?: string | null;
  encounterId?: string | null;
  encounterStatus?: string | null;
  financialStatus?: string | null;
  patientId?: string | null;
  cardHolderName?: string | null;
  cardBrand?: string | null;
  cardLast4?: string | null;
  ownerId?: string | null;
  ownerName?: string | null;
  patientName?: string | null;
  receivableIds?: string[];
  receivableLabels?: string[];
  receivableStatuses?: string[];
  receivablePaymentIds?: string[];
  receivablePaidAmount?: number;
  reconciliationState?: string | null;
}

export interface FinanceCardsFilters {
  search?: string;
  status?: string;
  provider?: string;
  page?: number;
  pageSize?: number;
}

interface FinanceCardsResponse {
  data: FinanceCardRow[];
  total: number;
  capturedCount: number;
  awaitingCaptureCount: number;
  attentionCount: number;
  pendingCount: number;
  reconciledCount: number;
}

export const financeCardsService = {
  async list(filters?: FinanceCardsFilters | string): Promise<FinanceCardRow[]> {
    const params = new URLSearchParams();
    const normalizedFilters = typeof filters === 'string' ? { search: filters } : (filters ?? {});
    if (normalizedFilters.search?.trim()) params.set('search', normalizedFilters.search.trim());
    if (normalizedFilters.status) params.set('status', normalizedFilters.status);
    if (normalizedFilters.provider) params.set('provider', normalizedFilters.provider);
    if (normalizedFilters.page) params.set('page', String(normalizedFilters.page));
    if (normalizedFilters.pageSize) params.set('pageSize', String(normalizedFilters.pageSize));
    const query = params.toString();
    const response = await apiRequest<FinanceCardsResponse>(`/financial/reconciliation/cards${query ? `?${query}` : ''}`);
    return response.data ?? [];
  }
};
