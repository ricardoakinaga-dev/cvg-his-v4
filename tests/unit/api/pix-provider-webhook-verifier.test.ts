import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { IncomingHttpHeaders } from 'node:http';
import { describe, expect, it, vi } from 'vitest';

import {
  PixProviderWebhookAuthenticationError,
  verifyPixProviderWebhook
} from '../../../apps/api/src/pix-provider-webhook-verifier';

const ACCOUNT_ID = '11111111-1111-4111-8111-111111111111';
const SECRET = randomBytes(32);
const KEY_ID = 'local-pix-key-01';
const EVENT_ID = 'evt_01J8PX7Y4C:synthetic';
const NOW = 1_756_000_000;

function sign(rawBody: Buffer, timestamp = NOW, eventId = EVENT_ID, secret = SECRET): string {
  const message = Buffer.concat([Buffer.from(`v1.${timestamp}.${eventId}.`, 'ascii'), rawBody]);
  return `v1=${createHmac('sha256', secret).update(message).digest('hex')}`;
}

function headers(
  rawBody: Buffer,
  overrides: Partial<IncomingHttpHeaders> = {},
  timestamp = NOW,
  eventId = EVENT_ID
): IncomingHttpHeaders {
  return {
    'content-type': 'application/json',
    'content-encoding': 'identity',
    'x-cvg-pix-key-id': KEY_ID,
    'x-cvg-pix-timestamp': String(timestamp),
    'x-cvg-pix-event-id': eventId,
    'x-cvg-pix-signature': sign(rawBody, timestamp, eventId),
    ...overrides
  };
}

const options = {
  nowSeconds: () => NOW,
  keyring: new Map([[KEY_ID, { accountId: ACCOUNT_ID, secret: SECRET }]])
};

describe('PIX synthetic provider webhook verifier', () => {
  it('authenticates the exact raw bytes without JSON reserialization', () => {
    const rawBody = Buffer.from('{"type":"pix.payment.confirmed.v1", "unicode":"café"}\n', 'utf8');

    expect(verifyPixProviderWebhook({ headers: headers(rawBody), rawBody }, options)).toEqual({
      accountId: ACCOUNT_ID,
      keyId: KEY_ID,
      eventId: EVENT_ID,
      timestamp: NOW
    });
  });

  it('rejects a signature generated from a normalized body, even when the JSON is equivalent', () => {
    const rawBody = Buffer.from('{"a":1,"b":"x"}', 'utf8');
    const normalizedBody = Buffer.from('{"a": 1, "b": "x"}', 'utf8');
    const requestHeaders = headers(rawBody, {
      'x-cvg-pix-signature': sign(normalizedBody)
    });

    expect(() => verifyPixProviderWebhook({ headers: requestHeaders, rawBody }, options)).toThrow(
      PixProviderWebhookAuthenticationError
    );
  });

  it.each([
    ['too old', NOW - 301],
    ['too new', NOW + 301]
  ])('rejects timestamps %s outside the inclusive five-minute window', (_label, timestamp) => {
    const rawBody = Buffer.from('{}', 'utf8');
    expect(() =>
      verifyPixProviderWebhook({ headers: headers(rawBody, {}, timestamp), rawBody }, options)
    ).toThrow(PixProviderWebhookAuthenticationError);
  });

  it('accepts both exact freshness boundaries', () => {
    const rawBody = Buffer.from('{}', 'utf8');
    expect(
      verifyPixProviderWebhook({ headers: headers(rawBody, {}, NOW - 300), rawBody }, options)
        .timestamp
    ).toBe(NOW - 300);
    expect(
      verifyPixProviderWebhook({ headers: headers(rawBody, {}, NOW + 300), rawBody }, options)
        .timestamp
    ).toBe(NOW + 300);
  });

  it.each([Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, -1, Number.MAX_SAFE_INTEGER + 1])(
    'rejects an invalid maxAgeSeconds override: %s',
    (maxAgeSeconds) => {
      const rawBody = Buffer.from('{}', 'utf8');
      expect(() =>
        verifyPixProviderWebhook(
          { headers: headers(rawBody), rawBody },
          { ...options, maxAgeSeconds }
        )
      ).toThrow(PixProviderWebhookAuthenticationError);
    }
  );

  it.each([
    ['x-cvg-pix-key-id', [KEY_ID, KEY_ID]],
    ['x-cvg-pix-timestamp', [String(NOW), String(NOW)]],
    ['x-cvg-pix-event-id', [EVENT_ID, EVENT_ID]],
    ['x-cvg-pix-signature', [sign(Buffer.from('{}')), sign(Buffer.from('{}'))]],
    ['content-type', ['application/json', 'application/json']]
  ] as const)('rejects duplicated critical header %s', (name, value) => {
    const rawBody = Buffer.from('{}', 'utf8');
    expect(() =>
      verifyPixProviderWebhook({ headers: headers(rawBody, { [name]: value }), rawBody }, options)
    ).toThrow(PixProviderWebhookAuthenticationError);
  });

  it('rejects a one-element array representation of a critical header', () => {
    const rawBody = Buffer.from('{}', 'utf8');
    expect(() =>
      verifyPixProviderWebhook(
        { headers: headers(rawBody, { 'x-cvg-pix-signature': [sign(rawBody)] }), rawBody },
        options
      )
    ).toThrow(PixProviderWebhookAuthenticationError);
  });

  it.each([
    ['missing key', { 'x-cvg-pix-key-id': undefined }],
    ['malformed key', { 'x-cvg-pix-key-id': 'bad key' }],
    ['unknown key', { 'x-cvg-pix-key-id': 'unknown-key-01' }],
    ['malformed timestamp', { 'x-cvg-pix-timestamp': '1756000000 ' }],
    ['malformed signature', { 'x-cvg-pix-signature': 'v1=not-hex' }],
    ['wrong encoding', { 'content-encoding': 'gzip' }],
    ['wrong content type', { 'content-type': 'application/json; charset=utf-8' }]
  ] as const)('returns the same authentication failure for %s', (_label, override) => {
    const rawBody = Buffer.from('{}', 'utf8');
    expect(() =>
      verifyPixProviderWebhook({ headers: headers(rawBody, override), rawBody }, options)
    ).toThrow(PixProviderWebhookAuthenticationError);
  });

  it('keeps unknown-key signatures on the fixed 32-byte comparison path', () => {
    const compareDigests = vi.fn((expected: Buffer, supplied: Buffer) =>
      timingSafeEqual(expected, supplied)
    );
    const rawBody = Buffer.from('{}', 'utf8');

    expect(() =>
      verifyPixProviderWebhook(
        {
          headers: headers(rawBody, { 'x-cvg-pix-key-id': 'unknown-key-01' }),
          rawBody
        },
        { ...options, compareDigests }
      )
    ).toThrow(PixProviderWebhookAuthenticationError);

    expect(compareDigests).toHaveBeenCalledOnce();
    expect(compareDigests.mock.calls[0]?.[0]).toHaveLength(32);
    expect(compareDigests.mock.calls[0]?.[1]).toHaveLength(32);
  });

  it('binds the authenticated account to the keyring entry and never trusts body/query tenant claims', () => {
    const rawBody = Buffer.from('{"accountId":"22222222-2222-4222-8222-222222222222"}', 'utf8');
    const result = verifyPixProviderWebhook(
      {
        headers: headers(rawBody),
        rawBody,
        queryAccountId: '22222222-2222-4222-8222-222222222222'
      },
      options
    );

    expect(result.accountId).toBe(ACCOUNT_ID);
  });
});
