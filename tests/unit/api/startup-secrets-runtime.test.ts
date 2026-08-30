import { beforeEach, describe, expect, it, vi } from 'vitest';

const { loadApiConfigMock, createSecretsManagerMock, validateSetupBootstrapTokenMock } = vi.hoisted(
  () => ({
    loadApiConfigMock: vi.fn((env: NodeJS.ProcessEnv) => ({
      authSecret: env.AUTH_SECRET,
      authVerifierSecrets: env.AUTH_SECRET_PREVIOUS
        ? env.AUTH_SECRET_PREVIOUS.split(',')
            .map((value) => value.trim())
            .filter(Boolean)
        : [],
      authSecretVersion: env.AUTH_SECRET_VERSION,
      databaseUrl: env.DATABASE_URL,
      pagarmeApiKey: env.PAGARME_API_KEY,
      pagarmePixKey: env.PAGARME_PIX_KEY,
      setupBootstrapToken: env.SETUP_BOOTSTRAP_TOKEN,
      appName: env.APP_NAME ?? 'cvg-his-v2-api'
    })),
    createSecretsManagerMock: vi.fn(),
    validateSetupBootstrapTokenMock: vi.fn((token: string) => {
      if (token === 'vault-weak-setup-token') {
        throw new Error(
          'SETUP_BOOTSTRAP_TOKEN must contain at least 43 characters from a high-entropy secret generator.'
        );
      }
    })
  })
);

const VALID_SETUP_TOKEN = '0123456789abcdef'.repeat(4);

vi.mock('@cvg-his-v2/shared-config', () => ({
  loadApiConfig: loadApiConfigMock,
  validateSetupBootstrapToken: validateSetupBootstrapTokenMock
}));

vi.mock('@cvg-his-v2/secrets', () => ({
  createSecretsManager: createSecretsManagerMock
}));

import {
  buildApiManagedSecretDescriptors,
  buildSecretRotationStatusReport,
  resolveApiEnvironmentWithSecrets,
  resolveApiStartup
} from '../../../apps/api/src/startup-secrets.ts';

