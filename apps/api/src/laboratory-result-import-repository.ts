import type { Pool } from 'pg';
import { and, eq } from 'drizzle-orm';

import { AppError } from '@cvg-his-v2/shared-errors';
import type { DatabaseClient } from '@cvg-his-v2/shared-database';
import { laboratoryResultImports } from '@cvg-his-v2/shared-database';
import { withTenantQueryExplicit } from '@cvg-his-v2/tenant-context';

export type LaboratoryResultImportStatus = 'pending_human_review' | 'imported' | 'failed';
export type LaboratoryResultImportStorage = 'ephemeral' | 'durable';

export interface LaboratoryResultImportRecord {
  readonly externalResultId: string;
  readonly orderId: string;
  readonly accountId: string;
  readonly equipmentId: string;
  readonly providerCode: string;
  readonly schemaVersion: string;
  readonly signatureKeyId: string;
  readonly payloadFingerprint: string;
  readonly observedAt: string;
  readonly status: LaboratoryResultImportStatus;
  readonly importedAt: string;
  readonly resultSummary: string;
  readonly failureReason?: string;
  readonly attemptCount?: number;
  readonly lastAttemptAt?: string;
}

export interface LaboratoryProviderIngressPersistenceResult {
  readonly record: LaboratoryResultImportRecord;
  readonly replayed: boolean;
}

export interface LaboratoryResultImportRepository {
  readonly storage: LaboratoryResultImportStorage;
  create(record: LaboratoryResultImportRecord): Promise<void>;
  update(record: LaboratoryResultImportRecord): Promise<void>;
  recordProviderIngress(
    record: LaboratoryResultImportRecord
  ): Promise<LaboratoryProviderIngressPersistenceResult>;
  findByExternalResultId(
    externalResultId: string,
    accountId: string
  ): Promise<LaboratoryResultImportRecord | null>;
  list(accountId: string): Promise<readonly LaboratoryResultImportRecord[]>;
}

function cloneRecord(record: LaboratoryResultImportRecord): LaboratoryResultImportRecord {
  return { ...record };
}

function normalizeRecord(record: LaboratoryResultImportRecord): LaboratoryResultImportRecord {
  return {
    ...record,
    attemptCount: record.attemptCount ?? 1,
    lastAttemptAt: record.lastAttemptAt ?? record.importedAt
  };
}

function isSameProviderPayload(
  existing: LaboratoryResultImportRecord,
  incoming: LaboratoryResultImportRecord
): boolean {
  return (
    existing.providerCode === incoming.providerCode &&
    existing.schemaVersion === incoming.schemaVersion &&
    existing.externalResultId === incoming.externalResultId &&
    existing.orderId === incoming.orderId &&
    existing.equipmentId === incoming.equipmentId &&
    existing.resultSummary === incoming.resultSummary &&
    existing.observedAt === incoming.observedAt &&
    existing.payloadFingerprint === incoming.payloadFingerprint
  );
}

function providerIngressConflict(): AppError {
  return new AppError(
    'LABORATORY_PROVIDER_INGRESS_CONFLICT',
    'Laboratory provider result conflicts with an existing external result',
    409
  );
}

export class InMemoryLaboratoryResultImportRepository implements LaboratoryResultImportRepository {
  readonly storage: LaboratoryResultImportStorage = 'ephemeral';
  readonly #records = new Map<string, LaboratoryResultImportRecord>();

  #key(externalResultId: string, accountId?: string): string {
    return `${accountId ?? '*'}:${externalResultId}`;
  }

  public async create(record: LaboratoryResultImportRecord): Promise<void> {
    const normalized = normalizeRecord(record);
    const key = this.#key(record.externalResultId, record.accountId);
    const existing = this.#records.get(key);
    if (existing) {
      if (!isSameProviderPayload(existing, normalized)) throw providerIngressConflict();
      return;
    }
    this.#records.set(key, cloneRecord(normalized));
  }

  public async update(record: LaboratoryResultImportRecord): Promise<void> {
    const key = this.#key(record.externalResultId, record.accountId);
    const existing = this.#records.get(key);
    if (!existing) {
      await this.create(record);
      return;
    }
    if (!isSameProviderPayload(existing, record)) throw providerIngressConflict();
    const normalized = normalizeRecord(record);
    this.#records.set(
      key,
      cloneRecord({
        ...existing,
        status: normalized.status,
        failureReason: normalized.failureReason,
        attemptCount: normalized.attemptCount,
        lastAttemptAt: normalized.lastAttemptAt
      })
    );
  }

  public async recordProviderIngress(
    record: LaboratoryResultImportRecord
  ): Promise<LaboratoryProviderIngressPersistenceResult> {
    const key = this.#key(record.externalResultId, record.accountId);
    const existing = this.#records.get(key);
    if (existing) {
      if (!isSameProviderPayload(existing, record)) throw providerIngressConflict();
      return { record: cloneRecord(existing), replayed: true };
    }

    const normalized = normalizeRecord(record);
    this.#records.set(key, cloneRecord(normalized));
    return { record: cloneRecord(normalized), replayed: false };
  }

  public async findByExternalResultId(
    externalResultId: string,
    accountId: string
  ): Promise<LaboratoryResultImportRecord | null> {
    const record = this.#records.get(this.#key(externalResultId, accountId));
    return record ? cloneRecord(record) : null;
  }

  public async list(accountId: string): Promise<readonly LaboratoryResultImportRecord[]> {
    return Array.from(this.#records.values())
      .filter((item) => item.accountId === accountId)
      .sort((left, right) => right.importedAt.localeCompare(left.importedAt))
      .map((item) => cloneRecord(item));
  }
}

