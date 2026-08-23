import { describe, expect, it } from 'vitest';

import {
  canonicalizePixProviderWebhookClaims,
  fingerprintPixProviderWebhookBody,
  fingerprintPixProviderWebhookClaims
} from '../../../apps/api/src/pix-provider-event-fingerprints.js';
import type { PixProviderWebhookClaims } from '../../../apps/api/src/pix-provider-webhook-payload.js';

const claims: PixProviderWebhookClaims = {
  type: 'pix.payment.confirmed.v1',
  accountId: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  attemptId: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  providerTransactionId: 'provider.tx_01:confirmed',
  amountCents: 12_345,
  currency: 'BRL',
  confirmedAt: '2025-08-22T12:26:40.789Z'
};

const rawBody = Buffer.from(
  '{"type":"pix.payment.confirmed.v1","accountId":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","attemptId":"cccccccc-cccc-4ccc-8ccc-cccccccccccc","providerTransactionId":"provider.tx_01:confirmed","amountCents":12345,"currency":"BRL","confirmedAt":"2025-08-22T12:26:40.789Z"}',
  'utf8'
);

describe('PIX provider event fingerprints', () => {
  it('canonicalizes claims in the frozen protocol key order without whitespace', () => {
    expect(canonicalizePixProviderWebhookClaims(claims)).toBe(
      '{"type":"pix.payment.confirmed.v1","accountId":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","attemptId":"cccccccc-cccc-4ccc-8ccc-cccccccccccc","providerTransactionId":"provider.tx_01:confirmed","amountCents":12345,"currency":"BRL","confirmedAt":"2025-08-22T12:26:40.789Z"}'
    );
  });

  it('matches the domain-separated raw-body SHA-256 vector', () => {
    expect(fingerprintPixProviderWebhookBody(rawBody)).toBe(
      'bf6e178bf14ee6f6617e73b7a5b91e2486d4fba4c4a916f0e917c5ebca7d2042'
    );
  });

  it('matches the domain-separated canonical-claims SHA-256 vector', () => {
    expect(fingerprintPixProviderWebhookClaims(claims)).toBe(
      'a655846c2310f2f87809089e863aeaa2a4138a0ba66ff677b53aa305b8fb339c'
    );
  });

  it('keeps raw-body and claims identity separate', () => {
    const whitespaceVariant = Buffer.from(` ${rawBody.toString('utf8')}\n`, 'utf8');
    expect(fingerprintPixProviderWebhookBody(whitespaceVariant)).not.toBe(
      fingerprintPixProviderWebhookBody(rawBody)
    );
    expect(fingerprintPixProviderWebhookClaims(claims)).toBe(
      fingerprintPixProviderWebhookClaims({ ...claims })
    );
  });
});
