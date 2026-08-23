import { TextDecoder } from 'node:util';

const DEFAULT_MAX_AGE_SECONDS = 300;
const MAX_AMOUNT_CENTS = 999_999_999_999;
const CLAIM_KEYS = [
  'type',
  'accountId',
  'attemptId',
  'providerTransactionId',
  'amountCents',
  'currency',
  'confirmedAt'
] as const;
const CLAIM_KEY_SET = new Set<string>(CLAIM_KEYS);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const PROVIDER_TRANSACTION_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,254}$/;
const CONFIRMED_AT_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

const textDecoder = new TextDecoder('utf-8', { fatal: true });

export interface PixProviderWebhookClaims {
  readonly type: 'pix.payment.confirmed.v1';
  readonly accountId: string;
  readonly attemptId: string;
  readonly providerTransactionId: string;
  readonly amountCents: number;
  readonly currency: 'BRL';
  readonly confirmedAt: string;
}

export interface PixProviderWebhookPayloadOptions {
  readonly nowSeconds: () => number;
  readonly maxAgeSeconds?: number;
}

export class PixProviderWebhookPayloadValidationError extends Error {
  readonly code = 'PIX_WEBHOOK_INVALID_PAYLOAD' as const;

  constructor() {
    super('Invalid PIX webhook payload');
    this.name = 'PixProviderWebhookPayloadValidationError';
  }
}

class JsonCursor {
  readonly text: string;
  index = 0;

  constructor(text: string) {
    this.text = text;
  }
}

function invalidPayload(): never {
  throw new PixProviderWebhookPayloadValidationError();
}

function skipWhitespace(cursor: JsonCursor): void {
  while (cursor.index < cursor.text.length && /\s/.test(cursor.text[cursor.index] ?? '')) {
    cursor.index += 1;
  }
}

function readJsonString(cursor: JsonCursor): string {
  const start = cursor.index;
  if (cursor.text[cursor.index] !== '"') invalidPayload();

  cursor.index += 1;
  while (cursor.index < cursor.text.length) {
    const code = cursor.text.charCodeAt(cursor.index);
    if (code === 0x22) {
      cursor.index += 1;
      return cursor.text.slice(start, cursor.index);
    }
    if (code === 0x5c) {
      cursor.index += 2;
      continue;
    }
    if (code < 0x20) invalidPayload();
    cursor.index += 1;
  }

  invalidPayload();
}

function skipJsonNumber(cursor: JsonCursor): void {
  const rest = cursor.text.slice(cursor.index);
  const match = rest.match(/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/);
  if (!match) invalidPayload();
  cursor.index += match[0].length;
}

function skipJsonLiteral(cursor: JsonCursor): void {
  const rest = cursor.text.slice(cursor.index);
  const literal = ['true', 'false', 'null'].find((candidate) => rest.startsWith(candidate));
  if (!literal) invalidPayload();
  cursor.index += literal.length;
}

function parseJsonValue(cursor: JsonCursor): void {
  skipWhitespace(cursor);
  const character = cursor.text[cursor.index];
  if (character === '"') {
    readJsonString(cursor);
    return;
  }
  if (character === '{') {
    parseJsonObject(cursor);
    return;
  }
  if (character === '[') {
    parseJsonArray(cursor);
    return;
  }
  if (character === '-' || (character !== undefined && /\d/.test(character))) {
    skipJsonNumber(cursor);
    return;
  }
  if (character === 't' || character === 'f' || character === 'n') {
    skipJsonLiteral(cursor);
    return;
  }
  invalidPayload();
}

function parseJsonObject(cursor: JsonCursor): void {
  const keys = new Set<string>();
  cursor.index += 1;
  skipWhitespace(cursor);
  if (cursor.text[cursor.index] === '}') {
    cursor.index += 1;
    return;
  }

  while (cursor.index < cursor.text.length) {
    skipWhitespace(cursor);
    const encodedKey = readJsonString(cursor);
    let key: unknown;
    try {
      key = JSON.parse(encodedKey);
    } catch {
      invalidPayload();
    }
    if (typeof key !== 'string' || keys.has(key)) invalidPayload();
    keys.add(key);

    skipWhitespace(cursor);
    if (cursor.text[cursor.index] !== ':') invalidPayload();
    cursor.index += 1;
    parseJsonValue(cursor);
    skipWhitespace(cursor);
    if (cursor.text[cursor.index] === '}') {
      cursor.index += 1;
      return;
    }
    if (cursor.text[cursor.index] !== ',') invalidPayload();
    cursor.index += 1;
  }

  invalidPayload();
}

