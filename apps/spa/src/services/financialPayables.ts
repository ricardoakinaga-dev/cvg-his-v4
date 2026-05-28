import { apiRequest } from './api';

export type FinancialPayableStatus = 'open' | 'partial' | 'paid' | 'cancelled';
export type FinancialPayablePaymentMethod = 'cash' | 'bank_transfer' | 'pix' | 'card' | 'cheque' | 'other';
export type FinancialPayableReconciliationStatus = 'not_required' | 'pending' | 'reconciled';

export interface FinancialPayableRecord {
  readonly id: string;
  readonly accountId: string;
  readonly supplierName: string;
  readonly description: string;
  readonly category: string;
  readonly costCenterCode: string;
  readonly costCenterName: string;
  readonly issuedAt: string;
  readonly dueAt: string;
  readonly totalAmount: number;
  readonly paidAmount: number;
  readonly outstandingAmount: number;
  readonly status: FinancialPayableStatus;
  readonly sourceExpenseId: string | null;
  readonly notes: string | null;
  readonly paymentMethod: FinancialPayablePaymentMethod | null;
  readonly paymentReference: string | null;
  readonly reconciliationStatus: FinancialPayableReconciliationStatus;
  readonly reconciliationReference: string | null;
  readonly createdByUserId: string;
  readonly paidByUserId: string | null;
  readonly cancelledByUserId: string | null;
  readonly reconciledByUserId: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly paidAt: string | null;
  readonly cancelledAt: string | null;
  readonly reconciledAt: string | null;
}

export interface FinancialPayableListResponse {
  readonly data: readonly FinancialPayableRecord[];
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
  readonly openCount: number;
  readonly paidCount: number;
  readonly cancelledCount: number;
  readonly totalAmount: number;
  readonly totalPaid: number;
  readonly totalOutstanding: number;
}

export interface FinancialPayableListFilters {
  readonly search?: string;
  readonly status?: '' | FinancialPayableStatus;
  readonly page?: number;
  readonly pageSize?: number;
}

export interface FinancialPayableReconciliationResponse {
  readonly data: readonly FinancialPayableRecord[];
  readonly page: number;
  readonly pageSize: number;
  readonly total: number;
  readonly pendingCount: number;
  readonly reconciledCount: number;
  readonly pendingAmount: number;
  readonly reconciledAmount: number;
}

export interface CreateFinancialPayablePayload {
  readonly supplierName: string;
  readonly description: string;
  readonly category: string;
  readonly costCenterCode: string;
  readonly costCenterName: string;
  readonly issuedAt?: string;
  readonly dueAt: string;
  readonly totalAmount: number;
  readonly sourceExpenseId?: string | null;
  readonly notes?: string | null;
}

export const financialPayablesService = {
  async list(filters: FinancialPayableListFilters = {}): Promise<FinancialPayableListResponse> {
    const search = new URLSearchParams();
    if (filters.search) search.set('search', filters.search);
    if (filters.status) search.set('status', filters.status);
    if (filters.page) search.set('page', String(filters.page));
    if (filters.pageSize) search.set('pageSize', String(filters.pageSize));
    const query = search.toString();
    return apiRequest<FinancialPayableListResponse>(query ? `/financial/payables?${query}` : '/financial/payables');
  },

  async create(payload: CreateFinancialPayablePayload): Promise<FinancialPayableRecord> {
    return apiRequest<FinancialPayableRecord>('/financial/payables', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async pay(
    payableId: string,
    payload: {
      amountPaid: number;
      paymentMethod?: FinancialPayablePaymentMethod | null;
      paymentReference?: string | null;
      notes?: string | null;
    }
  ): Promise<FinancialPayableRecord> {
    return apiRequest<FinancialPayableRecord>(`/financial/payables/${encodeURIComponent(payableId)}/pay`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async cancel(payableId: string, notes?: string | null): Promise<FinancialPayableRecord> {
    return apiRequest<FinancialPayableRecord>(`/financial/payables/${encodeURIComponent(payableId)}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ notes: notes ?? null })
    });
  },

  async listReconciliation(filters: {
    status?: '' | FinancialPayableReconciliationStatus;
    search?: string;
    page?: number;
    pageSize?: number;
  } = {}): Promise<FinancialPayableReconciliationResponse> {
    const search = new URLSearchParams();
    if (filters.status) search.set('status', filters.status);
    if (filters.search) search.set('search', filters.search);
    if (filters.page) search.set('page', String(filters.page));
    if (filters.pageSize) search.set('pageSize', String(filters.pageSize));
    const query = search.toString();
    return apiRequest<FinancialPayableReconciliationResponse>(
      query ? `/financial/reconciliation/payables?${query}` : '/financial/reconciliation/payables'
    );
  },

  async reconcile(
    payableId: string,
    payload: { reconciliationReference?: string | null; notes?: string | null }
  ): Promise<FinancialPayableRecord> {
    return apiRequest<FinancialPayableRecord>(`/financial/payables/${encodeURIComponent(payableId)}/reconcile`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }
};
