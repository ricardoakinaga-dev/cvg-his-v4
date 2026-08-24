import { eq, ilike, or, and, sql } from 'drizzle-orm';
import type { DatabaseClient } from '@cvg-his-v2/shared-database';
import { patients, ownerPatientLinks, patientMerges } from '@cvg-his-v2/shared-database';
import type {
  AccountId,
  OwnerId,
  PatientId,
  PatientSummary,
  OwnerPatientLinkId,
  OwnerPatientLinkSummary,
  PatientMergeSummary
} from '@cvg-his-v2/shared-types';
import { requireAccountId } from '@cvg-his-v2/tenant-context';

export interface PatientRepository {
  create(patient: PatientSummary): Promise<void>;
  update(patient: PatientSummary): Promise<void>;
  findById(id: PatientId): Promise<PatientSummary | null>;
  findByAccountId(accountId: AccountId, search?: string): Promise<readonly PatientSummary[]>;
  delete(id: PatientId): Promise<void>;
}

export interface OwnerPatientLinkRepository {
  create(link: OwnerPatientLinkSummary): Promise<void>;
  update?(link: OwnerPatientLinkSummary): Promise<void>;
  findById(id: OwnerPatientLinkId, accountId: AccountId): Promise<OwnerPatientLinkSummary | null>;
  findByPatientId(
    patientId: PatientId,
    accountId: AccountId
  ): Promise<readonly OwnerPatientLinkSummary[]>;
  findByOwnerId(
    ownerId: OwnerId,
    accountId: AccountId
  ): Promise<readonly OwnerPatientLinkSummary[]>;
  delete(id: OwnerPatientLinkId): Promise<void>;
}

export interface PatientMergeRepository {
  create(merge: PatientMergeSummary): Promise<void>;
}

interface StoredPatientMetadata {
  readonly version: 2;
  readonly size?: PatientSummary['size'];
  readonly status?: PatientSummary['status'];
  readonly isNeutered?: boolean;
  readonly pedigreeNumber?: string;
  readonly color?: string;
  readonly chronicDisease?: string;
  readonly allergy?: string;
  readonly temperament?: string;
  readonly generalNotes?: string;
  readonly legacyVetusId?: string;
  readonly originalCreatedAt?: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

function readBoolean(record: Record<string, unknown>, key: string): boolean | undefined {
  return typeof record[key] === 'boolean' ? record[key] : undefined;
}

function normalizeDigits(value: string): string {
  return value.replace(/\D/g, '');
}

function serializePatientMetadata(patient: PatientSummary): StoredPatientMetadata {
  return {
    version: 2,
    size: patient.size,
    status: patient.status,
    isNeutered: patient.isNeutered,
    pedigreeNumber: patient.pedigreeNumber,
    color: patient.color,
    chronicDisease: patient.chronicDisease,
    allergy: patient.allergy,
    temperament: patient.temperament,
    generalNotes: patient.generalNotes,
    legacyVetusId: patient.legacyVetusId,
    originalCreatedAt: patient.originalCreatedAt
  };
}

function parsePatientMetadata(raw: unknown): StoredPatientMetadata {
  if (!isRecord(raw)) {
    return { version: 2 };
  }

  const size = readString(raw, 'size');
  const status = readString(raw, 'status');

  return {
    version: 2,
    size: size === 'small' || size === 'medium' || size === 'large' ? size : undefined,
    status:
      status === 'active' || status === 'inactive' || status === 'deceased' ? status : undefined,
    isNeutered: readBoolean(raw, 'isNeutered'),
    pedigreeNumber: readString(raw, 'pedigreeNumber'),
    color: readString(raw, 'color'),
    chronicDisease: readString(raw, 'chronicDisease'),
    allergy: readString(raw, 'allergy'),
    temperament: readString(raw, 'temperament'),
    generalNotes: readString(raw, 'generalNotes'),
    legacyVetusId: readString(raw, 'legacyVetusId'),
    originalCreatedAt: readString(raw, 'originalCreatedAt')
  };
}

export class DatabasePatientRepository implements PatientRepository {
  readonly #db: DatabaseClient;

  public constructor(db: DatabaseClient) {
    this.#db = db;
  }

