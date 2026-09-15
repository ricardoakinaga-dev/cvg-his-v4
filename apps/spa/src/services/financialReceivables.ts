import { apiRequest } from './api';
import type {
  FinancialReceivableListFilters,
  FinancialReceivableListResponse
} from '@/types/financialReceivables';

export interface FinancialReceivableListRequest extends FinancialReceivableListFilters {
  dueFrom?: string;
  dueTo?: string;
}

export const financialReceivablesService = {
  async list(
    filters: FinancialReceivableListRequest = {}
  ): Promise<FinancialReceivableListResponse> {
    const search = new URLSearchParams();
    if (filters.search?.trim()) search.set('search', filters.search.trim());
    if (filters.status) search.set('status', filters.status);
    if (filters.dueFrom) search.set('dueFrom', filters.dueFrom);
    if (filters.dueTo) search.set('dueTo', filters.dueTo);
    if (filters.page !== undefined) search.set('page', String(filters.page));
    if (filters.pageSize !== undefined) search.set('pageSize', String(filters.pageSize));
    const query = search.toString();
    return apiRequest<FinancialReceivableListResponse>(
      query ? `/financial/receivables?${query}` : '/financial/receivables'
    );
  }
};
