import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildApiManagedSecretDescriptors,
  buildSecretRotationStatusReport,
  resolveApiStartup
} from './startup-secrets.js';

function installMockVaultFetch(): {
  readonly baseUrl: string;
  readonly requests: string[];
  close(): void;
} {
  const originalFetch = globalThis.fetch;
  const requests: string[] = [];
  const baseUrl = 'https://vault.test';
  const payloads: Record<string, Record<string, string>> = {
    '/v1/secret/data/cvg-his-v2/production/api': {
      AUTH_SECRET: 'vault-auth-token-key-with-more-than-32-characters'
    },
    '/v1/secret/data/cvg-his-v2/production/api_previous': {
      AUTH_SECRET_PREVIOUS: 'vault-previous-auth-token-key-with-more-than-32-characters'
    },
    '/v1/secret/data/cvg-his-v2/production/api_version': {
      AUTH_SECRET_VERSION: '2026-q2'
    },
    '/v1/secret/data/cvg-his-v2/production/database': {
      DATABASE_URL: 'postgres://vault-user:vault-pass@db:5432/cvg_his_v2'
    },
    '/v1/secret/data/cvg-his-v2/production/pagarme': {
      PAGARME_API_KEY: 'vault-pagarme-api-key',
      PAGARME_PIX_KEY: 'vault-pagarme-pix-key'
    }
  };

  globalThis.fetch = async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    const method = init?.method ?? (input instanceof Request ? input.method : 'GET');
    requests.push(`${method} ${url.pathname}`);

    if (method === 'POST' && url.pathname === '/v1/auth/approle/login') {
      return Response.json({
        auth: {
          client_token: 'vault-token',
          lease_duration: 3600
        }
      });
    }

    const payload = payloads[url.pathname];
    if (method === 'GET' && payload) {
      return Response.json({
        data: {
          data: payload,
          metadata: {
            version: 1
          }
        }
      });
    }

    return Response.json({ error: 'not found' }, { status: 404 });
  };

  return {
    baseUrl,
    requests,
    close: () => {
      globalThis.fetch = originalFetch;
    }
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
      ['AUTH_SECRET_PREVIOUS', 'production/api_previous', false],
      ['AUTH_SECRET_VERSION', 'production/api_version', false],
      ['MFA_SECRET_ENCRYPTION_KEY', 'production/mfa', true],
      ['MFA_SECRET_ENCRYPTION_KEY_VERSION', 'production/mfa_version', false],
      ['DATABASE_URL', 'production/database', true],
      ['REDIS_URL', 'production/redis', false],
      ['PAGARME_API_KEY', 'production/pagarme', false],
      ['PAGARME_PIX_KEY', 'production/pagarme', false],
      ['NFSE_API_KEY', 'production/nfse', false],
      ['NFSE_CERTIFICATE_BASE64', 'production/nfse', false],
      ['NFSE_ISSUER_JSON', 'production/nfse', false],
      ['SETUP_BOOTSTRAP_TOKEN', 'production/api_setup', false]
    ]
  );
});

test('resolveApiStartup resolves managed secrets from Vault before validating API config', async () => {
  const vault = installMockVaultFetch();
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
    assert.deepEqual(startup.config.authVerifierSecrets, [
      'vault-previous-auth-token-key-with-more-than-32-characters'
    ]);
    assert.equal(startup.config.authSecretVersion, '2026-q2');
    assert.equal(startup.config.pagarmeApiKey, 'vault-pagarme-api-key');
    assert.equal(startup.config.pagarmePixKey, 'vault-pagarme-pix-key');
    assert.equal(startup.env.DATABASE_URL, 'postgres://vault-user:vault-pass@db:5432/cvg_his_v2');
    assert.ok(vault.requests.includes('POST /v1/auth/approle/login'));
    assert.ok(vault.requests.includes('GET /v1/secret/data/cvg-his-v2/production/api'));
    assert.ok(vault.requests.includes('GET /v1/secret/data/cvg-his-v2/production/api_previous'));
    assert.ok(vault.requests.includes('GET /v1/secret/data/cvg-his-v2/production/database'));
  } finally {
    vault.close();
  }
});

test('resolveApiStartup preserves explicit env secrets instead of overriding them from Vault', async () => {
  const vault = installMockVaultFetch();
  try {
    const startup = await resolveApiStartup({
      NODE_ENV: 'production',
      APP_NAME: 'cvg-his-v2-api',
      HOST: '127.0.0.1',
      PORT: '3001',
      CORS_ALLOWED_ORIGINS: 'https://app.cvg.com',
      FILE_STORAGE_PATH: '/tmp/cvg-his-v2',
      AUTH_SECRET: 'explicit-auth-token-key-with-more-than-32-characters',
      AUTH_SECRET_PREVIOUS: 'explicit-previous-auth-token-key-with-more-than-32-chars',
      DATABASE_URL: 'postgres://env-user:env-pass@db:5432/cvg_his_v2',
      VAULT_ENABLED: 'true',
      VAULT_URL: vault.baseUrl,
      VAULT_ROLE_ID: 'role-id',
      VAULT_SECRET_ID: 'secret-id',
      VAULT_SECRET_PATH_PREFIX: 'secret/data/cvg-his-v2'
    });

    assert.equal(startup.config.authSecret, 'explicit-auth-token-key-with-more-than-32-characters');
    assert.deepEqual(startup.config.authVerifierSecrets, [
      'explicit-previous-auth-token-key-with-more-than-32-chars'
    ]);
    assert.equal(startup.config.databaseUrl, 'postgres://env-user:env-pass@db:5432/cvg_his_v2');
    assert.equal(vault.requests.includes('GET /v1/secret/data/cvg-his-v2/production/api'), false);
    assert.equal(vault.requests.includes('GET /v1/secret/data/cvg-his-v2/production/database'), false);
  } finally {
    vault.close();
  }
});

test('buildSecretRotationStatusReport summarizes readiness for audited secret rotation', () => {
  const report = buildSecretRotationStatusReport({
    provider: 'vault',
    env: {
      NODE_ENV: 'production',
      AUTH_SECRET: 'explicit-auth-token-key-with-more-than-32-characters',
      AUTH_SECRET_PREVIOUS: 'previous-auth-token-key-with-more-than-32-characters',
      AUTH_SECRET_VERSION: '2026-q2',
      MFA_SECRET_ENCRYPTION_KEY_VERSION: '2026-h1'
    }
  });

  assert.deepEqual(report, {
    provider: 'vault',
    environment: 'production',
    authSecretVersion: '2026-q2',
    previousAuthSecretConfigured: true,
    mfaEncryptionKeyVersion: '2026-h1',
    rotationReady: true
  });
});
