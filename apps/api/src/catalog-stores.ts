import { getPool } from '@cvg-his-v2/shared-database';
import { NotFoundError, ValidationError } from '@cvg-his-v2/shared-errors';
import { createCorrelationId } from '@cvg-his-v2/shared-utils';
import { requireNonEmptyString } from '@cvg-his-v2/shared-validation';
import { withTenantQuery } from '@cvg-his-v2/tenant-context';

export interface CatalogStoreOptions {
  readonly allowInMemoryFallback?: boolean;
}

function useInMemoryFallback(options: CatalogStoreOptions): boolean {
  return options.allowInMemoryFallback !== false;
}

function throwDatabaseStoreConfigurationError(name: string, error: unknown): never {
  const cause = error instanceof Error ? error.message : String(error);
  throw new Error(`${name} database repository is unavailable: ${cause}`);
}

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

export interface ResponsibilityTermInput {
  readonly title?: string;
  readonly code?: string | null;
  readonly usageContext?: ResponsibilityTermUsageContext;
  readonly content?: string;
  readonly active?: boolean;
  readonly requiresOwnerSignature?: boolean;
  readonly requiresWitnessSignature?: boolean;
}

export interface ResponsibilityTermListFilters {
  readonly search?: string;
  readonly active?: boolean;
  readonly usageContext?: string;
}

interface ResponsibilityTermStore {
  create(accountId: string, input: ResponsibilityTermInput): Promise<ResponsibilityTermSummary>;
  update(termId: string, input: ResponsibilityTermInput): Promise<ResponsibilityTermSummary>;
  getOrThrow(termId: string): Promise<ResponsibilityTermSummary>;
  list(
    accountId: string,
    filters: ResponsibilityTermListFilters
  ): Promise<ResponsibilityTermSummary[]>;
  delete(termId: string): Promise<void>;
}

const responsibilityTermUsageContexts = new Set<ResponsibilityTermUsageContext>([
  'atendimento',
  'internacao',
  'procedimento',
  'autorizacao',
  'outro'
]);
const responsibilityTermMaxTitleLength = 160;
const responsibilityTermMaxCodeLength = 80;
const responsibilityTermMaxContentLength = 20000;

function normalizeResponsibilityTermUsageContext(
  value: ResponsibilityTermUsageContext | undefined
): ResponsibilityTermUsageContext {
  if (!value) return 'atendimento';
  if (!responsibilityTermUsageContexts.has(value)) {
    throw new ValidationError('usageContext is invalid');
  }
  return value;
}

function normalizeResponsibilityTermTitle(value: string | undefined): string {
  const title = requireNonEmptyString(value, 'title').trim();
  if (title.length > responsibilityTermMaxTitleLength) {
    throw new ValidationError(
      `title must have at most ${responsibilityTermMaxTitleLength} characters`
    );
  }
  return title;
}

function normalizeResponsibilityTermCode(value: string | null | undefined): string | null {
  const code = value?.trim() || null;
  if (code && code.length > responsibilityTermMaxCodeLength) {
    throw new ValidationError(
      `code must have at most ${responsibilityTermMaxCodeLength} characters`
    );
  }
  return code;
}

function normalizeResponsibilityTermContent(value: string | undefined): string {
  const content = requireNonEmptyString(value, 'content').trim();
  if (content.length > responsibilityTermMaxContentLength) {
    throw new ValidationError(
      `content must have at most ${responsibilityTermMaxContentLength} characters`
    );
  }
  return content;
}

function mapResponsibilityTermRow(row: Record<string, unknown>): ResponsibilityTermSummary {
  return {
    id: row.id as string,
    accountId: row.account_id as string,
    title: row.title as string,
    code: (row.code as string | null) ?? null,
    usageContext: row.usage_context as ResponsibilityTermUsageContext,
    content: row.content as string,
    active: row.active as boolean,
    requiresOwnerSignature: row.requires_owner_signature as boolean,
    requiresWitnessSignature: row.requires_witness_signature as boolean,
    createdAt: new Date(row.created_at as string | Date).toISOString(),
    updatedAt: new Date(row.updated_at as string | Date).toISOString()
  };
}

class InMemoryResponsibilityTermStore implements ResponsibilityTermStore {
  readonly #terms = new Map<string, ResponsibilityTermSummary>();

  async create(
    accountId: string,
    input: ResponsibilityTermInput
  ): Promise<ResponsibilityTermSummary> {
    const now = new Date().toISOString();
    const term: ResponsibilityTermSummary = {
      id: createCorrelationId('term'),
      accountId,
      title: normalizeResponsibilityTermTitle(input.title),
      code: normalizeResponsibilityTermCode(input.code),
      usageContext: normalizeResponsibilityTermUsageContext(input.usageContext),
      content: normalizeResponsibilityTermContent(input.content),
      active: input.active ?? true,
      requiresOwnerSignature: input.requiresOwnerSignature ?? true,
      requiresWitnessSignature: input.requiresWitnessSignature ?? false,
      createdAt: now,
      updatedAt: now
    };

    this.#terms.set(term.id, term);
    return term;
  }

  async update(termId: string, input: ResponsibilityTermInput): Promise<ResponsibilityTermSummary> {
    const existing = await this.getOrThrow(termId);
    const updated: ResponsibilityTermSummary = {
      ...existing,
      title:
        input.title !== undefined ? normalizeResponsibilityTermTitle(input.title) : existing.title,
      code: input.code !== undefined ? normalizeResponsibilityTermCode(input.code) : existing.code,
      usageContext:
        input.usageContext !== undefined
          ? normalizeResponsibilityTermUsageContext(input.usageContext)
          : existing.usageContext,
      content:
        input.content !== undefined
          ? normalizeResponsibilityTermContent(input.content)
          : existing.content,
      active: input.active ?? existing.active,
      requiresOwnerSignature: input.requiresOwnerSignature ?? existing.requiresOwnerSignature,
      requiresWitnessSignature: input.requiresWitnessSignature ?? existing.requiresWitnessSignature,
      updatedAt: new Date().toISOString()
    };

    this.#terms.set(updated.id, updated);
    return updated;
  }

  async getOrThrow(termId: string): Promise<ResponsibilityTermSummary> {
    const term = this.#terms.get(termId);
    if (!term) {
      throw new NotFoundError('Responsibility term not found', { termId });
    }
    return term;
  }

