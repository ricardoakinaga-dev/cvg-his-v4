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

export interface PaymentGateway {
  createPixIntent(input: PixPaymentIntentInput): Promise<PixPaymentIntentSummary>;
  confirmPayment?(transactionId: string): PixPaymentConfirmResult;
}

export class LocalPixPaymentGateway implements PaymentGateway {
  readonly #intents = new Map<string, PixPaymentIntentSummary>();

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

  constructor(options: { readonly apiKey: string; readonly pixKey: string }) {
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
}
