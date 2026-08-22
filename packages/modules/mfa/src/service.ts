import { createHash, randomUUID } from 'node:crypto';
import { decrypt, encrypt, validateMasterKey } from './crypto.js';
import {
  generateProvisioningUri,
  generateRecoveryCodes,
  generateSecret,
  findMatchingTotpCounter,
  verifyTOTP
} from './totp.js';
import type { MfaRecord, MfaRepository } from './repositories/mfa-repository.interface.js';

export type { MfaRecord, MfaRepository } from './repositories/mfa-repository.interface.js';

export interface MfaSetupResponse {
  readonly secret: string;
  readonly provisioningUri: string;
  readonly recoveryCodes: readonly string[];
}

export interface MfaSetupConfirmation {
  readonly credentialId: string;
  readonly accountId: string;
  readonly userId: string;
  readonly isActive: true;
  readonly createdAt: string;
  readonly activatedAt: string;
}

export interface MfaSetupConfirmRequest {
  readonly userId: string;
  readonly token: string;
}

export interface MfaLoginRequest {
  readonly userId: string;
  readonly token: string;
}

export type MfaEncryptionKeyring = Readonly<Record<string, string>>;

const CRITICAL_ROLES = new Set(['admin', 'finance', 'auditor']);
const DEFAULT_SETUP_TTL_MS = 10 * 60 * 1000;

function hashRecoveryCode(code: string): string {
  return createHash('sha256').update(code.replace(/[\s-]/g, '').toUpperCase()).digest('hex');
}

export class MfaService {
  readonly #repository?: MfaRepository;
  readonly #encryptionKey?: string;
  readonly #encryptionKeyVersion?: string;
  readonly #encryptionKeyring: ReadonlyMap<string, string>;
  readonly #clock: () => number;
  readonly #setupTtlMs: number;
  readonly #pendingSetups = new Map<string, { secret: string; recoveryCodes: readonly string[] }>();

  constructor(options?: {
    readonly repository?: MfaRepository;
    readonly encryptionKey?: string;
    readonly encryptionKeyVersion?: string;
    readonly encryptionKeyring?: MfaEncryptionKeyring;
    readonly clock?: () => number;
    readonly setupTtlMs?: number;
  }) {
    this.#repository = options?.repository;
    const encryption = this.#configureEncryption(options);
    this.#encryptionKey = encryption.currentKey;
    this.#encryptionKeyVersion = encryption.currentVersion;
    this.#encryptionKeyring = encryption.keyring;
    this.#clock = options?.clock ?? Date.now;
    this.#setupTtlMs = options?.setupTtlMs ?? DEFAULT_SETUP_TTL_MS;
  }

  isMfaRequired(roleCodes: readonly string[]): boolean {
    return roleCodes.some((role) => CRITICAL_ROLES.has(role));
  }

