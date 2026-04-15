/**
 * Secrets Manager — CVG-HIS-V2 Enterprise
 *
 * Provides a unified interface for reading secrets from multiple backends:
 * - EnvSecretsProvider: reads from process.env (fallback for dev/local)
 * - VaultSecretsProvider: reads from HashiCorp Vault KV-v2 via AppRole
 */

export type { SecretsManager, SecretDescriptor, SecretsManagerConfig } from './types.js';
export { EnvSecretsProvider } from './providers/env-secrets.provider.js';

import type { SecretsManager, SecretsManagerConfig } from './types.js';
import { EnvSecretsProvider } from './providers/env-secrets.provider.js';

function isNotEmpty(s: string | undefined): s is string {
  return s !== undefined && s.length > 0;
}

/**
 * Factory: creates the appropriate SecretsManager based on config.
 * When vaultEnabled is true and all required Vault env vars are present,
 * uses VaultSecretsProvider. Otherwise falls back to EnvSecretsProvider.
 */
export async function createSecretsManager(
  config: SecretsManagerConfig
): Promise<SecretsManager> {
  if (!config.vaultEnabled) {
    return new EnvSecretsProvider();
  }

  if (!isNotEmpty(config.vaultUrl) || !isNotEmpty(config.vaultRoleId) || !isNotEmpty(config.vaultSecretId)) {
    // Missing Vault config — fall back to env provider with warning
    console.warn(
      '[secrets] VAULT_ENABLED=1 but VAULT_URL/VAULT_ROLE_ID/VAULT_SECRET_ID not fully set. ' +
      'Falling back to env-based secrets.'
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
