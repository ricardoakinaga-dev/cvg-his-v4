import assert from 'node:assert/strict';
import test from 'node:test';
import { BruteForceProtection } from './brute-force.js';

test('BruteForceProtection: isPasswordLocked returns false for new identifier', () => {
  const bf = new BruteForceProtection({
    maxAttempts: 3,
    lockoutDurationSeconds: 60,
    trackingWindowSeconds: 300
  });
  assert.equal(bf.isPasswordLocked('user1'), false);
});

test('BruteForceProtection: isMfaLocked returns false for new identifier', () => {
  const bf = new BruteForceProtection({
    maxAttempts: 3,
    lockoutDurationSeconds: 60,
    trackingWindowSeconds: 300
  });
  assert.equal(bf.isMfaLocked('user1'), false);
});

test('BruteForceProtection: isLocked returns combined lock state', () => {
  const bf = new BruteForceProtection({
    maxAttempts: 3,
    lockoutDurationSeconds: 60,
    trackingWindowSeconds: 300
  });
  assert.equal(bf.isLocked('user1'), false);
});

test('BruteForceProtection: recordPasswordFailure locks after max attempts', () => {
  const bf = new BruteForceProtection({
    maxAttempts: 3,
    lockoutDurationSeconds: 60,
    trackingWindowSeconds: 300
  });
  assert.equal(bf.isPasswordLocked('user1'), false);

  bf.recordPasswordFailure('user1');
  assert.equal(bf.isPasswordLocked('user1'), false);

  bf.recordPasswordFailure('user1');
  assert.equal(bf.isPasswordLocked('user1'), false);

  bf.recordPasswordFailure('user1');
  assert.equal(bf.isPasswordLocked('user1'), true);
});

test('BruteForceProtection: recordPasswordSuccess clears failures', () => {
  const bf = new BruteForceProtection({
    maxAttempts: 3,
    lockoutDurationSeconds: 60,
    trackingWindowSeconds: 300
  });
  bf.recordPasswordFailure('user1');
  bf.recordPasswordFailure('user1');
  bf.recordPasswordSuccess('user1');

  assert.equal(bf.isPasswordLocked('user1'), false);
  assert.equal(bf.getFailureCount('user1'), 0);
});

test('BruteForceProtection: getRemainingLockSeconds returns positive when locked', () => {
  const bf = new BruteForceProtection({
    maxAttempts: 3,
    lockoutDurationSeconds: 300,
    trackingWindowSeconds: 900
  });
  bf.recordPasswordFailure('user1');
  bf.recordPasswordFailure('user1');
  bf.recordPasswordFailure('user1');

  const remaining = bf.getRemainingLockSeconds('user1');
  assert.ok(remaining > 0);
  assert.ok(remaining <= 300);
});

test('BruteForceProtection: recordMfaFailure locks after max attempts', () => {
  const bf = new BruteForceProtection({
    maxAttempts: 3,
    lockoutDurationSeconds: 60,
    trackingWindowSeconds: 300
  });
  assert.equal(bf.isMfaLocked('user1'), false);

  bf.recordMfaFailure('user1');
  bf.recordMfaFailure('user1');
  bf.recordMfaFailure('user1');

  assert.equal(bf.isMfaLocked('user1'), true);
});

test('BruteForceProtection: recordSuccess clears both password and MFA failures', () => {
  const bf = new BruteForceProtection({
    maxAttempts: 3,
    lockoutDurationSeconds: 60,
    trackingWindowSeconds: 300
  });
  bf.recordPasswordFailure('user1');
  bf.recordPasswordFailure('user1');
  bf.recordMfaFailure('user1');

  bf.recordSuccess('user1');

  assert.equal(bf.isPasswordLocked('user1'), false);
  assert.equal(bf.isMfaLocked('user1'), false);
});

test('BruteForceProtection: identifier is case-insensitive', () => {
  const bf = new BruteForceProtection({
    maxAttempts: 5,
    lockoutDurationSeconds: 60,
    trackingWindowSeconds: 300
  });
  bf.recordPasswordFailure('User1');
  assert.equal(bf.getFailureCount('user1'), 1);
  assert.equal(bf.getFailureCount('USER1'), 1);

  bf.recordPasswordFailure('USER1');
  assert.equal(bf.getFailureCount('user1'), 2);

  bf.recordPasswordFailure('uSeR1');
  assert.equal(bf.getFailureCount('user1'), 3);

  bf.recordSuccess('User1');
  assert.equal(bf.getFailureCount('user1'), 0);
  assert.equal(bf.getFailureCount('USER1'), 0);
});

test('BruteForceProtection: default config values', () => {
  const bf = new BruteForceProtection();

  assert.equal(bf.isPasswordLocked('anyone'), false);

  for (let i = 0; i < 5; i++) {
    bf.recordPasswordFailure('userx');
  }

  assert.equal(bf.isPasswordLocked('userx'), true);
});

test('BruteForceProtection: getFailureCount returns correct count', () => {
  const bf = new BruteForceProtection({
    maxAttempts: 5,
    lockoutDurationSeconds: 300,
    trackingWindowSeconds: 900
  });
  assert.equal(bf.getFailureCount('user1'), 0);

  bf.recordPasswordFailure('user1');
  assert.equal(bf.getFailureCount('user1'), 1);

  bf.recordPasswordFailure('user1');
  assert.equal(bf.getFailureCount('user1'), 2);
});

test('BruteForceProtection: getMfaFailureCount returns correct count', () => {
  const bf = new BruteForceProtection({
    maxAttempts: 5,
    lockoutDurationSeconds: 300,
    trackingWindowSeconds: 900
  });
  assert.equal(bf.getMfaFailureCount('user1'), 0);

  bf.recordMfaFailure('user1');
  bf.recordMfaFailure('user1');
  assert.equal(bf.getMfaFailureCount('user1'), 2);
});
