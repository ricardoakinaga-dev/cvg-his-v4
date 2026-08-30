import { apiRequest } from './api';

export type CounterSaleStatus = 'open' | 'closed' | 'cancelled';
export type CounterSaleItemType = 'product' | 'service';
export type CounterSalePaymentMethod =
  | 'cash'
  | 'credit_card'
  | 'debit_card'
  | 'pix'
  | 'bank_transfer'
  | 'check'
  | 'insurance'
  | 'other';

export const COUNTER_SALE_CANCELLATION_REASON_MAX_LENGTH = 500;

export interface CounterSaleCancellationHistory {
  readonly eventId: string;
  readonly accountId: string;
  readonly counterSaleId: string;
  readonly cancelledByUserId: string;
  readonly cancelledAt: string;
  readonly reason: string;
  readonly correlationId: string;
}

export function normalizeCounterSaleCancellationReason(reason: string): string {
  if (typeof reason !== 'string') {
    throw new Error('O motivo do cancelamento é obrigatório.');
  }
  if (/[\u0000-\u001f\u007f-\u009f]/u.test(reason)) {
    throw new Error('O motivo do cancelamento não pode conter caracteres de controle.');
  }

  const normalizedReason = reason.trim();
  if (!normalizedReason) {
    throw new Error('O motivo do cancelamento é obrigatório.');
  }
  if (normalizedReason.length > COUNTER_SALE_CANCELLATION_REASON_MAX_LENGTH) {
    throw new Error(
      `O motivo do cancelamento deve ter no máximo ${COUNTER_SALE_CANCELLATION_REASON_MAX_LENGTH} caracteres.`
    );
  }
  return normalizedReason;
}

