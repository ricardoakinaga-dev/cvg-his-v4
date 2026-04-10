import { createCorrelationId, nowIso } from '@cvg-his-v2/shared-utils';

export interface PixPaymentIntentInput {
  readonly accountId: string;
  readonly billingRecordId?: string;
  readonly amount: number;
  readonly description: string;
  readonly expirationMinutes?: number;
}

export interface PixPaymentIntentSummary {
  readonly id: string;
  readonly provider: 'local-pix';
  readonly accountId: string;
  readonly billingRecordId?: string;
  readonly amount: number;
  readonly currency: 'BRL';
  readonly description: string;
  readonly qrCodePayload: string;
  readonly qrCodeBase64: string;
  readonly expiresAt: string;
  readonly status: 'pending';
  readonly createdAt: string;
}

export interface PaymentGateway {
  createPixIntent(input: PixPaymentIntentInput): Promise<PixPaymentIntentSummary>;
}

export class LocalPixPaymentGateway implements PaymentGateway {
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

    return {
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
  }
}
