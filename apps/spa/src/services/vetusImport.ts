import { apiRequest } from './api';

export type VetusImportStatus = 'imported' | 'linked';
export type VetusPatientSex = 'male' | 'female' | 'unknown';
export type VetusImportBatchStatus = 'dry_run' | 'completed' | 'partial' | 'rolled_back';
export type VetusImportBatchItemStatus =
  | 'pending'
  | 'validated'
  | 'imported'
  | 'linked'
  | 'rejected'
  | 'rolled_back';

export interface VetusImportOwnerInput {
  readonly legacyVetusId?: string;
  readonly fullName: string;
  readonly documentId?: string;
  readonly phone?: string;
  readonly email?: string;
  readonly originalCreatedAt?: string;
}

export interface VetusImportPatientInput {
  readonly legacyVetusId?: string;
  readonly name: string;
  readonly species: string;
  readonly breed?: string;
  readonly sex?: VetusPatientSex;
  readonly baseWeightKg?: number;
  readonly generalNotes?: string;
  readonly originalCreatedAt?: string;
}

export interface CreateVetusImportRequest {
  readonly sourceSystem?: string;
  readonly sourceReference?: string;
  readonly reviewedBy?: string;
  readonly owner: VetusImportOwnerInput;
  readonly patient: VetusImportPatientInput;
}

export interface CreateVetusImportBatchRequest {
  readonly sourceSystem?: string;
  readonly sourceReference?: string;
  readonly dryRun?: boolean;
  readonly resumeBatchId?: string;
  readonly items?: readonly CreateVetusImportRequest[];
}

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

export interface VetusImportBatchResult {
  readonly batch: VetusImportBatchSummary;
  readonly items: readonly VetusImportBatchItemSummary[];
}

interface VetusImportListResponse {
  readonly items: readonly VetusImportSummary[];
}

interface VetusImportBatchListResponse {
  readonly items: readonly VetusImportBatchSummary[];
}

export const vetusImportService = {
  async list(): Promise<VetusImportSummary[]> {
    const response = await apiRequest<VetusImportListResponse>('/vetus-imports');
    return [...(response.items ?? [])];
  },

  async create(payload: CreateVetusImportRequest): Promise<VetusImportSummary> {
    return apiRequest<VetusImportSummary>('/vetus-imports', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async listBatches(): Promise<VetusImportBatchSummary[]> {
    const response = await apiRequest<VetusImportBatchListResponse>('/vetus-import-batches');
    return [...(response.items ?? [])];
  },

  async createBatch(payload: CreateVetusImportBatchRequest): Promise<VetusImportBatchResult> {
    return apiRequest<VetusImportBatchResult>('/vetus-import-batches', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async getBatch(batchId: string): Promise<VetusImportBatchResult> {
    return apiRequest<VetusImportBatchResult>(`/vetus-import-batches/${encodeURIComponent(batchId)}`);
  },

  async rollbackBatch(batchId: string): Promise<VetusImportBatchResult> {
    return apiRequest<VetusImportBatchResult>(
      `/vetus-import-batches/${encodeURIComponent(batchId)}/rollback`,
      { method: 'POST' }
    );
  }
};
