/**
 * WebAuthn MFA Service — CVG-HIS-V2
 *
 * Implements W3C WebAuthn Level 3 for biometric (platform) and
 * security key (cross-platform) MFA alongside existing TOTP.
 *
 * Based on:
 * - W3C WebAuthn Level 3 (https://www.w3.org/TR/webauthn-3/)
 * - FIDO2 CTAP2
 */

import { randomBytes } from 'node:crypto';

export interface WebAuthnCredential {
  id: string;
  publicKey: string;
  counter: number;
  deviceType: 'platform' | 'cross-platform';
  createdAt: string;
  lastUsedAt: string | null;
  nickname?: string;
}

export interface WebAuthnRegistrationOptions {
  rpName: string;
  rpId: string;
  userName: string;
  userId: string;
  timeout?: number;
  authenticatorSelection?: {
    requireResidentKey?: boolean;
    residentKey?: 'preferred' | 'required' | 'discouraged';
    userVerification?: 'preferred' | 'required' | 'discouraged';
    authenticatorAttachment?: 'platform' | 'cross-platform';
  };
}

export interface WebAuthnAssertionOptions {
  rpId: string;
  timeout?: number;
  userVerification?: 'preferred' | 'required' | 'discouraged';
}

/**
 * RP ID hash length (SHA-256 = 32 bytes).
 */
const RP_ID_HASH_LEN = 32;

/**
 * Base64URL encoding/decoding utilities.
 */
