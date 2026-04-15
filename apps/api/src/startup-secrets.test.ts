import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';

import { buildApiManagedSecretDescriptors, resolveApiStartup } from './startup-secrets.js';

async function startMockVaultServer(): Promise<{
  readonly baseUrl: string;
  readonly requests: string[];
  close(): Promise<void>;
}> {
  const requests: string[] = [];
  const server = createServer((request, response) => {
    requests.push(`${request.method} ${request.url}`);

    if (request.method === 'POST' && request.url === '/v1/auth/approle/login') {
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify({
        auth: {
          client_token: 'vault-token',
          lease_duration: 3600
        }
      }));
      return;
    }

    const payloads: Record<string, Record<string, string>> = {
      '/v1/secret/data/cvg-his-v2/production/api': {
        AUTH_SECRET: 'vault-auth-token-key-with-more-than-32-characters'
      },
      '/v1/secret/data/cvg-his-v2/production/database': {
        DATABASE_URL: 'postgres://vault-user:vault-pass@db:5432/cvg_his_v2'
      },
      '/v1/secret/data/cvg-his-v2/production/pagarme': {
        PAGARME_API_KEY: 'vault-pagarme-api-key',
        PAGARME_PIX_KEY: 'vault-pagarme-pix-key'
      }
    };

    const payload = request.url ? payloads[request.url] : undefined;
    if (request.method === 'GET' && payload) {
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify({
        data: {
          data: payload,
          metadata: {
            version: 1
          }
        }
      }));
      return;
    }

    response.writeHead(404, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ error: 'not found' }));
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('failed to bind mock Vault server');
  }

  return {
    baseUrl: `http://127.0.0.1:${address.port}`,
    requests,
    close: () => new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  };
}

test('buildApiManagedSecretDescriptors maps API secrets to environment-scoped Vault paths', () => {
  const descriptors = buildApiManagedSecretDescriptors({
    NODE_ENV: 'prod',
    ENABLE_MFA: 'true'
  });

  assert.deepEqual(
    descriptors.map((descriptor) => [descriptor.key, descriptor.path, descriptor.required]),
    [
      ['AUTH_SECRET', 'production/api', true],
      ['MFA_SECRET_ENCRYPTION_KEY', 'production/mfa', true],
      ['DATABASE_URL', 'production/database', true],
      ['REDIS_URL', 'production/redis', false],
      ['PAGARME_API_KEY', 'production/pagarme', false],
      ['PAGARME_PIX_KEY', 'production/pagarme', false]
    ]
  );
});

test('resolveApiStartup resolves managed secrets from Vault before validating API config', async () => {
  const vault = await startMockVaultServer();
  try {
    const startup = await resolveApiStartup({
      NODE_ENV: 'production',
      APP_NAME: 'cvg-his-v2-api',
      HOST: '127.0.0.1',
      PORT: '3001',
      CORS_ALLOWED_ORIGINS: 'https://app.cvg.com',
      FILE_STORAGE_PATH: '/tmp/cvg-his-v2',
      FEATURE_FLAGS_PROVIDER: 'env',
      API_FEATURE_FLAGS: '',
      PIX_MOCK_MODE: 'false',
      VAULT_ENABLED: 'true',
      VAULT_URL: vault.baseUrl,
      VAULT_ROLE_ID: 'role-id',
      VAULT_SECRET_ID: 'secret-id',
      VAULT_SECRET_PATH_PREFIX: 'secret/data/cvg-his-v2'
    });

    assert.equal(startup.secretsManager.provider, 'vault');
    assert.equal(startup.config.databaseUrl, 'postgres://vault-user:vault-pass@db:5432/cvg_his_v2');
    assert.equal(startup.config.authSecret, 'vault-auth-token-key-with-more-than-32-characters');
    assert.equal(startup.config.pagarmeApiKey, 'vault-pagarme-api-key');
    assert.equal(startup.config.pagarmePixKey, 'vault-pagarme-pix-key');
    assert.equal(startup.env.DATABASE_URL, 'postgres://vault-user:vault-pass@db:5432/cvg_his_v2');
    assert.ok(vault.requests.includes('POST /v1/auth/approle/login'));
    assert.ok(vault.requests.includes('GET /v1/secret/data/cvg-his-v2/production/api'));
    assert.ok(vault.requests.includes('GET /v1/secret/data/cvg-his-v2/production/database'));
  } finally {
    await vault.close();
  }
});

test('resolveApiStartup preserves explicit env secrets instead of overriding them from Vault', async () => {
  const vault = await startMockVaultServer();
  try {
    const startup = await resolveApiStartup({
      NODE_ENV: 'production',
      APP_NAME: 'cvg-his-v2-api',
      HOST: '127.0.0.1',
      PORT: '3001',
      CORS_ALLOWED_ORIGINS: 'https://app.cvg.com',
      FILE_STORAGE_PATH: '/tmp/cvg-his-v2',
      AUTH_SECRET: 'explicit-auth-token-key-with-more-than-32-characters',
      DATABASE_URL: 'postgres://env-user:env-pass@db:5432/cvg_his_v2',
      VAULT_ENABLED: 'true',
      VAULT_URL: vault.baseUrl,
      VAULT_ROLE_ID: 'role-id',
      VAULT_SECRET_ID: 'secret-id',
      VAULT_SECRET_PATH_PREFIX: 'secret/data/cvg-his-v2'
    });

    assert.equal(startup.config.authSecret, 'explicit-auth-token-key-with-more-than-32-characters');
    assert.equal(startup.config.databaseUrl, 'postgres://env-user:env-pass@db:5432/cvg_his_v2');
    assert.equal(vault.requests.includes('GET /v1/secret/data/cvg-his-v2/production/api'), false);
    assert.equal(vault.requests.includes('GET /v1/secret/data/cvg-his-v2/production/database'), false);
  } finally {
    await vault.close();
  }
});
