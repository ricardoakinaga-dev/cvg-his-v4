import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { withTenantTransaction, type DatabaseClient } from '@cvg-his-v2/shared-database';
import {
  clinicalEntries,
  entryRevisions,
  prescriptionSignatures
} from '@cvg-his-v2/shared-database';
import {
  type PrescriptionRepository,
  type PrescriptionSummary,
  type PrescriptionId,
  type PrescriptionRevisionSummary,
  type PrescriptionSignatureSummary,
  toPrescriptionSummary
} from '@cvg-his-v2/module-prescriptions';
import type { AccountId, EncounterId, PatientId } from '@cvg-his-v2/shared-types';
import { ConflictError, NotFoundError } from '@cvg-his-v2/shared-errors';
import { requireAccountId as requireTenantAccountId } from '@cvg-his-v2/tenant-context';

function resolveAccountId(explicitAccountId: AccountId): AccountId {
  if (typeof explicitAccountId !== 'string' || explicitAccountId.trim().length === 0) {
    throw new Error('Prescription operations require an explicit account id');
  }
  const authenticatedAccountId = requireTenantAccountId() as AccountId;
  if (explicitAccountId !== authenticatedAccountId) {
    throw new Error('Prescription account does not match tenant context');
  }
  return explicitAccountId;
}

/**
 * Database-backed PrescriptionRepository that persists prescriptions
 * to the clinical_entries table with entryType === 'prescription'.
 */
export class DatabasePrescriptionRepository implements PrescriptionRepository {
  readonly #db: DatabaseClient;

  public constructor(db: DatabaseClient) {
    this.#db = db;
  }

