import { describe, test, expect, beforeEach } from 'vitest';

import { AccessControlService } from '@cvg-his-v2/module-access-control';
import { AuditService } from '@cvg-his-v2/module-audit';
import { MfaService } from '@cvg-his-v2/module-mfa';
import { StaffService } from '@cvg-his-v2/module-staff';
import { UsersService } from '@cvg-his-v2/module-users';
import { AuthenticationError } from '@cvg-his-v2/shared-errors';

import { AuthService, BruteForceProtection } from '@cvg-his-v2/module-auth';

const SEED_ADMIN_PASSWORD = 'seed_admin';
const SEED_VET_PASSWORD = 'seed_vet';

function createAuthService(bf?: BruteForceProtection, mfa?: MfaService) {
  const users = new UsersService();
  const staff = new StaffService();
  const accessControl = new AccessControlService();
  const audit = new AuditService();

  return new AuthService({
    secret: 'test-secret-key',
    accessTokenTtlSeconds: 900,
    refreshTokenTtlSeconds: 604800,
    users,
    staff,
    accessControl,
    audit,
    mfa,
    bruteForce: bf
  });
}

function createBruteForce(maxAttempts = 5, lockoutDuration = 300, trackingWindow = 900) {
  return new BruteForceProtection({
    maxAttempts,
    lockoutDurationSeconds: lockoutDuration,
    trackingWindowSeconds: trackingWindow
  });
}

describe('BruteForceProtection', () => {
  let bf: BruteForceProtection;

  beforeEach(() => {
    bf = createBruteForce(3, 60, 60);
  });

  test('starts with no lockout', () => {
    expect(bf.isLocked('user1')).toBe(false);
    expect(bf.isPasswordLocked('user1')).toBe(false);
    expect(bf.isMfaLocked('user1')).toBe(false);
  });

  test('records password failures and locks after maxAttempts', () => {
    expect(bf.isPasswordLocked('user1')).toBe(false);

    bf.recordPasswordFailure('user1');
    expect(bf.getFailureCount('user1')).toBe(1);
    expect(bf.isPasswordLocked('user1')).toBe(false);

    bf.recordPasswordFailure('user1');
    expect(bf.getFailureCount('user1')).toBe(2);
    expect(bf.isPasswordLocked('user1')).toBe(false);

    bf.recordPasswordFailure('user1');
    expect(bf.getFailureCount('user1')).toBe(3);
    expect(bf.isPasswordLocked('user1')).toBe(true);
  });

  test('records MFA failures and locks after maxAttempts', () => {
    expect(bf.isMfaLocked('user1')).toBe(false);

    bf.recordMfaFailure('user1');
    expect(bf.getMfaFailureCount('user1')).toBe(1);
    expect(bf.isMfaLocked('user1')).toBe(false);

    bf.recordMfaFailure('user1');
    expect(bf.getMfaFailureCount('user1')).toBe(2);
    expect(bf.isMfaLocked('user1')).toBe(false);

    bf.recordMfaFailure('user1');
    expect(bf.getMfaFailureCount('user1')).toBe(3);
    expect(bf.isMfaLocked('user1')).toBe(true);
  });

  test('recordPasswordSuccess resets password failures', () => {
    bf.recordPasswordFailure('user1');
    bf.recordPasswordFailure('user1');
    expect(bf.getFailureCount('user1')).toBe(2);

    bf.recordPasswordSuccess('user1');
    expect(bf.getFailureCount('user1')).toBe(0);
    expect(bf.isPasswordLocked('user1')).toBe(false);
  });

  test('recordMfaSuccess resets MFA failures', () => {
    bf.recordMfaFailure('user1');
    bf.recordMfaFailure('user1');
    expect(bf.getMfaFailureCount('user1')).toBe(2);

    bf.recordMfaSuccess('user1');
    expect(bf.getMfaFailureCount('user1')).toBe(0);
    expect(bf.isMfaLocked('user1')).toBe(false);
  });

  test('isLocked returns true if either password or MFA is locked', () => {
    bf.recordPasswordFailure('user1');
    bf.recordPasswordFailure('user1');
    bf.recordPasswordFailure('user1');
    expect(bf.isLocked('user1')).toBe(true);
    expect(bf.isPasswordLocked('user1')).toBe(true);
    expect(bf.isMfaLocked('user1')).toBe(false);
  });

  test('getRemainingLockSeconds returns 0 when not locked', () => {
    expect(bf.getRemainingLockSeconds('user1')).toBe(0);
  });

  test('tracks failures separately per identifier', () => {
    bf.recordPasswordFailure('user1');
    bf.recordPasswordFailure('user1');
    bf.recordPasswordFailure('user2');
    expect(bf.getFailureCount('user1')).toBe(2);
    expect(bf.getFailureCount('user2')).toBe(1);
  });

  test('is case-insensitive for identifier', () => {
    bf.recordPasswordFailure('User1');
    bf.recordPasswordFailure('USER1');
    bf.recordPasswordFailure('user1');
    expect(bf.getFailureCount('user1')).toBe(3);
  });

  test('getRemainingLockSeconds returns remaining seconds when locked', () => {
    const bfFast = createBruteForce(1, 30, 60);
    bfFast.recordPasswordFailure('user1');
    expect(bfFast.isPasswordLocked('user1')).toBe(true);
    const remaining = bfFast.getRemainingLockSeconds('user1');
    expect(remaining).toBeGreaterThan(0);
    expect(remaining).toBeLessThanOrEqual(30);
  });
});

