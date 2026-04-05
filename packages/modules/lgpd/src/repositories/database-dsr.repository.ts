import { and, eq } from 'drizzle-orm';
import type { DatabaseClient } from '@cvg-his-v2/shared-database';
import { dataSubjectRequests } from '@cvg-his-v2/shared-database';
import type { DataSubjectRequest, DsrRepository, DsrStatus } from './dsr-repository.interface.js';

function rowToRecord(row: Record<string, unknown>): DataSubjectRequest {
  return {
    id: row.id as string,
    accountId: row.accountId as string,
    subjectId: row.subjectId as string,
    subjectType: row.subjectType as DataSubjectRequest['subjectType'],
    requestType: row.requestType as DataSubjectRequest['requestType'],
    status: row.status as DataSubjectRequest['status'],
    requestedBy: row.requestedBy as string,
    requestedAt: (row.requestedAt as Date).toISOString(),
    completedAt: (row.completedAt as Date)?.toISOString(),
    completedBy: (row.completedBy as string) ?? undefined,
    notes: (row.notes as string) ?? undefined,
    rejectionReason: (row.rejectionReason as string) ?? undefined,
    resultJson: (row.resultJson as Record<string, unknown>) ?? undefined,
    createdAt: (row.createdAt as Date).toISOString(),
    updatedAt: (row.updatedAt as Date).toISOString()
  };
}

export class DatabaseDsrRepository implements DsrRepository {
  readonly #db: DatabaseClient;

  constructor(db: DatabaseClient) {
    this.#db = db;
  }

  async findById(accountId: string, id: string): Promise<DataSubjectRequest | undefined> {
    const rows = await this.#db
      .select()
      .from(dataSubjectRequests)
      .where(
        and(
          eq(dataSubjectRequests.accountId, accountId as never),
          eq(dataSubjectRequests.id, id as never)
        )
      )
      .limit(1);

    if (rows.length === 0) return undefined;
    return rowToRecord(rows[0]);
  }

  async findBySubject(
    accountId: string,
    subjectId: string,
    subjectType: DataSubjectRequest['subjectType']
  ): Promise<readonly DataSubjectRequest[]> {
    const rows = await this.#db
      .select()
      .from(dataSubjectRequests)
      .where(
        and(
          eq(dataSubjectRequests.accountId, accountId as never),
          eq(dataSubjectRequests.subjectId, subjectId as never),
          eq(dataSubjectRequests.subjectType, subjectType)
        )
      )
      .orderBy(dataSubjectRequests.requestedAt);

    return rows.map(rowToRecord);
  }

  async findByStatus(accountId: string, status: DsrStatus): Promise<readonly DataSubjectRequest[]> {
    const rows = await this.#db
      .select()
      .from(dataSubjectRequests)
      .where(
        and(
          eq(dataSubjectRequests.accountId, accountId as never),
          eq(dataSubjectRequests.status, status)
        )
      )
      .orderBy(dataSubjectRequests.requestedAt);

    return rows.map(rowToRecord);
  }

  async create(
    data: Omit<DataSubjectRequest, 'id' | 'requestedAt' | 'createdAt' | 'updatedAt'>
  ): Promise<DataSubjectRequest> {
    const rows = await this.#db
      .insert(dataSubjectRequests)
      .values({
        accountId: data.accountId as never,
        subjectId: data.subjectId as never,
        subjectType: data.subjectType,
        requestType: data.requestType,
        status: data.status,
        requestedBy: data.requestedBy as never,
        requestedAt: new Date() as never,
        completedAt: data.completedAt ? (new Date(data.completedAt) as never) : undefined,
        completedBy: data.completedBy ? (data.completedBy as never) : undefined,
        notes: data.notes,
        rejectionReason: data.rejectionReason,
        resultJson: data.resultJson,
        createdAt: new Date() as never,
        updatedAt: new Date() as never
      })
      .returning();

    if (rows.length === 0) {
      throw new Error('Failed to create data subject request');
    }

    return rowToRecord(rows[0]);
  }

  async updateStatus(
    id: string,
    status: DsrStatus,
    options?: {
      completedBy?: string;
      completedAt?: string;
      rejectionReason?: string;
      resultJson?: Record<string, unknown>;
    }
  ): Promise<DataSubjectRequest> {
    const rows = await this.#db
      .update(dataSubjectRequests)
      .set({
        status,
        completedAt: options?.completedAt ? (new Date(options.completedAt) as never) : undefined,
        completedBy: options?.completedBy ? (options.completedBy as never) : undefined,
        rejectionReason: options?.rejectionReason,
        resultJson: options?.resultJson,
        updatedAt: new Date() as never
      })
      .where(eq(dataSubjectRequests.id, id as never))
      .returning();

    if (rows.length === 0) {
      throw new Error(`Data subject request not found: ${id}`);
    }

    return rowToRecord(rows[0]);
  }
}
