import assert from 'node:assert/strict';
import test from 'node:test';

import {
  loadApiConfig,
  loadWebConfig,
  loadWorkerConfig,
  type ApiAppConfig,
  type WebAppConfig,
  type WorkerAppConfig
} from './index.js';

function createMockEnv(overrides: Record<string, string | undefined> = {}): NodeJS.ProcessEnv {
  return {
    ...process.env,
    ...overrides
  } as NodeJS.ProcessEnv;
}

test('loadApiConfig loads with defaults in development', () => {
  const env = createMockEnv({
    NODE_ENV: undefined,
    AUTH_SECRET: undefined,
    APP_NAME: undefined,
    PORT: undefined,
    HOST: undefined
  });

  const config = loadApiConfig(env);

  assert.equal(config.appName, 'cvg-his-v2-api');
  assert.equal(config.environment, 'development');
  assert.equal(config.port, 3001);
  assert.equal(config.host, '127.0.0.1');
  assert.ok(config.authSecret.startsWith('cvg-his-v2-phase-3-dev-secret'));
  assert.equal(config.accessTokenTtlSeconds, 900);
  assert.equal(config.refreshTokenTtlSeconds, 604800);
});

test('loadApiConfig loads with custom values', () => {
  const env = createMockEnv({
    NODE_ENV: 'production',
    AUTH_SECRET: 'a-very-long-and-secure-custom-production-key-32chars',
    APP_NAME: 'my-custom-api',
    PORT: '4000',
    HOST: '0.0.0.0',
    AUTH_ACCESS_TOKEN_TTL_SECONDS: '1800',
    AUTH_REFRESH_TOKEN_TTL_SECONDS: '1209600'
  });

  const config = loadApiConfig(env);

  assert.equal(config.appName, 'my-custom-api');
  assert.equal(config.environment, 'production');
  assert.equal(config.port, 4000);
  assert.equal(config.host, '0.0.0.0');
  assert.equal(config.authSecret, 'a-very-long-and-secure-custom-production-key-32chars');
  assert.equal(config.accessTokenTtlSeconds, 1800);
  assert.equal(config.refreshTokenTtlSeconds, 1209600);
});

test('loadApiConfig rejects insecure secrets in production', () => {
  const env = createMockEnv({
    NODE_ENV: 'production',
    AUTH_SECRET: 'short'
  });

  assert.throws(
    () => loadApiConfig(env),
    /AUTH_SECRET must be at least 32 characters/
  );
});

test('loadApiConfig rejects known insecure default secrets in production', () => {
  const insecureSecrets = [
    'dev-secret',
    'test-secret',
    'changeme',
    'password',
    'secret',
    '123456'
  ];

  for (const secret of insecureSecrets) {
    const env = createMockEnv({
      NODE_ENV: 'production',
      AUTH_SECRET: secret + '-extra-characters-to-make-it-long-enough'
    });

    assert.throws(
      () => loadApiConfig(env),
      /AUTH_SECRET contains an insecure default value/,
      `Should reject secret: ${secret}`
    );
  }
});

test('loadApiConfig accepts valid staging secret', () => {
  const env = createMockEnv({
    NODE_ENV: 'staging',
    AUTH_SECRET: 'a-very-long-and-secure-staging-passphrase-32chars'
  });

  const config = loadApiConfig(env);
  assert.equal(config.environment, 'staging');
});

test('loadApiConfig accepts valid prod secret', () => {
  const env = createMockEnv({
    NODE_ENV: 'prod',
    AUTH_SECRET: 'a-very-long-and-secure-production-passphrase-32chars'
  });

  const config = loadApiConfig(env);
  assert.equal(config.environment, 'prod');
});

test('loadWebConfig loads with defaults', () => {
  const env = createMockEnv({
    NODE_ENV: undefined,
    APP_NAME: undefined,
    PORT: undefined,
    HOST: undefined,
    API_BASE_URL: undefined
  });

  const config = loadWebConfig(env);

  assert.equal(config.appName, 'cvg-his-v2-web');
  assert.equal(config.environment, 'development');
  assert.equal(config.port, 3000);
  assert.equal(config.host, '127.0.0.1');
  assert.equal(config.apiBaseUrl, 'http://localhost:3001');
});

test('loadWebConfig loads with custom values', () => {
  const env = createMockEnv({
    NODE_ENV: 'production',
    APP_NAME: 'my-web-app',
    PORT: '8080',
    HOST: '0.0.0.0',
    API_BASE_URL: 'https://api.example.com'
  });

  const config = loadWebConfig(env);

  assert.equal(config.appName, 'my-web-app');
  assert.equal(config.environment, 'production');
  assert.equal(config.port, 8080);
  assert.equal(config.host, '0.0.0.0');
  assert.equal(config.apiBaseUrl, 'https://api.example.com');
});

test('loadWorkerConfig loads with defaults', () => {
  const env = createMockEnv({
    NODE_ENV: undefined,
    APP_NAME: undefined,
    WORKER_INTERVAL_MS: undefined
  });

  const config = loadWorkerConfig(env);

  assert.equal(config.appName, 'cvg-his-v2-worker');
  assert.equal(config.environment, 'development');
  assert.equal(config.intervalMs, 5000);
});

test('loadWorkerConfig loads with custom values', () => {
  const env = createMockEnv({
    NODE_ENV: 'production',
    APP_NAME: 'my-worker',
    WORKER_INTERVAL_MS: '10000'
  });

  const config = loadWorkerConfig(env);

  assert.equal(config.appName, 'my-worker');
  assert.equal(config.environment, 'production');
  assert.equal(config.intervalMs, 10000);
});

test('loadWorkerConfig parses numeric interval correctly', () => {
  const env = createMockEnv({
    WORKER_INTERVAL_MS: '30000'
  });

  const config = loadWorkerConfig(env);
  assert.equal(config.intervalMs, 30000);
});

test('ApiAppConfig interface structure', () => {
  const config: ApiAppConfig = {
    appName: 'test-api',
    environment: 'test',
    port: 3001,
    host: 'localhost',
    authSecret: 'test-passphrase-that-is-long-enough-32chars',
    accessTokenTtlSeconds: 900,
    refreshTokenTtlSeconds: 604800
  };

  assert.equal(config.appName, 'test-api');
  assert.equal(config.port, 3001);
});

test('WebAppConfig interface structure', () => {
  const config: WebAppConfig = {
    appName: 'test-web',
    environment: 'test',
    port: 3000,
    host: 'localhost',
    apiBaseUrl: 'http://localhost:3001'
  };

  assert.equal(config.appName, 'test-web');
  assert.equal(config.port, 3000);
});

test('WorkerAppConfig interface structure', () => {
  const config: WorkerAppConfig = {
    appName: 'test-worker',
    environment: 'test',
    intervalMs: 5000
  };

  assert.equal(config.appName, 'test-worker');
  assert.equal(config.intervalMs, 5000);
});

test('loadApiConfig allows stage environment with valid long secret', () => {
  const env = createMockEnv({
    NODE_ENV: 'stage',
    AUTH_SECRET: 'a-valid-and-long-enough-passphrase-for-stage-env'
  });

  const config = loadApiConfig(env);
  assert.equal(config.environment, 'stage');
});

test('loadApiConfig allows prod environment with valid long secret', () => {
  const env = createMockEnv({
    NODE_ENV: 'prod',
    AUTH_SECRET: 'a-valid-and-long-enough-passphrase-for-prod-env'
  });

  const config = loadApiConfig(env);
  assert.equal(config.environment, 'prod');
});
