import type {
  CreateDiagnosticOrderRequest,
  DiagnosticOrderListResponse,
  LaboratoryEquipmentListResponse,
  LaboratoryReferenceValueListResponse,
  LaboratoryReportTypeListResponse,
  RecordDiagnosticResultRequest
} from '@cvg-his-v2/shared-contracts';
import type {
  DiagnosticOrderSummary,
  LaboratoryDashboardSummary,
  LaboratoryEquipmentSummary,
  LaboratoryReferenceValueSummary,
  LaboratoryReportTypeSummary
} from '@cvg-his-v2/shared-types';
import { apiRequest } from './api';

function normalizeText(value: string | undefined): string {
  return (value ?? '').normalize('NFD').replace(/\p{Diacritic}/gu, '').toUpperCase();
}

function buildQuery(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      search.set(key, value);
    }
  }

  const query = search.toString();
  return query.length > 0 ? `?${query}` : '';
}

export {
  type LaboratoryDashboardSummary,
  type LaboratoryEquipmentSummary,
  type LaboratoryReportTypeSummary,
  type LaboratoryReferenceValueSummary
};

export interface LaboratoryOrderListFilters {
  encounterId?: string;
  patientId?: string;
  animal?: string;
  date?: string;
  id?: string;
}

export interface LaboratoryReportListFilters {
  examType?: string;
  code?: string;
  patientId?: string;
  animal?: string;
  finalizedAt?: string;
  enteredAt?: string;
  body?: string;
  closed?: boolean;
}

export interface LaboratoryEquipmentListFilters {
  id?: string;
  description?: string;
  type?: string;
  status?: 'active' | 'maintenance' | '';
}

export interface CreateLaboratoryEquipmentPayload {
  name: string;
  type: string;
  serialNumber: string;
  status?: 'active' | 'maintenance';
  lastCalibrationAt: string;
}

export type UpdateLaboratoryEquipmentPayload = Partial<CreateLaboratoryEquipmentPayload>;