export interface CounterSaleSummary {
  readonly id: string;
  readonly accountId: string;
  readonly number: string;
  readonly ownerId: string | null;
  readonly patientId: string | null;
  readonly encounterId: string | null;
  readonly queueEntryId: string | null;
  readonly billingRecordId: string | null;
  readonly status: CounterSaleStatus;
  readonly subtotal: number;
  readonly discountAmount: number;
  readonly total: number;
  readonly paidAmount: number;
  readonly balanceDue: number;
  readonly notes: string | null;
  readonly openedByUserId: string;
  readonly closedByUserId: string | null;
  readonly closedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CounterSaleReceiptSummary {
  readonly id: string;
  readonly accountId: string;
  readonly counterSaleId: string;
  readonly amount: number;
  readonly currency: 'BRL';
  readonly receivedByUserId: string;
  readonly receivedAt: string;
  readonly cashRegisterId: string | null;
  readonly cashMovementId: string | null;
  readonly journalEntryId: string | null;
  readonly createdAt: string;
}

export interface CounterSaleItemSummary {
  readonly id: string;
  readonly counterSaleId: string;
  readonly accountId: string;
  readonly itemType: CounterSaleItemType;
  readonly catalogItemId: string | null;
  readonly nameSnapshot: string;
  readonly codeSnapshot: string | null;
  readonly unitPrice: number;
  readonly quantity: number;
  readonly discountAmount: number;
  readonly lineTotal: number;
  readonly notes: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface CounterSalePaymentSummary {
  readonly id: string;
  readonly counterSaleId: string;
  readonly accountId: string;
  readonly method: CounterSalePaymentMethod;
  readonly amount: number;
  readonly installments: number;
  readonly reference: string | null;
  readonly notes: string | null;
  readonly createdAt: string;
}

export interface CounterSaleDetail extends CounterSaleSummary {
  readonly items: readonly CounterSaleItemSummary[];
  readonly payments: readonly CounterSalePaymentSummary[];
  readonly receipt: CounterSaleReceiptSummary | null;
  readonly cancellationHistory: readonly CounterSaleCancellationHistory[];
}

export interface CounterSaleCloseResponse extends CounterSaleSummary {
  readonly receipt: CounterSaleReceiptSummary;
}

export interface CounterSalesCommercialDashboard {
  readonly openSales: number;
  readonly closedToday: number;
  readonly grossRevenueToday: number;
  readonly netRevenueToday: number;
  readonly avgTicket: number;
  readonly salesByPaymentMethod: readonly {
    method: string;
    total: number;
  }[];
  readonly topProducts: readonly {
    name: string;
    quantity: number;
    revenue: number;
  }[];
  readonly topServices: readonly {
    name: string;
    quantity: number;
    revenue: number;
  }[];
  readonly quotesIssued: number;
  readonly quotesConverted: number;
  readonly lowStockAlerts?: readonly {
    name: string;
    code: string;
    onHand: number;
    reorderLevel: number;
  }[];
}

interface CounterSalesListResponse {
  items: readonly CounterSaleSummary[];
}

export interface CounterSalesListFilters {
  search?: string;
  status?: CounterSaleStatus | 'all';
  ownerId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface CreateCounterSalePayload {
  ownerId?: string | null;
  patientId?: string | null;
  encounterId?: string | null;
  queueEntryId?: string | null;
  billingRecordId?: string | null;
  notes?: string | null;
}

export interface CreateCounterSaleItemPayload {
  itemType: CounterSaleItemType;
  catalogItemId?: string | null;
  nameSnapshot: string;
  codeSnapshot?: string | null;
  unitPrice: number;
  quantity?: number;
  discountAmount?: number;
  notes?: string | null;
}

export interface UpdateCounterSaleItemPayload {
  quantity?: number;
  discountAmount?: number;
  notes?: string | null;
}

export interface CreateCounterSalePaymentPayload {
  method: CounterSalePaymentMethod;
  amount: number;
  installments?: number;
  reference?: string | null;
  notes?: string | null;
}

export const counterSalesService = {
  async list(filters: CounterSalesListFilters = {}): Promise<CounterSaleSummary[]> {
    const params = new URLSearchParams();
    if (filters.search) params.set('search', filters.search);
    if (filters.status && filters.status !== 'all') params.set('status', filters.status);
    if (filters.ownerId) params.set('ownerId', filters.ownerId);
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.set('dateTo', filters.dateTo);

    const query = params.toString();
    const response = await apiRequest<CounterSalesListResponse>(
      `/counter-sales${query ? `?${query}` : ''}`
    );
    return [...(response.items ?? [])];
  },

  async getById(id: string): Promise<CounterSaleDetail> {
    return apiRequest<CounterSaleDetail>(`/counter-sales/${id}`);
  },

  async getCommercialDashboard(filters?: {
    dateFrom?: string;
    dateTo?: string;
  }): Promise<CounterSalesCommercialDashboard> {
    const params = new URLSearchParams();
    if (filters?.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters?.dateTo) params.set('dateTo', filters.dateTo);

    const query = params.toString();
    return apiRequest<CounterSalesCommercialDashboard>(
      `/admin/commercial-dashboard${query ? `?${query}` : ''}`
    );
  },

  async create(payload: CreateCounterSalePayload): Promise<CounterSaleSummary> {
    return apiRequest<CounterSaleSummary>('/counter-sales', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async addItem(
    id: string,
    payload: CreateCounterSaleItemPayload
  ): Promise<CounterSaleItemSummary> {
    return apiRequest<CounterSaleItemSummary>(`/counter-sales/${id}/items`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async updateItem(
    id: string,
    itemId: string,
    payload: UpdateCounterSaleItemPayload
  ): Promise<CounterSaleItemSummary> {
    return apiRequest<CounterSaleItemSummary>(`/counter-sales/${id}/items/${itemId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  },

  async removeItem(id: string, itemId: string): Promise<void> {
    await apiRequest<void>(`/counter-sales/${id}/items/${itemId}`, {
      method: 'DELETE'
    });
  },

  async addPayment(
    id: string,
    payload: CreateCounterSalePaymentPayload
  ): Promise<CounterSalePaymentSummary> {
    return apiRequest<CounterSalePaymentSummary>(`/counter-sales/${id}/payments`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async close(id: string): Promise<CounterSaleCloseResponse> {
    return apiRequest<CounterSaleCloseResponse>(`/counter-sales/${id}/close`, {
      method: 'POST'
    });
  },

  async settle(
    id: string,
    payments: readonly CreateCounterSalePaymentPayload[]
  ): Promise<CounterSaleCloseResponse> {
    return apiRequest<CounterSaleCloseResponse>(`/counter-sales/${id}/settle`, {
      method: 'POST',
      body: JSON.stringify({ payments })
    });
  },

  async cancel(id: string, reason: string): Promise<CounterSaleSummary> {
    const normalizedReason = normalizeCounterSaleCancellationReason(reason);
    return apiRequest<CounterSaleSummary>(`/counter-sales/${id}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason: normalizedReason })
    });
  },

  async reopen(id: string): Promise<CounterSaleSummary> {
    return apiRequest<CounterSaleSummary>(`/counter-sales/${id}/reopen`, {
      method: 'POST'
    });
  }
};
