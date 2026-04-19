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
import type { CardTransactionRepository } from '../card-transaction-repository.js';

export interface PaymentsHandlers {
  eventBus: EventBusService;
  paymentGateway: PaymentGateway;
  apiKeys: ApiKeysService;
  audit: AuditService;
  cardTransactions: CardTransactionRepository;
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
  const { eventBus, paymentGateway, apiKeys, audit, cardTransactions } = handlers;

  // POST /payments/pix/intents — create PIX intent
  if (pathname === '/payments/pix/intents' && request.method === 'POST') {
    return handlePixIntentCreate(request, response, correlationId, { eventBus, paymentGateway, apiKeys, audit });
  }

  // POST /payments/cards/intents — create card intent
  if (pathname === '/payments/cards/intents' && request.method === 'POST') {
    return handleCardIntentCreate(request, response, correlationId, {
      eventBus,
      paymentGateway,
      apiKeys,
      audit
    });
  }

  // POST /payments/cards/intents/:intentId/capture — capture authorized card payment
  if (pathname.match(/^\/payments\/cards\/intents\/[^/]+\/capture$/) && request.method === 'POST') {
    return handleCardIntentCapture(request, pathname, response, correlationId, {
      eventBus,
      paymentGateway,
      apiKeys,
      audit
    });
  }

