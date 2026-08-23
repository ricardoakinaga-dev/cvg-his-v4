import { createHmac, timingSafeEqual } from 'node:crypto';
import type { IncomingHttpHeaders } from 'node:http';

const DEFAULT_MAX_AGE_SECONDS = 300;
const SENTINEL_SECRET = Buffer.alloc(32, 0xa5);
const ZERO_DIGEST = Buffer.alloc(32);
const KEY_ID_PATTERN = /^[A-Za-z0-9_-]{8,128}$/;
const EVENT_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,254}$/;
const TIMESTAMP_PATTERN = /^\d{10}$/;
const SIGNATURE_PATTERN = /^v1=([0-9a-f]{64})$/;

export interface PixProviderWebhookKey {
  readonly accountId: string;
  readonly secret: Buffer | string;
}

export interface PixProviderWebhookVerifierOptions {
  readonly keyring: ReadonlyMap<string, PixProviderWebhookKey>;
  readonly nowSeconds: () => number;
  readonly maxAgeSeconds?: number;
  readonly sentinelSecret?: Buffer;
  /** Test-only instrumentation seam; production uses node:crypto directly. */
  readonly compareDigests?: (expected: Buffer, supplied: Buffer) => boolean;
}

export interface PixProviderWebhookVerificationInput {
  readonly headers: IncomingHttpHeaders;
  readonly rawBody: Buffer;
}

export interface PixProviderWebhookVerificationResult {
  readonly accountId: string;
  readonly keyId: string;
  readonly eventId: string;
  readonly timestamp: number;
}

export class PixProviderWebhookAuthenticationError extends Error {
  readonly code = 'PIX_WEBHOOK_UNAUTHORIZED' as const;

  constructor() {
    super('Invalid PIX webhook authentication');
    this.name = 'PixProviderWebhookAuthenticationError';
  }
}

function headerValues(headers: IncomingHttpHeaders, name: string): string[] {
  const values: string[] = [];
  for (const [headerName, value] of Object.entries(headers)) {
    if (headerName.toLowerCase() !== name) continue;
    if (Array.isArray(value)) values.push(...value);
    else if (typeof value === 'string') values.push(value);
  }
  return values;
}

function singleHeader(headers: IncomingHttpHeaders, name: string): { value: string; valid: boolean } {
  let value: string | undefined;
  for (const [headerName, headerValue] of Object.entries(headers)) {
    if (headerName.toLowerCase() !== name) continue;
    // Node represents repeated headers as arrays. Reject even a one-element
    // array so a proxy cannot smuggle a duplicate through normalization.
    if (Array.isArray(headerValue) || typeof headerValue !== 'string' || value !== undefined) {
      return { value: '', valid: false };
    }
    value = headerValue;
  }
  return value === undefined ? { value: '', valid: false } : { value, valid: true };
}

function digestFor(secret: Buffer | string, timestamp: string, eventId: string, rawBody: Buffer): Buffer {
  return createHmac('sha256', secret)
    .update(Buffer.from(`v1.${timestamp}.${eventId}.`, 'ascii'))
    .update(rawBody)
    .digest();
}

/**
 * Authenticate the synthetic provider protocol before any body decoding,
 * JSON parsing, tenant lookup or database access.
 */
export function verifyPixProviderWebhook(
  input: PixProviderWebhookVerificationInput,
  options: PixProviderWebhookVerifierOptions
): PixProviderWebhookVerificationResult {
  const keyHeader = singleHeader(input.headers, 'x-cvg-pix-key-id');
  const timestampHeader = singleHeader(input.headers, 'x-cvg-pix-timestamp');
  const eventHeader = singleHeader(input.headers, 'x-cvg-pix-event-id');
  const signatureHeader = singleHeader(input.headers, 'x-cvg-pix-signature');
  const contentType = singleHeader(input.headers, 'content-type');
  const contentEncoding = singleHeader(input.headers, 'content-encoding');

  const keyIdValid = keyHeader.valid && KEY_ID_PATTERN.test(keyHeader.value);
  const timestampValid = timestampHeader.valid && TIMESTAMP_PATTERN.test(timestampHeader.value);
  const eventIdValid = eventHeader.valid && EVENT_ID_PATTERN.test(eventHeader.value);
  const signatureMatch = signatureHeader.valid ? signatureHeader.value.match(SIGNATURE_PATTERN) : null;
  const signatureValid = signatureMatch !== null;
  const contentTypeValid = contentType.valid && contentType.value === 'application/json';
  const contentEncodingValid =
    !headerValues(input.headers, 'content-encoding').length
      || (contentEncoding.valid && contentEncoding.value === 'identity');

  const timestampText = timestampValid ? timestampHeader.value : '0000000000';
  const eventId = eventIdValid ? eventHeader.value : 'invalid-event';
  const keyId = keyIdValid ? keyHeader.value : 'invalid-key';
  const timestamp = timestampValid ? Number(timestampHeader.value) : Number.NaN;
  const key = keyIdValid ? options.keyring.get(keyId) : undefined;
  const secret = key?.secret ?? options.sentinelSecret ?? SENTINEL_SECRET;
  const expectedDigest = digestFor(secret, timestampText, eventId, input.rawBody);
  const suppliedDigest = signatureValid
    ? Buffer.from(signatureMatch[1] ?? '', 'hex')
    : ZERO_DIGEST;
  const compareDigests = options.compareDigests ?? timingSafeEqual;
  const digestValid = suppliedDigest.length === 32 && compareDigests(expectedDigest, suppliedDigest);

  const now = options.nowSeconds();
  const maxAge = options.maxAgeSeconds ?? DEFAULT_MAX_AGE_SECONDS;
  const maxAgeValid = Number.isSafeInteger(maxAge) && maxAge >= 0;
  const fresh =
    timestampValid
    && Number.isSafeInteger(now)
    && maxAgeValid
    && timestamp >= now - maxAge
    && timestamp <= now + maxAge;

  if (
    !keyIdValid
    || !timestampValid
    || !eventIdValid
    || !signatureValid
    || !digestValid
    || !fresh
    || !contentTypeValid
    || !contentEncodingValid
    || input.rawBody.length > 65_536
    || !key
  ) {
    throw new PixProviderWebhookAuthenticationError();
  }

  const secretBytes = Buffer.from(key.secret);
  if (secretBytes.length < 32) {
    throw new PixProviderWebhookAuthenticationError();
  }

  return { accountId: key.accountId, keyId, eventId, timestamp };
}
