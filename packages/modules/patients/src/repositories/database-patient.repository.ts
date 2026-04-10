import { eq, ilike, or, and } from 'drizzle-orm';
import type { DatabaseClient } from '@cvg-his-v2/shared-database';
import { patients, ownerPatientLinks } from '@cvg-his-v2/shared-database';
import type {
  AccountId,
  OwnerId,
  PatientId,
  PatientSummary,
  OwnerPatientLinkId,
  OwnerPatientLinkSummary
} from '@cvg-his-v2/shared-types';

export interface PatientRepository {
  create(patient: PatientSummary): Promise<void>;
  update(patient: PatientSummary): Promise<void>;
  findById(id: PatientId): Promise<PatientSummary | null>;
  findByAccountId(accountId: AccountId, search?: string): Promise<readonly PatientSummary[]>;
  delete(id: PatientId): Promise<void>;
}

export interface OwnerPatientLinkRepository {
  create(link: OwnerPatientLinkSummary): Promise<void>;
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

export class DatabasePatientRepository implements PatientRepository {
  readonly #db: DatabaseClient;

  public constructor(db: DatabaseClient) {
    this.#db = db;
  }

  public async create(patient: PatientSummary): Promise<void> {
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
      alertsJson: {},
      createdAt: new Date(patient.createdAt),
      updatedAt: new Date(patient.updatedAt)
    });
  }

  public async update(patient: PatientSummary): Promise<void> {
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
        updatedAt: new Date(patient.updatedAt)
      })
      .where(eq(patients.id, patient.id));
  }

  public async findById(id: PatientId): Promise<PatientSummary | null> {
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
    let result;
    if (search) {
      const searchTerm = `%${search}%`;
      result = await this.#db
        .select()
        .from(patients)
        .where(
          and(
            eq(patients.accountId, accountId),
            or(
              ilike(patients.name, searchTerm),
              ilike(patients.species, searchTerm),
              ilike(patients.breed, searchTerm)
            )
          )
        );
    } else {
      result = await this.#db.select().from(patients).where(eq(patients.accountId, accountId));
    }
    return result.map((row) => this.mapRowToPatient(row));
  }

  public async delete(id: PatientId): Promise<void> {
    await this.#db.delete(patients).where(eq(patients.id, id));
  }

  private mapRowToPatient(row: typeof patients.$inferSelect): PatientSummary {
    return {
      id: row.id as PatientId,
      accountId: row.accountId as AccountId,
      name: row.name,
      species: row.species ?? 'unknown',
      breed: row.breed ?? undefined,
      sex: (row.sex ?? 'unknown') as 'male' | 'female' | 'unknown',
      size: undefined,
      baseWeightKg: row.weightKg ? parseFloat(row.weightKg) : undefined,
      birthDateApproximate: row.birthDate ?? undefined,
      primaryOwnerId: row.ownerId as OwnerId,
      status: 'active',
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
    await this.#db.insert(ownerPatientLinks).values({
      id: link.id,
      ownerId: link.ownerId,
      patientId: link.patientId,
      relationship: link.relationshipType,
      isPrimary: link.relationshipType === 'primary',
      createdAt: new Date(link.createdAt)
    });
  }

  public async findById(
    id: OwnerPatientLinkId,
    accountId: AccountId
  ): Promise<OwnerPatientLinkSummary | null> {
    const result = await this.#db
      .select()
      .from(ownerPatientLinks)
      .where(eq(ownerPatientLinks.id, id))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    const row = result[0];
    return this.mapRowToLink(row, accountId);
  }

  public async findByPatientId(
    patientId: PatientId,
    accountId: AccountId
  ): Promise<readonly OwnerPatientLinkSummary[]> {
    const result = await this.#db
      .select()
      .from(ownerPatientLinks)
      .where(eq(ownerPatientLinks.patientId, patientId));

    return result.map((row) => this.mapRowToLink(row, accountId));
  }

  public async findByOwnerId(
    ownerId: OwnerId,
    accountId: AccountId
  ): Promise<readonly OwnerPatientLinkSummary[]> {
    const result = await this.#db
      .select()
      .from(ownerPatientLinks)
      .where(eq(ownerPatientLinks.ownerId, ownerId));

    return result.map((row) => this.mapRowToLink(row, accountId));
  }

  public async delete(id: OwnerPatientLinkId): Promise<void> {
    await this.#db.delete(ownerPatientLinks).where(eq(ownerPatientLinks.id, id));
  }

  private mapRowToLink(
    row: typeof ownerPatientLinks.$inferSelect,
    accountId: AccountId
  ): OwnerPatientLinkSummary {
    const relType = row.relationship ?? 'primary';
    return {
      id: row.id as OwnerPatientLinkId,
      accountId,
      ownerId: row.ownerId as OwnerId,
      patientId: row.patientId as PatientId,
      relationshipType:
        relType === 'primary' || relType === 'secondary' || relType === 'financial'
          ? relType
          : ('primary' as 'primary' | 'secondary' | 'financial'),
      financialResponsible: row.isPrimary,
      createdAt: row.createdAt.toISOString()
    };
  }
}
