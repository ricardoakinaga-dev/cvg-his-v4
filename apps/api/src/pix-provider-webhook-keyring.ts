import type { PixProviderWebhookKey } from './pix-provider-webhook-verifier.js';

const KEY_ID_PATTERN = /^[A-Za-z0-9_-]{8,128}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

interface ConfiguredKey {
  readonly accountId: string;
  readonly secretBase64: string;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function decodeSecret(value: unknown): Buffer {
  if (typeof value !== 'string' || value.length === 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) {
    throw new Error('PIX_WEBHOOK_KEYRING_JSON contains an invalid secretBase64');
  }
  const decoded = Buffer.from(value, 'base64');
  if (decoded.length < 32 || decoded.toString('base64') !== value) {
    throw new Error('PIX_WEBHOOK_KEYRING_JSON secrets must be canonical base64 of at least 32 bytes');
  }
  return decoded;
}

/**
 * Parse the operator-controlled synthetic webhook keyring without ever
 * returning the raw JSON or logging secret material.
 *
 * Shape: { "key-id": { "accountId": "uuid", "secretBase64": "..." } }
 */
export function parsePixProviderWebhookKeyring(
  value: string | undefined
): ReadonlyMap<string, PixProviderWebhookKey> {
  if (!value) return new Map();

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error('PIX_WEBHOOK_KEYRING_JSON must contain valid JSON');
  }
  if (!isPlainObject(parsed) || Object.keys(parsed).length === 0) {
    throw new Error('PIX_WEBHOOK_KEYRING_JSON must contain at least one key');
  }

  const keyring = new Map<string, PixProviderWebhookKey>();
  for (const [keyId, raw] of Object.entries(parsed)) {
    if (!KEY_ID_PATTERN.test(keyId) || !isPlainObject(raw)) {
      throw new Error('PIX_WEBHOOK_KEYRING_JSON contains an invalid key entry');
    }
    const entryKeys = Object.keys(raw).sort();
    if (entryKeys.length !== 2 || entryKeys[0] !== 'accountId' || entryKeys[1] !== 'secretBase64') {
      throw new Error('PIX_WEBHOOK_KEYRING_JSON contains an invalid key entry');
    }
    const accountId = raw.accountId;
    if (typeof accountId !== 'string' || !UUID_PATTERN.test(accountId)) {
      throw new Error('PIX_WEBHOOK_KEYRING_JSON entries require a canonical accountId');
    }
    const secret = decodeSecret(raw.secretBase64);
    keyring.set(keyId, Object.freeze({ accountId, secret }));
  }
  return keyring;
}
