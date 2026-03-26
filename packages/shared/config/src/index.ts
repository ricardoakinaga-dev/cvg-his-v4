import { readNumberEnv, readStringEnv } from '@cvg-his-v2/shared-validation';

const INSECURE_DEFAULT_SECRET = 'cvg-his-v2-phase-3-dev-secret';

const MIN_SECRET_LENGTH = 32;
const INSECURE_SECRETS = [
  'cvg-his-v2-phase-3-dev-secret',
  'dev-secret',
  'test-secret',
  'changeme',
  'password',
  'secret',
  '123456'
];

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

export interface ApiAppConfig {
  readonly appName: string;
  readonly environment: string;
  readonly port: number;
  readonly host: string;
  readonly authSecret: string;
  readonly accessTokenTtlSeconds: number;
  readonly refreshTokenTtlSeconds: number;
}

export interface WebAppConfig {
  readonly appName: string;
  readonly environment: string;
  readonly port: number;
  readonly host: string;
  readonly apiBaseUrl: string;
}

export interface WorkerAppConfig {
  readonly appName: string;
  readonly environment: string;
  readonly intervalMs: number;
}

export function loadApiConfig(env: NodeJS.ProcessEnv): ApiAppConfig {
  const environment = readStringEnv(env.NODE_ENV, 'NODE_ENV', 'development');
  const authSecret = readStringEnv(env.AUTH_SECRET, 'AUTH_SECRET', INSECURE_DEFAULT_SECRET);

  validateSecret(authSecret, environment);

  return {
    appName: readStringEnv(env.APP_NAME, 'APP_NAME', 'cvg-his-v2-api'),
    environment,
    port: readNumberEnv(env.PORT, 'PORT', 3001),
    host: readStringEnv(env.HOST, 'HOST', '127.0.0.1'),
    authSecret,
    accessTokenTtlSeconds: readNumberEnv(
      env.AUTH_ACCESS_TOKEN_TTL_SECONDS,
      'AUTH_ACCESS_TOKEN_TTL_SECONDS',
      900
    ),
    refreshTokenTtlSeconds: readNumberEnv(
      env.AUTH_REFRESH_TOKEN_TTL_SECONDS,
      'AUTH_REFRESH_TOKEN_TTL_SECONDS',
      604800
    )
  };
}

export function loadWebConfig(env: NodeJS.ProcessEnv): WebAppConfig {
  return {
    appName: readStringEnv(env.APP_NAME, 'APP_NAME', 'cvg-his-v2-web'),
    environment: readStringEnv(env.NODE_ENV, 'NODE_ENV', 'development'),
    port: readNumberEnv(env.PORT, 'PORT', 3000),
    host: readStringEnv(env.HOST, 'HOST', '127.0.0.1'),
    apiBaseUrl: readStringEnv(env.API_BASE_URL, 'API_BASE_URL', 'http://localhost:3001')
  };
}

export function loadWorkerConfig(env: NodeJS.ProcessEnv): WorkerAppConfig {
  return {
    appName: readStringEnv(env.APP_NAME, 'APP_NAME', 'cvg-his-v2-worker'),
    environment: readStringEnv(env.NODE_ENV, 'NODE_ENV', 'development'),
    intervalMs: readNumberEnv(env.WORKER_INTERVAL_MS, 'WORKER_INTERVAL_MS', 5000)
  };
}
