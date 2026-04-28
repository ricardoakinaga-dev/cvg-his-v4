import type {
  CreateFiscalIcmsTableRequest,
  CreateFiscalIpiTableRequest,
  CreateFiscalPisTableRequest,
  CreateFiscalNfseLayoutRequest,
  FiscalCfopListResponse,
  FiscalCfopSummary,
  FiscalDashboardSummary,
  FiscalIcmsMatrixListResponse,
  FiscalIcmsMatrixRowSummary,
  FiscalIcmsTableListResponse,
  FiscalIcmsTableSummary,
  FiscalIpiTableListResponse,
  FiscalIpiTableSummary,
  FiscalPisTableListResponse,
  FiscalPisTableSummary,
  FiscalNcmEntryListResponse,
  FiscalNcmEntrySummary,
  FiscalNfseLayoutListResponse,
  FiscalNfseLayoutSummary,
  FiscalPisCofinsRuleListResponse,
  FiscalPisCofinsRuleSummary,
  FiscalTaxPreview,
  UpdateFiscalIcmsTableRequest,
  UpdateFiscalIpiTableRequest,
  UpdateFiscalPisTableRequest,
  UpdateFiscalNfseLayoutRequest
} from '@cvg-his-v2/shared-contracts';

import { apiRequest } from './api';

export type FiscalIcmsTable = FiscalIcmsTableSummary;
export type FiscalIpiTable = FiscalIpiTableSummary;
export type FiscalPisTable = FiscalPisTableSummary;
export type FiscalPisCofinsRule = FiscalPisCofinsRuleSummary;
export type FiscalCfopRow = FiscalCfopSummary;
export type FiscalNcmEntry = FiscalNcmEntrySummary;
export type FiscalIcmsMatrixRow = FiscalIcmsMatrixRowSummary;
export type FiscalNfseLayout = FiscalNfseLayoutSummary;
export type CreateFiscalIcmsTable = CreateFiscalIcmsTableRequest;
export type UpdateFiscalIcmsTable = UpdateFiscalIcmsTableRequest;
export type CreateFiscalIpiTable = CreateFiscalIpiTableRequest;
export type UpdateFiscalIpiTable = UpdateFiscalIpiTableRequest;
export type CreateFiscalPisTable = CreateFiscalPisTableRequest;
export type UpdateFiscalPisTable = UpdateFiscalPisTableRequest;
export type CreateFiscalNfseLayout = CreateFiscalNfseLayoutRequest;
export type UpdateFiscalNfseLayout = UpdateFiscalNfseLayoutRequest;

export interface FiscalIcmsTableFilters {
  search?: string;
}

export interface FiscalIpiTableFilters {
  search?: string;
}

export interface FiscalPisTableFilters {
  search?: string;
}

export interface FiscalPisCofinsRuleFilters {
  regime?: FiscalPisCofinsRule['regime'];
  appliesTo?: FiscalPisCofinsRule['appliesTo'];
}

export interface FiscalCfopFilters {
  search?: string;
  section?: FiscalCfopRow['section'];
  documentType?: FiscalCfopRow['applicableTo'][number];
}

export interface FiscalNcmFilters {
  search?: string;
}

export interface FiscalIcmsMatrixFilters {
  ufOrigin?: string;
  ufDestination?: string;
  operationType?: FiscalIcmsMatrixRow['operationType'];
}

export interface FiscalNfseLayoutFilters {
  state?: string;
  active?: boolean;
}

function buildQuery(params: Record<string, string | boolean | undefined>): string {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '') {
      continue;
    }

    searchParams.set(key, String(value));
  }

  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