function parseJsonArray(cursor: JsonCursor): void {
  cursor.index += 1;
  skipWhitespace(cursor);
  if (cursor.text[cursor.index] === ']') {
    cursor.index += 1;
    return;
  }

  while (cursor.index < cursor.text.length) {
    parseJsonValue(cursor);
    skipWhitespace(cursor);
    if (cursor.text[cursor.index] === ']') {
      cursor.index += 1;
      return;
    }
    if (cursor.text[cursor.index] !== ',') invalidPayload();
    cursor.index += 1;
  }

  invalidPayload();
}

function assertStrictJson(text: string): void {
  const cursor = new JsonCursor(text);
  parseJsonValue(cursor);
  skipWhitespace(cursor);
  if (cursor.index !== text.length) invalidPayload();
}

function decodeBody(rawBody: Buffer): string {
  if (rawBody.length >= 3 && rawBody[0] === 0xef && rawBody[1] === 0xbb && rawBody[2] === 0xbf) {
    invalidPayload();
  }

  try {
    return textDecoder.decode(rawBody);
  } catch {
    invalidPayload();
  }
}

function isCanonicalUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value);
}

function isConfirmedAt(value: unknown, nowSeconds: number, maxAgeSeconds: number): value is string {
  if (typeof value !== 'string' || !CONFIRMED_AT_PATTERN.test(value)) return false;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()) || date.toISOString() !== value) return false;

  const confirmedSeconds = date.getTime() / 1_000;
  return (
    confirmedSeconds >= nowSeconds - maxAgeSeconds && confirmedSeconds <= nowSeconds + maxAgeSeconds
  );
}

function parseClaims(text: string): Record<string, unknown> {
  try {
    assertStrictJson(text);
    const parsed: unknown = JSON.parse(text);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) invalidPayload();

    const claims = parsed as Record<string, unknown>;
    const keys = Object.keys(claims);
    if (keys.length !== CLAIM_KEYS.length || keys.some((key) => !CLAIM_KEY_SET.has(key))) {
      invalidPayload();
    }
    return claims;
  } catch (error) {
    if (error instanceof PixProviderWebhookPayloadValidationError) throw error;
    invalidPayload();
  }
}

function validateClaims(
  claims: Record<string, unknown>,
  authenticatedAccountId: string,
  options: PixProviderWebhookPayloadOptions
): PixProviderWebhookClaims {
  const nowSeconds = options.nowSeconds();
  const maxAgeSeconds = options.maxAgeSeconds ?? DEFAULT_MAX_AGE_SECONDS;
  if (
    !Number.isSafeInteger(nowSeconds) ||
    !Number.isSafeInteger(maxAgeSeconds) ||
    maxAgeSeconds < 0
  ) {
    invalidPayload();
  }

  if (
    claims.type !== 'pix.payment.confirmed.v1' ||
    !isCanonicalUuid(claims.accountId) ||
    !isCanonicalUuid(authenticatedAccountId) ||
    claims.accountId !== authenticatedAccountId ||
    !isCanonicalUuid(claims.attemptId) ||
    typeof claims.providerTransactionId !== 'string' ||
    !PROVIDER_TRANSACTION_ID_PATTERN.test(claims.providerTransactionId) ||
    typeof claims.amountCents !== 'number' ||
    !Number.isSafeInteger(claims.amountCents) ||
    claims.amountCents < 1 ||
    claims.amountCents > MAX_AMOUNT_CENTS ||
    claims.currency !== 'BRL' ||
    !isConfirmedAt(claims.confirmedAt, nowSeconds, maxAgeSeconds)
  ) {
    invalidPayload();
  }

  return {
    type: claims.type,
    accountId: claims.accountId,
    attemptId: claims.attemptId,
    providerTransactionId: claims.providerTransactionId,
    amountCents: claims.amountCents,
    currency: claims.currency,
    confirmedAt: claims.confirmedAt
  };
}

export function parsePixProviderWebhookPayload(
  rawBody: Buffer,
  authenticatedAccountId: string,
  options: PixProviderWebhookPayloadOptions
): PixProviderWebhookClaims {
  if (!Buffer.isBuffer(rawBody)) invalidPayload();
  const text = decodeBody(rawBody);
  const claims = parseClaims(text);
  return validateClaims(claims, authenticatedAccountId, options);
}
