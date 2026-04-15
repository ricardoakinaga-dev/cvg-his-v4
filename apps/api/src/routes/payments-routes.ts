/**
 * Payments route handlers — PIX intents and confirmations.
 * Extracted from server.ts as part of the controlled refactoring initiative.
 * These handlers are called from server.ts and return true if the route was handled.
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createCorrelationId } from '@cvg-his-v2/shared-utils';
import type { CorrelationId, ModuleName } from '@cvg-his-v2/shared-types';
import type { ApiKeysService } from '@cvg-his-v2/module-api-keys';
import type { AuditService } from '@cvg-his-v2/module-audit';
import { ValidationError } from '@cvg-his-v2/shared-errors';
import { readJsonBody, validateRequestBody } from '../helpers/common.js';
import { requireApiKey } from '../helpers/auth-helpers.js';
import { appendAudit } from '../helpers/audit-helper.js';
import type { EventBusService } from '@cvg-his-v2/module-event-bus';
import type { PaymentGateway } from '../payment-gateway.js';

export interface PaymentsHandlers {
  eventBus: EventBusService;
  paymentGateway: PaymentGateway;
  apiKeys: ApiKeysService;
  audit: AuditService;
}

/**
 * Handle all payments-related routes.
 * Returns true if the request was handled, false if the route didn't match.
 * Throws on authentication/validation errors (caller handles error response).
 */
export function handlePaymentsRoutes(
  pathname: string,
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  handlers: PaymentsHandlers
): Promise<boolean> | boolean {
  const { eventBus, paymentGateway, apiKeys, audit } = handlers;

  // POST /payments/pix/intents — create PIX intent
  if (pathname === '/payments/pix/intents' && request.method === 'POST') {
    return handlePixIntentCreate(request, response, correlationId, { eventBus, paymentGateway, apiKeys, audit });
  }

  // POST /payments/pix/intents/:intentId/confirm — confirm PIX payment
  if (pathname.match(/^\/payments\/pix\/intents\/[^/]+\/confirm$/) && request.method === 'POST') {
    return handlePixIntentConfirm(request, pathname, response, correlationId, { eventBus, paymentGateway, apiKeys, audit });
  }

  return false;
}

async function handlePixIntentCreate(
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  { eventBus, paymentGateway, apiKeys, audit }: PaymentsHandlers
): Promise<boolean> {
  const apiKeyPrincipal = await requireApiKey(request, 'payments.manage', apiKeys);
  const body = (await readJsonBody(request)) as Record<string, unknown>;

  validateRequestBody(
    body,
    {
      amount: { type: 'number', required: true },
      description: { type: 'string', required: true, minLength: 3, maxLength: 140 }
    },
    correlationId
  );

  if (typeof body.amount !== 'number' || !Number.isFinite(body.amount) || body.amount <= 0) {
    throw new ValidationError('amount must be a positive number');
  }

  const intent = await paymentGateway.createPixIntent({
    accountId: apiKeyPrincipal.apiKey.accountId,
    billingRecordId:
      typeof body.billingRecordId === 'string' ? body.billingRecordId : undefined,
    amount: body.amount,
    description: String(body.description),
    expirationMinutes:
      typeof body.expirationMinutes === 'number'
        ? Math.max(5, Math.floor(body.expirationMinutes))
        : undefined
  });

  const event = await eventBus.publish({
    correlationId: createCorrelationId('pix') as CorrelationId,
    moduleName: 'billing' as ModuleName,
    eventType: 'payment.pix.intent.created',
    payload: {
      accountId: apiKeyPrincipal.apiKey.accountId,
      intentId: intent.id,
      billingRecordId: intent.billingRecordId,
      amount: intent.amount,
      currency: intent.currency,
      description: intent.description,
      provider: intent.provider,
      status: intent.status,
      qrCodePayload: intent.qrCodePayload,
      qrCodeBase64: intent.qrCodeBase64,
      expiresAt: intent.expiresAt,
      createdAt: intent.createdAt
    }
  });

  appendAudit(audit, {
    actorId: 'system',
    accountId: apiKeyPrincipal.apiKey.accountId,
    module: 'billing',
    action: 'pix_intent_create',
    entityType: 'payment_intent',
    entityId: intent.id,
    payloadSummary: `PIX intent ${intent.id} created via API key ${apiKeyPrincipal.apiKey.id}`,
    riskLevel: 'medium',
    correlationId
  });

  void apiKeys.recordUsage({
    apiKeyId: apiKeyPrincipal.apiKey.id,
    endpoint: '/payments/pix/intents',
    method: 'POST',
    statusCode: 201,
    responseTimeMs: null
  });

  response.statusCode = 201;
  response.setHeader('content-type', 'application/json');
  response.end(
    JSON.stringify({
      id: intent.id,
      accountId: apiKeyPrincipal.apiKey.accountId,
      billingRecordId: intent.billingRecordId,
      amount: intent.amount,
      currency: intent.currency,
      provider: intent.provider,
      status: intent.status,
      qrCodePayload: intent.qrCodePayload,
      qrCodeBase64: intent.qrCodeBase64,
      expiresAt: intent.expiresAt,
      eventId: event.id,
      eventCorrelationId: event.correlationId
    })
  );

  return true;
}

async function handlePixIntentConfirm(
  request: IncomingMessage,
  pathname: string,
  response: ServerResponse,
  correlationId: string,
  { eventBus, paymentGateway, apiKeys, audit }: PaymentsHandlers
): Promise<boolean> {
  const intentId = pathname.split('/')[4];
  const apiKeyPrincipal = await requireApiKey(request, 'payments.manage', apiKeys);

  if (!paymentGateway.confirmPayment) {
    response.statusCode = 501;
    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify({ code: 'NOT_IMPLEMENTED', message: 'Payment confirmation not available' }));
    return true;
  }

  const confirmResult = paymentGateway.confirmPayment(intentId);
  if (!confirmResult) {
    response.statusCode = 404;
    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify({ code: 'NOT_FOUND', message: 'Intent not found' }));
    return true;
  }

  const confirmedEvent = await eventBus.publish({
    correlationId: createCorrelationId('pix') as CorrelationId,
    moduleName: 'billing' as ModuleName,
    eventType: 'payment.pix.confirmed',
    payload: {
      intentId,
      billingRecordId: confirmResult.billingRecordId,
      accountId: apiKeyPrincipal.apiKey.accountId,
      providerTransactionId: confirmResult.providerTransactionId,
      providerConfirmationId: confirmResult.providerTransactionId,
      status: confirmResult.status,
      completedAt: confirmResult.completedAt
    }
  });

  appendAudit(audit, {
    actorId: 'system',
    accountId: apiKeyPrincipal.apiKey.accountId,
    module: 'billing',
    action: 'pix_confirm',
    entityType: 'payment',
    entityId: intentId,
    payloadSummary: `PIX intent ${intentId} confirmed`,
    riskLevel: 'high',
    correlationId
  });

  response.statusCode = 200;
  response.setHeader('content-type', 'application/json');
  response.end(
    JSON.stringify({
      transactionId: intentId,
      status: confirmResult.status,
      completedAt: confirmResult.completedAt,
      eventId: confirmedEvent.id,
      eventCorrelationId: confirmedEvent.correlationId
    })
  );

  return true;
}
