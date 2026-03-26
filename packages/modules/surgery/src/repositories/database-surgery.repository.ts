import { eq } from 'drizzle-orm';
import type { DatabaseClient } from '@cvg-his-v2/shared-database';
import { surgeryCases } from '@cvg-his-v2/shared-database';
import type {
  AccountId,
  PatientId,
  SurgeryCaseId,
  SurgeryCaseSummary,
  EncounterId
} from '@cvg-his-v2/shared-types';

export interface SurgeryCaseRepository {
  create(surgeryCase: SurgeryCaseSummary): Promise<void>;
  update(surgeryCase: SurgeryCaseSummary): Promise<void>;
  findById(id: SurgeryCaseId): Promise<SurgeryCaseSummary | null>;
  findByEncounterId(encounterId: EncounterId): Promise<readonly SurgeryCaseSummary[]>;
}

export class DatabaseSurgeryCaseRepository implements SurgeryCaseRepository {
  readonly #db: DatabaseClient;

  public constructor(db: DatabaseClient) {
    this.#db = db;
  }

  public async create(surgeryCase: SurgeryCaseSummary): Promise<void> {
    await this.#db.insert(surgeryCases).values({
      id: surgeryCase.id,
      accountId: surgeryCase.accountId,
      encounterId: surgeryCase.encounterId,
      patientId: surgeryCase.patientId,
      procedureName: surgeryCase.procedureName,
      status: surgeryCase.status,
      surgeonUserId: surgeryCase.surgeonUserId ?? null,
      surgicalTeam: surgeryCase.surgicalTeam ?? null,
      preparationNotes: surgeryCase.preparationNotes ?? null,
      operativeNotes: surgeryCase.operativeNotes ?? null,
      scheduledAt: surgeryCase.scheduledAt ? new Date(surgeryCase.scheduledAt) : null,
      startedAt: surgeryCase.startedAt ? new Date(surgeryCase.startedAt) : null,
      endedAt: surgeryCase.endedAt ? new Date(surgeryCase.endedAt) : null,
      createdAt: new Date(surgeryCase.createdAt),
      updatedAt: new Date(surgeryCase.updatedAt)
    });
  }

  public async update(surgeryCase: SurgeryCaseSummary): Promise<void> {
    await this.#db
      .update(surgeryCases)
      .set({
        status: surgeryCase.status,
        surgeonUserId: surgeryCase.surgeonUserId ?? null,
        surgicalTeam: surgeryCase.surgicalTeam ?? null,
        operativeNotes: surgeryCase.operativeNotes ?? null,
        startedAt: surgeryCase.startedAt ? new Date(surgeryCase.startedAt) : null,
        endedAt: surgeryCase.endedAt ? new Date(surgeryCase.endedAt) : null,
        updatedAt: new Date(surgeryCase.updatedAt)
      })
      .where(eq(surgeryCases.id, surgeryCase.id));
  }

  public async findById(id: SurgeryCaseId): Promise<SurgeryCaseSummary | null> {
    const result = await this.#db
      .select()
      .from(surgeryCases)
      .where(eq(surgeryCases.id, id))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    return this.mapRowToSurgeryCase(result[0]);
  }

  public async findByEncounterId(encounterId: EncounterId): Promise<readonly SurgeryCaseSummary[]> {
    const result = await this.#db
      .select()
      .from(surgeryCases)
      .where(eq(surgeryCases.encounterId, encounterId));

    return result.map((row) => this.mapRowToSurgeryCase(row));
  }

  private mapRowToSurgeryCase(row: typeof surgeryCases.$inferSelect): SurgeryCaseSummary {
    return {
      id: row.id as SurgeryCaseId,
      accountId: row.accountId as AccountId,
      encounterId: row.encounterId as EncounterId,
      patientId: row.patientId as PatientId,
      procedureName: row.procedureName,
      status: row.status as SurgeryCaseSummary['status'],
      surgeonUserId: row.surgeonUserId ?? undefined,
      surgicalTeam: (row.surgicalTeam as readonly string[] | undefined) ?? undefined,
      preparationNotes: row.preparationNotes ?? undefined,
      operativeNotes: row.operativeNotes ?? undefined,
      scheduledAt: row.scheduledAt?.toISOString(),
      startedAt: row.startedAt?.toISOString(),
      endedAt: row.endedAt?.toISOString(),
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString()
    };
  }
}
