import { and, eq } from 'drizzle-orm';
import type { DatabaseClient } from '@cvg-his-v2/shared-database';
import { laboratoryResultImports } from '@cvg-his-v2/shared-database';

export type LaboratoryResultImportStatus = 'imported' | 'failed';

export interface LaboratoryResultImportRecord {
  readonly externalResultId: string;
  readonly orderId: string;
  readonly accountId: string;
  readonly equipmentId: string;
  readonly status: LaboratoryResultImportStatus;
  readonly importedAt: string;
  readonly resultSummary: string;
  readonly failureReason?: string;
  readonly attemptCount?: number;
  readonly lastAttemptAt?: string;
}

export interface LaboratoryResultImportRepository {
  create(record: LaboratoryResultImportRecord): Promise<void>;
  update?(record: LaboratoryResultImportRecord): Promise<void>;
  findByExternalResultId(
    externalResultId: string,
    accountId?: string
  ): Promise<LaboratoryResultImportRecord | null>;
  list(accountId?: string): Promise<readonly LaboratoryResultImportRecord[]>;
}

function cloneRecord(record: LaboratoryResultImportRecord): LaboratoryResultImportRecord {
  return { ...record };
}

export class InMemoryLaboratoryResultImportRepository implements LaboratoryResultImportRepository {
  readonly #records = new Map<string, LaboratoryResultImportRecord>();

  #key(externalResultId: string, accountId?: string): string {
    return `${accountId ?? '*'}:${externalResultId}`;
  }

  async create(record: LaboratoryResultImportRecord): Promise<void> {
    const normalized = {
      ...record,
      attemptCount: record.attemptCount ?? 1,
      lastAttemptAt: record.lastAttemptAt ?? record.importedAt
    };
    this.#records.set(this.#key(record.externalResultId, record.accountId), cloneRecord(normalized));
  }

  async update(record: LaboratoryResultImportRecord): Promise<void> {
    await this.create(record);
  }

  async findByExternalResultId(
    externalResultId: string,
    accountId?: string
  ): Promise<LaboratoryResultImportRecord | null> {
    const record = accountId
      ? this.#records.get(this.#key(externalResultId, accountId))
      : Array.from(this.#records.values()).find((item) => item.externalResultId === externalResultId);
    return record ? cloneRecord(record) : null;
  }

  async list(accountId?: string): Promise<readonly LaboratoryResultImportRecord[]> {
    return Array.from(this.#records.values())
      .filter((item) => !accountId || item.accountId === accountId)
      .sort((left, right) => right.importedAt.localeCompare(left.importedAt))
      .map((item) => cloneRecord(item));
  }
}

export class DatabaseLaboratoryResultImportRepository implements LaboratoryResultImportRepository {
  readonly #db: DatabaseClient;

  public constructor(db: DatabaseClient) {
    this.#db = db;
  }

  public async create(record: LaboratoryResultImportRecord): Promise<void> {
    await this.#db
      .insert(laboratoryResultImports)
      .values({
        accountId: record.accountId,
        externalResultId: record.externalResultId,
        orderId: record.orderId,
        equipmentId: record.equipmentId,
        status: record.status,
        importedAt: new Date(record.importedAt),
        resultSummary: record.resultSummary,
        failureReason: record.failureReason ?? null,
        attemptCount: record.attemptCount ?? 1,
        lastAttemptAt: new Date(record.lastAttemptAt ?? record.importedAt)
      })
      .onConflictDoNothing({
        target: [laboratoryResultImports.accountId, laboratoryResultImports.externalResultId]
      });
  }

  public async update(record: LaboratoryResultImportRecord): Promise<void> {
    await this.#db
      .update(laboratoryResultImports)
      .set({
        orderId: record.orderId,
        equipmentId: record.equipmentId,
        status: record.status,
        importedAt: new Date(record.importedAt),
        resultSummary: record.resultSummary,
        failureReason: record.failureReason ?? null,
        attemptCount: record.attemptCount ?? 1,
        lastAttemptAt: new Date(record.lastAttemptAt ?? record.importedAt)
      })
      .where(
        and(
          eq(laboratoryResultImports.accountId, record.accountId),
          eq(laboratoryResultImports.externalResultId, record.externalResultId)
        )
      );
  }

  public async findByExternalResultId(
    externalResultId: string,
    accountId?: string
  ): Promise<LaboratoryResultImportRecord | null> {
    if (!accountId) return null;
    const rows = await this.#db
      .select()
      .from(laboratoryResultImports)
      .where(
        and(
          eq(laboratoryResultImports.accountId, accountId),
          eq(laboratoryResultImports.externalResultId, externalResultId)
        )
      )
      .limit(1);
    return rows[0] ? this.#map(rows[0]) : null;
  }

  public async list(accountId?: string): Promise<readonly LaboratoryResultImportRecord[]> {
    if (!accountId) return [];
    const rows = await this.#db
      .select()
      .from(laboratoryResultImports)
      .where(eq(laboratoryResultImports.accountId, accountId));
    return rows.map((row) => this.#map(row));
  }

  #map(row: typeof laboratoryResultImports.$inferSelect): LaboratoryResultImportRecord {
    return {
      externalResultId: row.externalResultId,
      orderId: row.orderId,
      accountId: row.accountId,
      equipmentId: row.equipmentId,
      status: row.status as LaboratoryResultImportStatus,
      importedAt: row.importedAt.toISOString(),
      resultSummary: row.resultSummary,
      failureReason: row.failureReason ?? undefined,
      attemptCount: row.attemptCount,
      lastAttemptAt: row.lastAttemptAt.toISOString()
    };
  }
}
