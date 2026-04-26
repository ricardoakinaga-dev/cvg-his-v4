import { apiRequest } from './api';

export type AnimalSpeciesSystemCode = 'canine' | 'feline' | 'avian' | 'rodent' | 'reptile' | 'other';

export interface AnimalSpeciesSummary {
  readonly id: string;
  readonly accountId: string;
  readonly name: string;
  readonly code: string | null;
  readonly systemCode: AnimalSpeciesSystemCode;
  readonly description: string | null;
  readonly active: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

interface AnimalSpeciesListResponse {
  readonly items: readonly AnimalSpeciesSummary[];
}

export interface AnimalSpeciesListFilters {
  readonly search?: string;
  readonly active?: boolean;
  readonly systemCode?: AnimalSpeciesSystemCode | '';
}

export interface CreateAnimalSpeciesPayload {
  readonly name: string;
  readonly code?: string | null;
  readonly systemCode: AnimalSpeciesSystemCode;
  readonly description?: string | null;
  readonly active?: boolean;
}

export type UpdateAnimalSpeciesPayload = Partial<CreateAnimalSpeciesPayload>;

export const animalSpeciesSystemOptions: readonly { value: AnimalSpeciesSystemCode; label: string }[] = [
  { value: 'canine', label: 'Canino' },
  { value: 'feline', label: 'Felino' },
  { value: 'avian', label: 'Aves' },
  { value: 'rodent', label: 'Roedor' },
  { value: 'reptile', label: 'Réptil' },
  { value: 'other', label: 'Outro' }
];

export const defaultAnimalSpecies: readonly AnimalSpeciesSummary[] = [
  {
    id: 'default-canine',
    accountId: 'default',
    name: 'Canina',
    code: 'CANINE',
    systemCode: 'canine',
    description: 'Pacientes cães.',
    active: true,
    createdAt: '',
    updatedAt: ''
  },
  {
    id: 'default-feline',
    accountId: 'default',
    name: 'Felina',
    code: 'FELINE',
    systemCode: 'feline',
    description: 'Pacientes gatos.',
    active: true,
    createdAt: '',
    updatedAt: ''
  },
  {
    id: 'default-avian',
    accountId: 'default',
    name: 'Ave',
    code: 'AVIAN',
    systemCode: 'avian',
    description: 'Pacientes aves ornamentais ou silvestres autorizadas.',
    active: true,
    createdAt: '',
    updatedAt: ''
  },
  {
    id: 'default-rodent',
    accountId: 'default',
    name: 'Roedor',
    code: 'RODENT',
    systemCode: 'rodent',
    description: 'Pacientes roedores.',
    active: true,
    createdAt: '',
    updatedAt: ''
  },
  {
    id: 'default-reptile',
    accountId: 'default',
    name: 'Réptil',
    code: 'REPTILE',
    systemCode: 'reptile',
    description: 'Pacientes répteis.',
    active: true,
    createdAt: '',
    updatedAt: ''
  },
  {
    id: 'default-other',
    accountId: 'default',
    name: 'Outro',
    code: 'OTHER',
    systemCode: 'other',
    description: 'Outras espécies cadastradas para atendimento.',
    active: true,
    createdAt: '',
    updatedAt: ''
  }
];

export const animalSpeciesService = {
  async list(filters?: AnimalSpeciesListFilters): Promise<AnimalSpeciesSummary[]> {
    const searchParams = new URLSearchParams();

    if (filters?.search) searchParams.set('search', filters.search);
    if (typeof filters?.active === 'boolean') searchParams.set('active', filters.active ? 'true' : 'false');
    if (filters?.systemCode) searchParams.set('systemCode', filters.systemCode);

    const params = searchParams.toString();
    const response = await apiRequest<AnimalSpeciesListResponse>(`/species${params ? `?${params}` : ''}`);
    return [...(response.items ?? [])];
  },

  async getById(speciesId: string): Promise<AnimalSpeciesSummary> {
    return apiRequest<AnimalSpeciesSummary>(`/species/${speciesId}`);
  },

  async create(payload: CreateAnimalSpeciesPayload): Promise<AnimalSpeciesSummary> {
    return apiRequest<AnimalSpeciesSummary>('/species', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async update(
    speciesId: string,
    payload: UpdateAnimalSpeciesPayload
  ): Promise<AnimalSpeciesSummary> {
    return apiRequest<AnimalSpeciesSummary>(`/species/${speciesId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  },

  async delete(speciesId: string): Promise<void> {
    await apiRequest<void>(`/species/${speciesId}`, {
      method: 'DELETE'
    });
  }
};

export function animalSpeciesSystemLabel(systemCode: AnimalSpeciesSystemCode | string): string {
  return animalSpeciesSystemOptions.find((option) => option.value === systemCode)?.label ?? systemCode;
}
