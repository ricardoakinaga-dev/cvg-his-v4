import { readNumberEnv, readStringEnv } from "@cvg-his-v2/shared-validation";

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
  return {
    appName: readStringEnv(env.APP_NAME, "APP_NAME", "cvg-his-v2-api"),
    environment: readStringEnv(env.NODE_ENV, "NODE_ENV", "development"),
    port: readNumberEnv(env.PORT, "PORT", 3001),
    host: readStringEnv(env.HOST, "HOST", "127.0.0.1"),
    authSecret: readStringEnv(
      env.AUTH_SECRET,
      "AUTH_SECRET",
      "cvg-his-v2-phase-3-dev-secret",
    ),
    accessTokenTtlSeconds: readNumberEnv(
      env.AUTH_ACCESS_TOKEN_TTL_SECONDS,
      "AUTH_ACCESS_TOKEN_TTL_SECONDS",
      900,
    ),
    refreshTokenTtlSeconds: readNumberEnv(
      env.AUTH_REFRESH_TOKEN_TTL_SECONDS,
      "AUTH_REFRESH_TOKEN_TTL_SECONDS",
      604800,
    ),
  };
}

export function loadWebConfig(env: NodeJS.ProcessEnv): WebAppConfig {
  return {
    appName: readStringEnv(env.APP_NAME, "APP_NAME", "cvg-his-v2-web"),
    environment: readStringEnv(env.NODE_ENV, "NODE_ENV", "development"),
    port: readNumberEnv(env.PORT, "PORT", 3000),
    host: readStringEnv(env.HOST, "HOST", "127.0.0.1"),
    apiBaseUrl: readStringEnv(env.API_BASE_URL, "API_BASE_URL", "http://localhost:3001"),
  };
}

export function loadWorkerConfig(env: NodeJS.ProcessEnv): WorkerAppConfig {
  return {
    appName: readStringEnv(env.APP_NAME, "APP_NAME", "cvg-his-v2-worker"),
    environment: readStringEnv(env.NODE_ENV, "NODE_ENV", "development"),
    intervalMs: readNumberEnv(env.WORKER_INTERVAL_MS, "WORKER_INTERVAL_MS", 5000),
  };
}
