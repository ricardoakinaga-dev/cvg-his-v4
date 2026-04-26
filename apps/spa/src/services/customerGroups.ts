import { apiRequest } from './api';

export interface CustomerGroupSummary {
  readonly id: string;
  readonly accountId: string;
  readonly name: string;
  readonly code: string | null;
  readonly segment: string | null;
  readonly discountPercent: number;
  readonly paymentTermDays: number;
  readonly creditLimitAmount: number | null;
  readonly description: string | null;
  readonly active: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

interface CustomerGroupListResponse {
  readonly items: readonly CustomerGroupSummary[];
}

export interface CustomerGroupListFilters {
  readonly search?: string;
  readonly active?: boolean;
  readonly segment?: string;
}

export interface CreateCustomerGroupPayload {
  readonly name: string;
  readonly code?: string | null;
  readonly segment?: string | null;
  readonly discountPercent?: number | string | null;
  readonly paymentTermDays?: number | string | null;
  readonly creditLimitAmount?: number | string | null;
  readonly description?: string | null;
  readonly active?: boolean;
}

export type UpdateCustomerGroupPayload = Partial<CreateCustomerGroupPayload>;

export const defaultCustomerGroups: readonly CustomerGroupSummary[] = [
  {
    id: 'default-standard',
    accountId: 'default',
    name: 'Padrao',
    code: 'STANDARD',
    segment: 'Geral',
    discountPercent: 0,
    paymentTermDays: 0,
    creditLimitAmount: null,
    description: 'Grupo padrao para clientes sem classificacao comercial especifica.',
    active: true,
    createdAt: '',
    updatedAt: ''
  },
  {
    id: 'default-frequent',
    accountId: 'default',
    name: 'Frequente',
    code: 'FREQUENT',
    segment: 'Relacionamento',
    discountPercent: 5,
    paymentTermDays: 0,
    creditLimitAmount: null,
    description: 'Grupo para tutores com recorrencia operacional.',
    active: true,
    createdAt: '',
    updatedAt: ''
  },
  {
    id: 'default-agreement',
    accountId: 'default',
    name: 'Convenio',
    code: 'AGREEMENT',
    segment: 'Convenio',
    discountPercent: 10,
    paymentTermDays: 30,
    creditLimitAmount: 1000,
    description: 'Grupo para clientes vinculados a acordo comercial ou convenio.',
    active: true,
    createdAt: '',
    updatedAt: ''
  }
];

export const customerGroupsService = {
  async list(filters?: CustomerGroupListFilters): Promise<CustomerGroupSummary[]> {
    const searchParams = new URLSearchParams();

    if (filters?.search) searchParams.set('search', filters.search);
    if (typeof filters?.active === 'boolean') searchParams.set('active', filters.active ? 'true' : 'false');
    if (filters?.segment) searchParams.set('segment', filters.segment);

    const params = searchParams.toString();
    const response = await apiRequest<CustomerGroupListResponse>(`/customer-groups${params ? `?${params}` : ''}`);
    return [...(response.items ?? [])];
  },

  async getById(customerGroupId: string): Promise<CustomerGroupSummary> {
    return apiRequest<CustomerGroupSummary>(`/customer-groups/${customerGroupId}`);
  },

  async create(payload: CreateCustomerGroupPayload): Promise<CustomerGroupSummary> {
    return apiRequest<CustomerGroupSummary>('/customer-groups', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async update(customerGroupId: string, payload: UpdateCustomerGroupPayload): Promise<CustomerGroupSummary> {
    return apiRequest<CustomerGroupSummary>(`/customer-groups/${customerGroupId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  },

  async delete(customerGroupId: string): Promise<void> {
    await apiRequest<void>(`/customer-groups/${customerGroupId}`, {
      method: 'DELETE'
    });
  }
};
