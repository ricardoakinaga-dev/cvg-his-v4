import { describe, expect, it } from 'vitest';

import {
  PixProviderWebhookPayloadValidationError,
  parsePixProviderWebhookPayload
} from '../../../apps/api/src/pix-provider-webhook-payload';

const ACCOUNT_ID = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const OTHER_ACCOUNT_ID = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
const ATTEMPT_ID = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
const NOW_SECONDS = 1_756_000_000;
const CONFIRMED_AT = new Date(NOW_SECONDS * 1_000 + 789).toISOString();

const options = {
  nowSeconds: () => NOW_SECONDS
};

function validClaims(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    type: 'pix.payment.confirmed.v1',
    accountId: ACCOUNT_ID,
    attemptId: ATTEMPT_ID,
    providerTransactionId: 'provider.tx_01:confirmed',
    amountCents: 12_345,
    currency: 'BRL',
    confirmedAt: CONFIRMED_AT,
    ...overrides
  };
}

function body(value: unknown): Buffer {
  return Buffer.from(JSON.stringify(value), 'utf8');
}

function expectInvalid(rawBody: Buffer, accountId = ACCOUNT_ID): void {
  expect(() => parsePixProviderWebhookPayload(rawBody, accountId, options)).toThrow(
    PixProviderWebhookPayloadValidationError
  );
}

describe('PIX provider webhook authenticated payload parser', () => {
  it('parses the exact allowlisted claims after authentication', () => {
    const claims = validClaims();

    expect(parsePixProviderWebhookPayload(body(claims), ACCOUNT_ID, options)).toEqual(claims);
  });

  it('rejects invalid UTF-8 and a UTF-8 BOM before JSON parsing', () => {
    expectInvalid(Buffer.from([0xc3, 0x28]));
    expectInvalid(Buffer.from([0xef, 0xbb, 0xbf, ...body(validClaims())]));
  });

  it.each([
    ['an array', []],
    ['null', null],
    ['a string', 'claims'],
    ['a number', 1]
  ])('rejects top-level %s', (_label, value) => {
    expectInvalid(body(value));
  });

  it.each([
    ['truncated JSON', Buffer.from('{"type":"pix.payment.confirmed.v1"', 'utf8')],
    ['trailing data', Buffer.from(`${JSON.stringify(validClaims())} true`, 'utf8')]
  ])('rejects %s', (_label, rawBody) => {
    expectInvalid(rawBody);
  });

  it('rejects duplicate JSON keys instead of relying on JSON.parse last-write-wins behavior', () => {
    const rawBody = Buffer.from(
      `{"type":"pix.payment.confirmed.v1","accountId":"${ACCOUNT_ID}","accountId":"${OTHER_ACCOUNT_ID}","attemptId":"${ATTEMPT_ID}","providerTransactionId":"provider.tx_01:confirmed","amountCents":12345,"currency":"BRL","confirmedAt":"${CONFIRMED_AT}"}`,
      'utf8'
    );

    expectInvalid(rawBody);
  });

  it.each([
    ['missing type', { type: undefined }],
    ['missing account', { accountId: undefined }],
    ['missing attempt', { attemptId: undefined }],
    ['missing provider transaction', { providerTransactionId: undefined }],
    ['missing amount', { amountCents: undefined }],
    ['missing currency', { currency: undefined }],
    ['missing confirmation time', { confirmedAt: undefined }],
    ['unknown field', { unexpected: 'nope' }]
  ])('rejects an allowlist violation: %s', (_label, override) => {
    const claims = validClaims();
    if ('unexpected' in override) {
      Object.assign(claims, override);
    } else {
      delete claims[Object.keys(override)[0] as string];
    }

    expectInvalid(body(claims));
  });

  it('rejects an account claim that differs from the authenticated key account', () => {
    expectInvalid(body(validClaims({ accountId: OTHER_ACCOUNT_ID })));
  });

  it.each([
    ['uppercase account UUID', { accountId: ACCOUNT_ID.toUpperCase() }],
    ['non-canonical account UUID', { accountId: ACCOUNT_ID.replaceAll('-', '') }],
    ['uppercase attempt UUID', { attemptId: ATTEMPT_ID.toUpperCase() }],
    ['wrong attempt UUID version', { attemptId: 'cccccccc-cccc-6ccc-8ccc-cccccccccccc' }],
    ['wrong attempt UUID variant', { attemptId: 'cccccccc-cccc-4ccc-cccc-cccccccccccc' }]
  ])('rejects %s', (_label, override) => {
    expectInvalid(body(validClaims(override)));
  });

  it.each([
    ['empty provider id', ''],
    ['leading punctuation', '-provider'],
    ['non-ASCII provider id', 'provedor-ação'],
    ['oversized provider id', 'x'.repeat(256)]
  ])('rejects %s', (_label, providerTransactionId) => {
    expectInvalid(body(validClaims({ providerTransactionId })));
  });

  it.each([
    ['zero', 0],
    ['negative', -1],
    ['fractional', 12.5],
    ['unsafe integer', Number.MAX_SAFE_INTEGER + 1],
    ['too large for the protocol', 1_000_000_000_000],
    ['string', '12345']
  ])('rejects %s amountCents', (_label, amountCents) => {
    expectInvalid(body(validClaims({ amountCents })));
  });

  it.each([
    ['wrong type', { type: 'pix.payment.confirmed.v2' }],
    ['wrong currency', { currency: 'USD' }]
  ])('rejects %s', (_label, override) => {
    expectInvalid(body(validClaims(override)));
  });

  it.each([
    ['missing milliseconds', CONFIRMED_AT.replace('.789Z', 'Z')],
    ['non-UTC offset', CONFIRMED_AT.replace('Z', '+00:00')],
    ['invalid calendar date', '2026-02-30T12:34:56.789Z'],
    ['too old', new Date((NOW_SECONDS - 301) * 1_000).toISOString()],
    ['too new', new Date((NOW_SECONDS + 301) * 1_000).toISOString()]
  ])('rejects %s confirmedAt', (_label, confirmedAt) => {
    expectInvalid(body(validClaims({ confirmedAt })));
  });

  it('accepts both inclusive five-minute confirmedAt boundaries', () => {
    const oldBoundary = new Date((NOW_SECONDS - 300) * 1_000).toISOString();
    const newBoundary = new Date((NOW_SECONDS + 300) * 1_000).toISOString();

    expect(
      parsePixProviderWebhookPayload(
        body(validClaims({ confirmedAt: oldBoundary })),
        ACCOUNT_ID,
        options
      )
    ).toMatchObject({ confirmedAt: oldBoundary });
    expect(
      parsePixProviderWebhookPayload(
        body(validClaims({ confirmedAt: newBoundary })),
        ACCOUNT_ID,
        options
      )
    ).toMatchObject({ confirmedAt: newBoundary });
  });
});