export const fiscalService = {
  async listIcmsTables(filters: FiscalIcmsTableFilters = {}): Promise<FiscalIcmsTable[]> {
    const response = await apiRequest<FiscalIcmsTableListResponse>(
      `/fiscal/icms${buildQuery({ ...filters })}`
    );
    return [...(response.items ?? [])];
  },

  async createIcmsTable(payload: CreateFiscalIcmsTable): Promise<FiscalIcmsTable> {
    return apiRequest<FiscalIcmsTable>('/fiscal/icms', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async updateIcmsTable(id: string, payload: UpdateFiscalIcmsTable): Promise<FiscalIcmsTable> {
    return apiRequest<FiscalIcmsTable>(`/fiscal/icms/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  },

  async listIpiTables(filters: FiscalIpiTableFilters = {}): Promise<FiscalIpiTable[]> {
    const response = await apiRequest<FiscalIpiTableListResponse>(
      `/fiscal/ipi${buildQuery({ ...filters })}`
    );
    return [...(response.items ?? [])];
  },

  async createIpiTable(payload: CreateFiscalIpiTable): Promise<FiscalIpiTable> {
    return apiRequest<FiscalIpiTable>('/fiscal/ipi', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async updateIpiTable(id: string, payload: UpdateFiscalIpiTable): Promise<FiscalIpiTable> {
    return apiRequest<FiscalIpiTable>(`/fiscal/ipi/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  },

  async listPisTables(filters: FiscalPisTableFilters = {}): Promise<FiscalPisTable[]> {
    const response = await apiRequest<FiscalPisTableListResponse>(
      `/fiscal/pis${buildQuery({ ...filters })}`
    );
    return [...(response.items ?? [])];
  },

  async createPisTable(payload: CreateFiscalPisTable): Promise<FiscalPisTable> {
    return apiRequest<FiscalPisTable>('/fiscal/pis', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async updatePisTable(id: string, payload: UpdateFiscalPisTable): Promise<FiscalPisTable> {
    return apiRequest<FiscalPisTable>(`/fiscal/pis/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  },

  async listPisCofinsRules(
    filters: FiscalPisCofinsRuleFilters = {}
  ): Promise<FiscalPisCofinsRule[]> {
    const response = await apiRequest<FiscalPisCofinsRuleListResponse>(
      `/fiscal/pis-cofins${buildQuery({ ...filters })}`
    );
    return [...(response.items ?? [])];
  },

  async listCfop(filters: FiscalCfopFilters = {}): Promise<FiscalCfopRow[]> {
    const response = await apiRequest<FiscalCfopListResponse>(
      `/fiscal/cfop${buildQuery({ ...filters })}`
    );
    return [...(response.items ?? [])];
  },

  async listNcmEntries(filters: FiscalNcmFilters = {}): Promise<FiscalNcmEntry[]> {
    const response = await apiRequest<FiscalNcmEntryListResponse>(
      `/fiscal/ncm${buildQuery({ ...filters })}`
    );
    return [...(response.items ?? [])];
  },

  async listIcmsMatrix(filters: FiscalIcmsMatrixFilters = {}): Promise<FiscalIcmsMatrixRow[]> {
    const response = await apiRequest<FiscalIcmsMatrixListResponse>(
      `/fiscal/icms-matrix${buildQuery({ ...filters })}`
    );
    return [...(response.items ?? [])];
  },

  async listNfseLayouts(filters: FiscalNfseLayoutFilters = {}): Promise<FiscalNfseLayout[]> {
    const response = await apiRequest<FiscalNfseLayoutListResponse>(
      `/fiscal/nfse${buildQuery({ ...filters })}`
    );
    return [...(response.items ?? [])];
  },

  async createNfseLayout(payload: CreateFiscalNfseLayout): Promise<FiscalNfseLayout> {
    return apiRequest<FiscalNfseLayout>('/fiscal/nfse', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async updateNfseLayout(id: string, payload: UpdateFiscalNfseLayout): Promise<FiscalNfseLayout> {
    return apiRequest<FiscalNfseLayout>(`/fiscal/nfse/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  },

  async getTaxPreview(): Promise<FiscalTaxPreview> {
    return apiRequest<FiscalTaxPreview>('/fiscal/tax-preview');
  },

  async getDashboardSummary(): Promise<FiscalDashboardSummary> {
    return apiRequest<FiscalDashboardSummary>('/fiscal/summary');
  }
};

export type { FiscalDashboardSummary, FiscalNfseLayoutSummary, FiscalTaxPreview };
