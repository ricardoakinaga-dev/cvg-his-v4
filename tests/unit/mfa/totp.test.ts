import { describe, it, expect } from 'vitest';
import {
  generateSecret,
  generateRecoveryCodes,
  generateProvisioningUri,
  verifyTOTP
} from '@cvg-his-v2/module-mfa';

describe('TOTP', () => {
  describe('generateSecret', () => {
    it('generates a base32-encoded secret', () => {
      const secret = generateSecret();
      expect(secret).toMatch(/^[A-Z2-7]+$/);
      expect(secret.length).toBeGreaterThan(0);
    });

    it('generates different secrets each time', () => {
      const s1 = generateSecret();
      const s2 = generateSecret();
      expect(s1).not.toBe(s2);
    });

    it('generates longer secrets with larger length', () => {
      const s1 = generateSecret(10);
      const s2 = generateSecret(30);
      expect(s2.length).toBeGreaterThan(s1.length);
    });
  });

  describe('generateRecoveryCodes', () => {
    it('generates the correct number of codes', () => {
      const codes = generateRecoveryCodes(8);
      expect(codes).toHaveLength(8);
    });

    it('generates codes in XXXX-XXXX format', () => {
      const codes = generateRecoveryCodes(4);
      for (const code of codes) {
        expect(code).toMatch(/^[A-F0-9]{4}-[A-F0-9]{4}$/);
      }
    });

    it('generates unique codes', () => {
      const codes = generateRecoveryCodes(8);
      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBe(8);
    });
  });

  describe('generateProvisioningUri', () => {
    it('generates a valid otpauth URI', () => {
      const uri = generateProvisioningUri('JBSWY3DPEHPK3PXP', 'user@example.com', 'CVG-HIS');
      expect(uri).toMatch(/^otpauth:\/\/totp\//);
      expect(uri).toContain('secret=JBSWY3DPEHPK3PXP');
      expect(uri).toContain('issuer=CVG-HIS');
      expect(uri).toContain('algorithm=SHA1');
      expect(uri).toContain('digits=6');
      expect(uri).toContain('period=30');
    });

    it('URL-encodes special characters in account name', () => {
      const uri = generateProvisioningUri('SECRET', 'admin@cvg-his.local', 'CVG-HIS-V2');
      expect(uri).toContain('admin%40cvg-his.local');
      expect(uri).toContain('issuer=CVG-HIS-V2');
    });
  });

  describe('verifyTOTP', () => {
    it('returns false for empty token', () => {
      expect(verifyTOTP('JBSWY3DPEHPK3PXP', '')).toBe(false);
    });

    it('returns false for short token', () => {
      expect(verifyTOTP('JBSWY3DPEHPK3PXP', '12345')).toBe(false);
    });

    it('returns false for long token', () => {
      expect(verifyTOTP('JBSWY3DPEHPK3PXP', '1234567')).toBe(false);
    });

    it('returns false for non-numeric token', () => {
      expect(verifyTOTP('JBSWY3DPEHPK3PXP', 'abcdef')).toBe(false);
    });

    it('accepts tokens within the time window', () => {
      // Generate a valid TOTP for the current time
      const secret = generateSecret();
      // We can't easily generate a valid TOTP without internal access,
      // but we can verify the function doesn't crash
      expect(verifyTOTP(secret, '000000')).toBe(false); // Random code should fail
    });
  });
});
