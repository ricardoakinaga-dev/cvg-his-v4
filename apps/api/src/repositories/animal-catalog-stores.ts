import { getPool } from '@cvg-his-v2/shared-database';
import { NotFoundError, ValidationError } from '@cvg-his-v2/shared-errors';
import { createCorrelationId } from '@cvg-his-v2/shared-utils';
import { requireNonEmptyString } from '@cvg-his-v2/shared-validation';
import { withTenantQuery } from '@cvg-his-v2/tenant-context';

type BreedSpecies =
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

interface BreedSummary {
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

export interface BreedInput {
  readonly name?: string;
  readonly code?: string | null;
  readonly species?: BreedSpecies;
  readonly description?: string | null;
  readonly active?: boolean;
}

interface BreedListFilters {
  readonly search?: string;
  readonly active?: boolean;
  readonly species?: string;
}

interface BreedStore {
  create(accountId: string, input: BreedInput): Promise<BreedSummary>;
  update(breedId: string, input: BreedInput): Promise<BreedSummary>;
  getOrThrow(breedId: string): Promise<BreedSummary>;
  list(accountId: string, filters: BreedListFilters): Promise<BreedSummary[]>;
  delete(breedId: string): Promise<void>;
}

const breedSpeciesValues = new Set<BreedSpecies>([
  'not_defined',
  'avian',
  'bovine',
  'canine',
  'rabbit',
  'equine',
  'feline',
  'other',
  'primate',
  'rodent',
  'reptile'
]);
const breedMaxNameLength = 160;
const breedMaxCodeLength = 80;
const breedMaxDescriptionLength = 1000;

const defaultBreedSeeds: readonly Omit<
  BreedSummary,
  'id' | 'accountId' | 'createdAt' | 'updatedAt'
>[] = [
  {
    name: 'Yorkshire Terrier',
    code: 'CAN-YORKSHIRE-TERRIER',
    species: 'canine',
    description: 'Raca canina de pequeno porte usada no cadastro Vetus-like.',
    active: true
  },
  {
    name: 'Golden Retriever',
    code: 'CAN-GOLDEN-RETRIEVER',
    species: 'canine',
    description: 'Raca canina de grande porte.',
    active: true
  },
  {
    name: 'Shih Tzu',
    code: 'CAN-SHIH-TZU',
    species: 'canine',
    description: 'Raca canina de pequeno porte.',
    active: true
  },
  {
    name: 'Poodle',
    code: 'CAN-POODLE',
    species: 'canine',
    description: 'Raca canina comum em atendimento clinico.',
    active: true
  },
  {
    name: 'Sem raca definida',
    code: 'CAN-SRD',
    species: 'canine',
    description: 'Paciente canino sem raca definida.',
    active: true
  },
  {
    name: 'Persa',
    code: 'FEL-PERSA',
    species: 'feline',
    description: 'Raca felina Persa.',
    active: true
  },
  {
    name: 'Siamês',
    code: 'FEL-SIAMES',
    species: 'feline',
    description: 'Raca felina Siames.',
    active: true
  },
  {
    name: 'Sem raca definida',
    code: 'FEL-SRD',
    species: 'feline',
    description: 'Paciente felino sem raca definida.',
    active: true
  }
];

function createCatalogSeedId(prefix: string, accountId: string, code: string): string {
  return `${prefix}_${accountId}_${code}`.toLowerCase().replace(/[^a-z0-9_-]+/g, '_');
}

function normalizeBreedSpecies(value: BreedSpecies | undefined): BreedSpecies {
  if (!value) return 'canine';
  if (!breedSpeciesValues.has(value)) {
    throw new ValidationError('species is invalid');
  }
  return value;
}

function normalizeBreedName(value: string | undefined): string {
  const name = requireNonEmptyString(value, 'name').trim();
  if (name.length > breedMaxNameLength) {
    throw new ValidationError(`name must have at most ${breedMaxNameLength} characters`);
  }
  return name;
}

function normalizeBreedCode(value: string | null | undefined): string | null {
  const code = value?.trim() || null;
  if (code && code.length > breedMaxCodeLength) {
    throw new ValidationError(`code must have at most ${breedMaxCodeLength} characters`);
  }
  return code;
}

function normalizeBreedDescription(value: string | null | undefined): string | null {
  const description = value?.trim() || null;
  if (description && description.length > breedMaxDescriptionLength) {
    throw new ValidationError(
      `description must have at most ${breedMaxDescriptionLength} characters`
    );
  }
  return description;
}

function mapBreedRow(row: Record<string, unknown>): BreedSummary {
  return {
    id: row.id as string,
    accountId: row.account_id as string,
    name: row.name as string,
    code: (row.code as string | null) ?? null,
    species: row.species as BreedSpecies,
    description: (row.description as string | null) ?? null,
    active: row.active as boolean,
    createdAt: new Date(row.created_at as string | Date).toISOString(),
    updatedAt: new Date(row.updated_at as string | Date).toISOString()
  };
}

class InMemoryBreedStore implements BreedStore {
  readonly #breeds = new Map<string, BreedSummary>();

