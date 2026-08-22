import { apiRequest } from './api';
import type {
  EncounterSummary,
  CreateEncounterRequest,
  TransitionEncounterRequest,
  CloseEncounterRequest,
  EncountersListResponse,
  EncounterTimelineResponse,
  EncounterSummaryResponse,
  EncounterFinancialSummary
} from '@/types/encounter';

export interface EncounterCashReceipt {
  readonly id: string;
  readonly accountId: string;
  readonly encounterId: string;
  readonly billingRecordId: string;
  readonly financialAccountId: string;
  readonly receivableId: string;
  readonly receivablePaymentId: string;
  readonly cashRegisterId: string;
  readonly cashMovementId: string;
  readonly journalEntryId: string;
  readonly amount: number;
  readonly currency: 'BRL';
  readonly receivedAt: string;
  readonly receivedByUserId: string;
  readonly notes?: string;
}

export interface CreateEncounterCashReceiptRequest {
  readonly cashRegisterId: string;
  readonly expectedAmount: number;
  readonly notes?: string;
}

export const encounterService = {
  async list(): Promise<EncounterSummary[]> {
    const response = await apiRequest<EncountersListResponse>('/encounters');
    return response.items ?? [];
  },

  async getById(id: string): Promise<EncounterSummary> {
    return apiRequest<EncounterSummary>(`/encounters/${id}`);
  },

  async create(payload: CreateEncounterRequest): Promise<EncounterSummary> {
    return apiRequest<EncounterSummary>('/encounters', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async transition(id: string, payload: TransitionEncounterRequest): Promise<EncounterSummary> {
    return apiRequest<EncounterSummary>(`/encounters/${id}/transition`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async close(id: string, payload: CloseEncounterRequest): Promise<EncounterSummary> {
    return apiRequest<EncounterSummary>(`/encounters/${id}/close`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async getTimeline(id: string): Promise<EncounterTimelineResponse['items']> {
    const response = await apiRequest<EncounterTimelineResponse>(`/encounters/${id}/timeline`);
    return response.items ?? [];
  },

  async getSummary(id: string): Promise<EncounterSummaryResponse> {
    return apiRequest<EncounterSummaryResponse>(`/encounters/${id}/summary`);
  },

  async getFinancialSummary(id: string): Promise<EncounterFinancialSummary> {
    return apiRequest<EncounterFinancialSummary>(`/encounters/${id}/financial-summary`);
  },

  async closeFinancial(
    id: string,
    payload: {
      notes?: string | null;
      installments?: Array<{ label?: string; amount: number; dueAt?: string | null; notes?: string | null }>;
    }
  ): Promise<EncounterFinancialSummary> {
    return apiRequest<EncounterFinancialSummary>(`/encounters/${id}/financial-close`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async createCashReceipt(
    id: string,
    payload: CreateEncounterCashReceiptRequest,
    idempotencyKey: string
  ): Promise<EncounterCashReceipt> {
    return apiRequest<EncounterCashReceipt>(`/encounters/${id}/cash-receipts`, {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify(payload)
    });
  },

  async getCashReceiptForEncounter(id: string): Promise<EncounterCashReceipt> {
    return apiRequest<EncounterCashReceipt>(`/encounters/${id}/cash-receipts`);
  }
};