interface LaboratoryResultImportRow {
  readonly account_id: string;
  readonly external_result_id: string;
  readonly order_id: string;
  readonly equipment_id: string;
  readonly provider_code: string | null;
  readonly schema_version: string | null;
  readonly signature_key_id: string | null;
  readonly payload_fingerprint: string | null;
  readonly observed_at: Date | string | null;
  readonly status: string;
  readonly imported_at: Date | string;
  readonly result_summary: string;
  readonly failure_reason: string | null;
  readonly attempt_count: number;
  readonly last_attempt_at: Date | string;
}

const RETURNING_COLUMNS = `
  account_id, external_result_id, order_id, equipment_id, provider_code,
  schema_version, signature_key_id, payload_fingerprint, observed_at, status,
  imported_at, result_summary, failure_reason, attempt_count, last_attempt_at`;

function dateToIso(value: Date | string | null, fallback?: Date | string): string {
  const candidate = value ?? fallback;
  const date = candidate instanceof Date ? candidate : new Date(candidate ?? 0);
  return date.toISOString();
}

export class DatabaseLaboratoryResultImportRepository implements LaboratoryResultImportRepository {
  readonly storage = 'durable' as const;
  readonly #db: DatabaseClient;
  readonly #pool: Pool;

  public constructor(db: DatabaseClient, pool: Pool = db.$client as unknown as Pool) {
    this.#db = db;
    this.#pool = pool;
  }

  public async create(record: LaboratoryResultImportRecord): Promise<void> {
    const normalized = normalizeRecord(record);
    await this.#db
      .insert(laboratoryResultImports)
      .values({
        accountId: normalized.accountId,
        externalResultId: normalized.externalResultId,
        orderId: normalized.orderId,
        equipmentId: normalized.equipmentId,
        providerCode: normalized.providerCode,
        schemaVersion: normalized.schemaVersion,
        signatureKeyId: normalized.signatureKeyId,
        payloadFingerprint: normalized.payloadFingerprint,
        observedAt: new Date(normalized.observedAt),
        status: normalized.status,
        importedAt: new Date(normalized.importedAt),
        resultSummary: normalized.resultSummary,
        failureReason: normalized.failureReason ?? null,
        attemptCount: normalized.attemptCount ?? 1,
        lastAttemptAt: new Date(normalized.lastAttemptAt ?? normalized.importedAt)
      })
      .onConflictDoNothing({
        target: [laboratoryResultImports.accountId, laboratoryResultImports.externalResultId]
      });
  }

  public async update(record: LaboratoryResultImportRecord): Promise<void> {
    const normalized = normalizeRecord(record);
    const existing = await this.findByExternalResultId(
      normalized.externalResultId,
      normalized.accountId
    );
    if (existing && !isSameProviderPayload(existing, normalized)) {
      throw providerIngressConflict();
    }
    if (!existing) {
      await this.create(normalized);
      return;
    }
    await this.#db
      .update(laboratoryResultImports)
      .set({
        status: normalized.status,
        failureReason: normalized.failureReason ?? null,
        attemptCount: normalized.attemptCount ?? 1,
        lastAttemptAt: new Date(normalized.lastAttemptAt ?? normalized.importedAt)
      })
      .where(
        and(
          eq(laboratoryResultImports.accountId, normalized.accountId),
          eq(laboratoryResultImports.externalResultId, normalized.externalResultId)
        )
      );
  }

