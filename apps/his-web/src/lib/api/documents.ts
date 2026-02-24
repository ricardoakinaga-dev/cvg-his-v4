/**
 * Documents API Client
 * 
 * Provides functions for interacting with the documents API endpoints
 */

import { apiClient } from './client';

// Types
export type Document = {
  id: string;
  accountId: string;
  filename: string;
  mimeType: string;
  size: number;
  storageKey: string | null;
  uploadedBy: string;
  uploadedByName?: string;
  createdAt: string;
};

export type DocumentCreateInput = {
  filename: string;
  mimeType: string;
  size: number;
};

export type ListDocumentsParams = {
  page?: number;
  pageSize?: number;
  encounterId?: string;
  patientId?: string;
};

export type ListDocumentsResponse = {
  data: Document[];
  page: number;
  pageSize: number;
  total: number;
};

/**
 * List documents with pagination and filters
 */
export async function listDocuments(params: ListDocumentsParams = {}): Promise<ListDocumentsResponse> {
  return apiClient<ListDocumentsResponse>('/documents', { params });
}

/**
 * Get a document by ID
 */
export async function getDocument(id: string): Promise<Document> {
  return apiClient<Document>(`/documents/${id}`);
}

/**
 * Create a new document metadata
 */
export async function createDocument(input: DocumentCreateInput): Promise<Document> {
  return apiClient<Document>('/documents', { method: 'POST', body: input });
}

/**
 * Attach a document to an encounter
 */
export async function attachDocumentToEncounter(encounterId: string, documentId: string): Promise<{ encounterId: string; documentId: string }> {
  return apiClient<{ encounterId: string; documentId: string }>(`/documents/${documentId}/attach-encounter`, { method: 'POST', body: { encounterId } });
}
