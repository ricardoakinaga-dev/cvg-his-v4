import type { IncomingMessage } from 'node:http';

import type { AuditService } from '@cvg-his-v2/module-audit';
import type { AccessControlService } from '@cvg-his-v2/module-access-control';
import type { AuthService } from '@cvg-his-v2/module-auth';
import { extractBearerToken } from '@cvg-his-v2/shared-auth-sdk';
import { AuthenticationError } from '@cvg-his-v2/shared-errors';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';

export type RequirePrincipal = (
  request: IncomingMessage,
  permissionCode: string
) => AuthenticatedPrincipal;

export type AppendAudit = (
  actorId: string,
  accountId: string,
  module: string,
  action: string,
  entityType: string,
  entityId: string,
  payloadSummary: string,
  riskLevel: 'low' | 'medium' | 'high',
  correlationId: string
) => void;

export function createAppendAudit(audit: AuditService): AppendAudit {
  return (
    actorId,
    accountId,
    module,
    action,
    entityType,
    entityId,
    payloadSummary,
    riskLevel,
    correlationId
  ) => {
    audit.write({
      actorId,
      accountId: accountId as never,
      module,
      action,
      entityType,
      entityId,
      payloadSummary,
      riskLevel,
      correlationId
    });
  };
}

export function createRequirePrincipal(
  auth: AuthService,
  accessControl: AccessControlService
): RequirePrincipal {
  return (request, permissionCode) => {
    const accessToken = extractBearerToken(request.headers.authorization);
    if (!accessToken) {
      throw new AuthenticationError();
    }
    const principal = auth.authenticateAccessToken(accessToken);
    accessControl.assertAuthorized({
      actor: principal.user,
      access: principal.access,
      permissionCode,
      accountId: principal.user.accountId
    });
    return principal;
  };
}
