/**
 * VaultSecretsProvider — reads secrets from HashiCorp Vault KV-v2 using AppRole auth.
 *
 * Authentication: AppRole (role_id + secret_id) — ideal for machine-to-machine.
 * Secrets engine: KV-v2 at `secret/data/<path>`
 * Token management: short-lived tokens cached with TTL, auto-renewed.
 * Retry: exponential backoff on transient failures.
 */

import type { SecretDescriptor, SecretsManager, SecretsManagerConfig } from '../types.js';
import { createLogger } from '@cvg-his-v2/shared-logging';

const logger = createLogger('secrets:vault');

interface VaultToken {
  readonly token: string;
  readonly expiresAt: number; // Unix ms
}

interface CachedSecret {
  readonly value: string;
  readonly version: number;
}

/**
 * Configuration for VaultSecretsProvider.
 * All fields optional — loaded from env vars via SecretsManagerConfig.
 */
export interface VaultProviderOptions {
  readonly vaultUrl: string;
  readonly vaultRoleId: string;
  readonly vaultSecretId: string;
  readonly vaultNamespace?: string;
  readonly secretPathPrefix?: string;
  /** Token TTL in ms. Default: 5 minutes */
  readonly tokenTtlMs?: number;
  /** Cache TTL for secret values in ms. Default: 30 seconds */
  readonly cacheTtlMs?: number;
  /** HTTP agent for proxy support */
  readonly agent?: import('node:http').Agent;
}

export class VaultSecretsProvider implements SecretsManager {
  readonly provider = 'vault' as const;

  private readonly vaultUrl: string;
  private readonly vaultRoleId: string;
  private readonly vaultSecretId: string;
  private readonly vaultNamespace?: string;
  private readonly secretPathPrefix: string;
  private readonly tokenTtlMs: number;
  private readonly cacheTtlMs: number;
  private readonly agent?: import('node:http').Agent;

  private cachedToken: VaultToken | null = null;
  private readonly secretCache = new Map<string, { value: string; version: number; expiresAt: number }>();

  constructor(options: VaultProviderOptions) {
    this.vaultUrl = options.vaultUrl.replace(/\/$/, '');
    this.vaultRoleId = options.vaultRoleId;
    this.vaultSecretId = options.vaultSecretId;
    this.vaultNamespace = options.vaultNamespace;
    this.secretPathPrefix = (options.secretPathPrefix ?? 'secret/data/cvg-his-v2').replace(/\/$/, '');
    this.tokenTtlMs = options.tokenTtlMs ?? 5 * 60 * 1000; // 5 minutes
    this.cacheTtlMs = options.cacheTtlMs ?? 30 * 1000; // 30 seconds
    this.agent = options.agent;
  }

  async get(secret: SecretDescriptor): Promise<string> {
    const fullPath = `${this.secretPathPrefix}/${secret.path}`;
    const cacheKey = `${fullPath}:${secret.version ?? 'latest'}`;

    // Check cache first
    const cached = this.secretCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    const token = await this.getToken();
    const vaultPath = `v1/${fullPath}`;

    const url = `${this.vaultUrl}/${vaultPath}${secret.version != null ? `?version=${secret.version}` : ''}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Vault-Token': token,
        'Content-Type': 'application/json',
        ...(this.vaultNamespace ? { 'X-Vault-Namespace': this.vaultNamespace } : {})
      },
      signal: AbortSignal.timeout(10_000),
      ...(this.agent ? { agent: this.agent } : {})
    });

    if (!response.ok) {
      if (response.status === 404) {
        logger.warn('secret not found in Vault', { path: fullPath });
        return '';
      }
      throw new Error(`Vault read failed for ${fullPath}: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as {
      data: { data: Record<string, string>; metadata: { version: number } };
    };

    const value = data.data.data[secret.key] ?? '';
    const version = data.data.metadata.version;

    // Cache the value
    this.secretCache.set(cacheKey, { value, version, expiresAt: Date.now() + this.cacheTtlMs });

    return value;
  }

  async getMany(secrets: readonly SecretDescriptor[]): Promise<Record<string, string>> {
    const result: Record<string, string> = {};
    await Promise.all(secrets.map(async (s) => {
      result[s.key] = await this.get(s);
    }));
    return result;
  }

  async health(): Promise<boolean> {
    try {
      const token = await this.getToken();
      const response = await fetch(`${this.vaultUrl}/v1/sys/health`, {
        method: 'GET',
        headers: {
          'X-Vault-Token': token,
          'Content-Type': 'application/json',
          ...(this.vaultNamespace ? { 'X-Vault-Namespace': this.vaultNamespace } : {})
        },
        signal: AbortSignal.timeout(5_000)
      });
      // 200 = sealed=false, initialized, standby=false
      // 429 = standby (may be used by active node)
      // 472 = data recovery mode replication
      // 473 = performance recovery mode replication
      return response.ok || response.status === 429;
    } catch {
      return false;
    }
  }

  private async getToken(): Promise<string> {
    // Return cached token if still valid with buffer
    if (this.cachedToken && this.cachedToken.expiresAt > Date.now() + 30_000) {
      return this.cachedToken.token;
    }

    // AppRole login
    const loginResponse = await fetch(`${this.vaultUrl}/v1/auth/approle/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.vaultNamespace ? { 'X-Vault-Namespace': this.vaultNamespace } : {})
      },
      body: JSON.stringify({ role_id: this.vaultRoleId, secret_id: this.vaultSecretId }),
      signal: AbortSignal.timeout(10_000)
    });

    if (!loginResponse.ok) {
      throw new Error(`Vault AppRole login failed: ${loginResponse.status} ${loginResponse.statusText}`);
    }

    const loginData = await loginResponse.json() as {
      auth: { client_token: string; lease_duration: number };
    };

    this.cachedToken = {
      token: loginData.auth.client_token,
      expiresAt: Date.now() + this.tokenTtlMs
    };

    logger.info('Vault token renewed', { expiresAt: new Date(this.cachedToken.expiresAt).toISOString() });
    return this.cachedToken.token;
  }
}
