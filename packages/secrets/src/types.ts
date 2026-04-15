/**
 * Core types for the secrets manager interface.
 */

export type SecretValue = string;

export interface SecretDescriptor {
  /**
   * Environment variable key to fall back to when using EnvSecretsProvider.
   * Also used as the secret name in Vault KV-v2 paths.
   */
  readonly key: string;
  /**
   * Vault KV-v2 secret path (without the `secret/data/` prefix).
   * Example: 'cvg-his-v2/production/api'
   */
  readonly path: string;
  /**
   * Optional version for Vault KV-v2. Defaults to latest.
   */
  readonly version?: number;
  /**
   * Whether the secret is required for the application to start.
   * If true and the secret is missing, throws on startup.
   */
  readonly required?: boolean;
}

export interface SecretsManagerConfig {
  readonly vaultEnabled: boolean;
  readonly vaultUrl?: string;
  readonly vaultRoleId?: string;
  readonly vaultSecretId?: string;
  readonly vaultNamespace?: string;
  /**
   * Default path prefix for Vault KV-v2 secrets.
   * Example: 'secret/data/cvg-his-v2'
   */
  readonly vaultSecretPathPrefix?: string;
}

export interface SecretsManager {
  readonly provider: 'vault' | 'env';
  get(secret: SecretDescriptor): Promise<string>;
  getMany(secrets: readonly SecretDescriptor[]): Promise<Record<string, string>>;
  health(): Promise<boolean>;
}
