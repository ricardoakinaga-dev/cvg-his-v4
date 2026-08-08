import { createHash } from 'node:crypto';
import { decrypt, encrypt, validateMasterKey } from './crypto.js';
import {
  generateProvisioningUri,
  generateRecoveryCodes,
  generateSecret,
  verifyTOTP
} from './totp.js';
import type { MfaRecord, MfaRepository } from './repositories/mfa-repository.interface.js';

export type { MfaRecord, MfaRepository } from './repositories/mfa-repository.interface.js';

export interface MfaSetupResponse {
  readonly secret: string;
  readonly provisioningUri: string;
  readonly recoveryCodes: readonly string[];
}

export interface MfaSetupConfirmRequest {
  readonly userId: string;
  readonly token: string;
}

export interface MfaLoginRequest {
  readonly userId: string;
  readonly token: string;
}

const CRITICAL_ROLES = new Set(['admin', 'finance', 'auditor']);

function hashRecoveryCode(code: string): string {
  return createHash('sha256').update(code.replace(/[\s-]/g, '').toUpperCase()).digest('hex');
}

export class MfaService {
  readonly #repository?: MfaRepository;
  readonly #encryptionKey?: string;
  readonly #pendingSetups = new Map<string, { secret: string; recoveryCodes: readonly string[] }>();

  constructor(options?: { readonly repository?: MfaRepository; readonly encryptionKey?: string }) {
    this.#repository = options?.repository;
    this.#encryptionKey = options?.encryptionKey;
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
    const secret = generateSecret();
    const recoveryCodes = generateRecoveryCodes();
    const provisioningUri = generateProvisioningUri(secret, accountName, issuer);

    this.#pendingSetups.set(this.#recordKey(accountId, userId), { secret, recoveryCodes });

    return { secret, provisioningUri, recoveryCodes };
  }

  async confirmSetup(accountId: string, userId: string, token: string): Promise<MfaRecord> {
    const recordKey = this.#recordKey(accountId, userId);
    const pending = this.#pendingSetups.get(recordKey);
    if (!pending) {
      throw new Error('No pending MFA setup found. Please initiate setup first.');
    }

    if (!verifyTOTP(pending.secret, token)) {
      throw new Error('Invalid TOTP code. Please check your authenticator app.');
    }

    const now = new Date().toISOString();

    const secretToPersist = this.#encryptionKey
      ? encrypt(pending.secret, this.#encryptionKey)
      : pending.secret;

    const recoveryCodesToPersist = pending.recoveryCodes.map(hashRecoveryCode);

    const record: MfaRecord = {
      accountId,
      userId,
      secret: secretToPersist,
      isActive: true,
      recoveryCodes: recoveryCodesToPersist,
      createdAt: now,
      activatedAt: now,
      lastUsedAt: undefined,
      lastRecoveryCodesRegeneratedAt: undefined
    };

    this.#pendingSetups.delete(recordKey);

    if (this.#repository) {
      await this.#repository.create(record);
    }

    return {
      accountId,
      userId,
      secret: pending.secret,
      isActive: true,
      recoveryCodes: pending.recoveryCodes,
      createdAt: now,
      activatedAt: now
    };
  }

  async verifyLogin(accountId: string, userId: string, token: string): Promise<boolean> {
    const pending = this.#pendingSetups.get(this.#recordKey(accountId, userId));
    if (pending) {
      if (verifyTOTP(pending.secret, token)) {
        return true;
      }
      return false;
    }

    const record = await this.#getRecord(accountId, userId);
    if (!record || !record.isActive) {
      return false;
    }

    const secret = this.#encryptionKey
      ? decrypt(record.secret, this.#encryptionKey)
      : record.secret;

    let verified = false;
    let recordToPersist = record;

    if (verifyTOTP(secret, token)) {
      verified = true;
    } else {
      const recoveryRecord = this.#verifyRecoveryCode(record, token);
      if (recoveryRecord) {
        verified = true;
        recordToPersist = recoveryRecord;
      }
    }

    if (verified && this.#repository) {
      const now = new Date().toISOString();
      await this.#repository.update({ ...recordToPersist, lastUsedAt: now });
    }

    return verified;
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

    const secret = this.#encryptionKey
      ? decrypt(record.secret, this.#encryptionKey)
      : record.secret;

    if (!verifyTOTP(secret, token) && !this.#verifyRecoveryCode(record, token)) {
      throw new Error('Invalid TOTP code or recovery code.');
    }

    if (this.#repository) {
      await this.#repository.delete(accountId, userId);
    }
  }

  async regenerateRecoveryCodes(accountId: string, userId: string): Promise<readonly string[]> {
    const record = await this.#getRecord(accountId, userId);
    if (!record) {
      throw new Error('MFA is not configured for this user.');
    }

    const newCodes = generateRecoveryCodes();
    const hashedCodes = newCodes.map(hashRecoveryCode);
    const now = new Date().toISOString();

    const updated: MfaRecord = {
      ...record,
      recoveryCodes: hashedCodes,
      lastRecoveryCodesRegeneratedAt: now
    };

    if (this.#repository) {
      await this.#repository.update(updated);
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

  #recordKey(accountId: string, userId: string): string {
    return `${accountId}:${userId}`;
  }
}

export { CRITICAL_ROLES };
export { validateMasterKey } from './crypto.js';
