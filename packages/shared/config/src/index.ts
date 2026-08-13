import { z } from 'zod';

const INSECURE_DEFAULT_SECRET = 'cvg-his-v2-phase-3-dev-secret';
const DEFAULT_API_APP_NAME = 'cvg-his-v2-api';
const DEFAULT_WEB_APP_NAME = 'cvg-his-v2-spa';
const DEFAULT_WORKER_APP_NAME = 'cvg-his-v2-worker';
const DEFAULT_API_PORT = 3001;
const DEFAULT_WEB_PORT = 3000;
const DEFAULT_WORKER_INTERVAL_MS = 5000;
const DEFAULT_WORKER_HEALTH_PORT = 3002;
const DEFAULT_HOST = '127.0.0.1';
const DEFAULT_FILE_STORAGE_PATH = '/tmp/cvg-his-v2-attachments';
const DEFAULT_PROXY_API_TARGET = 'http://localhost:3001';
const DEFAULT_ACCESS_TOKEN_TTL_SECONDS = 900;
const DEFAULT_REFRESH_TOKEN_TTL_SECONDS = 604800;
const MIN_SECRET_LENGTH = 32;
const DEFAULT_OTLP_PROTOCOL = 'http/protobuf';
const DEFAULT_LOCAL_CORS_ALLOWED_ORIGINS = [
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
] as const;

const environmentSchema = z.enum([
  'development',
  'test',
  'staging',
  'production',
  'prod',
  'stage'
]);

const portSchema = z.coerce.number().int().min(1).max(65535);
const positiveNumberSchema = z.coerce.number().int().positive();
const nonEmptyStringSchema = z.string().trim().min(1);
const optionalNonEmptyStringSchema = nonEmptyStringSchema.optional();
const optionalUrlSchema = z
  .string()
  .trim()
  .url()
  .optional();
const booleanStringSchema = z
  .union([z.boolean(), z.enum(['1', '0', 'true', 'false'])])
  .transform((value) => value === true || value === '1' || value === 'true');

const INSECURE_SECRETS = [
  'cvg-his-v2-phase-3-dev-secret',
  'dev-secret',
  'test-secret',
  'changeme',
  'password',
  'secret',
  '123456'
];

export interface ConfigFieldDescriptor {
  readonly app: 'api' | 'worker' | 'spa';
  readonly key: string;
  readonly required: boolean;
  readonly defaultValue?: string;
  readonly sensitive?: boolean;
  readonly description: string;
}

