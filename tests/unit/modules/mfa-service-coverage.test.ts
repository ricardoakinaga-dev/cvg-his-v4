import { createHash, createHmac } from 'node:crypto';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { MfaRecord, MfaRepository } from '../../../packages/modules/mfa/src/service.js';
import { MfaService } from '../../../packages/modules/mfa/src/service.js';
import { decrypt } from '../../../packages/modules/mfa/src/crypto.js';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const ENCRYPTION_KEY = 'coverage-mfa-encryption-key-32chars';
const ACCOUNT_ID = 'acc_coverage';

function base32ToBuffer(base32: string): Buffer {
  let bits = '';
  for (const char of base32.toUpperCase().replace(/=/g, '')) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) continue;
    bits += index.toString(2).padStart(5, '0');
  }

  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(Number.parseInt(bits.slice(i, i + 8), 2));
  }

  return Buffer.from(bytes);
}

function generateValidTotp(secret: string, nowMs = Date.now()): string {
  const key = base32ToBuffer(secret);
  const counter = Math.floor(nowMs / 1000 / 30);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));
  const hash = createHmac('sha1', key).update(counterBuffer).digest();
  const offset = hash[hash.length - 1] & 0x0f;
  const binary =
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff);

  return (binary % 10 ** 6).toString().padStart(6, '0');
}

function hashRecoveryCode(code: string): string {
  return createHash('sha256').update(code.replace(/[\s-]/g, '').toUpperCase()).digest('hex');
}

class InMemoryMfaRepository implements MfaRepository {
  readonly records = new Map<string, MfaRecord>();
  readonly updated: MfaRecord[] = [];
  readonly deleted: string[] = [];

  async findByUserId(accountId: string, userId: string): Promise<MfaRecord | undefined> {
    return this.records.get(`${accountId}:${userId}`);
  }

  async beginSetup(record: MfaRecord): Promise<boolean> {
    const key = `${record.accountId}:${record.userId}`;
    if (this.records.get(key)?.isActive) return false;
    this.records.set(key, { ...record, recoveryCodes: [...record.recoveryCodes] });
    return true;
  }

  async activateSetup(
    accountId: string,
    userId: string,
    credentialId: string,
    matchedTotpCounter: number,
    activatedAt: string
  ): Promise<MfaRecord | undefined> {
    const key = `${accountId}:${userId}`;
    const existing = this.records.get(key);
    if (!existing || existing.credentialId !== credentialId || existing.isActive) return undefined;
    const activated = {
      ...existing,
      isActive: true as const,
      activatedAt,
      setupExpiresAt: undefined,
      lastTotpCounter: matchedTotpCounter
    };
    this.records.set(key, activated);
    return activated;
  }

  async create(record: MfaRecord): Promise<void> {
    this.records.set(`${record.accountId}:${record.userId}`, record);
  }

  async update(record: MfaRecord): Promise<boolean> {
    const key = `${record.accountId}:${record.userId}`;
    const existing = this.records.get(key);
    if (!existing || existing.credentialId !== record.credentialId) return false;
    this.updated.push(record);
    this.records.set(key, {
      ...record,
      lastUsedAt: existing.lastUsedAt,
      lastTotpCounter: existing.lastTotpCounter
    });
    return true;
  }

  async consumeTotpCounter(
    accountId: string,
    userId: string,
    credentialId: string,
    counter: number,
    usedAt: string
  ): Promise<boolean> {
    const key = `${accountId}:${userId}`;
    const existing = this.records.get(key);
    if (
      !existing?.isActive ||
      existing.credentialId !== credentialId ||
      (existing.lastTotpCounter !== undefined && existing.lastTotpCounter >= counter)
    ) {
      return false;
    }
    this.records.set(key, { ...existing, lastTotpCounter: counter, lastUsedAt: usedAt });
    return true;
  }

  async consumeRecoveryCode(
    accountId: string,
    userId: string,
    credentialId: string,
    recoveryCodeHash: string,
    usedAt: string
  ): Promise<boolean> {
    const key = `${accountId}:${userId}`;
    const existing = this.records.get(key);
    if (
      !existing?.isActive ||
      existing.credentialId !== credentialId ||
      !existing.recoveryCodes.includes(recoveryCodeHash)
    ) {
      return false;
    }
    this.records.set(key, {
      ...existing,
      recoveryCodes: existing.recoveryCodes.filter((code) => code !== recoveryCodeHash),
      lastUsedAt: usedAt
    });
    return true;
  }

  async delete(accountId: string, userId: string, credentialId: string): Promise<boolean> {
    const key = `${accountId}:${userId}`;
    if (this.records.get(key)?.credentialId !== credentialId) return false;
    this.deleted.push(userId);
    return this.records.delete(key);
  }
}

