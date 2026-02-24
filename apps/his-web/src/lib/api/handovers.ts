/**
 * Handovers API Client
 * 
 * Provides functions for interacting with the handovers API endpoints
 */

import { apiClient } from './client';

// Types
export type Handover = {
  id: string;
  accountId: string;
  wardId: string;
  wardName?: string;
  status: 'draft' | 'published' | 'build_failed';
  createdBy: string;
  createdByName?: string;
  publishedAt: string | null;
  publishedBy: string | null;
  staySummaries: Array<{
    stayId: string;
    patientId: string;
    patientName: string;
    summary: string;
    pendingTasks: string[];
    alerts: string[];
  }>;
  createdAt: string;
  updatedAt: string;
};

export type HandoverDocument = {
  id: string;
  handoverId: string;
  content: string;
  format: 'markdown' | 'html';
  createdAt: string;
};

export type HandoverDraftInput = {
  wardId: string;
  staySummaries: Array<{
    stayId: string;
    summary: string;
    pendingTasks?: string[];
    alerts?: string[];
  }>;
};

export type ListHandoversParams = {
  wardId?: string;
  status?: string;
  page?: number;
  pageSize?: number;
};

export type ListHandoversResponse = {
  data: Handover[];
  page: number;
  pageSize: number;
  total: number;
};

/**
 * Create a handover draft
 */
export async function createHandoverDraft(input: HandoverDraftInput): Promise<Handover> {
  return apiClient<Handover>('/handovers/draft', { method: 'POST', body: input });
}

/**
 * Publish a handover
 */
export async function publishHandover(id: string): Promise<Handover & { queue: string; jobId: string }> {
  return apiClient<Handover & { queue: string; jobId: string }>(`/handovers/${id}/publish`, { method: 'POST' });
}

/**
 * Get latest handover for a ward
 */
export async function getLatestHandover(wardId: string): Promise<Handover> {
  return apiClient<Handover>('/handovers/latest', { params: { wardId } });
}

/**
 * Get a handover by ID
 */
export async function getHandover(id: string): Promise<Handover> {
  return apiClient<Handover>(`/handovers/${id}`);
}

/**
 * Get handover document
 */
export async function getHandoverDocument(id: string): Promise<HandoverDocument> {
  return apiClient<HandoverDocument>(`/handovers/${id}/document`);
}
