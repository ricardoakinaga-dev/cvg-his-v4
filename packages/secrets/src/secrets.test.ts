/**
 * @cvg-his-v2/secrets package tests
 */

import { createServer } from 'node:http';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSecretsManager } from './index.js';
import { EnvSecretsProvider } from './providers/env-secrets.provider.js';
import type { SecretDescriptor } from './types.js';

describe('EnvSecretsProvider', () => {
  let provider: EnvSecretsProvider;

  beforeEach(() => {
    provider = new EnvSecretsProvider();
    // Clear env between tests
    delete process.env['AUTH_SECRET'];
    delete process.env['PAGARME_API_KEY'];
  });

  it('returns value from process.env', async () => {
    process.env['AUTH_SECRET'] = 'test-secret-32-chars-long!!';
    const secret: SecretDescriptor = { key: 'AUTH_SECRET', path: 'test/path' };
    const value = await provider.get(secret);
    expect(value).toBe('test-secret-32-chars-long!!');
  });

  it('returns empty string for missing non-required secret', async () => {
    const secret: SecretDescriptor = { key: 'MISSING_SECRET', path: 'test/path' };
    const value = await provider.get(secret);
    expect(value).toBe('');
  });

  it('throws for missing required secret', async () => {
    const secret: SecretDescriptor = { key: 'MISSING_SECRET', path: 'test/path', required: true };
    await expect(provider.get(secret)).rejects.toThrow(`Required secret MISSING_SECRET is not set`);
  });

  it('getMany returns all secrets', async () => {
    process.env['AUTH_SECRET'] = 'auth-val';
    process.env['PAGARME_API_KEY'] = 'pagarme-val';
    const secrets: SecretDescriptor[] = [
      { key: 'AUTH_SECRET', path: 'test/auth' },
      { key: 'PAGARME_API_KEY', path: 'test/pix' }
    ];
    const result = await provider.getMany(secrets);
    expect(result).toEqual({
      AUTH_SECRET: 'auth-val',
      PAGARME_API_KEY: 'pagarme-val'
    });
  });

  it('health always returns true', async () => {
    await expect(provider.health()).resolves.toBe(true);
  });
});

describe('VaultSecretsProvider', () => {
  it('authenticates with AppRole and reads KV-v2 secrets using the configured prefix', async () => {
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

      if (request.method === 'GET' && request.url === '/v1/secret/data/cvg-his-v2/production/api') {
        response.writeHead(200, { 'content-type': 'application/json' });
        response.end(JSON.stringify({
          data: {
            data: {
              AUTH_SECRET: 'vault-auth-secret-strong-enough-for-production'
            },
            metadata: {
              version: 3
            }
          }
        }));
        return;
      }

      if (request.method === 'GET' && request.url === '/v1/sys/health') {
        response.writeHead(200, { 'content-type': 'application/json' });
        response.end(JSON.stringify({ initialized: true, sealed: false, standby: false }));
        return;
      }

      response.writeHead(404, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ error: 'not found' }));
    });

    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', () => resolve()));
    const address = server.address();
    if (!address || typeof address === 'string') {
      throw new Error('failed to bind test Vault server');
    }

    try {
      const manager = await createSecretsManager({
        vaultEnabled: true,
        vaultUrl: `http://127.0.0.1:${address.port}`,
        vaultRoleId: 'role-id',
        vaultSecretId: 'secret-id',
        vaultSecretPathPrefix: 'secret/data/cvg-his-v2'
      });

      const value = await manager.get({ key: 'AUTH_SECRET', path: 'production/api', required: true });
      expect(value).toBe('vault-auth-secret-strong-enough-for-production');
      await expect(manager.health()).resolves.toBe(true);
      expect(requests).toContain('POST /v1/auth/approle/login');
      expect(requests).toContain('GET /v1/secret/data/cvg-his-v2/production/api');
      expect(requests).toContain('GET /v1/sys/health');
    } finally {
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  });
});