export const API_CONFIG_FIELDS: readonly ConfigFieldDescriptor[] = [
  { app: 'api', key: 'NODE_ENV', required: false, defaultValue: 'development', description: 'Runtime environment.' },
  { app: 'api', key: 'APP_NAME', required: false, defaultValue: DEFAULT_API_APP_NAME, description: 'Service name used in logs and health responses.' },
  { app: 'api', key: 'PORT', required: false, defaultValue: String(DEFAULT_API_PORT), description: 'HTTP listen port for the API server.' },
  { app: 'api', key: 'HOST', required: false, defaultValue: DEFAULT_HOST, description: 'HTTP bind host for the API server.' },
  { app: 'api', key: 'CORS_ALLOWED_ORIGINS', required: false, defaultValue: DEFAULT_LOCAL_CORS_ALLOWED_ORIGINS.join(','), description: 'Comma-separated allowlist of allowed browser origins. Required explicitly in production-like environments.' },
  { app: 'api', key: 'AUTH_SECRET', required: false, defaultValue: INSECURE_DEFAULT_SECRET, sensitive: true, description: 'JWT/session secret. Required to be strong in production-like environments.' },
  { app: 'api', key: 'AUTH_ACCESS_TOKEN_TTL_SECONDS', required: false, defaultValue: String(DEFAULT_ACCESS_TOKEN_TTL_SECONDS), description: 'Access token TTL in seconds.' },
  { app: 'api', key: 'AUTH_REFRESH_TOKEN_TTL_SECONDS', required: false, defaultValue: String(DEFAULT_REFRESH_TOKEN_TTL_SECONDS), description: 'Refresh token TTL in seconds.' },
  { app: 'api', key: 'AUTH_RATE_LIMIT_MAX_REQUESTS', required: false, defaultValue: '10', description: 'Maximum auth requests accepted per rate-limit window.' },
  { app: 'api', key: 'AUTH_RATE_LIMIT_WINDOW_MS', required: false, defaultValue: String(15 * 60 * 1000), description: 'Auth rate-limit window in milliseconds.' },
  { app: 'api', key: 'OTEL_ENABLED', required: false, defaultValue: 'false', description: 'Enable OpenTelemetry SDK bootstrap for this service.' },
  { app: 'api', key: 'OTEL_SERVICE_NAME', required: false, defaultValue: DEFAULT_API_APP_NAME, description: 'Service name exported to OpenTelemetry resources.' },
  { app: 'api', key: 'OTEL_EXPORTER_OTLP_PROTOCOL', required: false, defaultValue: DEFAULT_OTLP_PROTOCOL, description: 'OTLP transport protocol. Current foundation supports http/protobuf.' },
  { app: 'api', key: 'OTEL_EXPORTER_OTLP_TRACES_ENDPOINT', required: false, description: 'Trace exporter endpoint for OTLP/HTTP.' },
  { app: 'api', key: 'OTEL_EXPORTER_OTLP_HEADERS', required: false, sensitive: true, description: 'Comma-separated OTLP headers in key=value format.' },
  { app: 'api', key: 'DATABASE_URL', required: false, description: 'Database connection string. Required in production-like environments; optional only for local/test degraded mode.' },
  { app: 'api', key: 'FILE_STORAGE_PATH', required: false, defaultValue: DEFAULT_FILE_STORAGE_PATH, description: 'Base directory for attachment storage.' },
  { app: 'api', key: 'ENABLE_MFA', required: false, defaultValue: 'false', description: 'Enable MFA runtime wiring in the API.' },
  { app: 'api', key: 'MFA_SECRET_ENCRYPTION_KEY', required: false, sensitive: true, description: 'Encryption key used when MFA is enabled.' },
  { app: 'api', key: 'FEATURE_FLAGS_PROVIDER', required: false, defaultValue: 'env', description: 'Feature flag provider type. Currently supports "env" (bootstrap/development mode).' },
  { app: 'api', key: 'API_FEATURE_FLAGS', required: false, description: 'Comma-separated list of explicitly enabled feature flag keys for the API. Example: "auth.oidc.enabled,auth.webauthn.enabled".' },
  { app: 'api', key: 'RUNTIME_DISTRIBUTED_STATE_ENABLED', required: false, defaultValue: 'false', description: 'When true, enables distributed runtime state (Redis-backed session, encounter timeline, etc.).' },
  { app: 'api', key: 'PAGARME_API_KEY', required: false, sensitive: true, description: 'Pagar.me API key for PIX payments. Required in production-like environments unless the API is not started.' },
  { app: 'api', key: 'PAGARME_PIX_KEY', required: false, description: 'Pagar.me PIX key (chave Pix) for QR code generation. Required together with PAGARME_API_KEY in production-like environments.' },
  { app: 'api', key: 'PIX_MOCK_MODE', required: false, defaultValue: 'false', description: 'Explicitly enables LocalPixPaymentGateway for development/test only; local mocks are rejected in production-like environments.' },
  { app: 'api', key: 'RESEND_API_KEY', required: false, sensitive: true, description: 'Resend API key for transactional email provider. Required in production-like environments.' },
  { app: 'api', key: 'EMAIL_FROM', required: false, defaultValue: 'noreply@cvg-his.local', description: 'Default sender used by the transactional email provider.' },
  { app: 'api', key: 'EMAIL_MOCK_MODE', required: false, defaultValue: 'false', description: 'Explicitly enables LocalEmailGateway for development/test only; local mocks are rejected in production-like environments.' },
  { app: 'api', key: 'SMS_API_KEY', required: false, sensitive: true, description: 'Twilio-compatible API key for transactional SMS provider. Required in production-like environments.' },
  { app: 'api', key: 'SMS_FROM', required: false, defaultValue: 'CVGHIS', description: 'Default sender used by the SMS provider.' },
  { app: 'api', key: 'SMS_MOCK_MODE', required: false, defaultValue: 'false', description: 'Explicitly enables LocalSmsGateway for development/test only; local mocks are rejected in production-like environments.' },
  { app: 'api', key: 'GOOGLE_CALENDAR_ACCESS_TOKEN', required: false, sensitive: true, description: 'Bearer token used for outbound Google Calendar sync. Required in production-like environments.' },
  { app: 'api', key: 'GOOGLE_CALENDAR_CALENDAR_ID', required: false, description: 'Google Calendar identifier used for outbound appointment sync. Required in production-like environments.' },
  { app: 'api', key: 'GOOGLE_CALENDAR_MOCK_MODE', required: false, defaultValue: 'false', description: 'Explicitly enables LocalGoogleCalendarGateway for development/test only; local mocks are rejected in production-like environments.' },
  { app: 'api', key: 'REDIS_URL', required: false, description: 'Redis connection URL for distributed rate limiting. When set, the auth rate limiter uses Redis backend instead of in-memory.' },
  { app: 'api', key: 'VAULT_ENABLED', required: false, defaultValue: 'false', description: 'When true, enables HashiCorp Vault AppRole bootstrap for managed secrets.' },
  { app: 'api', key: 'VAULT_URL', required: false, description: 'Base URL of the Vault server.' },
  { app: 'api', key: 'VAULT_ROLE_ID', required: false, sensitive: true, description: 'Vault AppRole role_id used by the API bootstrap.' },
  { app: 'api', key: 'VAULT_SECRET_ID', required: false, sensitive: true, description: 'Vault AppRole secret_id used by the API bootstrap.' },
  { app: 'api', key: 'VAULT_NAMESPACE', required: false, description: 'Optional Vault Enterprise namespace header.' },
  { app: 'api', key: 'VAULT_SECRET_PATH_PREFIX', required: false, defaultValue: 'secret/data/cvg-his-v2', description: 'Vault KV-v2 path prefix used for managed application secrets.' }
];

