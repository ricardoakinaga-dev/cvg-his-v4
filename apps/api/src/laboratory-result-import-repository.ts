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
}

export interface LaboratoryResultImportRepository {
  create(record: LaboratoryResultImportRecord): Promise<void>;
  findByExternalResultId(externalResultId: string): Promise<LaboratoryResultImportRecord | null>;
  list(accountId?: string): Promise<readonly LaboratoryResultImportRecord[]>;
}

function cloneRecord(record: LaboratoryResultImportRecord): LaboratoryResultImportRecord {
  return { ...record };
}

export class InMemoryLaboratoryResultImportRepository implements LaboratoryResultImportRepository {
  readonly #records = new Map<string, LaboratoryResultImportRecord>();

  async create(record: LaboratoryResultImportRecord): Promise<void> {
    this.#records.set(record.externalResultId, cloneRecord(record));
  }

  async findByExternalResultId(externalResultId: string): Promise<LaboratoryResultImportRecord | null> {
    const record = this.#records.get(externalResultId);
    return record ? cloneRecord(record) : null;
  }

  async list(accountId?: string): Promise<readonly LaboratoryResultImportRecord[]> {
    return Array.from(this.#records.values())
      .filter((item) => !accountId || item.accountId === accountId)
      .sort((left, right) => right.importedAt.localeCompare(left.importedAt))
      .map((item) => cloneRecord(item));
  }
}
