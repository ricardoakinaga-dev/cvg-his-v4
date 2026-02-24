/**
 * Laboratory API Client
 * 
 * Provides functions for interacting with the laboratory API endpoints
 */

import { apiClient } from './client';

// ============================================
// Lab Tests Catalog
// ============================================

export type LabTest = {
  id: string;
  accountId: string;
  code: string;
  name: string;
  category: string | null;
  sampleType: string | null;
  turnaroundHours: number | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type LabTestCreateInput = {
  code: string;
  name: string;
  category?: string | null;
  sampleType?: string | null;
  turnaroundHours?: number | null;
  active?: boolean;
};

export type LabTestUpdateInput = Partial<LabTestCreateInput>;

export type ListLabTestsParams = {
  page?: number;
  pageSize?: number;
  q?: string;
  category?: string;
  active?: boolean;
};

export type ListLabTestsResponse = {
  data: LabTest[];
  page: number;
  pageSize: number;
  total: number;
};

export async function listLabTests(params: ListLabTestsParams = {}): Promise<ListLabTestsResponse> {
  return apiClient<ListLabTestsResponse>('/laboratory/tests', { params });
}

export async function getLabTest(id: string): Promise<LabTest> {
  return apiClient<LabTest>(`/laboratory/tests/${id}`);
}

export async function createLabTest(input: LabTestCreateInput): Promise<LabTest> {
  return apiClient<LabTest>('/laboratory/tests', { method: 'POST', body: input });
}

export async function updateLabTest(id: string, input: LabTestUpdateInput): Promise<LabTest> {
  return apiClient<LabTest>(`/laboratory/tests/${id}`, { method: 'PUT', body: input });
}

export async function deleteLabTest(id: string): Promise<void> {
  return apiClient<void>(`/laboratory/tests/${id}`, { method: 'DELETE' });
}

// ============================================
// Lab Orders
// ============================================

export type LabOrder = {
  id: string;
  accountId: string;
  patientId: string;
  patientName?: string;
  encounterId: string | null;
  requestedBy: string | null;
  requestedByName?: string;
  status: 'pending' | 'collected' | 'processing' | 'completed' | 'cancelled';
  priority: 'routine' | 'urgent' | 'stat';
  notes: string | null;
  items: Array<{
    id: string;
    testId: string;
    testName: string;
    status: string;
  }>;
  createdAt: string;
  updatedAt: string;
};

export type LabOrderCreateInput = {
  patientId: string;
  encounterId?: string;
  requestedBy?: string;
  priority?: string;
  notes?: string;
  items: Array<{
    testId: string;
  }>;
};

export type LabOrderUpdateInput = Partial<Omit<LabOrderCreateInput, 'items'>> & {
  items?: Array<{ testId: string }>;
};

export type ListLabOrdersParams = {
  page?: number;
  pageSize?: number;
  patientId?: string;
  encounterId?: string;
  status?: string;
};

export type ListLabOrdersResponse = {
  data: LabOrder[];
  page: number;
  pageSize: number;
  total: number;
};

export async function listLabOrders(params: ListLabOrdersParams = {}): Promise<ListLabOrdersResponse> {
  return apiClient<ListLabOrdersResponse>('/laboratory/orders', { params });
}

export async function getLabOrder(id: string): Promise<LabOrder> {
  return apiClient<LabOrder>(`/laboratory/orders/${id}`);
}

export async function createLabOrder(input: LabOrderCreateInput): Promise<{ order: LabOrder; items: any[] }> {
  return apiClient<{ order: LabOrder; items: any[] }>('/laboratory/orders', { method: 'POST', body: input });
}

export async function updateLabOrder(id: string, input: LabOrderUpdateInput): Promise<LabOrder> {
  return apiClient<LabOrder>(`/laboratory/orders/${id}`, { method: 'PUT', body: input });
}

export async function cancelLabOrder(id: string, reason?: string): Promise<LabOrder> {
  return apiClient<LabOrder>(`/laboratory/orders/${id}/cancel`, { method: 'POST', body: { reason } });
}

// ============================================
// Lab Samples
// ============================================

export type LabSample = {
  id: string;
  accountId: string;
  orderId: string;
  patientId: string;
  sampleType: string;
  collectedAt: string | null;
  collectedBy: string | null;
  receivedAt: string | null;
  status: 'pending' | 'collected' | 'received' | 'rejected';
  rejectionReason: string | null;
  createdAt: string;
};

export type LabSampleCreateInput = {
  orderId: string;
  sampleType: string;
};

export type ListLabSamplesParams = {
  page?: number;
  pageSize?: number;
  orderId?: string;
  status?: string;
};

export type ListLabSamplesResponse = {
  data: LabSample[];
  page: number;
  pageSize: number;
  total: number;
};

export async function listLabSamples(params: ListLabSamplesParams = {}): Promise<ListLabSamplesResponse> {
  return apiClient<ListLabSamplesResponse>('/laboratory/samples', { params });
}

export async function getLabSample(id: string): Promise<LabSample> {
  return apiClient<LabSample>(`/laboratory/samples/${id}`);
}

export async function createLabSample(input: LabSampleCreateInput): Promise<LabSample> {
  return apiClient<LabSample>('/laboratory/samples', { method: 'POST', body: input });
}

export async function collectLabSample(id: string): Promise<LabSample> {
  return apiClient<LabSample>(`/laboratory/samples/${id}/collect`, { method: 'POST' });
}

export async function receiveLabSample(id: string): Promise<LabSample> {
  return apiClient<LabSample>(`/laboratory/samples/${id}/receive`, { method: 'POST' });
}

export async function rejectLabSample(id: string, reason: string): Promise<LabSample> {
  return apiClient<LabSample>(`/laboratory/samples/${id}/reject`, { method: 'POST', body: { reason } });
}

// ============================================
// Lab Results
// ============================================

export type LabResult = {
  id: string;
  accountId: string;
  orderItemId: string;
  sampleId: string | null;
  testId: string;
  patientId: string;
  resultValue: string | null;
  resultNumeric: number | null;
  unit: string | null;
  referenceRange: string | null;
  flag: 'normal' | 'low' | 'high' | 'critical' | null;
  notes: string | null;
  interpretation: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LabResultCreateInput = {
  orderItemId: string;
  sampleId?: string;
  testId: string;
  patientId: string;
  resultValue?: string;
  resultNumeric?: number;
  unit?: string;
  referenceRange?: string;
  referenceRangeId?: string;
  flag?: string;
  notes?: string;
  interpretation?: string;
};

export type LabResultUpdateInput = Partial<LabResultCreateInput>;

export type ListLabResultsParams = {
  page?: number;
  pageSize?: number;
  patientId?: string;
  orderId?: string;
};

export type ListLabResultsResponse = {
  data: LabResult[];
  page: number;
  pageSize: number;
  total: number;
};

export async function listLabResults(params: ListLabResultsParams = {}): Promise<ListLabResultsResponse> {
  return apiClient<ListLabResultsResponse>('/laboratory/results', { params });
}

export async function getLabResult(id: string): Promise<LabResult> {
  return apiClient<LabResult>(`/laboratory/results/${id}`);
}

export async function createLabResult(input: LabResultCreateInput): Promise<LabResult> {
  return apiClient<LabResult>('/laboratory/results', { method: 'POST', body: input });
}

export async function updateLabResult(id: string, input: LabResultUpdateInput): Promise<LabResult> {
  return apiClient<LabResult>(`/laboratory/results/${id}`, { method: 'PUT', body: input });
}

// ============================================
// Lab Reports
// ============================================

export type LabReport = {
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

export type LabReportCreateInput = {
  orderId: string;
  patientId: string;
  content?: string;
};

export type LabReportUpdateInput = {
  content?: string;
};

export type ListLabReportsParams = {
  page?: number;
  pageSize?: number;
  patientId?: string;
  status?: string;
};

export type ListLabReportsResponse = {
  data: LabReport[];
  page: number;
  pageSize: number;
  total: number;
};

export async function listLabReports(params: ListLabReportsParams = {}): Promise<ListLabReportsResponse> {
  return apiClient<ListLabReportsResponse>('/laboratory/reports', { params });
}

export async function getLabReport(id: string): Promise<LabReport> {
  return apiClient<LabReport>(`/laboratory/reports/${id}`);
}

export async function createLabReport(input: LabReportCreateInput): Promise<LabReport> {
  return apiClient<LabReport>('/laboratory/reports', { method: 'POST', body: input });
}

export async function updateLabReport(id: string, input: LabReportUpdateInput): Promise<LabReport> {
  return apiClient<LabReport>(`/laboratory/reports/${id}`, { method: 'PUT', body: input });
}

export async function signLabReport(id: string): Promise<LabReport> {
  return apiClient<LabReport>(`/laboratory/reports/${id}/sign`, { method: 'POST' });
}
