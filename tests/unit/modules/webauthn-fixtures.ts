import { createHash, generateKeyPairSync, randomBytes, sign, type KeyObject } from 'node:crypto';

function base64url(value: Uint8Array): string {
  return Buffer.from(value).toString('base64url');
}

type CborValue = number | string | Uint8Array | Record<string, never>;

function encodeCborLength(majorType: number, length: number): Buffer {
  if (length < 24) return Buffer.from([(majorType << 5) | length]);
  if (length < 256) return Buffer.from([(majorType << 5) | 24, length]);
  if (length < 65536) {
    const result = Buffer.alloc(3);
    result[0] = (majorType << 5) | 25;
    result.writeUInt16BE(length, 1);
    return result;
  }
  throw new Error('fixture value is too large for the minimal CBOR encoder');
}

function encodeCbor(value: CborValue): Buffer {
  if (typeof value === 'number') {
    if (!Number.isInteger(value)) throw new Error('fixture number must be an integer');
    if (value >= 0) {
      const header = encodeCborLength(0, value);
      if (value < 24) return header;
      const bytes = value < 256 ? 1 : 2;
      const result = Buffer.alloc(header.length + bytes);
      header.copy(result);
      if (bytes === 1) result.writeUInt8(value, header.length);
      else result.writeUInt16BE(value, header.length);
      return result;
    }
    const header = encodeCborLength(1, -1 - value);
    if (value >= -24) return header;
    const absolute = -1 - value;
    const bytes = absolute < 256 ? 1 : 2;
    const result = Buffer.alloc(header.length + bytes);
    header.copy(result);
    if (bytes === 1) result.writeUInt8(absolute, header.length);
    else result.writeUInt16BE(absolute, header.length);
    return result;
  }

  if (typeof value === 'string') {
    const bytes = Buffer.from(value, 'utf8');
    return Buffer.concat([encodeCborLength(3, bytes.length), bytes]);
  }

  if (value instanceof Uint8Array) {
    const bytes = Buffer.from(value);
    return Buffer.concat([encodeCborLength(2, bytes.length), bytes]);
  }

  const entries = Object.entries(value);
  return Buffer.concat([
    encodeCborLength(5, entries.length),
    ...entries.flatMap(([key, entryValue]) => [encodeCbor(key), encodeCbor(entryValue)])
  ]);
}

function encodeCborMap(entries: ReadonlyArray<readonly [number | string, CborValue]>): Buffer {
  return Buffer.concat([
    encodeCborLength(5, entries.length),
    ...entries.flatMap(([key, value]) => [encodeCbor(key), encodeCbor(value)])
  ]);
}

function sha256(value: Uint8Array): Buffer {
  return createHash('sha256').update(value).digest();
}

export interface WebAuthnFixture {
  readonly credentialId: string;
  readonly privateKey: KeyObject;
  readonly registration: {
    credentialId: string;
    attestationObject: string;
    clientDataJSON: string;
  };
}

export function createWebAuthnRegistrationFixture(input: {
  readonly rpId: string;
  readonly origin: string;
  readonly challenge: string;
  readonly counter?: number;
}): WebAuthnFixture {
  const { privateKey, publicKey } = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const jwk = publicKey.export({ format: 'jwk' }) as JsonWebKey & { x: string; y: string };
  const credentialBytes = Buffer.concat([
    Buffer.from('cvg-fixture-credential-', 'utf8'),
    randomBytes(12)
  ]);
  const credentialId = base64url(credentialBytes);
  const coseKey = encodeCborMap([
    [1, 2],
    [3, -7],
    [-1, 1],
    [-2, Buffer.from(jwk.x, 'base64url')],
    [-3, Buffer.from(jwk.y, 'base64url')]
  ]);
  const counter = input.counter ?? 0;
  const authenticatorData = Buffer.concat([
    sha256(Buffer.from(input.rpId, 'utf8')),
    Buffer.from([0x45]),
    (() => {
      const bytes = Buffer.alloc(4);
      bytes.writeUInt32BE(counter, 0);
      return bytes;
    })(),
    Buffer.alloc(16),
    (() => {
      const bytes = Buffer.alloc(2);
      bytes.writeUInt16BE(credentialBytes.length, 0);
      return bytes;
    })(),
    credentialBytes,
    coseKey
  ]);
  const clientDataJSON = Buffer.from(
    JSON.stringify({
      type: 'webauthn.create',
      challenge: input.challenge,
      origin: input.origin,
      crossOrigin: false
    }),
    'utf8'
  );
  const attestationObject = encodeCborMap([
    ['fmt', 'none'],
    ['attStmt', {}],
    ['authData', authenticatorData]
  ]);

  return {
    credentialId,
    privateKey,
    registration: {
      credentialId,
      attestationObject: base64url(attestationObject),
      clientDataJSON: base64url(clientDataJSON)
    }
  };
}

export function createWebAuthnAssertionFixture(input: {
  readonly rpId: string;
  readonly origin: string;
  readonly challenge: string;
  readonly privateKey: KeyObject;
  readonly counter: number;
  readonly userHandle?: string;
}): {
  authenticatorData: string;
  clientDataJSON: string;
  signature: string;
  userHandle?: string;
} {
  const authenticatorData = Buffer.concat([
    sha256(Buffer.from(input.rpId, 'utf8')),
    Buffer.from([0x05]),
    (() => {
      const bytes = Buffer.alloc(4);
      bytes.writeUInt32BE(input.counter, 0);
      return bytes;
    })()
  ]);
  const clientDataJSON = Buffer.from(
    JSON.stringify({
      type: 'webauthn.get',
      challenge: input.challenge,
      origin: input.origin,
      crossOrigin: false
    }),
    'utf8'
  );
  const signature = sign(
    'sha256',
    Buffer.concat([authenticatorData, sha256(clientDataJSON)]),
    input.privateKey
  );

  return {
    authenticatorData: base64url(authenticatorData),
    clientDataJSON: base64url(clientDataJSON),
    signature: base64url(signature),
    ...(input.userHandle ? { userHandle: input.userHandle } : {})
  };
}
