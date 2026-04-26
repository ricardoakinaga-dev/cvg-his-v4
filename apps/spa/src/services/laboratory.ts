import type {
  CreateDiagnosticOrderRequest,
  CreateLaboratoryReferenceValueRequest,
  DiagnosticOrderListResponse,
  LaboratoryEquipmentListResponse,
  LaboratoryReferenceValueListResponse,
  LaboratoryReportTypeListResponse,
  RecordDiagnosticResultRequest,
  CreateLaboratoryReportTypeRequest,
  UpdateLaboratoryReferenceValueRequest,
  UpdateLaboratoryReportTypeRequest
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

export interface LaboratoryReportTypeListFilters {
  code?: string;
  description?: string;
  category?: string;
  status?: 'active' | 'inactive' | '';
}

export type CreateLaboratoryReportTypePayload = CreateLaboratoryReportTypeRequest;

export type UpdateLaboratoryReportTypePayload = UpdateLaboratoryReportTypeRequest;

export interface LaboratoryReferenceValueListFilters {
  examType?: string;
  id?: string;
  parameter?: string;
  unit?: string;
}

export type CreateLaboratoryReferenceValuePayload = CreateLaboratoryReferenceValueRequest;

export type UpdateLaboratoryReferenceValuePayload = UpdateLaboratoryReferenceValueRequest;

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

  async listReportTypes(filters?: LaboratoryReportTypeListFilters): Promise<LaboratoryReportTypeSummary[]> {
    const response = await apiRequest<LaboratoryReportTypeListResponse>(
      `/laboratory/report-types${buildQuery({
        code: filters?.code,
        description: filters?.description,
        category: filters?.category,
        status: filters?.status || undefined
      })}`
    );
    return [...(response.items ?? [])].sort((left, right) => left.name.localeCompare(right.name));
  },

  async getReportType(reportTypeId: string): Promise<LaboratoryReportTypeSummary> {
    return apiRequest<LaboratoryReportTypeSummary>(`/laboratory/report-types/${reportTypeId}`);
  },

  async createReportType(payload: CreateLaboratoryReportTypePayload): Promise<LaboratoryReportTypeSummary> {
    return apiRequest<LaboratoryReportTypeSummary>('/laboratory/report-types', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async updateReportType(
    reportTypeId: string,
    payload: UpdateLaboratoryReportTypePayload
  ): Promise<LaboratoryReportTypeSummary> {
    return apiRequest<LaboratoryReportTypeSummary>(`/laboratory/report-types/${reportTypeId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  },

  async listReferenceValues(filterExam?: string | LaboratoryReferenceValueListFilters): Promise<LaboratoryReferenceValueSummary[]> {
    const filters = typeof filterExam === 'string'
      ? ({ examType: filterExam } satisfies LaboratoryReferenceValueListFilters)
      : filterExam;
    const response = await apiRequest<LaboratoryReferenceValueListResponse>(
      `/laboratory/reference-values${buildQuery({
        examType: filters?.examType,
        id: filters?.id,
        parameter: filters?.parameter,
        unit: filters?.unit
      })}`
    );
    return [...(response.items ?? [])].sort((left, right) =>
      left.parameter.localeCompare(right.parameter)
    );
  },

  async listHemogramReferenceValues(
    filters?: Omit<LaboratoryReferenceValueListFilters, 'examType'>
  ): Promise<LaboratoryReferenceValueSummary[]> {
    const response = await apiRequest<LaboratoryReferenceValueListResponse>(
      `/laboratory/hemogram-reference-values${buildQuery({
        id: filters?.id,
        parameter: filters?.parameter,
        unit: filters?.unit
      })}`
    );
    return [...(response.items ?? [])].sort((left, right) =>
      left.parameter.localeCompare(right.parameter)
    );
  },

  async getReferenceValue(referenceValueId: string): Promise<LaboratoryReferenceValueSummary> {
    return apiRequest<LaboratoryReferenceValueSummary>(`/laboratory/reference-values/${referenceValueId}`);
  },

  async createHemogramReferenceValue(
    payload: Omit<CreateLaboratoryReferenceValuePayload, 'examType'>
  ): Promise<LaboratoryReferenceValueSummary> {
    return apiRequest<LaboratoryReferenceValueSummary>('/laboratory/hemogram-reference-values', {
      method: 'POST',
      body: JSON.stringify({ ...payload, examType: 'HEM' })
    });
  },

  async updateReferenceValue(
    referenceValueId: string,
    payload: UpdateLaboratoryReferenceValuePayload
  ): Promise<LaboratoryReferenceValueSummary> {
    return apiRequest<LaboratoryReferenceValueSummary>(`/laboratory/reference-values/${referenceValueId}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });
  }
};
