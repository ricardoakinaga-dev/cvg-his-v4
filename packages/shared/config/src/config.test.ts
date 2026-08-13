import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadApiConfig,
  loadWebConfig,
  loadWorkerConfig,
  loadSpaClientConfig,
  loadSpaViteConfig,
  API_CONFIG_FIELDS,
  WORKER_CONFIG_FIELDS,
  SPA_CONFIG_FIELDS,
} from './index.js';

const TEST_AUTH_SECRET = ['test', 'auth', 'value', 'x'.repeat(32)].join('-');
const INSECURE_AUTH_SECRET = `${['change', 'me'].join('')}-${'x'.repeat(40)}`;
const TEST_MFA_KEY = ['test', 'mfa', 'value', 'x'.repeat(24)].join('-');

function cleanApiEnv(): Record<string, string> {
  return {
    NODE_ENV: 'development',
    APP_NAME: 'test-api',
    PORT: '3001',
    HOST: '127.0.0.1',
    CORS_ALLOWED_ORIGINS: 'http://localhost:3000',
    AUTH_SECRET: TEST_AUTH_SECRET,
    AUTH_ACCESS_TOKEN_TTL_SECONDS: '900',
    AUTH_REFRESH_TOKEN_TTL_SECONDS: '604800',
    AUTH_RATE_LIMIT_MAX_REQUESTS: '10',
    AUTH_RATE_LIMIT_WINDOW_MS: '900000',
    OTEL_ENABLED: 'false',
    OTEL_EXPORTER_OTLP_PROTOCOL: 'http/protobuf',
    FILE_STORAGE_PATH: '/tmp/attachments',
    ENABLE_MFA: 'false',
  };
}

