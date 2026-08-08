import type { IncomingMessage, ServerResponse } from 'node:http';

import type {
  CreateMarketingCampaignInput,
  CreateMarketingSegmentInput,
  CreateMarketingTemplateInput,
  MarketingAudienceMember,
  MarketingCampaignStatus,
  MarketingChannel,
  MarketingDispatchGateway,
  MarketingService,
  MarketingSettingKey,
  SaveMarketingSettingInput
} from '@cvg-his-v2/module-marketing';
import type { AuditService } from '@cvg-his-v2/module-audit';
import type { AuthenticatedPrincipal } from '@cvg-his-v2/shared-types';
import { ValidationError } from '@cvg-his-v2/shared-errors';

import { appendAudit } from '../helpers/audit-helper.js';
import { readJsonBody } from '../helpers/common.js';
import type { SmsGateway } from '../sms-gateway.js';
import type { EmailGateway } from '../email-gateway.js';
import type { WhatsAppProviderService } from '@cvg-his-v2/module-notifications-whatsapp';

export interface MarketingRoutesHandlers {
  marketing: MarketingService;
  smsGateway?: SmsGateway;
  emailGateway?: EmailGateway;
  whatsAppProvider?: WhatsAppProviderService;
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

function parseDeliveryId(pathname: string): string | null {
  const match = pathname.match(/^\/marketing\/deliveries\/([^/]+)\/retry$/);
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

function parseSettingKey(value: string | null): MarketingSettingKey {
  if (value === 'sms_automations' || value === 'vaccine_email') return value;
  throw new ValidationError('setting key must be sms_automations or vaccine_email');
}

function parseSettingPayload(value: unknown, key: MarketingSettingKey): SaveMarketingSettingInput {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new ValidationError('setting payload is required');
  }
  const payload = value as Record<string, unknown>;
  const channel = payload.channel;
  if (channel !== 'sms' && channel !== 'email') {
    throw new ValidationError('setting channel must be sms or email');
  }
  const values = payload.values;
  if (!values || typeof values !== 'object' || Array.isArray(values)) {
    throw new ValidationError('setting values must be an object');
  }
  const normalizedValues: Record<string, boolean | string> = {};
  for (const [name, item] of Object.entries(values)) {
    if (typeof item !== 'boolean' && typeof item !== 'string') {
      throw new ValidationError(`setting value ${name} must be boolean or string`);
    }
    normalizedValues[name] = item;
  }
  return { key, channel, values: normalizedValues };
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

  if (pathname === '/marketing/settings' && request.method === 'GET') {
    const principal = requirePrincipal(request, 'marketing.read');
    const key = parseSettingKey(url.searchParams.get('key'));
    const setting = await marketing.getSetting(principal.user.accountId, key);
    return json(response, 200, { setting });
  }

  const settingMatch = pathname.match(/^\/marketing\/settings\/([^/]+)$/);
  if (settingMatch && request.method === 'PATCH') {
    const principal = requirePrincipal(request, 'marketing.manage');
    const key = parseSettingKey(decodeURIComponent(settingMatch[1] ?? ''));
    const payload = parseSettingPayload(await readJsonBody(request), key);
    const setting = await marketing.saveSetting(principal.user.accountId, principal.user.id, payload);
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'marketing',
      action: 'save_marketing_setting',
      entityType: 'marketing-setting',
      entityId: `${principal.user.accountId}:${key}`,
      payloadSummary: `Marketing setting ${key} saved`,
      riskLevel: 'high',
      correlationId
    });
    return json(response, 200, setting);
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
      gateway: createMarketingGateway(
        handlers.smsGateway,
        handlers.emailGateway,
        handlers.whatsAppProvider
      )
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

  const retryDeliveryId = parseDeliveryId(pathname);
  if (retryDeliveryId && request.method === 'POST') {
    const principal = requirePrincipal(request, 'marketing.manage');
    const delivery = await marketing.retryDelivery(
      principal.user.accountId,
      principal.user.id,
      retryDeliveryId,
      createMarketingGateway(handlers.smsGateway, handlers.emailGateway, handlers.whatsAppProvider)
    );
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'marketing',
      action: 'retry_marketing_delivery',
      entityType: 'marketing-delivery',
      entityId: delivery.id,
      payloadSummary: `Marketing delivery ${delivery.id} retried with status ${delivery.status}`,
      riskLevel: 'high',
      correlationId
    });
    return json(response, 200, delivery);
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

function createMarketingGateway(
  smsGateway?: SmsGateway,
  emailGateway?: EmailGateway,
  whatsAppProvider?: WhatsAppProviderService
): MarketingDispatchGateway {
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

      if (input.channel === 'email' && emailGateway) {
        const result = await emailGateway.send({
          to: input.to,
          subject: input.subject ?? 'Comunicação da clínica',
          text: input.body
        });
        return {
          status: result.status,
          provider: result.provider,
          providerMessageId: result.providerMessageId,
          failureReason: result.failureReason,
          sentAt: result.sentAt
        };
      }

      if (
        input.channel === 'whatsapp' &&
        whatsAppProvider &&
        input.accountId &&
        input.campaignId &&
        input.ownerId
      ) {
        const result = await whatsAppProvider.sendCampaignMessage({
          accountId: input.accountId,
          campaignId: input.campaignId,
          ownerId: input.ownerId as never,
          patientId: input.patientId as never,
          recipient: input.to,
          recipientName: input.ownerName ?? 'Tutor',
          body: input.body
        });
        return {
          status: result.sent ? 'sent' : 'failed',
          provider: result.provider ?? 'whatsapp',
          providerMessageId: result.messageId,
          failureReason: result.error,
          sentAt: new Date().toISOString()
        };
      }

      if (input.channel === 'whatsapp') {
        return {
          status: 'failed',
          provider: 'whatsapp-unconfigured',
          failureReason: 'WhatsApp provider is not configured for marketing dispatch',
          sentAt: new Date().toISOString()
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
