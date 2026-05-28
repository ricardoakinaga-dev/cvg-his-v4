import type { IncomingMessage, ServerResponse } from 'node:http';

import type {
  CreateMarketingCampaignInput,
  CreateMarketingSegmentInput,
  CreateMarketingTemplateInput,
  MarketingAudienceMember,
  MarketingCampaignStatus,
  MarketingChannel,
  MarketingDispatchGateway,
  MarketingService
} from '@cvg-his-v2/module-marketing';
import type { AuditService } from '@cvg-his-v2/module-audit';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';
import { ValidationError } from '@cvg-his-v2/shared-errors';

import { appendAudit } from '../helpers/audit-helper.js';
import { readJsonBody } from '../helpers/common.js';
import type { SmsGateway } from '../sms-gateway.js';

export interface MarketingRoutesHandlers {
  marketing: MarketingService;
  smsGateway?: SmsGateway;
  audit: AuditService;
  requirePrincipal: (request: IncomingMessage, permissionCode: string) => AuthenticatedPrincipal;
}

function json(response: ServerResponse, statusCode: number, payload: unknown): true {
  response.statusCode = statusCode;
  response.setHeader('content-type', 'application/json');
  response.end(JSON.stringify(payload));
  return true;
}

function parseCampaignId(pathname: string, suffix = ''): string | null {
  const escapedSuffix = suffix.replace(/\//g, '\\/');
  const match = pathname.match(new RegExp(`^\\/marketing\\/campaigns\\/([^/]+)${escapedSuffix}$`));
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

function parseChannel(value: string | null): MarketingChannel | undefined {
  if (value === null || value === '') return undefined;
  if (value === 'sms' || value === 'whatsapp' || value === 'email') return value;
  throw new ValidationError('channel must be sms, whatsapp or email');
}

function parseCampaignStatus(value: string | null): MarketingCampaignStatus | undefined {
  if (value === null || value === '') return undefined;
  if (['draft', 'scheduled', 'running', 'sent', 'cancelled'].includes(value)) {
    return value as MarketingCampaignStatus;
  }
  throw new ValidationError('status must be draft, scheduled, running, sent or cancelled');
}

export async function handleMarketingRoutes(
  pathname: string,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  handlers: MarketingRoutesHandlers
): Promise<boolean> {
  if (!pathname.startsWith('/marketing/')) return false;

  const { marketing, audit, requirePrincipal } = handlers;
  const url = new URL(request.url ?? pathname, 'http://localhost');

  if (pathname === '/marketing/segments' && request.method === 'GET') {
    const principal = requirePrincipal(request, 'marketing.read');
    return json(response, 200, {
      items: marketing.listSegments(principal.user.accountId)
    });
  }

  if (pathname === '/marketing/segments' && request.method === 'POST') {
    const principal = requirePrincipal(request, 'marketing.manage');
    const payload = await readJsonBody(request) as CreateMarketingSegmentInput;
    const segment = await marketing.createSegment(principal.user.accountId, principal.user.id, payload);
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'marketing',
      action: 'create_marketing_segment',
      entityType: 'marketing-segment',
      entityId: segment.id,
      payloadSummary: `Marketing segment ${segment.name} created`,
      riskLevel: 'medium',
      correlationId
    });
    return json(response, 201, segment);
  }

  if (pathname === '/marketing/templates' && request.method === 'GET') {
    const principal = requirePrincipal(request, 'marketing.read');
    return json(response, 200, {
      items: marketing.listTemplates(principal.user.accountId, parseChannel(url.searchParams.get('channel')))
    });
  }

  if (pathname === '/marketing/templates' && request.method === 'POST') {
    const principal = requirePrincipal(request, 'marketing.manage');
    const payload = await readJsonBody(request) as CreateMarketingTemplateInput;
    const template = await marketing.createTemplate(principal.user.accountId, principal.user.id, payload);
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'marketing',
      action: 'create_marketing_template',
      entityType: 'marketing-template',
      entityId: template.id,
      payloadSummary: `Marketing template ${template.name} created for ${template.channel}`,
      riskLevel: 'medium',
      correlationId
    });
    return json(response, 201, template);
  }

  if (pathname === '/marketing/campaigns' && request.method === 'GET') {
    const principal = requirePrincipal(request, 'marketing.read');
    return json(response, 200, {
      items: marketing.listCampaigns(principal.user.accountId, parseCampaignStatus(url.searchParams.get('status')))
    });
  }

  if (pathname === '/marketing/campaigns' && request.method === 'POST') {
    const principal = requirePrincipal(request, 'marketing.manage');
    const payload = await readJsonBody(request) as CreateMarketingCampaignInput;
    const campaign = await marketing.createCampaign(principal.user.accountId, principal.user.id, payload);
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'marketing',
      action: 'create_marketing_campaign',
      entityType: 'marketing-campaign',
      entityId: campaign.id,
      payloadSummary: `Marketing campaign ${campaign.name} created with ${campaign.estimatedAudience} audience member(s)`,
      riskLevel: 'medium',
      correlationId
    });
    return json(response, 201, campaign);
  }

  const scheduleCampaignId = parseCampaignId(pathname, '/schedule');
  if (scheduleCampaignId && request.method === 'POST') {
    const principal = requirePrincipal(request, 'marketing.manage');
    const campaign = await marketing.scheduleCampaign(principal.user.accountId, principal.user.id, scheduleCampaignId);
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'marketing',
      action: 'schedule_marketing_campaign',
      entityType: 'marketing-campaign',
      entityId: campaign.id,
      payloadSummary: `Marketing campaign ${campaign.name} scheduled for ${campaign.scheduledAt}`,
      riskLevel: 'high',
      correlationId
    });
    return json(response, 200, campaign);
  }

  const dispatchCampaignId = parseCampaignId(pathname, '/dispatch');
  if (dispatchCampaignId && request.method === 'POST') {
    const principal = requirePrincipal(request, 'marketing.manage');
    const payload = await readJsonBody(request) as { audience?: readonly MarketingAudienceMember[] };
    const result = await marketing.dispatchCampaign(principal.user.accountId, principal.user.id, dispatchCampaignId, {
      audience: Array.isArray(payload.audience) ? payload.audience : [],
      gateway: createMarketingGateway(handlers.smsGateway)
    });
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'marketing',
      action: 'dispatch_marketing_campaign',
      entityType: 'marketing-campaign',
      entityId: result.campaign.id,
      payloadSummary: `Marketing campaign ${result.campaign.name} dispatched with ${result.summary.sent} sent and ${result.summary.failed} failed`,
      riskLevel: 'high',
      correlationId
    });
    return json(response, 200, result);
  }

  const deliveriesCampaignId = parseCampaignId(pathname, '/deliveries');
  if (deliveriesCampaignId && request.method === 'GET') {
    const principal = requirePrincipal(request, 'marketing.read');
    return json(response, 200, {
      items: marketing.listDeliveries(principal.user.accountId, deliveriesCampaignId)
    });
  }

  return false;
}

function createMarketingGateway(smsGateway?: SmsGateway): MarketingDispatchGateway {
  return {
    async send(input) {
      if (input.channel === 'sms' && smsGateway) {
        const result = await smsGateway.send({ to: input.to, text: input.body });
        return {
          status: result.status,
          provider: result.provider,
          providerMessageId: result.providerMessageId,
          failureReason: result.failureReason,
          sentAt: result.sentAt
        };
      }

      const sentAt = new Date().toISOString();
      if (input.to.includes('0000')) {
        return {
          status: 'failed',
          provider: `local-${input.channel}`,
          failureReason: `Simulated local ${input.channel} failure`,
          sentAt
        };
      }

      return {
        status: 'sent',
        provider: `local-${input.channel}`,
        providerMessageId: `local_${input.channel}_${Buffer.from(`${input.to}|${input.body}`).toString('base64url')}`,
        sentAt
      };
    }
  };
}
