import { apiRequest } from './api';

export interface FinancialIncomeStatement {
  readonly generatedAt: string;
  readonly period: {
    readonly dateFrom: string;
    readonly dateTo: string;
  };
  readonly revenue: {
    readonly grossRevenue: number;
    readonly realizedRevenue: number;
    readonly outstandingReceivables: number;
    readonly receivableCount: number;
    readonly settledReceivableCount: number;
    readonly openReceivableCount: number;
  };
  readonly expenses: {
    readonly accruedExpenses: number;
    readonly paidExpenses: number;
    readonly outstandingPayables: number;
    readonly payableCount: number;
    readonly paidPayableCount: number;
    readonly openPayableCount: number;
    readonly byCategory: ReadonlyArray<{
      readonly category: string;
      readonly accruedAmount: number;
      readonly paidAmount: number;
      readonly outstandingAmount: number;
    }>;
  };
  readonly result: {
    readonly realizedNetResult: number;
    readonly accrualNetResult: number;
    readonly grossMarginPercent: number | null;
    readonly cashConversionPercent: number | null;
  };
}

export interface FinancialStatementFilters {
  readonly dateFrom?: string;
  readonly dateTo?: string;
}

export const financialStatementsService = {
  async getIncomeStatement(filters: FinancialStatementFilters = {}): Promise<FinancialIncomeStatement> {
    const search = new URLSearchParams();
    if (filters.dateFrom) search.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) search.set('dateTo', filters.dateTo);
    const query = search.toString();
    return apiRequest<FinancialIncomeStatement>(
      query ? `/financial/income-statement?${query}` : '/financial/income-statement'
    );
  }
};
