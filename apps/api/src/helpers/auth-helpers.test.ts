import assert from 'node:assert/strict';
import test from 'node:test';

import { AppError, AuthenticationError, ForbiddenError } from '@cvg-his-v2/shared-errors';
import type { ApiKeysService } from '@cvg-his-v2/module-api-keys';
import type { ApiKeySummary } from '@cvg-his-v2/shared-types';

import { requireApiKey, sanitizeApiKey } from './auth-helpers.js';

function requestWithApiKey(): object {
  return { headers: { 'x-api-key': 'cvg_test_key' } };
}

function apiKeyService(overrides: Partial<ApiKeysService> = {}): ApiKeysService {
  return {
    validate: async () => ({
      id: 'key_test',
      accountId: 'account_test',
      name: 'test',
      keyPrefix: 'cvg_test',
      keyHash: 'hash',
      permissions: ['payments.manage'],
      rateLimit: 10,
      rateLimitWindow: 60,
      expiresAt: null,
      lastUsedAt: null,
      isActive: true,
      createdBy: 'user_test',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }),
    checkRateLimit: async () => ({
      allowed: true,
      current: 0,
      remaining: 10,
      resetAt: new Date(Date.now() + 60_000)
    }),
    updateLastUsed: async () => {},
    ...overrides
  } as ApiKeysService;
}

test('requireApiKey enforces the API-key rate limit before updating usage metadata', async () => {
  let updateLastUsedCalls = 0;
  const service = apiKeyService({
    checkRateLimit: async () => ({
      allowed: false,
      current: 10,
      remaining: 0,
      resetAt: new Date('2026-08-23T12:01:00.000Z')
    }),
    updateLastUsed: async () => {
      updateLastUsedCalls += 1;
    }
  });

  await assert.rejects(
    () => requireApiKey(requestWithApiKey() as never, 'payments.manage', service),
    (error: unknown) =>
      error instanceof AppError &&
      error.code === 'RATE_LIMIT_EXCEEDED' &&
      error.statusCode === 429 &&
      updateLastUsedCalls === 0
  );
});

test('requireApiKey updates usage metadata after an allowed rate-limit check', async () => {
  let updateLastUsedCalls = 0;
  const service = apiKeyService({
    updateLastUsed: async () => {
      updateLastUsedCalls += 1;
    }
  });

  const result = await requireApiKey(
    requestWithApiKey() as never,
    'payments.manage',
    service
  );

  assert.equal(result.apiKey.id, 'key_test');
  assert.equal(updateLastUsedCalls, 1);
});

test('requireApiKey fails closed with a sanitized 503 when the shared rate-limit store is unavailable', async () => {
  let updateLastUsedCalls = 0;
  const service = apiKeyService({
    checkRateLimit: async () => {
      throw new Error('database writer unavailable');
    },
    updateLastUsed: async () => {
      updateLastUsedCalls += 1;
    }
  });

  await assert.rejects(
    () => requireApiKey(requestWithApiKey() as never, 'payments.manage', service),
    (error: unknown) =>
      error instanceof AppError &&
      error.code === 'RATE_LIMIT_UNAVAILABLE' &&
      error.statusCode === 503 &&
      updateLastUsedCalls === 0
  );
});

test('requireApiKey rejects missing and invalid credentials before rate limiting', async () => {
  let rateLimitCalls = 0;
  let validateCalls = 0;
  const service = apiKeyService({
    validate: async () => {
      validateCalls += 1;
      return null;
    },
    checkRateLimit: async () => {
      rateLimitCalls += 1;
      return {
        allowed: true,
        current: 0,
        remaining: 10,
        resetAt: new Date(Date.now() + 60_000)
      };
    }
  });

  await assert.rejects(
    () => requireApiKey({ headers: {} } as never, 'payments.manage', service),
    (error: unknown) => error instanceof AuthenticationError
  );
  await assert.rejects(
    () => requireApiKey(requestWithApiKey() as never, 'payments.manage', service),
    (error: unknown) => error instanceof AuthenticationError
  );

  assert.equal(validateCalls, 1);
  assert.equal(rateLimitCalls, 0);
});

test('requireApiKey accepts the canonical header and denies missing permissions without charging the key', async () => {
  let rateLimitCalls = 0;
  let updateLastUsedCalls = 0;
  const service = apiKeyService({
    checkRateLimit: async () => {
      rateLimitCalls += 1;
      return {
        allowed: true,
        current: 0,
        remaining: 10,
        resetAt: new Date(Date.now() + 60_000)
      };
    },
    updateLastUsed: async () => {
      updateLastUsedCalls += 1;
    }
  });

  await assert.rejects(
    () =>
      requireApiKey(
        { headers: { 'X-API-Key': 'cvg_test_key' } } as never,
        'users.manage',
        service
      ),
    (error: unknown) => error instanceof ForbiddenError
  );

  assert.equal(rateLimitCalls, 0);
  assert.equal(updateLastUsedCalls, 0);
});

test('requireApiKey charges a request at most once even when two authorization boundaries share it', async () => {
  let rateLimitCalls = 0;
  let updateLastUsedCalls = 0;
  const request = requestWithApiKey() as never;
  const service = apiKeyService({
    checkRateLimit: async () => {
      rateLimitCalls += 1;
      return {
        allowed: true,
        current: 0,
        remaining: 10,
        resetAt: new Date(Date.now() + 60_000)
      };
    },
    updateLastUsed: async () => {
      updateLastUsedCalls += 1;
    }
  });

  await requireApiKey(request, 'payments.manage', service);
  await requireApiKey(request, 'payments.manage', service);

  assert.equal(rateLimitCalls, 1);
  assert.equal(updateLastUsedCalls, 1);
});

test('sanitizeApiKey removes the secret hash while preserving the public summary', () => {
  const apiKey = {
    id: 'key_public',
    accountId: 'account_public',
    name: 'integration',
    keyPrefix: 'cvg_public',
    keyHash: 'do-not-return',
    permissions: ['payments.manage'],
    rateLimit: 10,
    rateLimitWindow: 60,
    expiresAt: null,
    lastUsedAt: null,
    isActive: true,
    createdBy: 'user_public',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  } as unknown as ApiKeySummary;

  const sanitized = sanitizeApiKey(apiKey);
  const { keyHash: _keyHash, ...expected } = apiKey;

  assert.equal('keyHash' in sanitized, false);
  assert.deepEqual(sanitized, expected);
  assert.equal(apiKey.keyHash, 'do-not-return');
});