export const WORKER_CONFIG_FIELDS: readonly ConfigFieldDescriptor[] = [
  { app: 'worker', key: 'NODE_ENV', required: false, defaultValue: 'development', description: 'Runtime environment.' },
  { app: 'worker', key: 'APP_NAME', required: false, defaultValue: DEFAULT_WORKER_APP_NAME, description: 'Service name used in logs and metrics.' },
  { app: 'worker', key: 'WORKER_INTERVAL_MS', required: false, defaultValue: String(DEFAULT_WORKER_INTERVAL_MS), description: 'Polling interval for worker ticks.' },
  { app: 'worker', key: 'WORKER_HEALTH_PORT', required: false, defaultValue: String(DEFAULT_WORKER_HEALTH_PORT), description: 'Listen port for the worker health endpoint.' },
  { app: 'worker', key: 'OTEL_ENABLED', required: false, defaultValue: 'false', description: 'Enable OpenTelemetry SDK bootstrap for this service.' },
  { app: 'worker', key: 'OTEL_SERVICE_NAME', required: false, defaultValue: DEFAULT_WORKER_APP_NAME, description: 'Service name exported to OpenTelemetry resources.' },
  { app: 'worker', key: 'OTEL_EXPORTER_OTLP_PROTOCOL', required: false, defaultValue: DEFAULT_OTLP_PROTOCOL, description: 'OTLP transport protocol. Current foundation supports http/protobuf.' },
  { app: 'worker', key: 'OTEL_EXPORTER_OTLP_TRACES_ENDPOINT', required: false, description: 'Trace exporter endpoint for OTLP/HTTP.' },
  { app: 'worker', key: 'OTEL_EXPORTER_OTLP_HEADERS', required: false, sensitive: true, description: 'Comma-separated OTLP headers in key=value format.' },
  { app: 'worker', key: 'DATABASE_URL', required: false, description: 'Database connection string. Required in production-like environments; optional only for local/test degraded mode.' },
  { app: 'worker', key: 'FEATURE_FLAGS_PROVIDER', required: false, defaultValue: 'env', description: 'Feature flag provider type. Currently supports "env" (bootstrap/development mode).' },
  { app: 'worker', key: 'WORKER_FEATURE_FLAGS', required: false, description: 'Comma-separated list of explicitly enabled feature flag keys for the worker. Example: "runtime.distributed_state.enabled,notifications.whatsapp.provider_enabled".' }
];

export const SPA_CONFIG_FIELDS: readonly ConfigFieldDescriptor[] = [
  { app: 'spa', key: 'NODE_ENV', required: false, defaultValue: 'development', description: 'Runtime environment used by Vite and the client bundle.' },
  { app: 'spa', key: 'PORT', required: false, defaultValue: String(DEFAULT_WEB_PORT), description: 'Dev server port used by Vite.' },
  { app: 'spa', key: 'VITE_APP_NAME', required: false, defaultValue: 'CVG HIS V2', description: 'Display name of the SPA.' },
  { app: 'spa', key: 'VITE_API_BASE_URL', required: false, defaultValue: '', description: 'API origin or prefix. Accepts same-origin empty value, origin URL or `/api`-style prefix.' },
  { app: 'spa', key: 'VITE_PROXY_API_TARGET', required: false, defaultValue: DEFAULT_PROXY_API_TARGET, description: 'Proxy target for local Vite development.' },
  { app: 'spa', key: 'VITE_DISABLE_PWA', required: false, defaultValue: '0', description: 'Disable service worker/PWA registration when set to 1/true.' }
];

