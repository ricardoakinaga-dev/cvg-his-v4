/**
 * Clinical Notes API Client
 * 
 * Provides functions for interacting with the clinical notes API endpoints
 */

import { apiClient } from './client';

// Types
export type ClinicalNote = {
  id: string;
  accountId: string;
  encounterId: string;
  patientId: string;
  type: 'soap' | 'progress' | 'procedure' | 'discharge' | 'consultation';
  content: string;
  version: number;
  parentNoteId: string | null;
  authorId: string;
  authorName?: string;
  signedAt: string | null;
  signedBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ClinicalNoteCreateInput = {
  encounterId: string;
  patientId: string;
  type: string;
  content: string;
};

export type ClinicalNoteUpdateInput = {
  content: string;
};

export type ListClinicalNotesParams = {
  page?: number;
  pageSize?: number;
  encounterId?: string;
  patientId?: string;
  type?: string;
};

export type ListClinicalNotesResponse = {
  data: ClinicalNote[];
  page: number;
  pageSize: number;
  total: number;
};

/**
 * List clinical notes with pagination and filters
 */
export async function listClinicalNotes(params: ListClinicalNotesParams = {}): Promise<ListClinicalNotesResponse> {
  return apiClient<ListClinicalNotesResponse>('/clinical-notes', { params });
}

/**
 * Get a clinical note by ID
 */
export async function getClinicalNote(id: string): Promise<ClinicalNote> {
  return apiClient<ClinicalNote>(`/clinical-notes/${id}`);
}

/**
 * Create a new clinical note
 */
export async function createClinicalNote(input: ClinicalNoteCreateInput): Promise<ClinicalNote> {
  return apiClient<ClinicalNote>('/clinical-notes', { method: 'POST', body: input });
}

/**
 * Update a clinical note
 */
export async function updateClinicalNote(id: string, input: ClinicalNoteUpdateInput): Promise<ClinicalNote> {
  return apiClient<ClinicalNote>(`/clinical-notes/${id}`, { method: 'PUT', body: input });
}

/**
 * Create a new version of a clinical note
 */
export async function versionClinicalNote(id: string, input: ClinicalNoteUpdateInput): Promise<ClinicalNote> {
  return apiClient<ClinicalNote>(`/clinical-notes/${id}/version`, { method: 'POST', body: input });
}

/**
 * Sign a clinical note
 */
export async function signClinicalNote(id: string): Promise<ClinicalNote> {
  return apiClient<ClinicalNote>(`/clinical-notes/${id}/sign`, { method: 'POST' });
}
