import { apiRequest } from './api';
import type {
  TriageSummary,
  TriageVersionSummary,
  CreateTriageRequest,
  UpdateTriageRequest,
  TriageListResponse,
  TriageHistoryResponse
} from '@/types/triage';

export async function listTriageRecords(encounterId?: string): Promise<TriageSummary[]> {
  const params = encounterId ? `?encounterId=${encodeURIComponent(encounterId)}` : '';
  const response = await apiRequest<TriageListResponse>(`/triage${params}`);
  return response.records;
}

export async function createTriage(payload: CreateTriageRequest): Promise<TriageSummary> {
  return apiRequest<TriageSummary>('/triage', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export async function updateTriage(
  triageId: string,
  payload: UpdateTriageRequest
): Promise<TriageSummary> {
  return apiRequest<TriageSummary>(`/triage/${encodeURIComponent(triageId)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export async function getTriageHistory(triageId: string): Promise<TriageVersionSummary[]> {
  const response = await apiRequest<TriageHistoryResponse>(
    `/triage/${encodeURIComponent(triageId)}/history`
  );
  return response.versions;
}
