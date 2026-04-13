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

export const laboratoryService = {
  async listOrders(encounterId?: string): Promise<DiagnosticOrderSummary[]> {
    const response = await apiRequest<DiagnosticOrderListResponse>(
      `/laboratory/orders${buildQuery({ encounterId })}`
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

  async listResults(filterType?: string): Promise<DiagnosticOrderSummary[]> {
    const orders = await this.listOrders();
    const normalizedFilter = normalizeText(filterType);

    return orders.filter((order) => {
      const matchesType =
        !normalizedFilter ||
        normalizeText(order.examType).includes(normalizedFilter) ||
        normalizeText(order.examCatalogId).includes(normalizedFilter);

      const hasResult = order.status === 'resulted' || Boolean(order.resultSummary);
      return matchesType && hasResult;
    });
  },

  async getDashboardSummary(): Promise<LaboratoryDashboardSummary> {
    return apiRequest<LaboratoryDashboardSummary>('/laboratory/summary');
  },

  async listEquipment(): Promise<LaboratoryEquipmentSummary[]> {
    const response = await apiRequest<LaboratoryEquipmentListResponse>('/laboratory/equipment');
    return [...(response.items ?? [])].sort((left, right) => left.name.localeCompare(right.name));
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