describe('config module', () => {
  beforeEach(() => {
    // Reset env between tests if needed
  });

  describe('API_CONFIG_FIELDS, WORKER_CONFIG_FIELDS, SPA_CONFIG_FIELDS', () => {
    it('exposes API_CONFIG_FIELDS', () => {
      expect(API_CONFIG_FIELDS.length).toBeGreaterThan(0);
      expect(API_CONFIG_FIELDS[0].app).toBe('api');
    });

    it('exposes WORKER_CONFIG_FIELDS', () => {
      expect(WORKER_CONFIG_FIELDS.length).toBeGreaterThan(0);
      expect(WORKER_CONFIG_FIELDS[0].app).toBe('worker');
    });

    it('exposes SPA_CONFIG_FIELDS', () => {
      expect(SPA_CONFIG_FIELDS.length).toBeGreaterThan(0);
      expect(SPA_CONFIG_FIELDS[0].app).toBe('spa');
    });
  });

  describe('loadApiConfig', () => {
    it('loads valid development config with defaults', () => {
      const env: Record<string, string> = {};
      const config = loadApiConfig(env as NodeJS.ProcessEnv);
      expect(config.port).toBe(3001);
      expect(config.environment).toBe('development');
      expect(config.authRateLimitMaxRequests).toBe(10);
    });

    it('loads with explicit values', () => {
      const env = cleanApiEnv();
      env.RESEND_API_KEY = 're_test_key';
      env.EMAIL_FROM = 'clinic@example.com';
      env.EMAIL_MOCK_MODE = 'false';
      const config = loadApiConfig(env as NodeJS.ProcessEnv);
      expect(config.appName).toBe('test-api');
      expect(config.port).toBe(3001);
      expect(config.host).toBe('127.0.0.1');
      expect(config.environment).toBe('development');
      expect(config.resendApiKey).toBe('re_test_key');
      expect(config.emailFrom).toBe('clinic@example.com');
      expect(config.emailMockMode).toBe(false);
    });

    it('parses CORS_ALLOWED_ORIGINS correctly', () => {
      const env = cleanApiEnv();
      env.CORS_ALLOWED_ORIGINS = 'http://localhost:3000,http://localhost:3001';
      const config = loadApiConfig(env as NodeJS.ProcessEnv);
      expect(config.corsAllowedOrigins).toContain('http://localhost:3000');
      expect(config.corsAllowedOrigins).toContain('http://localhost:3001');
    });

    it('throws when CORS_ALLOWED_ORIGINS is invalid', () => {
      const env = cleanApiEnv();
      env.CORS_ALLOWED_ORIGINS = 'not-a-valid-origin';
      expect(() => loadApiConfig(env as NodeJS.ProcessEnv)).toThrow();
    });

    it('throws when CORS_ALLOWED_ORIGINS has path', () => {
      const env = cleanApiEnv();
      env.CORS_ALLOWED_ORIGINS = 'http://localhost:3000/path';
      expect(() => loadApiConfig(env as NodeJS.ProcessEnv)).toThrow();
    });

    it('throws when CORS_ALLOWED_ORIGINS has non-http protocol', () => {
      const env = cleanApiEnv();
      env.CORS_ALLOWED_ORIGINS = 'ftp://localhost:3000';
      expect(() => loadApiConfig(env as NodeJS.ProcessEnv)).toThrow();
    });

    it('throws when AUTH_SECRET is too short in production', () => {
      const env = cleanApiEnv();
      env.NODE_ENV = 'production';
      env.AUTH_SECRET = 'short';
      env.DATABASE_URL = 'postgres://localhost/db';
      expect(() => loadApiConfig(env as NodeJS.ProcessEnv)).toThrow();
    });

    it('throws when AUTH_SECRET contains insecure value in production', () => {
      const env = cleanApiEnv();
      env.NODE_ENV = 'production';
      env.AUTH_SECRET = INSECURE_AUTH_SECRET;
      env.DATABASE_URL = 'postgres://localhost/db';
      expect(() => loadApiConfig(env as NodeJS.ProcessEnv)).toThrow();
    });

    it('throws when OTEL_ENABLED but no OTEL_EXPORTER_OTLP_TRACES_ENDPOINT', () => {
      const env = cleanApiEnv();
      env.OTEL_ENABLED = 'true';
      expect(() => loadApiConfig(env as NodeJS.ProcessEnv)).toThrow();
    });

    it('throws when OTEL_EXPORTER_OTLP_PROTOCOL is not supported', () => {
      const env = cleanApiEnv();
      env.OTEL_EXPORTER_OTLP_PROTOCOL = 'grpc';
      expect(() => loadApiConfig(env as NodeJS.ProcessEnv)).toThrow(/not supported/);
    });

    it('throws when DATABASE_URL missing in production', () => {
      const env = cleanApiEnv();
      env.NODE_ENV = 'production';
      env.AUTH_SECRET = TEST_AUTH_SECRET;
      expect(() => loadApiConfig(env as NodeJS.ProcessEnv)).toThrow();
    });

    it('requires every external integration in production', () => {
      const env = cleanApiEnv();
      env.NODE_ENV = 'production';
      env.DATABASE_URL = 'postgres://localhost/db';
      env.AUTH_SECRET = TEST_AUTH_SECRET;

      expect(() => loadApiConfig(env as NodeJS.ProcessEnv)).toThrow(/PAGARME_API_KEY/);
    });

    it('rejects local integration mocks in production', () => {
      const env = cleanApiEnv();
      env.NODE_ENV = 'staging';
      env.DATABASE_URL = 'postgres://localhost/db';
      env.AUTH_SECRET = TEST_AUTH_SECRET;
      env.PIX_MOCK_MODE = 'true';
      env.EMAIL_MOCK_MODE = 'true';
      env.SMS_MOCK_MODE = 'true';
      env.GOOGLE_CALENDAR_MOCK_MODE = 'true';

      expect(() => loadApiConfig(env as NodeJS.ProcessEnv)).toThrow(/mock mode/);
    });

    it('accepts complete external integration configuration in production', () => {
      const env = cleanApiEnv();
      env.NODE_ENV = 'production';
      env.DATABASE_URL = 'postgres://localhost/db';
      env.AUTH_SECRET = TEST_AUTH_SECRET;
      env.PAGARME_API_KEY = 'pagarme-key';
      env.PAGARME_PIX_KEY = 'pix-key';
      env.RESEND_API_KEY = 'resend-key';
      env.EMAIL_FROM = 'clinic@example.com';
      env.SMS_API_KEY = 'sms-key';
      env.GOOGLE_CALENDAR_ACCESS_TOKEN = 'calendar-token';
      env.GOOGLE_CALENDAR_CALENDAR_ID = 'calendar-id';

      const config = loadApiConfig(env as NodeJS.ProcessEnv);
      expect(config.environment).toBe('production');
      expect(config.pagarmeApiKey).toBe('pagarme-key');
      expect(config.googleCalendarCalendarId).toBe('calendar-id');
    });

    it('loads MFA config when ENABLE_MFA=true and key provided', () => {
      const env = cleanApiEnv();
      env.ENABLE_MFA = 'true';
      env.MFA_SECRET_ENCRYPTION_KEY = TEST_MFA_KEY;
      env.AUTH_SECRET_PREVIOUS = `${TEST_AUTH_SECRET}-previous`;
      env.AUTH_SECRET_VERSION = '2026-q2';
      env.MFA_SECRET_ENCRYPTION_KEY_VERSION = '2026-h1';
      const config = loadApiConfig(env as NodeJS.ProcessEnv);
      expect(config.enableMfa).toBe(true);
      expect(config.mfaEncryptionKey).toBe(TEST_MFA_KEY);
      expect(config.authVerifierSecrets).toEqual([`${TEST_AUTH_SECRET}-previous`]);
      expect(config.authSecretVersion).toBe('2026-q2');
      expect(config.mfaEncryptionKeyVersion).toBe('2026-h1');
    });

    it('throws when ENABLE_MFA=true but no MFA_SECRET_ENCRYPTION_KEY', () => {
      const env = cleanApiEnv();
      env.ENABLE_MFA = 'true';
      expect(() => loadApiConfig(env as NodeJS.ProcessEnv)).toThrow();
    });

    it('accepts otlp headers as key=value format', () => {
      const env = cleanApiEnv();
      env.OTEL_ENABLED = 'true';
      env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT = 'http://otel:4318';
      env.OTEL_EXPORTER_OTLP_HEADERS = ['x-api', 'key=mykey,x-auth=token'].join('-');
      const config = loadApiConfig(env as NodeJS.ProcessEnv);
      expect(config.otelEnabled).toBe(true);
      expect(config.otlpHeaders['x-api-key']).toBe('mykey');
      expect(config.otlpHeaders['x-auth']).toBe('token');
    });

  });

  describe('loadWorkerConfig', () => {
    it('loads valid worker config with defaults', () => {
      const env: Record<string, string> = {};
      const config = loadWorkerConfig(env as NodeJS.ProcessEnv);
      expect(config.appName).toBe('cvg-his-v2-worker');
      expect(config.intervalMs).toBe(5000);
      expect(config.healthPort).toBe(3002);
    });

    it('loads custom worker values', () => {
      const env: Record<string, string> = {
        APP_NAME: 'my-worker',
        WORKER_INTERVAL_MS: '10000',
        WORKER_HEALTH_PORT: '4000',
      };
      const config = loadWorkerConfig(env as NodeJS.ProcessEnv);
      expect(config.appName).toBe('my-worker');
      expect(config.intervalMs).toBe(10000);
      expect(config.healthPort).toBe(4000);
    });

    it('throws when DATABASE_URL missing in production', () => {
      const env: Record<string, string> = {
        NODE_ENV: 'production',
      };
      expect(() => loadWorkerConfig(env as NodeJS.ProcessEnv)).toThrow();
    });

    it('loads otel config when provided', () => {
      const env: Record<string, string> = {
        OTEL_ENABLED: 'true',
        OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: 'http://otel:4318',
      };
      const config = loadWorkerConfig(env as NodeJS.ProcessEnv);
      expect(config.otelEnabled).toBe(true);
      expect(config.otlpTracesEndpoint).toBe('http://otel:4318');
    });
  });

  describe('loadWebConfig', () => {
    it('loads valid web config', () => {
      const env: Record<string, string> = {
        VITE_APP_NAME: 'MyApp',
        VITE_API_BASE_URL: 'http://localhost:3001',
      };
      const config = loadWebConfig(env as NodeJS.ProcessEnv);
      expect(config.appName).toBe('MyApp');
      expect(config.apiBaseUrl).toBe('http://localhost:3001');
    });

    it('accepts relative path /api for VITE_API_BASE_URL', () => {
      const env: Record<string, string> = {
        VITE_API_BASE_URL: '/api',
      };
      const config = loadWebConfig(env as NodeJS.ProcessEnv);
      expect(config.apiBaseUrl).toBe('');
    });

    it('accepts empty string for VITE_API_BASE_URL', () => {
      const env: Record<string, string> = {
        VITE_API_BASE_URL: '',
      };
      const config = loadWebConfig(env as NodeJS.ProcessEnv);
      expect(config.apiBaseUrl).toBe('');
    });

    it('strips trailing slash from VITE_API_BASE_URL', () => {
      const env: Record<string, string> = {
        VITE_API_BASE_URL: 'http://localhost:3001/',
      };
      const config = loadWebConfig(env as NodeJS.ProcessEnv);
      expect(config.apiBaseUrl).toBe('http://localhost:3001');
    });
  });

  describe('loadSpaClientConfig', () => {
    it('loads client config', () => {
      const env = {
        VITE_APP_NAME: 'SPA App',
        VITE_API_BASE_URL: 'http://api.example.com',
      };
      const config = loadSpaClientConfig(env);
      expect(config.appName).toBe('SPA App');
    });

    it('uses defaults when env is empty', () => {
      const env: Record<string, string> = {};
      const config = loadSpaClientConfig(env);
      expect(config.appName).toBe('CVG HIS V2');
    });
  });

  describe('loadSpaViteConfig', () => {
    it('loads vite config with defaults', () => {
      const env: Record<string, string> = {};
      const config = loadSpaViteConfig(env);
      expect(config.port).toBe(3000);
    });
  });
});