  #ensureSeedData(accountId: string): void {
    const now = new Date().toISOString();
    for (const seed of defaultBreedSeeds) {
      const alreadyExists = Array.from(this.#breeds.values()).some(
        (breed) => breed.accountId === accountId && breed.code === seed.code
      );
      if (alreadyExists || !seed.code) continue;

      const breed: BreedSummary = {
        id: createCatalogSeedId('breed', accountId, seed.code),
        accountId,
        ...seed,
        createdAt: now,
        updatedAt: now
      };
      this.#breeds.set(breed.id, breed);
    }
  }

  async create(accountId: string, input: BreedInput): Promise<BreedSummary> {
    const now = new Date().toISOString();
    const breed: BreedSummary = {
      id: createCorrelationId('breed'),
      accountId,
      name: normalizeBreedName(input.name),
      code: normalizeBreedCode(input.code),
      species: normalizeBreedSpecies(input.species),
      description: normalizeBreedDescription(input.description),
      active: input.active ?? true,
      createdAt: now,
      updatedAt: now
    };

    this.#breeds.set(breed.id, breed);
    return breed;
  }

  async update(breedId: string, input: BreedInput): Promise<BreedSummary> {
    const existing = await this.getOrThrow(breedId);
    const updated: BreedSummary = {
      ...existing,
      name: input.name !== undefined ? normalizeBreedName(input.name) : existing.name,
      code: input.code !== undefined ? normalizeBreedCode(input.code) : existing.code,
      species:
        input.species !== undefined ? normalizeBreedSpecies(input.species) : existing.species,
      description:
        input.description !== undefined
          ? normalizeBreedDescription(input.description)
          : existing.description,
      active: input.active ?? existing.active,
      updatedAt: new Date().toISOString()
    };

    this.#breeds.set(updated.id, updated);
    return updated;
  }

  async getOrThrow(breedId: string): Promise<BreedSummary> {
    const breed = this.#breeds.get(breedId);
    if (!breed) {
      throw new NotFoundError('Breed not found', { breedId });
    }
    return breed;
  }

  async list(accountId: string, filters: BreedListFilters): Promise<BreedSummary[]> {
    this.#ensureSeedData(accountId);
    let items = Array.from(this.#breeds.values()).filter((breed) => breed.accountId === accountId);

    if (filters.active !== undefined) {
      items = items.filter((breed) => breed.active === filters.active);
    }

    if (filters.species && breedSpeciesValues.has(filters.species as BreedSpecies)) {
      items = items.filter((breed) => breed.species === filters.species);
    }

    if (filters.search) {
      const search = filters.search.toLowerCase();
      items = items.filter(
        (breed) =>
          breed.name.toLowerCase().includes(search) ||
          (breed.code?.toLowerCase().includes(search) ?? false) ||
          (breed.description?.toLowerCase().includes(search) ?? false)
      );
    }

    return items.sort((a, b) => a.name.localeCompare(b.name));
  }

  async delete(breedId: string): Promise<void> {
    this.#breeds.delete(breedId);
  }
}

class DatabaseBreedStore implements BreedStore {
  async #ensureSeedData(accountId: string): Promise<void> {
    await withTenantQuery(getPool(), async (client) => {
      const now = new Date();
      for (const seed of defaultBreedSeeds) {
        if (!seed.code) continue;
        await client.query(
          `INSERT INTO breeds (
             id,
             account_id,
             name,
             code,
             species,
             description,
             active,
             created_at,
             updated_at
           )
           SELECT
             $1::varchar,
             $2::uuid,
             $3::varchar,
             $4::varchar,
             $5::varchar,
             $6::text,
             $7::boolean,
             $8::timestamptz,
             $9::timestamptz
           WHERE NOT EXISTS (
             SELECT 1 FROM breeds WHERE account_id = $2::uuid AND code = $4::varchar
           )`,
          [
            createCatalogSeedId('breed', accountId, seed.code),
            accountId,
            seed.name,
            seed.code,
            seed.species,
            seed.description,
            seed.active,
            now,
            now
          ]
        );
      }
    });
  }

