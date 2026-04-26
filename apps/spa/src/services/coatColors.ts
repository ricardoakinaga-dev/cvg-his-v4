import { apiRequest } from './api';

export interface CoatColorSummary {
  readonly id: string;
  readonly accountId: string;
  readonly name: string;
  readonly code: string | null;
  readonly colorGroup: string | null;
  readonly hexColor: string | null;
  readonly description: string | null;
  readonly active: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

interface CoatColorListResponse {
  readonly items: readonly CoatColorSummary[];
}

export interface CoatColorListFilters {
  readonly search?: string;
  readonly active?: boolean;
  readonly colorGroup?: string;
}

export interface CreateCoatColorPayload {
  readonly name: string;
  readonly code?: string | null;
  readonly colorGroup?: string | null;
  readonly hexColor?: string | null;
  readonly description?: string | null;
  readonly active?: boolean;
}

export type UpdateCoatColorPayload = Partial<CreateCoatColorPayload>;

export const defaultCoatColors: readonly CoatColorSummary[] = [
  {
    id: 'default-black',
    accountId: 'default',
    name: 'Preta',
    code: 'BLACK',
    colorGroup: 'Solida',
    hexColor: '#111827',
    description: 'Pelagem predominantemente preta.',
    active: true,
    createdAt: '',
    updatedAt: ''
  },
  {
    id: 'default-white',
    accountId: 'default',
    name: 'Branca',
    code: 'WHITE',
    colorGroup: 'Solida',
    hexColor: '#f8fafc',
    description: 'Pelagem predominantemente branca.',
    active: true,
    createdAt: '',
    updatedAt: ''
  },
  {
    id: 'default-caramel',
    accountId: 'default',
    name: 'Caramelo',
    code: 'CARAMEL',
    colorGroup: 'Solida',
    hexColor: '#c47f3f',
    description: 'Pelagem caramelo ou castanho claro.',
    active: true,
    createdAt: '',
    updatedAt: ''
  },
  {
    id: 'default-tricolor',
    accountId: 'default',
    name: 'Tricolor',
    code: 'TRICOLOR',
    colorGroup: 'Composta',
    hexColor: '#7c5f46',
    description: 'Composição de três cores na pelagem.',
    active: true,
    createdAt: '',
    updatedAt: ''
  },
  {
    id: 'default-brindle',
    accountId: 'default',
    name: 'Rajada',
    code: 'BRINDLE',
    colorGroup: 'Composta',
    hexColor: '#8b7355',
    description: 'Pelagem rajada ou tigrada.',
    active: true,
    createdAt: '',
    updatedAt: ''
  }
];

export const coatColorService = {
  async list(filters?: CoatColorListFilters): Promise<CoatColorSummary[]> {
    const searchParams = new URLSearchParams();

    if (filters?.search) searchParams.set('search', filters.search);
    if (typeof filters?.active === 'boolean') searchParams.set('active', filters.active ? 'true' : 'false');
    if (filters?.colorGroup) searchParams.set('colorGroup', filters.colorGroup);

    const params = searchParams.toString();
    const response = await apiRequest<CoatColorListResponse>(`/coat-colors${params ? `?${params}` : ''}`);
    return [...(response.items ?? [])];
  },

  async getById(coatColorId: string): Promise<CoatColorSummary> {
    return apiRequest<CoatColorSummary>(`/coat-colors/${coatColorId}`);
  },

  async create(payload: CreateCoatColorPayload): Promise<CoatColorSummary> {
    return apiRequest<CoatColorSummary>('/coat-colors', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async update(coatColorId: string, payload: UpdateCoatColorPayload): Promise<CoatColorSummary> {
    return apiRequest<CoatColorSummary>(`/coat-colors/${coatColorId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  },

  async delete(coatColorId: string): Promise<void> {
    await apiRequest<void>(`/coat-colors/${coatColorId}`, {
      method: 'DELETE'
    });
  }
};
