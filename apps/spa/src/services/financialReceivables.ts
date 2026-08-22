import { apiRequest } from './api';
import type {
  FinancialReceivableListFilters,
  FinancialReceivableListResponse
} from '@/types/financialReceivables';

export const financialReceivablesService = {
  async list(filters: FinancialReceivableListFilters = {}): Promise<FinancialReceivableListResponse> {
    const search = new URLSearchParams();
    if (filters.search) search.set('search', filters.search);
    if (filters.status) search.set('status', filters.status);
    if (filters.page) search.set('page', String(filters.page));
    if (filters.pageSize) search.set('pageSize', String(filters.pageSize));
    const query = search.toString();
    return apiRequest<FinancialReceivableListResponse>(
      query ? `/financial/receivables?${query}` : '/financial/receivables'
    );
  }
};
