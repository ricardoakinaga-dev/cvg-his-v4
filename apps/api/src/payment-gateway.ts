import { createHash } from 'node:crypto';
import { createCorrelationId, nowIso } from '@cvg-his-v2/shared-utils';
import { PagarMePixAdapter, type CreatePixIntentInput } from '@cvg-his-v2/module-pix';
import type { AccountId } from '@cvg-his-v2/shared-types';
import type { PixTransactionRecord, PixTransactionRepository } from './pix-transaction-repository.js';
import type { CardTransactionRepository } from './card-transaction-repository.js';

/** Pagar.me Core v5: a paid charge confirms full card capture only when its
 * identity, supplied amounts, method and transaction details are consistent.
 * https://docs.pagar.me/reference/cobran%C3%A7as-1
 * https://docs.pagar.me/reference/cart%C3%A3o-de-cr%C3%A9dito-1
 */
type JsonRecord = Record<string, unknown>;

interface CardChargeAuthority {
  amount: number;
  accountId: string;
  chargeId?: string;
  orderId?: string;
  orderCode?: string;
  billingRecordId?: string;
  order?: JsonRecord;
}

function isRecord(value: unknown): value is JsonRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function toOptionalString(value: unknown): string | undefined {
  return value === undefined || value === null ? undefined : String(value);
}

/** Both creation and capture use this authoritative classifier. An outer order can establish
 * authority, but never overrides contradictory charge/transaction evidence. */
function classifyCardCharge(charge: unknown, expected: CardChargeAuthority): CardPaymentIntentSummary['status'] {
  const cents = Math.round(expected.amount * 100);
  if (!isRecord(charge)) return 'pending';
  const chargeId = charge.id;
  const transactionValue = charge.last_transaction;
  if (!isNonEmptyString(chargeId) || (expected.chargeId && chargeId !== expected.chargeId) ||
      charge.amount !== cents || charge.payment_method !== 'credit_card' || !isRecord(transactionValue)) return 'pending';
  const transaction = transactionValue;
  const chargeStatus = isNonEmptyString(charge.status) ? charge.status : undefined;
  const transactionStatus = isNonEmptyString(transaction.status) ? transaction.status : undefined;
  const captured = charge.status === 'paid' && transaction.status === 'captured' && transaction.success === true;
  const authorized = chargeStatus !== undefined && ['pending', 'authorized_pending_capture', 'waiting_capture'].includes(chargeStatus) &&
    transactionStatus !== undefined && ['authorized_pending_capture', 'waiting_capture'].includes(transactionStatus) && transaction.success === true;
  const declined = chargeStatus !== undefined && ['failed', 'not_authorized'].includes(chargeStatus) &&
    transactionStatus !== undefined && ['failed', 'not_authorized'].includes(transactionStatus) && transaction.success === false;
  if (!captured && !authorized && !declined) return 'pending';
  const result: CardPaymentIntentSummary['status'] = captured ? 'captured' : authorized ? 'authorized_pending_capture'
    : transactionStatus === 'not_authorized' ? 'not_authorized' : 'failed';
  const moneyMoved = captured ? cents : 0;
  const chargeStatuses = captured ? ['paid'] : authorized ? ['pending', 'authorized_pending_capture', 'waiting_capture'] : ['failed', 'not_authorized'];
  const orderStatuses = captured ? ['paid'] : authorized ? ['pending', 'authorized_pending_capture', 'waiting_capture'] : ['pending', 'failed', 'canceled', 'not_authorized'];
  const expectedOrderId = expected.order && isNonEmptyString(expected.order.id) ? expected.order.id : undefined;
  const expectedOrderCode = expected.order && isNonEmptyString(expected.order.code) ? expected.order.code : undefined;
  const orderId = expected.orderId ?? expectedOrderId;
  const orderCode = expected.orderCode ?? expectedOrderCode;
  let accountConfirmed = false;
  const metadata = (value: unknown) => {
    if (value === undefined) return true;
    if (!isRecord(value)) return false;
    if (value.account_id !== undefined) {
      if (value.account_id !== expected.accountId) return false;
      accountConfirmed = true;
    }
    return value.billing_record_id === undefined || value.billing_record_id === expected.billingRecordId;
  };
  const evidence = (value: JsonRecord) => {
    if (value.account_id !== undefined) {
      if (value.account_id !== expected.accountId) return false;
      accountConfirmed = true;
    }
    return metadata(value.metadata) &&
      (value.amount === undefined || value.amount === cents) &&
      ['paid_amount', 'captured_amount'].every(key => value[key] === undefined || value[key] === moneyMoved) &&
      (value.transaction_type === undefined || value.transaction_type === 'credit_card') &&
      (value.currency === undefined || value.currency === 'BRL') &&
      (value.payment_method === undefined || value.payment_method === 'credit_card') &&
      (value.order_id === undefined || (orderId !== undefined && value.order_id === orderId)) &&
      (value.charge_id === undefined || value.charge_id === chargeId);
  };
  const nestedEvidence = (value: unknown, kind: 'order' | 'charge', depth = 0): boolean => {
    if (depth > 4 || !isRecord(value) || !evidence(value)) return false;
    if (kind === 'order' && (!isNonEmptyString(value.id) || value.id !== orderId ||
        (value.code !== undefined && (orderCode === undefined || value.code !== orderCode)))) return false;
    if (kind === 'charge' && value.id !== chargeId) return false;
    if (value.status !== undefined &&
        (!isNonEmptyString(value.status) || !(kind === 'order' ? orderStatuses : chargeStatuses).includes(value.status))) return false;
    if (value.charges !== undefined && (!Array.isArray(value.charges) || value.charges.length !== 1 ||
        !nestedEvidence(value.charges[0], 'charge', depth + 1))) return false;
    const nestedTransaction = value.last_transaction;
    if (nestedTransaction !== undefined) {
      if (!isRecord(nestedTransaction) ||
          nestedTransaction.status !== transaction.status || nestedTransaction.success !== transaction.success ||
          !evidence(nestedTransaction) ||
          (nestedTransaction.order !== undefined && !nestedEvidence(nestedTransaction.order, 'order', depth + 1)) ||
          (nestedTransaction.charge !== undefined && !nestedEvidence(nestedTransaction.charge, 'charge', depth + 1))) return false;
    }
    return (value.order === undefined || nestedEvidence(value.order, 'order', depth + 1)) &&
      (value.charge === undefined || nestedEvidence(value.charge, 'charge', depth + 1));
  };
  const orderEvidence = (order: unknown) => nestedEvidence(order, 'order');
  if (!evidence(charge) || !evidence(transaction) ||
      (transaction.transaction_type !== undefined && transaction.transaction_type !== 'credit_card')) return 'pending';
  for (const value of [charge, transaction]) {
    if (value.order !== undefined && !orderEvidence(value.order)) return 'pending';
    if (value.charge !== undefined && !nestedEvidence(value.charge, 'charge')) return 'pending';
  }
  if (expected.order) {
    const orderMetadata = isRecord(expected.order.metadata) ? expected.order.metadata : undefined;
    if (!orderEvidence(expected.order) || expected.order.amount !== cents || orderMetadata?.account_id !== expected.accountId ||
        (expected.orderCode !== undefined && expected.order.code !== expected.orderCode) ||
        (expected.billingRecordId !== undefined && orderMetadata?.billing_record_id !== expected.billingRecordId)) return 'pending';
  } else if (expected.orderId && charge.order_id !== expected.orderId &&
      (!isRecord(charge.order) || charge.order.id !== expected.orderId)) return 'pending';
  return accountConfirmed ? result : 'pending';
}

