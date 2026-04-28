import { apiRequest } from './api';

export type AnimalSpeciesSystemCode =
  | 'not_defined'
  | 'avian'
  | 'bovine'
  | 'canine'
  | 'rabbit'
  | 'equine'
  | 'feline'
  | 'other'
  | 'primate'
  | 'rodent'
  | 'reptile';

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
  { value: 'not_defined', label: 'Não Definido' },
  { value: 'avian', label: 'Avícola' },
  { value: 'bovine', label: 'Bovino' },
  { value: 'canine', label: 'Canina' },
  { value: 'rabbit', label: 'Cunícula' },
  { value: 'equine', label: 'Equina' },
  { value: 'feline', label: 'Felina' },
  { value: 'other', label: 'Outras' },
  { value: 'primate', label: 'Primata' },
  { value: 'rodent', label: 'Roedor' },
  { value: 'reptile', label: 'Réptil' }
];

export const defaultAnimalSpecies: readonly AnimalSpeciesSummary[] = [
  {
    id: 'default-not-defined',
    accountId: 'default',
    name: 'Não Definido',
    code: 'NOT_DEFINED',
    systemCode: 'not_defined',
    description: 'Opção Vetus para espécie não definida.',
    active: true,
    createdAt: '',
    updatedAt: ''
  },
  {
    id: 'default-avian',
    accountId: 'default',
    name: 'Avícola',
    code: 'AVIAN',
    systemCode: 'avian',
    description: 'Opção Vetus para espécies avícolas.',
    active: true,
    createdAt: '',
    updatedAt: ''
  },
  {
    id: 'default-bovine',
    accountId: 'default',
    name: 'Bovino',
    code: 'BOVINE',
    systemCode: 'bovine',
    description: 'Opção Vetus para bovinos.',
    active: true,
    createdAt: '',
    updatedAt: ''
  },
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
    id: 'default-rabbit',
    accountId: 'default',
    name: 'Cunícula',
    code: 'RABBIT',
    systemCode: 'rabbit',
    description: 'Opção Vetus para coelhos e lagomorfos.',
    active: true,
    createdAt: '',
    updatedAt: ''
  },
  {
    id: 'default-equine',
    accountId: 'default',
    name: 'Equina',
    code: 'EQUINE',
    systemCode: 'equine',
    description: 'Opção Vetus para equinos.',
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
    id: 'default-other',
    accountId: 'default',
    name: 'Outras',
    code: 'OTHER',
    systemCode: 'other',
    description: 'Outras espécies cadastradas para atendimento.',
    active: true,
    createdAt: '',
    updatedAt: ''
  },
  {
    id: 'default-primate',
    accountId: 'default',
    name: 'Primata',
    code: 'PRIMATE',
    systemCode: 'primate',
    description: 'Opção Vetus para primatas.',
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
