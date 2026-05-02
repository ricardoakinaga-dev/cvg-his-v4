import type { AccountId, OwnerId, OwnerSummary } from '@cvg-his-v2/shared-types';

function normalizeDigits(value: string): string {
  return value.replace(/\D/g, '');
}

function matchesSearch(value: unknown, search: string): boolean {
  if (typeof value === 'string') {
    const normalizedSearch = search.toLowerCase();
    const searchDigits = normalizeDigits(search);
    return (
      value.toLowerCase().includes(normalizedSearch) ||
      (searchDigits.length > 0 && normalizeDigits(value).includes(searchDigits))
    );
  }

  if (Array.isArray(value)) {
    return value.some((item) => matchesSearch(item, search));
  }

  if (value && typeof value === 'object') {
    return Object.values(value).some((item) => matchesSearch(item, search));
  }

  return false;
}

export interface OwnerRepository {
  create(owner: OwnerSummary): Promise<void>;
  update(owner: OwnerSummary): Promise<void>;
  findById(id: OwnerId): Promise<OwnerSummary | null>;
  findByAccountId(accountId: AccountId, search?: string): Promise<readonly OwnerSummary[]>;
  delete(id: OwnerId): Promise<void>;
}

export class InMemoryOwnerRepository implements OwnerRepository {
  readonly #owners = new Map<OwnerId, OwnerSummary>();

  async create(owner: OwnerSummary): Promise<void> {
    this.#owners.set(owner.id, owner);
  }

  async update(owner: OwnerSummary): Promise<void> {
    if (!this.#owners.has(owner.id)) {
      throw new Error(`Owner not found: ${owner.id}`);
    }
    this.#owners.set(owner.id, owner);
  }

  async findById(id: OwnerId): Promise<OwnerSummary | null> {
    return this.#owners.get(id) ?? null;
  }

  async findByAccountId(accountId: AccountId, search?: string): Promise<readonly OwnerSummary[]> {
    return Array.from(this.#owners.values())
      .filter((o) => o.accountId === accountId)
      .filter(
        (o) =>
          !search ||
          matchesSearch(o.id, search) ||
          matchesSearch(o.fullName, search) ||
          matchesSearch(o.documentId, search) ||
          matchesSearch(o.contacts.map((contact) => contact.value), search) ||
          matchesSearch(o.legacyVetusId, search) ||
          matchesSearch(o.profile, search) ||
          matchesSearch(o.address, search)
      );
  }

  async delete(id: OwnerId): Promise<void> {
    this.#owners.delete(id);
  }

  // Helper for testing
  clear(): void {
    this.#owners.clear();
  }

  getAll(): readonly OwnerSummary[] {
    return Array.from(this.#owners.values());
  }
}
