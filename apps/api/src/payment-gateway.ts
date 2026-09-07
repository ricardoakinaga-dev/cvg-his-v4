import { createCorrelationId, nowIso } from '@cvg-his-v2/shared-utils';
import { PagarMePixAdapter, type CreatePixIntentInput } from '@cvg-his-v2/module-pix';
import type { AccountId } from '@cvg-his-v2/shared-types';
import type { PixTransactionRepository } from './pix-transaction-repository.js';
import type { CardTransactionRepository } from './card-transaction-repository.js';

/** Pagar.me Core v5: a paid charge confirms full card capture only when its
 * identity, supplied amounts, method and transaction details are consistent.
 * https://docs.pagar.me/reference/cobran%C3%A7as-1
 * https://docs.pagar.me/reference/cart%C3%A3o-de-cr%C3%A9dito-1
 */
interface CardChargeAuthority {
  amount: number;
  accountId: string;
  chargeId?: string;
  orderId?: string;
  orderCode?: string;
  billingRecordId?: string;
  order?: Record<string, any>;
}

/** Both creation and capture use this authoritative classifier. An outer order can establish
 * authority, but never overrides contradictory charge/transaction evidence. */
function classifyCardCharge(charge: any, expected: CardChargeAuthority): CardPaymentIntentSummary['status'] {
  const object = (value: any): value is Record<string, any> => value !== null && typeof value === 'object' && !Array.isArray(value);
  const nonempty = (value: any) => typeof value === 'string' && value.trim().length > 0;
  const cents = Math.round(expected.amount * 100);
  if (!object(charge) || !nonempty(charge.id) || (expected.chargeId && charge.id !== expected.chargeId) ||
      charge.amount !== cents || charge.payment_method !== 'credit_card' || !object(charge.last_transaction)) return 'pending';
  const transaction = charge.last_transaction;
  const captured = charge.status === 'paid' && transaction.status === 'captured' && transaction.success === true;
  const authorized = ['pending', 'authorized_pending_capture', 'waiting_capture'].includes(charge.status) &&
    ['authorized_pending_capture', 'waiting_capture'].includes(transaction.status) && transaction.success === true;
  const declined = ['failed', 'not_authorized'].includes(charge.status) &&
    ['failed', 'not_authorized'].includes(transaction.status) && transaction.success === false;
  if (!captured && !authorized && !declined) return 'pending';
  const result: CardPaymentIntentSummary['status'] = captured ? 'captured' : authorized ? 'authorized_pending_capture'
    : transaction.status === 'not_authorized' ? 'not_authorized' : 'failed';
  const moneyMoved = captured ? cents : 0;
  const chargeStatuses = captured ? ['paid'] : authorized ? ['pending', 'authorized_pending_capture', 'waiting_capture'] : ['failed', 'not_authorized'];
  const orderStatuses = captured ? ['paid'] : authorized ? ['pending', 'authorized_pending_capture', 'waiting_capture'] : ['pending', 'failed', 'canceled', 'not_authorized'];
  const orderId = expected.orderId ?? expected.order?.id;
  const orderCode = expected.orderCode ?? expected.order?.code;
  let accountConfirmed = false;
  const metadata = (value: any) => {
    if (value === undefined) return true;
    if (!object(value)) return false;
    if (value.account_id !== undefined) {
      if (value.account_id !== expected.accountId) return false;
      accountConfirmed = true;
    }
    return value.billing_record_id === undefined || value.billing_record_id === expected.billingRecordId;
  };
  const evidence = (value: Record<string, any>) => {
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
      (value.charge_id === undefined || value.charge_id === charge.id);
  };
  const nestedEvidence = (value: any, kind: 'order' | 'charge', depth = 0): boolean => {
    if (depth > 4 || !object(value) || !evidence(value)) return false;
    if (kind === 'order' && (!nonempty(value.id) || value.id !== orderId ||
        (value.code !== undefined && (orderCode === undefined || value.code !== orderCode)))) return false;
    if (kind === 'charge' && value.id !== charge.id) return false;
    if (value.status !== undefined && !(kind === 'order' ? orderStatuses : chargeStatuses).includes(value.status)) return false;
    if (value.charges !== undefined && (!Array.isArray(value.charges) || value.charges.length !== 1 ||
        !nestedEvidence(value.charges[0], 'charge', depth + 1))) return false;
    if (value.last_transaction !== undefined && (!object(value.last_transaction) ||
        value.last_transaction.status !== transaction.status || value.last_transaction.success !== transaction.success ||
        !evidence(value.last_transaction) ||
        (value.last_transaction.order !== undefined && !nestedEvidence(value.last_transaction.order, 'order', depth + 1)) ||
        (value.last_transaction.charge !== undefined && !nestedEvidence(value.last_transaction.charge, 'charge', depth + 1)))) return false;
    return (value.order === undefined || nestedEvidence(value.order, 'order', depth + 1)) &&
      (value.charge === undefined || nestedEvidence(value.charge, 'charge', depth + 1));
  };
  const orderEvidence = (order: any) => nestedEvidence(order, 'order');
  if (!evidence(charge) || !evidence(charge.last_transaction) ||
      (charge.last_transaction.transaction_type !== undefined && charge.last_transaction.transaction_type !== 'credit_card')) return 'pending';
  for (const value of [charge, charge.last_transaction]) {
    if (value.order !== undefined && !orderEvidence(value.order)) return 'pending';
    if (value.charge !== undefined && !nestedEvidence(value.charge, 'charge')) return 'pending';
  }
  if (expected.order) {
    if (!orderEvidence(expected.order) || expected.order.amount !== cents || expected.order.metadata?.account_id !== expected.accountId ||
        (expected.orderCode !== undefined && expected.order.code !== expected.orderCode) ||
        (expected.billingRecordId !== undefined && expected.order.metadata?.billing_record_id !== expected.billingRecordId)) return 'pending';
  } else if (expected.orderId && charge.order_id !== expected.orderId && charge.order?.id !== expected.orderId) return 'pending';
  return accountConfirmed ? result : 'pending';
}

