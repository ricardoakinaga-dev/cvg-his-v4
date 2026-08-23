import { createHash } from 'node:crypto';

import type { PixProviderWebhookClaims } from './pix-provider-webhook-payload.js';

const RAW_BODY_DOMAIN = Buffer.from('cvg.pix.raw-body.v1', 'utf8');
const CLAIMS_DOMAIN = Buffer.from('cvg.pix.claims.v1', 'utf8');
const DOMAIN_SEPARATOR = Buffer.of(0);

export function canonicalizePixProviderWebhookClaims(claims: PixProviderWebhookClaims): string {
  return JSON.stringify({
    type: claims.type,
    accountId: claims.accountId,
    attemptId: claims.attemptId,
    providerTransactionId: claims.providerTransactionId,
    amountCents: claims.amountCents,
    currency: claims.currency,
    confirmedAt: claims.confirmedAt
  });
}

export function fingerprintPixProviderWebhookBody(rawBody: Buffer): string {
  return createHash('sha256')
    .update(RAW_BODY_DOMAIN)
    .update(DOMAIN_SEPARATOR)
    .update(rawBody)
    .digest('hex');
}

export function fingerprintPixProviderWebhookClaims(claims: PixProviderWebhookClaims): string {
  return createHash('sha256')
    .update(CLAIMS_DOMAIN)
    .update(DOMAIN_SEPARATOR)
    .update(canonicalizePixProviderWebhookClaims(claims), 'utf8')
    .digest('hex');
}
