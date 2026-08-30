const READ_ONLY_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const CONTROL_PATH_PREFIXES = [
  '/auth/',
  '/api/auth/',
  '/chaos/',
  '/health',
  '/ready',
  '/live',
  '/metrics',
  '/openapi',
  '/docs'
] as const;

const PUBLIC_DURABLE_MUTATION_PATHS = new Set([
  '/webhooks/pix/synthetic/v1',
  '/webhooks/whatsapp/inbound',
  '/api/webhooks/whatsapp/inbound'
]);

/**
 * Returns whether a request can mutate tenant/application state.
 *
 * The database-failure experiment is intentionally conservative: the API
 * does not maintain a complete route-to-durability registry, and many ERP
 * mutations can emit clinical or financial side effects. Blocking every
 * authenticated non-control mutation prevents a memory-backed handler from
 * acknowledging a command that was not committed to PostgreSQL.
 */
export function isDatabaseFailureMutationPath(pathname: string, method?: string): boolean {
  const normalizedMethod = method?.toUpperCase();
  if (!normalizedMethod || READ_ONLY_METHODS.has(normalizedMethod)) return false;
  return !CONTROL_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

/**
 * Public mutation paths must be contained before signature/body processing,
 * because they do not have an authenticated tenant context.
 */
export function isDatabaseFailurePublicMutationPath(pathname: string, method?: string): boolean {
  return (
    isDatabaseFailureMutationPath(pathname, method) && PUBLIC_DURABLE_MUTATION_PATHS.has(pathname)
  );
}
