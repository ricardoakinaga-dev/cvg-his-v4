import { eq, and, or, ilike, sql } from 'drizzle-orm';
import type { DatabaseClient } from '@cvg-his-v2/shared-database';
import { owners } from '@cvg-his-v2/shared-database';
import type {
  AccountId,
  OwnerAddress,
  OwnerContact,
  OwnerFinancialProfile,
  OwnerId,
  OwnerProfile,
  OwnerSummary
} from '@cvg-his-v2/shared-types';
import { requireAccountId } from '@cvg-his-v2/tenant-context';

interface StoredOwnerMetadata {
  readonly version: 2;
  readonly contacts?: readonly OwnerContact[];
  readonly address?: OwnerAddress;
  readonly profile?: OwnerProfile;
  readonly financialProfile?: OwnerFinancialProfile;
  readonly administrativeNotes?: string;
  readonly financialResponsible?: boolean;
  readonly legacyVetusId?: string;
  readonly originalCreatedAt?: string;
  readonly status?: 'active' | 'inactive';
}

function serializeOwnerMetadata(owner: OwnerSummary): StoredOwnerMetadata | null {
  const metadata: StoredOwnerMetadata = {
    version: 2,
    contacts: owner.contacts,
    address: owner.address,
    profile: owner.profile,
    financialProfile: owner.financialProfile,
    administrativeNotes: owner.administrativeNotes,
    financialResponsible: owner.financialResponsible,
    legacyVetusId: owner.legacyVetusId,
    originalCreatedAt: owner.originalCreatedAt,
    status: owner.status
  };

  return Object.values(metadata).some((value) => value !== undefined && value !== 2) ? metadata : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

function readNumber(record: Record<string, unknown>, key: string): number | undefined {
  const value = record[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function readBoolean(record: Record<string, unknown>, key: string): boolean | undefined {
  const value = record[key];
  return typeof value === 'boolean' ? value : undefined;
}

function normalizeDigits(value: string): string {
  return value.replace(/\D/g, '');
}

function parseOwnerContact(raw: unknown, index: number): OwnerContact | null {
  if (!isRecord(raw)) return null;
  const label = readString(raw, 'label');
  const value = readString(raw, 'value');
  const type = raw.type === 'email' || raw.type === 'whatsapp' || raw.type === 'phone' ? raw.type : null;

  if (!label || !value || !type) {
    return null;
  }

  return {
    label,
    value,
    type,
    primary: readBoolean(raw, 'primary') ?? index === 0
  };
}

function parseOwnerMetadata(raw: unknown): StoredOwnerMetadata | null {
  if (!isRecord(raw)) return null;

  const addressSource = isRecord(raw.address) ? raw.address : raw;
  const profileSource = isRecord(raw.profile) ? raw.profile : null;
  const financialSource = isRecord(raw.financialProfile) ? raw.financialProfile : null;

  const address: OwnerAddress = {
    zipCode: readString(addressSource, 'zipCode'),
    street: readString(addressSource, 'street'),
    number: readString(addressSource, 'number'),
    complement: readString(addressSource, 'complement'),
    state: readString(addressSource, 'state'),
    city: readString(addressSource, 'city'),
    district: readString(addressSource, 'district'),
    reference: readString(addressSource, 'reference'),
    cityCode: readString(addressSource, 'cityCode')
  };

  const profile: OwnerProfile | undefined = profileSource
    ? {
        birthDate: readString(profileSource, 'birthDate'),
        sex:
          profileSource.sex === 'female' ||
          profileSource.sex === 'male' ||
          profileSource.sex === 'other' ||
          profileSource.sex === 'unknown'
            ? profileSource.sex
            : undefined,
        group: readString(profileSource, 'group'),
        receiveSms: readBoolean(profileSource, 'receiveSms'),
        personType:
          profileSource.personType === 'individual' || profileSource.personType === 'company'
            ? profileSource.personType
            : undefined,
        rg: readString(profileSource, 'rg')
      }
    : undefined;

  const financialProfile: OwnerFinancialProfile | undefined = financialSource
    ? {
        allowedDebtLimit: readNumber(financialSource, 'allowedDebtLimit'),
        creditBalance: readNumber(financialSource, 'creditBalance'),
        availablePoints: readNumber(financialSource, 'availablePoints'),
        blockedPoints: readNumber(financialSource, 'blockedPoints')
      }
    : undefined;
  const contacts = Array.isArray(raw.contacts)
    ? raw.contacts
        .map((contact, index) => parseOwnerContact(contact, index))
        .filter((contact): contact is OwnerContact => contact !== null)
    : undefined;

  return {
    version: 2,
    contacts: contacts && contacts.length > 0 ? contacts : undefined,
    address: Object.values(address).some((value) => value !== undefined) ? address : undefined,
    profile:
      profile && Object.values(profile).some((value) => value !== undefined) ? profile : undefined,
    financialProfile:
      financialProfile && Object.values(financialProfile).some((value) => value !== undefined)
        ? financialProfile
        : undefined,
    administrativeNotes: readString(raw, 'administrativeNotes'),
    financialResponsible: readBoolean(raw, 'financialResponsible'),
    legacyVetusId: readString(raw, 'legacyVetusId'),
    originalCreatedAt: readString(raw, 'originalCreatedAt'),
    status: raw.status === 'inactive' ? 'inactive' : raw.status === 'active' ? 'active' : undefined
  };
}

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
    requireAccountId(); // Enforce tenant context: throws if called outside runWithTenantContext
    await this.#db.insert(owners).values({
      id: owner.id,
      accountId: owner.accountId,
      document: owner.documentId ?? null,
      fullName: owner.fullName,
      email: owner.contacts.find((c) => c.type === 'email')?.value ?? null,
      phoneMain:
        owner.contacts.find((c) => c.type === 'phone' || c.type === 'whatsapp')?.value ?? null,
      phoneAlt:
        owner.contacts.find(
          (c) =>
            c.value !== owner.contacts.find((contact) => contact.type === 'phone' || contact.type === 'whatsapp')?.value &&
            (c.type === 'phone' || c.type === 'whatsapp')
        )?.value ?? null,
      addressJson: serializeOwnerMetadata(owner),
      createdAt: new Date(owner.createdAt),
      updatedAt: new Date(owner.updatedAt)
    });
  }

  public async update(owner: OwnerSummary): Promise<void> {
    requireAccountId(); // Enforce tenant context
    await this.#db
      .update(owners)
      .set({
        document: owner.documentId ?? null,
        fullName: owner.fullName,
        email: owner.contacts.find((c) => c.type === 'email')?.value ?? null,
        phoneMain:
          owner.contacts.find((c) => c.type === 'phone' || c.type === 'whatsapp')?.value ?? null,
        phoneAlt:
          owner.contacts.find(
            (c) =>
              c.value !== owner.contacts.find((contact) => contact.type === 'phone' || contact.type === 'whatsapp')?.value &&
              (c.type === 'phone' || c.type === 'whatsapp')
          )?.value ?? null,
        addressJson: serializeOwnerMetadata(owner),
        updatedAt: new Date(owner.updatedAt)
      })
      .where(eq(owners.id, owner.id));
  }

  public async findById(id: OwnerId): Promise<OwnerSummary | null> {
    requireAccountId(); // Enforce tenant context
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
    requireAccountId(); // Enforce tenant context
    let query = this.#db.select().from(owners).where(eq(owners.accountId, accountId));

    if (search) {
      const searchTerm = `%${search}%`;
      const digitSearch = normalizeDigits(search);
      const digitSearchTerm = `%${digitSearch}%`;
      query = this.#db
        .select()
        .from(owners)
        .where(
          and(
            eq(owners.accountId, accountId),
            or(
              sql`${owners.id}::text ILIKE ${searchTerm}`,
              ilike(owners.fullName, searchTerm),
              ilike(owners.document, searchTerm),
              ilike(owners.email, searchTerm),
              ilike(owners.phoneMain, searchTerm),
              ilike(owners.phoneAlt, searchTerm),
              sql`${owners.addressJson}::text ILIKE ${searchTerm}`,
              ...(digitSearch
                ? [
                    sql`regexp_replace(coalesce(${owners.document}, ''), '[^0-9]', '', 'g') LIKE ${digitSearchTerm}`,
                    sql`regexp_replace(coalesce(${owners.phoneMain}, ''), '[^0-9]', '', 'g') LIKE ${digitSearchTerm}`,
                    sql`regexp_replace(coalesce(${owners.phoneAlt}, ''), '[^0-9]', '', 'g') LIKE ${digitSearchTerm}`,
                    sql`regexp_replace(coalesce(${owners.addressJson}::text, ''), '[^0-9]', '', 'g') LIKE ${digitSearchTerm}`
                  ]
                : [])
            )
          )
        );
    }

    const result = await query;
    return result.map((row) => this.mapRowToOwner(row));
  }

  public async delete(id: OwnerId): Promise<void> {
    requireAccountId(); // Enforce tenant context
    await this.#db.delete(owners).where(eq(owners.id, id));
  }

  private mapRowToOwner(row: typeof owners.$inferSelect): OwnerSummary {
    const metadata = parseOwnerMetadata(row.addressJson);
    const contacts: Array<OwnerContact> = metadata?.contacts ? [...metadata.contacts] : [];
    if (contacts.length === 0) {
      if (row.phoneMain) {
        contacts.push({
          label: 'Telefone',
          value: row.phoneMain,
          type: 'phone',
          primary: true
        });
      }
      if (row.email) {
        contacts.push({
          label: 'Email',
          value: row.email,
          type: 'email',
          primary: !row.phoneMain
        });
      }
      if (row.phoneAlt) {
        contacts.push({
          label: 'Telefone 2',
          value: row.phoneAlt,
          type: 'phone',
          primary: false
        });
      }
    }

    return {
      id: row.id as OwnerId,
      accountId: row.accountId as AccountId,
      fullName: row.fullName,
      documentId: row.document ?? undefined,
      contacts,
      address: metadata?.address,
      profile: metadata?.profile,
      financialProfile: metadata?.financialProfile,
      financialResponsible: metadata?.financialResponsible ?? true,
      administrativeNotes: metadata?.administrativeNotes,
      legacyVetusId: metadata?.legacyVetusId,
      originalCreatedAt: metadata?.originalCreatedAt,
      status: metadata?.status ?? 'active',
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString()
    };
  }
}