  async initiateSetup(
    accountId: string,
    userId: string,
    accountName: string,
    issuer = 'CVG-HIS-V2'
  ): Promise<MfaSetupResponse> {
    const existing = await this.#getRecord(accountId, userId);
    if (existing?.isActive) {
      throw new Error('MFA is already active for this user.');
    }

    const secret = generateSecret();
    const recoveryCodes = generateRecoveryCodes();
    const provisioningUri = generateProvisioningUri(secret, accountName, issuer);

    if (this.#repository) {
      const createdAt = new Date(this.#clock()).toISOString();
      const secretToPersist = this.#encryptionKey
        ? encrypt(secret, this.#encryptionKey)
        : secret;
      const pendingPersisted = await this.#repository.beginSetup(
        {
          credentialId: randomUUID(),
          accountId,
          userId,
          secret: secretToPersist,
          isActive: false,
          recoveryCodes: recoveryCodes.map(hashRecoveryCode),
          createdAt,
          setupExpiresAt: new Date(this.#clock() + this.#setupTtlMs).toISOString(),
          secretKeyVersion: this.#encryptionKeyVersion
        },
        { ttlMs: this.#setupTtlMs }
      );
      if (!pendingPersisted) {
        throw new Error('MFA is already active for this user.');
      }
    } else {
      this.#pendingSetups.set(this.#recordKey(accountId, userId), { secret, recoveryCodes });
    }

    return { secret, provisioningUri, recoveryCodes };
  }

  async confirmSetup(
    accountId: string,
    userId: string,
    token: string
  ): Promise<MfaSetupConfirmation> {
    if (this.#repository) {
      return this.#confirmPersistedSetup(accountId, userId, token);
    }

    const recordKey = this.#recordKey(accountId, userId);
    const pending = this.#pendingSetups.get(recordKey);
    if (!pending) {
      throw new Error('No pending MFA setup found. Please initiate setup first.');
    }

    if (!verifyTOTP(pending.secret, token)) {
      throw new Error('Invalid TOTP code. Please check your authenticator app.');
    }

    const now = new Date(this.#clock()).toISOString();
    const credentialId = randomUUID();

    this.#pendingSetups.delete(recordKey);

    return {
      credentialId,
      accountId,
      userId,
      isActive: true,
      createdAt: now,
      activatedAt: now
    };
  }

  async #confirmPersistedSetup(
    accountId: string,
    userId: string,
    token: string
  ): Promise<MfaSetupConfirmation> {
    const pending = await this.#repository!.findByUserId(accountId, userId);
    const nowMs = this.#clock();
    if (!pending || pending.isActive || !pending.setupExpiresAt) {
      throw new Error('No pending MFA setup found. Please initiate setup first.');
    }

    const secret = this.#decryptSecret(pending);
    const matchedCounter = findMatchingTotpCounter(secret, token, undefined, nowMs);
    if (matchedCounter === undefined) {
      throw new Error('Invalid TOTP code. Please check your authenticator app.');
    }

    const activatedAt = new Date(nowMs).toISOString();
    const activated = await this.#repository!.activateSetup(
      accountId,
      userId,
      pending.credentialId,
      matchedCounter,
      activatedAt
    );
    if (!activated?.activatedAt) {
      throw new Error('No pending MFA setup found. Please initiate setup first.');
    }

    return {
      credentialId: activated.credentialId,
      accountId: activated.accountId,
      userId: activated.userId,
      isActive: true,
      createdAt: activated.createdAt,
      activatedAt: activated.activatedAt
    };
  }

  async verifyLogin(accountId: string, userId: string, token: string): Promise<boolean> {
    const record = await this.#getRecord(accountId, userId);
    if (!record?.isActive) return false;

    const secret = this.#decryptSecret(record);

    const nowMs = this.#clock();
    const now = new Date(nowMs).toISOString();
    const matchedCounter = findMatchingTotpCounter(secret, token, undefined, nowMs);
    if (matchedCounter !== undefined) {
      if (!this.#repository) return false;
      return this.#repository.consumeTotpCounter(
        accountId,
        userId,
        record.credentialId,
        matchedCounter,
        now
      );
    }

    const recoveryRecord = this.#verifyRecoveryCode(record, token);
    if (!recoveryRecord || !this.#repository) return false;

    return this.#repository.consumeRecoveryCode(
      accountId,
      userId,
      record.credentialId,
      hashRecoveryCode(token),
      now
    );
  }

  async isMfaActive(accountId: string, userId: string): Promise<boolean> {
    const record = await this.#getRecord(accountId, userId);
    return record?.isActive ?? false;
  }

  async disableMfa(accountId: string, userId: string, token: string): Promise<void> {
    const record = await this.#getRecord(accountId, userId);
    if (!record) {
      throw new Error('MFA is not configured for this user.');
    }

    const secret = this.#decryptSecret(record);

    if (!this.#repository) {
      throw new Error('MFA is not configured for this user.');
    }

    const nowMs = this.#clock();
    const now = new Date(nowMs).toISOString();
    const matchedCounter = findMatchingTotpCounter(secret, token, undefined, nowMs);
    const recoveryRecord = this.#verifyRecoveryCode(record, token);
    const credentialConsumed =
      matchedCounter !== undefined
        ? await this.#repository.consumeTotpCounter(
            accountId,
            userId,
            record.credentialId,
            matchedCounter,
            now
          )
        : recoveryRecord
          ? await this.#repository.consumeRecoveryCode(
              accountId,
              userId,
              record.credentialId,
              hashRecoveryCode(token),
              now
            )
          : false;

    if (!credentialConsumed) {
      throw new Error('Invalid TOTP code or recovery code.');
    }

    const deleted = await this.#repository.delete(accountId, userId, record.credentialId);
    if (!deleted) {
      throw new Error('MFA credential changed while it was being disabled. Please try again.');
    }
  }

