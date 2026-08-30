/**
 * Secrets Manager — CVG-HIS-V2 Enterprise
 *
 * Provides a unified interface for reading secrets from multiple backends:
 * - EnvSecretsProvider: reads from process.env (fallback for dev/test)
 * - VaultSecretsProvider: reads from HashiCorp Vault KV-v2 via AppRole
 */

export type { SecretsManager, SecretDescriptor, SecretsManagerConfig } from './types.js';
export { EnvSecretsProvider } from './providers/env-secrets.provider.js';

import type { SecretsManager, SecretsManagerConfig } from './types.js';
import { EnvSecretsProvider } from './providers/env-secrets.provider.js';

function isProductionLikeEnvironment(environment: string | undefined): boolean {
  const normalized = environment?.trim().toLowerCase();
  return (
    normalized === 'production' ||
    normalized === 'prod' ||
    normalized === 'staging' ||
    normalized === 'stage'
  );
}

function isNotEmpty(s: string | undefined): s is string {
  return s !== undefined && s.length > 0;
}

/**
 * Factory: creates the appropriate SecretsManager based on config.
 * When vaultEnabled is true and all required Vault env vars are present,
 * uses VaultSecretsProvider. An incomplete Vault setup falls back to
 * EnvSecretsProvider only outside production-like environments.
 */
export async function createSecretsManager(config: SecretsManagerConfig): Promise<SecretsManager> {
  if (!config.vaultEnabled) {
    return new EnvSecretsProvider();
  }

  if (
    !isNotEmpty(config.vaultUrl) ||
    !isNotEmpty(config.vaultRoleId) ||
    !isNotEmpty(config.vaultSecretId)
  ) {
    const message =
      '[secrets] Vault configuration incomplete: VAULT_ENABLED=1 but VAULT_URL/VAULT_ROLE_ID/VAULT_SECRET_ID not fully set.';

    if (isProductionLikeEnvironment(config.environment)) {
      throw new Error(`${message} Refusing env-based fallback in production-like environment.`);
    }

    // Missing Vault config is an explicit local/dev fallback only.
    console.warn(
      `${message} Falling back to env-based secrets outside production-like environments.`
    );
    return new EnvSecretsProvider();
  }

  const { VaultSecretsProvider } = await import('./providers/vault-secrets.provider.js');
  return new VaultSecretsProvider({
    vaultUrl: config.vaultUrl,
    vaultRoleId: config.vaultRoleId,
    vaultSecretId: config.vaultSecretId,
    vaultNamespace: config.vaultNamespace,
    secretPathPrefix: config.vaultSecretPathPrefix
  });
}