export interface PixPaymentIntentInput {
  readonly accountId: string;
  readonly billingRecordId?: string;
  readonly amount: number;
  readonly description: string;
  readonly expirationMinutes?: number;
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
      expirationMinutes: input.expirationMinutes
    };

    const result = await this.#adapter.createIntent(adapterInput);
    const { transaction, qrCodeBase64, qrCodePayload } = result;

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
      const listing = await response.json() as Record<string, any>;
      if (!Array.isArray(listing.data) || listing.data.length !== 1 || listing.paging?.next) throw new Error('Card creation reconciliation is ambiguous');
      const order = listing.data[0];
      if (order.code !== options.creationId || order.metadata?.account_id !== input.accountId ||
          (input.billingRecordId !== undefined && order.metadata?.billing_record_id !== input.billingRecordId) ||
          order.amount !== Math.round(input.amount * 100) || !Array.isArray(order.charges) || order.charges.length !== 1 ||
          order.charges[0]?.amount !== Math.round(input.amount * 100) || order.charges[0]?.payment_method !== 'credit_card') {
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

    const payload = (await response.json()) as Record<string, any>;
    return this.#readCardCreation(payload, input, options);
  }

  async #readCardCreation(payload: Record<string, any>, input: CardPaymentIntentInput, options?: { readonly deferPersistence: boolean; readonly creationId?: string }): Promise<CardPaymentIntentSummary> {
    if ((options?.creationId && payload.code !== undefined && payload.code !== options.creationId) ||
        (payload.metadata?.account_id !== undefined && payload.metadata.account_id !== input.accountId) ||
        (payload.metadata?.billing_record_id !== undefined && payload.metadata.billing_record_id !== input.billingRecordId)) {
      throw new Error('Card creation provider identity mismatch');
    }
    const charge = Array.isArray(payload?.charges) && payload.charges.length === 1 ? payload.charges[0] : undefined;
    const lastTransaction = charge?.last_transaction ?? {};
    const normalizedStatus = classifyCardCharge(charge, {
      amount: input.amount, accountId: input.accountId, billingRecordId: input.billingRecordId,
      orderId: payload.id, orderCode: options?.creationId, order: payload
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
        brand: input.brand?.trim() || lastTransaction?.brand || undefined,
        last4: input.last4.replace(/\D/g, '').slice(-4)
      },
      createdAt: String(payload.created_at ?? nowIso()),
      providerOrderId: payload.id ? String(payload.id) : undefined,
      providerChargeId: charge?.id ? String(charge.id) : undefined,
      providerAuthorizationCode: lastTransaction?.authorization_code
        ? String(lastTransaction.authorization_code)
        : undefined,
      providerReferenceId: lastTransaction?.acquirer_nsu
        ? String(lastTransaction.acquirer_nsu)
        : undefined
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

    const payload = (await response.json()) as Record<string, any>;
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
    const lastTransaction = payload.last_transaction ?? {};
    const result: CardPaymentCaptureResult = {
      transactionId,
      provider: 'pagarme-card',
      status: 'captured',
      providerChargeId: payload.id ? String(payload.id) : transactionId,
      providerAuthorizationCode: lastTransaction?.authorization_code
        ? String(lastTransaction.authorization_code)
        : undefined,
      providerReferenceId: lastTransaction?.acquirer_nsu
        ? String(lastTransaction.acquirer_nsu)
        : undefined,
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
