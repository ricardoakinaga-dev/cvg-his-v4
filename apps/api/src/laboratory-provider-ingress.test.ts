import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import test from 'node:test';

import {
  HmacLaboratoryProviderSignatureVerifier,
  LABORATORY_PROVIDER_MAX_AGE_SECONDS,
  fingerprintLaboratoryProviderPayload,
  parseLaboratoryProviderPayload,
  type LaboratoryProviderPayload
} from './laboratory-provider-ingress.js';

const ACCOUNT_ID = '11111111-1111-4111-8111-111111111111';
const OTHER_ACCOUNT_ID = '22222222-2222-4222-8222-222222222222';
const KEY_ID = 'lab-key-01';
const SECRET = Buffer.alloc(32, 0x42);
const NOW_SECONDS = 1_756_400_000;

function payload(overrides: Partial<LaboratoryProviderPayload> = {}): LaboratoryProviderPayload {
  return {
    schemaVersion: '1',
    provider: 'equipment-bridge',
    externalResultId: 'external-result-001',
    orderId: 'order-001',
    equipmentId: 'equipment-001',
    resultSummary: 'Hemoglobina: 7.2',
    observedAt: '2026-08-29T03:33:20.000Z',
    ...overrides
  };
}

function sign(timestamp: string, rawBody: Buffer): string {
  return `v1=${createHmac('sha256', SECRET)
    .update(Buffer.from(`v1.${timestamp}.`, 'ascii'))
    .update(rawBody)
    .digest('hex')}`;
}

test('parses an exact versioned laboratory provider payload and fingerprints semantic fields', () => {
  const rawBody = Buffer.from(
    JSON.stringify({
      resultSummary: 'Hemoglobina: 7.2',
      observedAt: '2026-08-29T03:33:20.000Z',
      equipmentId: 'equipment-001',
      externalResultId: 'external-result-001',
      provider: 'equipment-bridge',
      orderId: 'order-001',
      schemaVersion: '1'
    })
  );
  const parsed = parseLaboratoryProviderPayload(rawBody);

  assert.deepEqual(parsed, payload());
  assert.match(fingerprintLaboratoryProviderPayload(parsed), /^[0-9a-f]{64}$/);
  assert.equal(
    fingerprintLaboratoryProviderPayload(parsed),
    fingerprintLaboratoryProviderPayload(payload())
  );
});

test('rejects duplicate, unknown, non-string and non-canonical provider fields', () => {
  const cases = [
    '{"schemaVersion":"1","schemaVersion":"1","provider":"equipment-bridge","externalResultId":"external-result-001","orderId":"order-001","equipmentId":"equipment-001","resultSummary":"ok","observedAt":"2026-08-29T03:33:20.000Z"}',
    JSON.stringify({ ...payload(), unexpected: 'field' }),
    JSON.stringify({ ...payload(), equipmentId: 42 }),
    JSON.stringify({ ...payload(), observedAt: '2026-08-29T00:33:20Z' }),
    `\u00a0${JSON.stringify(payload())}`
  ];

  for (const rawBody of cases) {
    assert.throws(() => parseLaboratoryProviderPayload(Buffer.from(rawBody)), {
      name: 'LaboratoryProviderPayloadValidationError'
    });
  }
});

test('verifies account-bound fresh HMAC signatures over the exact raw body', async () => {
  const verifier = new HmacLaboratoryProviderSignatureVerifier(
    new Map([[KEY_ID, { accountId: ACCOUNT_ID, secret: SECRET }]])
  );
  const rawBody = Buffer.from(JSON.stringify(payload()));
  const timestamp = String(NOW_SECONDS);

  await assert.doesNotReject(async () => {
    const result = await verifier.verify({
      keyId: KEY_ID,
      timestamp,
      signature: sign(timestamp, rawBody),
      rawBody,
      nowSeconds: NOW_SECONDS
    });
    assert.deepEqual(result, { accountId: ACCOUNT_ID, keyId: KEY_ID, timestamp: NOW_SECONDS });
  });

  assert.equal(
    await verifier.verify({
      keyId: KEY_ID,
      timestamp,
      signature: sign(timestamp, Buffer.from(`${rawBody.toString('utf8')} `)),
      rawBody,
      nowSeconds: NOW_SECONDS
    }),
    null
  );
  assert.equal(
    await verifier.verify({
      keyId: KEY_ID,
      timestamp: String(NOW_SECONDS - LABORATORY_PROVIDER_MAX_AGE_SECONDS - 1),
      signature: sign(timestamp, rawBody),
      rawBody,
      nowSeconds: NOW_SECONDS
    }),
    null
  );
  assert.equal(
    await verifier.verify({
      keyId: 'unknown-key',
      timestamp,
      signature: sign(timestamp, rawBody),
      rawBody,
      nowSeconds: NOW_SECONDS
    }),
    null
  );
});

test('rejects short secrets, malformed signatures and unsafe timestamps', async () => {
  const verifier = new HmacLaboratoryProviderSignatureVerifier(
    new Map([
      [KEY_ID, { accountId: ACCOUNT_ID, secret: Buffer.alloc(31, 0x42) }],
      ['lab-key-02', { accountId: OTHER_ACCOUNT_ID, secret: SECRET }]
    ])
  );
  const rawBody = Buffer.from(JSON.stringify(payload()));

  assert.equal(
    await verifier.verify({
      keyId: KEY_ID,
      timestamp: String(NOW_SECONDS),
      signature: sign(String(NOW_SECONDS), rawBody),
      rawBody,
      nowSeconds: NOW_SECONDS
    }),
    null
  );
  assert.equal(
    await verifier.verify({
      keyId: 'lab-key-02',
      timestamp: 'not-a-timestamp',
      signature: 'v1=not-a-digest',
      rawBody,
      nowSeconds: NOW_SECONDS
    }),
    null
  );
  assert.equal(
    await verifier.verify({
      keyId: KEY_ID,
      timestamp: String(NOW_SECONDS + LABORATORY_PROVIDER_MAX_AGE_SECONDS + 1),
      signature: sign(String(NOW_SECONDS + LABORATORY_PROVIDER_MAX_AGE_SECONDS + 1), rawBody),
      rawBody,
      nowSeconds: NOW_SECONDS
    }),
    null
  );
});
