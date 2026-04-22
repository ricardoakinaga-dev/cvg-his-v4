import { apiRequest } from './api';

export interface FinanceCardRow {
  transactionId: string;
  provider: string;
  status: string;
  amount: number;
  currency?: string;
  description: string;
  installments: number;
  createdAt?: string;
  updatedAt?: string;
  cardHolderName?: string | null;
  cardBrand?: string | null;
  cardLast4?: string | null;
  ownerName?: string | null;
  patientName?: string | null;
  reconciliationState?: string | null;
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
  async list(search?: string): Promise<FinanceCardRow[]> {
    const params = new URLSearchParams();
    if (search?.trim()) params.set('search', search.trim());
    const query = params.toString();
    const response = await apiRequest<FinanceCardsResponse>(`/financial/reconciliation/cards${query ? `?${query}` : ''}`);
    return response.data ?? [];
  }
};