export interface PixPaymentIntentInput {
  readonly accountId: string;
  readonly billingRecordId?: string;
  readonly amount: number;
  readonly description: string;
  readonly expirationMinutes?: number;
  /** Client Idempotency-Key; the provider key is derived from it per account. */
  readonly idempotencyKey?: string;
}

export interface PixPaymentIntentSummary {
  readonly id: string;
  readonly provider: string;
  readonly accountId: string;
  readonly billingRecordId?: string;
  readonly amount: number;
  readonly currency: 'BRL';
  readonly description: string;
  readonly qrCodePayload: string;
  readonly qrCodeBase64: string;
  readonly providerTransactionId?: string;
  readonly expiresAt: string;
  readonly status: 'pending' | 'completed';
  readonly createdAt: string;
}

export interface PixPaymentConfirmResult {
  readonly transactionId: string;
  readonly accountId: string;
  readonly status: 'pending' | 'completed' | 'expired' | 'cancelled';
  readonly providerTransactionId?: string;
  readonly billingRecordId?: string;
  readonly completedAt?: string;
}

export interface CardPaymentIntentInput {
  readonly accountId: string;
  readonly billingRecordId?: string;
  readonly amount: number;
  readonly description: string;
  readonly cardHolderName: string;
  readonly brand?: string;
  readonly last4: string;
  readonly installments?: number;
  readonly capture?: boolean;
  readonly cardToken?: string;
  readonly cardId?: string;
  readonly customer?: {
    readonly name: string;
    readonly email: string;
    readonly type?: 'individual' | 'company';
    readonly document?: string;
  };
  readonly billingAddress?: {
    readonly line1: string;
    readonly line2?: string;
    readonly zipCode: string;
    readonly city: string;
    readonly state: string;
    readonly country: string;
  };
}

