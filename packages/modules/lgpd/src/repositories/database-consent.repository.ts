import { and, eq } from 'drizzle-orm';
import type { DatabaseClient } from '@cvg-his-v2/shared-database';
import { consentRecords } from '@cvg-his-v2/shared-database';
import type {
  ConsentRecord,
  ConsentRepository,
  ConsentGrantRequest
} from './consent-repository.interface.js';

function rowToRecord(row: Record<string, unknown>): ConsentRecord {
  return {
    id: row.id as string,
    accountId: row.accountId as string,
    subjectId: row.subjectId as string,
    subjectType: row.subjectType as ConsentRecord['subjectType'],
    purpose: row.purpose as ConsentRecord['purpose'],
    status: row.status as ConsentRecord['status'],
    origin: row.origin as ConsentRecord['origin'],
    grantedBy: row.grantedBy as string,
    grantedAt: (row.grantedAt as Date).toISOString(),
    revokedBy: (row.revokedBy as string) ?? undefined,
    revokedAt: (row.revokedAt as Date)?.toISOString(),
    expiresAt: (row.expiresAt as Date)?.toISOString(),
    metadata: (row.metadata as Record<string, unknown>) ?? undefined,
    createdAt: (row.createdAt as Date).toISOString()
  };
}

export class DatabaseConsentRepository implements ConsentRepository {
  readonly #db: DatabaseClient;

  constructor(db: DatabaseClient) {
    this.#db = db;
  }

  async findBySubject(
    accountId: string,
    subjectId: string,
    subjectType: ConsentRecord['subjectType']
  ): Promise<readonly ConsentRecord[]> {
    const rows = await this.#db
      .select()
      .from(consentRecords)
      .where(
        and(
          eq(consentRecords.accountId, accountId as never),
          eq(consentRecords.subjectId, subjectId as never),
          eq(consentRecords.subjectType, subjectType)
        )
      )
      .orderBy(consentRecords.createdAt);

    return rows.map(rowToRecord);
  }

  async findBySubjectAndPurpose(
    accountId: string,
    subjectId: string,
    subjectType: ConsentRecord['subjectType'],
    purpose: ConsentRecord['purpose']
  ): Promise<ConsentRecord | undefined> {
    const rows = await this.#db
      .select()
      .from(consentRecords)
      .where(
        and(
          eq(consentRecords.accountId, accountId as never),
          eq(consentRecords.subjectId, subjectId as never),
          eq(consentRecords.subjectType, subjectType),
          eq(consentRecords.purpose, purpose)
        )
      )
      .orderBy(consentRecords.createdAt)
      .limit(1);

    if (rows.length === 0) return undefined;
    return rowToRecord(rows[0]);
  }

  async findActiveBySubject(
    accountId: string,
    subjectId: string,
    subjectType: ConsentRecord['subjectType']
  ): Promise<readonly ConsentRecord[]> {
    const rows = await this.#db
      .select()
      .from(consentRecords)
      .where(
        and(
          eq(consentRecords.accountId, accountId as never),
          eq(consentRecords.subjectId, subjectId as never),
          eq(consentRecords.subjectType, subjectType),
          eq(consentRecords.status, 'granted')
        )
      )
      .orderBy(consentRecords.createdAt);

    return rows.map(rowToRecord);
  }

  async create(data: Omit<ConsentRecord, 'id' | 'createdAt'>): Promise<ConsentRecord> {
    const rows = await this.#db
      .insert(consentRecords)
      .values({
        accountId: data.accountId as never,
        subjectId: data.subjectId as never,
        subjectType: data.subjectType,
        purpose: data.purpose,
        status: data.status,
        origin: data.origin,
        grantedBy: data.grantedBy as never,
        grantedAt: new Date(data.grantedAt) as never,
        revokedBy: data.revokedBy ? (data.revokedBy as never) : undefined,
        revokedAt: data.revokedAt ? (new Date(data.revokedAt) as never) : undefined,
        expiresAt: data.expiresAt ? (new Date(data.expiresAt) as never) : undefined,
        metadata: data.metadata,
        createdAt: new Date() as never
      })
      .returning();

    if (rows.length === 0) {
      throw new Error('Failed to create consent record');
    }

    return rowToRecord(rows[0]);
  }

  async revoke(id: string, revokedBy: string, revokedAt: string): Promise<ConsentRecord> {
    const rows = await this.#db
      .update(consentRecords)
      .set({
        status: 'revoked',
        revokedBy: revokedBy as never,
        revokedAt: new Date(revokedAt) as never
      })
      .where(eq(consentRecords.id, id as never))
      .returning();

    if (rows.length === 0) {
      throw new Error(`Consent record not found: ${id}`);
    }

    return rowToRecord(rows[0]);
  }
}
