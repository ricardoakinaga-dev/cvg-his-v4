import type { IncomingMessage, ServerResponse } from 'node:http';
import type { ApiKeysService } from '@cvg-his-v2/module-api-keys';
import type { AuditService } from '@cvg-his-v2/module-audit';
import { ValidationError } from '@cvg-his-v2/shared-errors';
import { createCorrelationId, nowIso } from '@cvg-his-v2/shared-utils';
import { readJsonBody, validateRequestBody } from '../helpers/common.js';
import { requireApiKey } from '../helpers/auth-helpers.js';
import { appendAudit } from '../helpers/audit-helper.js';
import type { EmailGateway } from '../email-gateway.js';
import type { EmailDeliveryRepository } from '../email-delivery-repository.js';

export interface EmailRoutesHandlers {
  emailGateway: EmailGateway;
  emailDeliveries: EmailDeliveryRepository;
  emailMode: 'mock' | 'provider';
  emailFrom: string;
  resendConfigured: boolean;
  apiKeys: ApiKeysService;
  audit: AuditService;
}

export async function handleEmailRoutes(
  pathname: string,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  handlers: EmailRoutesHandlers
): Promise<boolean> {
  if (pathname === '/integrations/email/messages' && request.method === 'POST') {
    return handleEmailSend(request, response, correlationId, handlers);
  }

  if (pathname === '/integrations/email/messages/report' && request.method === 'GET') {
    return handleEmailReport(request, response, correlationId, handlers);
  }

  if (
    pathname.match(/^\/integrations\/email\/messages\/[^/]+\/retry$/)
    && request.method === 'POST'
  ) {
    return handleEmailRetry(request, pathname, response, correlationId, handlers);
  }

  return false;
}

async function handleEmailSend(
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  { emailGateway, emailDeliveries, apiKeys, audit }: EmailRoutesHandlers
): Promise<boolean> {
  const apiKeyPrincipal = await requireApiKey(request, 'notifications.manage', apiKeys);
  const body = (await readJsonBody(request)) as Record<string, unknown>;
  validateRequestBody(
    body,
    {
      to: { type: 'string', required: true, minLength: 5, maxLength: 320 },
      subject: { type: 'string', required: true, minLength: 3, maxLength: 200 },
      text: { type: 'string', required: true, minLength: 1, maxLength: 5000 }
    },
    correlationId
  );

  const messageId = createCorrelationId('email');
  const createdAt = nowIso();
  const maxRetries =
    typeof body.maxRetries === 'number' ? Math.max(0, Math.min(5, Math.floor(body.maxRetries))) : 2;

  const queued = {
    messageId,
    accountId: apiKeyPrincipal.apiKey.accountId,
    provider: emailGateway.providerName,
    to: String(body.to),
    subject: String(body.subject),
    text: String(body.text),
    status: 'queued' as const,
    createdAt,
    updatedAt: createdAt,
    retryCount: 0,
    maxRetries
  };
  await emailDeliveries.create(queued);

  const sendResult = await emailGateway.send({
    to: queued.to,
    subject: queued.subject,
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
  await emailDeliveries.update(delivered);

  appendAudit(audit, {
    actorId: 'system',
    accountId: apiKeyPrincipal.apiKey.accountId,
    module: 'integrations',
    action: sendResult.status === 'sent' ? 'email_send' : 'email_send_failed',
    entityType: 'email-message',
    entityId: messageId,
    payloadSummary: `Transactional email ${sendResult.status} to ${queued.to} via ${sendResult.provider}`,
    riskLevel: sendResult.status === 'sent' ? 'low' : 'medium',
    correlationId
  });

  void apiKeys.recordUsage({
    apiKeyId: apiKeyPrincipal.apiKey.id,
    endpoint: '/integrations/email/messages',
    method: 'POST',
    statusCode: sendResult.status === 'sent' ? 201 : 202,
    responseTimeMs: null
  });

  response.statusCode = sendResult.status === 'sent' ? 201 : 202;
  response.setHeader('content-type', 'application/json');
  response.end(JSON.stringify(delivered));
  return true;
}

async function handleEmailRetry(
  request: IncomingMessage,
  pathname: string,
  response: ServerResponse,
  correlationId: string,
  { emailGateway, emailDeliveries, apiKeys, audit }: EmailRoutesHandlers
): Promise<boolean> {
  const apiKeyPrincipal = await requireApiKey(request, 'notifications.manage', apiKeys);
  const messageId = pathname.split('/')[4] ?? '';
  const existing = await emailDeliveries.findByMessageId(messageId);
  if (!existing || existing.accountId !== apiKeyPrincipal.apiKey.accountId) {
    response.statusCode = 404;
    response.end(JSON.stringify({ code: 'NOT_FOUND', message: 'Email message not found' }));
    return true;
  }
  if (existing.retryCount >= existing.maxRetries) {
    throw new ValidationError('maxRetries reached for this email message');
  }

  const sendResult = await emailGateway.send({
    to: existing.to,
    subject: existing.subject,
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
  await emailDeliveries.update(updated);

  appendAudit(audit, {
    actorId: 'system',
    accountId: apiKeyPrincipal.apiKey.accountId,
    module: 'integrations',
    action: sendResult.status === 'sent' ? 'email_retry' : 'email_retry_failed',
    entityType: 'email-message',
    entityId: messageId,
    payloadSummary: `Transactional email retry ${sendResult.status} for ${existing.to}`,
    riskLevel: sendResult.status === 'sent' ? 'low' : 'medium',
    correlationId
  });

  response.statusCode = sendResult.status === 'sent' ? 200 : 202;
  response.setHeader('content-type', 'application/json');
  response.end(JSON.stringify(updated));
  return true;
}

async function handleEmailReport(
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  { emailGateway, emailDeliveries, emailMode, emailFrom, resendConfigured, apiKeys, audit }: EmailRoutesHandlers
): Promise<boolean> {
  const apiKeyPrincipal = await requireApiKey(request, 'integrations.read', apiKeys);
  const items = await emailDeliveries.list(apiKeyPrincipal.apiKey.accountId);
  const summary = {
    total: items.length,
    sent: items.filter((item) => item.status === 'sent').length,
    failed: items.filter((item) => item.status === 'failed').length,
    queued: items.filter((item) => item.status === 'queued').length
  };
  const byProvider = {
    'local-email': items.filter((item) => item.provider === 'local-email').length,
    resend: items.filter((item) => item.provider === 'resend').length
  };
  const pendingRetries = items.filter(
    (item) => item.status === 'failed' && item.retryCount < item.maxRetries
  ).length;

  appendAudit(audit, {
    actorId: 'system',
    accountId: apiKeyPrincipal.apiKey.accountId,
    module: 'integrations',
    action: 'email_report_view',
    entityType: 'email-message',
    entityId: 'all',
    payloadSummary: 'Transactional email operational report listed',
    riskLevel: 'low',
    correlationId
  });

  void apiKeys.recordUsage({
    apiKeyId: apiKeyPrincipal.apiKey.id,
    endpoint: '/integrations/email/messages/report',
    method: 'GET',
    statusCode: 200,
    responseTimeMs: null
  });

  response.statusCode = 200;
  response.setHeader('content-type', 'application/json');
  response.end(
    JSON.stringify({
      provider: emailGateway.providerName,
      operational: {
        mode: emailMode,
        defaultFrom: emailFrom,
        resendConfigured,
        pendingRetries,
        byProvider
      },
      summary,
      items
    })
  );
  return true;
}
