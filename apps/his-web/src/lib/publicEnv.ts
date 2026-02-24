/**
 * Environment variable validation and resolution for his-web.
 *
 * PUBLIC (client-side):
 *   - NEXT_PUBLIC_HIS_API_BASE_URL: Must be "/api/proxy" (the proxy route)
 *
 * SERVER-SIDE (proxy route):
 *   - HIS_API_INTERNAL_URL: Internal URL to reach his-api (e.g., http://his-api:3000)
 *
 * DEPRECATED (will be ignored if set):
 *   - NEXT_PUBLIC_API_BASE_URL
 *   - NEXT_PUBLIC_API_URL
 *   - NEXT_PUBLIC_HIS_API_URL
 *   - HIS_API_BASE_URL (use HIS_API_INTERNAL_URL instead)
 */

const DEFAULT_PUBLIC_API_BASE_URL = '/api/proxy';
const PUBLIC_API_BASE_ENV_NAME = 'NEXT_PUBLIC_HIS_API_BASE_URL';
const INTERNAL_API_ENV_NAME = 'HIS_API_INTERNAL_URL';

// Deprecated env names that should be ignored
const DEPRECATED_ENV_NAMES = [
  'NEXT_PUBLIC_API_BASE_URL',
  'NEXT_PUBLIC_API_URL',
  'NEXT_PUBLIC_HIS_API_URL',
  'HIS_API_BASE_URL'
] as const;

type PublicApiBaseConfig = {
  baseUrl: string;
  source: string;
};

let cachedConfig: PublicApiBaseConfig | null = null;
let debugLogged = false;

function normalizeBaseUrl(value: string): string {
  if (value === '/') {
    return value;
  }

  return value.endsWith('/') ? value.slice(0, -1) : value;
}

/**
 * Warn if deprecated environment variables are set.
 * These variables are ignored to prevent misconfiguration.
 */
function warnDeprecatedEnvVars(): void {
  if (typeof window !== 'undefined') {
    return; // Skip on client-side
  }

  const deprecated: string[] = [];
  for (const name of DEPRECATED_ENV_NAMES) {
    const value = process.env[name];
    if (typeof value === 'string' && value.trim().length > 0) {
      deprecated.push(name);
    }
  }

  if (deprecated.length > 0 && !debugLogged) {
    console.warn(
      `[his-web][env] WARNING: Deprecated env vars detected: ${deprecated.join(', ')}. ` +
      `These are ignored. Use NEXT_PUBLIC_HIS_API_BASE_URL="/api/proxy" and HIS_API_INTERNAL_URL=<internal-url> instead.`
    );
  }
}

export function resolvePublicApiBaseConfig(): PublicApiBaseConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  const fromEnv = process.env.NEXT_PUBLIC_HIS_API_BASE_URL?.trim() ?? '';
  const hasEnvValue = fromEnv.length > 0;

  if (process.env.NODE_ENV === 'production' && !hasEnvValue) {
    throw new Error(
      `[his-web][env] FATAL: Missing required environment variable ${PUBLIC_API_BASE_ENV_NAME}.\n` +
      `  Expected value: "/api/proxy"\n` +
      `  This variable must be set at build time.`
    );
  }

  const rawBaseUrl = hasEnvValue ? fromEnv : DEFAULT_PUBLIC_API_BASE_URL;
  const source = hasEnvValue
    ? PUBLIC_API_BASE_ENV_NAME
    : `default:${DEFAULT_PUBLIC_API_BASE_URL}`;
  const normalized = normalizeBaseUrl(rawBaseUrl);

  if (process.env.NODE_ENV === 'production' && normalized.startsWith('http://')) {
    throw new Error(
      `[his-web][env] FATAL: Invalid ${PUBLIC_API_BASE_ENV_NAME}="${normalized}" in production.\n` +
      `  Use HTTPS or the recommended "/api/proxy" value.`
    );
  }

  cachedConfig = { baseUrl: normalized, source };
  return cachedConfig;
}

/**
 * Validate server-side environment for the proxy route.
 * Must be called in server context only.
 */
export function assertServerEnv(): void {
  if (typeof window !== 'undefined') {
    throw new Error('[his-web][env] assertServerEnv() must only be called on the server side');
  }

  const internalUrl = process.env.HIS_API_INTERNAL_URL?.trim() ?? '';

  if (process.env.NODE_ENV === 'production' && internalUrl.length === 0) {
    throw new Error(
      `[his-web][env] FATAL: Missing required environment variable ${INTERNAL_API_ENV_NAME}.\n` +
      `  Expected: Internal URL to reach his-api (e.g., http://his-api:3000)\n` +
      `  This variable is required in production for the proxy route to work.`
    );
  }

  warnDeprecatedEnvVars();
}

export function assertPublicEnvAtStartup(): void {
  const config = resolvePublicApiBaseConfig();

  if (process.env.NODE_ENV !== 'production' && !debugLogged) {
    debugLogged = true;
    console.info('[his-web][env] public API base resolved', config);
    warnDeprecatedEnvVars();
  }
}