  async create(accountId: string, input: BreedInput): Promise<BreedSummary> {
    const now = new Date();
    const breed: BreedSummary = {
      id: createCorrelationId('breed'),
      accountId,
      name: normalizeBreedName(input.name),
      code: normalizeBreedCode(input.code),
      species: normalizeBreedSpecies(input.species),
      description: normalizeBreedDescription(input.description),
      active: input.active ?? true,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };

    return await withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `INSERT INTO breeds (
           id,
           account_id,
           name,
           code,
           species,
           description,
           active,
           created_at,
           updated_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          breed.id,
          breed.accountId,
          breed.name,
          breed.code,
          breed.species,
          breed.description,
          breed.active,
          new Date(breed.createdAt),
          new Date(breed.updatedAt)
        ]
      );
      return mapBreedRow(result.rows[0]);
    });
  }

  async update(breedId: string, input: BreedInput): Promise<BreedSummary> {
    const existing = await this.getOrThrow(breedId);
    const updated: BreedSummary = {
      ...existing,
      name: input.name !== undefined ? normalizeBreedName(input.name) : existing.name,
      code: input.code !== undefined ? normalizeBreedCode(input.code) : existing.code,
      species:
        input.species !== undefined ? normalizeBreedSpecies(input.species) : existing.species,
      description:
        input.description !== undefined
          ? normalizeBreedDescription(input.description)
          : existing.description,
      active: input.active ?? existing.active,
      updatedAt: new Date().toISOString()
    };

    return await withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `UPDATE breeds
         SET name = $2,
             code = $3,
             species = $4,
             description = $5,
             active = $6,
             updated_at = $7
         WHERE id = $1
         RETURNING *`,
        [
          breedId,
          updated.name,
          updated.code,
          updated.species,
          updated.description,
          updated.active,
          new Date(updated.updatedAt)
        ]
      );

      if (result.rows.length === 0) {
        throw new NotFoundError('Breed not found', { breedId });
      }
      return mapBreedRow(result.rows[0]);
    });
  }

  async getOrThrow(breedId: string): Promise<BreedSummary> {
    return await withTenantQuery(getPool(), async (client) => {
      const result = await client.query('SELECT * FROM breeds WHERE id = $1', [breedId]);
      if (result.rows.length === 0) {
        throw new NotFoundError('Breed not found', { breedId });
      }
      return mapBreedRow(result.rows[0]);
    });
  }

  async list(accountId: string, filters: BreedListFilters): Promise<BreedSummary[]> {
    await this.#ensureSeedData(accountId);
    return await withTenantQuery(getPool(), async (client) => {
      let sql = 'SELECT * FROM breeds WHERE account_id = $1';
      const params: unknown[] = [accountId];
      let nextParam = 2;

      if (filters.active !== undefined) {
        sql += ` AND active = $${nextParam}`;
        params.push(filters.active);
        nextParam++;
      }

      if (filters.species && breedSpeciesValues.has(filters.species as BreedSpecies)) {
        sql += ` AND species = $${nextParam}`;
        params.push(filters.species);
        nextParam++;
      }

      if (filters.search) {
        sql += ` AND (name ILIKE $${nextParam} OR code ILIKE $${nextParam} OR description ILIKE $${nextParam})`;
        params.push(`%${filters.search}%`);
        nextParam++;
      }

      sql += ' ORDER BY name ASC';
      const result = await client.query(sql, params);
      return result.rows.map((row: Record<string, unknown>) => mapBreedRow(row));
    });
  }

  async delete(breedId: string): Promise<void> {
    await withTenantQuery(getPool(), async (client) => {
      await client.query('DELETE FROM breeds WHERE id = $1', [breedId]);
    });
  }
}

export function createBreedStore(useDatabase: boolean): BreedStore {
  if (!useDatabase) return new InMemoryBreedStore();

  try {
    getPool();
    return new DatabaseBreedStore();
  } catch {
    return new InMemoryBreedStore();
  }
}

type AnimalSpeciesSystemCode =
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

interface AnimalSpeciesSummary {
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

export interface AnimalSpeciesInput {
  readonly name?: string;
  readonly code?: string | null;
  readonly systemCode?: AnimalSpeciesSystemCode;
  readonly description?: string | null;
  readonly active?: boolean;
}

interface AnimalSpeciesListFilters {
  readonly search?: string;
  readonly active?: boolean;
  readonly systemCode?: string;
}

interface AnimalSpeciesStore {
  create(accountId: string, input: AnimalSpeciesInput): Promise<AnimalSpeciesSummary>;
  update(speciesId: string, input: AnimalSpeciesInput): Promise<AnimalSpeciesSummary>;
  getOrThrow(speciesId: string): Promise<AnimalSpeciesSummary>;
  list(accountId: string, filters: AnimalSpeciesListFilters): Promise<AnimalSpeciesSummary[]>;
  delete(speciesId: string): Promise<void>;
}

const animalSpeciesSystemCodes = new Set<AnimalSpeciesSystemCode>([
  'not_defined',
  'avian',
  'bovine',
  'canine',
  'rabbit',
  'equine',
  'feline',
  'other',
  'primate',
  'rodent',
  'reptile'
]);
const animalSpeciesMaxNameLength = 160;
const animalSpeciesMaxCodeLength = 80;
const animalSpeciesMaxDescriptionLength = 1000;

const defaultAnimalSpeciesSeeds: readonly Omit<
  AnimalSpeciesSummary,
  'id' | 'accountId' | 'createdAt' | 'updatedAt'
>[] = [
  {
    name: 'Não Definido',
    code: 'NOT_DEFINED',
    systemCode: 'not_defined',
    description: 'Opcao Vetus para especie nao definida.',
    active: true
  },
  {
    name: 'Avicola',
    code: 'AVIAN',
    systemCode: 'avian',
    description: 'Opcao Vetus para especies avicolas.',
    active: true
  },
  {
    name: 'Bovino',
    code: 'BOVINE',
    systemCode: 'bovine',
    description: 'Opcao Vetus para bovinos.',
    active: true
  },
  {
    name: 'Canina',
    code: 'CANINE',
    systemCode: 'canine',
    description: 'Pacientes caes.',
    active: true
  },
  {
    name: 'Cunicula',
    code: 'RABBIT',
    systemCode: 'rabbit',
    description: 'Opcao Vetus para lagomorfos/coelhos.',
    active: true
  },
  {
    name: 'Equina',
    code: 'EQUINE',
    systemCode: 'equine',
    description: 'Opcao Vetus para equinos.',
    active: true
  },
  {
    name: 'Felina',
    code: 'FELINE',
    systemCode: 'feline',
    description: 'Pacientes gatos.',
    active: true
  },
  {
    name: 'Outro',
    code: 'OTHER',
    systemCode: 'other',
    description: 'Outras especies cadastradas para atendimento.',
    active: true
  },
  {
    name: 'Primata',
    code: 'PRIMATE',
    systemCode: 'primate',
    description: 'Opcao Vetus para primatas.',
    active: true
  },
  {
    name: 'Roedor',
    code: 'RODENT',
    systemCode: 'rodent',
    description: 'Pacientes roedores.',
    active: true
  },
  {
    name: 'Reptil',
    code: 'REPTILE',
    systemCode: 'reptile',
    description: 'Pacientes repteis.',
    active: true
  }
];

function normalizeAnimalSpeciesSystemCode(
  value: AnimalSpeciesSystemCode | undefined
): AnimalSpeciesSystemCode {
  if (!value) return 'other';
  if (!animalSpeciesSystemCodes.has(value)) {
    throw new ValidationError('systemCode is invalid');
  }
  return value;
}

function normalizeAnimalSpeciesName(value: string | undefined): string {
  const name = requireNonEmptyString(value, 'name').trim();
  if (name.length > animalSpeciesMaxNameLength) {
    throw new ValidationError(`name must have at most ${animalSpeciesMaxNameLength} characters`);
  }
  return name;
}

function normalizeAnimalSpeciesCode(value: string | null | undefined): string | null {
  const code = value?.trim() || null;
  if (code && code.length > animalSpeciesMaxCodeLength) {
    throw new ValidationError(`code must have at most ${animalSpeciesMaxCodeLength} characters`);
  }
  return code;
}

function normalizeAnimalSpeciesDescription(value: string | null | undefined): string | null {
  const description = value?.trim() || null;
  if (description && description.length > animalSpeciesMaxDescriptionLength) {
    throw new ValidationError(
      `description must have at most ${animalSpeciesMaxDescriptionLength} characters`
    );
  }
  return description;
}

function mapAnimalSpeciesRow(row: Record<string, unknown>): AnimalSpeciesSummary {
  return {
    id: row.id as string,
    accountId: row.account_id as string,
    name: row.name as string,
    code: (row.code as string | null) ?? null,
    systemCode: row.system_code as AnimalSpeciesSystemCode,
    description: (row.description as string | null) ?? null,
    active: row.active as boolean,
    createdAt: new Date(row.created_at as string | Date).toISOString(),
    updatedAt: new Date(row.updated_at as string | Date).toISOString()
  };
}

class InMemoryAnimalSpeciesStore implements AnimalSpeciesStore {
  readonly #species = new Map<string, AnimalSpeciesSummary>();

  #ensureSeedData(accountId: string): void {
    const now = new Date().toISOString();
    for (const seed of defaultAnimalSpeciesSeeds) {
      const alreadyExists = Array.from(this.#species.values()).some(
        (species) => species.accountId === accountId && species.code === seed.code
      );
      if (alreadyExists || !seed.code) continue;

      const species: AnimalSpeciesSummary = {
        id: createCatalogSeedId('species', accountId, seed.code),
        accountId,
        ...seed,
        createdAt: now,
        updatedAt: now
      };
      this.#species.set(species.id, species);
    }
  }

  async create(accountId: string, input: AnimalSpeciesInput): Promise<AnimalSpeciesSummary> {
    const now = new Date().toISOString();
    const species: AnimalSpeciesSummary = {
      id: createCorrelationId('species'),
      accountId,
      name: normalizeAnimalSpeciesName(input.name),
      code: normalizeAnimalSpeciesCode(input.code),
      systemCode: normalizeAnimalSpeciesSystemCode(input.systemCode),
      description: normalizeAnimalSpeciesDescription(input.description),
      active: input.active ?? true,
      createdAt: now,
      updatedAt: now
    };

    this.#species.set(species.id, species);
    return species;
  }

  async update(speciesId: string, input: AnimalSpeciesInput): Promise<AnimalSpeciesSummary> {
    const existing = await this.getOrThrow(speciesId);
    const updated: AnimalSpeciesSummary = {
      ...existing,
      name: input.name !== undefined ? normalizeAnimalSpeciesName(input.name) : existing.name,
      code: input.code !== undefined ? normalizeAnimalSpeciesCode(input.code) : existing.code,
      systemCode:
        input.systemCode !== undefined
          ? normalizeAnimalSpeciesSystemCode(input.systemCode)
          : existing.systemCode,
      description:
        input.description !== undefined
          ? normalizeAnimalSpeciesDescription(input.description)
          : existing.description,
      active: input.active ?? existing.active,
      updatedAt: new Date().toISOString()
    };

    this.#species.set(updated.id, updated);
    return updated;
  }

  async getOrThrow(speciesId: string): Promise<AnimalSpeciesSummary> {
    const species = this.#species.get(speciesId);
    if (!species) {
      throw new NotFoundError('Animal species not found', { speciesId });
    }
    return species;
  }

  async list(
    accountId: string,
    filters: AnimalSpeciesListFilters
  ): Promise<AnimalSpeciesSummary[]> {
    this.#ensureSeedData(accountId);
    let items = Array.from(this.#species.values()).filter(
      (species) => species.accountId === accountId
    );

    if (filters.active !== undefined) {
      items = items.filter((species) => species.active === filters.active);
    }

    if (
      filters.systemCode &&
      animalSpeciesSystemCodes.has(filters.systemCode as AnimalSpeciesSystemCode)
    ) {
      items = items.filter((species) => species.systemCode === filters.systemCode);
    }

    if (filters.search) {
      const search = filters.search.toLowerCase();
      items = items.filter(
        (species) =>
          species.name.toLowerCase().includes(search) ||
          (species.code?.toLowerCase().includes(search) ?? false) ||
          species.systemCode.toLowerCase().includes(search) ||
          (species.description?.toLowerCase().includes(search) ?? false)
      );
    }

    return items.sort((a, b) => a.name.localeCompare(b.name));
  }

  async delete(speciesId: string): Promise<void> {
    this.#species.delete(speciesId);
  }
}

class DatabaseAnimalSpeciesStore implements AnimalSpeciesStore {
  async #ensureSeedData(accountId: string): Promise<void> {
    await withTenantQuery(getPool(), async (client) => {
      const now = new Date();
      for (const seed of defaultAnimalSpeciesSeeds) {
        if (!seed.code) continue;
        await client.query(
          `INSERT INTO animal_species (
             id,
             account_id,
             name,
             code,
             system_code,
             description,
             active,
             created_at,
             updated_at
           )
           SELECT
             $1::varchar,
             $2::uuid,
             $3::varchar,
             $4::varchar,
             $5::varchar,
             $6::text,
             $7::boolean,
             $8::timestamptz,
             $9::timestamptz
           WHERE NOT EXISTS (
             SELECT 1 FROM animal_species WHERE account_id = $2::uuid AND code = $4::varchar
           )`,
          [
            createCatalogSeedId('species', accountId, seed.code),
            accountId,
            seed.name,
            seed.code,
            seed.systemCode,
            seed.description,
            seed.active,
            now,
            now
          ]
        );
      }
    });
  }

  async create(accountId: string, input: AnimalSpeciesInput): Promise<AnimalSpeciesSummary> {
    const now = new Date();
    const species: AnimalSpeciesSummary = {
      id: createCorrelationId('species'),
      accountId,
      name: normalizeAnimalSpeciesName(input.name),
      code: normalizeAnimalSpeciesCode(input.code),
      systemCode: normalizeAnimalSpeciesSystemCode(input.systemCode),
      description: normalizeAnimalSpeciesDescription(input.description),
      active: input.active ?? true,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };

    return await withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `INSERT INTO animal_species (
           id,
           account_id,
           name,
           code,
           system_code,
           description,
           active,
           created_at,
           updated_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          species.id,
          species.accountId,
          species.name,
          species.code,
          species.systemCode,
          species.description,
          species.active,
          new Date(species.createdAt),
          new Date(species.updatedAt)
        ]
      );
      return mapAnimalSpeciesRow(result.rows[0]);
    });
  }

  async update(speciesId: string, input: AnimalSpeciesInput): Promise<AnimalSpeciesSummary> {
    const existing = await this.getOrThrow(speciesId);
    const updated: AnimalSpeciesSummary = {
      ...existing,
      name: input.name !== undefined ? normalizeAnimalSpeciesName(input.name) : existing.name,
      code: input.code !== undefined ? normalizeAnimalSpeciesCode(input.code) : existing.code,
      systemCode:
        input.systemCode !== undefined
          ? normalizeAnimalSpeciesSystemCode(input.systemCode)
          : existing.systemCode,
      description:
        input.description !== undefined
          ? normalizeAnimalSpeciesDescription(input.description)
          : existing.description,
      active: input.active ?? existing.active,
      updatedAt: new Date().toISOString()
    };

    return await withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `UPDATE animal_species
         SET name = $2,
             code = $3,
             system_code = $4,
             description = $5,
             active = $6,
             updated_at = $7
         WHERE id = $1
         RETURNING *`,
        [
          speciesId,
          updated.name,
          updated.code,
          updated.systemCode,
          updated.description,
          updated.active,
          new Date(updated.updatedAt)
        ]
      );

      if (result.rows.length === 0) {
        throw new NotFoundError('Animal species not found', { speciesId });
      }
      return mapAnimalSpeciesRow(result.rows[0]);
    });
  }

  async getOrThrow(speciesId: string): Promise<AnimalSpeciesSummary> {
    return await withTenantQuery(getPool(), async (client) => {
      const result = await client.query('SELECT * FROM animal_species WHERE id = $1', [speciesId]);
      if (result.rows.length === 0) {
        throw new NotFoundError('Animal species not found', { speciesId });
      }
      return mapAnimalSpeciesRow(result.rows[0]);
    });
  }

  async list(
    accountId: string,
    filters: AnimalSpeciesListFilters
  ): Promise<AnimalSpeciesSummary[]> {
    await this.#ensureSeedData(accountId);
    return await withTenantQuery(getPool(), async (client) => {
      let sql = 'SELECT * FROM animal_species WHERE account_id = $1';
      const params: unknown[] = [accountId];
      let nextParam = 2;

      if (filters.active !== undefined) {
        sql += ` AND active = $${nextParam}`;
        params.push(filters.active);
        nextParam++;
      }

      if (
        filters.systemCode &&
        animalSpeciesSystemCodes.has(filters.systemCode as AnimalSpeciesSystemCode)
      ) {
        sql += ` AND system_code = $${nextParam}`;
        params.push(filters.systemCode);
        nextParam++;
      }

      if (filters.search) {
        sql += ` AND (name ILIKE $${nextParam} OR code ILIKE $${nextParam} OR system_code ILIKE $${nextParam} OR description ILIKE $${nextParam})`;
        params.push(`%${filters.search}%`);
        nextParam++;
      }

      sql += ' ORDER BY name ASC';
      const result = await client.query(sql, params);
      return result.rows.map((row: Record<string, unknown>) => mapAnimalSpeciesRow(row));
    });
  }

  async delete(speciesId: string): Promise<void> {
    await withTenantQuery(getPool(), async (client) => {
      await client.query('DELETE FROM animal_species WHERE id = $1', [speciesId]);
    });
  }
}

