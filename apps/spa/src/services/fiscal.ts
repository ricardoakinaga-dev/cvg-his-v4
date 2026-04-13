import type {
  FiscalCfopListResponse,
  FiscalCfopSummary,
  FiscalDashboardSummary,
  FiscalIcmsMatrixListResponse,
  FiscalIcmsMatrixRowSummary,
  FiscalIcmsRuleListResponse,
  FiscalIcmsRuleSummary,
  FiscalNcmEntryListResponse,
  FiscalNcmEntrySummary,
  FiscalNfseLayoutListResponse,
  FiscalNfseLayoutSummary,
  FiscalPisCofinsRuleListResponse,
  FiscalPisCofinsRuleSummary,
  FiscalTaxPreview
} from '@cvg-his-v2/shared-contracts';

import { apiRequest } from './api';

export type FiscalIcmsRule = FiscalIcmsRuleSummary;
export type FiscalPisCofinsRule = FiscalPisCofinsRuleSummary;
export type FiscalCfopRow = FiscalCfopSummary;
export type FiscalNcmEntry = FiscalNcmEntrySummary;
export type FiscalIcmsMatrixRow = FiscalIcmsMatrixRowSummary;
export type FiscalNfseLayout = FiscalNfseLayoutSummary;

export interface FiscalIcmsRuleFilters {
  ufOrigin?: string;
  ufDestination?: string;
  ncm?: string;
  operationType?: FiscalIcmsRule['operationType'];
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
  async listIcmsRules(filters: FiscalIcmsRuleFilters = {}): Promise<FiscalIcmsRule[]> {
    const response = await apiRequest<FiscalIcmsRuleListResponse>(
      `/fiscal/icms${buildQuery({ ...filters })}`
    );
    return [...(response.items ?? [])];
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

  async getTaxPreview(): Promise<FiscalTaxPreview> {
    return apiRequest<FiscalTaxPreview>('/fiscal/tax-preview');
  },

  async getDashboardSummary(): Promise<FiscalDashboardSummary> {
    return apiRequest<FiscalDashboardSummary>('/fiscal/summary');
  }
};

export type { FiscalDashboardSummary, FiscalNfseLayoutSummary, FiscalTaxPreview };