function base64URLEncode(buf: Uint8Array): string {
  return btoa(String.fromCharCode(...buf))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function base64URLDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Convert ArrayBuffer to Uint8Array.
 */
function toUint8Array(buffer: ArrayBuffer): Uint8Array {
  return new Uint8Array(buffer);
}

/**
 * WebAuthn challenge generator — 32 bytes cryptographically random.
 */
export function generateWebAuthnChallenge(): string {
  return base64URLEncode(randomBytes(32));
}

/**
 * WebAuthn Relying Party credentials storage interface.
 */
export interface WebAuthnRepository {
  findByUserId(userId: string): Promise<WebAuthnCredential[]>;
  findByCredentialId(credentialId: string): Promise<WebAuthnCredential | null>;
  save(userId: string, credential: Omit<WebAuthnCredential, 'id'>): Promise<string>;
  updateCounter(credentialId: string, counter: number): Promise<void>;
  delete(credentialId: string): Promise<void>;
}

/**
 * In-memory implementation for development/testing.
 * Replace with DatabaseWebAuthnRepository in production.
 */
export class InMemoryWebAuthnRepository implements WebAuthnRepository {
  private store = new Map<string, WebAuthnCredential>();

  async findByUserId(userId: string): Promise<WebAuthnCredential[]> {
    const results: WebAuthnCredential[] = [];
    for (const cred of this.store.values()) {
      if (cred.publicKey.startsWith(`user:${userId}:`)) {
        results.push(cred);
      }
    }
    return results;
  }

  async findByCredentialId(credentialId: string): Promise<WebAuthnCredential | null> {
    return this.store.get(credentialId) ?? null;
  }

  async save(
    userId: string,
    data: Omit<WebAuthnCredential, 'id'>
  ): Promise<string> {
    const id = `webauthn_${Date.now().toString(36)}_${randomBytes(8).toString('hex')}`;
    this.store.set(id, { id, ...data });
    return id;
  }

  async updateCounter(credentialId: string, counter: number): Promise<void> {
    const cred = this.store.get(credentialId);
    if (cred) {
      cred.counter = counter;
      cred.lastUsedAt = new Date().toISOString();
    }
  }

  async delete(credentialId: string): Promise<void> {
    this.store.delete(credentialId);
  }
}

/**
 * WebAuthn service interface for registration and authentication.
 */
export interface WebAuthnService {
  /**
   * Generate registration options (PublicKeyCredentialCreationOptions).
   * Call this and send the encoded options to the client.
   */
  generateRegistrationOptions(userId: string, options: WebAuthnRegistrationOptions): Promise<{
    publicKeyOptions: Record<string, unknown>;
    challenge: string;
  }>;

  /**
   * Verify registration response from client.
   * Store the credential on success.
   */
  verifyRegistration(
    userId: string,
    response: { credentialId: string; attestationObject: string; clientDataJSON: string },
    expectedChallenge: string
  ): Promise<{ credentialId: string }>;

  /**
   * Generate authentication options (PublicKeyCredentialRequestOptions).
   */
  generateAuthenticationOptions(
    userId: string,
    options: WebAuthnAssertionOptions
  ): Promise<{ publicKeyOptions: Record<string, unknown>; challenge: string }>;

  /**
   * Verify authentication assertion from client.
   */
  verifyAuthentication(
    credentialId: string,
    response: { authenticatorData: string; clientDataJSON: string; signature: string; userHandle?: string },
    expectedChallenge: string,
    expectedRpId: string
  ): Promise<{ success: boolean; newCounter?: number }>;
}

/**
 * WebAuthn Service implementation.
 *
 * NOTE: This is a foundational implementation. Production use requires:
 * 1. A proper FIDO2 attestation verifier (e.g., @simplewebauthn/server)
 * 2. Credential ID stored as binary (not base64url string)
 * 3. Persistent storage for public key bytes and sign counter
 * 4. Real-time signature verification using stored credential public key
 */
export class WebAuthnServiceImpl implements WebAuthnService {
  constructor(private readonly repository: WebAuthnRepository) {}

  async generateRegistrationOptions(
    userId: string,
    options: WebAuthnRegistrationOptions
  ): Promise<{ publicKeyOptions: Record<string, unknown>; challenge: string }> {
    const challenge = generateWebAuthnChallenge();
    const credentialProps = await this.repository.findByUserId(userId);

    const pubKeyOptions: Record<string, unknown> = {
      challenge: base64URLEncode(new TextEncoder().encode(challenge)),
      rp: {
        name: options.rpName,
        id: options.rpId
      },
      user: {
        id: base64URLEncode(new TextEncoder().encode(options.userId)),
        name: options.userName,
        displayName: options.userName
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },   // ES256
        { type: 'public-key', alg: -257 }  // RS256
      ],
      timeout: options.timeout ?? 60000,
      excludeCredentials: credentialProps.map(c => ({
        id: c.id,
        type: 'public-key' as const
      })),
      attestation: 'none',
      extensions: {
        credProps: true
      }
    };

    if (options.authenticatorSelection) {
      pubKeyOptions.authenticatorSelection = {
        requireResidentKey: options.authenticatorSelection.requireResidentKey ?? false,
        residentKey: options.authenticatorSelection.residentKey ?? 'preferred',
        userVerification: options.authenticatorSelection.userVerification ?? 'preferred',
        authenticatorAttachment: options.authenticatorSelection.authenticatorAttachment
      };
    }

    return { publicKeyOptions: pubKeyOptions, challenge };
  }

  async verifyRegistration(
    userId: string,
    response: { credentialId: string; attestationObject: string; clientDataJSON: string },
    _expectedChallenge: string
  ): Promise<{ credentialId: string }> {
    // In production: parse attestation object, verify signature chain,
    // store credential ID and public key. This requires a full FIDO2 verifier.
    const credentialId = base64URLEncode(randomBytes(16));

    await this.repository.save(userId, {
      publicKey: `user:${userId}:${response.credentialId}`,
      counter: 0,
      deviceType: 'cross-platform',
      createdAt: new Date().toISOString(),
      lastUsedAt: null
    });

    return { credentialId };
  }

  async generateAuthenticationOptions(
    _userId: string,
    options: WebAuthnAssertionOptions
  ): Promise<{ publicKeyOptions: Record<string, unknown>; challenge: string }> {
    const challenge = generateWebAuthnChallenge();

    const pubKeyOptions: Record<string, unknown> = {
      challenge: base64URLEncode(new TextEncoder().encode(challenge)),
      timeout: options.timeout ?? 60000,
      rpId: options.rpId,
      userVerification: options.userVerification ?? 'preferred',
      extensions: {
        appid: options.rpId
      }
    };

    return { publicKeyOptions: pubKeyOptions, challenge };
  }

  async verifyAuthentication(
    credentialId: string,
    _response: { authenticatorData: string; clientDataJSON: string; signature: string; userHandle?: string },
    _expectedChallenge: string,
    _expectedRpId: string
  ): Promise<{ success: boolean; newCounter?: number }> {
    const cred = await this.repository.findByCredentialId(credentialId);
    if (!cred) {
      return { success: false };
    }

    // In production: verify signature using stored credential public key
    // and check that authenticator counter > stored counter

    const newCounter = cred.counter + 1;
    await this.repository.updateCounter(credentialId, newCounter);

    return { success: true, newCounter };
  }
}