export interface ApiAppConfig {
  readonly appName: string;
  readonly environment: string;
  readonly port: number;
  readonly host: string;
  readonly corsAllowedOrigins: readonly string[];
  readonly authSecret: string;
  readonly authVerifierSecrets: readonly string[];
  readonly authSecretVersion?: string;
  readonly accessTokenTtlSeconds: number;
  readonly refreshTokenTtlSeconds: number;
  readonly authRateLimitMaxRequests: number;
  readonly authRateLimitWindowMs: number;
  readonly otelEnabled: boolean;
  readonly otelServiceName: string;
  readonly otlpProtocol: string;
  readonly otlpTracesEndpoint?: string;
  readonly otlpHeaders: Readonly<Record<string, string>>;
  readonly databaseUrl?: string;
  readonly fileStoragePath: string;
  readonly enableMfa: boolean;
  readonly mfaEncryptionKey?: string;
  readonly mfaEncryptionKeyVersion?: string;
  readonly featureFlagsProvider: string;
  readonly apiFeatureFlags: readonly string[];
  readonly runtimeDistributedStateEnabled: boolean;
  readonly pagarmeApiKey?: string;
  readonly pagarmePixKey?: string;
  readonly pixMockMode?: boolean;
  readonly resendApiKey?: string;
  readonly emailFrom?: string;
  readonly emailMockMode?: boolean;
  readonly smsApiKey?: string;
  readonly smsFrom?: string;
  readonly smsMockMode?: boolean;
  readonly googleCalendarAccessToken?: string;
  readonly googleCalendarCalendarId?: string;
  readonly googleCalendarMockMode?: boolean;
  readonly redisUrl?: string;
  readonly vaultEnabled: boolean;
  readonly vaultUrl?: string;
  readonly vaultRoleId?: string;
  readonly vaultSecretId?: string;
  readonly vaultNamespace?: string;
  readonly vaultSecretPathPrefix: string;
}

export interface WebAppConfig {
  readonly appName: string;
  readonly environment: string;
  readonly port: number;
  readonly host: string;
  readonly apiBaseUrl: string;
  readonly proxyApiTarget: string;
  readonly disablePwa: boolean;
}

export interface WorkerAppConfig {
  readonly appName: string;
  readonly environment: string;
  readonly intervalMs: number;
  readonly healthPort: number;
  readonly otelEnabled: boolean;
  readonly otelServiceName: string;
  readonly otlpProtocol: string;
  readonly otlpTracesEndpoint?: string;
  readonly otlpHeaders: Readonly<Record<string, string>>;
  readonly databaseUrl?: string;
  readonly featureFlagsProvider: string;
  readonly workerFeatureFlags: readonly string[];
}

function isProductionEnvironment(env: string): boolean {
  return env === 'production' || env === 'staging' || env === 'prod' || env === 'stage';
}

function validateSecret(secret: string, environment: string): void {
  if (isProductionEnvironment(environment)) {
    if (secret.length < MIN_SECRET_LENGTH) {
      throw new Error(
        `AUTH_SECRET must be at least ${MIN_SECRET_LENGTH} characters in ${environment} environment. Current: ${secret.length} chars`
      );
    }
    if (INSECURE_SECRETS.some((insecure) => secret.toLowerCase().includes(insecure))) {
      throw new Error(
        `AUTH_SECRET contains an insecure default value. Please set a strong secret for ${environment} environment`
      );
    }
  }
}

function validateCorsOrigin(origin: string): string {
  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    throw new Error(
      `CORS_ALLOWED_ORIGINS must contain only absolute http(s) origins. Invalid value: ${origin}`
    );
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error(
      `CORS_ALLOWED_ORIGINS must contain only absolute http(s) origins. Invalid value: ${origin}`
    );
  }

  if (parsed.pathname !== '/' || parsed.search.length > 0 || parsed.hash.length > 0) {
    throw new Error(
      `CORS_ALLOWED_ORIGINS entries must be origins without path, query or hash. Invalid value: ${origin}`
    );
  }

  return parsed.origin;
}

function parseCorsAllowedOrigins(value: string): readonly string[] {
  const parsed = value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .map(validateCorsOrigin);

  if (parsed.length === 0) {
    throw new Error('CORS_ALLOWED_ORIGINS must include at least one allowed origin');
  }

  return Array.from(new Set(parsed));
}

function resolveCorsAllowedOrigins(
  environment: string,
  configuredValue?: string
): readonly string[] {
  if (!configuredValue) {
    if (isProductionEnvironment(environment)) {
      throw new Error('CORS_ALLOWED_ORIGINS is required in production-like environments');
    }

    return DEFAULT_LOCAL_CORS_ALLOWED_ORIGINS;
  }

  return parseCorsAllowedOrigins(configuredValue);
}

function parseOtlpHeaders(value?: string): Readonly<Record<string, string>> {
  if (!value) {
    return {};
  }

  const headers: Record<string, string> = {};
  for (const entry of value.split(',')) {
    const trimmedEntry = entry.trim();
    if (trimmedEntry.length === 0) {
      continue;
    }

    const separatorIndex = trimmedEntry.indexOf('=');
    if (separatorIndex <= 0 || separatorIndex === trimmedEntry.length - 1) {
      throw new Error(
        'OTEL_EXPORTER_OTLP_HEADERS must use comma-separated key=value pairs'
      );
    }

    const key = trimmedEntry.slice(0, separatorIndex).trim();
    const headerValue = trimmedEntry.slice(separatorIndex + 1).trim();
    if (key.length === 0 || headerValue.length === 0) {
      throw new Error(
        'OTEL_EXPORTER_OTLP_HEADERS must use comma-separated key=value pairs'
      );
    }

    headers[key] = headerValue;
  }

  return headers;
}