describe('AuthService with BruteForceProtection', () => {
  test('non-existent user throws AuthenticationError with generic message', async () => {
    const bf = createBruteForce();
    const auth = createAuthService(bf);

    await expect(
      auth.login({ username: 'nonexistent', password: 'wrong' }, 'corr-1')
    ).rejects.toThrow(AuthenticationError);

    await expect(
      auth.login({ username: 'nonexistent', password: 'wrong' }, 'corr-2')
    ).rejects.toThrow('Invalid username or password');
  });

  test('wrong password throws AuthenticationError with generic message', async () => {
    const bf = createBruteForce();
    const auth = createAuthService(bf);

    await expect(
      auth.login({ username: 'vet', password: 'wrongpassword' }, 'corr-3')
    ).rejects.toThrow(AuthenticationError);

    await expect(
      auth.login({ username: 'vet', password: 'wrongpassword' }, 'corr-4')
    ).rejects.toThrow('Invalid username or password');
  });

  test('login with valid credentials for non-critical role returns session', async () => {
    const bf = createBruteForce(3, 60, 60);
    const auth = createAuthService(bf);

    const result = await auth.login({ username: 'vet', password: SEED_VET_PASSWORD }, 'corr-5');

    expect(result).toHaveProperty('accessToken');
    expect(result).toHaveProperty('refreshToken');
  });

  test('successful login resets brute force counter', async () => {
    const bf = createBruteForce(3, 60, 60);
    const auth = createAuthService(bf);

    await expect(auth.login({ username: 'vet', password: 'wrong' }, 'corr-6')).rejects.toThrow();

    await expect(auth.login({ username: 'vet', password: 'wrong' }, 'corr-7')).rejects.toThrow();

    expect(bf.getFailureCount('vet')).toBe(2);

    const result = await auth.login({ username: 'vet', password: SEED_VET_PASSWORD }, 'corr-8');

    expect(result).toHaveProperty('accessToken');
    expect(bf.getFailureCount('vet')).toBe(0);
  });

  test('login fails immediately when account is locked (blocklist check before auth)', async () => {
    const bf = createBruteForce(2, 60, 60);
    const auth = createAuthService(bf);

    await expect(auth.login({ username: 'vet', password: 'wrong1' }, 'corr-9')).rejects.toThrow();

    await expect(auth.login({ username: 'vet', password: 'wrong2' }, 'corr-10')).rejects.toThrow();

    expect(bf.isPasswordLocked('vet')).toBe(true);

    await expect(
      auth.login({ username: 'vet', password: SEED_VET_PASSWORD }, 'corr-11')
    ).rejects.toThrow(AuthenticationError);

    expect(bf.isPasswordLocked('vet')).toBe(true);
  });

  test('locked account returns same error message to prevent enumeration', async () => {
    const bf = createBruteForce(1, 60, 60);
    const auth = createAuthService(bf);

    await expect(auth.login({ username: 'vet', password: 'wrong' }, 'corr-12')).rejects.toThrow();

    expect(bf.isPasswordLocked('vet')).toBe(true);

    let errorMessage = '';
    try {
      await auth.login({ username: 'vet', password: SEED_VET_PASSWORD }, 'corr-13');
    } catch (e) {
      errorMessage = (e as AuthenticationError).message;
    }
    expect(errorMessage).toBe('Invalid username or password');
  });

  test('locked account throws AuthenticationError (not a different error type)', async () => {
    const bf = createBruteForce(1, 60, 60);
    const auth = createAuthService(bf);

    await expect(auth.login({ username: 'vet', password: 'wrong' }, 'corr-14')).rejects.toThrow();

    expect(bf.isPasswordLocked('vet')).toBe(true);

    await expect(
      auth.login({ username: 'vet', password: SEED_VET_PASSWORD }, 'corr-15')
    ).rejects.toThrow(AuthenticationError);
  });

  test('MFA required user returns requiresMfa flag instead of session', async () => {
    const bf = createBruteForce();
    const mfa = new MfaService();
    const auth = createAuthService(bf, mfa);

    const result = await auth.login(
      { username: 'admin', password: SEED_ADMIN_PASSWORD },
      'corr-mfa-1'
    );

    expect(result).toHaveProperty('requiresMfa');
    expect((result as { requiresMfa: boolean }).requiresMfa).toBe(true);
    expect((result as { userId: string }).userId).toBe('user_admin');
  });

  test('MFA failure increments brute force counter', async () => {
    const bf = createBruteForce(3, 60, 60);
    const mfa = new MfaService();
    const auth = createAuthService(bf, mfa);

    const challenge = await auth.login(
      { username: 'admin', password: SEED_ADMIN_PASSWORD },
      'corr-mfa-2'
    );
    const challengeId = (challenge as { challengeId: string }).challengeId;
    expect(bf.getMfaFailureCount('user_admin')).toBe(0);

    await expect(
      auth.completeMfaLogin({ userId: 'user_admin', token: '000000', challengeId }, 'corr-mfa-3')
    ).rejects.toThrow(AuthenticationError);
    expect(bf.getMfaFailureCount('user_admin')).toBe(1);

    await expect(
      auth.completeMfaLogin({ userId: 'user_admin', token: '000001', challengeId }, 'corr-mfa-4')
    ).rejects.toThrow(AuthenticationError);
    expect(bf.getMfaFailureCount('user_admin')).toBe(2);
  });

  test('MFA lockout blocks completeMfaLogin', async () => {
    const bf = createBruteForce(2, 60, 60);
    const mfa = new MfaService();
    const auth = createAuthService(bf, mfa);

    const challenge = await auth.login(
      { username: 'admin', password: SEED_ADMIN_PASSWORD },
      'corr-mfa-lock-1'
    );
    const challengeId = (challenge as { challengeId: string }).challengeId;

    await expect(
      auth.completeMfaLogin(
        { userId: 'user_admin', token: '000000', challengeId },
        'corr-mfa-lock-2'
      )
    ).rejects.toThrow(AuthenticationError);

    await expect(
      auth.completeMfaLogin(
        { userId: 'user_admin', token: '000001', challengeId },
        'corr-mfa-lock-3'
      )
    ).rejects.toThrow(AuthenticationError);

    expect(bf.isMfaLocked('user_admin')).toBe(true);

    await expect(
      auth.completeMfaLogin(
        { userId: 'user_admin', token: '000002', challengeId },
        'corr-mfa-lock-4'
      )
    ).rejects.toThrow(AuthenticationError);
  });

  test('bruteForce recordMfaSuccess resets MFA counter', () => {
    const bf = createBruteForce(3, 60, 60);

    bf.recordMfaFailure('user_admin');
    expect(bf.getMfaFailureCount('user_admin')).toBe(1);

    bf.recordMfaSuccess('user_admin');
    expect(bf.getMfaFailureCount('user_admin')).toBe(0);
    expect(bf.isMfaLocked('user_admin')).toBe(false);
  });

  test('bruteForce recordPasswordSuccess resets password counter', () => {
    const bf = createBruteForce(3, 60, 60);

    bf.recordPasswordFailure('user1');
    bf.recordPasswordFailure('user1');
    expect(bf.getFailureCount('user1')).toBe(2);

    bf.recordPasswordSuccess('user1');
    expect(bf.getFailureCount('user1')).toBe(0);
    expect(bf.isPasswordLocked('user1')).toBe(false);
  });

  test('different users have independent failure tracking', async () => {
    const bf = createBruteForce(2, 60, 60);
    const auth = createAuthService(bf);

    try {
      await auth.login({ username: 'vet', password: 'wrong' }, 'corr-ind-1');
    } catch (e) {
      // expected - vet exists with wrong password
    }
    expect(bf.getFailureCount('vet')).toBe(1);

    try {
      await auth.login({ username: 'admin', password: 'wrong' }, 'corr-ind-2');
    } catch (e) {
      // expected - admin exists with wrong password
    }
    expect(bf.getFailureCount('admin')).toBe(1);

    try {
      await auth.login({ username: 'vet', password: 'wrong' }, 'corr-ind-3');
    } catch (e) {
      // expected - second failure for vet
    }
    expect(bf.isPasswordLocked('vet')).toBe(true);
    expect(bf.isPasswordLocked('admin')).toBe(false);

    try {
      await auth.login({ username: 'admin', password: 'wrong' }, 'corr-ind-4');
    } catch (e) {
      // expected - second failure for admin
    }
    expect(bf.isPasswordLocked('admin')).toBe(true);
  });

  test('error message does not reveal if user exists', async () => {
    const bf = createBruteForce();
    const auth = createAuthService(bf);

    const nonexistentResult = await auth
      .login({ username: 'nonexistent_user_12345', password: 'wrong' }, 'corr-enum-1')
      .catch((e) => e as AuthenticationError);

    const wrongPassResult = await auth
      .login({ username: 'vet', password: 'wrong' }, 'corr-enum-2')
      .catch((e) => e as AuthenticationError);

    expect((nonexistentResult as AuthenticationError).message).toBe('Invalid username or password');
    expect((wrongPassResult as AuthenticationError).message).toBe('Invalid username or password');
  });
});
