import assert from 'node:assert/strict';
import test from 'node:test';

import {
  API_CONFIG_FIELDS,
  SPA_CONFIG_FIELDS,
  WORKER_CONFIG_FIELDS,
  loadApiConfig,
  loadSpaClientConfig,
  loadSpaViteConfig,
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

test('config inventories expose the sprint 3 app coverage', () => {
  assert.ok(API_CONFIG_FIELDS.some((field) => field.key === 'AUTH_SECRET'));
  assert.ok(API_CONFIG_FIELDS.some((field) => field.key === 'CORS_ALLOWED_ORIGINS'));
  assert.ok(API_CONFIG_FIELDS.some((field) => field.key === 'OTEL_EXPORTER_OTLP_TRACES_ENDPOINT'));
  assert.ok(WORKER_CONFIG_FIELDS.some((field) => field.key === 'WORKER_HEALTH_PORT'));
  assert.ok(WORKER_CONFIG_FIELDS.some((field) => field.key === 'OTEL_EXPORTER_OTLP_TRACES_ENDPOINT'));
  assert.ok(SPA_CONFIG_FIELDS.some((field) => field.key === 'VITE_API_BASE_URL'));
});

test('loadApiConfig loads with defaults in development', () => {
  const env = createMockEnv({
    NODE_ENV: undefined,
    AUTH_SECRET: undefined,
    APP_NAME: undefined,
    PORT: undefined,
    HOST: undefined,
    CORS_ALLOWED_ORIGINS: undefined,
    OTEL_ENABLED: undefined,
    OTEL_SERVICE_NAME: undefined,
    OTEL_EXPORTER_OTLP_PROTOCOL: undefined,
    OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: undefined,
    OTEL_EXPORTER_OTLP_HEADERS: undefined,
    DATABASE_URL: undefined,
    FILE_STORAGE_PATH: undefined,
    ENABLE_MFA: undefined,
    MFA_SECRET_ENCRYPTION_KEY: undefined
  });

  const config = loadApiConfig(env);

  assert.equal(config.appName, 'cvg-his-v2-api');
  assert.equal(config.environment, 'development');
  assert.equal(config.port, 3001);
  assert.equal(config.host, '127.0.0.1');
  assert.deepEqual(config.corsAllowedOrigins, [
    'http://127.0.0.1:3000',
    'http://localhost:3000',
    'http://127.0.0.1:3002',
    'http://localhost:3002',
    'http://127.0.0.1:3102',
    'http://localhost:3102',
    'http://127.0.0.1:3112',
    'http://localhost:3112',
    'http://127.0.0.1:4173',
    'http://localhost:4173',
    'http://127.0.0.1:5173',
    'http://localhost:5173'
  ]);
  assert.equal(config.otelEnabled, false);
  assert.equal(config.otelServiceName, 'cvg-his-v2-api');
  assert.equal(config.otlpProtocol, 'http/protobuf');
  assert.equal(config.otlpTracesEndpoint, undefined);
  assert.deepEqual(config.otlpHeaders, {});
  assert.equal(config.authRateLimitMaxRequests, 10);
  assert.equal(config.authRateLimitWindowMs, 15 * 60 * 1000);
  assert.equal(config.fileStoragePath, '/tmp/cvg-his-v2-attachments');
  assert.equal(config.enableMfa, false);
  assert.ok(config.authSecret.startsWith('cvg-his-v2-phase-3-dev-secret'));
});

test('loadApiConfig loads with custom values', () => {
  const env = createMockEnv({
    NODE_ENV: 'production',
    APP_NAME: 'my-custom-api',
    PORT: '4000',
    HOST: '0.0.0.0',
    CORS_ALLOWED_ORIGINS: 'https://app.example.com, https://admin.example.com/',
    OTEL_ENABLED: 'true',
    OTEL_SERVICE_NAME: 'cvg-premium-api',
    OTEL_EXPORTER_OTLP_PROTOCOL: 'http/protobuf',
    OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: 'https://otel.example.com/v1/traces',
    OTEL_EXPORTER_OTLP_HEADERS: 'authorization=Bearer token,x-tenant-id=cvg',
    DATABASE_URL: 'postgres://postgres:postgres@localhost:5432/cvg_his_v2',
    FILE_STORAGE_PATH: '/srv/storage',
    AUTH_SECRET: 'a-very-long-and-secure-custom-production-key-32chars',
    AUTH_ACCESS_TOKEN_TTL_SECONDS: '1800',
    AUTH_REFRESH_TOKEN_TTL_SECONDS: '1209600',
    AUTH_RATE_LIMIT_MAX_REQUESTS: '25',
    AUTH_RATE_LIMIT_WINDOW_MS: '300000',
    ENABLE_MFA: 'true',
    MFA_SECRET_ENCRYPTION_KEY: '12345678901234567890123456789012'
  });

  const config = loadApiConfig(env);

  assert.equal(config.appName, 'my-custom-api');
  assert.equal(config.environment, 'production');
  assert.equal(config.port, 4000);
  assert.equal(config.host, '0.0.0.0');
  assert.deepEqual(config.corsAllowedOrigins, [
    'https://app.example.com',
    'https://admin.example.com'
  ]);
  assert.equal(config.otelEnabled, true);
  assert.equal(config.otelServiceName, 'cvg-premium-api');
  assert.equal(config.otlpProtocol, 'http/protobuf');
  assert.equal(config.otlpTracesEndpoint, 'https://otel.example.com/v1/traces');
  assert.deepEqual(config.otlpHeaders, {
    authorization: 'Bearer token',
    'x-tenant-id': 'cvg'
  });
  assert.equal(config.authRateLimitMaxRequests, 25);
  assert.equal(config.authRateLimitWindowMs, 300000);
  assert.equal(config.databaseUrl, 'postgres://postgres:postgres@localhost:5432/cvg_his_v2');
  assert.equal(config.fileStoragePath, '/srv/storage');
  assert.equal(config.enableMfa, true);
  assert.equal(config.mfaEncryptionKey, '12345678901234567890123456789012');
});

test('loadApiConfig rejects insecure secrets in production', () => {
  const env = createMockEnv({
    NODE_ENV: 'production',
    CORS_ALLOWED_ORIGINS: 'https://app.example.com',
    DATABASE_URL: 'postgres://postgres:postgres@localhost:5432/cvg_his_v2',
    AUTH_SECRET: 'short'
  });

  assert.throws(() => loadApiConfig(env), /AUTH_SECRET must be at least 32 characters/);
});

test('loadApiConfig rejects insecure default secrets in production', () => {
  const env = createMockEnv({
    NODE_ENV: 'production',
    CORS_ALLOWED_ORIGINS: 'https://app.example.com',
    DATABASE_URL: 'postgres://postgres:postgres@localhost:5432/cvg_his_v2',
    AUTH_SECRET: 'dev-secret-extra-characters-to-make-it-long-enough'
  });

  assert.throws(() => loadApiConfig(env), /AUTH_SECRET contains an insecure default value/);
});

test('loadApiConfig requires MFA key when MFA is enabled', () => {
  const env = createMockEnv({
    ENABLE_MFA: 'true',
    MFA_SECRET_ENCRYPTION_KEY: undefined
  });

  assert.throws(() => loadApiConfig(env), /MFA_SECRET_ENCRYPTION_KEY is required/);
});

test('loadApiConfig requires explicit CORS allowlist in production-like environments', () => {
  const env = createMockEnv({
    NODE_ENV: 'production',
    AUTH_SECRET: 'a-very-long-and-secure-custom-production-key-32chars',
    DATABASE_URL: 'postgres://postgres:postgres@localhost:5432/cvg_his_v2',
    CORS_ALLOWED_ORIGINS: undefined
  });

  assert.throws(() => loadApiConfig(env), /CORS_ALLOWED_ORIGINS is required/);
});

test('loadApiConfig requires DATABASE_URL in production-like environments', () => {
  const env = createMockEnv({
    NODE_ENV: 'production',
    AUTH_SECRET: 'a-very-long-and-secure-custom-production-key-32chars',
    CORS_ALLOWED_ORIGINS: 'https://app.example.com',
    DATABASE_URL: undefined
  });

  assert.throws(() => loadApiConfig(env), /DATABASE_URL is required/);
});

test('loadApiConfig rejects invalid CORS allowlist entries', () => {
  const env = createMockEnv({
    CORS_ALLOWED_ORIGINS: 'https://app.example.com/app'
  });

  assert.throws(() => loadApiConfig(env), /CORS_ALLOWED_ORIGINS entries must be origins/);
});

test('loadApiConfig rejects invalid DATABASE_URL', () => {
  const env = createMockEnv({
    DATABASE_URL: 'not-a-url'
  });

  assert.throws(() => loadApiConfig(env), /DATABASE_URL/);
});

test('loadApiConfig requires OTLP endpoint when OpenTelemetry is enabled', () => {
  const env = createMockEnv({
    OTEL_ENABLED: 'true',
    OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: undefined
  });

  assert.throws(() => loadApiConfig(env), /OTEL_EXPORTER_OTLP_TRACES_ENDPOINT is required/);
});

test('loadApiConfig rejects unsupported OTLP protocol', () => {
  const env = createMockEnv({
    OTEL_EXPORTER_OTLP_PROTOCOL: 'grpc'
  });

  assert.throws(() => loadApiConfig(env), /OTEL_EXPORTER_OTLP_PROTOCOL=grpc is not supported/);
});

test('loadApiConfig rejects malformed OTLP headers', () => {
  const env = createMockEnv({
    OTEL_EXPORTER_OTLP_HEADERS: 'authorization'
  });

  assert.throws(() => loadApiConfig(env), /OTEL_EXPORTER_OTLP_HEADERS must use/);
});

test('loadWebConfig keeps compatibility with server-side web app envs', () => {
  const env = createMockEnv({
    APP_NAME: 'legacy-web',
    API_BASE_URL: 'https://api.example.com/api',
    PORT: '8080',
    HOST: '0.0.0.0',
    VITE_DISABLE_PWA: '1'
  });

  const config = loadWebConfig(env);

  assert.equal(config.appName, 'legacy-web');
  assert.equal(config.apiBaseUrl, 'https://api.example.com');
  assert.equal(config.port, 8080);
  assert.equal(config.host, '0.0.0.0');
  assert.equal(config.disablePwa, true);
});

test('loadWorkerConfig loads with defaults', () => {
  const env = createMockEnv({
    NODE_ENV: undefined,
    APP_NAME: undefined,
    WORKER_INTERVAL_MS: undefined,
    WORKER_HEALTH_PORT: undefined,
    OTEL_ENABLED: undefined,
    OTEL_SERVICE_NAME: undefined,
    OTEL_EXPORTER_OTLP_PROTOCOL: undefined,
    OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: undefined,
    OTEL_EXPORTER_OTLP_HEADERS: undefined,
    DATABASE_URL: undefined
  });

  const config = loadWorkerConfig(env);

  assert.equal(config.appName, 'cvg-his-v2-worker');
  assert.equal(config.environment, 'development');
  assert.equal(config.intervalMs, 5000);
  assert.equal(config.healthPort, 3002);
  assert.equal(config.otelEnabled, false);
  assert.equal(config.otelServiceName, 'cvg-his-v2-worker');
  assert.equal(config.otlpProtocol, 'http/protobuf');
  assert.deepEqual(config.otlpHeaders, {});
  assert.equal(config.databaseUrl, undefined);
});

test('loadWorkerConfig loads with custom values', () => {
  const env = createMockEnv({
    NODE_ENV: 'production',
    APP_NAME: 'my-worker',
    WORKER_INTERVAL_MS: '10000',
    WORKER_HEALTH_PORT: '3100',
    OTEL_ENABLED: 'true',
    OTEL_SERVICE_NAME: 'cvg-premium-worker',
    OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: 'https://otel.example.com/v1/traces',
    OTEL_EXPORTER_OTLP_HEADERS: 'authorization=Bearer worker',
    DATABASE_URL: 'postgres://postgres:postgres@localhost:5432/cvg_his_v2'
  });

  const config = loadWorkerConfig(env);

  assert.equal(config.appName, 'my-worker');
  assert.equal(config.environment, 'production');
  assert.equal(config.intervalMs, 10000);
  assert.equal(config.healthPort, 3100);
  assert.equal(config.otelEnabled, true);
  assert.equal(config.otelServiceName, 'cvg-premium-worker');
  assert.equal(config.otlpTracesEndpoint, 'https://otel.example.com/v1/traces');
  assert.deepEqual(config.otlpHeaders, { authorization: 'Bearer worker' });
  assert.equal(config.databaseUrl, 'postgres://postgres:postgres@localhost:5432/cvg_his_v2');
});

test('loadWorkerConfig requires OTLP endpoint when OpenTelemetry is enabled', () => {
  const env = createMockEnv({
    OTEL_ENABLED: 'true',
    OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: undefined
  });

  assert.throws(() => loadWorkerConfig(env), /OTEL_EXPORTER_OTLP_TRACES_ENDPOINT is required/);
});

test('loadWorkerConfig requires DATABASE_URL in production-like environments', () => {
  const env = createMockEnv({
    NODE_ENV: 'production',
    DATABASE_URL: undefined
  });

  assert.throws(() => loadWorkerConfig(env), /DATABASE_URL is required/);
});

test('loadSpaClientConfig loads defaults', () => {
  const config = loadSpaClientConfig({});

  assert.equal(config.appName, 'CVG HIS V2');
  assert.equal(config.environment, 'development');
  assert.equal(config.apiBaseUrl, '');
  assert.equal(config.disablePwa, false);
});

test('loadSpaClientConfig normalizes API origin with /api suffix', () => {
  const config = loadSpaClientConfig({
    NODE_ENV: 'production',
    VITE_APP_NAME: 'My SPA',
    VITE_API_BASE_URL: 'https://api.example.com/api/',
    VITE_DISABLE_PWA: 'true'
  });

  assert.equal(config.environment, 'production');
  assert.equal(config.appName, 'My SPA');
  assert.equal(config.apiBaseUrl, 'https://api.example.com');
  assert.equal(config.disablePwa, true);
});

test('loadSpaClientConfig accepts relative /api prefix and normalizes to same-origin empty string', () => {
  const config = loadSpaClientConfig({
    VITE_API_BASE_URL: '/api'
  });

  assert.equal(config.apiBaseUrl, '');
});

test('loadSpaClientConfig rejects invalid API base', () => {
  assert.throws(
    () => loadSpaClientConfig({ VITE_API_BASE_URL: 'ftp://api.example.com' }),
    /VITE_API_BASE_URL/
  );
});

test('loadSpaViteConfig loads defaults', () => {
  const config = loadSpaViteConfig({});

  assert.equal(config.port, 3000);
  assert.equal(config.host, '127.0.0.1');
  assert.equal(config.proxyApiTarget, 'http://localhost:3001');
});

test('loadSpaViteConfig loads custom values', () => {
  const config = loadSpaViteConfig({
    NODE_ENV: 'production',
    PORT: '3002',
    HOST: '0.0.0.0',
    VITE_APP_NAME: 'CVG Premium',
    VITE_API_BASE_URL: 'https://spa.example.com/api',
    VITE_PROXY_API_TARGET: 'http://localhost:3101',
    VITE_DISABLE_PWA: '1'
  });

  assert.equal(config.environment, 'production');
  assert.equal(config.port, 3002);
  assert.equal(config.host, '0.0.0.0');
  assert.equal(config.appName, 'CVG Premium');
  assert.equal(config.apiBaseUrl, 'https://spa.example.com');
  assert.equal(config.proxyApiTarget, 'http://localhost:3101');
  assert.equal(config.disablePwa, true);
});

test('ApiAppConfig interface structure', () => {
  const config: ApiAppConfig = {
    appName: 'test-api',
    environment: 'test',
    port: 3001,
    host: 'localhost',
    corsAllowedOrigins: ['http://localhost:3000'],
    authSecret: 'test-passphrase-that-is-long-enough-32chars',
    accessTokenTtlSeconds: 900,
    refreshTokenTtlSeconds: 604800,
    authRateLimitMaxRequests: 10,
    authRateLimitWindowMs: 15 * 60 * 1000,
    otelEnabled: false,
    otelServiceName: 'test-api',
    otlpProtocol: 'http/protobuf',
    otlpTracesEndpoint: undefined,
    otlpHeaders: {},
    databaseUrl: undefined,
    fileStoragePath: '/tmp/attachments',
    enableMfa: false,
    mfaEncryptionKey: undefined
  };

  assert.equal(config.appName, 'test-api');
  assert.equal(config.port, 3001);
  assert.deepEqual(config.corsAllowedOrigins, ['http://localhost:3000']);
});

test('WebAppConfig interface structure', () => {
  const config: WebAppConfig = {
    appName: 'test-web',
    environment: 'test',
    port: 3000,
    host: 'localhost',
    apiBaseUrl: 'http://localhost:3001',
    proxyApiTarget: 'http://localhost:3001',
    disablePwa: false
  };

  assert.equal(config.appName, 'test-web');
  assert.equal(config.port, 3000);
});

test('WorkerAppConfig interface structure', () => {
  const config: WorkerAppConfig = {
    appName: 'test-worker',
    environment: 'test',
    intervalMs: 5000,
    healthPort: 3002,
    otelEnabled: false,
    otelServiceName: 'test-worker',
    otlpProtocol: 'http/protobuf',
    otlpTracesEndpoint: undefined,
    otlpHeaders: {},
    databaseUrl: undefined
  };

  assert.equal(config.appName, 'test-worker');
  assert.equal(config.intervalMs, 5000);
});
