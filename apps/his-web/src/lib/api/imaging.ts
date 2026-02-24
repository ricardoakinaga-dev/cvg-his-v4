/**
 * Imaging API Client
 * 
 * Provides functions for interacting with the imaging API endpoints
 */

import { apiClient } from './client';

// Types
export type ImagingModality = {
  id: string;
  accountId: string;
  code: string;
  name: string;
  description: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ImagingTemplate = {
  id: string;
  accountId: string;
  modalityId: string;
  modalityName?: string;
  code: string;
  name: string;
  description: string | null;
  templateContent: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ImagingOrder = {
  id: string;
  accountId: string;
  patientId: string;
  patientName?: string;
  modalityId: string;
  modalityName?: string;
  requestedBy: string | null;
  requestedByName?: string;
  status: 'pending' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  scheduledAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ImagingStudy = {
  id: string;
  accountId: string;
  orderId: string;
  patientId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  startedAt: string | null;
  completedAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ImagingReport = {
  id: string;
  accountId: string;
  orderId: string;
  patientId: string;
  status: 'draft' | 'final' | 'signed';
  signedAt: string | null;
  signedBy: string | null;
  signedByName?: string;
  content: string | null;
  createdAt: string;
  updatedAt: string;
};

// Modality Types
export type ListImagingModalitiesParams = {
  page?: number;
  pageSize?: number;
  q?: string;
  active?: boolean;
};

export type ListImagingModalitiesResponse = {
  data: ImagingModality[];
  page: number;
  pageSize: number;
  total: number;
};

export async function listImagingModalities(params: ListImagingModalitiesParams = {}): Promise<ListImagingModalitiesResponse> {
  return apiClient<ListImagingModalitiesResponse>('/imaging/modalities', { params });
}

export async function getImagingModality(id: string): Promise<ImagingModality> {
  return apiClient<ImagingModality>(`/imaging/modalities/${id}`);
}

export async function createImagingModality(input: Omit<ImagingModality, 'id'>): Promise<ImagingModality> {
  return apiClient<ImagingModality>('/imaging/modalities', { method: 'POST', body: input });
}

export async function updateImagingModality(id: string, input: Partial<Omit<ImagingModality, 'id'>>): Promise<ImagingModality> {
  return apiClient<ImagingModality>(`/imaging/modalities/${id}`, { method: 'PUT', body: input });
}

export async function deleteImagingModality(id: string): Promise<void> {
  return apiClient<void>(`/imaging/modalities/${id}`, { method: 'DELETE' });
}

// Template Types
export type ListImagingTemplatesParams = {
  page?: number;
  pageSize?: number;
  modalityId?: string;
  q?: string;
  active?: boolean;
};

export type ListImagingTemplatesResponse = {
  data: ImagingTemplate[];
  page: number;
  pageSize: number;
  total: number;
};

export async function listImagingTemplates(params: ListImagingTemplatesParams = {}): Promise<ListImagingTemplatesResponse> {
  return apiClient<ListImagingTemplatesResponse>('/imaging/templates', { params });
}

export async function getImagingTemplate(id: string): Promise<ImagingTemplate> {
  return apiClient<ImagingTemplate>(`/imaging/templates/${id}`);
}

export async function createImagingTemplate(input: Omit<ImagingTemplate, 'id'>): Promise<ImagingTemplate> {
  return apiClient<ImagingTemplate>('/imaging/templates', { method: 'POST', body: input });
}

export async function updateImagingTemplate(id: string, input: Partial<Omit<ImagingTemplate, 'id'>>): Promise<ImagingTemplate> {
  return apiClient<ImagingTemplate>(`/imaging/templates/${id}`, { method: 'PUT', body: input });
}

export async function deleteImagingTemplate(id: string): Promise<void> {
  return apiClient<void>(`/imaging/templates/${id}`, { method: 'DELETE' });
}

// Order Types
export type ImagingOrderCreateInput = {
  patientId: string;
  modalityId: string;
  requestedBy?: string;
  notes?: string;
};

export type ImagingOrderUpdateInput = {
  notes?: string;
};

export type ListImagingOrdersParams = {
  page?: number;
  pageSize?: number;
  patientId?: string;
  status?: string;
};

export type ListImagingOrdersResponse = {
  data: ImagingOrder[];
  page: number;
  pageSize: number;
  total: number;
};

export async function listImagingOrders(params: ListImagingOrdersParams = {}): Promise<ListImagingOrdersResponse> {
  return apiClient<ListImagingOrdersResponse>('/imaging/orders', { params });
}

export async function getImagingOrder(id: string): Promise<ImagingOrder> {
  return apiClient<ImagingOrder>(`/imaging/orders/${id}`);
}

export async function createImagingOrder(input: ImagingOrderCreateInput): Promise<ImagingOrder> {
  return apiClient<ImagingOrder>('/imaging/orders', { method: 'POST', body: input });
}

export async function updateImagingOrder(id: string, input: ImagingOrderUpdateInput): Promise<ImagingOrder> {
  return apiClient<ImagingOrder>(`/imaging/orders/${id}`, { method: 'PUT', body: input });
}

export async function scheduleImagingOrder(id: string, scheduledAt: string): Promise<ImagingOrder> {
  return apiClient<ImagingOrder>(`/imaging/orders/${id}/schedule`, { method: 'POST', body: { scheduledAt } });
}

export async function startImagingOrder(id: string): Promise<ImagingOrder> {
  return apiClient<ImagingOrder>(`/imaging/orders/${id}/start`, { method: 'POST' });
}

export async function completeImagingOrder(id: string): Promise<ImagingOrder> {
  return apiClient<ImagingOrder>(`/imaging/orders/${id}/complete`, { method: 'POST' });
}

export async function cancelImagingOrder(id: string, reason?: string): Promise<ImagingOrder> {
  return apiClient<ImagingOrder>(`/imaging/orders/${id}/cancel`, { method: 'POST', body: { reason } });
}

// Study Types
export type ListImagingStudiesParams = {
  page?: number;
  pageSize?: number;
  orderId?: string;
  patientId?: string;
  status?: string;
};

export type ListImagingStudiesResponse = {
  data: ImagingStudy[];
  page: number;
  pageSize: number;
  total: number;
};

export async function listImagingStudies(params: ListImagingStudiesParams = {}): Promise<ListImagingStudiesResponse> {
  return apiClient<ListImagingStudiesResponse>('/imaging/studies', { params });
}

export async function getImagingStudy(id: string): Promise<ImagingStudy> {
  return apiClient<ImagingStudy>(`/imaging/studies/${id}`);
}

// Report Types
export type ListImagingReportsParams = {
  page?: number;
  pageSize?: number;
  orderId?: string;
  patientId?: string;
  status?: string;
};

export type ListImagingReportsResponse = {
  data: ImagingReport[];
  page: number;
  pageSize: number;
  total: number;
};

export async function listImagingReports(params: ListImagingReportsParams = {}): Promise<ListImagingReportsResponse> {
  return apiClient<ListImagingReportsResponse>('/imaging/reports', { params });
}

export async function getImagingReport(id: string): Promise<ImagingReport> {
  return apiClient<ImagingReport>(`/imaging/reports/${id}`);
}

export async function createImagingReport(input: Omit<ImagingReport, 'id'>): Promise<ImagingReport> {
  return apiClient<ImagingReport>('/imaging/reports', { method: 'POST', body: input });
}

export async function updateImagingReport(id: string, input: Partial<Omit<ImagingReport, 'id'>>): Promise<ImagingReport> {
  return apiClient<ImagingReport>(`/imaging/reports/${id}`, { method: 'PUT', body: input });
}

export async function signImagingReport(id: string): Promise<ImagingReport> {
  return apiClient<ImagingReport>(`/imaging/reports/${id}/sign`, { method: 'POST' });
}
