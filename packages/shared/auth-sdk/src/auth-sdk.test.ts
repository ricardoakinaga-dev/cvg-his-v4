import { describe, expect, it } from 'vitest';
import { buildAuthorizationHeader, extractBearerToken, AUTH_STORAGE_KEYS } from './index.js';

describe('shared-auth-sdk', () => {
  describe('buildAuthorizationHeader', () => {
    it('returns undefined for undefined token', () => {
      expect(buildAuthorizationHeader(undefined)).toBeUndefined();
    });

    it('returns undefined for empty string token', () => {
      expect(buildAuthorizationHeader('')).toBeUndefined();
    });

    it('returns undefined for whitespace-only token', () => {
      expect(buildAuthorizationHeader('   ')).toBeUndefined();
    });

    it('returns Bearer header for valid token', () => {
      expect(buildAuthorizationHeader('abc123')).toBe('Bearer abc123');
    });

    it('returns Bearer header for long token', () => {
      const token = ['header-segment', 'payload-segment', 'signature-segment'].join('.');
      expect(buildAuthorizationHeader(token)).toBe(`Bearer ${token}`);
    });
  });

  describe('extractBearerToken', () => {
    it('returns undefined for undefined header', () => {
      expect(extractBearerToken(undefined)).toBeUndefined();
    });

    it('returns undefined for empty string header', () => {
      expect(extractBearerToken('')).toBeUndefined();
    });

    it('returns undefined for non-Bearer scheme', () => {
      expect(extractBearerToken('Basic abc123')).toBeUndefined();
    });

    it('returns undefined for Bearer without token', () => {
      expect(extractBearerToken('Bearer')).toBeUndefined();
    });

    it('returns undefined for Bearer with empty token', () => {
      expect(extractBearerToken('Bearer ')).toBeUndefined();
    });

    it('extracts token from valid Bearer header', () => {
      expect(extractBearerToken('Bearer abc123')).toBe('abc123');
    });

    it('extracts JWT token from Bearer header', () => {
      const header =
        'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyX2FkbWluIn0.signature';
      expect(extractBearerToken(header)).toBe(
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyX2FkbWluIn0.signature'
      );
    });
  });

  describe('AUTH_STORAGE_KEYS', () => {
    it('defines accessToken key with colon-separated format', () => {
      expect(AUTH_STORAGE_KEYS.accessToken).toBe('cvg-his-v2:access_token');
    });

    it('defines refreshToken key with colon-separated format', () => {
      expect(AUTH_STORAGE_KEYS.refreshToken).toBe('cvg-his-v2:refresh_token');
    });

    it('defines mfaRequired key', () => {
      expect(AUTH_STORAGE_KEYS.mfaRequired).toBe('cvg-his-v2:mfa_required');
    });

    it('defines mfaSetupRequired key', () => {
      expect(AUTH_STORAGE_KEYS.mfaSetupRequired).toBe('cvg-his-v2:mfa_setup_required');
    });

    it('keys use consistent colon-separated namespace', () => {
      const prefix = 'cvg-his-v2:';
      expect(AUTH_STORAGE_KEYS.accessToken.startsWith(prefix)).toBe(true);
      expect(AUTH_STORAGE_KEYS.refreshToken.startsWith(prefix)).toBe(true);
      expect(AUTH_STORAGE_KEYS.mfaRequired.startsWith(prefix)).toBe(true);
      expect(AUTH_STORAGE_KEYS.mfaSetupRequired.startsWith(prefix)).toBe(true);
    });

    it('keys are all distinct', () => {
      const keys = Object.values(AUTH_STORAGE_KEYS);
      const uniqueKeys = new Set(keys);
      expect(uniqueKeys.size).toBe(keys.length);
    });
  });
});