export interface CardPaymentIntentSummary {
  readonly id: string;
  readonly provider: string;
  readonly accountId: string;
  readonly billingRecordId?: string;
  readonly amount: number;
  readonly currency: 'BRL';
  readonly description: string;
  readonly installments: number;
  readonly status:
    | 'pending'
    | 'authorized_pending_capture'
    | 'captured'
    | 'not_authorized'
    | 'failed';
  readonly card: {
    readonly holderName: string;
    readonly brand?: string;
    readonly last4: string;
  };
  readonly createdAt: string;
  readonly providerOrderId?: string;
  readonly providerChargeId?: string;
  readonly providerAuthorizationCode?: string;
  readonly providerReferenceId?: string;
}

export interface CardPaymentCaptureResult {
  readonly transactionId: string;
  readonly provider: string;
  readonly status: 'captured' | 'failed' | 'pending';
  readonly providerOrderId?: string;
  readonly providerChargeId?: string;
  readonly providerAuthorizationCode?: string;
  readonly providerReferenceId?: string;
  readonly billingRecordId?: string;
  readonly capturedAt: string;
  readonly failureReason?: string;
}

export interface PaymentGateway {
  readonly paymentProviders: {
    readonly pix: string;
    readonly cards: string;
  };
  createPixIntent(input: PixPaymentIntentInput): Promise<PixPaymentIntentSummary>;
  createCardIntent?(input: CardPaymentIntentInput, options?: { readonly deferPersistence: boolean; readonly creationId?: string; readonly reconcileOnly?: boolean }): Promise<CardPaymentIntentSummary>;
  findCardIntent(
    accountId: string,
    transactionId: string
  ): Promise<CardPaymentIntentSummary | null>;
  captureCardIntent?(transactionId: string, options?: { readonly allowProviderCapture?: boolean; readonly claimProviderCapture?: () => Promise<boolean>; readonly beginFinalization?: () => Promise<void> }): Promise<CardPaymentCaptureResult>;
  confirmPayment?(transactionId: string): Promise<PixPaymentConfirmResult | null>;
}

/** Namespaced per account so two tenants reusing a client key never share a charge. */
function derivePixProviderIdempotencyKey(accountId: string, clientKey: string): string {
  return `cvg:pix:intent:v1:${createHash('sha256').update(`${accountId}\n${clientKey}`).digest('hex')}`;
}

function toPixIntentSummary(record: PixTransactionRecord): PixPaymentIntentSummary {
  return {
    id: record.transactionId,
    provider: record.provider,
    accountId: record.accountId,
    billingRecordId: record.billingRecordId,
    amount: record.amount,
    currency: 'BRL',
    description: record.description,
    qrCodePayload: record.qrCodePayload,
    qrCodeBase64: record.qrCodeBase64,
    providerTransactionId: record.providerTransactionId,
    expiresAt: record.expiresAt,
    status: record.status === 'completed' ? 'completed' : 'pending',
    createdAt: record.createdAt
  };
}

export class LocalPixPaymentGateway implements PaymentGateway {
  readonly #intents = new Map<string, PixPaymentIntentSummary>();
  readonly #cardIntents = new Map<string, CardPaymentIntentSummary>();
  readonly paymentProviders = {
    pix: 'local-pix',
    cards: 'local-card'
  } as const;

  async createPixIntent(input: PixPaymentIntentInput): Promise<PixPaymentIntentSummary> {
    const id = createCorrelationId('pix');
    const createdAt = nowIso();
    const expiresAt = new Date(
      Date.now() + (input.expirationMinutes ?? 30) * 60_000
    ).toISOString();
    const qrCodePayload = [
      'pix',
      input.accountId,
      input.billingRecordId ?? 'direct',
      input.amount.toFixed(2),
      input.description,
      id
    ].join('|');

    const intent: PixPaymentIntentSummary = {
      id,
      provider: 'local-pix',
      accountId: input.accountId,
      billingRecordId: input.billingRecordId,
      amount: input.amount,
      currency: 'BRL',
      description: input.description,
      qrCodePayload,
      qrCodeBase64: Buffer.from(qrCodePayload, 'utf8').toString('base64'),
      expiresAt,
      status: 'pending',
      createdAt
    };
    this.#intents.set(id, intent);
    return intent;
  }