function parseFeatureFlagKeys(value?: string): readonly string[] {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function validateOtelConfig(input: {
  OTEL_ENABLED: boolean;
  OTEL_EXPORTER_OTLP_PROTOCOL: string;
  OTEL_EXPORTER_OTLP_TRACES_ENDPOINT?: string;
}): void {
  if (input.OTEL_EXPORTER_OTLP_PROTOCOL !== DEFAULT_OTLP_PROTOCOL) {
    throw new Error(
      `OTEL_EXPORTER_OTLP_PROTOCOL=${input.OTEL_EXPORTER_OTLP_PROTOCOL} is not supported. Use ${DEFAULT_OTLP_PROTOCOL}`
    );
  }

  if (input.OTEL_ENABLED && !input.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT) {
    throw new Error(
      'OTEL_EXPORTER_OTLP_TRACES_ENDPOINT is required when OTEL_ENABLED=true'
    );
  }
}

function normalizeEnvRecord(env: Record<string, unknown>): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(env)) {
    if (typeof value === 'string') {
      const trimmed = value.trim();
      normalized[key] = trimmed.length === 0 ? undefined : trimmed;
      continue;
    }

    normalized[key] = value;
  }

  return normalized;
}

function formatConfigIssues(appName: string, issues: readonly z.ZodIssue[]): string {
  const details = issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join('.') : 'root';
      return `- ${path}: ${issue.message}`;
    })
    .join('\n');

  return `Invalid ${appName} configuration:\n${details}`;
}

function parseConfig<TSchema extends z.ZodTypeAny>(
  appName: string,
  schema: TSchema,
  env: Record<string, unknown>
): z.infer<TSchema> {
  const parsed = schema.safeParse(normalizeEnvRecord(env));
  if (!parsed.success) {
    throw new Error(formatConfigIssues(appName, parsed.error.issues));
  }

  return parsed.data;
}

