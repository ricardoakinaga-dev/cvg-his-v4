/**
 * Payments route handlers — PIX intents and confirmations.
 * Extracted from server.ts as part of the controlled refactoring initiative.
 * These handlers are called from server.ts and return true if the route was handled.
 */
import { createHash } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { createCorrelationId } from '@cvg-his-v2/shared-utils';
import type { CorrelationId, ModuleName } from '@cvg-his-v2/shared-types';
import type { ApiKeysService } from '@cvg-his-v2/module-api-keys';
import type { AuditService } from '@cvg-his-v2/module-audit';
import type { BillingService } from '@cvg-his-v2/module-billing';
import { AppError, ValidationError } from '@cvg-his-v2/shared-errors';
import { readJsonBody, validateRequestBody } from '../helpers/common.js';
import { requireApiKey } from '../helpers/auth-helpers.js';
import { appendAudit } from '../helpers/audit-helper.js';
import type { EventBusService } from '@cvg-his-v2/module-event-bus';
import type { PaymentGateway, CardPaymentIntentInput, CardPaymentIntentSummary } from '../payment-gateway.js';
import type { CardTransactionRepository } from '../card-transaction-repository.js';
import type { PixTransactionRepository } from '../pix-transaction-repository.js';

export interface PaymentsHandlers {
  eventBus: EventBusService;
  paymentGateway: PaymentGateway;
  apiKeys: ApiKeysService;
  audit: AuditService;
  cardTransactions: CardTransactionRepository;
  pixTransactions: PixTransactionRepository;
  billing: BillingService;
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
  const { eventBus, paymentGateway, apiKeys, audit, cardTransactions, pixTransactions, billing } =
    handlers;

  // POST /payments/pix/intents — create PIX intent
  if (pathname === '/payments/pix/intents' && request.method === 'POST') {
    return handlePixIntentCreate(request, response, correlationId, {
      eventBus,
      paymentGateway,
      apiKeys,
      audit
    });
  }

  // POST /payments/cards/intents — create card intent
  if (pathname === '/payments/cards/intents' && request.method === 'POST') {
    return handleCardIntentCreate(request, response, correlationId, {
      eventBus,
      paymentGateway,
      apiKeys,
      audit,
      cardTransactions,
      billing
    });
  }

