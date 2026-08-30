import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { TextDecoder } from 'node:util';

export const LABORATORY_PROVIDER_MAX_AGE_SECONDS = 300;
export const LABORATORY_PROVIDER_MAX_BODY_BYTES = 65_536;
export const LABORATORY_PROVIDER_SCHEMA_VERSION = '1' as const;
export const LABORATORY_PROVIDER_CODE = 'equipment-bridge' as const;

const KEY_ID_PATTERN = /^[A-Za-z0-9_-]{8,128}$/;
const TIMESTAMP_PATTERN = /^\d{10}$/;
const SIGNATURE_PATTERN = /^v1=([0-9a-f]{64})$/;
const OBSERVED_AT_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
const FIELD_NAMES = [
  'schemaVersion',
  'provider',
  'externalResultId',
  'orderId',
  'equipmentId',
  'resultSummary',
  'observedAt'
] as const;
const FIELD_NAME_SET = new Set<string>(FIELD_NAMES);
const SENTINEL_SECRET = Buffer.alloc(32, 0xa5);
const ZERO_DIGEST = Buffer.alloc(32);
const textDecoder = new TextDecoder('utf-8', { fatal: true });

export interface LaboratoryProviderPayload {
  readonly schemaVersion: typeof LABORATORY_PROVIDER_SCHEMA_VERSION;
  readonly provider: typeof LABORATORY_PROVIDER_CODE;
  readonly externalResultId: string;
  readonly orderId: string;
  readonly equipmentId: string;
  readonly resultSummary: string;
  readonly observedAt: string;
}

export interface LaboratoryProviderKey {
  readonly accountId: string;
  readonly secret: Buffer | string;
}

export interface LaboratoryProviderSignatureVerificationInput {
  readonly keyId: string;
  readonly timestamp: string;
  readonly signature: string;
  readonly rawBody: Buffer;
  readonly nowSeconds: number;
}

export interface LaboratoryProviderSignatureVerificationResult {
  readonly accountId: string;
  readonly keyId: string;
  readonly timestamp: number;
}

export interface LaboratoryProviderSignatureVerifier {
  verify(
    input: LaboratoryProviderSignatureVerificationInput
  ): Promise<LaboratoryProviderSignatureVerificationResult | null>;
}

export class LaboratoryProviderPayloadValidationError extends Error {
  readonly code = 'LABORATORY_PROVIDER_INVALID_PAYLOAD' as const;

  public constructor() {
    super('Invalid laboratory provider payload');
    this.name = 'LaboratoryProviderPayloadValidationError';
  }
}

function invalidPayload(): never {
  throw new LaboratoryProviderPayloadValidationError();
}

function skipWhitespace(text: string, start: number): number {
  let cursor = start;
  while (
    cursor < text.length &&
    (text[cursor] === ' ' ||
      text[cursor] === '\t' ||
      text[cursor] === '\n' ||
      text[cursor] === '\r')
  ) {
    cursor += 1;
  }
  return cursor;
}

function readJsonString(text: string, start: number): { readonly value: string; readonly next: number } {
  if (text[start] !== '"') invalidPayload();
  let escaped = false;
  for (let cursor = start + 1; cursor < text.length; cursor += 1) {
    const character = text[cursor];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (character === '\\') {
      escaped = true;
      continue;
    }
    if (character === '"') {
      const encoded = text.slice(start, cursor + 1);
      try {
        const value = JSON.parse(encoded) as unknown;
        if (typeof value !== 'string') invalidPayload();
        return { value, next: cursor + 1 };
      } catch {
        invalidPayload();
      }
    }
    if ((character?.charCodeAt(0) ?? 0) < 0x20) invalidPayload();
  }
  invalidPayload();
}

function parseStrictObject(text: string): Record<string, string> {
  let cursor = skipWhitespace(text, 0);
  if (text[cursor] !== '{') invalidPayload();
  cursor = skipWhitespace(text, cursor + 1);
  const values: Record<string, string> = {};

  if (text[cursor] === '}') {
    cursor = skipWhitespace(text, cursor + 1);
    if (cursor !== text.length) invalidPayload();
    return values;
  }

  while (cursor < text.length) {
    const key = readJsonString(text, cursor);
    if (Object.prototype.hasOwnProperty.call(values, key.value)) invalidPayload();
    cursor = skipWhitespace(text, key.next);
    if (text[cursor] !== ':') invalidPayload();
    const value = readJsonString(text, skipWhitespace(text, cursor + 1));
    values[key.value] = value.value;
    cursor = skipWhitespace(text, value.next);
    if (text[cursor] === '}') {
      cursor = skipWhitespace(text, cursor + 1);
      if (cursor !== text.length) invalidPayload();
      return values;
    }
    if (text[cursor] !== ',') invalidPayload();
    cursor = skipWhitespace(text, cursor + 1);
  }

  invalidPayload();
}

function decodeBody(rawBody: Buffer): string {
  if (!Buffer.isBuffer(rawBody) || rawBody.length === 0 || rawBody.length > LABORATORY_PROVIDER_MAX_BODY_BYTES) {
    invalidPayload();
  }
  if (rawBody[0] === 0xef && rawBody[1] === 0xbb && rawBody[2] === 0xbf) invalidPayload();
  try {
    return textDecoder.decode(rawBody);
  } catch {
    invalidPayload();
  }
}