export function createAnimalSpeciesStore(useDatabase: boolean): AnimalSpeciesStore {
  if (!useDatabase) return new InMemoryAnimalSpeciesStore();

  try {
    getPool();
    return new DatabaseAnimalSpeciesStore();
  } catch {
    return new InMemoryAnimalSpeciesStore();
  }
}

interface CoatColorSummary {
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

export interface CoatColorInput {
  readonly name?: string;
  readonly code?: string | null;
  readonly colorGroup?: string | null;
  readonly hexColor?: string | null;
  readonly description?: string | null;
  readonly active?: boolean;
}

interface CoatColorListFilters {
  readonly search?: string;
  readonly active?: boolean;
  readonly colorGroup?: string;
}

interface CoatColorStore {
  create(accountId: string, input: CoatColorInput): Promise<CoatColorSummary>;
  update(coatColorId: string, input: CoatColorInput): Promise<CoatColorSummary>;
  getOrThrow(coatColorId: string): Promise<CoatColorSummary>;
  list(accountId: string, filters: CoatColorListFilters): Promise<CoatColorSummary[]>;
  delete(coatColorId: string): Promise<void>;
}

const coatColorMaxNameLength = 160;
const coatColorMaxCodeLength = 80;
const coatColorMaxGroupLength = 80;
const coatColorMaxDescriptionLength = 1000;
const coatColorHexPattern = /^#[0-9A-Fa-f]{6}$/;

function normalizeCoatColorName(value: string | undefined): string {
  const name = requireNonEmptyString(value, 'name').trim();
  if (name.length > coatColorMaxNameLength) {
    throw new ValidationError(`name must have at most ${coatColorMaxNameLength} characters`);
  }
  return name;
}

function normalizeCoatColorCode(value: string | null | undefined): string | null {
  const code = value?.trim() || null;
  if (code && code.length > coatColorMaxCodeLength) {
    throw new ValidationError(`code must have at most ${coatColorMaxCodeLength} characters`);
  }
  return code;
}

function normalizeCoatColorGroup(value: string | null | undefined): string | null {
  const colorGroup = value?.trim() || null;
  if (colorGroup && colorGroup.length > coatColorMaxGroupLength) {
    throw new ValidationError(`colorGroup must have at most ${coatColorMaxGroupLength} characters`);
  }
  return colorGroup;
}

function normalizeCoatColorHex(value: string | null | undefined): string | null {
  const hexColor = value?.trim() || null;
  if (hexColor && !coatColorHexPattern.test(hexColor)) {
    throw new ValidationError('hexColor must be a valid #RRGGBB value');
  }
  return hexColor;
}

function normalizeCoatColorDescription(value: string | null | undefined): string | null {
  const description = value?.trim() || null;
  if (description && description.length > coatColorMaxDescriptionLength) {
    throw new ValidationError(
      `description must have at most ${coatColorMaxDescriptionLength} characters`
    );
  }
  return description;
}

function mapCoatColorRow(row: Record<string, unknown>): CoatColorSummary {
  return {
    id: row.id as string,
    accountId: row.account_id as string,
    name: row.name as string,
    code: (row.code as string | null) ?? null,
    colorGroup: (row.color_group as string | null) ?? null,
    hexColor: (row.hex_color as string | null) ?? null,
    description: (row.description as string | null) ?? null,
    active: row.active as boolean,
    createdAt: new Date(row.created_at as string | Date).toISOString(),
    updatedAt: new Date(row.updated_at as string | Date).toISOString()
  };
}

class InMemoryCoatColorStore implements CoatColorStore {
  readonly #coatColors = new Map<string, CoatColorSummary>();

