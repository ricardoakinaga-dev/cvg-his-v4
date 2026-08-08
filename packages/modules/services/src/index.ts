import { randomUUID } from 'node:crypto';
import { NotFoundError } from '@cvg-his-v2/shared-errors';
import type { AccountId } from '@cvg-his-v2/shared-types';
import { createCorrelationId, nowIso } from '@cvg-his-v2/shared-utils';
import type {
  ServicesRepository,
  ServiceRecord
} from './repositories/database-services.repository.js';

export interface ServiceSummary {
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

export interface ServicesServiceOptions {
  readonly repository?: ServicesRepository;
}

export class ServicesService {
  readonly #repository?: ServicesRepository;
  readonly #useUuidIdentifiers: boolean;
  readonly #services = new Map<string, ServiceSummary>();

  public constructor(options?: ServicesServiceOptions) {
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
    const services = await this.#repository.findByAccountId(accountId);
    for (const service of services) {
      this.#services.set(service.id, service);
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
  ): Promise<ServiceSummary> {
    const now = nowIso();
    const service: ServiceSummary = {
      id: this.#nextId('svc'),
      accountId,
      name: input.name.trim(),
      code: input.code?.trim() ?? null,
      description: input.description?.trim() ?? null,
      basePrice: Math.round(input.basePrice * 100) / 100,
      active: input.active ?? true,
      createdAt: now,
      updatedAt: now
    };

    this.#services.set(service.id, service);

    if (this.#repository) {
      const record: ServiceRecord = service;
      await this.#repository.create(record);
    }

    return service;
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
  ): Promise<ServiceSummary> {
    const existing = this.#services.get(id);
    if (!existing) {
      throw new NotFoundError('Service not found', { id });
    }

    const updated: ServiceSummary = {
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

    this.#services.set(updated.id, updated);

    if (this.#repository) {
      const record: ServiceRecord = updated;
      await this.#repository.update(record);
    }

    return updated;
  }

  findById(id: string): ServiceSummary | undefined {
    return this.#services.get(id);
  }

  getOrThrow(id: string): ServiceSummary {
    const service = this.#services.get(id);
    if (!service) {
      throw new NotFoundError('Service not found', { id });
    }
    return service;
  }

  list(accountId: AccountId, filters?: { search?: string; active?: boolean }): ServiceSummary[] {
    let items = Array.from(this.#services.values()).filter((s) => s.accountId === accountId);

    if (filters?.active !== undefined) {
      items = items.filter((s) => s.active === filters.active);
    }

    if (filters?.search) {
      const search = filters.search.toLowerCase();
      items = items.filter(
        (s) =>
          s.name.toLowerCase().includes(search) || (s.code?.toLowerCase().includes(search) ?? false)
      );
    }

    return items.sort((a, b) => a.name.localeCompare(b.name));
  }
}

export {
  DatabaseServicesRepository,
  type ServicesRepository,
  type ServiceRecord
} from './repositories/database-services.repository.js';
