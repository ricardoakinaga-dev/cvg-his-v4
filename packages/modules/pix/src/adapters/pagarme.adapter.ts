/**
 * Pagar.me PIX Adapter
 *
 * Implementation of PixProvider for Pagar.me.
 * Handles PIX QR code generation and status management via Pagar.me API v5.
 *
 * @see https://docs.pagar.me/api/pix
 */

import { createCorrelationId, nowIso } from '@cvg-his-v2/shared-utils';
import type {
  PixProvider,
  CreatePixIntentInput,
  PixIntentResult,
  PixStatusResult,
  PixConfirmResult,
  PixCancelResult,
  PixTransactionId,
  PixTransaction,
  PixTransactionStatus,
} from '../types.js';

export interface PagarMePixAdapterOptions {
  readonly apiKey: string;
  readonly pixKey: string;
  readonly baseUrl?: string;
}

const DEFAULT_BASE_URL = 'https://api.pagar.me';
const DEFAULT_EXPIRATION_MINUTES = 60;

interface PagarMeQrCodeResponse {
  readonly id: string;
  readonly qr_code: string;
  readonly qr_code_base64: string;
  readonly expires_at: string;
}

interface PagarMeQrCodeStatusResponse {
  readonly id: string;
  readonly status: 'pending' | 'paid' | 'canceled' | 'expired';
  readonly paid_at?: string;
}

interface PagarMeApiError {
  readonly errors?: Array<{ readonly message: string; readonly code: string }>;
  readonly message?: string;
}

function toPixStatus(pagarmeStatus: PagarMeQrCodeStatusResponse['status']): PixTransactionStatus {
  switch (pagarmeStatus) {
    case 'paid':
      return 'completed';
    case 'canceled':
      return 'cancelled';
    case 'expired':
      return 'expired';
    default:
      return 'pending';
  }
}

export class PagarMePixAdapter implements PixProvider {
  readonly name = 'pagarme' as const;
  readonly #apiKey: string;
  readonly #pixKey: string;
  readonly #baseUrl: string;

  constructor(options: PagarMePixAdapterOptions) {
    if (!options.apiKey?.trim()) {
      throw new Error('PagarMePixAdapter: apiKey is required');
    }
    if (!options.pixKey?.trim()) {
      throw new Error('PagarMePixAdapter: pixKey is required');
    }
    this.#apiKey = options.apiKey;
    this.#pixKey = options.pixKey;
    this.#baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
  }

  /**
   * Build Basic Auth header for Pagar.me API.
   * Pagar.me uses API key as username and empty password.
   */
  #authHeader(): string {
    const encoded = Buffer.from(`${this.#apiKey}:`).toString('base64');
    return `Basic ${encoded}`;
  }

  /**
   * Make an HTTP request to the Pagar.me API.
   */
  async #request<T>(
    method: 'GET' | 'POST' | 'DELETE',
    path: string,
    body?: Record<string, unknown>
  ): Promise<T> {
    const url = `${this.#baseUrl}${path}`;
    const options: RequestInit = {
      method,
      headers: {
        Authorization: this.#authHeader(),
        'Content-Type': 'application/json',
        'User-Agent': 'cvg-his-v2-pix-adapter/1.0',
      },
    };

    if (body && (method === 'POST' || method === 'DELETE')) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      let message = `HTTP ${response.status} ${response.statusText}`;
      try {
        const errorBody: PagarMeApiError = await response.json() as PagarMeApiError;
        if (errorBody.errors?.[0]?.message) {
          message = errorBody.errors[0].message;
        } else if (errorBody.message) {
          message = errorBody.message;
        }
      } catch {
        // ignore parse errors
      }
      throw new Error(`PagarMePixAdapter request failed: ${message}`);
    }

    return response.json() as Promise<T>;
  }

  async createIntent(input: CreatePixIntentInput): Promise<PixIntentResult> {
    const expirationMinutes = input.expirationMinutes ?? DEFAULT_EXPIRATION_MINUTES;
    const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000).toISOString();

    const body: Record<string, unknown> = {
      pix_key: this.#pixKey,
      amount: input.amount,
      description: input.description,
      expires_at: expiresAt,
    };

    const qrCodeResponse = await this.#request<PagarMeQrCodeResponse>(
      'POST',
      '/core/v5/pix/qr_codes',
      body
    );

    const transactionId = createCorrelationId('pix') as PixTransactionId;
    const providerTransactionId = qrCodeResponse.id;
    const qrCodeBase64 = qrCodeResponse.qr_code_base64;
    const qrCodePayload = qrCodeResponse.qr_code;
    const txExpiresAt = qrCodeResponse.expires_at;

    const transaction: PixTransaction = {
      id: transactionId,
      billingRecordId: input.billingRecordId,
      accountId: input.accountId,
      amount: input.amount,
      currency: 'BRL',
      pixKey: this.#pixKey,
      qrCodeBase64,
      qrCodePayload,
      expiresAt: txExpiresAt,
      status: 'pending',
      provider: 'pagarme',
      providerTransactionId,
      createdAt: nowIso(),
    };

    return {
      transaction,
      qrCodeBase64,
      qrCodePayload,
    };
  }

  async getStatus(transactionId: PixTransactionId): Promise<PixStatusResult> {
    // The transactionId from our system is the branded id.
    // We need the providerTransactionId to query Pagar.me.
    // In a real implementation, you'd look up the transaction by our id first.
    // For now, we assume transactionId is the Pagar.me transaction id.
    const providerTransactionId = transactionId;

    const response = await this.#request<PagarMeQrCodeStatusResponse>(
      'GET',
      `/core/v5/pix/qr_codes/${providerTransactionId}`
    );

    return {
      transactionId,
      status: toPixStatus(response.status),
      providerTransactionId: response.id,
      completedAt: response.paid_at,
    };
  }

  async confirmPayment(
    transactionId: PixTransactionId,
    providerConfirmationId?: string
  ): Promise<PixStatusResult> {
    // Called by webhook handler when Pagar.me confirms PIX settlement.
    // Pagar.me sends settlement notifications via webhooks.
    // This method allows manual/confirmation override.
    const response = await this.#request<PagarMeQrCodeStatusResponse>(
      'GET',
      `/core/v5/pix/qr_codes/${providerConfirmationId ?? transactionId}`
    );

    return {
      transactionId,
      status: toPixStatus(response.status),
      providerTransactionId: response.id,
      completedAt: response.paid_at,
    };
  }

  async cancelIntent(transactionId: PixTransactionId): Promise<PixCancelResult> {
    try {
      await this.#request<void>(
        'DELETE',
        `/core/v5/pix/qr_codes/${transactionId}`
      );
      return {
        transactionId,
        cancelled: true,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return {
        transactionId,
        cancelled: false,
        reason: message,
      };
    }
  }
}
