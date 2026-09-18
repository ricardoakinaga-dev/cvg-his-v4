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

import {
  generateAuthenticationOptions as generateAuthenticationOptionsWithLibrary,
  generateRegistrationOptions as generateRegistrationOptionsWithLibrary,
  verifyAuthenticationResponse,
  verifyRegistrationResponse
} from '@simplewebauthn/server';
import type { AuthenticationResponseJSON, RegistrationResponseJSON } from '@simplewebauthn/server';
import { randomBytes } from 'node:crypto';

export interface WebAuthnCredential {
  id: string;
  accountId: string;
  userId: string;
  publicKey: string;
  counter: number;
  deviceType: 'platform' | 'cross-platform';
  createdAt: string;
  lastUsedAt: string | null;
  nickname?: string;
}

export type WebAuthnCredentialInput = Omit<WebAuthnCredential, 'id' | 'accountId' | 'userId'> & {
  id?: string;
};

export interface WebAuthnVerifierConfig {
  /** Authoritative RP ID. It must never be taken from an HTTP request header. */
  readonly rpId: string;
  /** Browser origins accepted during registration and assertion verification. */
  readonly origins: readonly string[];
  /** Whether the authenticator must prove local user verification (UV). */
  readonly requireUserVerification?: boolean;
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
 * Base64URL encoding/decoding utilities.
 */
function base64URLEncode(buf: Uint8Array): string {
  return Buffer.from(buf).toString('base64url');
}

function base64URLDecode(str: string): Uint8Array<ArrayBuffer> {
  if (!/^[A-Za-z0-9_-]+$/.test(str) || str.length % 4 === 1) {
    throw new Error('WebAuthn binary value must be base64url encoded');
  }
  const decoded = Buffer.from(str, 'base64url');
  const result = new Uint8Array(decoded.length);
  result.set(decoded);
  return result as Uint8Array<ArrayBuffer>;
}

/**
 * WebAuthn challenge generator — 32 bytes cryptographically random.
 */
export function generateWebAuthnChallenge(): string {
  return base64URLEncode(randomBytes(32));
}

export type WebAuthnChallengePurpose = 'registration' | 'authentication';

export interface WebAuthnChallengeKey {
  readonly accountId: string;
  readonly userId: string;
  readonly purpose: WebAuthnChallengePurpose;
}

export interface IssueWebAuthnChallengeInput {
  readonly key: WebAuthnChallengeKey;
  readonly challenge: string;
  readonly ttlMs: number;
}

export type WebAuthnChallengeConsumeResult =
  | { readonly ok: true; readonly challenge: string }
  | {
      readonly ok: false;
      readonly code: 'INVALID_CHALLENGE' | 'CHALLENGE_EXPIRED';
      readonly message: string;
    };

/** Shared durable boundary for single-use registration and assertion challenges. */
export interface WebAuthnChallengeStore {
  issue(input: IssueWebAuthnChallengeInput): Promise<void>;
  consume(key: WebAuthnChallengeKey): Promise<WebAuthnChallengeConsumeResult>;
}

function assertChallengeTtl(ttlMs: number): void {
  if (!Number.isSafeInteger(ttlMs) || ttlMs <= 0) {
    throw new Error('WebAuthn challenge TTL must be a positive integer number of milliseconds');
  }
}

function challengeKey(key: WebAuthnChallengeKey): string {
  return JSON.stringify([key.accountId, key.userId, key.purpose]);
}

interface InMemoryWebAuthnChallengeValue {
  readonly challenge: string;
  readonly expiresAt: number;
}

/** Explicit local/test double; production-like runtimes must use a database store. */
export class InMemoryWebAuthnChallengeStore implements WebAuthnChallengeStore {
  readonly #store = new Map<string, InMemoryWebAuthnChallengeValue>();

  async issue(input: IssueWebAuthnChallengeInput): Promise<void> {
    assertChallengeTtl(input.ttlMs);
    if (!input.challenge) {
      throw new Error('WebAuthn challenge must not be empty');
    }

    this.#store.set(challengeKey(input.key), {
      challenge: input.challenge,
      expiresAt: Date.now() + input.ttlMs
    });
  }

  async consume(key: WebAuthnChallengeKey): Promise<WebAuthnChallengeConsumeResult> {
    const stored = this.#store.get(challengeKey(key));
    if (!stored) {
      return {
        ok: false,
        code: 'INVALID_CHALLENGE',
        message: 'No pending WebAuthn challenge'
      };
    }

    this.#store.delete(challengeKey(key));
    if (stored.expiresAt <= Date.now()) {
      return {
        ok: false,
        code: 'CHALLENGE_EXPIRED',
        message: 'WebAuthn challenge has expired'
      };
    }

    return { ok: true, challenge: stored.challenge };
  }
}