  // POST /payments/cards/intents/:intentId/capture — capture authorized card payment
  if (pathname.match(/^\/payments\/cards\/intents\/[^/]+\/capture$/) && request.method === 'POST') {
    return handleCardIntentCapture(request, pathname, response, correlationId, {
      eventBus,
      paymentGateway,
      apiKeys,
      audit,
      cardTransactions,
      billing
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
    return handlePixIntentConfirm(request, pathname, response, correlationId, {
      eventBus,
      paymentGateway,
      apiKeys,
      audit,
      pixTransactions
    });
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

  const billingRecordId =
    typeof body.billingRecordId === 'string' ? body.billingRecordId : undefined;
  if (billingRecordId !== undefined) {
    throw new AppError(
      'LEGACY_BILLING_PIX_DISABLED',
      'Billing-linked PIX requests must use the encounter PIX attempt endpoint',
      409
    );
  }

  const intent = await paymentGateway.createPixIntent({
    accountId: apiKeyPrincipal.apiKey.accountId,
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
      providerTransactionId: intent.providerTransactionId,
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
    audit,
    cardTransactions,
    billing
  }: Pick<PaymentsHandlers, 'eventBus' | 'paymentGateway' | 'apiKeys' | 'audit' | 'billing' | 'cardTransactions'>
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

  const billingRecordId =
    typeof body.billingRecordId === 'string' ? body.billingRecordId : undefined;
  if (billingRecordId) {
    const record = billing.getOrThrow(apiKeyPrincipal.apiKey.accountId, billingRecordId as never);
    if (record.accountId !== apiKeyPrincipal.apiKey.accountId) {
      throw new ValidationError('billingRecordId does not belong to the API key account');
    }
    if (record.currency !== 'BRL' || record.subtotalAmount !== body.amount) {
      throw new ValidationError('amount must match the billing record balance');
    }

  }

  if (body.installments !== undefined && (typeof body.installments !== 'number' || !Number.isInteger(body.installments) || body.installments < 1 || body.installments > 24)) {
    throw new ValidationError('installments must be an integer between 1 and 24');
  }
  if (body.capture !== undefined && typeof body.capture !== 'boolean') throw new ValidationError('capture must be a boolean');
  if (body.billingRecordId !== undefined && (typeof body.billingRecordId !== 'string' || !body.billingRecordId.trim())) throw new ValidationError('billingRecordId must be a nonempty string');
  const installments =
    typeof body.installments === 'number' ? Math.max(1, Math.floor(body.installments)) : 1;

  const input: CardPaymentIntentInput = {
    accountId: apiKeyPrincipal.apiKey.accountId,
    billingRecordId,
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
  };

  if (paymentGateway.paymentProviders.cards === 'pagarme-card' && !input.cardToken?.trim() && !input.cardId?.trim()) {
    throw new ValidationError('Card payment requires cardToken or cardId');
  }
  const accountId = apiKeyPrincipal.apiKey.accountId;
  // Canonical input contains only recognized fields. Hash payment credentials;
  // neither tokens nor the original request body enter the creation journal.
  const fingerprint = createHash('sha256').update(JSON.stringify(input)).digest('hex');
  const headerKey = request.headers['idempotency-key'];
  if (headerKey !== undefined && (typeof headerKey !== 'string' || !/^[\x21-\x7e]{1,128}$/.test(headerKey))) {
    throw new ValidationError('Idempotency-Key must contain 1 to 128 visible ASCII characters');
  }
  const key = headerKey ? `key:${headerKey}` : billingRecordId ? `billing:${billingRecordId}` : `request:${fingerprint}`;
  let reservation;
  try { reservation = await cardTransactions.reserveCreation(accountId, key, fingerprint, billingRecordId); }
  catch (error) {
    if (!(error instanceof Error) || error.message !== 'CARD_CREATION_BILLING_CONFLICT') throw error;
    response.statusCode = 409;
    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify({ code: 'CARD_CREATION_BILLING_CONFLICT', message: 'An existing billing payment must be reconciled before starting another attempt.' }));
    return true;
  }
  let attempt = reservation.attempt;
  if (attempt.fingerprint !== fingerprint) {
    response.statusCode = 409;
    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify({ code: 'CARD_CREATION_KEY_CONFLICT', creationId: attempt.id, message: 'Creation identity was already used with different payment details.' }));
    return true;
  }
  const sendCompleted = (value: Record<string, unknown>) => {
    response.statusCode = 201;
    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify(value));
  };
  if (attempt.response && attempt.response.status !== 'pending') { sendCompleted(attempt.response); return true; }
  try {
    if (!attempt.providerResult || attempt.providerResult.status === 'pending') {
      if (reservation.fresh && billingRecordId && billing.getOrThrow(accountId, billingRecordId as never).status === 'settled') {
        throw new Error('Billing record is already settled; no provider dispatch performed');
      }
      const result = await paymentGateway.createCardIntent(input, {
        deferPersistence: true, creationId: attempt.id, reconcileOnly: !reservation.fresh
      });
      if (result.accountId !== accountId || result.amount !== input.amount || result.currency !== 'BRL' || result.billingRecordId !== billingRecordId) {
        throw new Error('Card provider result identity mismatch');
      }
      if ((attempt.providerResult?.providerOrderId && attempt.providerResult.providerOrderId !== result.providerOrderId) ||
          (attempt.providerResult?.providerChargeId && attempt.providerResult.providerChargeId !== result.providerChargeId)) {
        throw new Error('Card creation reconciliation changed provider identity');
      }
      await cardTransactions.saveCreationResult(accountId, attempt.id, { ...result });
      attempt = await cardTransactions.findCreation(accountId, attempt.id);
    }
    const intent = attempt.providerResult as unknown as CardPaymentIntentSummary;
    if (intent.status === 'pending') throw new Error('Card creation requires provider reconciliation');
  await cardTransactions.create({
    transactionId: intent.id, accountId: intent.accountId,
    provider: intent.provider as 'local-card' | 'pagarme-card', billingRecordId: intent.billingRecordId,
    amount: intent.amount, currency: intent.currency, description: intent.description,
    installments: intent.installments, status: ['captured', 'failed', 'not_authorized'].includes(intent.status) ? 'pending' : intent.status,
    createdAt: intent.createdAt, updatedAt: intent.createdAt,
    providerOrderId: intent.providerOrderId, providerChargeId: intent.providerChargeId,
    providerAuthorizationCode: intent.providerAuthorizationCode, providerReferenceId: intent.providerReferenceId,
    cardHolderName: intent.card.holderName, cardBrand: intent.card.brand, cardLast4: intent.card.last4,
    captureRequestedAt: body.capture === true || ['captured', 'failed', 'not_authorized'].includes(intent.status) ? intent.createdAt : undefined,
    billingSettlementStatus: intent.billingRecordId ? 'awaiting_capture' : 'not_applicable'
  });

    // Provider response survives an anchor failure; recovery is serialized with
    // capture and commits its response, terminal state and outbox together.
    const completed = await cardTransactions.withCreationTransaction(accountId, intent.id, async () => {
      const current = await cardTransactions.findCreation(accountId, attempt.id);
      if (current.response && current.response.status !== 'pending') return current.response;
      // A legacy pending creation can have completed through the capture route.
      // Its captured row and completion outbox already committed under this lock.
      const existing = await cardTransactions.findByTransactionId(intent.id);
      if (current.response && existing?.status === 'captured') {
        const reconciled = { ...current.response, status: 'captured', providerOrderId: existing.providerOrderId,
          providerChargeId: existing.providerChargeId };
        await cardTransactions.completeCreation(accountId, attempt.id, reconciled);
        return reconciled;
      }
    if (['captured', 'failed', 'not_authorized'].includes(intent.status)) await cardTransactions.updateStatus({
      transactionId: intent.id, status: intent.status, capturedAt: intent.status === 'captured' ? intent.createdAt : undefined,
      billingSettlementStatus: intent.billingRecordId ? (intent.status === 'captured' ? 'pending_billing' : 'failed') : 'not_applicable'
    });
    const event = current.response && intent.status === 'authorized_pending_capture'
      ? { id: current.response.eventId, correlationId: current.response.eventCorrelationId }
      : await eventBus.publish({
    correlationId: createCorrelationId('card') as CorrelationId,
    moduleName: 'billing' as ModuleName,
    eventType: current.response ? (intent.status === 'captured' ? 'payment.card.completed' : 'payment.card.failed') : 'payment.card.intent.created',
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
    const responseBody = {
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
    };
    await cardTransactions.completeCreation(accountId, attempt.id, responseBody);
    return responseBody;
    });
    appendAudit(audit, {
      actorId: 'system', accountId, module: 'billing', action: 'card_intent_create',
      entityType: 'payment_intent', entityId: intent.id,
      payloadSummary: `Card intent ${intent.id} created via API key ${apiKeyPrincipal.apiKey.id}`,
      riskLevel: 'high', correlationId
    });
    void apiKeys.recordUsage({ apiKeyId: apiKeyPrincipal.apiKey.id, endpoint: '/payments/cards/intents',
      method: 'POST', statusCode: 201, responseTimeMs: null });
    sendCompleted(completed);
  } catch {
    response.statusCode = 202;
    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify({ code: 'CARD_INTENT_RECONCILIATION_REQUIRED', status: 'pending',
      creationId: attempt.id, transactionId: attempt.providerResult?.id,
      message: 'Repeat this request with the same creation identity to reconcile the provider order. Do not start another payment. If the provider order remains unavailable, reconcile its merchant code with payment operations.',
      providerCreationCode: attempt.id }));
  }
  return true;
}

async function handleCardIntentCapture(
  request: IncomingMessage,
  pathname: string,
  outgoingResponse: ServerResponse,
  correlationId: string,
  {
    eventBus,
    paymentGateway,
    apiKeys,
    audit,
    cardTransactions,
    billing
  }: Pick<
    PaymentsHandlers,
    'eventBus' | 'paymentGateway' | 'apiKeys' | 'audit' | 'cardTransactions' | 'billing'
  >
): Promise<boolean> {
  const intentId = pathname.split('/')[4];
  const apiKeyPrincipal = await requireApiKey(request, 'payments.manage', apiKeys);
  // Delay the HTTP response until the status and outbox transaction commits.
  let statusCode = 200;
  let body = '';
  const response = {
    get statusCode() { return statusCode; },
    set statusCode(value: number) { statusCode = value; },
    setHeader(..._args: unknown[]) {},
    end(value: string) { body = value; }
  };
  const execution = await cardTransactions.withCaptureLock(
    apiKeyPrincipal.apiKey.accountId, intentId, async (claimProviderCapture, beginFinalization) => {
      const gatewayIntent = await paymentGateway.findCardIntent(
        apiKeyPrincipal.apiKey.accountId,
        intentId
      );
      const persistedTransaction = await cardTransactions.findByTransactionId(intentId);
      if (
        (!gatewayIntent && !persistedTransaction) ||
        (persistedTransaction && persistedTransaction.accountId !== apiKeyPrincipal.apiKey.accountId)
      ) {
        response.statusCode = 404;
        response.setHeader('content-type', 'application/json');
        response.end(JSON.stringify({ code: 'NOT_FOUND', message: 'Intent not found' }));
        return true;
      }

      if ((persistedTransaction?.status ?? gatewayIntent?.status) === 'captured') {
        response.statusCode = 409;
        response.setHeader('content-type', 'application/json');
        response.end(JSON.stringify({ code: 'PAYMENT_ALREADY_CAPTURED', message: 'Payment already captured' }));
        return true;
      }

      const billingRecordId = gatewayIntent?.billingRecordId ?? persistedTransaction?.billingRecordId;
      if (billingRecordId) {
        const record = billing.getOrThrow(apiKeyPrincipal.apiKey.accountId, billingRecordId as never);
        if (record.accountId !== apiKeyPrincipal.apiKey.accountId) {
          response.statusCode = 404;
          response.setHeader('content-type', 'application/json');
          response.end(JSON.stringify({ code: 'NOT_FOUND', message: 'Intent not found' }));
          return true;
        }
        if (record.status === 'settled') {
          response.statusCode = 409;
          response.setHeader('content-type', 'application/json');
          response.end(
            JSON.stringify({ code: 'PAYMENT_ALREADY_SETTLED', message: 'Payment already settled' })
          );
          return true;
        }
      }

      if (!paymentGateway.captureCardIntent) {
        response.statusCode = 501;
        response.setHeader('content-type', 'application/json');
        response.end(
          JSON.stringify({ code: 'NOT_IMPLEMENTED', message: 'Card capture not available' })
        );
        return true;
      }

      let captureResult;
      try {
        captureResult = await paymentGateway.captureCardIntent(intentId, { claimProviderCapture, beginFinalization });
      } catch (error) {
        if (!(error instanceof Error) || !['TimeoutError', 'AbortError', 'TypeError', 'SyntaxError'].includes(error.name)) throw error;
        response.statusCode = 202;
        response.end(JSON.stringify({ code: 'CARD_CAPTURE_RECONCILIATION_REQUIRED', status: 'pending',
          message: 'Capture outcome unknown. Retry this endpoint to reconcile the existing charge; do not create another payment.' }));
        return true;
      }
      if (captureResult.status === 'pending') {
        response.statusCode = 202;
        response.end(JSON.stringify({ code: 'CARD_CAPTURE_RECONCILIATION_REQUIRED', status: 'pending',
          message: 'Capture is not confirmed. Retry this endpoint to reconcile the existing charge; do not create another payment.' }));
        return true;
      }
      if (captureResult.status === 'captured') {
        await cardTransactions.updateStatus({ transactionId: intentId, status: 'captured',
          capturedAt: captureResult.capturedAt, updatedAt: captureResult.capturedAt,
          providerChargeId: captureResult.providerChargeId,
          billingSettlementStatus: captureResult.billingRecordId ? 'pending_billing' : undefined });
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

      await beginFinalization();
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
    });
  outgoingResponse.statusCode = execution.acquired ? statusCode : 409;
  outgoingResponse.setHeader('content-type', 'application/json');
  outgoingResponse.end(execution.acquired ? body : JSON.stringify({
    code: 'CARD_CAPTURE_IN_PROGRESS', status: 'pending',
    message: 'Capture is processing. Retry this endpoint to check the existing payment.'
  }));
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
    audit,
    pixTransactions
  }: Pick<PaymentsHandlers, 'eventBus' | 'paymentGateway' | 'apiKeys' | 'audit' | 'pixTransactions'>
): Promise<boolean> {
  const intentId = pathname.split('/')[4];
  const apiKeyPrincipal = await requireApiKey(request, 'payments.manage', apiKeys);

  const transactionOwnedByKeyAccount = pixTransactions.isTransactionOwnedByAccount
    ? await pixTransactions.isTransactionOwnedByAccount(intentId, apiKeyPrincipal.apiKey.accountId)
    : true;
  if (transactionOwnedByKeyAccount === false) {
    response.statusCode = 404;
    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify({ code: 'NOT_FOUND', message: 'Intent not found' }));
    return true;
  }

  const persistedIntent = await pixTransactions.findByTransactionId(intentId);
  if (persistedIntent?.paymentAttemptId) {
    if (persistedIntent.accountId !== apiKeyPrincipal.apiKey.accountId) {
      response.statusCode = 404;
      response.setHeader('content-type', 'application/json');
      response.end(JSON.stringify({ code: 'NOT_FOUND', message: 'Intent not found' }));
      return true;
    }
    response.statusCode = 410;
    response.setHeader('content-type', 'application/json');
    response.end(
      JSON.stringify({
        code: 'LEGACY_PIX_CONFIRMATION_DISABLED',
        message: 'PIX confirmation for encounter payment attempts is disabled'
      })
    );
    return true;
  }

  if (!paymentGateway.confirmPayment) {
    response.statusCode = 501;
    response.setHeader('content-type', 'application/json');
    response.end(
      JSON.stringify({ code: 'NOT_IMPLEMENTED', message: 'Payment confirmation not available' })
    );
    return true;
  }

  const confirmResult = await paymentGateway.confirmPayment(intentId);
  if (!confirmResult) {
    response.statusCode = 404;
    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify({ code: 'NOT_FOUND', message: 'Intent not found' }));
    return true;
  }
  if (confirmResult.accountId !== apiKeyPrincipal.apiKey.accountId) {
    response.statusCode = 404;
    response.setHeader('content-type', 'application/json');
    response.end(JSON.stringify({ code: 'NOT_FOUND', message: 'Intent not found' }));
    return true;
  }
  if (confirmResult.status !== 'completed' || !confirmResult.completedAt) {
    response.statusCode = 409;
    response.setHeader('content-type', 'application/json');
    response.end(
      JSON.stringify({ code: 'PAYMENT_NOT_COMPLETED', message: 'Payment is not completed' })
    );
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
