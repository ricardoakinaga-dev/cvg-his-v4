import { describe, expect, it, vi } from 'vitest';

import {
  COMMON_PASSWORDS,
  HibpRangeBreachChecker,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PasswordPolicyError,
  assertPasswordPolicy,
  createBreachCheckerFromEnv,
  evaluatePasswordPolicy
} from './password-policy.js';

describe('password policy (R2-SEC-01)', () => {
  it('requires 12 to 128 characters', () => {
    expect(evaluatePasswordPolicy('Curta1!')).toContain('too_short');
    expect(evaluatePasswordPolicy('x'.repeat(PASSWORD_MIN_LENGTH))).not.toContain('too_short');
    expect(evaluatePasswordPolicy('Aa1!'.repeat(PASSWORD_MAX_LENGTH / 4 + 1))).toContain('too_long');
    expect(evaluatePasswordPolicy(undefined as unknown as string)).toEqual(['too_short']);
  });

  it('rejects well-known and repeated passwords regardless of case or symbols', () => {
    expect(COMMON_PASSWORDS.size).toBeGreaterThan(250);
    expect(evaluatePasswordPolicy('Password12345')).toContain('common_password');
    expect(evaluatePasswordPolicy('SENHA@123456')).toContain('common_password');
    expect(evaluatePasswordPolicy('aaaaaaaaaaaaaaaa')).toContain('common_password');
    expect(evaluatePasswordPolicy('Clinica-Segura-2026!')).toEqual([]);
  });

  it('rejects passwords that contain the username, e-mail local part or display name', () => {
    const context = { username: 'ricardo.vet', email: 'maria.silva@clinica.test', displayName: 'Maria Silva' };
    expect(evaluatePasswordPolicy('Ricardo.Vet-2026!!', context)).toContain('contains_identifier');
    expect(evaluatePasswordPolicy('xMaria.Silva-2026!', context)).toContain('contains_identifier');
    expect(evaluatePasswordPolicy('Silva-forte-2026!!', context)).toEqual([]);
    expect(evaluatePasswordPolicy('Clinica-Segura-2026!', context)).toEqual([]);
    expect(evaluatePasswordPolicy('Forte-2026-ab!!', { username: 'ab' })).toEqual([]);
  });

  it('throws a catalogued error with the violations and consults the breach corpus last', async () => {
    const checker = { isBreached: vi.fn(async () => true) };
    await expect(assertPasswordPolicy('short', {}, checker)).rejects.toBeInstanceOf(PasswordPolicyError);
    expect(checker.isBreached).not.toHaveBeenCalled();
    const error = await assertPasswordPolicy('Clinica-Segura-2026!', {}, checker).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(PasswordPolicyError);
    expect((error as PasswordPolicyError).code).toBe('PASSWORD_POLICY_VIOLATION');
    expect((error as PasswordPolicyError).statusCode).toBe(400);
    expect((error as PasswordPolicyError).violations).toEqual(['breached']);
    expect((error as PasswordPolicyError).details).toMatchObject({ field: 'password', reason: 'invalid_format' });
    checker.isBreached.mockResolvedValueOnce(false);
    await expect(assertPasswordPolicy('Clinica-Segura-2026!', {}, checker)).resolves.toBeUndefined();
    await expect(assertPasswordPolicy('Clinica-Segura-2026!')).resolves.toBeUndefined();
  });

  it('checks Have I Been Pwned with k-anonymity and fails open or closed as configured', async () => {
    // SHA-1("password") = 5BAA61E4C9B93F3F0682250B6CF8331B7EE68FD8
    const responses = new Map<string, string>([
      ['https://api.pwnedpasswords.com/range/5BAA6', '1E4C9B93F3F0682250B6CF8331B7EE68FD8:3861493\nFFFF:1\n']
    ]);
    const requested: string[] = [];
    const fetchStub = (async (url: string) => {
      requested.push(url);
      const body = responses.get(url);
      return body === undefined
        ? ({ ok: false, status: 503, text: async () => '' } as Response)
        : ({ ok: true, status: 200, text: async () => body } as Response);
    }) as unknown as typeof fetch;

    const checker = new HibpRangeBreachChecker({ fetch: fetchStub });
    expect(await checker.isBreached('password')).toBe(true);
    expect(requested[0]).toBe('https://api.pwnedpasswords.com/range/5BAA6');
    responses.set('https://api.pwnedpasswords.com/range/5BAA6', 'FFFF:1\n');
    expect(await checker.isBreached('password')).toBe(false);

    const logger = { warn: vi.fn() };
    const failOpen = new HibpRangeBreachChecker({ fetch: fetchStub, logger });
    expect(await failOpen.isBreached('Clinica-Segura-2026!')).toBe(false);
    expect(logger.warn).toHaveBeenCalledWith('password breach check unavailable', expect.objectContaining({ failOpen: true }));
    const failClosed = new HibpRangeBreachChecker({ fetch: fetchStub, failOpen: false });
    await expect(failClosed.isBreached('Clinica-Segura-2026!')).rejects.toMatchObject({ code: 'PASSWORD_BREACH_CHECK_UNAVAILABLE' });
  });

  it('is enabled only by PASSWORD_BREACH_CHECK=hibp', () => {
    expect(createBreachCheckerFromEnv({})).toBeUndefined();
    expect(createBreachCheckerFromEnv({ PASSWORD_BREACH_CHECK: 'off' })).toBeUndefined();
    expect(createBreachCheckerFromEnv({ PASSWORD_BREACH_CHECK: 'hibp' })).toBeInstanceOf(HibpRangeBreachChecker);
    expect(createBreachCheckerFromEnv({ PASSWORD_BREACH_CHECK: 'HIBP', PASSWORD_BREACH_CHECK_FAIL_CLOSED: '1' })).toBeInstanceOf(HibpRangeBreachChecker);
  });
});
