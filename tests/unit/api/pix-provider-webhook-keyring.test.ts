import { describe, expect, it } from 'vitest';

import { parsePixProviderWebhookKeyring } from '../../../apps/api/src/pix-provider-webhook-keyring.js';

const ACCOUNT_ID = '11111111-1111-4111-8111-111111111111';
const SECRET_BASE64 = Buffer.alloc(32, 0x42).toString('base64');

describe('PIX provider webhook keyring', () => {
  it('parses account-bound canonical base64 secrets without exposing the JSON shape', () => {
    const keyring = parsePixProviderWebhookKeyring(
      JSON.stringify({ local_key_01: { accountId: ACCOUNT_ID, secretBase64: SECRET_BASE64 } })
    );

    expect(keyring.get('local_key_01')).toEqual({
      accountId: ACCOUNT_ID,
      secret: Buffer.alloc(32, 0x42)
    });
  });

  it('returns an empty keyring only when unset', () => {
    expect(parsePixProviderWebhookKeyring(undefined).size).toBe(0);
  });

  it.each([
    ['invalid json', '{'],
    ['empty object', '{}'],
    ['invalid key id', JSON.stringify({ bad: { accountId: ACCOUNT_ID, secretBase64: SECRET_BASE64 } })],
    ['invalid account', JSON.stringify({ local_key_01: { accountId: 'not-uuid', secretBase64: SECRET_BASE64 } })],
    ['short secret', JSON.stringify({ local_key_01: { accountId: ACCOUNT_ID, secretBase64: Buffer.alloc(16).toString('base64') } })],
    ['non-canonical base64', JSON.stringify({ local_key_01: { accountId: ACCOUNT_ID, secretBase64: `${SECRET_BASE64} ` } })],
    ['extra entry property', JSON.stringify({ local_key_01: { accountId: ACCOUNT_ID, secretBase64: SECRET_BASE64, purpose: 'settlement' } })]
  ])('rejects %s', (_label, value) => {
    expect(() => parsePixProviderWebhookKeyring(value)).toThrow(/PIX_WEBHOOK_KEYRING_JSON/);
  });

  it('rejects a non-string secret instead of deriving a fallback', () => {
    expect(() =>
      parsePixProviderWebhookKeyring(
        JSON.stringify({ local_key_01: { accountId: ACCOUNT_ID, secretBase64: 42 } })
      )
    ).toThrow();
  });
});
