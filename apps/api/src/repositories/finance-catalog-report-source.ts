import type {
  ExpenseCatalogFilters,
  ExpenseCatalogItem
} from '../routes/expenses-catalog-store.js';

/** Read-only contract used by reports to consume persisted finance catalog facts. */
export interface FinanceCatalogReportSource {
  list(
    accountId: string,
    filters?: ExpenseCatalogFilters
  ): Promise<{
    readonly items: readonly ExpenseCatalogItem[];
    readonly totalItems: number;
  }>;
}