/**
 * WebAuthn Relying Party credentials storage interface.
 */
export interface WebAuthnRepository {
  findByUserId(accountId: string, userId: string): Promise<WebAuthnCredential[]>;
  findByCredentialId(
    accountId: string,
    userId: string,
    credentialId: string
  ): Promise<WebAuthnCredential | null>;
  save(accountId: string, userId: string, credential: WebAuthnCredentialInput): Promise<string>;
  updateCounter(
    accountId: string,
    userId: string,
    credentialId: string,
    expectedCounter: number,
    counter: number
  ): Promise<boolean>;
  delete(accountId: string, userId: string, credentialId: string): Promise<void>;
}

/**
 * In-memory implementation for development/testing.
 * Replace with DatabaseWebAuthnRepository in production.
 */
export class InMemoryWebAuthnRepository implements WebAuthnRepository {
  readonly #store = new Map<string, WebAuthnCredential>();

  async findByUserId(accountId: string, userId: string): Promise<WebAuthnCredential[]> {
    return [...this.#store.values()].filter(
      (credential) => credential.accountId === accountId && credential.userId === userId
    );
  }

  async findByCredentialId(
    accountId: string,
    userId: string,
    credentialId: string
  ): Promise<WebAuthnCredential | null> {
    const credential = this.#store.get(credentialId);
    return credential?.accountId === accountId && credential.userId === userId ? credential : null;
  }

  async save(accountId: string, userId: string, data: WebAuthnCredentialInput): Promise<string> {
    const id = data.id ?? `webauthn_${Date.now().toString(36)}_${randomBytes(8).toString('hex')}`;
    if (this.#store.has(id)) {
      throw new Error('WebAuthn credential already exists');
    }
    const { id: _ignoredId, ...credentialData } = data;
    this.#store.set(id, { id, accountId, userId, ...credentialData });
    return id;
  }

  async updateCounter(
    accountId: string,
    userId: string,
    credentialId: string,
    expectedCounter: number,
    counter: number
  ): Promise<boolean> {
    const credential = this.#store.get(credentialId);
    if (
      credential?.accountId === accountId &&
      credential.userId === userId &&
      credential.counter === expectedCounter &&
      counter > expectedCounter
    ) {
      this.#store.set(credentialId, {
        ...credential,
        counter,
        lastUsedAt: new Date().toISOString()
      });
      return true;
    }
    return false;
  }

  async delete(accountId: string, userId: string, credentialId: string): Promise<void> {
    const credential = this.#store.get(credentialId);
    if (credential?.accountId === accountId && credential.userId === userId) {
      this.#store.delete(credentialId);
    }
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
  generateRegistrationOptions(
    accountId: string,
    userId: string,
    options: WebAuthnRegistrationOptions
  ): Promise<{
    publicKeyOptions: Record<string, unknown>;
    challenge: string;
  }>;

  /**
   * Verify registration response from client.
   * Store the credential on success.
   */
  verifyRegistration(
    accountId: string,
    userId: string,
    response: {
      credentialId: string;
      attestationObject: string;
      clientDataJSON: string;
      rawId?: string;
      clientExtensionResults?: Record<string, unknown>;
      authenticatorAttachment?: 'platform' | 'cross-platform';
    },
    expectedChallenge: string
  ): Promise<{ credentialId: string }>;

  /**
   * Generate authentication options (PublicKeyCredentialRequestOptions).
   */
  generateAuthenticationOptions(
    accountId: string,
    userId: string,
    options: WebAuthnAssertionOptions
  ): Promise<{ publicKeyOptions: Record<string, unknown>; challenge: string }>;

  /**
   * Verify authentication assertion from client.
   */
  verifyAuthentication(
    accountId: string,
    userId: string,
    credentialId: string,
    response: {
      authenticatorData: string;
      clientDataJSON: string;
      signature: string;
      userHandle?: string;
    },
    expectedChallenge: string,
    expectedRpId: string
  ): Promise<{ success: boolean; newCounter?: number }>;
}

