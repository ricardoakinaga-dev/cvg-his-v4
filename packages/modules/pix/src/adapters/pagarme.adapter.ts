/**
 * Pagar.me PIX Adapter
 *
 * Implementation of PixProvider for Pagar.me.
 *
 * NOTE: This adapter requires a valid Pagar.me API key.
 * Set PAGARME_API_KEY and PAGARME_PIX_KEY in environment.
 *
 * @example
 * ```typescript
 * const adapter = new PagarMePixAdapter({
 *   apiKey: process.env.PAGARME_API_KEY!,
 *   pixKey: process.env.PAGARME_PIX_KEY!
 * });
 * ```
 */

import type {
  PixProvider,
  CreatePixIntentInput,
  PixIntentResult,
  PixStatusResult,
  PixConfirmResult,
  PixCancelResult,
  PixTransactionId
} from '../types.js';

export interface PagarMePixAdapterOptions {
  readonly apiKey: string;
  readonly pixKey: string;
  readonly baseUrl?: string;
}

const DEFAULT_BASE_URL = 'https://api.pagar.me';

export class PagarMePixAdapter implements PixProvider {
  readonly name = 'pagarme' as const;
  readonly #apiKey: string;
  readonly #pixKey: string;
  readonly #baseUrl: string;

  constructor(options: PagarMePixAdapterOptions) {
    this.#apiKey = options.apiKey;
    this.#pixKey = options.pixKey;
    this.#baseUrl = options.baseUrl ?? DEFAULT_BASE_URL;
  }

  async createIntent(input: CreatePixIntentInput): Promise<PixIntentResult> {
    // TODO: Implement Pagar.me PIX endpoint call
    // POST https://api.pagar.me/core/v5/pix/qr_codes
    // Headers: Authorization: Basic base64(api_key:)
    // Body: { pix_key: this.#pixKey, amount: input.amount, description: input.description }
    //
    // Response fields needed:
    // - id (provider transaction id)
    // - qr_code (base64)
    // - qr_code_url (EMV string)
    // - expires_at (ISO date)
    throw new Error('PagarMePixAdapter.createIntent: Not yet implemented — requires Pagar.me API credentials');
  }

  async getStatus(transactionId: PixTransactionId): Promise<PixStatusResult> {
    // TODO: GET https://api.pagar.me/core/v5/pix/qr_codes/{transactionId}
    throw new Error('PagarMePixAdapter.getStatus: Not yet implemented');
  }

  async confirmPayment(transactionId: PixTransactionId, _providerConfirmationId?: string): Promise<PixStatusResult> {
    // TODO: Called by webhook handler when Pagar.me confirms PIX settlement
    // POST https://api.pagar.me/core/v5/pix/qr_codes/{transactionId}/confirm_payment
    throw new Error('PagarMePixAdapter.confirmPayment: Not yet implemented');
  }

  async cancelIntent(transactionId: PixTransactionId): Promise<PixCancelResult> {
    // TODO: DELETE https://api.pagar.me/core/v5/pix/qr_codes/{transactionId}
    throw new Error('PagarMePixAdapter.cancelIntent: Not yet implemented');
  }
}
