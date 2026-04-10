import { apiRequest } from './api';
import type {
  CreatePrescriptionExecutionRequest,
  ExecutePrescriptionRequest,
  LogAdministrationEventRequest,
  PrescriptionExecutionListResponse,
  SuspendPrescriptionRequest
} from '@cvg-his-v2/shared-contracts';
import type {
  AdministrationEventSummary,
  PrescriptionExecutionSummary
} from '@cvg-his-v2/shared-types';

export const prescriptionExecutionsService = {
  async list(filters?: { encounterId?: string; patientId?: string }): Promise<PrescriptionExecutionSummary[]> {
    const params = new URLSearchParams();
    if (filters?.encounterId) {
      params.set('encounterId', filters.encounterId);
    }
    if (filters?.patientId) {
      params.set('patientId', filters.patientId);
    }
    const query = params.toString();
    const response = await apiRequest<PrescriptionExecutionListResponse>(
      `/prescription-executions${query ? `?${query}` : ''}`
    );
    return [...(response.items ?? [])];
  },

  async getById(executionId: string): Promise<PrescriptionExecutionSummary & { events: readonly AdministrationEventSummary[] }> {
    return apiRequest<PrescriptionExecutionSummary & { events: readonly AdministrationEventSummary[] }>(
      `/prescription-executions/${executionId}`
    );
  },

  async create(payload: CreatePrescriptionExecutionRequest): Promise<PrescriptionExecutionSummary> {
    return apiRequest<PrescriptionExecutionSummary>('/prescription-executions', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async execute(executionId: string, payload: ExecutePrescriptionRequest): Promise<PrescriptionExecutionSummary> {
    return apiRequest<PrescriptionExecutionSummary>(`/prescription-executions/${executionId}/execute`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async suspend(executionId: string, payload: SuspendPrescriptionRequest): Promise<PrescriptionExecutionSummary> {
    return apiRequest<PrescriptionExecutionSummary>(`/prescription-executions/${executionId}/suspend`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async resume(executionId: string): Promise<PrescriptionExecutionSummary> {
    return apiRequest<PrescriptionExecutionSummary>(`/prescription-executions/${executionId}/resume`, {
      method: 'POST'
    });
  },

  async logEvent(executionId: string, payload: LogAdministrationEventRequest): Promise<AdministrationEventSummary> {
    return apiRequest<AdministrationEventSummary>(`/prescription-executions/${executionId}/log`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }
};