export const laboratoryService = {
  async listOrders(filters?: string | LaboratoryOrderListFilters): Promise<DiagnosticOrderSummary[]> {
    const normalizedFilters =
      typeof filters === 'string'
        ? ({ encounterId: filters } satisfies LaboratoryOrderListFilters)
        : filters;
    const response = await apiRequest<DiagnosticOrderListResponse>(
      `/laboratory/orders${buildQuery({
        encounterId: normalizedFilters?.encounterId,
        patientId: normalizedFilters?.patientId,
        animal: normalizedFilters?.animal,
        date: normalizedFilters?.date,
        id: normalizedFilters?.id
      })}`
    );
    return [...(response.items ?? [])].sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt)
    );
  },

  async createOrder(payload: CreateDiagnosticOrderRequest): Promise<DiagnosticOrderSummary> {
    return apiRequest<DiagnosticOrderSummary>('/laboratory/orders', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async recordResult(
    orderId: string,
    payload: RecordDiagnosticResultRequest
  ): Promise<DiagnosticOrderSummary> {
    return apiRequest<DiagnosticOrderSummary>(`/laboratory/orders/${orderId}/result`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async listResults(filters?: string | LaboratoryReportListFilters): Promise<DiagnosticOrderSummary[]> {
    const normalizedFilters =
      typeof filters === 'string'
        ? ({ examType: filters } satisfies LaboratoryReportListFilters)
        : filters;
    const response = await apiRequest<DiagnosticOrderListResponse>(
      `/laboratory/results${buildQuery({
        examType: normalizedFilters?.examType,
        code: normalizedFilters?.code,
        patientId: normalizedFilters?.patientId,
        animal: normalizedFilters?.animal,
        finalizedAt: normalizedFilters?.finalizedAt,
        enteredAt: normalizedFilters?.enteredAt,
        body: normalizedFilters?.body,
        closed: typeof normalizedFilters?.closed === 'boolean'
          ? String(normalizedFilters.closed)
          : undefined
      })}`
    );
    return [...(response.items ?? [])].sort((left, right) =>
      right.updatedAt.localeCompare(left.updatedAt)
    );
  },

  async listHemograms(filters?: LaboratoryReportListFilters): Promise<DiagnosticOrderSummary[]> {
    const response = await apiRequest<DiagnosticOrderListResponse>(
      `/laboratory/hemograms${buildQuery({
        examType: filters?.examType ?? 'HEM',
        code: filters?.code,
        patientId: filters?.patientId,
        animal: filters?.animal,
        finalizedAt: filters?.finalizedAt,
        enteredAt: filters?.enteredAt,
        body: filters?.body,
        closed: typeof filters?.closed === 'boolean'
          ? String(filters.closed)
          : undefined
      })}`
    );
    return [...(response.items ?? [])].sort((left, right) =>
      right.updatedAt.localeCompare(left.updatedAt)
    );
  },

  async listUrinalysis(filters?: LaboratoryReportListFilters): Promise<DiagnosticOrderSummary[]> {
    const response = await apiRequest<DiagnosticOrderListResponse>(
      `/laboratory/urinalysis${buildQuery({
        examType: filters?.examType ?? 'URIN',
        code: filters?.code,
        patientId: filters?.patientId,
        animal: filters?.animal,
        finalizedAt: filters?.finalizedAt,
        enteredAt: filters?.enteredAt,
        body: filters?.body,
        closed: typeof filters?.closed === 'boolean'
          ? String(filters.closed)
          : undefined
      })}`
    );
    return [...(response.items ?? [])].sort((left, right) =>
      right.updatedAt.localeCompare(left.updatedAt)
    );
  },

  async listBiochemistry(filters?: LaboratoryReportListFilters): Promise<DiagnosticOrderSummary[]> {
    const response = await apiRequest<DiagnosticOrderListResponse>(
      `/laboratory/biochemistry${buildQuery({
        examType: filters?.examType ?? 'BIO',
        code: filters?.code,
        patientId: filters?.patientId,
        animal: filters?.animal,
        finalizedAt: filters?.finalizedAt,
        enteredAt: filters?.enteredAt,
        body: filters?.body,
        closed: typeof filters?.closed === 'boolean'
          ? String(filters.closed)
          : undefined
      })}`
    );
    return [...(response.items ?? [])].sort((left, right) =>
      right.updatedAt.localeCompare(left.updatedAt)
    );
  },

  async getDashboardSummary(): Promise<LaboratoryDashboardSummary> {
    return apiRequest<LaboratoryDashboardSummary>('/laboratory/summary');
  },

  async listEquipment(filters?: LaboratoryEquipmentListFilters): Promise<LaboratoryEquipmentSummary[]> {
    const response = await apiRequest<LaboratoryEquipmentListResponse>(
      `/laboratory/equipment${buildQuery({
        id: filters?.id,
        description: filters?.description,
        type: filters?.type,
        status: filters?.status || undefined
      })}`
    );
    return [...(response.items ?? [])].sort((left, right) => left.name.localeCompare(right.name));
  },

  async getEquipment(equipmentId: string): Promise<LaboratoryEquipmentSummary> {
    return apiRequest<LaboratoryEquipmentSummary>(`/laboratory/equipment/${equipmentId}`);
  },

  async createEquipment(payload: CreateLaboratoryEquipmentPayload): Promise<LaboratoryEquipmentSummary> {
    return apiRequest<LaboratoryEquipmentSummary>('/laboratory/equipment', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async updateEquipment(
    equipmentId: string,
    payload: UpdateLaboratoryEquipmentPayload
  ): Promise<LaboratoryEquipmentSummary> {
    return apiRequest<LaboratoryEquipmentSummary>(`/laboratory/equipment/${equipmentId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  },

  async listReportTypes(): Promise<LaboratoryReportTypeSummary[]> {
    const response = await apiRequest<LaboratoryReportTypeListResponse>('/laboratory/report-types');
    return [...(response.items ?? [])].sort((left, right) => left.name.localeCompare(right.name));
  },

  async listReferenceValues(filterExam?: string): Promise<LaboratoryReferenceValueSummary[]> {
    const response = await apiRequest<LaboratoryReferenceValueListResponse>(
      `/laboratory/reference-values${buildQuery({ examType: filterExam })}`
    );
    return [...(response.items ?? [])].sort((left, right) =>
      left.parameter.localeCompare(right.parameter)
    );
  }
};
