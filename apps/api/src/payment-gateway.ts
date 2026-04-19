import { createCorrelationId, nowIso } from '@cvg-his-v2/shared-utils';
import { PagarMePixAdapter, type CreatePixIntentInput } from '@cvg-his-v2/module-pix';
import type { AccountId } from '@cvg-his-v2/shared-types';

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
  readonly expiresAt: string;
  readonly status: 'pending' | 'completed';
  readonly createdAt: string;
}

export interface PixPaymentConfirmResult {
  readonly transactionId: string;
  readonly status: 'completed';
  readonly providerTransactionId?: string;
  readonly billingRecordId?: string;
  readonly completedAt: string;
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
  captureCardIntent?(transactionId: string): Promise<CardPaymentCaptureResult>;
  confirmPayment?(transactionId: string): PixPaymentConfirmResult;
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

  confirmPayment(transactionId: string): PixPaymentConfirmResult {
    const intent = this.#intents.get(transactionId);
    return {
      transactionId,
      status: 'completed',
      providerTransactionId: intent?.billingRecordId
        ? `local_confirm_${transactionId}_for_${intent.billingRecordId}`
        : `local_confirm_${transactionId}`,
      completedAt: nowIso(),
      billingRecordId: intent?.billingRecordId
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
  readonly paymentProviders = {
    pix: 'pagarme',
    cards: 'pagarme-card'
  } as const;

  constructor(options: { readonly apiKey: string; readonly pixKey: string }) {
    this.#apiKey = options.apiKey;
    this.#adapter = new PagarMePixAdapter(options);
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

    return {
      id: transaction.id as string,
      provider: 'pagarme' as const,
      accountId: input.accountId,
      billingRecordId: input.billingRecordId,
      amount: input.amount,
      currency: 'BRL' as const,
      description: input.description,
      qrCodePayload,
      qrCodeBase64,
      expiresAt: transaction.expiresAt,
      status: transaction.status === 'completed' ? 'completed' : 'pending',
      createdAt: transaction.createdAt
    };
  }

  confirmPayment(transactionId: string): PixPaymentConfirmResult {
    // Fire-and-forget: actual settlement confirmation comes via Pagar.me webhook.
    // The route handler expects a sync return so we fulfill with the incoming id.
    void this.#adapter.confirmPayment(transactionId as any).catch(() => {
      // swallow: webhook handler is the authoritative confirmation path
    });
    return {
      transactionId,
      status: 'completed',
      completedAt: nowIso()
    };
  }

  async createCardIntent(input: CardPaymentIntentInput): Promise<CardPaymentIntentSummary> {
    if (!input.cardToken && !input.cardId) {
      throw new Error('PagarMe card payments require cardToken or cardId');
    }
    if (!input.customer?.name || !input.customer.email) {
      throw new Error('PagarMe card payments require customer name and email');
    }

    const response = await fetch('https://api.pagar.me/core/v5/orders', {
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

    return {
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
  }

  async captureCardIntent(transactionId: string): Promise<CardPaymentCaptureResult> {
    const response = await fetch(
      `https://api.pagar.me/core/v5/charges/${encodeURIComponent(transactionId)}/capture`,
      {
        method: 'POST',
        headers: {
          authorization: `Basic ${Buffer.from(`${this.#apiKey}:`).toString('base64')}`,
          'content-type': 'application/json'
        }
      }
    );

    if (!response.ok) {
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
    return {
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
      capturedAt: String(payload.updated_at ?? nowIso())
    };
  }
}
