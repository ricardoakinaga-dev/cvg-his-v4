import type { IncomingMessage, ServerResponse } from 'node:http';

import type {
  CalculateCommissionsInput,
  CommissionsService,
  CreateCommissionRuleInput
} from '@cvg-his-v2/module-commissions';
import type { AuditService } from '@cvg-his-v2/module-audit';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';
import { ValidationError } from '@cvg-his-v2/shared-errors';

import { appendAudit } from '../helpers/audit-helper.js';
import { readJsonBody } from '../helpers/common.js';

export interface CommissionRoutesHandlers {
  commissions: CommissionsService;
  audit: AuditService;
  requirePrincipal: (request: IncomingMessage, permissionCode: string) => AuthenticatedPrincipal;
}

function json(response: ServerResponse, statusCode: number, payload: unknown): true {
  response.statusCode = statusCode;
  response.setHeader('content-type', 'application/json');
  response.end(JSON.stringify(payload));
  return true;
}

function parseBoolean(value: string | null): boolean | undefined {
  if (value === null) return undefined;
  if (value === 'true') return true;
  if (value === 'false') return false;
  throw new ValidationError('active must be true or false');
}

function parseCalculationId(pathname: string, suffix = ''): string | null {
  const escapedSuffix = suffix.replace(/\//g, '\\/');
  const match = pathname.match(new RegExp(`^\\/commission-calculations\\/([^/]+)${escapedSuffix}$`));
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

export async function handleCommissionRoutes(
  pathname: string,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  handlers: CommissionRoutesHandlers
): Promise<boolean> {
  if (!pathname.startsWith('/commission-rules') && !pathname.startsWith('/commission-calculations')) {
    return false;
  }

  const { commissions, audit, requirePrincipal } = handlers;
  const url = new URL(request.url ?? pathname, 'http://localhost');

  if (pathname === '/commission-rules' && request.method === 'GET') {
    const principal = requirePrincipal(request, 'staff.read');
    return json(response, 200, {
      items: commissions.listRules(principal.user.accountId, {
        active: parseBoolean(url.searchParams.get('active'))
      })
    });
  }

  if (pathname === '/commission-rules' && request.method === 'POST') {
    const principal = requirePrincipal(request, 'staff.manage');
    const payload = await readJsonBody(request) as CreateCommissionRuleInput;
    const rule = await commissions.createRule(principal.user.accountId, principal.user.id, payload);
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'staff',
      action: 'create_commission_rule',
      entityType: 'commission-rule',
      entityId: rule.id,
      payloadSummary: `Commission rule ${rule.description} created with ${rule.percentage}%`,
      riskLevel: 'medium',
      correlationId
    });
    return json(response, 201, rule);
  }

  if (pathname === '/commission-calculations' && request.method === 'GET') {
    const principal = requirePrincipal(request, 'staff.read');
    return json(response, 200, {
      items: commissions.listCalculations(principal.user.accountId)
    });
  }

  if (pathname === '/commission-calculations' && request.method === 'POST') {
    const principal = requirePrincipal(request, 'staff.manage');
    const payload = await readJsonBody(request) as CalculateCommissionsInput;
    const calculation = await commissions.calculate(principal.user.accountId, principal.user.id, payload);
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'staff',
      action: 'calculate_commissions',
      entityType: 'commission-calculation',
      entityId: calculation.id,
      payloadSummary: `Commission calculation ${calculation.number} generated for ${calculation.periodStart}..${calculation.periodEnd}`,
      riskLevel: 'medium',
      correlationId
    });
    return json(response, 201, calculation);
  }

  const calculationId = parseCalculationId(pathname);
  if (calculationId && request.method === 'GET') {
    const principal = requirePrincipal(request, 'staff.read');
    return json(response, 200, commissions.detail(principal.user.accountId, calculationId));
  }

  const reviewId = parseCalculationId(pathname, '/review');
  if (reviewId && request.method === 'POST') {
    const principal = requirePrincipal(request, 'staff.manage');
    const calculation = await commissions.review(principal.user.accountId, reviewId, principal.user.id);
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'staff',
      action: 'review_commission_calculation',
      entityType: 'commission-calculation',
      entityId: calculation.id,
      payloadSummary: `Commission calculation ${calculation.number} reviewed`,
      riskLevel: 'medium',
      correlationId
    });
    return json(response, 200, calculation);
  }

  const payId = parseCalculationId(pathname, '/pay');
  if (payId && request.method === 'POST') {
    const principal = requirePrincipal(request, 'staff.manage');
    const calculation = await commissions.markPaid(principal.user.accountId, payId, principal.user.id);
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'staff',
      action: 'pay_commission_calculation',
      entityType: 'commission-calculation',
      entityId: calculation.id,
      payloadSummary: `Commission calculation ${calculation.number} paid`,
      riskLevel: 'high',
      correlationId
    });
    return json(response, 200, calculation);
  }

  const cancelId = parseCalculationId(pathname, '/cancel');
  if (cancelId && request.method === 'POST') {
    const principal = requirePrincipal(request, 'staff.manage');
    const calculation = await commissions.cancel(principal.user.accountId, cancelId, principal.user.id);
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'staff',
      action: 'cancel_commission_calculation',
      entityType: 'commission-calculation',
      entityId: calculation.id,
      payloadSummary: `Commission calculation ${calculation.number} cancelled`,
      riskLevel: 'medium',
      correlationId
    });
    return json(response, 200, calculation);
  }

  return false;
}
