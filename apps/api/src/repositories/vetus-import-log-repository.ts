import { getPool } from '@cvg-his-v2/shared-database';
import { withTenantQueryExplicit } from '@cvg-his-v2/tenant-context';

export type VetusImportStatus = 'imported' | 'linked';
export type VetusImportBatchStatus = 'dry_run' | 'completed' | 'partial' | 'rolled_back';
export type VetusImportBatchItemStatus =
  | 'pending'
  | 'validated'
  | 'imported'
  | 'linked'
  | 'rejected'
  | 'rolled_back';

export interface VetusImportSummary {
  readonly id: string;
  readonly accountId: string;
  readonly sourceSystem: string;
  readonly sourceReference: string | null;
  readonly status: VetusImportStatus;
  readonly ownerId: string;
  readonly ownerName: string;
  readonly patientId: string;
  readonly patientName: string;
  readonly importedByUserId: string;
  readonly reviewedBy: string | null;
  readonly importedAt: string;
  readonly summary: string;
}

export interface VetusImportBatchSummary {
  readonly id: string;
  readonly accountId: string;
  readonly sourceSystem: string;
  readonly sourceReference: string | null;
  readonly status: VetusImportBatchStatus;
  readonly totalCount: number;
  readonly importedCount: number;
  readonly linkedCount: number;
  readonly rejectedCount: number;
  readonly rolledBackCount: number;
  readonly createdByUserId: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface VetusImportBatchItemSummary {
  readonly id: string;
  readonly accountId: string;
  readonly batchId: string;
  readonly rowNumber: number;
  readonly sourceReference: string | null;
  readonly status: VetusImportBatchItemStatus;
  readonly importLogId: string | null;
  readonly ownerId: string | null;
  readonly patientId: string | null;
  readonly ownerCreated: boolean;
  readonly patientCreated: boolean;
  readonly reason: string | null;
  readonly payload: Record<string, unknown>;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface VetusImportLogRepository {
  list(accountId: string): Promise<readonly VetusImportSummary[]>;
  findBySourceReference(
    accountId: string,
    sourceSystem: string,
    sourceReference: string
  ): Promise<VetusImportSummary | null>;
  create(summary: VetusImportSummary): Promise<VetusImportSummary>;
  listBatches?(accountId: string): Promise<readonly VetusImportBatchSummary[]>;
  findBatch?(accountId: string, batchId: string): Promise<VetusImportBatchSummary | null>;
  findBatchBySourceReference?(
    accountId: string,
    sourceSystem: string,
    sourceReference: string
  ): Promise<VetusImportBatchSummary | null>;
  createBatch?(batch: VetusImportBatchSummary): Promise<VetusImportBatchSummary>;
  updateBatch?(batch: VetusImportBatchSummary): Promise<VetusImportBatchSummary>;
  listBatchItems?(accountId: string, batchId: string): Promise<readonly VetusImportBatchItemSummary[]>;
  createBatchItem?(item: VetusImportBatchItemSummary): Promise<VetusImportBatchItemSummary>;
  updateBatchItem?(item: VetusImportBatchItemSummary): Promise<VetusImportBatchItemSummary>;
}

function mapRow(row: Record<string, unknown>): VetusImportSummary {
  return {
    id: row.id as string,
    accountId: row.account_id as string,
    sourceSystem: row.source_system as string,
    sourceReference: (row.source_reference as string | null) ?? null,
    status: row.status as VetusImportStatus,
    ownerId: row.owner_id as string,
    ownerName: row.owner_name as string,
    patientId: row.patient_id as string,
    patientName: row.patient_name as string,
    importedByUserId: row.imported_by_user_id as string,
    reviewedBy: (row.reviewed_by as string | null) ?? null,
    importedAt: row.imported_at instanceof Date
      ? row.imported_at.toISOString()
      : new Date(String(row.imported_at)).toISOString(),
    summary: row.summary as string
  };
}

function isoDate(value: unknown): string {
  return value instanceof Date ? value.toISOString() : new Date(String(value)).toISOString();
}

function mapBatch(row: Record<string, unknown>): VetusImportBatchSummary {
  return {
    id: row.id as string,
    accountId: row.account_id as string,
    sourceSystem: row.source_system as string,
    sourceReference: (row.source_reference as string | null) ?? null,
    status: row.status as VetusImportBatchStatus,
    totalCount: Number(row.total_count),
    importedCount: Number(row.imported_count),
    linkedCount: Number(row.linked_count),
    rejectedCount: Number(row.rejected_count),
    rolledBackCount: Number(row.rolled_back_count),
    createdByUserId: row.created_by_user_id as string,
    createdAt: isoDate(row.created_at),
    updatedAt: isoDate(row.updated_at)
  };
}

function mapBatchItem(row: Record<string, unknown>): VetusImportBatchItemSummary {
  const payload = row.payload_json;
  return {
    id: row.id as string,
    accountId: row.account_id as string,
    batchId: row.batch_id as string,
    rowNumber: Number(row.row_number),
    sourceReference: (row.source_reference as string | null) ?? null,
    status: row.status as VetusImportBatchItemStatus,
    importLogId: (row.import_log_id as string | null) ?? null,
    ownerId: (row.owner_id as string | null) ?? null,
    patientId: (row.patient_id as string | null) ?? null,
    ownerCreated: Boolean(row.owner_created),
    patientCreated: Boolean(row.patient_created),
    reason: (row.reason as string | null) ?? null,
    payload: payload && typeof payload === 'object' && !Array.isArray(payload)
      ? payload as Record<string, unknown>
      : {},
    createdAt: isoDate(row.created_at),
    updatedAt: isoDate(row.updated_at)
  };
}

export class InMemoryVetusImportLogRepository implements VetusImportLogRepository {
  readonly #items = new Map<string, VetusImportSummary>();
  readonly #batches = new Map<string, VetusImportBatchSummary>();
  readonly #batchItems = new Map<string, VetusImportBatchItemSummary>();

  async list(accountId: string): Promise<readonly VetusImportSummary[]> {
    return [...this.#items.values()]
      .filter((item) => item.accountId === accountId)
      .sort((left, right) => right.importedAt.localeCompare(left.importedAt));
  }

  async findBySourceReference(
    accountId: string,
    sourceSystem: string,
    sourceReference: string
  ): Promise<VetusImportSummary | null> {
    return [...this.#items.values()].find(
      (item) => item.accountId === accountId
        && item.sourceSystem === sourceSystem
        && item.sourceReference === sourceReference
    ) ?? null;
  }

  async create(summary: VetusImportSummary): Promise<VetusImportSummary> {
    this.#items.set(summary.id, summary);
    return summary;
  }

  async listBatches(accountId: string): Promise<readonly VetusImportBatchSummary[]> {
    return [...this.#batches.values()]
      .filter((batch) => batch.accountId === accountId)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  async findBatch(accountId: string, batchId: string): Promise<VetusImportBatchSummary | null> {
    const batch = this.#batches.get(batchId);
    return batch?.accountId === accountId ? batch : null;
  }

  async findBatchBySourceReference(
    accountId: string,
    sourceSystem: string,
    sourceReference: string
  ): Promise<VetusImportBatchSummary | null> {
    return [...this.#batches.values()].find(
      (batch) => batch.accountId === accountId
        && batch.sourceSystem === sourceSystem
        && batch.sourceReference === sourceReference
    ) ?? null;
  }

  async createBatch(batch: VetusImportBatchSummary): Promise<VetusImportBatchSummary> {
    this.#batches.set(batch.id, batch);
    return batch;
  }

  async updateBatch(batch: VetusImportBatchSummary): Promise<VetusImportBatchSummary> {
    this.#batches.set(batch.id, batch);
    return batch;
  }

  async listBatchItems(accountId: string, batchId: string): Promise<readonly VetusImportBatchItemSummary[]> {
    return [...this.#batchItems.values()]
      .filter((item) => item.accountId === accountId && item.batchId === batchId)
      .sort((left, right) => left.rowNumber - right.rowNumber);
  }

  async createBatchItem(item: VetusImportBatchItemSummary): Promise<VetusImportBatchItemSummary> {
    this.#batchItems.set(item.id, item);
    return item;
  }

  async updateBatchItem(item: VetusImportBatchItemSummary): Promise<VetusImportBatchItemSummary> {
    this.#batchItems.set(item.id, item);
    return item;
  }
}

export class DatabaseVetusImportLogRepository implements VetusImportLogRepository {
  async list(accountId: string): Promise<readonly VetusImportSummary[]> {
    return withTenantQueryExplicit(getPool(), accountId, async (client) => {
      const result = await client.query(
        `SELECT * FROM vetus_import_logs
         WHERE account_id = $1
         ORDER BY imported_at DESC, id DESC`,
        [accountId]
      );
      return result.rows.map((row) => mapRow(row as Record<string, unknown>));
    });
  }

  async findBySourceReference(
    accountId: string,
    sourceSystem: string,
    sourceReference: string
  ): Promise<VetusImportSummary | null> {
    return withTenantQueryExplicit(getPool(), accountId, async (client) => {
      const result = await client.query(
        `SELECT * FROM vetus_import_logs
         WHERE account_id = $1 AND source_system = $2 AND source_reference = $3
         LIMIT 1`,
        [accountId, sourceSystem, sourceReference]
      );
      return result.rows.length === 0
        ? null
        : mapRow(result.rows[0] as Record<string, unknown>);
    });
  }

  async create(summary: VetusImportSummary): Promise<VetusImportSummary> {
    return withTenantQueryExplicit(getPool(), summary.accountId, async (client) => {
      const result = await client.query(
        `INSERT INTO vetus_import_logs (
          id, account_id, source_system, source_reference, status, owner_id, owner_name,
          patient_id, patient_name, imported_by_user_id, reviewed_by, imported_at, summary
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *`,
        [
          summary.id,
          summary.accountId,
          summary.sourceSystem,
          summary.sourceReference,
          summary.status,
          summary.ownerId,
          summary.ownerName,
          summary.patientId,
          summary.patientName,
          summary.importedByUserId,
          summary.reviewedBy,
          summary.importedAt,
          summary.summary
        ]
      );
      return mapRow(result.rows[0] as Record<string, unknown>);
    });
  }

  async listBatches(accountId: string): Promise<readonly VetusImportBatchSummary[]> {
    return withTenantQueryExplicit(getPool(), accountId, async (client) => {
      const result = await client.query(
        `SELECT * FROM vetus_import_batches
         WHERE account_id = $1
         ORDER BY updated_at DESC, id DESC`,
        [accountId]
      );
      return result.rows.map((row) => mapBatch(row as Record<string, unknown>));
    });
  }

  async findBatch(accountId: string, batchId: string): Promise<VetusImportBatchSummary | null> {
    return withTenantQueryExplicit(getPool(), accountId, async (client) => {
      const result = await client.query(
        'SELECT * FROM vetus_import_batches WHERE account_id = $1 AND id = $2 LIMIT 1',
        [accountId, batchId]
      );
      return result.rows.length === 0 ? null : mapBatch(result.rows[0] as Record<string, unknown>);
    });
  }

  async findBatchBySourceReference(
    accountId: string,
    sourceSystem: string,
    sourceReference: string
  ): Promise<VetusImportBatchSummary | null> {
    return withTenantQueryExplicit(getPool(), accountId, async (client) => {
      const result = await client.query(
        `SELECT * FROM vetus_import_batches
         WHERE account_id = $1 AND source_system = $2 AND source_reference = $3
         LIMIT 1`,
        [accountId, sourceSystem, sourceReference]
      );
      return result.rows.length === 0 ? null : mapBatch(result.rows[0] as Record<string, unknown>);
    });
  }

  async createBatch(batch: VetusImportBatchSummary): Promise<VetusImportBatchSummary> {
    return withTenantQueryExplicit(getPool(), batch.accountId, async (client) => {
      const result = await client.query(
        `INSERT INTO vetus_import_batches (
          id, account_id, source_system, source_reference, status, total_count,
          imported_count, linked_count, rejected_count, rolled_back_count,
          created_by_user_id, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *`,
        [
          batch.id,
          batch.accountId,
          batch.sourceSystem,
          batch.sourceReference,
          batch.status,
          batch.totalCount,
          batch.importedCount,
          batch.linkedCount,
          batch.rejectedCount,
          batch.rolledBackCount,
          batch.createdByUserId,
          batch.createdAt,
          batch.updatedAt
        ]
      );
      return mapBatch(result.rows[0] as Record<string, unknown>);
    });
  }

  async updateBatch(batch: VetusImportBatchSummary): Promise<VetusImportBatchSummary> {
    return withTenantQueryExplicit(getPool(), batch.accountId, async (client) => {
      const result = await client.query(
        `UPDATE vetus_import_batches SET
          status = $3, total_count = $4, imported_count = $5, linked_count = $6,
          rejected_count = $7, rolled_back_count = $8, updated_at = $9
         WHERE account_id = $1 AND id = $2
         RETURNING *`,
        [
          batch.accountId,
          batch.id,
          batch.status,
          batch.totalCount,
          batch.importedCount,
          batch.linkedCount,
          batch.rejectedCount,
          batch.rolledBackCount,
          batch.updatedAt
        ]
      );
      if (result.rows.length === 0) throw new Error('Vetus import batch could not be updated');
      return mapBatch(result.rows[0] as Record<string, unknown>);
    });
  }

  async listBatchItems(accountId: string, batchId: string): Promise<readonly VetusImportBatchItemSummary[]> {
    return withTenantQueryExplicit(getPool(), accountId, async (client) => {
      const result = await client.query(
        `SELECT * FROM vetus_import_batch_items
         WHERE account_id = $1 AND batch_id = $2
         ORDER BY row_number ASC`,
        [accountId, batchId]
      );
      return result.rows.map((row) => mapBatchItem(row as Record<string, unknown>));
    });
  }

  async createBatchItem(item: VetusImportBatchItemSummary): Promise<VetusImportBatchItemSummary> {
    return withTenantQueryExplicit(getPool(), item.accountId, async (client) => {
      const result = await client.query(
        `INSERT INTO vetus_import_batch_items (
          id, account_id, batch_id, row_number, source_reference, status, import_log_id,
          owner_id, patient_id, owner_created, patient_created, reason, payload_json,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb, $14, $15)
        RETURNING *`,
        [
          item.id,
          item.accountId,
          item.batchId,
          item.rowNumber,
          item.sourceReference,
          item.status,
          item.importLogId,
          item.ownerId,
          item.patientId,
          item.ownerCreated,
          item.patientCreated,
          item.reason,
          JSON.stringify(item.payload),
          item.createdAt,
          item.updatedAt
        ]
      );
      return mapBatchItem(result.rows[0] as Record<string, unknown>);
    });
  }

  async updateBatchItem(item: VetusImportBatchItemSummary): Promise<VetusImportBatchItemSummary> {
    return withTenantQueryExplicit(getPool(), item.accountId, async (client) => {
      const result = await client.query(
        `UPDATE vetus_import_batch_items SET
          status = $3, import_log_id = $4, owner_id = $5, patient_id = $6,
          owner_created = $7, patient_created = $8, reason = $9, payload_json = $10::jsonb,
          updated_at = $11
         WHERE account_id = $1 AND id = $2
         RETURNING *`,
        [
          item.accountId,
          item.id,
          item.status,
          item.importLogId,
          item.ownerId,
          item.patientId,
          item.ownerCreated,
          item.patientCreated,
          item.reason,
          JSON.stringify(item.payload),
          item.updatedAt
        ]
      );
      if (result.rows.length === 0) throw new Error('Vetus import batch item could not be updated');
      return mapBatchItem(result.rows[0] as Record<string, unknown>);
    });
  }
}
