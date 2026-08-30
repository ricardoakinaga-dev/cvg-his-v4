import assert from 'node:assert/strict';
import test from 'node:test';

import { parseLaboratoryProviderKeyring } from './laboratory-provider-keyring.js';

const ACCOUNT_ID = '11111111-1111-4111-8111-111111111111';
const SECRET_BASE64 = Buffer.alloc(32, 0x42).toString('base64');

test('parses canonical account-bound laboratory provider keyrings without exposing JSON', () => {
  const keyring = parseLaboratoryProviderKeyring(
    JSON.stringify({ lab_key_01: { accountId: ACCOUNT_ID, secretBase64: SECRET_BASE64 } })
  );
  const key = keyring.get('lab_key_01');
  assert.ok(key);
  assert.equal(key.accountId, ACCOUNT_ID);
  assert.deepEqual(key.secret, Buffer.alloc(32, 0x42));
});

test('rejects malformed laboratory provider keyrings and weak secrets', () => {
  const malformed = [
    '{',
    JSON.stringify({ 'bad key': { accountId: ACCOUNT_ID, secretBase64: SECRET_BASE64 } }),
    JSON.stringify({ lab_key_01: { accountId: 'not-a-uuid', secretBase64: SECRET_BASE64 } }),
    JSON.stringify({ lab_key_01: { accountId: ACCOUNT_ID, secretBase64: 'not-base64' } }),
    JSON.stringify({ lab_key_01: { accountId: ACCOUNT_ID, secretBase64: Buffer.alloc(31).toString('base64') } }),
    JSON.stringify({ lab_key_01: { accountId: ACCOUNT_ID, secretBase64: SECRET_BASE64, extra: true } })
  ];
  for (const value of malformed) {
    assert.throws(() => parseLaboratoryProviderKeyring(value), /LABORATORY_PROVIDER_KEYRING_JSON/);
  }
  assert.deepEqual(parseLaboratoryProviderKeyring(undefined), new Map());
});