function requireString(
  values: Record<string, string>,
  key: (typeof FIELD_NAMES)[number],
  minLength: number,
  maxLength: number
): string {
  const value = values[key];
  if (
    typeof value !== 'string' ||
    value.length < minLength ||
    value.length > maxLength ||
    value !== value.trim() ||
    value.includes('\u0000')
  ) {
    invalidPayload();
  }
  return value;
}

function requireCanonicalObservedAt(value: string): string {
  if (!OBSERVED_AT_PATTERN.test(value)) invalidPayload();
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()) || date.toISOString() !== value) invalidPayload();
  return value;
}

/** Parse the exact wire contract without reserializing the signed body first. */
export function parseLaboratoryProviderPayload(rawBody: Buffer): LaboratoryProviderPayload {
  const values = parseStrictObject(decodeBody(rawBody));
  const keys = Object.keys(values).sort();
  const expectedKeys = [...FIELD_NAMES].sort();
  if (keys.length !== expectedKeys.length || keys.some((key, index) => key !== expectedKeys[index])) {
    invalidPayload();
  }

  const schemaVersion = requireString(values, 'schemaVersion', 1, 32);
  const provider = requireString(values, 'provider', 1, 64);
  if (schemaVersion !== LABORATORY_PROVIDER_SCHEMA_VERSION || provider !== LABORATORY_PROVIDER_CODE) {
    invalidPayload();
  }

  const externalResultId = requireString(values, 'externalResultId', 3, 120);
  const orderId = requireString(values, 'orderId', 3, 120);
  const equipmentId = requireString(values, 'equipmentId', 2, 120);
  const resultSummary = requireString(values, 'resultSummary', 1, 4_000);
  const observedAt = requireCanonicalObservedAt(requireString(values, 'observedAt', 24, 24));

  return {
    schemaVersion,
    provider,
    externalResultId,
    orderId,
    equipmentId,
    resultSummary,
    observedAt
  };
}

/** Fingerprint the immutable semantic contract in a fixed field order. */
export function fingerprintLaboratoryProviderPayload(payload: LaboratoryProviderPayload): string {
  return createHash('sha256')
    .update(
      JSON.stringify({
        schemaVersion: payload.schemaVersion,
        provider: payload.provider,
        externalResultId: payload.externalResultId,
        orderId: payload.orderId,
        equipmentId: payload.equipmentId,
        resultSummary: payload.resultSummary,
        observedAt: payload.observedAt
      }),
      'utf8'
    )
    .digest('hex');
}

export class RejectingLaboratoryProviderSignatureVerifier
  implements LaboratoryProviderSignatureVerifier
{
  public async verify(
    _input: LaboratoryProviderSignatureVerificationInput
  ): Promise<LaboratoryProviderSignatureVerificationResult | null> {
    return null;
  }
}

export class HmacLaboratoryProviderSignatureVerifier
  implements LaboratoryProviderSignatureVerifier
{
  readonly #keyring: ReadonlyMap<string, LaboratoryProviderKey>;
  readonly #maxAgeSeconds: number;

  public constructor(
    keyring: ReadonlyMap<string, LaboratoryProviderKey>,
    maxAgeSeconds = LABORATORY_PROVIDER_MAX_AGE_SECONDS
  ) {
    this.#keyring = keyring;
    this.#maxAgeSeconds = maxAgeSeconds;
  }

  public async verify(
    input: LaboratoryProviderSignatureVerificationInput
  ): Promise<LaboratoryProviderSignatureVerificationResult | null> {
    const keyIdValid = KEY_ID_PATTERN.test(input.keyId);
    const timestampValid = TIMESTAMP_PATTERN.test(input.timestamp);
    const timestamp = timestampValid ? Number(input.timestamp) : Number.NaN;
    const key = keyIdValid ? this.#keyring.get(input.keyId) : undefined;
    const secret = key?.secret ?? SENTINEL_SECRET;
    const secretBytes = Buffer.from(secret);
    const usableSecret = secretBytes.length >= 32 ? secretBytes : SENTINEL_SECRET;
    const expected = createHmac('sha256', usableSecret)
      .update(Buffer.from(`v1.${timestampValid ? input.timestamp : '0000000000'}.`, 'ascii'))
      .update(Buffer.isBuffer(input.rawBody) ? input.rawBody : Buffer.alloc(0))
      .digest();
    const signatureMatch = input.signature.match(SIGNATURE_PATTERN);
    const supplied = signatureMatch ? Buffer.from(signatureMatch[1] ?? '', 'hex') : ZERO_DIGEST;
    const digestValid = supplied.length === expected.length && timingSafeEqual(expected, supplied);
    const nowValid = Number.isSafeInteger(input.nowSeconds);
    const maxAgeValid = Number.isSafeInteger(this.#maxAgeSeconds) && this.#maxAgeSeconds >= 0;
    const fresh =
      timestampValid &&
      nowValid &&
      maxAgeValid &&
      timestamp >= input.nowSeconds - this.#maxAgeSeconds &&
      timestamp <= input.nowSeconds + this.#maxAgeSeconds;

    if (
      !key ||
      !timestampValid ||
      !signatureMatch ||
      !digestValid ||
      !fresh ||
      !Buffer.isBuffer(input.rawBody) ||
      input.rawBody.length > LABORATORY_PROVIDER_MAX_BODY_BYTES ||
      secretBytes.length < 32
    ) {
      return null;
    }

    return { accountId: key.accountId, keyId: input.keyId, timestamp };
  }
}