  async createCardIntent(input: CardPaymentIntentInput, options?: { readonly deferPersistence: boolean; readonly creationId?: string; readonly reconcileOnly?: boolean }): Promise<CardPaymentIntentSummary> {
    if (options?.reconcileOnly) throw new Error('Local creation outcome unavailable');
    const id = options?.creationId ?? createCorrelationId('card');
    const createdAt = nowIso();
    const last4 = input.last4.replace(/\D/g, '').slice(-4);
    const intent: CardPaymentIntentSummary = {
      id,
      provider: 'local-card',
      accountId: input.accountId,
      billingRecordId: input.billingRecordId,
      amount: input.amount,
      currency: 'BRL',
      description: input.description,
      installments: Math.max(1, input.installments ?? 1),
      status: input.capture ? 'captured' : 'authorized_pending_capture',
      card: {
        holderName: input.cardHolderName.trim(),
        brand: input.brand?.trim() || undefined,
        last4
      },
      createdAt,
      providerOrderId: `local_order_${id}`,
      providerChargeId: `local_charge_${id}`,
      providerAuthorizationCode: input.capture ? `auth_${id}` : undefined,
      providerReferenceId: `local_ref_${id}`
    };
    this.#cardIntents.set(id, intent);
    return intent;
  }

  async findCardIntent(
    accountId: string,
    transactionId: string
  ): Promise<CardPaymentIntentSummary | null> {
    const intent = this.#cardIntents.get(transactionId);
    if (!intent || intent.accountId !== accountId) {
      return null;
    }

    return { ...intent, card: { ...intent.card } };
  }

  async captureCardIntent(transactionId: string, options?: { readonly claimProviderCapture?: () => Promise<boolean>; readonly beginFinalization?: () => Promise<void> }): Promise<CardPaymentCaptureResult> {
    const existing = this.#cardIntents.get(transactionId);
    if (!existing) {
      return {
        transactionId,
        provider: 'local-card',
        status: 'failed',
        capturedAt: nowIso(),
        failureReason: 'Intent not found'
      };
    }

    await options?.claimProviderCapture?.();
    await options?.beginFinalization?.();

    const updated: CardPaymentIntentSummary = {
      ...existing,
      status: 'captured',
      providerAuthorizationCode: existing.providerAuthorizationCode ?? `auth_${transactionId}`
    };
    this.#cardIntents.set(transactionId, updated);

    return {
      transactionId,
      provider: 'local-card',
      status: 'captured',
      providerOrderId: updated.providerOrderId,
      providerChargeId: updated.providerChargeId,
      providerAuthorizationCode: updated.providerAuthorizationCode,
      providerReferenceId: updated.providerReferenceId,
      billingRecordId: updated.billingRecordId,
      capturedAt: nowIso()
    };
  }

  async confirmPayment(transactionId: string): Promise<PixPaymentConfirmResult | null> {
    const intent = this.#intents.get(transactionId);
    if (!intent) return null;
    return {
      transactionId,
      accountId: intent.accountId,
      status: 'completed',
      providerTransactionId: intent.billingRecordId
        ? `local_confirm_${transactionId}_for_${intent.billingRecordId}`
        : `local_confirm_${transactionId}`,
      completedAt: nowIso(),
      billingRecordId: intent.billingRecordId
    };
  }
}

/**
 * Adapter that bridges the PagarMePixAdapter (PixProvider) to the PaymentGateway interface.
 *
 * PagarMePixAdapter implements PixProvider and returns PixIntentResult (with a nested
 * transaction object). This adapter flattens it into PixPaymentIntentSummary so it
 * can be used wherever PaymentGateway is expected.
 */
export class PagarMePaymentGatewayAdapter implements PaymentGateway {
  readonly #adapter: PagarMePixAdapter;
  readonly #apiKey: string;
  readonly #baseUrl: string;
  readonly #pixTransactions?: PixTransactionRepository;
  readonly #cardTransactions?: CardTransactionRepository;
  readonly #pixIntents = new Map<string, PixPaymentIntentSummary>();
  readonly #cardIntents = new Map<string, CardPaymentIntentSummary>();
  readonly paymentProviders = {
    pix: 'pagarme',
    cards: 'pagarme-card'
  } as const;

  constructor(options: {
    readonly apiKey: string;
    readonly pixKey: string;
    readonly baseUrl?: string;
    readonly pixTransactions?: PixTransactionRepository;
    readonly cardTransactions?: CardTransactionRepository;
  }) {
    this.#apiKey = options.apiKey;
    this.#baseUrl = options.baseUrl ?? 'https://api.pagar.me';
    this.#pixTransactions = options.pixTransactions;
    this.#cardTransactions = options.cardTransactions;
    this.#adapter = new PagarMePixAdapter({ ...options, baseUrl: this.#baseUrl });
  }

