import { randomUUID } from 'node:crypto';
import { NotFoundError } from '@cvg-his-v2/shared-errors';
import type { AccountId } from '@cvg-his-v2/shared-types';
import { createCorrelationId, nowIso } from '@cvg-his-v2/shared-utils';
import type {
  ProductsRepository,
  ProductRecord
} from './repositories/database-products.repository.js';

export interface ProductSummary {
  readonly id: string;
  readonly accountId: AccountId;
  readonly name: string;
  readonly code: string | null;
  readonly description: string | null;
  readonly basePrice: number;
  readonly active: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface ProductsServiceOptions {
  readonly repository?: ProductsRepository;
}

export class ProductsService {
  readonly #repository?: ProductsRepository;
  readonly #useUuidIdentifiers: boolean;
  readonly #products = new Map<string, ProductSummary>();

  public constructor(options?: ProductsServiceOptions) {
    this.#repository = options?.repository;
    this.#useUuidIdentifiers = Boolean(options?.repository);
  }

  #nextId(prefix: string): string {
    return this.#useUuidIdentifiers ? randomUUID() : createCorrelationId(prefix);
  }

  public get persistenceMode(): 'database' | 'in-memory' {
    return this.#repository ? 'database' : 'in-memory';
  }

  public async hydrateFromDatabase(accountId: AccountId): Promise<void> {
    if (!this.#repository) return;
    const products = await this.#repository.findByAccountId(accountId);
    for (const product of products) {
      this.#products.set(product.id, product);
    }
  }

  async create(
    accountId: AccountId,
    input: {
      name: string;
      code?: string | null;
      description?: string | null;
      basePrice: number;
      active?: boolean;
    }
  ): Promise<ProductSummary> {
    const now = nowIso();
    const product: ProductSummary = {
      id: this.#nextId('prod'),
      accountId,
      name: input.name.trim(),
      code: input.code?.trim() ?? null,
      description: input.description?.trim() ?? null,
      basePrice: Math.round(input.basePrice * 100) / 100,
      active: input.active ?? true,
      createdAt: now,
      updatedAt: now
    };

    this.#products.set(product.id, product);

    if (this.#repository) {
      const record: ProductRecord = product;
      await this.#repository.create(record);
    }

    return product;
  }

  async update(
    id: string,
    input: {
      name?: string;
      code?: string | null;
      description?: string | null;
      basePrice?: number;
      active?: boolean;
    }
  ): Promise<ProductSummary> {
    const existing = this.#products.get(id);
    if (!existing) {
      throw new NotFoundError('Product not found', { id });
    }

    const updated: ProductSummary = {
      ...existing,
      name: input.name?.trim() ?? existing.name,
      code: input.code !== undefined ? (input.code?.trim() ?? null) : existing.code,
      description:
        input.description !== undefined
          ? (input.description?.trim() ?? null)
          : existing.description,
      basePrice:
        input.basePrice !== undefined
          ? Math.round(input.basePrice * 100) / 100
          : existing.basePrice,
      active: input.active ?? existing.active,
      updatedAt: nowIso()
    };

    this.#products.set(updated.id, updated);

    if (this.#repository) {
      const record: ProductRecord = updated;
      await this.#repository.update(record);
    }

    return updated;
  }

  findById(id: string): ProductSummary | undefined {
    return this.#products.get(id);
  }

  getOrThrow(id: string): ProductSummary {
    const product = this.#products.get(id);
    if (!product) {
      throw new NotFoundError('Product not found', { id });
    }
    return product;
  }

  list(accountId: AccountId, filters?: { search?: string; active?: boolean }): ProductSummary[] {
    let items = Array.from(this.#products.values()).filter((p) => p.accountId === accountId);

    if (filters?.active !== undefined) {
      items = items.filter((p) => p.active === filters.active);
    }

    if (filters?.search) {
      const search = filters.search.toLowerCase();
      items = items.filter(
        (p) =>
          p.name.toLowerCase().includes(search) || (p.code?.toLowerCase().includes(search) ?? false)
      );
    }

    return items.sort((a, b) => a.name.localeCompare(b.name));
  }
}

export {
  DatabaseProductsRepository,
  type ProductsRepository,
  type ProductRecord
} from './repositories/database-products.repository.js';
