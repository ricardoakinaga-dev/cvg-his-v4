import { createHash, createHmac } from 'node:crypto';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { MfaRecord, MfaRepository } from '../../../packages/modules/mfa/src/service.js';
import { MfaService } from '../../../packages/modules/mfa/src/service.js';
import { decrypt } from '../../../packages/modules/mfa/src/crypto.js';

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const ENCRYPTION_KEY = 'coverage-mfa-encryption-key-32chars';

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

  async findByUserId(userId: string): Promise<MfaRecord | undefined> {
    return this.records.get(userId);
  }

  async create(record: MfaRecord): Promise<void> {
    this.records.set(record.userId, record);
  }

  async update(record: MfaRecord): Promise<void> {
    this.updated.push(record);
    this.records.set(record.userId, record);
  }

  async delete(userId: string): Promise<void> {
    this.deleted.push(userId);
    this.records.delete(userId);
  }
}

describe('MfaService coverage guard', () => {
  let repository: InMemoryMfaRepository;
  let service: MfaService;

  beforeEach(() => {
    repository = new InMemoryMfaRepository();
    service = new MfaService({ repository, encryptionKey: ENCRYPTION_KEY });
  });

  it('confirms setup with encrypted persistence and clears pending setup state', async () => {
    const setup = await service.initiateSetup('user_secure', 'secure@example.com');
    const token = generateValidTotp(setup.secret);

    const confirmed = await service.confirmSetup('user_secure', token);

    const persisted = repository.records.get('user_secure');
    expect(confirmed.secret).toBe(setup.secret);
    expect(confirmed.recoveryCodes).toEqual(setup.recoveryCodes);
    expect(persisted).toBeDefined();
    expect(persisted?.secret).not.toBe(setup.secret);
    expect(decrypt(persisted!.secret, ENCRYPTION_KEY)).toBe(setup.secret);
    expect(persisted?.recoveryCodes).toEqual(setup.recoveryCodes.map(hashRecoveryCode));

    await expect(service.confirmSetup('user_secure', token)).rejects.toThrow(
      'No pending MFA setup found'
    );
  });

  it('verifies pending setup tokens before confirmation and rejects invalid pending tokens', async () => {
    const setup = await service.initiateSetup('user_pending', 'pending@example.com');

    expect(await service.verifyLogin('user_pending', generateValidTotp(setup.secret))).toBe(true);
    expect(await service.verifyLogin('user_pending', '000000')).toBe(false);
  });

  it('verifies stored TOTP logins and updates lastUsedAt in repository', async () => {
    const setup = await service.initiateSetup('user_totp', 'totp@example.com');
    await service.confirmSetup('user_totp', generateValidTotp(setup.secret));

    const verified = await service.verifyLogin('user_totp', generateValidTotp(setup.secret));

    expect(verified).toBe(true);
    expect(repository.updated.at(-1)?.userId).toBe('user_totp');
    expect(repository.updated.at(-1)?.lastUsedAt).toBeDefined();
  });

  it('accepts recovery codes, consumes them and supports disabling MFA with recovery fallback', async () => {
    const setup = await service.initiateSetup('user_recovery', 'recovery@example.com');
    await service.confirmSetup('user_recovery', generateValidTotp(setup.secret));

    const originalCodes = setup.recoveryCodes;
    const loginVerified = await service.verifyLogin('user_recovery', originalCodes[0]);

    expect(loginVerified).toBe(true);
    await vi.waitFor(() => {
      expect(repository.records.get('user_recovery')?.recoveryCodes).toHaveLength(
        originalCodes.length - 1
      );
    });

    const remainingRecord = repository.records.get('user_recovery');
    expect(remainingRecord?.recoveryCodes).not.toContain(hashRecoveryCode(originalCodes[0]));

    await service.disableMfa('user_recovery', originalCodes[1]);

    expect(repository.deleted).toContain('user_recovery');
    expect(await service.isMfaActive('user_recovery')).toBe(false);
  });

  it('regenerates recovery codes with timestamp and rejects invalid disable attempts', async () => {
    const setup = await service.initiateSetup('user_rotate', 'rotate@example.com');
    await service.confirmSetup('user_rotate', generateValidTotp(setup.secret));

    const regenerated = await service.regenerateRecoveryCodes('user_rotate');
    const stored = repository.records.get('user_rotate');

    expect(regenerated).toHaveLength(8);
    expect(stored?.lastRecoveryCodesRegeneratedAt).toBeDefined();
    expect(stored?.recoveryCodes).toEqual(regenerated.map(hashRecoveryCode));

    await expect(service.disableMfa('user_rotate', 'BAD-CODE')).rejects.toThrow(
      'Invalid TOTP code or recovery code.'
    );
  });

  it('returns safe fallbacks when no repository is configured or MFA is inactive', async () => {
    const stateless = new MfaService();

    expect(await stateless.verifyLogin('missing_user', '123456')).toBe(false);
    expect(await stateless.isMfaActive('missing_user')).toBe(false);
    await expect(stateless.regenerateRecoveryCodes('missing_user')).rejects.toThrow(
      'MFA is not configured for this user.'
    );

    repository.records.set('user_inactive', {
      userId: 'user_inactive',
      secret: 'ANYSECRET',
      isActive: false,
      recoveryCodes: [],
      createdAt: '2026-04-18T00:00:00.000Z'
    });

    expect(await service.verifyLogin('user_inactive', '123456')).toBe(false);
  });
});
