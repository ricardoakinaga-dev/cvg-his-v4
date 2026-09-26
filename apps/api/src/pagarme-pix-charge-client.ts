/**
 * Server-to-server read of a Pagar.me PIX charge. It is the only source of
 * truth for provider confirmations: inbound webhook bodies are treated as a
 * hint carrying an id, never as proof of payment.
 *
 * Contract assumptions (same as the PagarMePixAdapter used for direct PIX):
 * GET /core/v5/pix/qr_codes/{id} returns { id, status, amount (cents),
 * paid_at, metadata }. They must be confirmed in the Pagar.me sandbox before
 * go-live (R2-PAY-01 acceptance).
 */
export interface PagarMePixCharge {
  readonly id: string;
  readonly status: string;
  readonly amountCents: number | null;
  readonly paidAt: string | null;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface PagarMePixChargeClientOptions {
  readonly apiKey: string;
  readonly baseUrl?: string;
  readonly timeoutMs?: number;
  readonly fetchImpl?: typeof fetch;
}

export class PagarMePixChargeLookupError extends Error {
  public readonly retryable: boolean;

  public constructor(message: string, retryable: boolean) {
    super(message);
    this.name = 'PagarMePixChargeLookupError';
    this.retryable = retryable;
  }
}

const CHARGE_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,254}$/;

export class PagarMePixChargeClient {
  readonly #authorization: string;
  readonly #baseUrl: string;
  readonly #timeoutMs: number;
  readonly #fetch: typeof fetch;

  public constructor(options: PagarMePixChargeClientOptions) {
    if (!options.apiKey.trim()) throw new Error('Pagar.me API key is required');
    this.#authorization = `Basic ${Buffer.from(`${options.apiKey}:`).toString('base64')}`;
    this.#baseUrl = (options.baseUrl ?? 'https://api.pagar.me').replace(/\/+$/, '');
    this.#timeoutMs = options.timeoutMs ?? 10_000;
    this.#fetch = options.fetchImpl ?? fetch;
  }

  public async getCharge(chargeId: string): Promise<PagarMePixCharge | null> {
    if (!CHARGE_ID_PATTERN.test(chargeId)) return null;
    let response: Response;
    try {
      response = await this.#fetch(
        `${this.#baseUrl}/core/v5/pix/qr_codes/${encodeURIComponent(chargeId)}`,
        {
          method: 'GET',
          headers: { Authorization: this.#authorization, Accept: 'application/json' },
          signal: AbortSignal.timeout(this.#timeoutMs)
        }
      );
    } catch {
      throw new PagarMePixChargeLookupError('Pagar.me charge lookup failed', true);
    }
    if (response.status === 404) return null;
    if (!response.ok) {
      throw new PagarMePixChargeLookupError(
        `Pagar.me charge lookup returned HTTP ${response.status}`,
        response.status >= 500 || response.status === 429
      );
    }
    let body: Record<string, unknown>;
    try {
      body = (await response.json()) as Record<string, unknown>;
    } catch {
      throw new PagarMePixChargeLookupError('Pagar.me charge lookup returned invalid JSON', true);
    }
    if (typeof body.id !== 'string' || typeof body.status !== 'string') {
      throw new PagarMePixChargeLookupError('Pagar.me charge lookup returned an unknown shape', false);
    }
    return {
      id: body.id,
      status: body.status,
      amountCents: Number.isSafeInteger(body.amount) ? (body.amount as number) : null,
      paidAt: typeof body.paid_at === 'string' ? body.paid_at : null,
      metadata:
        body.metadata && typeof body.metadata === 'object' && !Array.isArray(body.metadata)
          ? (body.metadata as Record<string, unknown>)
          : {}
    };
  }
}