  // GET /payments/cards/report — operational report for card intents
  if (pathname === '/payments/cards/report' && request.method === 'GET') {
    return handleCardPaymentsReport(request, response, correlationId, {
      paymentGateway,
      apiKeys,
      audit,
      cardTransactions
    });
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
  {
    eventBus,
    paymentGateway,
    apiKeys,
    audit
  }: Pick<PaymentsHandlers, 'eventBus' | 'paymentGateway' | 'apiKeys' | 'audit'>
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

async function handleCardIntentCreate(
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  {
    eventBus,
    paymentGateway,
    apiKeys,
    audit
  }: Pick<PaymentsHandlers, 'eventBus' | 'paymentGateway' | 'apiKeys' | 'audit'>
): Promise<boolean> {
  const apiKeyPrincipal = await requireApiKey(request, 'payments.manage', apiKeys);

  if (!paymentGateway.createCardIntent) {
    response.statusCode = 501;
    response.setHeader('content-type', 'application/json');
    response.end(
      JSON.stringify({ code: 'NOT_IMPLEMENTED', message: 'Card payment intents not available' })
    );
    return true;
  }

  const body = (await readJsonBody(request)) as Record<string, unknown>;

  validateRequestBody(
    body,
    {
      amount: { type: 'number', required: true },
      description: { type: 'string', required: true, minLength: 3, maxLength: 140 },
      cardHolderName: { type: 'string', required: true, minLength: 3, maxLength: 120 },
      last4: { type: 'string', required: true, minLength: 4, maxLength: 4 },
      customerName: { type: 'string', required: true, minLength: 3, maxLength: 140 },
      customerEmail: { type: 'string', required: true, minLength: 5, maxLength: 160 }
    },
    correlationId
  );

  if (typeof body.amount !== 'number' || !Number.isFinite(body.amount) || body.amount <= 0) {
    throw new ValidationError('amount must be a positive number');
  }

  if (typeof body.last4 !== 'string' || !/^\d{4}$/.test(body.last4)) {
    throw new ValidationError('last4 must be a 4-digit string');
  }

  const installments =
    typeof body.installments === 'number' ? Math.max(1, Math.floor(body.installments)) : 1;

  const intent = await paymentGateway.createCardIntent({
    accountId: apiKeyPrincipal.apiKey.accountId,
    billingRecordId:
      typeof body.billingRecordId === 'string' ? body.billingRecordId : undefined,
    amount: body.amount,
    description: String(body.description),
    cardHolderName: String(body.cardHolderName),
    brand: typeof body.brand === 'string' ? body.brand : undefined,
    last4: body.last4,
    installments,
    capture: body.capture === true,
    cardToken: typeof body.cardToken === 'string' ? body.cardToken : undefined,
    cardId: typeof body.cardId === 'string' ? body.cardId : undefined,
    customer: {
      name: String(body.customerName),
      email: String(body.customerEmail),
      type:
        body.customerType === 'company' || body.customerType === 'individual'
          ? body.customerType
          : undefined,
      document: typeof body.customerDocument === 'string' ? body.customerDocument : undefined
    },
    billingAddress:
      typeof body.billingAddress === 'object' && body.billingAddress !== null
        ? {
            line1:
              typeof (body.billingAddress as Record<string, unknown>).line1 === 'string'
                ? String((body.billingAddress as Record<string, unknown>).line1)
                : '',
            line2:
              typeof (body.billingAddress as Record<string, unknown>).line2 === 'string'
                ? String((body.billingAddress as Record<string, unknown>).line2)
                : undefined,
            zipCode:
              typeof (body.billingAddress as Record<string, unknown>).zipCode === 'string'
                ? String((body.billingAddress as Record<string, unknown>).zipCode)
                : '',
            city:
              typeof (body.billingAddress as Record<string, unknown>).city === 'string'
                ? String((body.billingAddress as Record<string, unknown>).city)
                : '',
            state:
              typeof (body.billingAddress as Record<string, unknown>).state === 'string'
                ? String((body.billingAddress as Record<string, unknown>).state)
                : '',
            country:
              typeof (body.billingAddress as Record<string, unknown>).country === 'string'
                ? String((body.billingAddress as Record<string, unknown>).country)
                : ''
          }
        : undefined
  });

  const event = await eventBus.publish({
    correlationId: createCorrelationId('card') as CorrelationId,
    moduleName: 'billing' as ModuleName,
    eventType: 'payment.card.intent.created',
    payload: {
      accountId: apiKeyPrincipal.apiKey.accountId,
      intentId: intent.id,
      billingRecordId: intent.billingRecordId,
      amount: intent.amount,
      currency: intent.currency,
      description: intent.description,
      provider: intent.provider,
      installments: intent.installments,
      status: intent.status,
      card: intent.card,
      createdAt: intent.createdAt,
      providerOrderId: intent.providerOrderId,
      providerChargeId: intent.providerChargeId,
      providerAuthorizationCode: intent.providerAuthorizationCode,
      providerReferenceId: intent.providerReferenceId
    }
  });

  appendAudit(audit, {
    actorId: 'system',
    accountId: apiKeyPrincipal.apiKey.accountId,
    module: 'billing',
    action: 'card_intent_create',
    entityType: 'payment_intent',
    entityId: intent.id,
    payloadSummary: `Card intent ${intent.id} created via API key ${apiKeyPrincipal.apiKey.id}`,
    riskLevel: 'high',
    correlationId
  });

  void apiKeys.recordUsage({
    apiKeyId: apiKeyPrincipal.apiKey.id,
    endpoint: '/payments/cards/intents',
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
      description: intent.description,
      installments: intent.installments,
      card: intent.card,
      createdAt: intent.createdAt,
      providerOrderId: intent.providerOrderId,
      providerChargeId: intent.providerChargeId,
      providerAuthorizationCode: intent.providerAuthorizationCode,
      providerReferenceId: intent.providerReferenceId,
      eventId: event.id,
      eventCorrelationId: event.correlationId
    })
  );

  return true;
}

async function handleCardIntentCapture(
  request: IncomingMessage,
  pathname: string,
  response: ServerResponse,
  correlationId: string,
  {
    eventBus,
    paymentGateway,
    apiKeys,
    audit
  }: Pick<PaymentsHandlers, 'eventBus' | 'paymentGateway' | 'apiKeys' | 'audit'>
): Promise<boolean> {
  const intentId = pathname.split('/')[4];
  const apiKeyPrincipal = await requireApiKey(request, 'payments.manage', apiKeys);

  if (!paymentGateway.captureCardIntent) {
    response.statusCode = 501;
    response.setHeader('content-type', 'application/json');
    response.end(
      JSON.stringify({ code: 'NOT_IMPLEMENTED', message: 'Card capture not available' })
    );
    return true;
  }

  const captureResult = await paymentGateway.captureCardIntent(intentId);
  if (captureResult.status === 'captured') {
    const completedEvent = await eventBus.publish({
      correlationId: createCorrelationId('card') as CorrelationId,
      moduleName: 'billing' as ModuleName,
      eventType: 'payment.card.completed',
      payload: {
        intentId,
        billingRecordId: captureResult.billingRecordId,
        accountId: apiKeyPrincipal.apiKey.accountId,
        provider: captureResult.provider,
        providerOrderId: captureResult.providerOrderId,
        providerChargeId: captureResult.providerChargeId ?? intentId,
        providerAuthorizationCode: captureResult.providerAuthorizationCode,
        providerReferenceId: captureResult.providerReferenceId,
        status: captureResult.status,
        capturedAt: captureResult.capturedAt
      }
    });

    appendAudit(audit, {
      actorId: 'system',
      accountId: apiKeyPrincipal.apiKey.accountId,
      module: 'billing',
      action: 'card_capture',
      entityType: 'payment',
      entityId: intentId,
      payloadSummary: `Card intent ${intentId} captured`,
      riskLevel: 'high',
      correlationId
    });

    response.statusCode = 200;
    response.setHeader('content-type', 'application/json');
    response.end(
      JSON.stringify({
        transactionId: intentId,
        provider: captureResult.provider,
        status: captureResult.status,
        providerOrderId: captureResult.providerOrderId,
        providerChargeId: captureResult.providerChargeId,
        providerAuthorizationCode: captureResult.providerAuthorizationCode,
        providerReferenceId: captureResult.providerReferenceId,
        capturedAt: captureResult.capturedAt,
        eventId: completedEvent.id,
        eventCorrelationId: completedEvent.correlationId
      })
    );
    return true;
  }

  const failedEvent = await eventBus.publish({
    correlationId: createCorrelationId('card') as CorrelationId,
    moduleName: 'billing' as ModuleName,
    eventType: 'payment.card.failed',
    payload: {
      intentId,
      billingRecordId: captureResult.billingRecordId,
      accountId: apiKeyPrincipal.apiKey.accountId,
      provider: captureResult.provider,
      providerOrderId: captureResult.providerOrderId,
      providerChargeId: captureResult.providerChargeId ?? intentId,
      providerAuthorizationCode: captureResult.providerAuthorizationCode,
      providerReferenceId: captureResult.providerReferenceId,
      status: captureResult.status,
      failureReason: captureResult.failureReason,
      failedAt: captureResult.capturedAt
    }
  });

  appendAudit(audit, {
    actorId: 'system',
    accountId: apiKeyPrincipal.apiKey.accountId,
    module: 'billing',
    action: 'card_capture_failed',
    entityType: 'payment',
    entityId: intentId,
    payloadSummary: `Card capture failed for ${intentId}: ${captureResult.failureReason ?? 'unknown_error'}`,
    riskLevel: 'high',
    correlationId
  });

  response.statusCode = 409;
  response.setHeader('content-type', 'application/json');
  response.end(
    JSON.stringify({
      transactionId: intentId,
      provider: captureResult.provider,
      status: captureResult.status,
      failureReason: captureResult.failureReason,
      eventId: failedEvent.id,
      eventCorrelationId: failedEvent.correlationId
    })
  );
  return true;
}

async function handleCardPaymentsReport(
  request: IncomingMessage,
  response: ServerResponse,
  correlationId: string,
  {
    paymentGateway,
    apiKeys,
    audit,
    cardTransactions
  }: Pick<PaymentsHandlers, 'paymentGateway' | 'apiKeys' | 'audit' | 'cardTransactions'>
): Promise<boolean> {
  const apiKeyPrincipal = await requireApiKey(request, 'payments.manage', apiKeys);
  const rows = await cardTransactions.list({
    accountId: apiKeyPrincipal.apiKey.accountId
  });

  const summary = {
    total: rows.length,
    captured: rows.filter((row) => row.status === 'captured').length,
    awaitingCapture: rows.filter((row) => row.status === 'authorized_pending_capture').length,
    failed: rows.filter((row) => row.status === 'failed' || row.status === 'not_authorized').length,
    pendingBilling: rows.filter((row) => row.billingSettlementStatus === 'pending_billing').length
  };

  appendAudit(audit, {
    actorId: 'system',
    accountId: apiKeyPrincipal.apiKey.accountId,
    module: 'billing',
    action: 'card_report_view',
    entityType: 'payment',
    entityId: 'all',
    payloadSummary: 'Card payment operational report listed',
    riskLevel: 'low',
    correlationId
  });

  void apiKeys.recordUsage({
    apiKeyId: apiKeyPrincipal.apiKey.id,
    endpoint: '/payments/cards/report',
    method: 'GET',
    statusCode: 200,
    responseTimeMs: null
  });

  response.statusCode = 200;
  response.setHeader('content-type', 'application/json');
  response.end(
    JSON.stringify({
      provider: paymentGateway.paymentProviders.cards,
      summary,
      items: rows
    })
  );
  return true;
}

async function handlePixIntentConfirm(
  request: IncomingMessage,
  pathname: string,
  response: ServerResponse,
  correlationId: string,
  {
    eventBus,
    paymentGateway,
    apiKeys,
    audit
  }: Pick<PaymentsHandlers, 'eventBus' | 'paymentGateway' | 'apiKeys' | 'audit'>
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
