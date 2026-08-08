import { createCorrelationId, nowIso } from '@cvg-his-v2/shared-utils';
import { PagarMePixAdapter, type CreatePixIntentInput } from '@cvg-his-v2/module-pix';
import type { AccountId } from '@cvg-his-v2/shared-types';
import type { PixTransactionRepository } from './pix-transaction-repository.js';
import type { CardTransactionRepository } from './card-transaction-repository.js';

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
  readonly status: 'captured' | 'failed';
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
  createCardIntent?(input: CardPaymentIntentInput): Promise<CardPaymentIntentSummary>;
  findCardIntent(
    accountId: string,
    transactionId: string
  ): Promise<CardPaymentIntentSummary | null>;
  captureCardIntent?(transactionId: string): Promise<CardPaymentCaptureResult>;
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

  async createCardIntent(input: CardPaymentIntentInput): Promise<CardPaymentIntentSummary> {
    const id = createCorrelationId('card');
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

  async captureCardIntent(transactionId: string): Promise<CardPaymentCaptureResult> {
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

  async createCardIntent(input: CardPaymentIntentInput): Promise<CardPaymentIntentSummary> {
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
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        code: input.billingRecordId ?? createCorrelationId('order'),
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
              capture: input.capture === true,
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
    const charge = Array.isArray(payload.charges) ? payload.charges[0] : undefined;
    const lastTransaction = charge?.last_transaction ?? {};
    const rawStatus = String(charge?.status ?? payload.status ?? 'pending');
    const normalizedStatus =
      rawStatus === 'authorized_pending_capture' || rawStatus === 'waiting_capture'
        ? 'authorized_pending_capture'
        : rawStatus === 'captured' || rawStatus === 'paid'
          ? 'captured'
          : rawStatus === 'not_authorized'
            ? 'not_authorized'
            : rawStatus === 'failed'
              ? 'failed'
              : 'pending';

    const intent: CardPaymentIntentSummary = {
      id: String(charge?.code ?? payload.code ?? createCorrelationId('card')),
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
    await this.#cardTransactions?.create({
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

  async captureCardIntent(transactionId: string): Promise<CardPaymentCaptureResult> {
    const existing = await this.#findCardIntent(transactionId);
    const providerChargeId = existing?.providerChargeId ?? transactionId;
    const response = await fetch(
      `${this.#baseUrl}/core/v5/charges/${encodeURIComponent(providerChargeId)}/capture`,
      {
        method: 'POST',
        headers: {
          authorization: `Basic ${Buffer.from(`${this.#apiKey}:`).toString('base64')}`,
          'content-type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      await this.#cardTransactions?.updateStatus({
        transactionId,
        status: 'failed',
        updatedAt: nowIso(),
        lastProviderSyncAt: nowIso(),
        providerChargeId,
        failureReason: `PagarMe capture failed with status ${response.status}`
      });
      return {
        transactionId,
        provider: 'pagarme-card',
        status: 'failed',
        capturedAt: nowIso(),
        failureReason: `PagarMe capture failed with status ${response.status}`
      };
    }

    const payload = (await response.json()) as Record<string, any>;
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
    if (inMemory) return { ...inMemory, card: { ...inMemory.card } };

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
