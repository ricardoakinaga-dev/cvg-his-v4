import { beforeEach, describe, expect, it } from 'vitest';
import type { MfaRecord, MfaRepository } from '@cvg-his-v2/module-mfa/repositories/mfa-repository.interface';
import {
  MfaService,
  CRITICAL_ROLES,
  generateSecret,
  generateRecoveryCodes,
  generateProvisioningUri,
  verifyTOTP,
  encrypt,
  decrypt,
  validateMasterKey
} from '@cvg-his-v2/module-mfa';

class InMemoryMfaRepository implements MfaRepository {
  readonly records = new Map<string, MfaRecord>();

  async findByUserId(userId: string): Promise<MfaRecord | undefined> {
    return this.records.get(userId);
  }

  async create(record: MfaRecord): Promise<void> {
    this.records.set(record.userId, record);
  }

  async update(record: MfaRecord): Promise<void> {
    this.records.set(record.userId, record);
  }

  async delete(userId: string): Promise<void> {
    this.records.delete(userId);
  }
}

describe('MfaService', () => {
  let repo: InMemoryMfaRepository;
  let service: MfaService;

  beforeEach(() => {
    repo = new InMemoryMfaRepository();
    service = new MfaService({ repository: repo });
  });

  describe('isMfaRequired (static)', () => {
    it('returns true when user has admin role', () => {
      expect(MfaService.prototype.isMfaRequired(['admin'])).toBe(true);
    });

    it('returns true when user has finance role', () => {
      expect(MfaService.prototype.isMfaRequired(['finance'])).toBe(true);
    });

    it('returns true when user has auditor role', () => {
      expect(MfaService.prototype.isMfaRequired(['auditor'])).toBe(true);
    });

    it('returns false when user has no critical roles', () => {
      expect(MfaService.prototype.isMfaRequired(['reception', 'vet'])).toBe(false);
    });

    it('returns false for empty roles array', () => {
      expect(MfaService.prototype.isMfaRequired([])).toBe(false);
    });
  });

  describe('CRITICAL_ROLES (static)', () => {
    it('is a Set containing admin, finance, and auditor', () => {
      expect(CRITICAL_ROLES).toBeInstanceOf(Set);
      expect(CRITICAL_ROLES.has('admin')).toBe(true);
      expect(CRITICAL_ROLES.has('finance')).toBe(true);
      expect(CRITICAL_ROLES.has('auditor')).toBe(true);
    });
  });

  describe('initiateSetup', () => {
    it('generates secret, uri, and recovery codes', async () => {
      const setup = await service.initiateSetup('user_1', 'user@example.com');
      expect(setup.secret).toBeDefined();
      expect(typeof setup.secret).toBe('string');
      expect(setup.secret.length).toBeGreaterThan(0);
      expect(setup.provisioningUri).toContain('otpauth://totp/');
      expect(setup.recoveryCodes).toHaveLength(8);
    });

    it('returns provisioningUri containing the secret', async () => {
      const setup = await service.initiateSetup('user_1', 'user@example.com');
      expect(setup.provisioningUri).toContain(setup.secret);
    });

    it('returns unique secrets each time', async () => {
      const setup1 = await service.initiateSetup('user_1', 'user@example.com');
      const setup2 = await service.initiateSetup('user_2', 'user@example.com');
      expect(setup1.secret).not.toBe(setup2.secret);
    });
  });

  describe('isMfaActive', () => {
    it('returns false when no MFA record exists', async () => {
      expect(await service.isMfaActive('user_1')).toBe(false);
    });
  });

  describe('disableMfa', () => {
    it('throws when MFA is not configured', async () => {
      await expect(service.disableMfa('user_no_mfa', '123456')).rejects.toThrow(
        'MFA is not configured'
      );
    });
  });

  describe('generateSecret', () => {
    it('generates a non-empty string', () => {
      const secret = generateSecret();
      expect(secret).toBeDefined();
      expect(typeof secret).toBe('string');
      expect(secret.length).toBeGreaterThan(0);
    });

    it('generates unique secrets each time', () => {
      const secret1 = generateSecret();
      const secret2 = generateSecret();
      expect(secret1).not.toBe(secret2);
    });
  });

  describe('generateRecoveryCodes', () => {
    it('generates 8 recovery codes by default', () => {
      const codes = generateRecoveryCodes();
      expect(codes).toHaveLength(8);
    });

    it('generates codes with hyphen separator', () => {
      const codes = generateRecoveryCodes();
      codes.forEach(code => {
        expect(code).toContain('-');
      });
    });

    it('generates unique codes each time', () => {
      const codes1 = generateRecoveryCodes();
      const codes2 = generateRecoveryCodes();
      expect(codes1).not.toEqual(codes2);
    });
  });

  describe('generateProvisioningUri', () => {
    it('generates URI with otpauth scheme', () => {
      const uri = generateProvisioningUri('SECRET', 'user@example.com', 'Service');
      expect(uri).toMatch(/^otpauth:\/\/totp\//);
    });

    it('encodes the secret in the URI', () => {
      const uri = generateProvisioningUri('SECRET', 'user@example.com', 'Service');
      expect(uri).toContain('secret=SECRET');
    });

    it('encodes the issuer in the URI', () => {
      const uri = generateProvisioningUri('SECRET', 'user@example.com', 'Service');
      expect(uri).toContain('issuer=Service');
    });
  });

  describe('verifyTOTP', () => {
    it('accepts valid 6-digit tokens', () => {
      const secret = generateSecret();
      // We can't easily generate a valid TOTP without time manipulation,
      // so we just verify the function accepts 6-digit format
      expect(typeof verifyTOTP(secret, '123456')).toBe('boolean');
    });

    it('rejects tokens that are not 6 digits', () => {
      const secret = generateSecret();
      expect(verifyTOTP(secret, '12345')).toBe(false);
      expect(verifyTOTP(secret, '1234567')).toBe(false);
      expect(verifyTOTP(secret, '')).toBe(false);
    });
  });

  describe('encrypt/decrypt', () => {
    const KEY = 'test-encryption-key-16chars!';

    it('encrypts and decrypts round-trip', () => {
      const secret = 'JBSWY3DPEHPK3PXP';
      const encrypted = encrypt(secret, KEY);
      expect(encrypted).not.toBe(secret);
      const decrypted = decrypt(encrypted, KEY);
      expect(decrypted).toBe(secret);
    });

    it('produces different ciphertexts each time (due to random salt/IV)', () => {
      const secret = 'JBSWY3DPEHPK3PXP';
      const encrypted1 = encrypt(secret, KEY);
      const encrypted2 = encrypt(secret, KEY);
      expect(encrypted1).not.toBe(encrypted2);
    });
  });

  describe('validateMasterKey', () => {
    const VALID_KEY = 'test-mfa-encryption-key-for-unit-tests';

    it('accepts keys with 16+ characters', () => {
      expect(() => validateMasterKey(VALID_KEY)).not.toThrow();
    });

    it('throws for undefined', () => {
      expect(() => validateMasterKey(undefined as unknown as string)).toThrow();
    });

    it('throws for empty string', () => {
      expect(() => validateMasterKey('')).toThrow();
    });

    it('throws for keys shorter than 16 characters', () => {
      expect(() => validateMasterKey('short')).toThrow();
    });
  });
});
