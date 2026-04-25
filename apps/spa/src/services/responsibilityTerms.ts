import { apiRequest } from './api';

export type ResponsibilityTermUsageContext =
  | 'atendimento'
  | 'internacao'
  | 'procedimento'
  | 'autorizacao'
  | 'outro';

export interface ResponsibilityTermSummary {
  readonly id: string;
  readonly accountId: string;
  readonly title: string;
  readonly code: string | null;
  readonly usageContext: ResponsibilityTermUsageContext;
  readonly content: string;
  readonly active: boolean;
  readonly requiresOwnerSignature: boolean;
  readonly requiresWitnessSignature: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

interface ResponsibilityTermsListResponse {
  readonly items: readonly ResponsibilityTermSummary[];
}

export interface ResponsibilityTermListFilters {
  readonly search?: string;
  readonly active?: boolean;
  readonly usageContext?: ResponsibilityTermUsageContext | '';
}

export interface CreateResponsibilityTermPayload {
  readonly title: string;
  readonly code?: string | null;
  readonly usageContext: ResponsibilityTermUsageContext;
  readonly content: string;
  readonly active?: boolean;
  readonly requiresOwnerSignature?: boolean;
  readonly requiresWitnessSignature?: boolean;
}

export type UpdateResponsibilityTermPayload = Partial<CreateResponsibilityTermPayload>;

export const responsibilityTermsService = {
  async list(filters?: ResponsibilityTermListFilters): Promise<ResponsibilityTermSummary[]> {
    const searchParams = new URLSearchParams();

    if (filters?.search) searchParams.set('search', filters.search);
    if (typeof filters?.active === 'boolean') searchParams.set('active', filters.active ? 'true' : 'false');
    if (filters?.usageContext) searchParams.set('usageContext', filters.usageContext);

    const params = searchParams.toString();
    const response = await apiRequest<ResponsibilityTermsListResponse>(
      `/responsibility-terms${params ? `?${params}` : ''}`
    );
    return [...(response.items ?? [])];
  },

  async getById(termId: string): Promise<ResponsibilityTermSummary> {
    return apiRequest<ResponsibilityTermSummary>(`/responsibility-terms/${termId}`);
  },

  async create(payload: CreateResponsibilityTermPayload): Promise<ResponsibilityTermSummary> {
    return apiRequest<ResponsibilityTermSummary>('/responsibility-terms', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async update(termId: string, payload: UpdateResponsibilityTermPayload): Promise<ResponsibilityTermSummary> {
    return apiRequest<ResponsibilityTermSummary>(`/responsibility-terms/${termId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  },

  async delete(termId: string): Promise<void> {
    await apiRequest<void>(`/responsibility-terms/${termId}`, {
      method: 'DELETE'
    });
  }
};

export function responsibilityTermUsageLabel(context: ResponsibilityTermUsageContext): string {
  const labels: Record<ResponsibilityTermUsageContext, string> = {
    atendimento: 'Atendimento',
    internacao: 'Internação',
    procedimento: 'Procedimento',
    autorizacao: 'Autorização',
    outro: 'Outro'
  };

  return labels[context];
}