  public async create(patient: PatientSummary): Promise<void> {
    requireAccountId(); // Enforce tenant context
    await this.#db.insert(patients).values({
      id: patient.id,
      accountId: patient.accountId,
      ownerId: patient.primaryOwnerId,
      name: patient.name,
      species: patient.species,
      breed: patient.breed ?? null,
      sex: patient.sex ?? null,
      birthDate: patient.birthDateApproximate ?? null,
      weightKg: patient.baseWeightKg?.toString() ?? null,
      microchip: patient.microchip ?? null,
      alertsJson: serializePatientMetadata(patient),
      createdAt: new Date(patient.createdAt),
      updatedAt: new Date(patient.updatedAt)
    });
  }

  public async update(patient: PatientSummary): Promise<void> {
    requireAccountId(); // Enforce tenant context
    await this.#db
      .update(patients)
      .set({
        ownerId: patient.primaryOwnerId,
        name: patient.name,
        species: patient.species,
        breed: patient.breed ?? null,
        sex: patient.sex ?? null,
        birthDate: patient.birthDateApproximate ?? null,
        weightKg: patient.baseWeightKg?.toString() ?? null,
        microchip: patient.microchip ?? null,
        alertsJson: serializePatientMetadata(patient),
        updatedAt: new Date(patient.updatedAt)
      })
      .where(eq(patients.id, patient.id));
  }

  public async findById(id: PatientId): Promise<PatientSummary | null> {
    requireAccountId(); // Enforce tenant context
    const result = await this.#db.select().from(patients).where(eq(patients.id, id)).limit(1);

    if (result.length === 0) {
      return null;
    }

    const row = result[0];
    return this.mapRowToPatient(row);
  }

  public async findByAccountId(
    accountId: AccountId,
    search?: string
  ): Promise<readonly PatientSummary[]> {
    requireAccountId(); // Enforce tenant context
    let result;
    if (search) {
      const searchTerm = `%${search}%`;
      const digitSearch = normalizeDigits(search);
      const digitSearchTerm = `%${digitSearch}%`;
      result = await this.#db
        .select()
        .from(patients)
        .where(
          and(
            eq(patients.accountId, accountId),
            or(
              sql`${patients.id}::text ILIKE ${searchTerm}`,
              ilike(patients.name, searchTerm),
              ilike(patients.species, searchTerm),
              ilike(patients.breed, searchTerm),
              ilike(patients.microchip, searchTerm),
              sql`${patients.alertsJson}::text ILIKE ${searchTerm}`,
              sql`EXISTS (
                SELECT 1 FROM owners owner_search
                WHERE owner_search.id = ${patients.ownerId}
                  AND owner_search.account_id = ${accountId}
                  AND (
                    owner_search.id::text ILIKE ${searchTerm}
                    OR owner_search.full_name ILIKE ${searchTerm}
                    OR owner_search.document ILIKE ${searchTerm}
                    OR owner_search.email ILIKE ${searchTerm}
                    OR owner_search.phone_main ILIKE ${searchTerm}
                    OR owner_search.phone_alt ILIKE ${searchTerm}
                    OR owner_search.address_json::text ILIKE ${searchTerm}
                    ${
                      digitSearch
                        ? sql`OR regexp_replace(coalesce(owner_search.document, ''), '[^0-9]', '', 'g') LIKE ${digitSearchTerm}
                            OR regexp_replace(coalesce(owner_search.phone_main, ''), '[^0-9]', '', 'g') LIKE ${digitSearchTerm}
                            OR regexp_replace(coalesce(owner_search.phone_alt, ''), '[^0-9]', '', 'g') LIKE ${digitSearchTerm}
                            OR regexp_replace(coalesce(owner_search.address_json::text, ''), '[^0-9]', '', 'g') LIKE ${digitSearchTerm}`
                        : sql``
                    }
                  )
              )`,
              ...(digitSearch
                ? [
                    sql`regexp_replace(${patients.id}::text, '[^0-9]', '', 'g') LIKE ${digitSearchTerm}`,
                    sql`regexp_replace(coalesce(${patients.microchip}, ''), '[^0-9]', '', 'g') LIKE ${digitSearchTerm}`,
                    sql`regexp_replace(coalesce(${patients.alertsJson}::text, ''), '[^0-9]', '', 'g') LIKE ${digitSearchTerm}`
                  ]
                : [])
            )
          )
        );
    } else {
      result = await this.#db.select().from(patients).where(eq(patients.accountId, accountId));
    }
    return result.map((row) => this.mapRowToPatient(row));
  }

  public async delete(id: PatientId): Promise<void> {
    requireAccountId(); // Enforce tenant context
    await this.#db.delete(patients).where(eq(patients.id, id));
  }

  private mapRowToPatient(row: typeof patients.$inferSelect): PatientSummary {
    const metadata = parsePatientMetadata(row.alertsJson);

    return {
      id: row.id as PatientId,
      accountId: row.accountId as AccountId,
      name: row.name,
      species: row.species ?? 'unknown',
      breed: row.breed ?? undefined,
      sex: (row.sex ?? 'unknown') as 'male' | 'female' | 'unknown',
      size: metadata.size,
      baseWeightKg: row.weightKg ? parseFloat(row.weightKg) : undefined,
      birthDateApproximate: row.birthDate ?? undefined,
      isNeutered: metadata.isNeutered,
      microchip: row.microchip ?? undefined,
      pedigreeNumber: metadata.pedigreeNumber,
      color: metadata.color,
      chronicDisease: metadata.chronicDisease,
      allergy: metadata.allergy,
      temperament: metadata.temperament,
      generalNotes: metadata.generalNotes,
      legacyVetusId: metadata.legacyVetusId,
      originalCreatedAt: metadata.originalCreatedAt,
      primaryOwnerId: row.ownerId as OwnerId,
      status: metadata.status ?? 'active',
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString()
    };
  }
}

