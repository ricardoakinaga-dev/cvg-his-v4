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
 * Append an audit entry for a route handler action. AuditService tracks the
 * pending write by correlation ID; the server flushes it before releasing the
 * HTTP response, so persistence failures fail the request boundary.
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
