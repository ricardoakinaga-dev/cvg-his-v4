import assert from 'node:assert/strict';
import test from 'node:test';
import type { AccountId, ApiKeySummary } from '@cvg-his-v2/shared-types';
import type { ApiKeyRepository } from './repositories/api-key-repository.interface.js';
import { ApiKeysService } from './api-keys.service.js';

const mockAccountId = 'acc_test_123' as AccountId;
const mockUserId = 'user_test_456';

function createMockApiKey(overrides?: Partial<ApiKeySummary>): ApiKeySummary {
  return {
    id: 'key_test_789' as any,
    accountId: mockAccountId,
    name: 'Test Key',
    keyPrefix: 'cvg_test1',
    keyHash: 'a'.repeat(64),
    permissions: ['read:patients', 'write:appointments'],
    rateLimit: 1000,
    rateLimitWindow: 3600,
    expiresAt: null,
    lastUsedAt: null,
    isActive: true,
    createdBy: mockUserId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides
  };
}

function createService() {
  const repo = {
    create: async () => {},
    findById: async () => null,
    findByAccount: async () => [],
    findActiveById: async () => null,
    findByPrefix: async () => [],
    update: async () => {},
    delete: async () => {},
    incrementUsage: async () => {},
    getUsageCount: async () => 0,
    recordUsage: async () => {},
    getUsageHistory: async () => []
  };
  return new ApiKeysService(repo as ApiKeyRepository);
}

test('ApiKeysService create returns rawKey and apiKey with correct fields', async () => {
  const service = createService();
  const result = await service.create({
    accountId: mockAccountId,
    name: 'My API Key',
    permissions: ['read:patients'],
    createdBy: mockUserId
  });

  assert.ok(result.rawKey.startsWith('cvg_'), 'rawKey should start with cvg_');
  assert.equal(result.apiKey.name, 'My API Key');
  assert.equal(result.apiKey.accountId, mockAccountId);
  assert.deepStrictEqual(result.apiKey.permissions, ['read:patients']);
  assert.equal(result.apiKey.rateLimit, 1000);
  assert.equal(result.apiKey.rateLimitWindow, 3600);
  assert.equal(result.apiKey.isActive, true);
});

test('ApiKeysService create with custom rate limiting', async () => {
  const service = createService();
  const result = await service.create({
    accountId: mockAccountId,
    name: 'Premium Key',
    permissions: ['admin'],
    rateLimit: 5000,
    rateLimitWindow: 60,
    createdBy: mockUserId
  });

  assert.equal(result.apiKey.rateLimit, 5000);
  assert.equal(result.apiKey.rateLimitWindow, 60);
});

test('ApiKeysService create with expiration date', async () => {
  const expiresAt = new Date(Date.now() + 86400000).toISOString();
  const service = createService();
  const result = await service.create({
    accountId: mockAccountId,
    name: 'Temp Key',
    permissions: [],
    expiresAt,
    createdBy: mockUserId
  });

  assert.equal(result.apiKey.expiresAt, expiresAt);
});

test('ApiKeysService getById returns key when found', async () => {
  const mockKey = createMockApiKey();
  const repo = {
    create: async () => {},
    findById: async (_id: any) => mockKey,
    findByAccount: async () => [],
    findActiveById: async () => null,
    findByPrefix: async () => [],
    update: async () => {},
    delete: async () => {},
    incrementUsage: async () => {},
    getUsageCount: async () => 0,
    recordUsage: async () => {},
    getUsageHistory: async () => []
  };
  const service = new ApiKeysService(repo as ApiKeyRepository);

  const result = await service.getById('key_test_789' as any);

  assert.strictEqual(result, mockKey);
});

test('ApiKeysService getById returns null when not found', async () => {
  const repo = {
    create: async () => {},
    findById: async () => null,
    findByAccount: async () => [],
    findActiveById: async () => null,
    findByPrefix: async () => [],
    update: async () => {},
    delete: async () => {},
    incrementUsage: async () => {},
    getUsageCount: async () => 0,
    recordUsage: async () => {},
    getUsageHistory: async () => []
  };
  const service = new ApiKeysService(repo as ApiKeyRepository);

  const result = await service.getById('key_nonexistent' as any);

  assert.equal(result, null);
});