export class DatabaseOwnerPatientLinkRepository implements OwnerPatientLinkRepository {
  readonly #db: DatabaseClient;

  public constructor(db: DatabaseClient) {
    this.#db = db;
  }

  public async create(link: OwnerPatientLinkSummary): Promise<void> {
    const accountId = requireAccountId();
    if (link.accountId !== accountId) {
      throw new Error('Owner-patient link account does not match tenant context');
    }
    await this.#db.insert(ownerPatientLinks).values({
      id: link.id,
      accountId: link.accountId,
      ownerId: link.ownerId,
      patientId: link.patientId,
      relationship: link.relationshipType,
      isPrimary: link.relationshipType === 'primary',
      financialResponsible: link.financialResponsible,
      createdAt: new Date(link.createdAt)
    });
  }

  public async findById(
    id: OwnerPatientLinkId,
    accountId: AccountId
  ): Promise<OwnerPatientLinkSummary | null> {
    if (requireAccountId() !== accountId) return null;
    const result = await this.#db
      .select()
      .from(ownerPatientLinks)
      .where(and(eq(ownerPatientLinks.id, id), eq(ownerPatientLinks.accountId, accountId)))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    const row = result[0];
    return this.mapRowToLink(row);
  }

  public async findByPatientId(
    patientId: PatientId,
    accountId: AccountId
  ): Promise<readonly OwnerPatientLinkSummary[]> {
    if (requireAccountId() !== accountId) return [];
    const result = await this.#db
      .select()
      .from(ownerPatientLinks)
      .where(
        and(eq(ownerPatientLinks.patientId, patientId), eq(ownerPatientLinks.accountId, accountId))
      );

    return result.map((row) => this.mapRowToLink(row));
  }

  public async findByOwnerId(
    ownerId: OwnerId,
    accountId: AccountId
  ): Promise<readonly OwnerPatientLinkSummary[]> {
    if (requireAccountId() !== accountId) return [];
    const result = await this.#db
      .select()
      .from(ownerPatientLinks)
      .where(
        and(eq(ownerPatientLinks.ownerId, ownerId), eq(ownerPatientLinks.accountId, accountId))
      );

    return result.map((row) => this.mapRowToLink(row));
  }

  public async delete(id: OwnerPatientLinkId): Promise<void> {
    const accountId = requireAccountId();
    await this.#db
      .delete(ownerPatientLinks)
      .where(and(eq(ownerPatientLinks.id, id), eq(ownerPatientLinks.accountId, accountId)));
  }

  public async update(link: OwnerPatientLinkSummary): Promise<void> {
    const accountId = requireAccountId();
    await this.#db
      .update(ownerPatientLinks)
      .set({
        financialResponsible: link.financialResponsible,
        patientId: link.patientId,
        ownerId: link.ownerId,
        relationship: link.relationshipType,
        isPrimary: link.relationshipType === 'primary'
      })
      .where(and(eq(ownerPatientLinks.id, link.id), eq(ownerPatientLinks.accountId, accountId)));
  }

  private mapRowToLink(row: typeof ownerPatientLinks.$inferSelect): OwnerPatientLinkSummary {
    const relType = (row.relationship ?? 'primary') as
      | 'primary'
      | 'secondary'
      | 'financial'
      | 'authorized'
      | 'spouse';
    return {
      id: row.id as OwnerPatientLinkId,
      accountId: row.accountId as AccountId,
      ownerId: row.ownerId as OwnerId,
      patientId: row.patientId as PatientId,
      relationshipType:
        relType === 'primary'
          || relType === 'secondary'
          || relType === 'financial'
          || relType === 'authorized'
          || relType === 'spouse'
          ? relType
          : ('primary' as 'primary' | 'secondary' | 'financial' | 'authorized' | 'spouse'),
      financialResponsible: row.financialResponsible,
      createdAt: row.createdAt.toISOString()
    };
  }
}

export class DatabasePatientMergeRepository implements PatientMergeRepository {
  readonly #db: DatabaseClient;

  public constructor(db: DatabaseClient) {
    this.#db = db;
  }

  public async create(merge: PatientMergeSummary): Promise<void> {
    const accountId = requireAccountId();
    if (accountId !== merge.accountId) throw new Error('Patient merge account does not match tenant context');
    await this.#db.insert(patientMerges).values({
      id: merge.id,
      accountId: merge.accountId,
      sourcePatientId: merge.sourcePatientId,
      targetPatientId: merge.targetPatientId,
      mergedByUserId: merge.mergedByUserId,
      reason: merge.reason,
      createdAt: new Date(merge.createdAt)
    });
  }
}