  async create(accountId: string, input: CoatColorInput): Promise<CoatColorSummary> {
    const now = new Date().toISOString();
    const coatColor: CoatColorSummary = {
      id: createCorrelationId('coat-color'),
      accountId,
      name: normalizeCoatColorName(input.name),
      code: normalizeCoatColorCode(input.code),
      colorGroup: normalizeCoatColorGroup(input.colorGroup),
      hexColor: normalizeCoatColorHex(input.hexColor),
      description: normalizeCoatColorDescription(input.description),
      active: input.active ?? true,
      createdAt: now,
      updatedAt: now
    };

    this.#coatColors.set(coatColor.id, coatColor);
    return coatColor;
  }

  async update(coatColorId: string, input: CoatColorInput): Promise<CoatColorSummary> {
    const existing = await this.getOrThrow(coatColorId);
    const updated: CoatColorSummary = {
      ...existing,
      name: input.name !== undefined ? normalizeCoatColorName(input.name) : existing.name,
      code: input.code !== undefined ? normalizeCoatColorCode(input.code) : existing.code,
      colorGroup:
        input.colorGroup !== undefined
          ? normalizeCoatColorGroup(input.colorGroup)
          : existing.colorGroup,
      hexColor:
        input.hexColor !== undefined ? normalizeCoatColorHex(input.hexColor) : existing.hexColor,
      description:
        input.description !== undefined
          ? normalizeCoatColorDescription(input.description)
          : existing.description,
      active: input.active ?? existing.active,
      updatedAt: new Date().toISOString()
    };

    this.#coatColors.set(updated.id, updated);
    return updated;
  }