/** WebAuthn service backed by library-validated FIDO2 attestation and assertions. */
export class WebAuthnVerificationError extends Error {
  readonly cause?: unknown;

  constructor(message = 'WebAuthn verification failed', cause?: unknown) {
    super(message);
    this.name = 'WebAuthnVerificationError';
    this.cause = cause;
  }
}

const DEFAULT_WEB_AUTHN_CONFIG: WebAuthnVerifierConfig = {
  rpId: 'localhost',
  origins: ['http://localhost:3000'],
  requireUserVerification: false
};

function assertRpId(rpId: string, configuredRpId: string): void {
  if (rpId !== configuredRpId) {
    throw new WebAuthnVerificationError('WebAuthn RP ID does not match server configuration');
  }
}

export class WebAuthnServiceImpl implements WebAuthnService {
  private readonly config: WebAuthnVerifierConfig;

  constructor(
    private readonly repository: WebAuthnRepository,
    config: WebAuthnVerifierConfig = DEFAULT_WEB_AUTHN_CONFIG
  ) {
    const rpId = config.rpId.trim();
    const origins = config.origins.map((origin) => origin.trim()).filter(Boolean);
    if (!rpId || origins.length === 0) {
      throw new Error('WebAuthn verifier requires an RP ID and at least one origin');
    }
    this.config = {
      ...config,
      rpId,
      origins,
      requireUserVerification: config.requireUserVerification ?? false
    };
  }

  private expectedOrigins(): string | string[] {
    return this.config.origins.length === 1 ? this.config.origins[0]! : [...this.config.origins];
  }

  async generateRegistrationOptions(
    accountId: string,
    userId: string,
    options: WebAuthnRegistrationOptions
  ): Promise<{ publicKeyOptions: Record<string, unknown>; challenge: string }> {
    assertRpId(options.rpId, this.config.rpId);
    const challenge = generateWebAuthnChallenge();
    const credentials = await this.repository.findByUserId(accountId, userId);
    const authenticatorSelection = options.authenticatorSelection
      ? {
          requireResidentKey: options.authenticatorSelection.requireResidentKey ?? false,
          residentKey: options.authenticatorSelection.residentKey ?? 'preferred',
          userVerification: options.authenticatorSelection.userVerification ?? 'preferred',
          authenticatorAttachment: options.authenticatorSelection.authenticatorAttachment
        }
      : undefined;

    const publicKeyOptions = await generateRegistrationOptionsWithLibrary({
      rpName: options.rpName,
      rpID: this.config.rpId,
      userName: options.userName,
      userID: new TextEncoder().encode(options.userId),
      userDisplayName: options.userName,
      challenge,
      timeout: options.timeout ?? 60000,
      attestationType: 'none',
      excludeCredentials: credentials.map((credential) => ({ id: credential.id })),
      authenticatorSelection,
      extensions: { credProps: true },
      supportedAlgorithmIDs: [-7, -257]
    });

    return {
      publicKeyOptions: publicKeyOptions as unknown as Record<string, unknown>,
      challenge
    };
  }

  async verifyRegistration(
    accountId: string,
    userId: string,
    response: {
      credentialId: string;
      attestationObject: string;
      clientDataJSON: string;
      rawId?: string;
      clientExtensionResults?: Record<string, unknown>;
      authenticatorAttachment?: 'platform' | 'cross-platform';
    },
    expectedChallenge: string
  ): Promise<{ credentialId: string }> {
    try {
      const registrationResponse: RegistrationResponseJSON = {
        id: response.credentialId,
        rawId: response.rawId ?? response.credentialId,
        response: {
          attestationObject: response.attestationObject,
          clientDataJSON: response.clientDataJSON
        },
        type: 'public-key',
        clientExtensionResults: (response.clientExtensionResults ??
          {}) as RegistrationResponseJSON['clientExtensionResults'],
        ...(response.authenticatorAttachment
          ? { authenticatorAttachment: response.authenticatorAttachment }
          : {})
      };
      const verification = await verifyRegistrationResponse({
        response: registrationResponse,
        expectedChallenge,
        expectedOrigin: this.expectedOrigins(),
        expectedRPID: this.config.rpId,
        requireUserPresence: true,
        requireUserVerification: this.config.requireUserVerification
      });

      if (!verification.verified) {
        throw new WebAuthnVerificationError();
      }

      const credential = verification.registrationInfo.credential;
      if (credential.id !== response.credentialId) {
        throw new WebAuthnVerificationError('WebAuthn credential ID mismatch');
      }

      const credentialId = await this.repository.save(accountId, userId, {
        id: credential.id,
        publicKey: base64URLEncode(credential.publicKey),
        counter: credential.counter,
        deviceType: response.authenticatorAttachment ?? 'cross-platform',
        createdAt: new Date().toISOString(),
        lastUsedAt: null
      });

      return { credentialId };
    } catch (error) {
      if (error instanceof WebAuthnVerificationError) {
        throw error;
      }
      throw new WebAuthnVerificationError(undefined, error);
    }
  }

