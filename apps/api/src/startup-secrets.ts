import {
  loadApiConfig,
  type ApiAppConfig,
  validateSetupBootstrapToken
} from '@cvg-his-v2/shared-config';
import {
  createSecretsManager,
  type SecretDescriptor,
  type SecretsManager
} from '@cvg-his-v2/secrets';

export interface ApiStartupResolution {
  readonly config: ApiAppConfig;
  readonly secretsManager: SecretsManager;
  readonly env: NodeJS.ProcessEnv;
}

export interface SecretRotationStatusReport {
  readonly provider: string;
  readonly environment: string;
  readonly authSecretVersion?: string;
  readonly previousAuthSecretConfigured: boolean;
  readonly mfaEncryptionKeyVersion?: string;
  readonly rotationReady: boolean;
}

const API_SECRET_PATHS: Readonly<Record<string, string>> = {
  AUTH_SECRET: 'api',
  AUTH_SECRET_PREVIOUS: 'api_previous',
  AUTH_SECRET_VERSION: 'api_version',
  MFA_SECRET_ENCRYPTION_KEY: 'mfa',
  MFA_SECRET_ENCRYPTION_KEY_VERSION: 'mfa_version',
  MFA_SECRET_ENCRYPTION_KEYRING_JSON: 'mfa_keyring',
  DATABASE_URL: 'database',
  REDIS_URL: 'redis',
  PAGARME_API_KEY: 'pagarme',
  PAGARME_PIX_KEY: 'pagarme',
  NFSE_API_KEY: 'nfse',
  NFSE_CERTIFICATE_BASE64: 'nfse',
  NFSE_ISSUER_JSON: 'nfse',
  SETUP_BOOTSTRAP_TOKEN: 'api_setup',
  PIX_WEBHOOK_KEYRING_JSON: 'pix_webhook',
  LABORATORY_PROVIDER_KEYRING_JSON: 'laboratory_provider'
};

function isTruthy(value: string | undefined): boolean {
  return value === '1' || value === 'true';
}

function normalizeVaultEnvironment(value: string | undefined): string {
  switch (value) {
    case 'prod':
      return 'production';
    case 'stage':
      return 'staging';
    default:
      return value?.trim() || 'development';
  }
}

function isProductionLikeEnvironment(value: string): boolean {
  return value === 'production' || value === 'staging';
}

function hasConfiguredValue(value: string | undefined): value is string {
  return value !== undefined && value.trim().length > 0;
}

export function buildApiManagedSecretDescriptors(env: NodeJS.ProcessEnv): SecretDescriptor[] {
  const environment = normalizeVaultEnvironment(env.NODE_ENV);
  const productionLike = isProductionLikeEnvironment(environment);
  const enableMfa = isTruthy(env.ENABLE_MFA);

  return Object.entries(API_SECRET_PATHS).map(([key, pathSuffix]) => ({
    key,
    path: `${environment}/${pathSuffix}`,
    required:
      ((key === 'AUTH_SECRET' || key === 'DATABASE_URL') && productionLike) ||
      (key === 'PIX_WEBHOOK_KEYRING_JSON' && isTruthy(env.PIX_SYNTHETIC_WEBHOOK_ENABLED)) ||
      (key === 'MFA_SECRET_ENCRYPTION_KEY' && enableMfa)
  }));
}

export async function resolveApiEnvironmentWithSecrets(
  env: NodeJS.ProcessEnv,
  secretsManager: SecretsManager
): Promise<NodeJS.ProcessEnv> {
  const resolvedEnv: NodeJS.ProcessEnv = { ...env };
  const secretsToFetch = buildApiManagedSecretDescriptors(env).filter(
    (descriptor) => !hasConfiguredValue(resolvedEnv[descriptor.key])
  );

  if (secretsToFetch.length === 0) {
    return resolvedEnv;
  }

  const resolvedSecrets = await secretsManager.getMany(secretsToFetch);
  for (const descriptor of secretsToFetch) {
    const value = resolvedSecrets[descriptor.key];
    if (hasConfiguredValue(value)) {
      resolvedEnv[descriptor.key] = value;
    }
  }

  return resolvedEnv;
}

export async function resolveApiStartup(
  env: NodeJS.ProcessEnv = process.env
): Promise<ApiStartupResolution> {
  const secretsManager = await createSecretsManager({
    vaultEnabled: isTruthy(env.VAULT_ENABLED),
    environment: normalizeVaultEnvironment(env.NODE_ENV),
    vaultUrl: env.VAULT_URL,
    vaultRoleId: env.VAULT_ROLE_ID,
    vaultSecretId: env.VAULT_SECRET_ID,
    vaultNamespace: env.VAULT_NAMESPACE,
    vaultSecretPathPrefix: env.VAULT_SECRET_PATH_PREFIX
  });
  const resolvedEnv = await resolveApiEnvironmentWithSecrets(env, secretsManager);
  if (hasConfiguredValue(resolvedEnv.SETUP_BOOTSTRAP_TOKEN)) {
    validateSetupBootstrapToken(resolvedEnv.SETUP_BOOTSTRAP_TOKEN);
  }

  return {
    config: loadApiConfig(resolvedEnv),
    secretsManager,
    env: resolvedEnv
  };
}

export function buildSecretRotationStatusReport(input: {
  readonly env: NodeJS.ProcessEnv;
  readonly provider: string;
}): SecretRotationStatusReport {
  const environment = normalizeVaultEnvironment(input.env.NODE_ENV);
  const authSecretVersion = input.env.AUTH_SECRET_VERSION?.trim() || undefined;
  const previousAuthSecretConfigured = hasConfiguredValue(input.env.AUTH_SECRET_PREVIOUS);
  const mfaEncryptionKeyVersion = input.env.MFA_SECRET_ENCRYPTION_KEY_VERSION?.trim() || undefined;

  return {
    provider: input.provider,
    environment,
    authSecretVersion,
    previousAuthSecretConfigured,
    mfaEncryptionKeyVersion,
    rotationReady:
      hasConfiguredValue(input.env.AUTH_SECRET) &&
      authSecretVersion !== undefined &&
      (previousAuthSecretConfigured || !isProductionLikeEnvironment(environment))
  };
}
