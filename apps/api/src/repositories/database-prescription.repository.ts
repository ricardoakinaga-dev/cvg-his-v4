import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import type { DatabaseClient } from '@cvg-his-v2/shared-database';
import { clinicalEntries, entryRevisions, prescriptionSignatures } from '@cvg-his-v2/shared-database';
import {
  type PrescriptionRepository,
  type PrescriptionSummary,
  type PrescriptionId,
  type PrescriptionRevisionSummary,
  type PrescriptionSignatureSummary,
  toPrescriptionSummary
} from '@cvg-his-v2/module-prescriptions';
import type { AccountId, EncounterId, PatientId } from '@cvg-his-v2/shared-types';

/**
 * Database-backed PrescriptionRepository that persists prescriptions
 * to the clinical_entries table with entryType === 'prescription'.
 */
export class DatabasePrescriptionRepository implements PrescriptionRepository {
  readonly #db: DatabaseClient;

  public constructor(db: DatabaseClient) {
    this.#db = db;
  }

  public async create(prescription: PrescriptionSummary): Promise<void> {
    await this.#db.insert(clinicalEntries).values({
      id: prescription.id,
      accountId: prescription.accountId,
      medicalRecordId: prescription.medicalRecordId,
      encounterId: prescription.encounterId,
      patientId: prescription.patientId,
      authorUserId: prescription.authoredByUserId,
      entryType: 'prescription',
      title: prescription.title,
      content: prescription.content,
      version: prescription.version,
      deletedAt: prescription.deletedAt ? new Date(prescription.deletedAt) : null,
      deletedByUserId: prescription.deletedByUserId ?? null,
      deleteReason: prescription.deleteReason ?? null,
      createdAt: new Date(prescription.createdAt),
      updatedAt: new Date(prescription.updatedAt)
    });
  }

  public async update(prescription: PrescriptionSummary): Promise<void> {
    await this.#db
      .update(clinicalEntries)
      .set({
        title: prescription.title,
        content: prescription.content,
        version: prescription.version,
        deletedAt: prescription.deletedAt ? new Date(prescription.deletedAt) : null,
        deletedByUserId: prescription.deletedByUserId ?? null,
        deleteReason: prescription.deleteReason ?? null,
        updatedAt: new Date(prescription.updatedAt)
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .where(eq(clinicalEntries.id, prescription.id) as any);
  }

  public async createRevision(revision: PrescriptionRevisionSummary): Promise<void> {
    await this.#db.insert(entryRevisions).values({
      id: revision.id,
      entryId: revision.prescriptionId,
      version: revision.version,
      title: revision.title,
      content: revision.content,
      authorUserId: revision.authorUserId,
      reason: revision.reason,
      createdAt: new Date(revision.createdAt)
    });
  }

  public async findRevisions(
    prescriptionId: PrescriptionId
  ): Promise<readonly PrescriptionRevisionSummary[]> {
    const rows = await this.#db
      .select()
      .from(entryRevisions)
      .where(eq(entryRevisions.entryId, prescriptionId));
    return rows.map((row) => ({
      id: row.id,
      prescriptionId,
      version: row.version,
      title: row.title,
      content: row.content,
      authorUserId: row.authorUserId as PrescriptionSummary['authoredByUserId'],
      reason: row.reason ?? 'Revision',
      createdAt: row.createdAt.toISOString()
    }));
  }

  public async sign(
    signature: PrescriptionSignatureSummary & { readonly accountId: AccountId }
  ): Promise<void> {
    await this.#db.insert(prescriptionSignatures).values({
      id: randomUUID(),
      accountId: signature.accountId,
      prescriptionId: signature.prescriptionId,
      version: signature.version,
      signedByUserId: signature.signedByUserId,
      signatureHash: signature.signatureHash,
      signedAt: new Date(signature.signedAt)
    });
  }

  public async findSignature(
    accountId: AccountId,
    prescriptionId: PrescriptionId,
    version: number
  ): Promise<PrescriptionSignatureSummary | null> {
    const rows = await this.#db
      .select()
      .from(prescriptionSignatures)
      .where(
        and(
          eq(prescriptionSignatures.accountId, accountId),
          eq(prescriptionSignatures.prescriptionId, prescriptionId),
          eq(prescriptionSignatures.version, version)
        )
      )
      .limit(1);
    const row = rows[0];
    return row
      ? {
          prescriptionId,
          version: row.version,
          signedByUserId: row.signedByUserId as PrescriptionSummary['authoredByUserId'],
          signedAt: row.signedAt.toISOString(),
          signatureHash: row.signatureHash
        }
      : null;
  }

  public async findById(id: PrescriptionId): Promise<PrescriptionSummary | null> {
    const result = await this.#db
      .select()
      .from(clinicalEntries)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .where(eq(clinicalEntries.id, id) as any)
      .limit(1);

    if (result.length === 0) return null;
    const entry = result[0];
    // Filter to prescriptions only
    if (entry.entryType !== 'prescription') return null;
    return this.mapRow(entry);
  }

  public async findByEncounterId(encounterId: EncounterId): Promise<readonly PrescriptionSummary[]> {
    const result = await this.#db
      .select()
      .from(clinicalEntries)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .where(eq(clinicalEntries.encounterId, encounterId) as any);

    return result
      .filter((row) => row.entryType === 'prescription')
      .map((row) => this.mapRow(row))
      .filter((p): p is PrescriptionSummary => p !== null);
  }

  public async findByPatientId(patientId: PatientId): Promise<readonly PrescriptionSummary[]> {
    const result = await this.#db
      .select()
      .from(clinicalEntries)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .where(eq(clinicalEntries.patientId, patientId) as any);

    return result
      .filter((row) => row.entryType === 'prescription')
      .map((row) => this.mapRow(row))
      .filter((p): p is PrescriptionSummary => p !== null);
  }

  public async findByAccountId(accountId: AccountId): Promise<readonly PrescriptionSummary[]> {
    const result = await this.#db
      .select()
      .from(clinicalEntries)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .where(eq(clinicalEntries.accountId, accountId) as any);

    return result
      .filter((row) => row.entryType === 'prescription')
      .map((row) => this.mapRow(row))
      .filter((p): p is PrescriptionSummary => p !== null);
  }

  public async findByAccountIdPaginated(
    accountId: AccountId,
    options: { offset: number; limit: number }
  ): Promise<{ items: readonly PrescriptionSummary[]; total: number }> {
    // First get all prescriptions for this account to count total
    const allResult = await this.#db
      .select()
      .from(clinicalEntries)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .where(eq(clinicalEntries.accountId, accountId) as any);

    const prescriptions = allResult
      .filter((row) => row.entryType === 'prescription')
      .map((row) => this.mapRow(row))
      .filter((p): p is PrescriptionSummary => p !== null);

    const total = prescriptions.length;
    const items = prescriptions.slice(options.offset, options.offset + options.limit);

    return { items, total };
  }

  private mapRow(row: typeof clinicalEntries.$inferSelect): PrescriptionSummary | null {
    const entry = {
      id: row.id,
      accountId: row.accountId,
      medicalRecordId: row.medicalRecordId,
      encounterId: row.encounterId,
      patientId: row.patientId,
      entryType: row.entryType as 'prescription',
      title: row.title,
      content: row.content,
      authoredByUserId: row.authorUserId,
      version: row.version,
      deletedAt: row.deletedAt?.toISOString(),
      deletedByUserId: row.deletedByUserId ?? undefined,
      deleteReason: row.deleteReason ?? undefined,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString()
    };

    return toPrescriptionSummary(entry as import('@cvg-his-v2/shared-types').ClinicalEntrySummary);
  }
}
