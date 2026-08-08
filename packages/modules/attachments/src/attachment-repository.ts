import { eq, and } from 'drizzle-orm';
import type { DatabaseClient } from '@cvg-his-v2/shared-database';
import { attachments } from '@cvg-his-v2/shared-database';
import type { AccountId, AttachmentId, AttachmentSummary, UserId } from '@cvg-his-v2/shared-types';

export interface AttachmentRepository {
  create(attachment: AttachmentSummary): Promise<void>;
  findById(id: AttachmentId): Promise<AttachmentSummary | null>;
  findByLinkedEntity(
    linkedEntityType: 'encounter' | 'medical_record' | 'diagnostic_order',
    linkedEntityId: string
  ): Promise<readonly AttachmentSummary[]>;
  deleteById(id: AttachmentId): Promise<boolean>;
}

export class DatabaseAttachmentRepository implements AttachmentRepository {
  readonly #db: DatabaseClient;

  public constructor(db: DatabaseClient) {
    this.#db = db;
  }

  public async create(attachment: AttachmentSummary): Promise<void> {
    await this.#db.insert(attachments).values({
      id: attachment.id,
      accountId: attachment.accountId,
      linkedEntityType: attachment.linkedEntityType,
      linkedEntityId: attachment.linkedEntityId,
      category: attachment.category,
      fileName: attachment.fileName,
      storageKey: attachment.storageKey,
      mimeType: attachment.mimeType,
      checksum: attachment.checksum,
      sizeBytes: attachment.sizeBytes ?? null,
      source: attachment.source,
      scanStatus: attachment.scanStatus,
      scanProvider: attachment.scanProvider ?? null,
      scanReason: attachment.scanReason ?? null,
      scannedAt: attachment.scannedAt ? new Date(attachment.scannedAt) : null,
      uploadedByUserId: attachment.uploadedByUserId,
      createdAt: new Date(attachment.createdAt)
    });
  }

  public async findById(id: AttachmentId): Promise<AttachmentSummary | null> {
    const result = await this.#db.select().from(attachments).where(eq(attachments.id, id)).limit(1);

    if (result.length === 0) return null;
    return this.mapRow(result[0]);
  }

  public async findByLinkedEntity(
    linkedEntityType: 'encounter' | 'medical_record' | 'diagnostic_order',
    linkedEntityId: string
  ): Promise<readonly AttachmentSummary[]> {
    const result = await this.#db
      .select()
      .from(attachments)
      .where(
        and(
          eq(attachments.linkedEntityType, linkedEntityType),
          eq(attachments.linkedEntityId, linkedEntityId)
        )
      );

    return result.map((row) => this.mapRow(row));
  }

  public async deleteById(id: AttachmentId): Promise<boolean> {
    const result = await this.#db.delete(attachments).where(eq(attachments.id, id));
    return true;
  }

  private mapRow(row: typeof attachments.$inferSelect): AttachmentSummary {
    return {
      id: row.id as AttachmentId,
      accountId: row.accountId as AccountId,
      linkedEntityType: row.linkedEntityType as AttachmentSummary['linkedEntityType'],
      linkedEntityId: row.linkedEntityId,
      category: (row.category ?? 'other') as AttachmentSummary['category'],
      fileName: row.fileName,
      storageKey: row.storageKey,
      mimeType: row.mimeType,
      checksum: row.checksum,
      sizeBytes: row.sizeBytes ?? undefined,
      source: row.source as AttachmentSummary['source'],
      scanStatus: (row.scanStatus ?? 'available') as AttachmentSummary['scanStatus'],
      scanProvider: row.scanProvider ?? undefined,
      scanReason: row.scanReason ?? undefined,
      scannedAt: row.scannedAt?.toISOString(),
      uploadedByUserId: (row.uploadedByUserId ?? '') as UserId,
      createdAt: row.createdAt.toISOString()
    };
  }
}
