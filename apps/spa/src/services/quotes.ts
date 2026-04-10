import { apiRequest } from './api';

export interface QuoteSummary {
  readonly id: string;
  readonly accountId: string;
  readonly number: string;
  readonly ownerId: string | null;
  readonly status: 'draft' | 'approved' | 'rejected' | 'expired' | 'cancelled';
  readonly validUntil: string | null;
  readonly subtotal: number;
  readonly discountAmount: number;
  readonly total: number;
  readonly notes: string | null;
  readonly createdByUserId: string;
  readonly convertedToSaleId: string | null;
  readonly convertedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface QuoteItemSummary {
  readonly id: string;
  readonly quoteId: string;
  readonly accountId: string;
  readonly itemType: 'product' | 'service';
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

export interface QuoteDetailResponse {
  readonly id: string;
  readonly accountId: string;
  readonly number: string;
  readonly ownerId: string | null;
  readonly status: QuoteSummary['status'];
  readonly validUntil: string | null;
  readonly subtotal: number;
  readonly discountAmount: number;
  readonly total: number;
  readonly notes: string | null;
  readonly createdByUserId: string;
  readonly convertedToSaleId: string | null;
  readonly convertedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly items: readonly QuoteItemSummary[];
}

export interface CreateQuotePayload {
  ownerId?: string | null;
  validUntil?: string | null;
  notes?: string | null;
}

export interface CreateQuoteItemPayload {
  itemType: 'product' | 'service';
  catalogItemId?: string | null;
  nameSnapshot: string;
  codeSnapshot?: string | null;
  unitPrice: number;
  quantity?: number;
  discountAmount?: number;
  notes?: string | null;
}

export interface QuoteConversionResult {
  counterSaleId: string;
  quoteId: string;
}

interface ListResponse {
  items: readonly QuoteSummary[];
}

interface PrintResponse {
  html: string;
}

export const quoteService = {
  async list(search?: string, status?: string): Promise<QuoteSummary[]> {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (status) params.set('status', status);
    const query = params.toString();
    const response = await apiRequest<ListResponse>(`/quotes${query ? `?${query}` : ''}`);
    return [...(response.items ?? [])];
  },

  async get(quoteId: string): Promise<QuoteDetailResponse> {
    return apiRequest<QuoteDetailResponse>(`/quotes/${quoteId}`);
  },

  async create(payload: CreateQuotePayload): Promise<QuoteSummary> {
    return apiRequest<QuoteSummary>('/quotes', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async addItem(quoteId: string, payload: CreateQuoteItemPayload): Promise<QuoteItemSummary> {
    return apiRequest<QuoteItemSummary>(`/quotes/${quoteId}/items`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async approve(quoteId: string): Promise<QuoteSummary> {
    return apiRequest<QuoteSummary>(`/quotes/${quoteId}/approve`, { method: 'POST' });
  },

  async reject(quoteId: string): Promise<QuoteSummary> {
    return apiRequest<QuoteSummary>(`/quotes/${quoteId}/reject`, { method: 'POST' });
  },

  async cancel(quoteId: string): Promise<QuoteSummary> {
    return apiRequest<QuoteSummary>(`/quotes/${quoteId}/cancel`, { method: 'POST' });
  },

  async convertToSale(quoteId: string): Promise<QuoteConversionResult> {
    return apiRequest<QuoteConversionResult>(`/quotes/${quoteId}/convert-to-sale`, {
      method: 'POST'
    });
  },

  async print(quoteId: string): Promise<string> {
    const response = await apiRequest<PrintResponse>(`/quotes/${quoteId}/print`, {
      method: 'GET'
    });
    return response.html;
  }
};