  async list(
    accountId: string,
    filters: ResponsibilityTermListFilters
  ): Promise<ResponsibilityTermSummary[]> {
    let items = Array.from(this.#terms.values()).filter((term) => term.accountId === accountId);

    if (filters.active !== undefined) {
      items = items.filter((term) => term.active === filters.active);
    }

    if (
      filters.usageContext &&
      responsibilityTermUsageContexts.has(filters.usageContext as ResponsibilityTermUsageContext)
    ) {
      items = items.filter((term) => term.usageContext === filters.usageContext);
    }

    if (filters.search) {
      const search = filters.search.toLowerCase();
      items = items.filter(
        (term) =>
          term.title.toLowerCase().includes(search) ||
          (term.code?.toLowerCase().includes(search) ?? false) ||
          term.content.toLowerCase().includes(search)
      );
    }

    return items.sort((a, b) => a.title.localeCompare(b.title));
  }

  async delete(termId: string): Promise<void> {
    this.#terms.delete(termId);
  }
}

class DatabaseResponsibilityTermStore implements ResponsibilityTermStore {
  async create(
    accountId: string,
    input: ResponsibilityTermInput
  ): Promise<ResponsibilityTermSummary> {
    const now = new Date();
    const term: ResponsibilityTermSummary = {
      id: createCorrelationId('term'),
      accountId,
      title: normalizeResponsibilityTermTitle(input.title),
      code: normalizeResponsibilityTermCode(input.code),
      usageContext: normalizeResponsibilityTermUsageContext(input.usageContext),
      content: normalizeResponsibilityTermContent(input.content),
      active: input.active ?? true,
      requiresOwnerSignature: input.requiresOwnerSignature ?? true,
      requiresWitnessSignature: input.requiresWitnessSignature ?? false,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    };

    return await withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `INSERT INTO responsibility_terms (
           id,
           account_id,
           title,
           code,
           usage_context,
           content,
           active,
           requires_owner_signature,
           requires_witness_signature,
           created_at,
           updated_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [
          term.id,
          term.accountId,
          term.title,
          term.code,
          term.usageContext,
          term.content,
          term.active,
          term.requiresOwnerSignature,
          term.requiresWitnessSignature,
          new Date(term.createdAt),
          new Date(term.updatedAt)
        ]
      );
      return mapResponsibilityTermRow(result.rows[0]);
    });
  }

  async update(termId: string, input: ResponsibilityTermInput): Promise<ResponsibilityTermSummary> {
    const existing = await this.getOrThrow(termId);
    const updated: ResponsibilityTermSummary = {
      ...existing,
      title:
        input.title !== undefined ? normalizeResponsibilityTermTitle(input.title) : existing.title,
      code: input.code !== undefined ? normalizeResponsibilityTermCode(input.code) : existing.code,
      usageContext:
        input.usageContext !== undefined
          ? normalizeResponsibilityTermUsageContext(input.usageContext)
          : existing.usageContext,
      content:
        input.content !== undefined
          ? normalizeResponsibilityTermContent(input.content)
          : existing.content,
      active: input.active ?? existing.active,
      requiresOwnerSignature: input.requiresOwnerSignature ?? existing.requiresOwnerSignature,
      requiresWitnessSignature: input.requiresWitnessSignature ?? existing.requiresWitnessSignature,
      updatedAt: new Date().toISOString()
    };

    return await withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `UPDATE responsibility_terms
         SET title = $2,
             code = $3,
             usage_context = $4,
             content = $5,
             active = $6,
             requires_owner_signature = $7,
             requires_witness_signature = $8,
             updated_at = $9
         WHERE id = $1
         RETURNING *`,
        [
          termId,
          updated.title,
          updated.code,
          updated.usageContext,
          updated.content,
          updated.active,
          updated.requiresOwnerSignature,
          updated.requiresWitnessSignature,
          new Date(updated.updatedAt)
        ]
      );

      if (result.rows.length === 0) {
        throw new NotFoundError('Responsibility term not found', { termId });
      }
      return mapResponsibilityTermRow(result.rows[0]);
    });
  }

  async getOrThrow(termId: string): Promise<ResponsibilityTermSummary> {
    return await withTenantQuery(getPool(), async (client) => {
      const result = await client.query('SELECT * FROM responsibility_terms WHERE id = $1', [
        termId
      ]);
      if (result.rows.length === 0) {
        throw new NotFoundError('Responsibility term not found', { termId });
      }
      return mapResponsibilityTermRow(result.rows[0]);
    });
  }

  async list(
    accountId: string,
    filters: ResponsibilityTermListFilters
  ): Promise<ResponsibilityTermSummary[]> {
    return await withTenantQuery(getPool(), async (client) => {
      let sql = 'SELECT * FROM responsibility_terms WHERE account_id = $1';
      const params: unknown[] = [accountId];
      let nextParam = 2;

      if (filters.active !== undefined) {
        sql += ` AND active = $${nextParam}`;
        params.push(filters.active);
        nextParam++;
      }

      if (
        filters.usageContext &&
        responsibilityTermUsageContexts.has(filters.usageContext as ResponsibilityTermUsageContext)
      ) {
        sql += ` AND usage_context = $${nextParam}`;
        params.push(filters.usageContext);
        nextParam++;
      }

      if (filters.search) {
        sql += ` AND (title ILIKE $${nextParam} OR code ILIKE $${nextParam} OR content ILIKE $${nextParam})`;
        params.push(`%${filters.search}%`);
        nextParam++;
      }

      sql += ' ORDER BY title ASC';
      const result = await client.query(sql, params);
      return result.rows.map((row: Record<string, unknown>) => mapResponsibilityTermRow(row));
    });
  }

  async delete(termId: string): Promise<void> {
    await withTenantQuery(getPool(), async (client) => {
      await client.query('DELETE FROM responsibility_terms WHERE id = $1', [termId]);
    });
  }
}

export function createResponsibilityTermStore(
  options: CatalogStoreOptions = {}
): ResponsibilityTermStore {
  try {
    getPool();
    return new DatabaseResponsibilityTermStore();
  } catch (error) {
    if (!useInMemoryFallback(options)) {
      throwDatabaseStoreConfigurationError('Responsibility term', error);
    }
    return new InMemoryResponsibilityTermStore();
  }
}

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

export interface BreedInput {
  readonly name?: string;
  readonly code?: string | null;
  readonly species?: BreedSpecies;
  readonly description?: string | null;
  readonly active?: boolean;
}

export interface BreedListFilters {
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

export function createBreedStore(options: CatalogStoreOptions = {}): BreedStore {
  try {
    getPool();
    return new DatabaseBreedStore();
  } catch (error) {
    if (!useInMemoryFallback(options)) {
      throwDatabaseStoreConfigurationError('Breed', error);
    }
    return new InMemoryBreedStore();
  }
}

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

export interface AnimalSpeciesInput {
  readonly name?: string;
  readonly code?: string | null;
  readonly systemCode?: AnimalSpeciesSystemCode;
  readonly description?: string | null;
  readonly active?: boolean;
}

export interface AnimalSpeciesListFilters {
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

export function createAnimalSpeciesStore(options: CatalogStoreOptions = {}): AnimalSpeciesStore {
  try {
    getPool();
    return new DatabaseAnimalSpeciesStore();
  } catch (error) {
    if (!useInMemoryFallback(options)) {
      throwDatabaseStoreConfigurationError('Animal species', error);
    }
    return new InMemoryAnimalSpeciesStore();
  }
}

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

export interface CoatColorInput {
  readonly name?: string;
  readonly code?: string | null;
  readonly colorGroup?: string | null;
  readonly hexColor?: string | null;
  readonly description?: string | null;
  readonly active?: boolean;
}

export interface CoatColorListFilters {
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

export function createCoatColorStore(options: CatalogStoreOptions = {}): CoatColorStore {
  try {
    getPool();
    return new DatabaseCoatColorStore();
  } catch (error) {
    if (!useInMemoryFallback(options)) {
      throwDatabaseStoreConfigurationError('Coat color', error);
    }
    return new InMemoryCoatColorStore();
  }
}

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

export interface CustomerGroupInput {
  readonly name?: string;
  readonly code?: string | null;
  readonly segment?: string | null;
  readonly discountPercent?: number | string | null;
  readonly paymentTermDays?: number | string | null;
  readonly creditLimitAmount?: number | string | null;
  readonly description?: string | null;
  readonly active?: boolean;
}

export interface CustomerGroupListFilters {
  readonly search?: string;
  readonly active?: boolean;
  readonly segment?: string;
}

interface CustomerGroupStore {
  create(accountId: string, input: CustomerGroupInput): Promise<CustomerGroupSummary>;
  update(customerGroupId: string, input: CustomerGroupInput): Promise<CustomerGroupSummary>;
  getOrThrow(customerGroupId: string): Promise<CustomerGroupSummary>;
  list(accountId: string, filters: CustomerGroupListFilters): Promise<CustomerGroupSummary[]>;
  delete(customerGroupId: string): Promise<void>;
}

const customerGroupMaxNameLength = 160;
const customerGroupMaxCodeLength = 80;
const customerGroupMaxSegmentLength = 80;
const customerGroupMaxDescriptionLength = 1000;

function normalizeCustomerGroupName(value: string | undefined): string {
  const name = requireNonEmptyString(value, 'name').trim();
  if (name.length > customerGroupMaxNameLength) {
    throw new ValidationError(`name must have at most ${customerGroupMaxNameLength} characters`);
  }
  return name;
}

function normalizeCustomerGroupCode(value: string | null | undefined): string | null {
  const code = value?.trim() || null;
  if (code && code.length > customerGroupMaxCodeLength) {
    throw new ValidationError(`code must have at most ${customerGroupMaxCodeLength} characters`);
  }
  return code;
}

function normalizeCustomerGroupSegment(value: string | null | undefined): string | null {
  const segment = value?.trim() || null;
  if (segment && segment.length > customerGroupMaxSegmentLength) {
    throw new ValidationError(
      `segment must have at most ${customerGroupMaxSegmentLength} characters`
    );
  }
  return segment;
}

function normalizeCustomerGroupDescription(value: string | null | undefined): string | null {
  const description = value?.trim() || null;
  if (description && description.length > customerGroupMaxDescriptionLength) {
    throw new ValidationError(
      `description must have at most ${customerGroupMaxDescriptionLength} characters`
    );
  }
  return description;
}

function normalizeCustomerGroupNumber(
  value: number | string | null | undefined,
  field: string,
  min: number,
  max: number,
  defaultValue: number
): number {
  if (value === null || value === undefined || value === '') return defaultValue;
  const numberValue = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numberValue) || numberValue < min || numberValue > max) {
    throw new ValidationError(`${field} must be between ${min} and ${max}`);
  }
  return Number(numberValue.toFixed(2));
}

function normalizeCustomerGroupCreditLimit(
  value: number | string | null | undefined
): number | null {
  if (value === null || value === undefined || value === '') return null;
  const numberValue = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numberValue) || numberValue < 0) {
    throw new ValidationError('creditLimitAmount must be greater than or equal to 0');
  }
  return Number(numberValue.toFixed(2));
}

function mapCustomerGroupRow(row: Record<string, unknown>): CustomerGroupSummary {
  return {
    id: row.id as string,
    accountId: row.account_id as string,
    name: row.name as string,
    code: (row.code as string | null) ?? null,
    segment: (row.segment as string | null) ?? null,
    discountPercent: Number(row.discount_percent ?? 0),
    paymentTermDays: Number(row.payment_term_days ?? 0),
    creditLimitAmount: row.credit_limit_amount === null ? null : Number(row.credit_limit_amount),
    description: (row.description as string | null) ?? null,
    active: row.active as boolean,
    createdAt: new Date(row.created_at as string | Date).toISOString(),
    updatedAt: new Date(row.updated_at as string | Date).toISOString()
  };
}

function createCustomerGroupSummary(
  accountId: string,
  input: CustomerGroupInput
): CustomerGroupSummary {
  const now = new Date().toISOString();
  return {
    id: createCorrelationId('customer-group'),
    accountId,
    name: normalizeCustomerGroupName(input.name),
    code: normalizeCustomerGroupCode(input.code),
    segment: normalizeCustomerGroupSegment(input.segment),
    discountPercent: normalizeCustomerGroupNumber(
      input.discountPercent,
      'discountPercent',
      0,
      100,
      0
    ),
    paymentTermDays: Math.round(
      normalizeCustomerGroupNumber(input.paymentTermDays, 'paymentTermDays', 0, 365, 0)
    ),
    creditLimitAmount: normalizeCustomerGroupCreditLimit(input.creditLimitAmount),
    description: normalizeCustomerGroupDescription(input.description),
    active: input.active ?? true,
    createdAt: now,
    updatedAt: now
  };
}

class InMemoryCustomerGroupStore implements CustomerGroupStore {
  readonly #customerGroups = new Map<string, CustomerGroupSummary>();

  async create(accountId: string, input: CustomerGroupInput): Promise<CustomerGroupSummary> {
    const customerGroup = createCustomerGroupSummary(accountId, input);
    this.#customerGroups.set(customerGroup.id, customerGroup);
    return customerGroup;
  }

  async update(customerGroupId: string, input: CustomerGroupInput): Promise<CustomerGroupSummary> {
    const existing = await this.getOrThrow(customerGroupId);
    const updated: CustomerGroupSummary = {
      ...existing,
      name: input.name !== undefined ? normalizeCustomerGroupName(input.name) : existing.name,
      code: input.code !== undefined ? normalizeCustomerGroupCode(input.code) : existing.code,
      segment:
        input.segment !== undefined
          ? normalizeCustomerGroupSegment(input.segment)
          : existing.segment,
      discountPercent:
        input.discountPercent !== undefined
          ? normalizeCustomerGroupNumber(input.discountPercent, 'discountPercent', 0, 100, 0)
          : existing.discountPercent,
      paymentTermDays:
        input.paymentTermDays !== undefined
          ? Math.round(
              normalizeCustomerGroupNumber(input.paymentTermDays, 'paymentTermDays', 0, 365, 0)
            )
          : existing.paymentTermDays,
      creditLimitAmount:
        input.creditLimitAmount !== undefined
          ? normalizeCustomerGroupCreditLimit(input.creditLimitAmount)
          : existing.creditLimitAmount,
      description:
        input.description !== undefined
          ? normalizeCustomerGroupDescription(input.description)
          : existing.description,
      active: input.active ?? existing.active,
      updatedAt: new Date().toISOString()
    };
    this.#customerGroups.set(updated.id, updated);
    return updated;
  }

  async getOrThrow(customerGroupId: string): Promise<CustomerGroupSummary> {
    const customerGroup = this.#customerGroups.get(customerGroupId);
    if (!customerGroup) {
      throw new NotFoundError('Customer group not found', { customerGroupId });
    }
    return customerGroup;
  }

  async list(
    accountId: string,
    filters: CustomerGroupListFilters
  ): Promise<CustomerGroupSummary[]> {
    let items = Array.from(this.#customerGroups.values()).filter(
      (customerGroup) => customerGroup.accountId === accountId
    );

    if (filters.active !== undefined) {
      items = items.filter((customerGroup) => customerGroup.active === filters.active);
    }
    if (filters.segment) {
      const segment = filters.segment.toLowerCase();
      items = items.filter((customerGroup) => customerGroup.segment?.toLowerCase() === segment);
    }
    if (filters.search) {
      const search = filters.search.toLowerCase();
      items = items.filter(
        (customerGroup) =>
          customerGroup.name.toLowerCase().includes(search) ||
          (customerGroup.code?.toLowerCase().includes(search) ?? false) ||
          (customerGroup.segment?.toLowerCase().includes(search) ?? false) ||
          (customerGroup.description?.toLowerCase().includes(search) ?? false)
      );
    }

    return items.sort((a, b) => a.name.localeCompare(b.name));
  }

  async delete(customerGroupId: string): Promise<void> {
    this.#customerGroups.delete(customerGroupId);
  }
}

class DatabaseCustomerGroupStore implements CustomerGroupStore {
  async create(accountId: string, input: CustomerGroupInput): Promise<CustomerGroupSummary> {
    const customerGroup = createCustomerGroupSummary(accountId, input);
    return await withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `INSERT INTO customer_groups (
           id,
           account_id,
           name,
           code,
           segment,
           discount_percent,
           payment_term_days,
           credit_limit_amount,
           description,
           active,
           created_at,
           updated_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING *`,
        [
          customerGroup.id,
          customerGroup.accountId,
          customerGroup.name,
          customerGroup.code,
          customerGroup.segment,
          customerGroup.discountPercent,
          customerGroup.paymentTermDays,
          customerGroup.creditLimitAmount,
          customerGroup.description,
          customerGroup.active,
          new Date(customerGroup.createdAt),
          new Date(customerGroup.updatedAt)
        ]
      );
      return mapCustomerGroupRow(result.rows[0]);
    });
  }

  async update(customerGroupId: string, input: CustomerGroupInput): Promise<CustomerGroupSummary> {
    const existing = await this.getOrThrow(customerGroupId);
    const updated: CustomerGroupSummary = {
      ...existing,
      name: input.name !== undefined ? normalizeCustomerGroupName(input.name) : existing.name,
      code: input.code !== undefined ? normalizeCustomerGroupCode(input.code) : existing.code,
      segment:
        input.segment !== undefined
          ? normalizeCustomerGroupSegment(input.segment)
          : existing.segment,
      discountPercent:
        input.discountPercent !== undefined
          ? normalizeCustomerGroupNumber(input.discountPercent, 'discountPercent', 0, 100, 0)
          : existing.discountPercent,
      paymentTermDays:
        input.paymentTermDays !== undefined
          ? Math.round(
              normalizeCustomerGroupNumber(input.paymentTermDays, 'paymentTermDays', 0, 365, 0)
            )
          : existing.paymentTermDays,
      creditLimitAmount:
        input.creditLimitAmount !== undefined
          ? normalizeCustomerGroupCreditLimit(input.creditLimitAmount)
          : existing.creditLimitAmount,
      description:
        input.description !== undefined
          ? normalizeCustomerGroupDescription(input.description)
          : existing.description,
      active: input.active ?? existing.active,
      updatedAt: new Date().toISOString()
    };

    return await withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `UPDATE customer_groups
         SET name = $2,
             code = $3,
             segment = $4,
             discount_percent = $5,
             payment_term_days = $6,
             credit_limit_amount = $7,
             description = $8,
             active = $9,
             updated_at = $10
         WHERE id = $1
         RETURNING *`,
        [
          customerGroupId,
          updated.name,
          updated.code,
          updated.segment,
          updated.discountPercent,
          updated.paymentTermDays,
          updated.creditLimitAmount,
          updated.description,
          updated.active,
          new Date(updated.updatedAt)
        ]
      );

      if (result.rows.length === 0) {
        throw new NotFoundError('Customer group not found', { customerGroupId });
      }
      return mapCustomerGroupRow(result.rows[0]);
    });
  }

  async getOrThrow(customerGroupId: string): Promise<CustomerGroupSummary> {
    return await withTenantQuery(getPool(), async (client) => {
      const result = await client.query('SELECT * FROM customer_groups WHERE id = $1', [
        customerGroupId
      ]);
      if (result.rows.length === 0) {
        throw new NotFoundError('Customer group not found', { customerGroupId });
      }
      return mapCustomerGroupRow(result.rows[0]);
    });
  }

  async list(
    accountId: string,
    filters: CustomerGroupListFilters
  ): Promise<CustomerGroupSummary[]> {
    return await withTenantQuery(getPool(), async (client) => {
      let sql = 'SELECT * FROM customer_groups WHERE account_id = $1';
      const params: unknown[] = [accountId];
      let nextParam = 2;

      if (filters.active !== undefined) {
        sql += ` AND active = $${nextParam}`;
        params.push(filters.active);
        nextParam++;
      }

      if (filters.segment) {
        sql += ` AND segment ILIKE $${nextParam}`;
        params.push(filters.segment);
        nextParam++;
      }

      if (filters.search) {
        sql += ` AND (name ILIKE $${nextParam} OR code ILIKE $${nextParam} OR segment ILIKE $${nextParam} OR description ILIKE $${nextParam})`;
        params.push(`%${filters.search}%`);
        nextParam++;
      }

      sql += ' ORDER BY name ASC';
      const result = await client.query(sql, params);
      return result.rows.map((row: Record<string, unknown>) => mapCustomerGroupRow(row));
    });
  }

  async delete(customerGroupId: string): Promise<void> {
    await withTenantQuery(getPool(), async (client) => {
      await client.query('DELETE FROM customer_groups WHERE id = $1', [customerGroupId]);
    });
  }
}

export function createCustomerGroupStore(options: CatalogStoreOptions = {}): CustomerGroupStore {
  try {
    getPool();
    return new DatabaseCustomerGroupStore();
  } catch (error) {
    if (!useInMemoryFallback(options)) {
      throwDatabaseStoreConfigurationError('Customer group', error);
    }
    return new InMemoryCustomerGroupStore();
  }
}

export type PreventiveItemType = 'vaccine' | 'dewormer' | 'other';
export type PreventiveEventStatus = 'scheduled' | 'executed';

export interface PreventiveEventSummary {
  readonly id: string;
  readonly accountId: string;
  readonly patientId: string | null;
  readonly ownerId: string | null;
  readonly clientName: string;
  readonly animalName: string;
  readonly eventDate: string;
  readonly itemType: PreventiveItemType;
  readonly description: string;
  readonly status: PreventiveEventStatus;
  readonly observation: string | null;
  readonly executedAt: string | null;
  readonly executedObservation: string | null;
  readonly rescheduledFromId: string | null;
  readonly reminderEmailPreparedAt: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface PreventiveEventInput {
  readonly patientId?: string | null;
  readonly ownerId?: string | null;
  readonly clientName?: string;
  readonly animalName?: string;
  readonly eventDate?: string;
  readonly itemType?: PreventiveItemType;
  readonly description?: string;
  readonly observation?: string | null;
  readonly status?: PreventiveEventStatus;
}

export interface PreventiveEventExecuteInput {
  readonly observation?: string | null;
  readonly rescheduleTo?: string | null;
}

export interface PreventiveEventListFilters {
  readonly dateFrom?: string;
  readonly dateTo?: string;
  readonly client?: string;
  readonly animal?: string;
  readonly patientId?: string;
  readonly ownerId?: string;
  readonly includeExecuted?: boolean;
  readonly itemType?: string;
}

export interface PreventiveEmailResult {
  readonly preparedCount: number;
  readonly preparedAt: string;
}

interface PreventiveEventStore {
  create(accountId: string, input: PreventiveEventInput): Promise<PreventiveEventSummary>;
  update(eventId: string, input: PreventiveEventInput): Promise<PreventiveEventSummary>;
  getOrThrow(eventId: string): Promise<PreventiveEventSummary>;
  list(accountId: string, filters: PreventiveEventListFilters): Promise<PreventiveEventSummary[]>;
  delete(eventId: string): Promise<void>;
  execute(
    eventId: string,
    input: PreventiveEventExecuteInput
  ): Promise<{
    event: PreventiveEventSummary;
    rescheduledEvent: PreventiveEventSummary | null;
  }>;
  prepareEmail(eventId: string): Promise<PreventiveEventSummary>;
  prepareBulkEmail(
    accountId: string,
    filters: PreventiveEventListFilters
  ): Promise<PreventiveEmailResult>;
}

const preventiveItemTypes = new Set<PreventiveItemType>(['vaccine', 'dewormer', 'other']);
const preventiveStatuses = new Set<PreventiveEventStatus>(['scheduled', 'executed']);
const preventiveMaxNameLength = 160;
const preventiveMaxDescriptionLength = 255;
const preventiveMaxObservationLength = 1000;
const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

function normalizePreventiveText(
  value: string | undefined,
  field: string,
  maxLength: number
): string {
  const text = requireNonEmptyString(value, field).trim();
  if (text.length > maxLength) {
    throw new ValidationError(`${field} must have at most ${maxLength} characters`);
  }
  return text;
}

function normalizePreventiveOptionalText(
  value: string | null | undefined,
  field: string,
  maxLength: number
): string | null {
  const text = value?.trim() || null;
  if (text && text.length > maxLength) {
    throw new ValidationError(`${field} must have at most ${maxLength} characters`);
  }
  return text;
}

function normalizePreventiveOptionalId(
  value: string | null | undefined,
  field: string
): string | null {
  const text = value?.trim() || null;
  if (text && text.length > 255) {
    throw new ValidationError(`${field} must have at most 255 characters`);
  }
  return text;
}

function normalizePreventiveDate(value: string | undefined, field: string): string {
  const date = requireNonEmptyString(value, field).trim();
  const [year, month, day] = date.split('-').map(Number);
  const parsedDate = new Date(`${date}T12:00:00Z`);
  const hasValidCalendarDate =
    isoDatePattern.test(date) &&
    !Number.isNaN(parsedDate.getTime()) &&
    parsedDate.getUTCFullYear() === year &&
    parsedDate.getUTCMonth() + 1 === month &&
    parsedDate.getUTCDate() === day;

  if (!hasValidCalendarDate) {
    throw new ValidationError(`${field} must be a valid YYYY-MM-DD date`);
  }
  return date;
}

function normalizePreventiveOptionalDate(
  value: string | null | undefined,
  field: string
): string | null {
  if (!value?.trim()) return null;
  return normalizePreventiveDate(value, field);
}

function normalizePreventiveItemType(value: PreventiveItemType | undefined): PreventiveItemType {
  if (!value) return 'vaccine';
  if (!preventiveItemTypes.has(value)) {
    throw new ValidationError('itemType is invalid');
  }
  return value;
}

function normalizePreventiveStatus(
  value: PreventiveEventStatus | undefined
): PreventiveEventStatus {
  if (!value) return 'scheduled';
  if (!preventiveStatuses.has(value)) {
    throw new ValidationError('status is invalid');
  }
  return value;
}

function mapPreventiveDate(value: unknown): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function mapPreventiveTimestamp(value: unknown): string | null {
  if (!value) return null;
  return new Date(value as string | Date).toISOString();
}

function mapPreventiveEventRow(row: Record<string, unknown>): PreventiveEventSummary {
  return {
    id: row.id as string,
    accountId: row.account_id as string,
    patientId: (row.patient_id as string | null) ?? null,
    ownerId: (row.owner_id as string | null) ?? null,
    clientName: row.client_name as string,
    animalName: row.animal_name as string,
    eventDate: mapPreventiveDate(row.event_date),
    itemType: row.item_type as PreventiveItemType,
    description: row.description as string,
    status: row.status as PreventiveEventStatus,
    observation: (row.observation as string | null) ?? null,
    executedAt: mapPreventiveTimestamp(row.executed_at),
    executedObservation: (row.executed_observation as string | null) ?? null,
    rescheduledFromId: (row.rescheduled_from_id as string | null) ?? null,
    reminderEmailPreparedAt: mapPreventiveTimestamp(row.reminder_email_prepared_at),
    createdAt: new Date(row.created_at as string | Date).toISOString(),
    updatedAt: new Date(row.updated_at as string | Date).toISOString()
  };
}

function createPreventiveEventSummary(
  accountId: string,
  input: PreventiveEventInput,
  rescheduledFromId: string | null = null
): PreventiveEventSummary {
  const now = new Date().toISOString();
  return {
    id: createCorrelationId('preventive'),
    accountId,
    patientId: normalizePreventiveOptionalId(input.patientId, 'patientId'),
    ownerId: normalizePreventiveOptionalId(input.ownerId, 'ownerId'),
    clientName: normalizePreventiveText(input.clientName, 'clientName', preventiveMaxNameLength),
    animalName: normalizePreventiveText(input.animalName, 'animalName', preventiveMaxNameLength),
    eventDate: normalizePreventiveDate(input.eventDate, 'eventDate'),
    itemType: normalizePreventiveItemType(input.itemType),
    description: normalizePreventiveText(
      input.description,
      'description',
      preventiveMaxDescriptionLength
    ),
    status: normalizePreventiveStatus(input.status),
    observation: normalizePreventiveOptionalText(
      input.observation,
      'observation',
      preventiveMaxObservationLength
    ),
    executedAt: null,
    executedObservation: null,
    rescheduledFromId,
    reminderEmailPreparedAt: null,
    createdAt: now,
    updatedAt: now
  };
}

class InMemoryPreventiveEventStore implements PreventiveEventStore {
  readonly #events = new Map<string, PreventiveEventSummary>();

  async create(accountId: string, input: PreventiveEventInput): Promise<PreventiveEventSummary> {
    const event = createPreventiveEventSummary(accountId, input);
    this.#events.set(event.id, event);
    return event;
  }

  async update(eventId: string, input: PreventiveEventInput): Promise<PreventiveEventSummary> {
    const existing = await this.getOrThrow(eventId);
    const updated: PreventiveEventSummary = {
      ...existing,
      patientId:
        input.patientId !== undefined
          ? normalizePreventiveOptionalId(input.patientId, 'patientId')
          : existing.patientId,
      ownerId:
        input.ownerId !== undefined
          ? normalizePreventiveOptionalId(input.ownerId, 'ownerId')
          : existing.ownerId,
      clientName:
        input.clientName !== undefined
          ? normalizePreventiveText(input.clientName, 'clientName', preventiveMaxNameLength)
          : existing.clientName,
      animalName:
        input.animalName !== undefined
          ? normalizePreventiveText(input.animalName, 'animalName', preventiveMaxNameLength)
          : existing.animalName,
      eventDate:
        input.eventDate !== undefined
          ? normalizePreventiveDate(input.eventDate, 'eventDate')
          : existing.eventDate,
      itemType:
        input.itemType !== undefined
          ? normalizePreventiveItemType(input.itemType)
          : existing.itemType,
      description:
        input.description !== undefined
          ? normalizePreventiveText(
              input.description,
              'description',
              preventiveMaxDescriptionLength
            )
          : existing.description,
      status:
        input.status !== undefined ? normalizePreventiveStatus(input.status) : existing.status,
      observation:
        input.observation !== undefined
          ? normalizePreventiveOptionalText(
              input.observation,
              'observation',
              preventiveMaxObservationLength
            )
          : existing.observation,
      updatedAt: new Date().toISOString()
    };
    this.#events.set(updated.id, updated);
    return updated;
  }

  async getOrThrow(eventId: string): Promise<PreventiveEventSummary> {
    const event = this.#events.get(eventId);
    if (!event) {
      throw new NotFoundError('Preventive event not found', { eventId });
    }
    return event;
  }

  async list(
    accountId: string,
    filters: PreventiveEventListFilters
  ): Promise<PreventiveEventSummary[]> {
    let items = Array.from(this.#events.values()).filter((event) => event.accountId === accountId);
    items = applyPreventiveFilters(items, filters);
    return items.sort(
      (a, b) => a.eventDate.localeCompare(b.eventDate) || a.clientName.localeCompare(b.clientName)
    );
  }

  async delete(eventId: string): Promise<void> {
    this.#events.delete(eventId);
  }

  async execute(
    eventId: string,
    input: PreventiveEventExecuteInput
  ): Promise<{
    event: PreventiveEventSummary;
    rescheduledEvent: PreventiveEventSummary | null;
  }> {
    const existing = await this.getOrThrow(eventId);
    const now = new Date().toISOString();
    const event: PreventiveEventSummary = {
      ...existing,
      status: 'executed',
      executedAt: now,
      executedObservation: normalizePreventiveOptionalText(
        input.observation,
        'observation',
        preventiveMaxObservationLength
      ),
      observation:
        normalizePreventiveOptionalText(
          input.observation,
          'observation',
          preventiveMaxObservationLength
        ) ?? existing.observation,
      updatedAt: now
    };
    this.#events.set(event.id, event);

    const rescheduleTo = normalizePreventiveOptionalDate(input.rescheduleTo, 'rescheduleTo');
    if (!rescheduleTo) return { event, rescheduledEvent: null };

    const rescheduledEvent: PreventiveEventSummary = {
      ...existing,
      id: createCorrelationId('preventive'),
      eventDate: rescheduleTo,
      status: 'scheduled',
      executedAt: null,
      executedObservation: null,
      rescheduledFromId: event.id,
      reminderEmailPreparedAt: null,
      observation: 'Reagendado apos baixa.',
      createdAt: now,
      updatedAt: now
    };
    this.#events.set(rescheduledEvent.id, rescheduledEvent);
    return { event, rescheduledEvent };
  }

  async prepareEmail(eventId: string): Promise<PreventiveEventSummary> {
    const existing = await this.getOrThrow(eventId);
    const updated: PreventiveEventSummary = {
      ...existing,
      reminderEmailPreparedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.#events.set(updated.id, updated);
    return updated;
  }

  async prepareBulkEmail(
    accountId: string,
    filters: PreventiveEventListFilters
  ): Promise<PreventiveEmailResult> {
    const preparedAt = new Date().toISOString();
    const items = await this.list(accountId, filters);
    let preparedCount = 0;
    for (const item of items.filter((event) => event.status === 'scheduled')) {
      this.#events.set(item.id, {
        ...item,
        reminderEmailPreparedAt: preparedAt,
        updatedAt: preparedAt
      });
      preparedCount++;
    }
    return { preparedCount, preparedAt };
  }
}

function applyPreventiveFilters(
  items: PreventiveEventSummary[],
  filters: PreventiveEventListFilters
): PreventiveEventSummary[] {
  const client = filters.client?.trim().toLowerCase();
  const animal = filters.animal?.trim().toLowerCase();
  const dateFrom = filters.dateFrom ? normalizePreventiveDate(filters.dateFrom, 'dateFrom') : null;
  const dateTo = filters.dateTo ? normalizePreventiveDate(filters.dateTo, 'dateTo') : null;

  return items.filter((event) => {
    if (!filters.includeExecuted && event.status === 'executed') return false;
    if (dateFrom && event.eventDate < dateFrom) return false;
    if (dateTo && event.eventDate > dateTo) return false;
    if (
      filters.itemType &&
      preventiveItemTypes.has(filters.itemType as PreventiveItemType) &&
      event.itemType !== filters.itemType
    ) {
      return false;
    }
    if (filters.patientId && event.patientId !== filters.patientId) return false;
    if (filters.ownerId && event.ownerId !== filters.ownerId) return false;
    if (client && !event.clientName.toLowerCase().includes(client)) return false;
    if (animal && !event.animalName.toLowerCase().includes(animal)) return false;
    return true;
  });
}

class DatabasePreventiveEventStore implements PreventiveEventStore {
  async create(accountId: string, input: PreventiveEventInput): Promise<PreventiveEventSummary> {
    const event = createPreventiveEventSummary(accountId, input);
    return await this.insertEvent(event);
  }

  async update(eventId: string, input: PreventiveEventInput): Promise<PreventiveEventSummary> {
    const existing = await this.getOrThrow(eventId);
    const updated: PreventiveEventSummary = {
      ...existing,
      patientId:
        input.patientId !== undefined
          ? normalizePreventiveOptionalId(input.patientId, 'patientId')
          : existing.patientId,
      ownerId:
        input.ownerId !== undefined
          ? normalizePreventiveOptionalId(input.ownerId, 'ownerId')
          : existing.ownerId,
      clientName:
        input.clientName !== undefined
          ? normalizePreventiveText(input.clientName, 'clientName', preventiveMaxNameLength)
          : existing.clientName,
      animalName:
        input.animalName !== undefined
          ? normalizePreventiveText(input.animalName, 'animalName', preventiveMaxNameLength)
          : existing.animalName,
      eventDate:
        input.eventDate !== undefined
          ? normalizePreventiveDate(input.eventDate, 'eventDate')
          : existing.eventDate,
      itemType:
        input.itemType !== undefined
          ? normalizePreventiveItemType(input.itemType)
          : existing.itemType,
      description:
        input.description !== undefined
          ? normalizePreventiveText(
              input.description,
              'description',
              preventiveMaxDescriptionLength
            )
          : existing.description,
      status:
        input.status !== undefined ? normalizePreventiveStatus(input.status) : existing.status,
      observation:
        input.observation !== undefined
          ? normalizePreventiveOptionalText(
              input.observation,
              'observation',
              preventiveMaxObservationLength
            )
          : existing.observation,
      updatedAt: new Date().toISOString()
    };

    return await withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `UPDATE preventive_events
         SET client_name = $2,
             animal_name = $3,
             patient_id = $4,
             owner_id = $5,
             event_date = $6,
             item_type = $7,
             description = $8,
             status = $9,
             observation = $10,
             updated_at = $11
         WHERE id = $1
         RETURNING *`,
        [
          eventId,
          updated.clientName,
          updated.animalName,
          updated.patientId,
          updated.ownerId,
          updated.eventDate,
          updated.itemType,
          updated.description,
          updated.status,
          updated.observation,
          new Date(updated.updatedAt)
        ]
      );
      if (result.rows.length === 0) {
        throw new NotFoundError('Preventive event not found', { eventId });
      }
      return mapPreventiveEventRow(result.rows[0]);
    });
  }

  async getOrThrow(eventId: string): Promise<PreventiveEventSummary> {
    return await withTenantQuery(getPool(), async (client) => {
      const result = await client.query('SELECT * FROM preventive_events WHERE id = $1', [eventId]);
      if (result.rows.length === 0) {
        throw new NotFoundError('Preventive event not found', { eventId });
      }
      return mapPreventiveEventRow(result.rows[0]);
    });
  }

  async list(
    accountId: string,
    filters: PreventiveEventListFilters
  ): Promise<PreventiveEventSummary[]> {
    return await withTenantQuery(getPool(), async (client) => {
      let sql = 'SELECT * FROM preventive_events WHERE account_id = $1';
      const params: unknown[] = [accountId];
      let nextParam = 2;

      if (!filters.includeExecuted) {
        sql += ` AND status <> $${nextParam}`;
        params.push('executed');
        nextParam++;
      }
      if (filters.dateFrom) {
        sql += ` AND event_date >= $${nextParam}`;
        params.push(normalizePreventiveDate(filters.dateFrom, 'dateFrom'));
        nextParam++;
      }
      if (filters.dateTo) {
        sql += ` AND event_date <= $${nextParam}`;
        params.push(normalizePreventiveDate(filters.dateTo, 'dateTo'));
        nextParam++;
      }
      if (filters.itemType && preventiveItemTypes.has(filters.itemType as PreventiveItemType)) {
        sql += ` AND item_type = $${nextParam}`;
        params.push(filters.itemType);
        nextParam++;
      }
      if (filters.patientId) {
        sql += ` AND patient_id = $${nextParam}`;
        params.push(filters.patientId);
        nextParam++;
      }
      if (filters.ownerId) {
        sql += ` AND owner_id = $${nextParam}`;
        params.push(filters.ownerId);
        nextParam++;
      }
      if (filters.client) {
        sql += ` AND client_name ILIKE $${nextParam}`;
        params.push(`%${filters.client}%`);
        nextParam++;
      }
      if (filters.animal) {
        sql += ` AND animal_name ILIKE $${nextParam}`;
        params.push(`%${filters.animal}%`);
        nextParam++;
      }

      sql += ' ORDER BY event_date ASC, client_name ASC';
      const result = await client.query(sql, params);
      return result.rows.map((row: Record<string, unknown>) => mapPreventiveEventRow(row));
    });
  }

  async delete(eventId: string): Promise<void> {
    await withTenantQuery(getPool(), async (client) => {
      await client.query('DELETE FROM preventive_events WHERE id = $1', [eventId]);
    });
  }

  async execute(
    eventId: string,
    input: PreventiveEventExecuteInput
  ): Promise<{
    event: PreventiveEventSummary;
    rescheduledEvent: PreventiveEventSummary | null;
  }> {
    const existing = await this.getOrThrow(eventId);
    const executedObservation = normalizePreventiveOptionalText(
      input.observation,
      'observation',
      preventiveMaxObservationLength
    );
    const now = new Date();

    return await withTenantQuery(getPool(), async (client) => {
      await client.query('BEGIN');
      try {
        const updateResult = await client.query(
          `UPDATE preventive_events
           SET status = 'executed',
               executed_at = $2,
               executed_observation = $3,
               observation = COALESCE($3, observation),
               updated_at = $2
           WHERE id = $1
           RETURNING *`,
          [eventId, now, executedObservation]
        );
        const event = mapPreventiveEventRow(updateResult.rows[0]);

        const rescheduleTo = normalizePreventiveOptionalDate(input.rescheduleTo, 'rescheduleTo');
        if (!rescheduleTo) {
          await client.query('COMMIT');
          return { event, rescheduledEvent: null };
        }

        const rescheduledEvent = createPreventiveEventSummary(
          existing.accountId,
          {
            patientId: existing.patientId,
            ownerId: existing.ownerId,
            clientName: existing.clientName,
            animalName: existing.animalName,
            eventDate: rescheduleTo,
            itemType: existing.itemType,
            description: existing.description,
            observation: 'Reagendado apos baixa.',
            status: 'scheduled'
          },
          event.id
        );
        const insertResult = await this.insertEventWithClient(client, rescheduledEvent);
        await client.query('COMMIT');
        return { event, rescheduledEvent: insertResult };
      } catch (error) {
        await client.query('ROLLBACK');
        throw error;
      }
    });
  }

  async prepareEmail(eventId: string): Promise<PreventiveEventSummary> {
    const preparedAt = new Date();
    return await withTenantQuery(getPool(), async (client) => {
      const result = await client.query(
        `UPDATE preventive_events
         SET reminder_email_prepared_at = $2,
             updated_at = $2
         WHERE id = $1
         RETURNING *`,
        [eventId, preparedAt]
      );
      if (result.rows.length === 0) {
        throw new NotFoundError('Preventive event not found', { eventId });
      }
      return mapPreventiveEventRow(result.rows[0]);
    });
  }

  async prepareBulkEmail(
    accountId: string,
    filters: PreventiveEventListFilters
  ): Promise<PreventiveEmailResult> {
    const preparedAt = new Date();
    const items = await this.list(accountId, { ...filters, includeExecuted: false });
    if (items.length === 0) {
      return { preparedCount: 0, preparedAt: preparedAt.toISOString() };
    }

    await withTenantQuery(getPool(), async (client) => {
      await client.query(
        `UPDATE preventive_events
         SET reminder_email_prepared_at = $2,
             updated_at = $2
         WHERE account_id = $1
           AND id = ANY($3::varchar[])`,
        [accountId, preparedAt, items.map((item) => item.id)]
      );
    });

    return { preparedCount: items.length, preparedAt: preparedAt.toISOString() };
  }

  private async insertEvent(event: PreventiveEventSummary): Promise<PreventiveEventSummary> {
    return await withTenantQuery(getPool(), async (client) =>
      this.insertEventWithClient(client, event)
    );
  }

  private async insertEventWithClient(
    client: {
      query: (sql: string, params?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>;
    },
    event: PreventiveEventSummary
  ): Promise<PreventiveEventSummary> {
    const result = await client.query(
      `INSERT INTO preventive_events (
         id,
         account_id,
         patient_id,
         owner_id,
         client_name,
         animal_name,
         event_date,
         item_type,
         description,
         status,
         observation,
         executed_at,
         executed_observation,
         rescheduled_from_id,
         reminder_email_prepared_at,
         created_at,
         updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
       RETURNING *`,
      [
        event.id,
        event.accountId,
        event.patientId,
        event.ownerId,
        event.clientName,
        event.animalName,
        event.eventDate,
        event.itemType,
        event.description,
        event.status,
        event.observation,
        event.executedAt ? new Date(event.executedAt) : null,
        event.executedObservation,
        event.rescheduledFromId,
        event.reminderEmailPreparedAt ? new Date(event.reminderEmailPreparedAt) : null,
        new Date(event.createdAt),
        new Date(event.updatedAt)
      ]
    );
    return mapPreventiveEventRow(result.rows[0]);
  }
}

export function createPreventiveEventStore(options: CatalogStoreOptions = {}): PreventiveEventStore {
  if (process.env.API_DISABLE_INCOMPATIBLE_DB_REPOS === '1' && !useInMemoryFallback(options)) {
    throw new Error(
      'Preventive event database repository was disabled by API_DISABLE_INCOMPATIBLE_DB_REPOS in a production-like environment'
    );
  }

  if (process.env.API_DISABLE_INCOMPATIBLE_DB_REPOS === '1') {
    return new InMemoryPreventiveEventStore();
  }

  try {
    getPool();
    return new DatabasePreventiveEventStore();
  } catch (error) {
    if (!useInMemoryFallback(options)) {
      throwDatabaseStoreConfigurationError('Preventive event', error);
    }
    return new InMemoryPreventiveEventStore();
  }
}