  public async recordProviderIngress(
    record: LaboratoryResultImportRecord
  ): Promise<LaboratoryProviderIngressPersistenceResult> {
    const normalized = normalizeRecord(record);
    return withTenantQueryExplicit(this.#pool, normalized.accountId, async (client) => {
      const inserted = await client.query<LaboratoryResultImportRow>(
        `INSERT INTO laboratory_result_imports (
           account_id, external_result_id, order_id, equipment_id, provider_code,
           schema_version, signature_key_id, payload_fingerprint, observed_at,
           status, imported_at, result_summary, failure_reason, attempt_count,
           last_attempt_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
         ON CONFLICT (account_id, external_result_id) DO NOTHING
         RETURNING ${RETURNING_COLUMNS}`,
        [
          normalized.accountId,
          normalized.externalResultId,
          normalized.orderId,
          normalized.equipmentId,
          normalized.providerCode,
          normalized.schemaVersion,
          normalized.signatureKeyId,
          normalized.payloadFingerprint,
          normalized.observedAt,
          normalized.status,
          normalized.importedAt,
          normalized.resultSummary,
          normalized.failureReason ?? null,
          normalized.attemptCount ?? 1,
          normalized.lastAttemptAt ?? normalized.importedAt
        ]
      );
      const insertedRow = inserted.rows[0];
      if (insertedRow) return { record: this.#map(insertedRow), replayed: false };

      const existing = await client.query<LaboratoryResultImportRow>(
        `SELECT ${RETURNING_COLUMNS}
           FROM laboratory_result_imports
          WHERE account_id = $1 AND external_result_id = $2
          FOR UPDATE`,
        [normalized.accountId, normalized.externalResultId]
      );
      const existingRow = existing.rows[0];
      if (!existingRow) {
        throw new AppError(
          'LABORATORY_PROVIDER_INGRESS_UNAVAILABLE',
          'Laboratory provider result could not be persisted',
          503
        );
      }
      const existingRecord = this.#map(existingRow);
      if (!isSameProviderPayload(existingRecord, normalized)) throw providerIngressConflict();
      return { record: existingRecord, replayed: true };
    });
  }

  public async findByExternalResultId(
    externalResultId: string,
    accountId: string
  ): Promise<LaboratoryResultImportRecord | null> {
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

  public async list(accountId: string): Promise<readonly LaboratoryResultImportRecord[]> {
    const rows = await this.#db
      .select()
      .from(laboratoryResultImports)
      .where(eq(laboratoryResultImports.accountId, accountId));
    return rows.map((row) => this.#map(row));
  }

  #map(row: LaboratoryResultImportRow | typeof laboratoryResultImports.$inferSelect): LaboratoryResultImportRecord {
    const value = row as Record<string, unknown>;
    const stringValue = (key: string, fallback?: string): string => {
      const candidate = value[key];
      return typeof candidate === 'string' ? candidate : (fallback ?? '');
    };
    const dateValue = (key: string, fallback?: string): string => {
      const candidate = value[key];
      return dateToIso(candidate instanceof Date || typeof candidate === 'string' ? candidate : null, fallback);
    };
    return {
      externalResultId: stringValue('external_result_id', stringValue('externalResultId')),
      orderId: stringValue('order_id', stringValue('orderId')),
      accountId: stringValue('account_id', stringValue('accountId')),
      equipmentId: stringValue('equipment_id', stringValue('equipmentId')),
      providerCode: stringValue('provider_code', stringValue('providerCode', 'equipment-bridge')),
      schemaVersion: stringValue('schema_version', stringValue('schemaVersion', 'legacy')),
      signatureKeyId: stringValue('signature_key_id', stringValue('signatureKeyId', 'legacy')),
      payloadFingerprint: stringValue(
        'payload_fingerprint',
        stringValue('payloadFingerprint', '0'.repeat(64))
      ),
      observedAt: dateValue('observed_at', dateValue('observedAt', dateValue('imported_at', dateValue('importedAt')))),
      status: stringValue('status') as LaboratoryResultImportStatus,
      importedAt: dateValue('imported_at', dateValue('importedAt')),
      resultSummary: stringValue('result_summary', stringValue('resultSummary')),
      failureReason: stringValue('failure_reason', stringValue('failureReason')) || undefined,
      attemptCount:
        typeof value.attempt_count === 'number'
          ? value.attempt_count
          : typeof value.attemptCount === 'number'
            ? value.attemptCount
            : undefined,
      lastAttemptAt: dateValue('last_attempt_at', dateValue('lastAttemptAt'))
    };
  }
}
