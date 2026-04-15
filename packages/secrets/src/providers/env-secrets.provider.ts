/**
 * EnvSecretsProvider — fallback secrets manager that reads from process.env.
 * This is the default provider when VAULT_ENABLED is not set.
 */

import type { SecretDescriptor, SecretsManager } from '../types.js';
import { requireNonEmptyString } from '@cvg-his-v2/shared-validation';
import { createLogger } from '@cvg-his-v2/shared-logging';

const logger = createLogger('secrets:env');

export class EnvSecretsProvider implements SecretsManager {
  readonly provider = 'env' as const;

  async get(secret: SecretDescriptor): Promise<string> {
    const value = process.env[secret.key];
    if (!value) {
      if (secret.required) {
        throw new Error(`Required secret ${secret.key} is not set in environment`);
      }
      logger.warn('secret not found in environment, returning empty string', { key: secret.key });
      return '';
    }
    return value;
  }

  async getMany(secrets: readonly SecretDescriptor[]): Promise<Record<string, string>> {
    const result: Record<string, string> = {};
    for (const secret of secrets) {
      result[secret.key] = await this.get(secret);
    }
    return result;
  }

  async health(): Promise<boolean> {
    return true;
  }
}
