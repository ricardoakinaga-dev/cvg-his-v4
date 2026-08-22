import { beforeEach, describe, expect, it } from 'vitest';
import type { MfaRecord, MfaRepository } from './repositories/mfa-repository.interface.js';
import { MfaService, CRITICAL_ROLES } from './service.js';
import {
  generateSecret,
  generateRecoveryCodes,
  generateProvisioningUri,
  verifyTOTP
} from './totp.js';
import { encrypt, decrypt, validateMasterKey } from './crypto.js';
import { InMemoryMfaRepository as ProductionInMemoryMfaRepository } from './repositories/in-memory-mfa.repository.js';

const ACCOUNT_ID = '00000000-0000-4000-8000-000000000001';

class InMemoryMfaRepository implements MfaRepository {
  readonly records = new Map<string, MfaRecord>();
  beforeConsume?: () => void;

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
    if (
      !existing ||
      existing.credentialId !== credentialId ||
      existing.isActive ||
      !existing.setupExpiresAt ||
      new Date(existing.setupExpiresAt).getTime() <= new Date(activatedAt).getTime()
    ) return undefined;
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
    this.records.set(key, {
      ...record,
      lastUsedAt: existing?.lastUsedAt,
      lastTotpCounter: existing?.lastTotpCounter,
      recoveryCodes: [...record.recoveryCodes]
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
    const beforeConsume = this.beforeConsume;
    this.beforeConsume = undefined;
    beforeConsume?.();
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
    return this.records.delete(key);
  }
}

describe('MfaService', () => {
  let repo: InMemoryMfaRepository;
  let service: MfaService;
  let nowMs: number;
  const ENCRYPTION_KEY = 'test-mfa-encryption-key-for-unit-tests';

  beforeEach(() => {
    nowMs = Date.now();
    repo = new InMemoryMfaRepository();
    service = new MfaService({
      repository: repo,
      encryptionKey: ENCRYPTION_KEY,
      clock: () => nowMs
    });
  });

  describe('isMfaRequired', () => {
    it('returns true when user has admin role', () => {
      expect(MfaService.prototype.isMfaRequired(['admin'])).toBe(true);
    });

    it('returns true when user has finance role', () => {
      expect(MfaService.prototype.isMfaRequired(['finance'])).toBe(true);
    });

    it('returns true when user has auditor role', () => {
      expect(MfaService.prototype.isMfaRequired(['auditor'])).toBe(true);
    });

    it('returns false when user has only non-critical roles', () => {
      expect(MfaService.prototype.isMfaRequired(['vet'])).toBe(false);
      expect(MfaService.prototype.isMfaRequired(['staff'])).toBe(false);
    });

    it('returns false for empty roles array', () => {
      expect(MfaService.prototype.isMfaRequired([])).toBe(false);
    });

    it('returns true when user has critical role among others', () => {
      expect(MfaService.prototype.isMfaRequired(['vet', 'admin', 'staff'])).toBe(true);
    });
  });

  describe('initiateSetup', () => {
    it('writes new credentials with the current key version during rotation', async () => {
      const v1Key = 'test-mfa-encryption-key-version-one';
      const v2Key = 'test-mfa-encryption-key-version-two';
      const rotatingService = new MfaService({
        repository: repo,
        encryptionKey: v2Key,
        encryptionKeyVersion: 'v2',
        encryptionKeyring: { v1: v1Key },
        clock: () => nowMs
      });

      const setup = await rotatingService.initiateSetup(
        ACCOUNT_ID,
        'user_current_key',
        'user@example.com'
      );

      const pending = await repo.findByUserId(ACCOUNT_ID, 'user_current_key');
      expect(pending?.secretKeyVersion).toBe('v2');
      expect(decrypt(pending!.secret, v2Key)).toBe(setup.secret);
    });

    it('returns secret, provisioning URI, and recovery codes', async () => {
      const result = await service.initiateSetup(ACCOUNT_ID, 'user_123', 'user@example.com');

      expect(result.secret).toBeDefined();
      expect(result.secret.length).toBeGreaterThan(0);
      expect(result.provisioningUri).toContain('otpauth://totp/');
      expect(result.provisioningUri).toContain('CVG-HIS-V2');
      expect(result.recoveryCodes).toHaveLength(8);
    });

    it('stores pending setup in memory', async () => {
      const result = await service.initiateSetup(ACCOUNT_ID, 'user_123', 'user@example.com');

      const pending = await service.initiateSetup(ACCOUNT_ID, 'user_123', 'user@example.com');
      expect(pending.secret).toBeDefined();
      expect(pending.recoveryCodes).toHaveLength(8);
    });

    it('uses custom issuer when provided', async () => {
      const result = await service.initiateSetup(
        ACCOUNT_ID,
        'user_123',
        'user@example.com',
        'CustomApp'
      );

      expect(result.provisioningUri).toContain('CustomApp');
    });
  });

  describe('confirmSetup', () => {
    it('confirms setup and returns record with decrypted secret', async () => {
      const setup = await service.initiateSetup(ACCOUNT_ID, 'user_123', 'user@example.com');
      const token = generateCurrentTOTP(setup.secret);

      const record = await service.confirmSetup(ACCOUNT_ID, 'user_123', token);

      expect(record.userId).toBe('user_123');
      expect(record.isActive).toBe(true);
      expect(setup.recoveryCodes).toHaveLength(8);
    });

    it('persists encrypted secret to repository', async () => {
      const setup = await service.initiateSetup(ACCOUNT_ID, 'user_123', 'user@example.com');
      const token = generateCurrentTOTP(setup.secret);

      await service.confirmSetup(ACCOUNT_ID, 'user_123', token);

      const persisted = await repo.findByUserId(ACCOUNT_ID, 'user_123');
      expect(persisted).toBeDefined();
      expect(persisted?.isActive).toBe(true);
      expect(persisted?.secret).not.toBe(setup.secret);
    });

    it('throws when no pending setup exists', async () => {
      await expect(service.confirmSetup(ACCOUNT_ID, 'user_123', '000000')).rejects.toThrow(
        'No pending MFA setup found'
      );
    });

    it('throws when TOTP token is invalid', async () => {
      const setup = await service.initiateSetup(ACCOUNT_ID, 'user_123', 'user@example.com');

      await expect(service.confirmSetup(ACCOUNT_ID, 'user_123', '000000')).rejects.toThrow(
        'Invalid TOTP code'
      );
    });

    it('clears pending setup after confirmation', async () => {
      const setup = await service.initiateSetup(ACCOUNT_ID, 'user_123', 'user@example.com');
      const token = generateCurrentTOTP(setup.secret);

      await service.confirmSetup(ACCOUNT_ID, 'user_123', token);

      await expect(service.confirmSetup(ACCOUNT_ID, 'user_123', token)).rejects.toThrow(
        'No pending MFA setup found'
      );
    });

    it('rejects an expired persisted setup', async () => {
      const setup = await service.initiateSetup(ACCOUNT_ID, 'user_123', 'user@example.com');
      nowMs += 10 * 60 * 1000 + 1;

      await expect(
        service.confirmSetup(
          ACCOUNT_ID,
          'user_123',
          generateCurrentTOTP(setup.secret, nowMs)
        )
      ).rejects.toThrow('No pending MFA setup found');
      await expect(service.isMfaActive(ACCOUNT_ID, 'user_123')).resolves.toBe(false);
    });
  });

  describe('verifyLogin', () => {
    it('decrypts a v1 credential while v2 is the current write key', async () => {
      const v1Key = 'test-mfa-encryption-key-version-one';
      const v2Key = 'test-mfa-encryption-key-version-two';
      const secret = generateSecret();
      await repo.create({
        credentialId: '00000000-0000-4000-8000-000000000030',
        accountId: ACCOUNT_ID,
        userId: 'user_rotating_key',
        secret: encrypt(secret, v1Key),
        secretKeyVersion: 'v1',
        isActive: true,
        recoveryCodes: [],
        createdAt: new Date(nowMs).toISOString()
      });
      const rotatingService = new MfaService({
        repository: repo,
        encryptionKey: v2Key,
        encryptionKeyVersion: 'v2',
        encryptionKeyring: { v1: v1Key },
        clock: () => nowMs
      });

      await expect(
        rotatingService.verifyLogin(
          ACCOUNT_ID,
          'user_rotating_key',
          generateCurrentTOTP(secret, nowMs)
        )
      ).resolves.toBe(true);
    });

    it('fails closed when a credential references an unknown key version', async () => {
      const v1Key = 'test-mfa-encryption-key-version-one';
      const v2Key = 'test-mfa-encryption-key-version-two';
      const secret = generateSecret();
      await repo.create({
        credentialId: '00000000-0000-4000-8000-000000000031',
        accountId: ACCOUNT_ID,
        userId: 'user_unknown_key',
        secret: encrypt(secret, v1Key),
        secretKeyVersion: 'retired-version',
        isActive: true,
        recoveryCodes: [],
        createdAt: new Date(nowMs).toISOString()
      });
      const rotatingService = new MfaService({
        repository: repo,
        encryptionKey: v2Key,
        encryptionKeyVersion: 'v2',
        encryptionKeyring: { v1: v1Key },
        clock: () => nowMs
      });

      await expect(
        rotatingService.verifyLogin(
          ACCOUNT_ID,
          'user_unknown_key',
          generateCurrentTOTP(secret, nowMs)
        )
      ).rejects.toThrow('MFA credential encryption key is unavailable');
      const unchanged = await repo.findByUserId(ACCOUNT_ID, 'user_unknown_key');
      expect(unchanged?.lastTotpCounter).toBeUndefined();
      expect(unchanged?.lastUsedAt).toBeUndefined();
    });

    it('verifies login with valid TOTP for confirmed user', async () => {
      const setup = await service.initiateSetup(ACCOUNT_ID, 'user_123', 'user@example.com');
      const token = generateCurrentTOTP(setup.secret);
      await service.confirmSetup(ACCOUNT_ID, 'user_123', token);
      await expect(service.verifyLogin(ACCOUNT_ID, 'user_123', token)).resolves.toBe(false);
      nowMs += 30_000;

      const result = await service.verifyLogin(
        ACCOUNT_ID,
        'user_123',
        generateCurrentTOTP(setup.secret, nowMs)
      );

      expect(result).toBe(true);
    });

    it('rejects replay of an already accepted TOTP counter', async () => {
      const setup = await service.initiateSetup(ACCOUNT_ID, 'user_123', 'user@example.com');
      const token = generateCurrentTOTP(setup.secret);
      await service.confirmSetup(ACCOUNT_ID, 'user_123', token);
      nowMs += 30_000;
      const nextToken = generateCurrentTOTP(setup.secret, nowMs);

      await expect(service.verifyLogin(ACCOUNT_ID, 'user_123', nextToken)).resolves.toBe(true);
      await expect(service.verifyLogin(ACCOUNT_ID, 'user_123', nextToken)).resolves.toBe(false);
    });

    it('does not reuse a login TOTP to disable the active factor', async () => {
      const setup = await service.initiateSetup(ACCOUNT_ID, 'user_123', 'user@example.com');
      const token = generateCurrentTOTP(setup.secret);
      await service.confirmSetup(ACCOUNT_ID, 'user_123', token);
      nowMs += 30_000;
      const nextToken = generateCurrentTOTP(setup.secret, nowMs);
      await expect(service.verifyLogin(ACCOUNT_ID, 'user_123', nextToken)).resolves.toBe(true);

      await expect(service.disableMfa(ACCOUNT_ID, 'user_123', nextToken)).rejects.toThrow(
        'Invalid TOTP code or recovery code'
      );
      await expect(service.isMfaActive(ACCOUNT_ID, 'user_123')).resolves.toBe(true);
    });

    it('accepts a TOTP counter exactly once across concurrent service instances', async () => {
      const setup = await service.initiateSetup(ACCOUNT_ID, 'user_123', 'user@example.com');
      const token = generateCurrentTOTP(setup.secret);
      await service.confirmSetup(ACCOUNT_ID, 'user_123', token);
      nowMs += 30_000;
      const nextToken = generateCurrentTOTP(setup.secret, nowMs);
      const secondService = new MfaService({
        repository: repo,
        encryptionKey: ENCRYPTION_KEY,
        clock: () => nowMs
      });

      const results = await Promise.all([
        service.verifyLogin(ACCOUNT_ID, 'user_123', nextToken),
        secondService.verifyLogin(ACCOUNT_ID, 'user_123', nextToken)
      ]);

      expect(results.filter(Boolean)).toHaveLength(1);
    });

    it('does not consume a token validated against a credential replaced before CAS', async () => {
      const setup = await service.initiateSetup(ACCOUNT_ID, 'user_123', 'user@example.com');
      const token = generateCurrentTOTP(setup.secret);
      await service.confirmSetup(ACCOUNT_ID, 'user_123', token);
      const key = `${ACCOUNT_ID}:user_123`;
      const original = repo.records.get(key);
      expect(original).toBeDefined();
      repo.beforeConsume = () => {
        repo.records.set(
          key,
          {
            ...original!,
            credentialId: '00000000-0000-4000-8000-000000000002',
            lastTotpCounter: undefined
          }
        );
      };

      await expect(service.verifyLogin(ACCOUNT_ID, 'user_123', token)).resolves.toBe(false);
    });

    it('does not let a pending replacement secret bypass an active factor', async () => {
      const activeSetup = await service.initiateSetup(
        ACCOUNT_ID,
        'user_123',
        'user@example.com'
      );
      await service.confirmSetup(
        ACCOUNT_ID,
        'user_123',
        generateCurrentTOTP(activeSetup.secret)
      );
      await expect(
        service.initiateSetup(ACCOUNT_ID, 'user_123', 'user@example.com')
      ).rejects.toThrow('MFA is already active');
    });

    it('returns false for non-existent user', async () => {
      const result = await service.verifyLogin(ACCOUNT_ID, 'nonexistent', '000000');

      expect(result).toBe(false);
    });

    it('returns false for inactive MFA', async () => {
      await repo.create({
        credentialId: '00000000-0000-4000-8000-000000000003',
        accountId: ACCOUNT_ID,
        userId: 'user_inactive',
        secret: 'SECRET',
        isActive: false,
        recoveryCodes: [],
        createdAt: new Date().toISOString()
      });

      const result = await service.verifyLogin(ACCOUNT_ID, 'user_inactive', '000000');

      expect(result).toBe(false);
    });

    it('returns false for wrong TOTP', async () => {
      const setup = await service.initiateSetup(ACCOUNT_ID, 'user_123', 'user@example.com');
      const token = generateCurrentTOTP(setup.secret);
      await service.confirmSetup(ACCOUNT_ID, 'user_123', token);

      const result = await service.verifyLogin(ACCOUNT_ID, 'user_123', '000000');

      expect(result).toBe(false);
    });

    it('rejects login until pending setup is confirmed', async () => {
      const setup = await service.initiateSetup(ACCOUNT_ID, 'user_123', 'user@example.com');
      const token = generateCurrentTOTP(setup.secret);

      const result = await service.verifyLogin(ACCOUNT_ID, 'user_123', token);

      expect(result).toBe(false);
    });

    it('rejects pending setup with wrong token', async () => {
      const setup = await service.initiateSetup(ACCOUNT_ID, 'user_123', 'user@example.com');

      const result = await service.verifyLogin(ACCOUNT_ID, 'user_123', '000000');

      expect(result).toBe(false);
    });

    it('updates lastUsedAt after successful verification', async () => {
      const setup = await service.initiateSetup(ACCOUNT_ID, 'user_123', 'user@example.com');
      const token = generateCurrentTOTP(setup.secret);
      await service.confirmSetup(ACCOUNT_ID, 'user_123', token);
      nowMs += 30_000;

      await service.verifyLogin(
        ACCOUNT_ID,
        'user_123',
        generateCurrentTOTP(setup.secret, nowMs)
      );

      const record = await repo.findByUserId(ACCOUNT_ID, 'user_123');
      expect(record?.lastUsedAt).toBeDefined();
    });
  });

  describe('isMfaActive', () => {
    it('returns true for active MFA user', async () => {
      const setup = await service.initiateSetup(ACCOUNT_ID, 'user_123', 'user@example.com');
      const token = generateCurrentTOTP(setup.secret);
      await service.confirmSetup(ACCOUNT_ID, 'user_123', token);

      const result = await service.isMfaActive(ACCOUNT_ID, 'user_123');

      expect(result).toBe(true);
    });

    it('returns false for user without MFA', async () => {
      const result = await service.isMfaActive(ACCOUNT_ID, 'nonexistent');

      expect(result).toBe(false);
    });

    it('does not expose an active credential to another account', async () => {
      const setup = await service.initiateSetup(ACCOUNT_ID, 'user_123', 'user@example.com');
      await service.confirmSetup(ACCOUNT_ID, 'user_123', generateCurrentTOTP(setup.secret));

      await expect(
        service.isMfaActive('00000000-0000-4000-8000-000000000002', 'user_123')
      ).resolves.toBe(false);
    });

    it('returns false for inactive MFA user', async () => {
      await repo.create({
        credentialId: '00000000-0000-4000-8000-000000000004',
        accountId: ACCOUNT_ID,
        userId: 'user_inactive',
        secret: 'SECRET',
        isActive: false,
        recoveryCodes: [],
        createdAt: new Date().toISOString()
      });

      const result = await service.isMfaActive(ACCOUNT_ID, 'user_inactive');

      expect(result).toBe(false);
    });
  });

  describe('disableMfa', () => {
    it('disables MFA with valid TOTP', async () => {
      const setup = await service.initiateSetup(ACCOUNT_ID, 'user_123', 'user@example.com');
      const token = generateCurrentTOTP(setup.secret, nowMs);
      await service.confirmSetup(ACCOUNT_ID, 'user_123', token);
      nowMs += 30_000;

      await service.disableMfa(
        ACCOUNT_ID,
        'user_123',
        generateCurrentTOTP(setup.secret, nowMs)
      );

      const record = await repo.findByUserId(ACCOUNT_ID, 'user_123');
      expect(record).toBeUndefined();
    });

    it('throws when MFA not configured', async () => {
      const setup = await service.initiateSetup(ACCOUNT_ID, 'user_123', 'user@example.com');
      const token = generateCurrentTOTP(setup.secret);

      await expect(service.disableMfa(ACCOUNT_ID, 'user_nonexistent', token)).rejects.toThrow(
        'MFA is not configured'
      );
    });

    it('throws when token is invalid', async () => {
      const setup = await service.initiateSetup(ACCOUNT_ID, 'user_123', 'user@example.com');
      const token = generateCurrentTOTP(setup.secret);
      await service.confirmSetup(ACCOUNT_ID, 'user_123', token);

      await expect(service.disableMfa(ACCOUNT_ID, 'user_123', '000000')).rejects.toThrow(
        'Invalid TOTP code'
      );
    });
  });

  describe('regenerateRecoveryCodes', () => {
    it('returns new recovery codes and persists hashed versions', async () => {
      const setup = await service.initiateSetup(ACCOUNT_ID, 'user_123', 'user@example.com');
      const token = generateCurrentTOTP(setup.secret);
      await service.confirmSetup(ACCOUNT_ID, 'user_123', token);
      const originalCodes = setup.recoveryCodes;

      const newCodes = await service.regenerateRecoveryCodes(ACCOUNT_ID, 'user_123');

      expect(newCodes).toHaveLength(8);
      expect(newCodes).not.toEqual(originalCodes);

      const record = await repo.findByUserId(ACCOUNT_ID, 'user_123');
      expect(record?.recoveryCodes).toHaveLength(8);
    });

    it('throws when MFA not configured', async () => {
      await expect(service.regenerateRecoveryCodes(ACCOUNT_ID, 'nonexistent')).rejects.toThrow(
        'MFA is not configured'
      );
    });
  });

  describe('MfaService without repository', () => {
    it('initiateSetup works without repository', async () => {
      const noRepo = new MfaService();
      const result = await noRepo.initiateSetup(ACCOUNT_ID, 'user_no_repo', 'test@example.com');

      expect(result.secret).toBeDefined();
    });

    it('verifyLogin returns false without repository (no record)', async () => {
      const noRepo = new MfaService();

      const result = await noRepo.verifyLogin(ACCOUNT_ID, 'user_no_repo', '000000');

      expect(result).toBe(false);
    });

    it('isMfaActive returns false without repository', async () => {
      const noRepo = new MfaService();

      const result = await noRepo.isMfaActive(ACCOUNT_ID, 'user_no_repo');

      expect(result).toBe(false);
    });

    it('confirmSetup does not persist without repository', async () => {
      const noRepo = new MfaService();
      const setup = await noRepo.initiateSetup(ACCOUNT_ID, 'user_no_repo', 'test@example.com');
      const token = generateCurrentTOTP(setup.secret);

      const record = await noRepo.confirmSetup(ACCOUNT_ID, 'user_no_repo', token);

      expect(record.userId).toBe('user_no_repo');
    });

    it('disableMfa throws without repository (no record to delete)', async () => {
      const noRepo = new MfaService();
      const setup = await noRepo.initiateSetup(ACCOUNT_ID, 'user_no_repo', 'test@example.com');
      const token = generateCurrentTOTP(setup.secret);
      await noRepo.confirmSetup(ACCOUNT_ID, 'user_no_repo', token);

      await expect(noRepo.disableMfa(ACCOUNT_ID, 'user_no_repo', token)).rejects.toThrow(
        'MFA is not configured'
      );
    });

    it('regenerateRecoveryCodes throws without repository (no record to update)', async () => {
      const noRepo = new MfaService();
      const setup = await noRepo.initiateSetup(ACCOUNT_ID, 'user_no_repo', 'test@example.com');
      const token = generateCurrentTOTP(setup.secret);
      await noRepo.confirmSetup(ACCOUNT_ID, 'user_no_repo', token);

      await expect(noRepo.regenerateRecoveryCodes(ACCOUNT_ID, 'user_no_repo')).rejects.toThrow(
        'MFA is not configured'
      );
    });
  });
});

describe('InMemoryMfaRepository audit fields', () => {
  it('does not regress lastUsedAt when a stale generic update is persisted', async () => {
    const repository = new ProductionInMemoryMfaRepository();
    const currentLastUsedAt = '2026-08-22T12:00:00.000Z';
    const staleRecord: MfaRecord = {
      credentialId: '00000000-0000-4000-8000-000000000020',
      accountId: ACCOUNT_ID,
      userId: 'user_audit',
      secret: 'SECRET',
      isActive: true,
      recoveryCodes: ['old-code'],
      createdAt: '2026-08-22T10:00:00.000Z',
      lastUsedAt: '2026-08-22T11:00:00.000Z'
    };
    await repository.create({ ...staleRecord, lastUsedAt: currentLastUsedAt });

    await repository.update({ ...staleRecord, recoveryCodes: ['new-code'] });

    await expect(repository.findByUserId(ACCOUNT_ID, 'user_audit')).resolves.toMatchObject({
      recoveryCodes: ['new-code'],
      lastUsedAt: currentLastUsedAt
    });
  });
});

describe('TOTP functions', () => {
  describe('generateSecret', () => {
    it('generates a base32 string of default length', () => {
      const secret = generateSecret();
      expect(secret.length).toBeGreaterThan(0);
      expect(secret).toMatch(/^[A-Z2-7]+$/);
    });

    it('generates secret of specified length', () => {
      const secret = generateSecret(10);
      expect(secret.length).toBeGreaterThan(0);
    });
  });

  describe('generateRecoveryCodes', () => {
    it('generates 8 codes by default', () => {
      const codes = generateRecoveryCodes();
      expect(codes).toHaveLength(8);
    });

    it('generates specified number of codes', () => {
      const codes = generateRecoveryCodes(4);
      expect(codes).toHaveLength(4);
    });

    it('codes contain dash separator', () => {
      const codes = generateRecoveryCodes();
      expect(codes[0]).toContain('-');
    });
  });

  describe('generateProvisioningUri', () => {
    it('generates valid otpauth URI', () => {
      const secret = generateSecret();
      const uri = generateProvisioningUri(secret, 'user@example.com', 'CVG-HIS-V2');

      expect(uri).toContain('otpauth://totp/');
      expect(uri).toContain('secret=');
      expect(uri).toContain('algorithm=SHA1');
      expect(uri).toContain('digits=6');
      expect(uri).toContain('period=30');
    });
  });

  describe('verifyTOTP', () => {
    it('verifies valid token', () => {
      const secret = generateSecret();
      const token = generateCurrentTOTP(secret);

      expect(verifyTOTP(secret, token)).toBe(true);
    });

    it('rejects invalid token', () => {
      const secret = generateSecret();

      expect(verifyTOTP(secret, '000000')).toBe(false);
    });

    it('rejects token with wrong length', () => {
      const secret = generateSecret();

      expect(verifyTOTP(secret, '12345')).toBe(false);
      expect(verifyTOTP(secret, '1234567')).toBe(false);
    });

    it('accepts token within window', () => {
      const secret = generateSecret();
      const token = generateCurrentTOTP(secret);

      expect(verifyTOTP(secret, token, 1)).toBe(true);
    });
  });
});

describe('Crypto functions', () => {
  describe('encrypt/decrypt roundtrip', () => {
    it('encrypts and decrypts a secret', () => {
      const plaintext = 'JBSWY3DPEHPK3PXP';
      const key = 'test-master-key-for-encrypt';

      const ciphertext = encrypt(plaintext, key);
      expect(ciphertext).not.toBe(plaintext);

      const decrypted = decrypt(ciphertext, key);
      expect(decrypted).toBe(plaintext);
    });

    it('throws on invalid ciphertext format', () => {
      expect(() => decrypt('invalid', 'key')).toThrow('Invalid ciphertext format');
    });
  });

  describe('validateMasterKey', () => {
    it('throws for undefined key', () => {
      expect(() => validateMasterKey(undefined)).toThrow('at least 16 characters');
    });

    it('throws for key shorter than 16 chars', () => {
      expect(() => validateMasterKey('short')).toThrow('at least 16 characters');
    });

    it('accepts key of 16+ chars', () => {
      expect(() => validateMasterKey('1234567890123456')).not.toThrow();
    });
  });
});

function generateCurrentTOTP(secret: string, nowMs = Date.now()): string {
  const TOTP_DIGITS = 6;
  const TOTP_PERIOD = 30;
  const counter = Math.floor(nowMs / 1000 / TOTP_PERIOD);
  const key = base32ToBuffer(secret);
  const counterBuffer = Buffer.alloc(8);
  counterBuffer.writeBigUInt64BE(BigInt(counter));
  const hash = createHmac('sha1', key).update(counterBuffer).digest();
  const offset = hash[hash.length - 1] & 0x0f;
  const binary =
    ((hash[offset] & 0x7f) << 24) |
    ((hash[offset + 1] & 0xff) << 16) |
    ((hash[offset + 2] & 0xff) << 8) |
    (hash[offset + 3] & 0xff);
  const otp = binary % 10 ** TOTP_DIGITS;
  return otp.toString().padStart(TOTP_DIGITS, '0');
}

function createHmac(algorithm: string, key: Buffer) {
  const { createHmac } = require('node:crypto');
  return createHmac(algorithm, key);
}

function base32ToBuffer(base32: string): Buffer {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  const clean = base32.toUpperCase().replace(/=/g, '');
  for (const char of clean) {
    const index = alphabet.indexOf(char);
    if (index === -1) continue;
    bits += index.toString(2).padStart(5, '0');
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}
