import type { IncomingMessage, ServerResponse } from 'node:http';

import {
  CreateMarketingCampaignInput,
  CreateMarketingSegmentInput,
  CreateMarketingTemplateInput,
  DeterministicMarketingSandboxGateway,
  MarketingAudienceMember,
  MarketingCampaignStatus,
  MarketingChannel,
  MarketingConsentStatus,
  MarketingDispatchGateway,
  MarketingProviderMode,
  MarketingService,
  MarketingSettingKey,
  SaveMarketingSettingInput,
  resolveMarketingProviderMode
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
  marketingProviderMode?: MarketingProviderMode;
  audit: AuditService;
  requirePrincipal: (request: IncomingMessage, permissionCode: string) => AuthenticatedPrincipal | PromiseLike<AuthenticatedPrincipal>;
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

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parseOwnerId(value: unknown): string {
  if (typeof value !== 'string' || !UUID_PATTERN.test(value)) {
    throw new ValidationError('ownerId must be a valid UUID');
  }
  return value;
}

function parseMarketingAudience(value: unknown): readonly MarketingAudienceMember[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new ValidationError('audience must be an array');

  return value.map((item, index) => {
    if (!item || typeof item !== 'object' || Array.isArray(item)) {
      throw new ValidationError(`audience[${index}] must be an object`);
    }
    const record = item as Record<string, unknown>;
    if (typeof record.ownerId !== 'string' || record.ownerId.trim().length === 0) {
      throw new ValidationError(`audience[${index}].ownerId is required`);
    }
    if (record.contacts !== undefined && !Array.isArray(record.contacts)) {
      throw new ValidationError(`audience[${index}].contacts must be an array`);
    }
    const contacts = (record.contacts ?? []).map((contact, contactIndex) => {
      if (!contact || typeof contact !== 'object' || Array.isArray(contact)) {
        throw new ValidationError(`audience[${index}].contacts[${contactIndex}] must be an object`);
      }
      const parsedContact = contact as Record<string, unknown>;
      if (
        parsedContact.type !== 'sms'
        && parsedContact.type !== 'whatsapp'
        && parsedContact.type !== 'email'
      ) {
        throw new ValidationError(`audience[${index}].contacts[${contactIndex}].type is invalid`);
      }
      if (typeof parsedContact.value !== 'string' || parsedContact.value.trim().length === 0) {
        throw new ValidationError(`audience[${index}].contacts[${contactIndex}].value is required`);
      }
      return { type: parsedContact.type, value: parsedContact.value.trim() };
    });

    return {
      ...record,
      ownerId: record.ownerId.trim(),
      ownerName: typeof record.ownerName === 'string' ? record.ownerName.trim() : '',
      contacts
    } as MarketingAudienceMember;
  });
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

  if (pathname === '/marketing/consent' && request.method === 'GET') {
    const principal = await requirePrincipal(request, 'marketing.read');
    const ownerId = parseOwnerId(url.searchParams.get('ownerId'));
    const consent = await marketing.getConsent(principal.user.accountId, ownerId);
    return json(response, 200, { consent });
  }

  const consentAction = pathname === '/marketing/consent/opt-out'
    ? 'revoked'
    : pathname === '/marketing/consent/opt-in'
      ? 'granted'
      : null;
  if (consentAction && request.method === 'POST') {
    const principal = await requirePrincipal(request, 'marketing.manage');
    const payload = await readJsonBody(request);
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new ValidationError('consent payload is required');
    }
    const ownerId = parseOwnerId((payload as Record<string, unknown>).ownerId);
    const consent = await marketing.setConsent(
      principal.user.accountId,
      principal.user.id,
      ownerId,
      consentAction satisfies MarketingConsentStatus
    );
    appendAudit(audit, {
      actorId: principal.user.id,
      accountId: principal.user.accountId,
      module: 'marketing',
      action: consentAction === 'revoked' ? 'marketing_opt_out' : 'marketing_opt_in',
      entityType: 'marketing-consent',
      entityId: `${principal.user.accountId}:${ownerId}`,
      payloadSummary: `Marketing consent ${consentAction} for owner ${ownerId}`,
      riskLevel: 'high',
      correlationId
    });
    return json(response, 200, consent);
  }

  if (pathname === '/marketing/segments' && request.method === 'GET') {
    const principal = await requirePrincipal(request, 'marketing.read');
    return json(response, 200, {
      items: marketing.listSegments(principal.user.accountId)
    });
  }

  if (pathname === '/marketing/segments' && request.method === 'POST') {
    const principal = await requirePrincipal(request, 'marketing.manage');
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
    const principal = await requirePrincipal(request, 'marketing.read');
    return json(response, 200, {
      items: marketing.listTemplates(principal.user.accountId, parseChannel(url.searchParams.get('channel')))
    });
  }

  if (pathname === '/marketing/templates' && request.method === 'POST') {
    const principal = await requirePrincipal(request, 'marketing.manage');
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
    const principal = await requirePrincipal(request, 'marketing.read');
    const key = parseSettingKey(url.searchParams.get('key'));
    const setting = await marketing.getSetting(principal.user.accountId, key);
    return json(response, 200, { setting });
  }

  const settingMatch = pathname.match(/^\/marketing\/settings\/([^/]+)$/);
  if (settingMatch && request.method === 'PATCH') {
    const principal = await requirePrincipal(request, 'marketing.manage');
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
    const principal = await requirePrincipal(request, 'marketing.read');
    return json(response, 200, {
      items: marketing.listCampaigns(principal.user.accountId, parseCampaignStatus(url.searchParams.get('status')))
    });
  }

  if (pathname === '/marketing/campaigns' && request.method === 'POST') {
    const principal = await requirePrincipal(request, 'marketing.manage');
    const rawPayload = await readJsonBody(request);
    if (!rawPayload || typeof rawPayload !== 'object' || Array.isArray(rawPayload)) {
      throw new ValidationError('campaign payload is required');
    }
    const payload = {
      ...(rawPayload as Record<string, unknown>),
      audience: parseMarketingAudience((rawPayload as Record<string, unknown>).audience)
    } as CreateMarketingCampaignInput;
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
    const principal = await requirePrincipal(request, 'marketing.manage');
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
    const principal = await requirePrincipal(request, 'marketing.manage');
    const rawPayload = await readJsonBody(request);
    if (!rawPayload || typeof rawPayload !== 'object' || Array.isArray(rawPayload)) {
      throw new ValidationError('dispatch payload is required');
    }
    const payload = rawPayload as { audience?: unknown };
    const result = await marketing.dispatchCampaign(principal.user.accountId, principal.user.id, dispatchCampaignId, {
      audience: parseMarketingAudience(payload.audience),
      gateway: createMarketingGateway(
        handlers.smsGateway,
        handlers.emailGateway,
        handlers.whatsAppProvider,
        handlers.marketingProviderMode
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
    const principal = await requirePrincipal(request, 'marketing.manage');
    const delivery = await marketing.retryDelivery(
      principal.user.accountId,
      principal.user.id,
      retryDeliveryId,
      createMarketingGateway(
        handlers.smsGateway,
        handlers.emailGateway,
        handlers.whatsAppProvider,
        handlers.marketingProviderMode
      )
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
    const principal = await requirePrincipal(request, 'marketing.read');
    return json(response, 200, {
      items: marketing.listDeliveries(principal.user.accountId, deliveriesCampaignId)
    });
  }

  return false;
}

function createMarketingGateway(
  smsGateway?: SmsGateway,
  emailGateway?: EmailGateway,
  whatsAppProvider?: WhatsAppProviderService,
  configuredMode?: MarketingProviderMode
): MarketingDispatchGateway {
  const mode = resolveMarketingProviderMode(configuredMode);
  if (mode === 'sandbox') return new DeterministicMarketingSandboxGateway();

  return {
    async send(input) {
      if (input.channel === 'sms' && smsGateway) {
        const result = await smsGateway.send({
          to: input.to,
          text: input.body,
          idempotencyKey: input.idempotencyKey ?? input.deliveryKey,
          deliveryKey: input.deliveryKey
        } as Parameters<SmsGateway['send']>[0] & { readonly deliveryKey?: string });
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
          text: input.body,
          idempotencyKey: input.idempotencyKey ?? input.deliveryKey,
          deliveryKey: input.deliveryKey
        } as Parameters<EmailGateway['send']>[0] & { readonly deliveryKey?: string });
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
          body: input.body,
          deliveryKey: input.deliveryKey,
          idempotencyKey: input.idempotencyKey ?? input.deliveryKey
        } as never);
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

      return {
        status: 'failed',
        provider: 'marketing-external-unconfigured',
        failureReason: `No external ${input.channel} provider is configured for marketing dispatch`,
        sentAt: new Date().toISOString()
      };
    }
  };
}