  async generateAuthenticationOptions(
    accountId: string,
    userId: string,
    options: WebAuthnAssertionOptions
  ): Promise<{ publicKeyOptions: Record<string, unknown>; challenge: string }> {
    assertRpId(options.rpId, this.config.rpId);
    const challenge = generateWebAuthnChallenge();
    const credentials = await this.repository.findByUserId(accountId, userId);
    const publicKeyOptions = await generateAuthenticationOptionsWithLibrary({
      rpID: this.config.rpId,
      challenge,
      timeout: options.timeout ?? 60000,
      userVerification: options.userVerification ?? 'preferred',
      ...(credentials.length > 0
        ? { allowCredentials: credentials.map((credential) => ({ id: credential.id })) }
        : {})
    });
    const normalizedPublicKeyOptions = publicKeyOptions as unknown as Record<string, unknown>;
    if (normalizedPublicKeyOptions.allowCredentials === undefined) {
      delete normalizedPublicKeyOptions.allowCredentials;
    }
    if (normalizedPublicKeyOptions.extensions === undefined) {
      delete normalizedPublicKeyOptions.extensions;
    }

    return {
      publicKeyOptions: normalizedPublicKeyOptions,
      challenge
    };
  }

  async verifyAuthentication(
    accountId: string,
    userId: string,
    credentialId: string,
    response: {
      authenticatorData: string;
      clientDataJSON: string;
      signature: string;
      userHandle?: string;
    },
    expectedChallenge: string,
    expectedRpId: string
  ): Promise<{ success: boolean; newCounter?: number }> {
    if (expectedRpId !== this.config.rpId) {
      return { success: false };
    }

    try {
      const credential = await this.repository.findByCredentialId(accountId, userId, credentialId);
      if (!credential || !Number.isSafeInteger(credential.counter) || credential.counter < 0) {
        return { success: false };
      }

      if (
        response.userHandle &&
        response.userHandle !== base64URLEncode(new TextEncoder().encode(userId))
      ) {
        return { success: false };
      }

      const authenticationResponse: AuthenticationResponseJSON = {
        id: credentialId,
        rawId: credentialId,
        response: {
          authenticatorData: response.authenticatorData,
          clientDataJSON: response.clientDataJSON,
          signature: response.signature,
          ...(response.userHandle ? { userHandle: response.userHandle } : {})
        },
        type: 'public-key',
        clientExtensionResults: {}
      };
      const verification = await verifyAuthenticationResponse({
        response: authenticationResponse,
        expectedChallenge,
        expectedOrigin: this.expectedOrigins(),
        expectedRPID: this.config.rpId,
        credential: {
          id: credential.id,
          publicKey: base64URLDecode(credential.publicKey),
          counter: credential.counter
        },
        requireUserVerification: this.config.requireUserVerification
      });

      if (!verification.verified) {
        return { success: false };
      }

      const newCounter = verification.authenticationInfo.newCounter;
      if (!Number.isSafeInteger(newCounter) || newCounter < credential.counter) {
        return { success: false };
      }

      // Some synced passkeys legitimately report a permanently-zero counter.
      // They still get full challenge/origin/RP/signature verification, while
      // counter-bearing credentials retain optimistic concurrency protection.
      if (newCounter === credential.counter) {
        return newCounter === 0 ? { success: true, newCounter } : { success: false };
      }

      const counterUpdated = await this.repository.updateCounter(
        accountId,
        userId,
        credentialId,
        credential.counter,
        newCounter
      );
      return counterUpdated ? { success: true, newCounter } : { success: false };
    } catch {
      return { success: false };
    }
  }
}
