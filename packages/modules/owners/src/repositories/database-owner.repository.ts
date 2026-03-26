import { eq, and, or, ilike } from 'drizzle-orm';
import type { DatabaseClient } from '@cvg-his-v2/shared-database';
import { owners } from '@cvg-his-v2/shared-database';
import type { AccountId, OwnerContact, OwnerId, OwnerSummary } from '@cvg-his-v2/shared-types';

export interface OwnerRepository {
  create(owner: OwnerSummary): Promise<void>;
  update(owner: OwnerSummary): Promise<void>;
  findById(id: OwnerId): Promise<OwnerSummary | null>;
  findByAccountId(accountId: AccountId, search?: string): Promise<readonly OwnerSummary[]>;
  delete(id: OwnerId): Promise<void>;
}

export class DatabaseOwnerRepository implements OwnerRepository {
  readonly #db: DatabaseClient;

  public constructor(db: DatabaseClient) {
    this.#db = db;
  }

  public async create(owner: OwnerSummary): Promise<void> {
    await this.#db.insert(owners).values({
      id: owner.id,
      accountId: owner.accountId,
      documentType: owner.documentId ? 'cpf' : null,
      documentNumber: owner.documentId ?? null,
      name: owner.fullName,
      email: owner.contacts.find((c) => c.type === 'email')?.value ?? null,
      phone: owner.contacts.find((c) => c.type === 'phone' || c.type === 'whatsapp')?.value ?? null,
      address: null,
      status: owner.status,
      createdAt: new Date(owner.createdAt),
      updatedAt: new Date(owner.updatedAt)
    });
  }

  public async update(owner: OwnerSummary): Promise<void> {
    await this.#db
      .update(owners)
      .set({
        documentType: owner.documentId ? 'cpf' : null,
        documentNumber: owner.documentId ?? null,
        name: owner.fullName,
        email: owner.contacts.find((c) => c.type === 'email')?.value ?? null,
        phone:
          owner.contacts.find((c) => c.type === 'phone' || c.type === 'whatsapp')?.value ?? null,
        status: owner.status,
        updatedAt: new Date(owner.updatedAt)
      })
      .where(eq(owners.id, owner.id));
  }

  public async findById(id: OwnerId): Promise<OwnerSummary | null> {
    const result = await this.#db.select().from(owners).where(eq(owners.id, id)).limit(1);

    if (result.length === 0) {
      return null;
    }

    const row = result[0];
    return this.mapRowToOwner(row);
  }

  public async findByAccountId(
    accountId: AccountId,
    search?: string
  ): Promise<readonly OwnerSummary[]> {
    let query = this.#db.select().from(owners).where(eq(owners.accountId, accountId));

    if (search) {
      const searchTerm = `%${search}%`;
      query = this.#db
        .select()
        .from(owners)
        .where(
          and(
            eq(owners.accountId, accountId),
            or(
              ilike(owners.name, searchTerm),
              ilike(owners.documentNumber, searchTerm),
              ilike(owners.email, searchTerm),
              ilike(owners.phone, searchTerm)
            )
          )
        );
    }

    const result = await query;
    return result.map((row) => this.mapRowToOwner(row));
  }

  public async delete(id: OwnerId): Promise<void> {
    await this.#db.delete(owners).where(eq(owners.id, id));
  }

  private mapRowToOwner(row: typeof owners.$inferSelect): OwnerSummary {
    const contacts: Array<OwnerContact> = [];
    if (row.phone) {
      contacts.push({
        label: 'Telefone',
        value: row.phone,
        type: 'phone',
        primary: true
      });
    }
    if (row.email) {
      contacts.push({
        label: 'Email',
        value: row.email,
        type: 'email',
        primary: !row.phone
      });
    }

    return {
      id: row.id as OwnerId,
      accountId: row.accountId as AccountId,
      fullName: row.name,
      documentId: row.documentNumber ?? undefined,
      contacts,
      financialResponsible: true,
      administrativeNotes: undefined,
      status: row.status as 'active' | 'inactive',
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString()
    };
  }
}
