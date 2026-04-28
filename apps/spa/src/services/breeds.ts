import { apiRequest } from './api';

export type BreedSpecies =
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

export interface BreedSummary {
  readonly id: string;
  readonly accountId: string;
  readonly name: string;
  readonly code: string | null;
  readonly species: BreedSpecies;
  readonly description: string | null;
  readonly active: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

interface BreedsListResponse {
  readonly items: readonly BreedSummary[];
}

export interface BreedListFilters {
  readonly search?: string;
  readonly active?: boolean;
  readonly species?: BreedSpecies | '';
}

export interface CreateBreedPayload {
  readonly name: string;
  readonly code?: string | null;
  readonly species: BreedSpecies;
  readonly description?: string | null;
  readonly active?: boolean;
}

export type UpdateBreedPayload = Partial<CreateBreedPayload>;

export const breedSpeciesOptions: readonly { value: BreedSpecies; label: string }[] = [
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

export const breedsService = {
  async list(filters?: BreedListFilters): Promise<BreedSummary[]> {
    const searchParams = new URLSearchParams();

    if (filters?.search) searchParams.set('search', filters.search);
    if (typeof filters?.active === 'boolean') searchParams.set('active', filters.active ? 'true' : 'false');
    if (filters?.species) searchParams.set('species', filters.species);

    const params = searchParams.toString();
    const response = await apiRequest<BreedsListResponse>(`/breeds${params ? `?${params}` : ''}`);
    return [...(response.items ?? [])];
  },

  async getById(breedId: string): Promise<BreedSummary> {
    return apiRequest<BreedSummary>(`/breeds/${breedId}`);
  },

  async create(payload: CreateBreedPayload): Promise<BreedSummary> {
    return apiRequest<BreedSummary>('/breeds', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async update(breedId: string, payload: UpdateBreedPayload): Promise<BreedSummary> {
    return apiRequest<BreedSummary>(`/breeds/${breedId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  },

  async delete(breedId: string): Promise<void> {
    await apiRequest<void>(`/breeds/${breedId}`, {
      method: 'DELETE'
    });
  }
};

export function breedSpeciesLabel(species: BreedSpecies | string): string {
  return breedSpeciesOptions.find((option) => option.value === species)?.label ?? species;
}
