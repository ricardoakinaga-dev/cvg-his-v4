import assert from 'node:assert/strict';
import test from 'node:test';

import { AppError } from '@cvg-his-v2/shared-errors';
import type { ApiKeysService } from '@cvg-his-v2/module-api-keys';

import { requireApiKey } from './auth-helpers.js';

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