test('ApiKeysService getByAccount returns all keys for account', async () => {
  const mockKeys = [
    createMockApiKey({ id: 'key_1' as any, name: 'Key 1' }),
    createMockApiKey({ id: 'key_2' as any, name: 'Key 2' })
  ];
  const repo = {
    create: async () => {},
    findById: async () => null,
    findByAccount: async () => mockKeys,
    findActiveById: async () => null,
    findByPrefix: async () => [],
    update: async () => {},
    delete: async () => {},
    incrementUsage: async () => {},
    getUsageCount: async () => 0,
    recordUsage: async () => {},
    getUsageHistory: async () => []
  };
  const service = new ApiKeysService(repo as ApiKeyRepository);

  const result = await service.getByAccount(mockAccountId);

  assert.equal(result.length, 2);
  assert.equal(result[0].name, 'Key 1');
});

test('ApiKeysService checkRateLimit allows when under limit', async () => {
  let incremented = false;
  const repo = {
    create: async () => {},
    findById: async () => null,
    findByAccount: async () => [],
    findActiveById: async () => null,
    findByPrefix: async () => [],
    update: async () => {},
    delete: async () => {},
    incrementUsage: async () => { incremented = true; },
    getUsageCount: async () => 500,
    recordUsage: async () => {},
    getUsageHistory: async () => []
  };
  const service = new ApiKeysService(repo as ApiKeyRepository);

  const result = await service.checkRateLimit('key_test_789', 1000, 3600);

  assert.equal(result.allowed, true);
  assert.equal(result.current, 500);
  assert.equal(result.remaining, 500);
  assert.equal(incremented, true);
});

test('ApiKeysService checkRateLimit denies when at limit', async () => {
  let incremented = false;
  const repo = {
    create: async () => {},
    findById: async () => null,
    findByAccount: async () => [],
    findActiveById: async () => null,
    findByPrefix: async () => [],
    update: async () => {},
    delete: async () => {},
    incrementUsage: async () => { incremented = true; },
    getUsageCount: async () => 1000,
    recordUsage: async () => {},
    getUsageHistory: async () => []
  };
  const service = new ApiKeysService(repo as ApiKeyRepository);

  const result = await service.checkRateLimit('key_test_789', 1000, 3600);

  assert.equal(result.allowed, false);
  assert.equal(result.remaining, 0);
  assert.equal(incremented, false);
});

test('ApiKeysService recordUsage records API key usage', async () => {
  let recordedUsage: any = null;
  const repo = {
    create: async () => {},
    findById: async () => null,
    findByAccount: async () => [],
    findActiveById: async () => null,
    findByPrefix: async () => [],
    update: async () => {},
    delete: async () => {},
    incrementUsage: async () => {},
    getUsageCount: async () => 0,
    recordUsage: async (usage: any) => { recordedUsage = usage; },
    getUsageHistory: async () => []
  };
  const service = new ApiKeysService(repo as ApiKeyRepository);

  await service.recordUsage({
    apiKeyId: 'key_test_789',
    endpoint: '/api/patients',
    method: 'GET',
    statusCode: 200,
    responseTimeMs: 45
  });

  assert.ok(recordedUsage, 'usage should be recorded');
  assert.equal(recordedUsage.apiKeyId, 'key_test_789');
  assert.equal(recordedUsage.endpoint, '/api/patients');
  assert.equal(recordedUsage.method, 'GET');
  assert.equal(recordedUsage.statusCode, 200);
});

test('ApiKeysService getUsageHistory returns usage history', async () => {
  const mockHistory = [
    { id: 'usage_1', apiKeyId: 'key_test_789', endpoint: '/api/test', method: 'GET', statusCode: 200, responseTimeMs: 30, createdAt: new Date().toISOString() }
  ];
  const repo = {
    create: async () => {},
    findById: async () => null,
    findByAccount: async () => [],
    findActiveById: async () => null,
    findByPrefix: async () => [],
    update: async () => {},
    delete: async () => {},
    incrementUsage: async () => {},
    getUsageCount: async () => 0,
    recordUsage: async () => {},
    getUsageHistory: async () => mockHistory
  };
  const service = new ApiKeysService(repo as ApiKeyRepository);

  const result = await service.getUsageHistory('key_test_789');

  assert.equal(result.length, 1);
});