describe('MfaService coverage guard', () => {
  let repository: InMemoryMfaRepository;
  let service: MfaService;
  let nowMs: number;

  beforeEach(() => {
    nowMs = Date.now();
    repository = new InMemoryMfaRepository();
    service = new MfaService({
      repository,
      encryptionKey: ENCRYPTION_KEY,
      clock: () => nowMs
    });
  });

  it('confirms setup with encrypted persistence and clears pending setup state', async () => {
    const setup = await service.initiateSetup(
      ACCOUNT_ID,
      'user_secure',
      'secure@example.com'
    );
    const token = generateValidTotp(setup.secret);

    const confirmed = await service.confirmSetup(ACCOUNT_ID, 'user_secure', token);

    const persisted = repository.records.get(`${ACCOUNT_ID}:user_secure`);
    expect(confirmed.isActive).toBe(true);
    expect(persisted).toBeDefined();
    expect(persisted?.secret).not.toBe(setup.secret);
    expect(decrypt(persisted!.secret, ENCRYPTION_KEY)).toBe(setup.secret);
    expect(persisted?.recoveryCodes).toEqual(setup.recoveryCodes.map(hashRecoveryCode));

    await expect(service.confirmSetup(ACCOUNT_ID, 'user_secure', token)).rejects.toThrow(
      'No pending MFA setup found'
    );
  });

  it('rejects pending setup tokens until confirmation', async () => {
    const setup = await service.initiateSetup(ACCOUNT_ID, 'user_pending', 'pending@example.com');

    expect(await service.verifyLogin(ACCOUNT_ID, 'user_pending', generateValidTotp(setup.secret))).toBe(
      false
    );
    expect(await service.verifyLogin(ACCOUNT_ID, 'user_pending', '000000')).toBe(false);
  });

  it('verifies stored TOTP logins and updates lastUsedAt in repository', async () => {
    const setup = await service.initiateSetup(ACCOUNT_ID, 'user_totp', 'totp@example.com');
    await service.confirmSetup(ACCOUNT_ID, 'user_totp', generateValidTotp(setup.secret));
    nowMs += 30_000;

    const verified = await service.verifyLogin(
      ACCOUNT_ID,
      'user_totp',
      generateValidTotp(setup.secret, nowMs)
    );

    expect(verified).toBe(true);
    const persisted = repository.records.get(`${ACCOUNT_ID}:user_totp`);
    expect(persisted?.lastUsedAt).toBeDefined();
    expect(persisted?.lastTotpCounter).toBeTypeOf('number');
  });

  it('accepts recovery codes, consumes them and supports disabling MFA with recovery fallback', async () => {
    const setup = await service.initiateSetup(ACCOUNT_ID, 'user_recovery', 'recovery@example.com');
    await service.confirmSetup(ACCOUNT_ID, 'user_recovery', generateValidTotp(setup.secret));

    const originalCodes = setup.recoveryCodes;
    const loginVerified = await service.verifyLogin(ACCOUNT_ID, 'user_recovery', originalCodes[0]);

    expect(loginVerified).toBe(true);
    await vi.waitFor(() => {
      expect(repository.records.get(`${ACCOUNT_ID}:user_recovery`)?.recoveryCodes).toHaveLength(
        originalCodes.length - 1
      );
    });

    const remainingRecord = repository.records.get(`${ACCOUNT_ID}:user_recovery`);
    expect(remainingRecord?.recoveryCodes).not.toContain(hashRecoveryCode(originalCodes[0]));

    await service.disableMfa(ACCOUNT_ID, 'user_recovery', originalCodes[1]);

    expect(repository.deleted).toContain('user_recovery');
    expect(await service.isMfaActive(ACCOUNT_ID, 'user_recovery')).toBe(false);
  });

  it('regenerates recovery codes with timestamp and rejects invalid disable attempts', async () => {
    const setup = await service.initiateSetup(ACCOUNT_ID, 'user_rotate', 'rotate@example.com');
    await service.confirmSetup(ACCOUNT_ID, 'user_rotate', generateValidTotp(setup.secret));

    const regenerated = await service.regenerateRecoveryCodes(ACCOUNT_ID, 'user_rotate');
    const stored = repository.records.get(`${ACCOUNT_ID}:user_rotate`);

    expect(regenerated).toHaveLength(8);
    expect(stored?.lastRecoveryCodesRegeneratedAt).toBeDefined();
    expect(stored?.recoveryCodes).toEqual(regenerated.map(hashRecoveryCode));

    await expect(service.disableMfa(ACCOUNT_ID, 'user_rotate', 'BAD-CODE')).rejects.toThrow(
      'Invalid TOTP code or recovery code.'
    );
  });

  it('returns safe fallbacks when no repository is configured or MFA is inactive', async () => {
    const stateless = new MfaService();

    expect(await stateless.verifyLogin(ACCOUNT_ID, 'missing_user', '123456')).toBe(false);
    expect(await stateless.isMfaActive(ACCOUNT_ID, 'missing_user')).toBe(false);
    await expect(stateless.regenerateRecoveryCodes(ACCOUNT_ID, 'missing_user')).rejects.toThrow(
      'MFA is not configured for this user.'
    );

    repository.records.set(`${ACCOUNT_ID}:user_inactive`, {
      credentialId: '00000000-0000-4000-8000-000000000005',
      accountId: ACCOUNT_ID,
      userId: 'user_inactive',
      secret: 'ANYSECRET',
      isActive: false,
      recoveryCodes: [],
      createdAt: '2026-04-18T00:00:00.000Z'
    });

    expect(await service.verifyLogin(ACCOUNT_ID, 'user_inactive', '123456')).toBe(false);
  });
});
