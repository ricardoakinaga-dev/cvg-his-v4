import { apiRequest } from './api';

export interface PixPaymentIntentResponse {
  readonly id: string;
  readonly accountId: string;
  readonly billingRecordId: string | null;
  readonly amount: number;
  readonly currency: 'BRL';
  readonly provider: 'local-pix';
  readonly status: 'pending' | 'paid' | 'expired' | 'cancelled';
  readonly qrCodeText: string;
  readonly qrCodeImageUrl: string;
  readonly expiresAt: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly eventId: string;
  readonly eventCorrelationId: string;
}

export interface CreatePixPaymentIntentPayload {
  amount: number;
  description: string;
  billingRecordId?: string | null;
  expirationMinutes?: number;
}

export const pixService = {
  async createIntent(payload: CreatePixPaymentIntentPayload): Promise<PixPaymentIntentResponse> {
    return apiRequest<PixPaymentIntentResponse>('/payments/pix/intents', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }
};