function isValidSpaApiBaseUrl(value: string): boolean {
  if (value.length === 0) {
    return true;
  }

  if (value.startsWith('/')) {
    return true;
  }

  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function normalizeSpaApiBaseUrl(value: string): string {
  if (value.length === 0) {
    return '';
  }

  const withoutTrailingSlash = value.replace(/\/+$/, '');
  if (withoutTrailingSlash === '/api') {
    return '';
  }

  return withoutTrailingSlash.endsWith('/api')
    ? withoutTrailingSlash.slice(0, -4)
    : withoutTrailingSlash;
}

const apiEnvSchema = z
  .object({
    NODE_ENV: environmentSchema.default('development'),
    APP_NAME: nonEmptyStringSchema.default(DEFAULT_API_APP_NAME),
    PORT: portSchema.default(DEFAULT_API_PORT),
    HOST: nonEmptyStringSchema.default(DEFAULT_HOST),
    CORS_ALLOWED_ORIGINS: optionalNonEmptyStringSchema,
    AUTH_SECRET: nonEmptyStringSchema.default(INSECURE_DEFAULT_SECRET),
    AUTH_SECRET_PREVIOUS: optionalNonEmptyStringSchema,
    AUTH_SECRET_VERSION: optionalNonEmptyStringSchema,
    AUTH_ACCESS_TOKEN_TTL_SECONDS: positiveNumberSchema.default(DEFAULT_ACCESS_TOKEN_TTL_SECONDS),
    AUTH_REFRESH_TOKEN_TTL_SECONDS: positiveNumberSchema.default(DEFAULT_REFRESH_TOKEN_TTL_SECONDS),
    AUTH_RATE_LIMIT_MAX_REQUESTS: positiveNumberSchema.default(10),
    AUTH_RATE_LIMIT_WINDOW_MS: positiveNumberSchema.default(15 * 60 * 1000),
    OTEL_ENABLED: booleanStringSchema.default(false),
    OTEL_SERVICE_NAME: optionalNonEmptyStringSchema,
    OTEL_EXPORTER_OTLP_PROTOCOL: nonEmptyStringSchema.default(DEFAULT_OTLP_PROTOCOL),
    OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: optionalUrlSchema,
    OTEL_EXPORTER_OTLP_HEADERS: optionalNonEmptyStringSchema,
    DATABASE_URL: optionalUrlSchema,
    FILE_STORAGE_PATH: nonEmptyStringSchema.default(DEFAULT_FILE_STORAGE_PATH),
    ENABLE_MFA: booleanStringSchema.default(false),
    MFA_SECRET_ENCRYPTION_KEY: optionalNonEmptyStringSchema,
    MFA_SECRET_ENCRYPTION_KEY_VERSION: optionalNonEmptyStringSchema,
    FEATURE_FLAGS_PROVIDER: nonEmptyStringSchema.default('env'),
    API_FEATURE_FLAGS: optionalNonEmptyStringSchema,
    RUNTIME_DISTRIBUTED_STATE_ENABLED: booleanStringSchema.default(false),
    PAGARME_API_KEY: optionalNonEmptyStringSchema,
    PAGARME_PIX_KEY: optionalNonEmptyStringSchema,
    PIX_MOCK_MODE: booleanStringSchema.default(false),
    RESEND_API_KEY: optionalNonEmptyStringSchema,
    EMAIL_FROM: optionalNonEmptyStringSchema.default('noreply@cvg-his.local'),
    EMAIL_MOCK_MODE: booleanStringSchema.default(false),
    SMS_API_KEY: optionalNonEmptyStringSchema,
    SMS_FROM: optionalNonEmptyStringSchema.default('CVGHIS'),
    SMS_MOCK_MODE: booleanStringSchema.default(false),
    GOOGLE_CALENDAR_ACCESS_TOKEN: optionalNonEmptyStringSchema,
    GOOGLE_CALENDAR_CALENDAR_ID: optionalNonEmptyStringSchema,
    GOOGLE_CALENDAR_MOCK_MODE: booleanStringSchema.default(false),
    REDIS_URL: optionalUrlSchema,
    VAULT_ENABLED: booleanStringSchema.default(false),
    VAULT_URL: optionalUrlSchema,
    VAULT_ROLE_ID: optionalNonEmptyStringSchema,
    VAULT_SECRET_ID: optionalNonEmptyStringSchema,
    VAULT_NAMESPACE: optionalNonEmptyStringSchema,
    VAULT_SECRET_PATH_PREFIX: optionalNonEmptyStringSchema.default('secret/data/cvg-his-v2')
  })
  .superRefine((value, ctx) => {
    if (value.ENABLE_MFA && !value.MFA_SECRET_ENCRYPTION_KEY) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['MFA_SECRET_ENCRYPTION_KEY'],
        message: 'MFA_SECRET_ENCRYPTION_KEY is required when ENABLE_MFA=true'
      });
    }

    if (isProductionEnvironment(value.NODE_ENV) && !value.DATABASE_URL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['DATABASE_URL'],
        message: 'DATABASE_URL is required in production-like environments'
      });
    }

    if (isProductionEnvironment(value.NODE_ENV)) {
      const integrations = [
        {
          mock: value.PIX_MOCK_MODE,
          credentials: [
            ['PAGARME_API_KEY', value.PAGARME_API_KEY],
            ['PAGARME_PIX_KEY', value.PAGARME_PIX_KEY]
          ] as const
        },
        {
          mock: value.EMAIL_MOCK_MODE,
          credentials: [['RESEND_API_KEY', value.RESEND_API_KEY]] as const
        },
        {
          mock: value.SMS_MOCK_MODE,
          credentials: [['SMS_API_KEY', value.SMS_API_KEY]] as const
        },
        {
          mock: value.GOOGLE_CALENDAR_MOCK_MODE,
          credentials: [
            ['GOOGLE_CALENDAR_ACCESS_TOKEN', value.GOOGLE_CALENDAR_ACCESS_TOKEN],
            ['GOOGLE_CALENDAR_CALENDAR_ID', value.GOOGLE_CALENDAR_CALENDAR_ID]
          ] as const
        }
      ];

      for (const integration of integrations) {
        if (integration.mock) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ['NODE_ENV'],
            message: 'Local integration mock mode is forbidden in production-like environments'
          });
          continue;
        }

        for (const [key, credential] of integration.credentials) {
          if (!credential) {
            ctx.addIssue({
              code: z.ZodIssueCode.custom,
              path: [key],
              message: `${key} is required in production-like environments`
            });
          }
        }
      }
    }
  });

