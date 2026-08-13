import { describe, it, expect } from 'vitest';
import { decrypt, encrypt, validateMasterKey } from '@cvg-his-v2/module-mfa';

describe('MFA Crypto', () => {
  const MASTER_KEY = 'test-encryption-key-for-unit-tests-1234567890';

  describe('encrypt/decrypt roundtrip', () => {
    it('encrypts and decrypts a TOTP secret correctly', () => {
      const secret = 'JBSWY3DPEHPK3PXP';
      const encrypted = encrypt(secret, MASTER_KEY);
      const decrypted = decrypt(encrypted, MASTER_KEY);
      expect(decrypted).toBe(secret);
    });

    it('produces different ciphertexts for the same plaintext', () => {
      const secret = 'JBSWY3DPEHPK3PXP';
      const encrypted1 = encrypt(secret, MASTER_KEY);
      const encrypted2 = encrypt(secret, MASTER_KEY);
      expect(encrypted1).not.toBe(encrypted2);
    });

    it('handles long secrets correctly', () => {
      const secret = 'A'.repeat(100);
      const encrypted = encrypt(secret, MASTER_KEY);
      const decrypted = decrypt(encrypted, MASTER_KEY);
      expect(decrypted).toBe(secret);
    });

    it('handles empty string', () => {
      const secret = '';
      const encrypted = encrypt(secret, MASTER_KEY);
      const decrypted = decrypt(encrypted, MASTER_KEY);
      expect(decrypted).toBe(secret);
    });
  });

  describe('security properties', () => {
    it('includes salt, iv, auth tag, and ciphertext separated by colons', () => {
      const secret = 'JBSWY3DPEHPK3PXP';
      const encrypted = encrypt(secret, MASTER_KEY);
      const parts = encrypted.split(':');
      expect(parts).toHaveLength(4);
      // Each part should be base64
      for (const part of parts) {
        expect(() => Buffer.from(part, 'base64')).not.toThrow();
      }
    });

    it('fails to decrypt with wrong key', () => {
      const secret = 'JBSWY3DPEHPK3PXP';
      const encrypted = encrypt(secret, MASTER_KEY);
      expect(() => decrypt(encrypted, 'wrong-key')).toThrow();
    });

    it('fails to decrypt tampered ciphertext', () => {
      const secret = 'JBSWY3DPEHPK3PXP';
      const encrypted = encrypt(secret, MASTER_KEY);
      const tampered = encrypted.slice(0, -5) + 'XXXXX';
      expect(() => decrypt(tampered, MASTER_KEY)).toThrow();
    });

    it('rejects a truncated GCM authentication tag before decryption', () => {
      const encrypted = encrypt('JBSWY3DPEHPK3PXP', MASTER_KEY);
      const [salt, iv, authTag, payload] = encrypted.split(':');
      const truncatedTag = Buffer.from(authTag, 'base64').subarray(0, 8).toString('base64');

      expect(() => decrypt(`${salt}:${iv}:${truncatedTag}:${payload}`, MASTER_KEY)).toThrow(
        'Invalid authentication tag length'
      );
    });

    it('fails to decrypt with invalid format', () => {
      expect(() => decrypt('invalid-format', MASTER_KEY)).toThrow('Invalid ciphertext format');
    });
  });

  describe('validateMasterKey', () => {
    it('accepts a valid key', () => {
      expect(() => validateMasterKey(MASTER_KEY)).not.toThrow();
    });

    it('rejects undefined key', () => {
      expect(() => validateMasterKey(undefined)).toThrow();
    });

    it('rejects empty key', () => {
      expect(() => validateMasterKey('')).toThrow();
    });

    it('rejects short key', () => {
      expect(() => validateMasterKey('short')).toThrow();
    });
  });
});