  async createPixIntent(input: PixPaymentIntentInput): Promise<PixPaymentIntentSummary> {
    const adapterInput: CreatePixIntentInput = {
      billingRecordId: input.billingRecordId ?? `no-billing-${input.accountId}`,
      accountId: input.accountId as AccountId,
      amount: input.amount,
      description: input.description,
      expirationMinutes: input.expirationMinutes,
      ...(input.idempotencyKey
        ? { idempotencyKey: derivePixProviderIdempotencyKey(input.accountId, input.idempotencyKey) }
        : {})
    };

    const result = await this.#adapter.createIntent(adapterInput);
    const { transaction, qrCodeBase64, qrCodePayload } = result;

    // A retry whose earlier local commit succeeded resolves to the charge the
    // provider already returned: answer with the persisted intent, never a copy.
    if (transaction.providerTransactionId && this.#pixTransactions) {
      const existing = await this.#pixTransactions.findByProviderTransactionId(
        'pagarme',
        transaction.providerTransactionId
      );
      if (existing) {
        if (existing.accountId !== input.accountId) {
          throw new Error('PIX provider returned a charge owned by another account');
        }
        return toPixIntentSummary(existing);
      }
    }

    const intent: PixPaymentIntentSummary = {
      id: transaction.id as string,
      provider: 'pagarme' as const,
      accountId: input.accountId,
      billingRecordId: input.billingRecordId,
      amount: input.amount,
      currency: 'BRL' as const,
      description: input.description,
      qrCodePayload,
      qrCodeBase64,
      providerTransactionId: transaction.providerTransactionId,
      expiresAt: transaction.expiresAt,
      status: transaction.status === 'completed' ? 'completed' : 'pending',
      createdAt: transaction.createdAt
    };
    this.#pixIntents.set(intent.id, intent);
    await this.#pixTransactions?.create({
      transactionId: intent.id,
      provider: 'pagarme',
      accountId: intent.accountId,
      billingRecordId: intent.billingRecordId,
      amount: intent.amount,
      currency: intent.currency,
      description: intent.description,
      qrCodePayload: intent.qrCodePayload,
      qrCodeBase64: intent.qrCodeBase64,
      expiresAt: intent.expiresAt,
      status: intent.status === 'completed' ? 'completed' : 'pending',
      createdAt: intent.createdAt,
      updatedAt: intent.createdAt,
      providerTransactionId: intent.providerTransactionId,
      billingSettlementStatus: intent.billingRecordId
        ? intent.status === 'completed'
          ? 'pending_billing'
          : 'awaiting_payment'
        : 'not_applicable',
      cashReconciliationStatus: 'pending'
    });
    return intent;
  }

  async confirmPayment(transactionId: string): Promise<PixPaymentConfirmResult | null> {
    const intent = await this.#findPixIntent(transactionId);
    if (!intent) return null;
    const result = await this.#adapter.confirmPayment(
      transactionId as never,
      (intent.providerTransactionId ?? transactionId) as never
    );
    const completedAt = result.completedAt;
    await this.#pixTransactions?.updateStatus({
      transactionId,
      status: result.status,
      updatedAt: completedAt ?? nowIso(),
      providerTransactionId: result.providerTransactionId ?? intent.providerTransactionId,
      providerConfirmationId: result.providerTransactionId,
      completedAt,
      lastProviderSyncAt: completedAt ?? nowIso(),
      ...(result.status === 'completed' && intent.billingRecordId
        ? { billingSettlementStatus: 'pending_billing' as const }
        : {})
    });
    return {
      transactionId,
      accountId: intent.accountId,
      billingRecordId: intent.billingRecordId,
      status: result.status,
      providerTransactionId: result.providerTransactionId,
      completedAt: result.completedAt
    };
  }

  async #findPixIntent(transactionId: string): Promise<PixPaymentIntentSummary | null> {
    const inMemory = this.#pixIntents.get(transactionId);
    if (inMemory) return { ...inMemory };

    const persisted = await this.#pixTransactions?.findByTransactionId(transactionId);
    if (!persisted) return null;

    const intent: PixPaymentIntentSummary = {
      id: persisted.transactionId,
      provider: persisted.provider,
      accountId: persisted.accountId,
      billingRecordId: persisted.billingRecordId,
      amount: persisted.amount,
      currency: persisted.currency,
      description: persisted.description,
      qrCodePayload: persisted.qrCodePayload,
      qrCodeBase64: persisted.qrCodeBase64,
      providerTransactionId: persisted.providerTransactionId,
      expiresAt: persisted.expiresAt,
      status: persisted.status === 'completed' ? 'completed' : 'pending',
      createdAt: persisted.createdAt
    };
    this.#pixIntents.set(transactionId, intent);
    return { ...intent };
  }

  async createCardIntent(input: CardPaymentIntentInput, options?: { readonly deferPersistence: boolean; readonly creationId?: string; readonly reconcileOnly?: boolean }): Promise<CardPaymentIntentSummary> {
    // Orders can be read by merchant code. Never re-POST an ambiguous creation:
    // provider idempotency expires (24h production, 5min sandbox).
    // https://docs.pagar.me/docs/o-que-%C3%A9
    // https://docs.pagar.me/reference/listar-pedidos
    if (options?.reconcileOnly) {
      if (!options.creationId) throw new Error('Creation identity required');
      const response = await fetch(`${this.#baseUrl}/core/v5/orders?code=${encodeURIComponent(options.creationId)}&size=30`, {
        headers: { authorization: `Basic ${Buffer.from(`${this.#apiKey}:`).toString('base64')}` }
      });
      if (!response.ok) throw new Error('Card creation reconciliation unavailable');
      const listing = await response.json() as JsonRecord;
      const paging = isRecord(listing.paging) ? listing.paging : undefined;
      const orders = Array.isArray(listing.data) ? listing.data : undefined;
      const order = orders?.length === 1 && isRecord(orders[0]) ? orders[0] : undefined;
      const orderMetadata = order && isRecord(order.metadata) ? order.metadata : undefined;
      const orderCharges = order && Array.isArray(order.charges) ? order.charges : undefined;
      const firstCharge = orderCharges?.length === 1 && isRecord(orderCharges[0]) ? orderCharges[0] : undefined;
      if (!order || paging?.next || order.code !== options.creationId || orderMetadata?.account_id !== input.accountId ||
          (input.billingRecordId !== undefined && orderMetadata?.billing_record_id !== input.billingRecordId) ||
          order.amount !== Math.round(input.amount * 100) || !firstCharge ||
          firstCharge.amount !== Math.round(input.amount * 100) || firstCharge.payment_method !== 'credit_card') {
        throw new Error('Card creation reconciliation identity mismatch');
      }
      return this.#readCardCreation(order, input, options);
    }
    if (!input.cardToken && !input.cardId) {
      throw new Error('PagarMe card payments require cardToken or cardId');
    }
    if (!input.customer?.name || !input.customer.email) {
      throw new Error('PagarMe card payments require customer name and email');
    }

    const response = await fetch(`${this.#baseUrl}/core/v5/orders`, {
      method: 'POST',
      headers: {
        authorization: `Basic ${Buffer.from(`${this.#apiKey}:`).toString('base64')}`,
        'content-type': 'application/json',
        ...(options?.creationId ? { 'Idempotency-key': options.creationId } : {})
      },
      body: JSON.stringify({
        code: options?.creationId ?? input.billingRecordId ?? createCorrelationId('order'),
        closed: true,
        items: [
          {
            amount: Math.round(input.amount * 100),
            description: input.description,
            quantity: 1,
            code: input.billingRecordId ?? createCorrelationId('item')
          }
        ],
        customer: {
          name: input.customer.name,
          email: input.customer.email,
          type: input.customer.type ?? 'individual',
          document: input.customer.document
        },
        payments: [
          {
            payment_method: 'credit_card',
            amount: Math.round(input.amount * 100),
            credit_card: {
              installments: Math.max(1, input.installments ?? 1),
              statement_descriptor: input.description.slice(0, 22),
              // Core v5 defaults to auth_and_capture; send auth_only explicitly.
              operation_type: input.capture === true ? 'auth_and_capture' : 'auth_only',
              card_id: input.cardId,
              card_token: input.cardToken,
              billing_address: input.billingAddress
                ? {
                    line_1: input.billingAddress.line1,
                    line_2: input.billingAddress.line2,
                    zip_code: input.billingAddress.zipCode,
                    city: input.billingAddress.city,
                    state: input.billingAddress.state,
                    country: input.billingAddress.country
                  }
                : undefined
            }
          }
        ],
        metadata: {
          account_id: input.accountId,
          billing_record_id: input.billingRecordId,
          integration: 'cvg-his-v2'
        }
      })
    });

    if (!response.ok) {
      throw new Error(`PagarMe order creation failed with status ${response.status}`);
    }

    const payload = (await response.json()) as JsonRecord;
    return this.#readCardCreation(payload, input, options);
  }

  async #readCardCreation(payload: JsonRecord, input: CardPaymentIntentInput, options?: { readonly deferPersistence: boolean; readonly creationId?: string }): Promise<CardPaymentIntentSummary> {
    const payloadMetadata = isRecord(payload.metadata) ? payload.metadata : undefined;
    if ((options?.creationId && payload.code !== undefined && payload.code !== options.creationId) ||
        (payloadMetadata?.account_id !== undefined && payloadMetadata.account_id !== input.accountId) ||
        (payloadMetadata?.billing_record_id !== undefined && payloadMetadata.billing_record_id !== input.billingRecordId)) {
      throw new Error('Card creation provider identity mismatch');
    }
    const charges = Array.isArray(payload.charges) ? payload.charges : undefined;
    const charge = charges?.length === 1 && isRecord(charges[0]) ? charges[0] : undefined;
    const lastTransaction = charge && isRecord(charge.last_transaction) ? charge.last_transaction : {};
    const normalizedStatus = classifyCardCharge(charge, {
      amount: input.amount, accountId: input.accountId, billingRecordId: input.billingRecordId,
      orderId: toOptionalString(payload.id), orderCode: options?.creationId, order: payload
    });

    const intent: CardPaymentIntentSummary = {
      id: options?.creationId ?? String(charge?.code ?? payload.code ?? createCorrelationId('card')),
      provider: 'pagarme-card',
      accountId: input.accountId,
      billingRecordId: input.billingRecordId,
      amount: input.amount,
      currency: 'BRL',
      description: input.description,
      installments: Math.max(1, input.installments ?? 1),
      status: normalizedStatus,
      card: {
        holderName: input.cardHolderName.trim(),
        brand: input.brand?.trim() || toOptionalString(lastTransaction.brand),
        last4: input.last4.replace(/\D/g, '').slice(-4)
      },
      createdAt: String(payload.created_at ?? nowIso()),
      providerOrderId: toOptionalString(payload.id),
      providerChargeId: toOptionalString(charge?.id),
      providerAuthorizationCode: toOptionalString(lastTransaction.authorization_code),
      providerReferenceId: toOptionalString(lastTransaction.acquirer_nsu)
    };
    this.#cardIntents.set(intent.id, intent);
    if (!options?.deferPersistence) await this.#cardTransactions?.create({
      transactionId: intent.id,
      provider: 'pagarme-card',
      accountId: intent.accountId,
      billingRecordId: intent.billingRecordId,
      amount: intent.amount,
      currency: intent.currency,
      description: intent.description,
      installments: intent.installments,
      status: intent.status,
      createdAt: intent.createdAt,
      updatedAt: intent.createdAt,
      capturedAt: intent.status === 'captured' ? intent.createdAt : undefined,
      lastProviderSyncAt: intent.createdAt,
      providerOrderId: intent.providerOrderId,
      providerChargeId: intent.providerChargeId,
      providerAuthorizationCode: intent.providerAuthorizationCode,
      providerReferenceId: intent.providerReferenceId,
      cardHolderName: intent.card.holderName,
      cardBrand: intent.card.brand,
      cardLast4: intent.card.last4,
      billingSettlementStatus: intent.billingRecordId
        ? intent.status === 'captured'
          ? 'pending_billing'
          : intent.status === 'authorized_pending_capture'
            ? 'awaiting_capture'
            : 'failed'
        : 'not_applicable'
    });
    return intent;
  }

  async findCardIntent(
    accountId: string,
    transactionId: string
  ): Promise<CardPaymentIntentSummary | null> {
    const intent = await this.#findCardIntent(transactionId);
    if (!intent || intent.accountId !== accountId) {
      return null;
    }

    return { ...intent, card: { ...intent.card } };
  }

  async captureCardIntent(transactionId: string, options?: { readonly allowProviderCapture?: boolean; readonly claimProviderCapture?: () => Promise<boolean>; readonly beginFinalization?: () => Promise<void> }): Promise<CardPaymentCaptureResult> {
    const existing = await this.#findCardIntent(transactionId);
    if (!existing?.providerChargeId || (existing.status === 'captured' && options?.allowProviderCapture !== false)) {
      return {
        transactionId,
        provider: 'pagarme-card',
        status: 'failed',
        capturedAt: nowIso(),
        failureReason: existing?.status === 'captured' ? 'Intent already captured' : 'Intent not found'
      };
    }
    const providerChargeId = existing.providerChargeId;
    // Prepare the URL and credentials before committing dispatch knowledge.
    const chargeUrl = new URL(`${this.#baseUrl}/core/v5/charges/${encodeURIComponent(providerChargeId)}`).toString();
    const requestOptions = {
      headers: { authorization: `Basic ${Buffer.from(`${this.#apiKey}:`).toString('base64')}`, 'content-type': 'application/json' }
    };
    const allowProviderCapture = options?.claimProviderCapture
      ? await options.claimProviderCapture()
      : options?.allowProviderCapture !== false;
    const response = await fetch(`${chargeUrl}${allowProviderCapture ? '/capture' : ''}`, {
      ...requestOptions, signal: AbortSignal.timeout(15_000), method: allowProviderCapture ? 'POST' : 'GET'
    });

    if (!response.ok) {
      return {
        transactionId,
        provider: 'pagarme-card',
        status: 'pending',
        capturedAt: nowIso(),
        failureReason: 'Capture outcome unknown; reconcile the existing provider charge before further action'
      };
    }

    const payload = (await response.json()) as JsonRecord;
    if (classifyCardCharge(payload, { amount: existing.amount, accountId: existing.accountId,
      chargeId: providerChargeId, orderId: existing.providerOrderId, orderCode: existing.id, billingRecordId: existing.billingRecordId }) !== 'captured') {
      return {
        transactionId,
        provider: 'pagarme-card',
        status: 'pending',
        providerChargeId,
        billingRecordId: existing.billingRecordId,
        capturedAt: nowIso(),
        failureReason: 'PagarMe capture not confirmed by a consistent paid charge'
      };
    }
    const lastTransaction = isRecord(payload.last_transaction) ? payload.last_transaction : {};
    const result: CardPaymentCaptureResult = {
      transactionId,
      provider: 'pagarme-card',
      status: 'captured',
      providerChargeId: toOptionalString(payload.id) ?? transactionId,
      providerAuthorizationCode: toOptionalString(lastTransaction.authorization_code),
      providerReferenceId: toOptionalString(lastTransaction.acquirer_nsu),
      billingRecordId: existing?.billingRecordId,
      capturedAt: String(payload.updated_at ?? nowIso())
    };
    await options?.beginFinalization?.();
    const captured: CardPaymentIntentSummary | null = existing
      ? {
          ...existing,
          status: 'captured',
          providerChargeId: result.providerChargeId,
          providerAuthorizationCode: result.providerAuthorizationCode ?? existing.providerAuthorizationCode,
          providerReferenceId: result.providerReferenceId ?? existing.providerReferenceId
        }
      : null;
    if (captured) {
      this.#cardIntents.set(transactionId, captured);
    }
    await this.#cardTransactions?.updateStatus({
      transactionId,
      status: 'captured',
      updatedAt: result.capturedAt,
      capturedAt: result.capturedAt,
      lastProviderSyncAt: result.capturedAt,
      providerChargeId: result.providerChargeId,
      providerAuthorizationCode: result.providerAuthorizationCode,
      providerReferenceId: result.providerReferenceId,
      billingSettlementStatus: existing?.billingRecordId ? 'pending_billing' : undefined
    });
    return result;
  }

  async #findCardIntent(transactionId: string): Promise<CardPaymentIntentSummary | null> {
    const inMemory = this.#cardIntents.get(transactionId);
    if (!this.#cardTransactions && inMemory) return { ...inMemory, card: { ...inMemory.card } };

    const persisted = await this.#cardTransactions?.findByTransactionId(transactionId);
    if (!persisted) return null;

    const status: CardPaymentIntentSummary['status'] =
      persisted.status === 'voided' ? 'failed' : persisted.status;
    const intent: CardPaymentIntentSummary = {
      id: persisted.transactionId,
      provider: persisted.provider,
      accountId: persisted.accountId,
      billingRecordId: persisted.billingRecordId,
      amount: persisted.amount,
      currency: persisted.currency,
      description: persisted.description,
      installments: persisted.installments,
      status,
      card: {
        holderName: persisted.cardHolderName ?? '',
        brand: persisted.cardBrand,
        last4: persisted.cardLast4 ?? ''
      },
      createdAt: persisted.createdAt,
      providerOrderId: persisted.providerOrderId,
      providerChargeId: persisted.providerChargeId,
      providerAuthorizationCode: persisted.providerAuthorizationCode,
      providerReferenceId: persisted.providerReferenceId
    };
    this.#cardIntents.set(transactionId, intent);
    return { ...intent, card: { ...intent.card } };
  }
}