  async regenerateRecoveryCodes(accountId: string, userId: string): Promise<readonly string[]> {
    const record = await this.#getRecord(accountId, userId);
    if (!record) {
      throw new Error('MFA is not configured for this user.');
    }

    const newCodes = generateRecoveryCodes();
    const hashedCodes = newCodes.map(hashRecoveryCode);
    const now = new Date(this.#clock()).toISOString();

    const updated: MfaRecord = {
      ...record,
      recoveryCodes: hashedCodes,
      lastRecoveryCodesRegeneratedAt: now
    };

    if (this.#repository) {
      const updatedCurrentCredential = await this.#repository.update(updated);
      if (!updatedCurrentCredential) {
        throw new Error('MFA credential changed while recovery codes were being regenerated.');
      }
    }

    return newCodes;
  }

  #verifyRecoveryCode(record: MfaRecord, token: string): MfaRecord | undefined {
    const cleanToken = token.replace(/[\s-]/g, '').toUpperCase();
    const hashedToken = hashRecoveryCode(cleanToken);
    const usedIndex = record.recoveryCodes.findIndex((code) => code === hashedToken);

    if (usedIndex === -1) return undefined;

    const updatedCodes = [...record.recoveryCodes];
    updatedCodes.splice(usedIndex, 1);

    const updated: MfaRecord = {
      ...record,
      recoveryCodes: updatedCodes
    };

    return updated;
  }

  async #getRecord(accountId: string, userId: string): Promise<MfaRecord | undefined> {
    if (this.#repository) {
      return this.#repository.findByUserId(accountId, userId);
    }
    return undefined;
  }

  #decryptSecret(record: MfaRecord): string {
    const encryptionKey = this.#resolveDecryptionKey(record.secretKeyVersion);
    return encryptionKey ? decrypt(record.secret, encryptionKey) : record.secret;
  }

  #resolveDecryptionKey(secretKeyVersion: string | undefined): string | undefined {
    if (!secretKeyVersion) {
      if (this.#encryptionKey) return this.#encryptionKey;
      if (this.#encryptionKeyring.size > 0) {
        throw new Error('MFA credential encryption key is unavailable.');
      }
      return undefined;
    }

    const versionedKey = this.#encryptionKeyring.get(secretKeyVersion);
    if (versionedKey) return versionedKey;

    // Existing deployments historically configured a single key without a version.
    // Preserve those reads until a versioned keyring is explicitly enabled.
    if (this.#encryptionKey && !this.#encryptionKeyVersion) return this.#encryptionKey;

    throw new Error('MFA credential encryption key is unavailable.');
  }

  #configureEncryption(options?: {
    readonly encryptionKey?: string;
    readonly encryptionKeyVersion?: string;
    readonly encryptionKeyring?: MfaEncryptionKeyring;
  }): {
    readonly currentKey?: string;
    readonly currentVersion?: string;
    readonly keyring: ReadonlyMap<string, string>;
  } {
    const keyring = new Map<string, string>();
    for (const [version, key] of Object.entries(options?.encryptionKeyring ?? {})) {
      if (!version.trim() || version !== version.trim()) {
        throw new Error('MFA encryption key versions must be non-empty.');
      }
      validateMasterKey(key);
      keyring.set(version, key);
    }

    const currentVersion = options?.encryptionKeyVersion;
    const configuredCurrentKey = options?.encryptionKey;
    if (configuredCurrentKey) validateMasterKey(configuredCurrentKey);

    let currentKey = configuredCurrentKey;
    if (currentVersion) {
      const keyringCurrentKey = keyring.get(currentVersion);
      if (
        configuredCurrentKey &&
        keyringCurrentKey &&
        configuredCurrentKey !== keyringCurrentKey
      ) {
        throw new Error('MFA current encryption key conflicts with its keyring entry.');
      }
      currentKey = configuredCurrentKey ?? keyringCurrentKey;
      if (!currentKey) {
        throw new Error('MFA current encryption key version is unavailable in the keyring.');
      }
      keyring.set(currentVersion, currentKey);
    }

    return { currentKey, currentVersion, keyring };
  }

  #recordKey(accountId: string, userId: string): string {
    return `${accountId}:${userId}`;
  }
}

export { CRITICAL_ROLES };
export { validateMasterKey } from './crypto.js';
