import type { IncomingMessage, ServerResponse } from 'node:http';

import type { AbacEngine } from '@cvg-his-v2/module-access-control';
import {
  AccessReviewControlService,
  calculateSecurityScore,
  collectEvidence,
  DisasterRecoveryControlService,
  IncidentResponseControlService,
  MfaControlService,
  VulnerabilityControlService
} from '@cvg-his-v2/module-soc2';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';

type AuditAppender = (
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

export interface Soc2RoutesHandlers {
  requirePrincipal: (request: IncomingMessage, permissionCode: string) => AuthenticatedPrincipal | PromiseLike<AuthenticatedPrincipal>;
  appendAudit: AuditAppender;
  logError: (message: string, context: { correlationId: string; error: unknown }) => void;
  abacEngine: AbacEngine;
  mfaControl: MfaControlService;
  vulnerabilityControl: VulnerabilityControlService;
  accessControl: AccessReviewControlService;
  drControl: DisasterRecoveryControlService;
  incidentControl: IncidentResponseControlService;
}

function buildPoliciesPayload(abacEngine: AbacEngine) {
  const policies = abacEngine.listPolicies();

  return {
    abacPolicies: policies.map((policy) => ({
      id: policy.id,
      name: policy.name,
      description: policy.description,
      version: policy.version,
      resourceTypes: policy.resourceTypes,
      actionCodes: policy.actionCodes,
      enabled: policy.enabled,
      combiningAlgorithm: policy.combiningAlgorithm,
      rulesCount: policy.rules.length,
      tags: policy.tags
    })),
    totalPolicies: policies.length
  };
}

export async function handleSoc2Routes(
  pathname: string,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  handlers: Soc2RoutesHandlers
): Promise<boolean> {
  const {
    requirePrincipal,
    appendAudit,
    logError,
    abacEngine,
    mfaControl,
    vulnerabilityControl,
    accessControl,
    drControl,
    incidentControl
  } = handlers;

  if (pathname === '/soc2/evidence' && request.method === 'GET') {
    const principal = await requirePrincipal(request, 'audit.read');
    const url = new URL(request.url ?? '/', 'http://localhost');
    const periodStart =
      url.searchParams.get('periodStart')
      ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const periodEnd = url.searchParams.get('periodEnd') ?? new Date().toISOString();

    try {
      const evidence = await collectEvidence(periodStart, periodEnd, {
        mfa: mfaControl,
        vulnerability: vulnerabilityControl,
        access: accessControl,
        dr: drControl,
        incident: incidentControl
      });

      appendAudit(
        principal.user.id,
        principal.user.accountId,
        'soc2',
        'evidence_collected',
        'audit',
        principal.session.sessionId,
        `SOC2 evidence package collected for period ${periodStart} to ${periodEnd}`,
        'medium',
        correlationId
      );

      response.statusCode = 200;
      response.end(JSON.stringify(evidence));
    } catch (error) {
      logError('SOC2 evidence collection failed', { correlationId, error });
      response.statusCode = 500;
      response.end(
        JSON.stringify({
          code: 'EVIDENCE_FAILED',
          message: 'Failed to collect SOC2 evidence'
        })
      );
    }

    return true;
  }

  if (pathname === '/soc2/security-score' && request.method === 'GET') {
    const principal = await requirePrincipal(request, 'audit.read');

    try {
      const score = await calculateSecurityScore(
        mfaControl,
        vulnerabilityControl,
        accessControl,
        drControl
      );

      appendAudit(
        principal.user.id,
        principal.user.accountId,
        'soc2',
        'security_score_calculated',
        'audit',
        principal.session.sessionId,
        `Security score calculated: ${score.overall}/100`,
        'medium',
        correlationId
      );

      response.statusCode = 200;
      response.end(JSON.stringify(score));
    } catch (error) {
      logError('SOC2 security score calculation failed', { correlationId, error });
      response.statusCode = 500;
      response.end(
        JSON.stringify({
          code: 'SCORE_FAILED',
          message: 'Failed to calculate security score'
        })
      );
    }

    return true;
  }

  if (pathname === '/soc2/policies' && request.method === 'GET') {
    response.statusCode = 200;
    response.end(JSON.stringify(buildPoliciesPayload(abacEngine)));
    return true;
  }

  return false;
}
