/**
 * Services API Client
 * 
 * Provides API methods for billing services (faturáveis)
 */

import { api, type PaginatedResponse } from './client';

// Service types
export type ServiceGroup = 'consulta' | 'procedimento' | 'internacao' | 'lab' | 'imagem' | 'outros';
export type ServiceSector = 'clinica' | 'internacao' | 'laboratorio' | 'imagem' | 'financeiro';

export type Service = {
  id: string;
  accountId: string;
  code: string;
  name: string;
  group: ServiceGroup;
  sector: ServiceSector;
  basePrice: string;
  durationMinutes: number | null;
  requiresReport: boolean;
  consumesStock: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ServiceCreateInput = {
  code: string;
  name: string;
  group: ServiceGroup;
  sector: ServiceSector;
  basePrice?: number;
  durationMinutes?: number | null;
  requiresReport?: boolean;
  consumesStock?: boolean;
  active?: boolean;
};

export type ServiceUpdateInput = Partial<ServiceCreateInput>;

export type ListServicesParams = {
  page?: number;
  pageSize?: number;
  q?: string;
  group?: ServiceGroup;
  sector?: ServiceSector;
  active?: boolean;
};

/**
 * List services with pagination and filters
 */
export async function listServices(params: ListServicesParams = {}): Promise<PaginatedResponse<Service>> {
  return api.get<PaginatedResponse<Service>>('/billing/services', {
    page: params.page,
    pageSize: params.pageSize,
    q: params.q,
    group: params.group,
    sector: params.sector,
    active: params.active
  });
}

/**
 * Get a service by ID
 */
export async function getService(id: string): Promise<Service> {
  return api.get<Service>(`/billing/services/${id}`);
}

/**
 * Create a new service
 */
export async function createService(input: ServiceCreateInput): Promise<Service> {
  return api.post<Service>('/billing/services', input);
}

/**
 * Update a service
 */
export async function updateService(id: string, input: ServiceUpdateInput): Promise<Service> {
  return api.put<Service>(`/billing/services/${id}`, input);
}

/**
 * Delete a service
 */
export async function deleteService(id: string): Promise<void> {
  await api.delete(`/billing/services/${id}`);
}

// Group and sector labels for display
export const SERVICE_GROUP_LABELS: Record<ServiceGroup, string> = {
  consulta: 'Consulta',
  procedimento: 'Procedimento',
  internacao: 'Internação',
  lab: 'Laboratório',
  imagem: 'Imagem',
  outros: 'Outros'
};

export const SERVICE_SECTOR_LABELS: Record<ServiceSector, string> = {
  clinica: 'Clínica',
  internacao: 'Internação',
  laboratorio: 'Laboratório',
  imagem: 'Imagem',
  financeiro: 'Financeiro'
};
