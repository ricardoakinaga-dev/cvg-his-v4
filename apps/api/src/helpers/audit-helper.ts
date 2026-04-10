/**
 * Audit logging helper for route handlers.
 * Extracted from server.ts to support route extraction.
 */
import type { AuditService } from '@cvg-his-v2/module-audit';
import type { AccountId } from '@cvg-his-v2/shared-types';

export interface AuditParams {
  actorId: string;
  accountId: AccountId;
  module: string;
  action: string;
  entityType: string;
  entityId: string;
  payloadSummary: string;
  riskLevel: 'low' | 'medium' | 'high';
  correlationId: string;
}

/**
 * Append an audit entry for a route handler action.
 * Fire-and-forget — errors are logged but don't block the response.
 * Note: occurredAt is set automatically by AuditService.write().
 */
export function appendAudit(audit: AuditService, params: AuditParams): void {
  audit.write({
    actorId: params.actorId,
    accountId: params.accountId,
    module: params.module,
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    payloadSummary: params.payloadSummary,
    riskLevel: params.riskLevel,
    correlationId: params.correlationId
  });
}