describe('startup-secrets runtime coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maps stage environment and MFA requirement correctly', () => {
    const descriptors = buildApiManagedSecretDescriptors({
      NODE_ENV: 'stage',
      ENABLE_MFA: '1'
    });

    expect(descriptors).toEqual([
      { key: 'AUTH_SECRET', path: 'staging/api', required: true },
      { key: 'AUTH_SECRET_PREVIOUS', path: 'staging/api_previous', required: false },
      { key: 'AUTH_SECRET_VERSION', path: 'staging/api_version', required: false },
      { key: 'MFA_SECRET_ENCRYPTION_KEY', path: 'staging/mfa', required: true },
      { key: 'MFA_SECRET_ENCRYPTION_KEY_VERSION', path: 'staging/mfa_version', required: false },
      { key: 'MFA_SECRET_ENCRYPTION_KEYRING_JSON', path: 'staging/mfa_keyring', required: false },
      { key: 'DATABASE_URL', path: 'staging/database', required: true },
      { key: 'REDIS_URL', path: 'staging/redis', required: false },
      { key: 'PAGARME_API_KEY', path: 'staging/pagarme', required: false },
      { key: 'PAGARME_PIX_KEY', path: 'staging/pagarme', required: false },
      { key: 'NFSE_API_KEY', path: 'staging/nfse', required: false },
      { key: 'NFSE_CERTIFICATE_BASE64', path: 'staging/nfse', required: false },
      { key: 'NFSE_ISSUER_JSON', path: 'staging/nfse', required: false },
      { key: 'SETUP_BOOTSTRAP_TOKEN', path: 'staging/api_setup', required: false },
      { key: 'PIX_WEBHOOK_KEYRING_JSON', path: 'staging/pix_webhook', required: false },
      {
        key: 'LABORATORY_PROVIDER_KEYRING_JSON',
        path: 'staging/laboratory_provider',
        required: false
      }
    ]);
  });

  it('uses development paths and non-required secrets outside production-like environments', () => {
    const descriptors = buildApiManagedSecretDescriptors({
      NODE_ENV: '   ',
      ENABLE_MFA: 'false'
    });

    expect(descriptors).toEqual([
      { key: 'AUTH_SECRET', path: 'development/api', required: false },
      { key: 'AUTH_SECRET_PREVIOUS', path: 'development/api_previous', required: false },
      { key: 'AUTH_SECRET_VERSION', path: 'development/api_version', required: false },
      { key: 'MFA_SECRET_ENCRYPTION_KEY', path: 'development/mfa', required: false },
      {
        key: 'MFA_SECRET_ENCRYPTION_KEY_VERSION',
        path: 'development/mfa_version',
        required: false
      },
      {
        key: 'MFA_SECRET_ENCRYPTION_KEYRING_JSON',
        path: 'development/mfa_keyring',
        required: false
      },
      { key: 'DATABASE_URL', path: 'development/database', required: false },
      { key: 'REDIS_URL', path: 'development/redis', required: false },
      { key: 'PAGARME_API_KEY', path: 'development/pagarme', required: false },
      { key: 'PAGARME_PIX_KEY', path: 'development/pagarme', required: false },
      { key: 'NFSE_API_KEY', path: 'development/nfse', required: false },
      { key: 'NFSE_CERTIFICATE_BASE64', path: 'development/nfse', required: false },
      { key: 'NFSE_ISSUER_JSON', path: 'development/nfse', required: false },
      { key: 'SETUP_BOOTSTRAP_TOKEN', path: 'development/api_setup', required: false },
      { key: 'PIX_WEBHOOK_KEYRING_JSON', path: 'development/pix_webhook', required: false },
      {
        key: 'LABORATORY_PROVIDER_KEYRING_JSON',
        path: 'development/laboratory_provider',
        required: false
      }
    ]);
  });

  it('fetches only missing managed secrets and ignores blank provider values', async () => {
    const getMany = vi.fn(async () => ({
      AUTH_SECRET: 'vault-auth-secret',
      DATABASE_URL: '   ',
      PAGARME_API_KEY: 'vault-pagarme',
      SETUP_BOOTSTRAP_TOKEN: 'vault-setup-token'
    }));

    const resolved = await resolveApiEnvironmentWithSecrets(
      {
        NODE_ENV: 'production',
        ENABLE_MFA: 'false',
        DATABASE_URL: 'postgres://already-set',
        PAGARME_PIX_KEY: 'env-pix-key'
      },
      { provider: 'vault', getMany } as never
    );

    expect(getMany).toHaveBeenCalledTimes(1);
    expect(getMany).toHaveBeenCalledWith([
      { key: 'AUTH_SECRET', path: 'production/api', required: true },
      { key: 'AUTH_SECRET_PREVIOUS', path: 'production/api_previous', required: false },
      { key: 'AUTH_SECRET_VERSION', path: 'production/api_version', required: false },
      { key: 'MFA_SECRET_ENCRYPTION_KEY', path: 'production/mfa', required: false },
      { key: 'MFA_SECRET_ENCRYPTION_KEY_VERSION', path: 'production/mfa_version', required: false },
      {
        key: 'MFA_SECRET_ENCRYPTION_KEYRING_JSON',
        path: 'production/mfa_keyring',
        required: false
      },
      { key: 'REDIS_URL', path: 'production/redis', required: false },
      { key: 'PAGARME_API_KEY', path: 'production/pagarme', required: false },
      { key: 'NFSE_API_KEY', path: 'production/nfse', required: false },
      { key: 'NFSE_CERTIFICATE_BASE64', path: 'production/nfse', required: false },
      { key: 'NFSE_ISSUER_JSON', path: 'production/nfse', required: false },
      { key: 'SETUP_BOOTSTRAP_TOKEN', path: 'production/api_setup', required: false },
      { key: 'PIX_WEBHOOK_KEYRING_JSON', path: 'production/pix_webhook', required: false },
      {
        key: 'LABORATORY_PROVIDER_KEYRING_JSON',
        path: 'production/laboratory_provider',
        required: false
      }
    ]);
    expect(resolved.AUTH_SECRET).toBe('vault-auth-secret');
    expect(resolved.DATABASE_URL).toBe('postgres://already-set');
    expect(resolved.PAGARME_API_KEY).toBe('vault-pagarme');
    expect(resolved.PAGARME_PIX_KEY).toBe('env-pix-key');
    expect(resolved.SETUP_BOOTSTRAP_TOKEN).toBe('vault-setup-token');
  });

  it('skips secrets manager reads when all managed values are already configured', async () => {
    const getMany = vi.fn();

    const resolved = await resolveApiEnvironmentWithSecrets(
      {
        NODE_ENV: 'production',
        ENABLE_MFA: 'true',
        AUTH_SECRET: 'configured-auth',
        AUTH_SECRET_PREVIOUS: 'configured-prev-auth',
        MFA_SECRET_ENCRYPTION_KEY: 'configured-mfa-secret',
        AUTH_SECRET_VERSION: '2026-q2',
        MFA_SECRET_ENCRYPTION_KEY_VERSION: '2026-h1',
        MFA_SECRET_ENCRYPTION_KEYRING_JSON: '{"2025-h2":"configured-previous-mfa-secret"}',
        DATABASE_URL: 'postgres://configured',
        REDIS_URL: 'redis://configured',
        PAGARME_API_KEY: 'configured-pagarme',
        PAGARME_PIX_KEY: 'configured-pix',
        NFSE_API_KEY: 'configured-nfse',
        NFSE_CERTIFICATE_BASE64: 'configured-cert',
        NFSE_ISSUER_JSON: '{"cnpj":"configured"}',
        SETUP_BOOTSTRAP_TOKEN: 'configured-setup-token',
        PIX_WEBHOOK_KEYRING_JSON:
          '{"local-key-01":{"accountId":"11111111-1111-4111-8111-111111111111","secretBase64":"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="}}',
        LABORATORY_PROVIDER_KEYRING_JSON:
          '{"lab-key-01":{"accountId":"11111111-1111-4111-8111-111111111111","secretBase64":"AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="}}'
      },
      { provider: 'vault', getMany } as never
    );

    expect(getMany).not.toHaveBeenCalled();
    expect(resolved.AUTH_SECRET).toBe('configured-auth');
    expect(resolved.AUTH_SECRET_PREVIOUS).toBe('configured-prev-auth');
    expect(resolved.MFA_SECRET_ENCRYPTION_KEY).toBe('configured-mfa-secret');
    expect(resolved.MFA_SECRET_ENCRYPTION_KEYRING_JSON).toContain('2025-h2');
    expect(resolved.SETUP_BOOTSTRAP_TOKEN).toBe('configured-setup-token');
  });

  it('resolves startup by wiring the secrets manager into loadApiConfig', async () => {
    const secretsManager = {
      provider: 'vault',
      getMany: vi.fn(async () => ({
        AUTH_SECRET: 'vault-auth-secret',
        AUTH_SECRET_PREVIOUS: 'vault-prev-auth-secret',
        AUTH_SECRET_VERSION: '2026-q2',
        DATABASE_URL: 'postgres://vault-db',
        PAGARME_API_KEY: 'vault-pagarme',
        PAGARME_PIX_KEY: 'vault-pix',
        SETUP_BOOTSTRAP_TOKEN: VALID_SETUP_TOKEN
      }))
    };
    createSecretsManagerMock.mockResolvedValue(secretsManager);

    const startup = await resolveApiStartup({
      NODE_ENV: 'production',
      VAULT_ENABLED: 'true',
      VAULT_URL: 'http://vault:8200',
      VAULT_ROLE_ID: 'role-id',
      VAULT_SECRET_ID: 'secret-id',
      VAULT_NAMESPACE: 'ops',
      VAULT_SECRET_PATH_PREFIX: 'secret/data/cvg-his-v2'
    });

    expect(createSecretsManagerMock).toHaveBeenCalledWith({
      vaultEnabled: true,
      environment: 'production',
      vaultUrl: 'http://vault:8200',
      vaultRoleId: 'role-id',
      vaultSecretId: 'secret-id',
      vaultNamespace: 'ops',
      vaultSecretPathPrefix: 'secret/data/cvg-his-v2'
    });
    expect(loadApiConfigMock).toHaveBeenCalledWith(
      expect.objectContaining({
        AUTH_SECRET: 'vault-auth-secret',
        AUTH_SECRET_PREVIOUS: 'vault-prev-auth-secret',
        AUTH_SECRET_VERSION: '2026-q2',
        DATABASE_URL: 'postgres://vault-db',
        PAGARME_API_KEY: 'vault-pagarme',
        PAGARME_PIX_KEY: 'vault-pix',
        SETUP_BOOTSTRAP_TOKEN: VALID_SETUP_TOKEN
      })
    );
    expect(startup.secretsManager).toBe(secretsManager);
    expect(startup.env.AUTH_SECRET).toBe('vault-auth-secret');
    expect(startup.env.AUTH_SECRET_PREVIOUS).toBe('vault-prev-auth-secret');
    expect(startup.config.authVerifierSecrets).toEqual(['vault-prev-auth-secret']);
    expect(startup.config.authSecretVersion).toBe('2026-q2');
    expect(startup.config.authSecret).toBe('vault-auth-secret');
    expect(startup.config.setupBootstrapToken).toBe(VALID_SETUP_TOKEN);
  });

  it('rejects a weak Vault-resolved setup token before returning startup config', async () => {
    const weakToken = 'vault-weak-setup-token';
    const secretsManager = {
      provider: 'vault',
      getMany: vi.fn(async () => ({ SETUP_BOOTSTRAP_TOKEN: weakToken }))
    };
    createSecretsManagerMock.mockResolvedValue(secretsManager);

    await expect(
      resolveApiStartup({
        NODE_ENV: 'test',
        VAULT_ENABLED: 'true',
        VAULT_URL: 'http://vault:8200'
      })
    ).rejects.toThrow(/SETUP_BOOTSTRAP_TOKEN must contain at least/);

    expect(loadApiConfigMock).not.toHaveBeenCalled();
  });

  it('passes the normalized production-like environment to the secrets factory', async () => {
    const startupError = new Error(
      'Vault configuration incomplete; refusing env fallback in production-like environment'
    );
    createSecretsManagerMock.mockRejectedValue(startupError);

    await expect(
      resolveApiStartup({
        NODE_ENV: 'prod',
        VAULT_ENABLED: 'true'
      })
    ).rejects.toThrow(startupError.message);

    expect(createSecretsManagerMock).toHaveBeenCalledWith({
      vaultEnabled: true,
      environment: 'production',
      vaultUrl: undefined,
      vaultRoleId: undefined,
      vaultSecretId: undefined,
      vaultNamespace: undefined,
      vaultSecretPathPrefix: undefined
    });
    expect(loadApiConfigMock).not.toHaveBeenCalled();
  });

  it('reports rotation as not ready without secret version metadata in production', () => {
    const report = buildSecretRotationStatusReport({
      provider: 'env',
      env: {
        NODE_ENV: 'production',
        AUTH_SECRET: 'configured-auth',
        AUTH_SECRET_PREVIOUS: 'configured-prev-auth'
      }
    });

    expect(report).toEqual({
      provider: 'env',
      environment: 'production',
      authSecretVersion: undefined,
      previousAuthSecretConfigured: true,
      mfaEncryptionKeyVersion: undefined,
      rotationReady: false
    });
  });
});
