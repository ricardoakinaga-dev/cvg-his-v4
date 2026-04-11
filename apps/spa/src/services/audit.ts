import { apiRequest } from './api';
import type { AuditEventSummary } from '@cvg-his-v2/shared-types';

export const auditService = {
  async listEvents(): Promise<AuditEventSummary[]> {
    const response = await apiRequest<{ items: AuditEventSummary[] }>('/audit/events');
    return response.items ?? [];
  }
};
