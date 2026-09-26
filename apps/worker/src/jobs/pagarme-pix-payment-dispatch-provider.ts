import {
  PixPaymentDispatchProviderError,
  type PixPaymentDispatchProvider,
  type PixPaymentDispatchProviderInput
} from './pix-payment-dispatcher.js';

/**
 * Real encounter PIX provider (R2-PAY-01). Creates a Pagar.me PIX QR code with
 * the dispatcher's stable idempotency key, so a retried or ambiguous attempt
 * resolves to the same charge. The account and attempt ids are written as
 * charge metadata: the API webhook re-reads them from Pagar.me to bind a
 * confirmation to its tenant and attempt without trusting the webhook body.
 *
 * Contract assumptions (shared with the direct-PIX adapter): POST
 * /core/v5/pix/qr_codes accepts { pix_key, amount (cents), description,
 * expires_at, metadata } and returns { id, qr_code, qr_code_base64,
 * expires_at }. Confirm in the Pagar.me sandbox before go-live.
 */
export interface PagarMePixPaymentDispatchProviderOptions {
  readonly apiKey: string;
  readonly pixKey: string;
  readonly baseUrl?: string;
  readonly expirationMinutes?: number;
  readonly fetchImpl?: typeof fetch;
}

export const PAGARME_ACCOUNT_METADATA_KEY = 'cvg_account_id';
export const PAGARME_ATTEMPT_METADATA_KEY = 'cvg_attempt_id';

function providerError(
  code: string,
  failureClass: 'ambiguous' | 'permanent' | 'transient',
  publicMessage: string
): PixPaymentDispatchProviderError {
  return new PixPaymentDispatchProviderError({ code, failureClass, publicMessage });
}

export class PagarMePixPaymentDispatchProvider implements PixPaymentDispatchProvider {
  public readonly key = 'pagarme' as const;
  public readonly mode = 'external' as const;
  readonly #authorization: string;
  readonly #pixKey: string;
  readonly #baseUrl: string;
  readonly #expirationMs: number;
  readonly #fetch: typeof fetch;

  public constructor(options: PagarMePixPaymentDispatchProviderOptions) {
    if (!options.apiKey.trim() || !options.pixKey.trim()) {
      throw new Error('Pagar.me PIX dispatch requires an API key and a PIX key');
    }
    this.#authorization = `Basic ${Buffer.from(`${options.apiKey}:`).toString('base64')}`;
    this.#pixKey = options.pixKey;
    this.#baseUrl = (options.baseUrl ?? 'https://api.pagar.me').replace(/\/+$/, '');
    this.#expirationMs = (options.expirationMinutes ?? 30) * 60 * 1000;
    this.#fetch = options.fetchImpl ?? fetch;
  }

  public async createIntent(input: PixPaymentDispatchProviderInput) {
    const expiresAt = new Date(new Date(input.attemptCreatedAt).getTime() + this.#expirationMs);
    let response: Response;
    try {
      response = await this.#fetch(`${this.#baseUrl}/core/v5/pix/qr_codes`, {
        method: 'POST',
        headers: {
          Authorization: this.#authorization,
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'Idempotency-Key': input.providerIdempotencyKey
        },
        body: JSON.stringify({
          pix_key: this.#pixKey,
          amount: input.amountCents,
          description: 'Pagamento de atendimento veterinário',
          expires_at: expiresAt.toISOString(),
          metadata: {
            [PAGARME_ACCOUNT_METADATA_KEY]: input.accountId,
            [PAGARME_ATTEMPT_METADATA_KEY]: input.attemptId
          }
        }),
        signal: input.signal
      });
    } catch {
      // The request may have reached the provider; the idempotency key makes
      // the retry safe, so the dispatcher must treat this as ambiguous.
      throw providerError('PAGARME_NO_RESPONSE', 'ambiguous', 'PIX provider did not respond');
    }

    if (!response.ok) {
      if (response.status === 408) {
        throw providerError('PAGARME_TIMEOUT', 'ambiguous', 'PIX provider timed out');
      }
      if (response.status === 429 || response.status >= 500) {
        throw providerError('PAGARME_UNAVAILABLE', 'transient', 'PIX provider is temporarily unavailable');
      }
      if (response.status === 401 || response.status === 403) {
        throw providerError('PAGARME_AUTH_REJECTED', 'permanent', 'PIX provider rejected the credentials');
      }
      throw providerError('PAGARME_REJECTED', 'permanent', 'PIX provider rejected the charge');
    }

    let body: Record<string, unknown>;
    try {
      body = (await response.json()) as Record<string, unknown>;
    } catch {
      throw providerError('PAGARME_INVALID_RESPONSE', 'ambiguous', 'PIX provider response was unreadable');
    }
    const providerExpiresAt =
      typeof body.expires_at === 'string' && Number.isFinite(new Date(body.expires_at).getTime())
        ? new Date(body.expires_at).toISOString()
        : expiresAt.toISOString();
    if (
      typeof body.id !== 'string' ||
      typeof body.qr_code !== 'string' ||
      typeof body.qr_code_base64 !== 'string'
    ) {
      // A 2xx means the charge may exist: reconcile rather than fail.
      throw providerError('PAGARME_INVALID_RESPONSE', 'ambiguous', 'PIX provider response was incomplete');
    }
    return Object.freeze({
      providerTransactionId: body.id,
      qrCodePayload: body.qr_code,
      qrCodeBase64: body.qr_code_base64,
      expiresAt: providerExpiresAt
    });
  }
}
