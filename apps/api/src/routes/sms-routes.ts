import type { IncomingMessage, ServerResponse } from 'node:http';

import type { ApiKeysService } from '@cvg-his-v2/module-api-keys';
import type { AuditService } from '@cvg-his-v2/module-audit';
import { ValidationError } from '@cvg-his-v2/shared-errors';
import { createCorrelationId, nowIso } from '@cvg-his-v2/shared-utils';

import type { SmsDeliveryRepository } from '../sms-delivery-repository.js';
import type { SmsGateway } from '../sms-gateway.js';
import { appendAudit } from '../helpers/audit-helper.js';
import { requireApiKey } from '../helpers/auth-helpers.js';
import { readJsonBody, validateRequestBody } from '../helpers/common.js';

export interface SmsRoutesHandlers {
  smsGateway: SmsGateway;
  smsDeliveries: SmsDeliveryRepository;
  smsMode: 'mock' | 'provider';
  smsFrom: string;
  smsConfigured: boolean;
  apiKeys: ApiKeysService;
  audit: AuditService;
}

export async function handleSmsRoutes(
  pathname: string,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  handlers: SmsRoutesHandlers
): Promise<boolean> {
  if (pathname === '/integrations/sms/messages' && request.method === 'POST') {
    return handleSmsSend(request, response, correlationId, handlers);
  }
  if (pathname === '/integrations/sms/messages/report' && request.method === 'GET') {
    return handleSmsReport(request, response, correlationId, handlers);
  }
  if (pathname.match(/^\/integrations\/sms\/messages\/[^/]+\/retry$/) && request.method === 'POST') {
    return handleSmsRetry(request, pathname, response, correlationId, handlers);
  }
  return false;
}

async function handleSmsSend(
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  { smsGateway, smsDeliveries, apiKeys, audit }: SmsRoutesHandlers
): Promise<boolean> {
  const apiKeyPrincipal = await requireApiKey(request, 'notifications.manage', apiKeys);
  const body = (await readJsonBody(request)) as Record<string, unknown>;
  validateRequestBody(
    body,
    {
      to: { type: 'string', required: true, minLength: 8, maxLength: 32 },
      text: { type: 'string', required: true, minLength: 1, maxLength: 1000 }
    },
    correlationId
  );

  const messageId = createCorrelationId('sms');
  const createdAt = nowIso();
  const maxRetries =
    typeof body.maxRetries === 'number' ? Math.max(0, Math.min(5, Math.floor(body.maxRetries))) : 2;
  const queued = {
    messageId,
    accountId: apiKeyPrincipal.apiKey.accountId,
    provider: smsGateway.providerName,
    to: String(body.to),
    text: String(body.text),
    status: 'queued' as const,
    createdAt,
    updatedAt: createdAt,
    retryCount: 0,
    maxRetries
  };
  await smsDeliveries.create(queued);

  const sendResult = await smsGateway.send({
    to: queued.to,
    text: queued.text
  });

  const delivered = {
    ...queued,
    provider: sendResult.provider,
    status: sendResult.status,
    updatedAt: sendResult.sentAt,
    sentAt: sendResult.status === 'sent' ? sendResult.sentAt : undefined,
    failedAt: sendResult.status === 'failed' ? sendResult.sentAt : undefined,
    failureReason: sendResult.failureReason,
    providerMessageId: sendResult.providerMessageId,
    retryCount: sendResult.status === 'failed' ? 1 : 0
  };
  await smsDeliveries.update(delivered);

  appendAudit(audit, {
    actorId: 'system',
    accountId: apiKeyPrincipal.apiKey.accountId,
    module: 'integrations',
    action: sendResult.status === 'sent' ? 'sms_send' : 'sms_send_failed',
    entityType: 'sms-message',
    entityId: messageId,
    payloadSummary: `Transactional SMS ${sendResult.status} to ${queued.to} via ${sendResult.provider}`,
    riskLevel: sendResult.status === 'sent' ? 'low' : 'medium',
    correlationId
  });

  response.statusCode = sendResult.status === 'sent' ? 201 : 202;
  response.setHeader('content-type', 'application/json');
  response.end(JSON.stringify(delivered));
  return true;
}

async function handleSmsRetry(
  request: IncomingMessage,
  pathname: string,
  response: ServerResponse,
  correlationId: string,
  { smsGateway, smsDeliveries, apiKeys, audit }: SmsRoutesHandlers
): Promise<boolean> {
  const apiKeyPrincipal = await requireApiKey(request, 'notifications.manage', apiKeys);
  const messageId = pathname.split('/')[4] ?? '';
  const existing = await smsDeliveries.findByMessageId(messageId);
  if (!existing || existing.accountId !== apiKeyPrincipal.apiKey.accountId) {
    response.statusCode = 404;
    response.end(JSON.stringify({ code: 'NOT_FOUND', message: 'SMS message not found' }));
    return true;
  }
  if (existing.retryCount >= existing.maxRetries) {
    throw new ValidationError('maxRetries reached for this sms message');
  }

  const sendResult = await smsGateway.send({
    to: existing.to,
    text: existing.text
  });
  const updated = {
    ...existing,
    provider: sendResult.provider,
    status: sendResult.status,
    updatedAt: sendResult.sentAt,
    sentAt: sendResult.status === 'sent' ? sendResult.sentAt : existing.sentAt,
    failedAt: sendResult.status === 'failed' ? sendResult.sentAt : existing.failedAt,
    failureReason: sendResult.failureReason,
    providerMessageId: sendResult.providerMessageId ?? existing.providerMessageId,
    retryCount: existing.retryCount + 1
  };
  await smsDeliveries.update(updated);

  appendAudit(audit, {
    actorId: 'system',
    accountId: apiKeyPrincipal.apiKey.accountId,
    module: 'integrations',
    action: sendResult.status === 'sent' ? 'sms_retry' : 'sms_retry_failed',
    entityType: 'sms-message',
    entityId: messageId,
    payloadSummary: `Transactional SMS retry ${sendResult.status} for ${existing.to}`,
    riskLevel: sendResult.status === 'sent' ? 'low' : 'medium',
    correlationId
  });

  response.statusCode = sendResult.status === 'sent' ? 200 : 202;
  response.setHeader('content-type', 'application/json');
  response.end(JSON.stringify(updated));
  return true;
}

async function handleSmsReport(
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  { smsGateway, smsDeliveries, smsMode, smsFrom, smsConfigured, apiKeys, audit }: SmsRoutesHandlers
): Promise<boolean> {
  const apiKeyPrincipal = await requireApiKey(request, 'integrations.read', apiKeys);
  const items = await smsDeliveries.list(apiKeyPrincipal.apiKey.accountId);

  appendAudit(audit, {
    actorId: 'system',
    accountId: apiKeyPrincipal.apiKey.accountId,
    module: 'integrations',
    action: 'sms_report_view',
    entityType: 'sms-message',
    entityId: 'all',
    payloadSummary: 'Transactional SMS operational report listed',
    riskLevel: 'low',
    correlationId
  });

  response.statusCode = 200;
  response.setHeader('content-type', 'application/json');
  response.end(
    JSON.stringify({
      provider: smsGateway.providerName,
      operational: {
        mode: smsMode,
        defaultFrom: smsFrom,
        smsConfigured,
        pendingRetries: items.filter((item) => item.status === 'failed' && item.retryCount < item.maxRetries).length
      },
      summary: {
        total: items.length,
        sent: items.filter((item) => item.status === 'sent').length,
        failed: items.filter((item) => item.status === 'failed').length,
        queued: items.filter((item) => item.status === 'queued').length
      },
      items
    })
  );
  return true;
}
