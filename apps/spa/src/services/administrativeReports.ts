import { apiRequest } from './api';

export interface AdministrativeReportsFilters {
  dateFrom?: string;
  dateTo?: string;
}

export interface AdministrativeReportsResponse {
  readonly generatedAt: string;
  readonly filters: {
    readonly dateFrom: string | null;
    readonly dateTo: string | null;
  };
  readonly executive: {
    readonly outstandingReceivables: number;
    readonly pixAttentionCount: number;
    readonly quotePipelineAmount: number;
    readonly commercialRevenue: number;
    readonly openCashBalance: number | null;
    readonly fiscalCoverageScore: number;
  };
  readonly domains: {
    readonly financial: {
      readonly billing: {
        readonly totalRecords: number;
        readonly draftCount: number;
        readonly estimatedCount: number;
        readonly openCount: number;
        readonly settledCount: number;
        readonly grossAmount: number;
      };
      readonly receivables: {
        readonly openCount: number;
        readonly currentCount: number;
        readonly overdueCount: number;
        readonly totalOutstanding: number;
        readonly currentAmount: number;
        readonly overdueAmount: number;
        readonly topOpenReceivables: ReadonlyArray<{
          readonly receivableId: string;
          readonly encounterId: string;
          readonly installmentLabel: string;
          readonly patientName: string;
          readonly ownerName: string;
          readonly dueAt: string | null;
          readonly amountOutstanding: number;
        }>;
      };
      readonly pix: {
        readonly totalTransactions: number;
        readonly completedCount: number;
        readonly pendingCount: number;
        readonly expiredCount: number;
        readonly cancelledCount: number;
        readonly reconciledCount: number;
        readonly attentionRequiredCount: number;
        readonly completedAmount: number;
        readonly byProvider: ReadonlyArray<{
          readonly provider: string;
          readonly amount: number;
        }>;
      };
    };
    readonly commercial: {
      readonly quotes: {
        readonly issuedCount: number;
        readonly approvedCount: number;
        readonly convertedCount: number;
        readonly rejectedCount: number;
        readonly pipelineAmount: number;
        readonly convertedAmount: number;
        readonly recent: ReadonlyArray<{
          readonly id: string;
          readonly number: string;
          readonly status: string;
          readonly total: number;
          readonly convertedAt: string | null;
          readonly createdAt: string;
        }>;
      };
      readonly counterSales: {
        readonly totalSales: number;
        readonly openCount: number;
        readonly closedCount: number;
        readonly cancelledCount: number;
        readonly grossRevenue: number;
        readonly netRevenue: number;
        readonly avgTicket: number;
        readonly byPaymentMethod: ReadonlyArray<{
          readonly method: string;
          readonly total: number;
        }>;
        readonly topProducts: ReadonlyArray<{
          readonly name: string;
          readonly quantity: number;
          readonly revenue: number;
        }>;
        readonly topServices: ReadonlyArray<{
          readonly name: string;
          readonly quantity: number;
          readonly revenue: number;
        }>;
      };
    };
    readonly cash: {
      readonly hasOpenRegister: boolean;
      readonly openRegister: {
        readonly id: string;
        readonly openedAt: string;
        readonly openingAmount: number;
        readonly status: string;
        readonly runningBalance: number | null;
      } | null;
      readonly registerCount: number;
      readonly recentRegisters: ReadonlyArray<{
        readonly id: string;
        readonly status: string;
        readonly openedAt: string;
        readonly closedAt: string | null;
        readonly openingAmount: number;
        readonly closingAmount: number | null;
        readonly difference: number | null;
        readonly runningBalance: number;
      }>;
      readonly recentMovements: ReadonlyArray<{
        readonly id: string;
        readonly movementType: string;
        readonly amount: number;
        readonly runningBalance: number;
        readonly reference: string | null;
        readonly createdAt: string;
      }>;
      readonly inflowAmount: number;
    };
    readonly fiscal: {
      readonly activeTaxes: number;
      readonly cfopCount: number;
      readonly nfseLayouts: number;
      readonly icmsRules: number;
      readonly pisCofinsRules: number;
      readonly ncmEntries: number;
      readonly readOnly: boolean;
      readonly backendScope: string;
      readonly pendingScopes: readonly string[];
      readonly alerts: ReadonlyArray<{
        readonly variant: 'info' | 'warning';
        readonly title: string;
        readonly message: string;
      }>;
    };
  };
  readonly highlights: ReadonlyArray<{
    readonly domain: 'financial' | 'commercial' | 'cash' | 'fiscal';
    readonly severity: 'info' | 'warning' | 'danger';
    readonly title: string;
    readonly message: string;
  }>;
}

export const administrativeReportsService = {
  async getHubs(filters: AdministrativeReportsFilters = {}): Promise<AdministrativeReportsResponse> {
    const params = new URLSearchParams();
    if (filters.dateFrom) params.set('dateFrom', filters.dateFrom);
    if (filters.dateTo) params.set('dateTo', filters.dateTo);
    const query = params.toString();
    return apiRequest<AdministrativeReportsResponse>(
      `/reports/administrative-hubs${query ? `?${query}` : ''}`
    );
  }
};
