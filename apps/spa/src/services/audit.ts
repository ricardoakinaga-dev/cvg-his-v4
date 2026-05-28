import { apiRequest } from './api';
import type { AuditEventSummary } from '@cvg-his-v2/shared-types';

export interface AuditEventsFilters {
  q?: string;
  module?: string;
  entity?: string;
  entityTypes?: string[];
  correlationId?: string;
  limit?: number;
}

export interface OperationalAuditCoverageItem {
  id: string;
  module: string;
  action: string;
  entityType?: string;
  minimumRiskLevel: 'low' | 'medium' | 'high';
  description: string;
  covered: boolean;
  evidenceEventId?: string;
  evidenceOccurredAt?: string;
}

export interface OperationalAuditCoverageReport {
  generatedAt: string;
  accountId?: string;
  totalEvents: number;
  eventsByModule: Record<string, number>;
  eventsByRiskLevel: Record<'low' | 'medium' | 'high', number>;
  requirements: OperationalAuditCoverageItem[];
  coveredRequirements: number;
  missingRequirements: number;
  coveragePercent: number;
}

function buildAuditEventsQuery(filters: AuditEventsFilters = {}): string {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.module) params.set('module', filters.module);
  if (filters.entity) params.set('entity', filters.entity);
  if (filters.correlationId) params.set('correlationId', filters.correlationId);
  if (typeof filters.limit === 'number') params.set('limit', String(filters.limit));
  for (const entityType of filters.entityTypes ?? []) {
    params.append('entityType', entityType);
  }
  const query = params.toString();
  return query ? `/audit/events?${query}` : '/audit/events';
}

export const auditService = {
  async listEvents(filters: AuditEventsFilters = {}): Promise<AuditEventSummary[]> {
    const response = await apiRequest<{ items: AuditEventSummary[] }>(buildAuditEventsQuery(filters));
    return response.items ?? [];
  },

  async getOperationalCoverage(): Promise<OperationalAuditCoverageReport> {
    return apiRequest<OperationalAuditCoverageReport>('/audit/operational-coverage');
  }
};