const workerEnvSchema = z
  .object({
    NODE_ENV: environmentSchema.default('development'),
    APP_NAME: nonEmptyStringSchema.default(DEFAULT_WORKER_APP_NAME),
    WORKER_INTERVAL_MS: positiveNumberSchema.default(DEFAULT_WORKER_INTERVAL_MS),
    WORKER_HEALTH_PORT: portSchema.default(DEFAULT_WORKER_HEALTH_PORT),
    OTEL_ENABLED: booleanStringSchema.default(false),
    OTEL_SERVICE_NAME: optionalNonEmptyStringSchema,
    OTEL_EXPORTER_OTLP_PROTOCOL: nonEmptyStringSchema.default(DEFAULT_OTLP_PROTOCOL),
    OTEL_EXPORTER_OTLP_TRACES_ENDPOINT: optionalUrlSchema,
    OTEL_EXPORTER_OTLP_HEADERS: optionalNonEmptyStringSchema,
    DATABASE_URL: optionalUrlSchema,
    FEATURE_FLAGS_PROVIDER: nonEmptyStringSchema.default('env'),
    WORKER_FEATURE_FLAGS: optionalNonEmptyStringSchema
  })
  .superRefine((value, ctx) => {
    if (isProductionEnvironment(value.NODE_ENV) && !value.DATABASE_URL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['DATABASE_URL'],
        message: 'DATABASE_URL is required in production-like environments'
      });
    }
  });

const spaClientEnvBaseSchema = z.object({
  NODE_ENV: environmentSchema.default('development'),
  VITE_APP_NAME: nonEmptyStringSchema.default('CVG HIS V2'),
  VITE_API_BASE_URL: z.string().trim().default(''),
  VITE_DISABLE_PWA: booleanStringSchema.default(false)
});

function validateSpaApiBaseUrl(
  value: { VITE_API_BASE_URL: string },
  ctx: z.RefinementCtx
): void {
  if (!isValidSpaApiBaseUrl(value.VITE_API_BASE_URL)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['VITE_API_BASE_URL'],
      message: 'VITE_API_BASE_URL must be empty, an absolute http(s) URL, or a relative path starting with "/"'
    });
  }
}

const spaClientEnvSchema = spaClientEnvBaseSchema.superRefine(validateSpaApiBaseUrl);

const spaViteEnvSchema = spaClientEnvBaseSchema.extend({
  PORT: portSchema.default(DEFAULT_WEB_PORT),
  HOST: nonEmptyStringSchema.default(DEFAULT_HOST),
  VITE_PROXY_API_TARGET: z.string().trim().url().default(DEFAULT_PROXY_API_TARGET)
}).superRefine(validateSpaApiBaseUrl);

export function loadApiConfig(env: NodeJS.ProcessEnv): ApiAppConfig {
  const parsed = parseConfig('api', apiEnvSchema, env);
  validateSecret(parsed.AUTH_SECRET, parsed.NODE_ENV);
  for (const previousSecret of parseSecretList(parsed.AUTH_SECRET_PREVIOUS)) {
    validateSecret(previousSecret, parsed.NODE_ENV);
  }
  validateOtelConfig(parsed);

  return {
    appName: parsed.APP_NAME,
    environment: parsed.NODE_ENV,
    port: parsed.PORT,
    host: parsed.HOST,
    corsAllowedOrigins: resolveCorsAllowedOrigins(parsed.NODE_ENV, parsed.CORS_ALLOWED_ORIGINS),
    authSecret: parsed.AUTH_SECRET,
    authVerifierSecrets: parseSecretList(parsed.AUTH_SECRET_PREVIOUS),
    authSecretVersion: parsed.AUTH_SECRET_VERSION,
    accessTokenTtlSeconds: parsed.AUTH_ACCESS_TOKEN_TTL_SECONDS,
    refreshTokenTtlSeconds: parsed.AUTH_REFRESH_TOKEN_TTL_SECONDS,
    authRateLimitMaxRequests: parsed.AUTH_RATE_LIMIT_MAX_REQUESTS,
    authRateLimitWindowMs: parsed.AUTH_RATE_LIMIT_WINDOW_MS,
    otelEnabled: parsed.OTEL_ENABLED,
    otelServiceName: parsed.OTEL_SERVICE_NAME ?? parsed.APP_NAME,
    otlpProtocol: parsed.OTEL_EXPORTER_OTLP_PROTOCOL,
    otlpTracesEndpoint: parsed.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT,
    otlpHeaders: parseOtlpHeaders(parsed.OTEL_EXPORTER_OTLP_HEADERS),
    databaseUrl: parsed.DATABASE_URL,
    fileStoragePath: parsed.FILE_STORAGE_PATH,
    enableMfa: parsed.ENABLE_MFA,
    mfaEncryptionKey: parsed.MFA_SECRET_ENCRYPTION_KEY,
    mfaEncryptionKeyVersion: parsed.MFA_SECRET_ENCRYPTION_KEY_VERSION,
    featureFlagsProvider: parsed.FEATURE_FLAGS_PROVIDER,
    apiFeatureFlags: parseFeatureFlagKeys(parsed.API_FEATURE_FLAGS),
    runtimeDistributedStateEnabled: parsed.RUNTIME_DISTRIBUTED_STATE_ENABLED,
    pagarmeApiKey: parsed.PAGARME_API_KEY,
    pagarmePixKey: parsed.PAGARME_PIX_KEY,
    pixMockMode: parsed.PIX_MOCK_MODE,
    resendApiKey: parsed.RESEND_API_KEY,
    emailFrom: parsed.EMAIL_FROM,
    emailMockMode: parsed.EMAIL_MOCK_MODE,
    smsApiKey: parsed.SMS_API_KEY,
    smsFrom: parsed.SMS_FROM,
    smsMockMode: parsed.SMS_MOCK_MODE,
    googleCalendarAccessToken: parsed.GOOGLE_CALENDAR_ACCESS_TOKEN,
    googleCalendarCalendarId: parsed.GOOGLE_CALENDAR_CALENDAR_ID,
    googleCalendarMockMode: parsed.GOOGLE_CALENDAR_MOCK_MODE,
    redisUrl: parsed.REDIS_URL,
    vaultEnabled: parsed.VAULT_ENABLED,
    vaultUrl: parsed.VAULT_URL,
    vaultRoleId: parsed.VAULT_ROLE_ID,
    vaultSecretId: parsed.VAULT_SECRET_ID,
    vaultNamespace: parsed.VAULT_NAMESPACE,
    vaultSecretPathPrefix: parsed.VAULT_SECRET_PATH_PREFIX
  };
}

