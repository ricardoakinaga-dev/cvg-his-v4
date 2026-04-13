import { describe, it, expect } from 'vitest';
import {
  getSecurityHeaders,
  applySecurityHeaders,
  sanitizeString,
  sanitizeObject,
  isSafeSqlInput,
  isSafeHeaderValue,
  isOriginAllowed,
  checkRateLimitHit,
  type RateLimitExceeded,
} from './index.js';

describe('security module', () => {
  describe('getSecurityHeaders', () => {
    it('returns all security headers with defaults', () => {
      const headers = getSecurityHeaders();
      expect(headers['X-Content-Type-Options']).toBe('nosniff');
      expect(headers['X-Frame-Options']).toBe('DENY');
      expect(headers['X-XSS-Protection']).toBe('1; mode=block');
      expect(headers['Referrer-Policy']).toBe('no-referrer');
      expect(headers['Permissions-Policy']).toBe('camera=(), microphone=(), geolocation=(), payment=()');
      expect(headers['Content-Security-Policy']).toContain("default-src 'self'");
    });

    it('respects custom referrer policy', () => {
      const headers = getSecurityHeaders({ referrerPolicy: 'same-origin' });
      expect(headers['Referrer-Policy']).toBe('same-origin');
    });

    it('allows disabling content security policy', () => {
      const headers = getSecurityHeaders({ contentSecurityPolicy: false });
      expect(headers['Content-Security-Policy']).toBeUndefined();
    });

    it('sets HSTS header when forceHttps is true', () => {
      const headers = getSecurityHeaders({ forceHttps: true, hstsMaxAge: 86400 });
      expect(headers['Strict-Transport-Security']).toBe('max-age=86400; includeSubDomains');
    });

    it('uses custom hstsMaxAge', () => {
      const headers = getSecurityHeaders({ forceHttps: true, hstsMaxAge: 3600 });
      expect(headers['Strict-Transport-Security']).toBe('max-age=3600; includeSubDomains');
    });
  });

  describe('applySecurityHeaders', () => {
    it('applies headers to a response-like object', () => {
      const headers: Record<string, string> = {};
      const response = {
        setHeader: (name: string, value: string) => {
          headers[name] = value;
        },
      };

      applySecurityHeaders(response);

      expect(headers['X-Content-Type-Options']).toBe('nosniff');
      expect(headers['X-Frame-Options']).toBe('DENY');
    });

    it('applies custom options', () => {
      const headers: Record<string, string> = {};
      const response = {
        setHeader: (name: string, value: string) => {
          headers[name] = value;
        },
      };

      applySecurityHeaders(response, { forceHttps: true });

      expect(headers['Strict-Transport-Security']).toBeDefined();
    });
  });

  describe('sanitizeString', () => {
    it('removes control characters', () => {
      expect(sanitizeString('hello\x00world')).toBe('helloworld');
      expect(sanitizeString('test\x07beep')).toBe('testbeep');
    });

    it('preserves newlines and tabs', () => {
      expect(sanitizeString('hello\nworld')).toBe('hello\nworld');
      expect(sanitizeString('hello\tworld')).toBe('hello\tworld');
    });

    it('trims whitespace', () => {
      expect(sanitizeString('  hello  ')).toBe('hello');
    });

    it('returns empty string for non-string input', () => {
      expect(sanitizeString(null as any)).toBe('');
      expect(sanitizeString(undefined as any)).toBe('');
      expect(sanitizeString(123 as any)).toBe('');
    });

    it('preserves normal strings', () => {
      expect(sanitizeString('hello world')).toBe('hello world');
      expect(sanitizeString('Hello World 123!')).toBe('Hello World 123!');
    });
  });

  describe('sanitizeObject', () => {
    it('sanitizes all string fields in an object', () => {
      const input = {
        name: '  João  ',
        email: 'test@example.com',
        count: 42,
      };
      const result = sanitizeObject(input);
      expect(result.name).toBe('João');
      expect(result.email).toBe('test@example.com');
      expect(result.count).toBe(42);
    });

    it('sanitizes nested objects', () => {
      const input = {
        user: {
          name: 'Maria\x00Silva',
          active: true,
        },
        id: 1,
      };
      const result = sanitizeObject(input);
      expect((result.user as any).name).toBe('MariaSilva');
      expect((result.user as any).active).toBe(true);
      expect(result.id).toBe(1);
    });

    it('sanitizes arrays of strings', () => {
      const input = {
        tags: ['  tag1  ', 'tag\x00two', 'normal'],
      };
      const result = sanitizeObject(input);
      expect((result.tags as any)[0]).toBe('tag1');
      expect((result.tags as any)[1]).toBe('tagtwo');
      expect((result.tags as any)[2]).toBe('normal');
    });

    it('returns original object for null/undefined', () => {
      expect(sanitizeObject(null as any)).toBe(null);
      expect(sanitizeObject(undefined as any)).toBe(undefined);
    });
  });

  describe('isSafeSqlInput', () => {
    it('returns true for normal strings', () => {
      expect(isSafeSqlInput('hello world')).toBe(true);
      expect(isSafeSqlInput('product-123')).toBe(true);
    });

    it('returns false for SQL injection patterns', () => {
      expect(isSafeSqlInput("'; DROP TABLE users; --")).toBe(false);
      expect(isSafeSqlInput('1 OR 1=1')).toBe(false);
      expect(isSafeSqlInput('1 AND 1=1')).toBe(false);
    });

    it('returns false for SQL keywords', () => {
      expect(isSafeSqlInput('SELECT * FROM users')).toBe(false);
      expect(isSafeSqlInput('insert into data values()')).toBe(false);
      expect(isSafeSqlInput('delete from table')).toBe(false);
    });

    it('returns false for comment patterns', () => {
      expect(isSafeSqlInput('test -- comment')).toBe(false);
      expect(isSafeSqlInput('test # comment')).toBe(false);
      expect(isSafeSqlInput('test /* comment */')).toBe(false);
    });

    it('returns false for non-string input', () => {
      expect(isSafeSqlInput(null as any)).toBe(false);
      expect(isSafeSqlInput(123 as any)).toBe(false);
    });
  });

  describe('isSafeHeaderValue', () => {
    it('returns true for normal header values', () => {
      expect(isSafeHeaderValue('hello world')).toBe(true);
      expect(isSafeHeaderValue('token-abc123')).toBe(true);
    });

    it('returns false for control characters', () => {
      expect(isSafeHeaderValue('test\x00null')).toBe(false);
      expect(isSafeHeaderValue('line1\nline2')).toBe(false);
      expect(isSafeHeaderValue('line1\rline2')).toBe(false);
    });

    it('returns false for non-string input', () => {
      expect(isSafeHeaderValue(null as any)).toBe(false);
      expect(isSafeHeaderValue(123 as any)).toBe(false);
    });
  });

  describe('isOriginAllowed', () => {
    const allowlist = ['https://example.com', 'http://localhost:3000'];

    it('returns true for exact match', () => {
      expect(isOriginAllowed('https://example.com', allowlist)).toBe(true);
      expect(isOriginAllowed('http://localhost:3000', allowlist)).toBe(true);
    });

    it('returns false for non-matching origin', () => {
      expect(isOriginAllowed('https://evil.com', allowlist)).toBe(false);
    });

    it('returns false for null/undefined origin', () => {
      expect(isOriginAllowed(null, allowlist)).toBe(false);
      expect(isOriginAllowed(undefined, allowlist)).toBe(false);
    });

  });

  describe('checkRateLimitHit', () => {
    it('returns false when under limit', () => {
      expect(checkRateLimitHit(5, 10, 60000)).toBe(false);
      expect(checkRateLimitHit(10, 10, 60000)).toBe(false);
    });

    it('returns exceeded info when over limit', () => {
      const result = checkRateLimitHit(11, 10, 60000);
      expect(result).toEqual({
        exceeded: true,
        retryAfterMs: 60000,
        limit: 10,
        windowMs: 60000,
      });
    });

    it('works with different window sizes', () => {
      const result = checkRateLimitHit(101, 100, 300000) as RateLimitExceeded;
      expect(result.exceeded).toBe(true);
      expect(result.limit).toBe(100);
      expect(result.windowMs).toBe(300000);
    });
  });
});
