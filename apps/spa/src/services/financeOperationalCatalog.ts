import { apiRequest } from './api';

export const financeOperationalCatalogTypes = [
  'banks',
  'payment-methods',
  'card-machines',
  'split-rules'
] as const;

export type FinanceOperationalCatalogType = (typeof financeOperationalCatalogTypes)[number];
export type FinanceOperationalCatalogStatus = 'active' | 'inactive';

export interface BankConfiguration {
  bankCode: string;
  agency: string;
  accountNumber: string;
  accountType: 'checking' | 'savings' | 'payment';
  usageKey: 'settlement' | 'card' | 'support';
  usageDescription: string;
  reconciliationMode: 'manual' | 'automatic' | 'disabled';
}

export interface PaymentMethodConfiguration {
  methodType: 'cash' | 'digital' | 'credit' | 'receivable';
  integration: 'cash-drawer' | 'pix' | 'card-machine' | 'receivables';
  integrationDetail: string;
  usageDescription: string;
}

export interface CardMachineConfiguration {
  provider: string;
  serialNumber: string;
  unit: string;
  settlementBankCode: string;
  acceptedMethods: string[];
}

export interface SplitRuleConfiguration {
  recipient: string;
  percentage: number;
  appliesTo: string;
  priority: number;
}

export interface FinanceOperationalConfigurationMap {
  banks: BankConfiguration;
  'payment-methods': PaymentMethodConfiguration;
  'card-machines': CardMachineConfiguration;
  'split-rules': SplitRuleConfiguration;
}

export interface FinanceOperationalCatalogItem<
  T extends FinanceOperationalCatalogType = FinanceOperationalCatalogType
> {
  id: string;
  accountId: string;
  type: T;
  code: string;
  name: string;
  status: FinanceOperationalCatalogStatus;
  configuration: FinanceOperationalConfigurationMap[T];
  version: number;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface FinanceOperationalCatalogInput<
  T extends FinanceOperationalCatalogType = FinanceOperationalCatalogType
> {
  code: string;
  name: string;
  status: FinanceOperationalCatalogStatus;
  configuration: FinanceOperationalConfigurationMap[T];
}

export interface FinanceOperationalCatalogPage<
  T extends FinanceOperationalCatalogType = FinanceOperationalCatalogType
> {
  items: FinanceOperationalCatalogItem<T>[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface FinanceOperationalCatalogFilters {
  search?: string;
  status?: FinanceOperationalCatalogStatus;
  page?: number;
  pageSize?: number;
}

function buildQuery(filters: FinanceOperationalCatalogFilters = {}): string {
  const params = new URLSearchParams();
  if (filters.search) params.set('search', filters.search);
  if (filters.status) params.set('status', filters.status);
  if (filters.page) params.set('page', String(filters.page));
  if (filters.pageSize) params.set('pageSize', String(filters.pageSize));
  const query = params.toString();
  return query ? `?${query}` : '';
}

function basePath(type: FinanceOperationalCatalogType): string {
  return `/finance/catalogs/${encodeURIComponent(type)}`;
}

export const financeOperationalCatalogService = {
  async list<T extends FinanceOperationalCatalogType>(
    type: T,
    filters?: FinanceOperationalCatalogFilters
  ): Promise<FinanceOperationalCatalogPage<T>> {
    return apiRequest<FinanceOperationalCatalogPage<T>>(`${basePath(type)}${buildQuery(filters)}`);
  },

  async create<T extends FinanceOperationalCatalogType>(
    type: T,
    input: FinanceOperationalCatalogInput<T>
  ): Promise<FinanceOperationalCatalogItem<T>> {
    return apiRequest<FinanceOperationalCatalogItem<T>>(basePath(type), {
      method: 'POST',
      body: JSON.stringify(input)
    });
  },

  async update<T extends FinanceOperationalCatalogType>(
    type: T,
    id: string,
    version: number,
    input: FinanceOperationalCatalogInput<T>
  ): Promise<FinanceOperationalCatalogItem<T>> {
    return apiRequest<FinanceOperationalCatalogItem<T>>(
      `${basePath(type)}/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        body: JSON.stringify({ ...input, version })
      }
    );
  },

  async remove(type: FinanceOperationalCatalogType, id: string): Promise<{ ok: true }> {
    return apiRequest<{ ok: true }>(`${basePath(type)}/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
  }
};
