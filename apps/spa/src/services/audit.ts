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
  }
};