  public async create(
    prescription: PrescriptionSummary,
    explicitAccountId: AccountId
  ): Promise<void> {
    const accountId = resolveAccountId(explicitAccountId);
    if (prescription.accountId !== accountId) {
      throw new Error('Prescription account does not match tenant context');
    }
    await this.#db.insert(clinicalEntries).values({
      id: prescription.id,
      accountId,
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

  public async createWithRevision(
    prescription: PrescriptionSummary,
    revision: PrescriptionRevisionSummary,
    explicitAccountId: AccountId
  ): Promise<void> {
    const accountId = resolveAccountId(explicitAccountId);
    if (prescription.accountId !== accountId) {
      throw new Error('Prescription account does not match tenant context');
    }
    if (revision.prescriptionId !== prescription.id) {
      throw new Error('Prescription revision does not match its prescription');
    }

    await withTenantTransaction(accountId, async (database) => {
      await database.insert(clinicalEntries).values({
        id: prescription.id,
        accountId,
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
      await database.insert(entryRevisions).values({
        id: revision.id,
        entryId: revision.prescriptionId,
        version: revision.version,
        title: revision.title,
        content: revision.content,
        authorUserId: revision.authorUserId,
        reason: revision.reason,
        createdAt: new Date(revision.createdAt)
      });
    });
  }

  public async update(
    prescription: PrescriptionSummary,
    explicitAccountId: AccountId
  ): Promise<void> {
    const accountId = resolveAccountId(explicitAccountId);
    if (prescription.accountId !== accountId) {
      throw new Error('Prescription account does not match tenant context');
    }
    await this.requireScopedPrescription(accountId, prescription.id);
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
      .where(
        and(
          eq(clinicalEntries.id, prescription.id),
          eq(clinicalEntries.accountId, accountId),
          eq(clinicalEntries.entryType, 'prescription')
        ) as any
      );
  }

  public async updateWithRevision(
    prescription: PrescriptionSummary,
    revision: PrescriptionRevisionSummary,
    explicitAccountId: AccountId
  ): Promise<void> {
    const accountId = resolveAccountId(explicitAccountId);
    if (prescription.accountId !== accountId) {
      throw new Error('Prescription account does not match tenant context');
    }
    if (revision.prescriptionId !== prescription.id) {
      throw new Error('Prescription revision does not match its prescription');
    }
    const expectedVersion = prescription.version - 1;
    if (expectedVersion < 1 || revision.version !== expectedVersion) {
      throw new ConflictError('Prescription revision version is inconsistent', {
        prescriptionId: prescription.id,
        expectedVersion,
        revisionVersion: revision.version
      });
    }

    await withTenantTransaction(accountId, async (database) => {
      const updated = await database
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
        .where(
          and(
            eq(clinicalEntries.id, prescription.id),
            eq(clinicalEntries.accountId, accountId),
            eq(clinicalEntries.entryType, 'prescription'),
            eq(clinicalEntries.version, expectedVersion)
          ) as any
        )
        .returning({ id: clinicalEntries.id });

      if (updated.length === 0) {
        const current = await database
          .select({ version: clinicalEntries.version })
          .from(clinicalEntries)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .where(
            and(
              eq(clinicalEntries.id, prescription.id),
              eq(clinicalEntries.accountId, accountId),
              eq(clinicalEntries.entryType, 'prescription')
            ) as any
          )
          .limit(1);
        if (current.length === 0) {
          throw new NotFoundError('Prescription not found', {
            prescriptionId: prescription.id
          });
        }
        throw new ConflictError('Prescription was updated by another replica', {
          prescriptionId: prescription.id,
          currentVersion: current[0]?.version,
          requestedVersion: prescription.version
        });
      }

      await database.insert(entryRevisions).values({
        id: revision.id,
        entryId: revision.prescriptionId,
        version: revision.version,
        title: revision.title,
        content: revision.content,
        authorUserId: revision.authorUserId,
        reason: revision.reason,
        createdAt: new Date(revision.createdAt)
      });
    });
  }

  public async createRevision(
    revision: PrescriptionRevisionSummary,
    explicitAccountId: AccountId
  ): Promise<void> {
    const accountId = resolveAccountId(explicitAccountId);
    await this.requireScopedPrescription(accountId, revision.prescriptionId);
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
    prescriptionId: PrescriptionId,
    explicitAccountId: AccountId
  ): Promise<readonly PrescriptionRevisionSummary[]> {
    const accountId = resolveAccountId(explicitAccountId);
    const prescription = await this.findScopedPrescription(accountId, prescriptionId);
    if (!prescription) return [];

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
    const accountId = resolveAccountId(signature.accountId);
    await this.requireScopedPrescription(accountId, signature.prescriptionId);
    await this.#db.insert(prescriptionSignatures).values({
      id: randomUUID(),
      accountId,
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
    const scopedAccountId = resolveAccountId(accountId);
    const prescription = await this.findScopedPrescription(scopedAccountId, prescriptionId);
    if (!prescription) return null;

    const rows = await this.#db
      .select()
      .from(prescriptionSignatures)
      .where(
        and(
          eq(prescriptionSignatures.accountId, scopedAccountId),
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

  public async findById(
    id: PrescriptionId,
    explicitAccountId: AccountId
  ): Promise<PrescriptionSummary | null> {
    const accountId = resolveAccountId(explicitAccountId);
    return this.findScopedPrescription(accountId, id);
  }

  public async findByEncounterId(
    encounterId: EncounterId,
    explicitAccountId: AccountId
  ): Promise<readonly PrescriptionSummary[]> {
    const accountId = resolveAccountId(explicitAccountId);
    const result = await this.#db
      .select()
      .from(clinicalEntries)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .where(
        and(
          eq(clinicalEntries.encounterId, encounterId),
          eq(clinicalEntries.accountId, accountId),
          eq(clinicalEntries.entryType, 'prescription')
        ) as any
      );

    return result
      .filter((row) => row.accountId === accountId && row.entryType === 'prescription')
      .map((row) => this.mapRow(row))
      .filter((p): p is PrescriptionSummary => p !== null);
  }

  public async findByPatientId(
    patientId: PatientId,
    explicitAccountId: AccountId
  ): Promise<readonly PrescriptionSummary[]> {
    const accountId = resolveAccountId(explicitAccountId);
    const result = await this.#db
      .select()
      .from(clinicalEntries)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .where(
        and(
          eq(clinicalEntries.patientId, patientId),
          eq(clinicalEntries.accountId, accountId),
          eq(clinicalEntries.entryType, 'prescription')
        ) as any
      );

    return result
      .filter((row) => row.accountId === accountId && row.entryType === 'prescription')
      .map((row) => this.mapRow(row))
      .filter((p): p is PrescriptionSummary => p !== null);
  }

  public async findByAccountId(accountId: AccountId): Promise<readonly PrescriptionSummary[]> {
    const scopedAccountId = resolveAccountId(accountId);
    const result = await this.#db
      .select()
      .from(clinicalEntries)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .where(
        and(
          eq(clinicalEntries.accountId, scopedAccountId),
          eq(clinicalEntries.entryType, 'prescription')
        ) as any
      );

    return result
      .filter((row) => row.accountId === scopedAccountId && row.entryType === 'prescription')
      .map((row) => this.mapRow(row))
      .filter((p): p is PrescriptionSummary => p !== null);
  }

  public async findByAccountIdPaginated(
    accountId: AccountId,
    options: { offset: number; limit: number }
  ): Promise<{ items: readonly PrescriptionSummary[]; total: number }> {
    const scopedAccountId = resolveAccountId(accountId);
    // First get all prescriptions for this account to count total
    const allResult = await this.#db
      .select()
      .from(clinicalEntries)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .where(
        and(
          eq(clinicalEntries.accountId, scopedAccountId),
          eq(clinicalEntries.entryType, 'prescription')
        ) as any
      );

    const prescriptions = allResult
      .filter((row) => row.accountId === scopedAccountId && row.entryType === 'prescription')
      .map((row) => this.mapRow(row))
      .filter((p): p is PrescriptionSummary => p !== null);

    const total = prescriptions.length;
    const items = prescriptions.slice(options.offset, options.offset + options.limit);

    return { items, total };
  }

  private async findScopedPrescription(
    accountId: AccountId,
    id: PrescriptionId
  ): Promise<PrescriptionSummary | null> {
    const result = await this.#db
      .select()
      .from(clinicalEntries)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .where(
        and(
          eq(clinicalEntries.id, id),
          eq(clinicalEntries.accountId, accountId),
          eq(clinicalEntries.entryType, 'prescription')
        ) as any
      )
      .limit(1);

    const entry = result[0];
    return entry ? this.mapRow(entry) : null;
  }

  private async requireScopedPrescription(
    accountId: AccountId,
    id: PrescriptionId
  ): Promise<PrescriptionSummary> {
    const prescription = await this.findScopedPrescription(accountId, id);
    if (!prescription) {
      throw new NotFoundError('Prescription not found', { prescriptionId: id });
    }
    return prescription;
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