  async getOrThrow(coatColorId: string): Promise<CoatColorSummary> {
    const coatColor = this.#coatColors.get(coatColorId);
    if (!coatColor) {
      throw new NotFoundError('Coat color not found', { coatColorId });
    }
    return coatColor;
  }

  async list(accountId: string, filters: CoatColorListFilters): Promise<CoatColorSummary[]> {
    let items = Array.from(this.#coatColors.values()).filter(
      (coatColor) => coatColor.accountId === accountId
    );

    if (filters.active !== undefined) {
      items = items.filter((coatColor) => coatColor.active === filters.active);
    }

    if (filters.colorGroup) {
      const colorGroup = filters.colorGroup.toLowerCase();
      items = items.filter((coatColor) => coatColor.colorGroup?.toLowerCase() === colorGroup);
    }

    if (filters.search) {
      const search = filters.search.toLowerCase();
      items = items.filter(
        (coatColor) =>
          coatColor.name.toLowerCase().includes(search) ||
          (coatColor.code?.toLowerCase().includes(search) ?? false) ||
          (coatColor.colorGroup?.toLowerCase().includes(search) ?? false) ||
          (coatColor.description?.toLowerCase().includes(search) ?? false)
      );
    }

    return items.sort((a, b) => a.name.localeCompare(b.name));
  }