function parseSecretList(value: string | undefined): readonly string[] {
  if (!value) {
    return [];
  }
  return value
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export function loadWebConfig(env: NodeJS.ProcessEnv): WebAppConfig {
  const parsed = parseConfig('web', spaViteEnvSchema, {
    NODE_ENV: env.NODE_ENV,
    APP_NAME: env.APP_NAME,
    PORT: env.PORT,
    HOST: env.HOST,
    VITE_APP_NAME: env.VITE_APP_NAME ?? env.APP_NAME ?? DEFAULT_WEB_APP_NAME,
    VITE_API_BASE_URL: env.API_BASE_URL ?? env.VITE_API_BASE_URL,
    VITE_PROXY_API_TARGET: env.VITE_PROXY_API_TARGET,
    VITE_DISABLE_PWA: env.VITE_DISABLE_PWA
  });

  return {
    appName: parsed.VITE_APP_NAME,
    environment: parsed.NODE_ENV,
    port: parsed.PORT,
    host: parsed.HOST,
    apiBaseUrl: normalizeSpaApiBaseUrl(parsed.VITE_API_BASE_URL),
    proxyApiTarget: parsed.VITE_PROXY_API_TARGET,
    disablePwa: parsed.VITE_DISABLE_PWA
  };
}

export function loadWorkerConfig(env: NodeJS.ProcessEnv): WorkerAppConfig {
  const parsed = parseConfig('worker', workerEnvSchema, env);
  validateOtelConfig(parsed);

  return {
    appName: parsed.APP_NAME,
    environment: parsed.NODE_ENV,
    intervalMs: parsed.WORKER_INTERVAL_MS,
    healthPort: parsed.WORKER_HEALTH_PORT,
    otelEnabled: parsed.OTEL_ENABLED,
    otelServiceName: parsed.OTEL_SERVICE_NAME ?? parsed.APP_NAME,
    otlpProtocol: parsed.OTEL_EXPORTER_OTLP_PROTOCOL,
    otlpTracesEndpoint: parsed.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT,
    otlpHeaders: parseOtlpHeaders(parsed.OTEL_EXPORTER_OTLP_HEADERS),
    databaseUrl: parsed.DATABASE_URL,
    featureFlagsProvider: parsed.FEATURE_FLAGS_PROVIDER,
    workerFeatureFlags: parseFeatureFlagKeys(parsed.WORKER_FEATURE_FLAGS)
  };
}

export function loadSpaClientConfig(env: Record<string, unknown>): WebAppConfig {
  const parsed = parseConfig('spa-client', spaClientEnvSchema, env);

  return {
    appName: parsed.VITE_APP_NAME,
    environment: parsed.NODE_ENV,
    port: DEFAULT_WEB_PORT,
    host: DEFAULT_HOST,
    apiBaseUrl: normalizeSpaApiBaseUrl(parsed.VITE_API_BASE_URL),
    proxyApiTarget: DEFAULT_PROXY_API_TARGET,
    disablePwa: parsed.VITE_DISABLE_PWA
  };
}

export function loadSpaViteConfig(env: Record<string, unknown>): WebAppConfig {
  const parsed = parseConfig('spa-vite', spaViteEnvSchema, env);

  return {
    appName: parsed.VITE_APP_NAME,
    environment: parsed.NODE_ENV,
    port: parsed.PORT,
    host: parsed.HOST,
    apiBaseUrl: normalizeSpaApiBaseUrl(parsed.VITE_API_BASE_URL),
    proxyApiTarget: parsed.VITE_PROXY_API_TARGET,
    disablePwa: parsed.VITE_DISABLE_PWA
  };
}