  async delete(coatColorId: string): Promise<void> {
    this.#coatColors.delete(coatColorId);
  }
}

class DatabaseCoatColorStore implements CoatColorStore {
  async create(accountId: string, input: CoatColorInput): Promise<CoatColorSummary> {
    const now = new Date();
    const coatColor: CoatColorSummary = {
      id: createCorrelationId('coat-color'),
      accountId,
      name: normalizeCoatColorName(input.name),
      code: normalizeCoatColorCode(input.code),
      colorGroup: normalizeCoatColorGroup(input.colorGroup),
      hexColor: normalizeCoatColorHex(input.hexColor),
      description: normalizeCoatColorDescription(input.description),
      active: input.active ?? true,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };

    return await withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `INSERT INTO coat_colors (
           id,
           account_id,
           name,
           code,
           color_group,
           hex_color,
           description,
           active,
           created_at,
           updated_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         RETURNING *`,
        [
          coatColor.id,
          coatColor.accountId,
          coatColor.name,
          coatColor.code,
          coatColor.colorGroup,
          coatColor.hexColor,
          coatColor.description,
          coatColor.active,
          new Date(coatColor.createdAt),
          new Date(coatColor.updatedAt)
        ]
      );
      return mapCoatColorRow(result.rows[0]);
    });
  }

  async update(coatColorId: string, input: CoatColorInput): Promise<CoatColorSummary> {
    const existing = await this.getOrThrow(coatColorId);
    const updated: CoatColorSummary = {
      ...existing,
      name: input.name !== undefined ? normalizeCoatColorName(input.name) : existing.name,
      code: input.code !== undefined ? normalizeCoatColorCode(input.code) : existing.code,
      colorGroup:
        input.colorGroup !== undefined
          ? normalizeCoatColorGroup(input.colorGroup)
          : existing.colorGroup,
      hexColor:
        input.hexColor !== undefined ? normalizeCoatColorHex(input.hexColor) : existing.hexColor,
      description:
        input.description !== undefined
          ? normalizeCoatColorDescription(input.description)
          : existing.description,
      active: input.active ?? existing.active,
      updatedAt: new Date().toISOString()
    };

    return await withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `UPDATE coat_colors
         SET name = $2,
             code = $3,
             color_group = $4,
             hex_color = $5,
             description = $6,
             active = $7,
             updated_at = $8
         WHERE id = $1
         RETURNING *`,
        [
          coatColorId,
          updated.name,
          updated.code,
          updated.colorGroup,
          updated.hexColor,
          updated.description,
          updated.active,
          new Date(updated.updatedAt)
        ]
      );

      if (result.rows.length === 0) {
        throw new NotFoundError('Coat color not found', { coatColorId });
      }
      return mapCoatColorRow(result.rows[0]);
    });
  }

  async getOrThrow(coatColorId: string): Promise<CoatColorSummary> {
    return await withTenantQuery(getPool(), async (client) => {
      const result = await client.query('SELECT * FROM coat_colors WHERE id = $1', [coatColorId]);
      if (result.rows.length === 0) {
        throw new NotFoundError('Coat color not found', { coatColorId });
      }
      return mapCoatColorRow(result.rows[0]);
    });
  }

  async list(accountId: string, filters: CoatColorListFilters): Promise<CoatColorSummary[]> {
    return await withTenantQuery(getPool(), async (client) => {
      let sql = 'SELECT * FROM coat_colors WHERE account_id = $1';
      const params: unknown[] = [accountId];
      let nextParam = 2;

      if (filters.active !== undefined) {
        sql += ` AND active = $${nextParam}`;
        params.push(filters.active);
        nextParam++;
      }

      if (filters.colorGroup) {
        sql += ` AND color_group ILIKE $${nextParam}`;
        params.push(filters.colorGroup);
        nextParam++;
      }

      if (filters.search) {
        sql += ` AND (name ILIKE $${nextParam} OR code ILIKE $${nextParam} OR color_group ILIKE $${nextParam} OR description ILIKE $${nextParam})`;
        params.push(`%${filters.search}%`);
        nextParam++;
      }

      sql += ' ORDER BY name ASC';
      const result = await client.query(sql, params);
      return result.rows.map((row: Record<string, unknown>) => mapCoatColorRow(row));
    });
  }

  async delete(coatColorId: string): Promise<void> {
    await withTenantQuery(getPool(), async (client) => {
      await client.query('DELETE FROM coat_colors WHERE id = $1', [coatColorId]);
    });
  }
}

export function createCoatColorStore(useDatabase: boolean): CoatColorStore {
  if (!useDatabase) return new InMemoryCoatColorStore();

  try {
    getPool();
    return new DatabaseCoatColorStore();
  } catch {
    return new InMemoryCoatColorStore();
  }
}
