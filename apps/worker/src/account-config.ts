const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const PRODUCTION_LIKE_ENVIRONMENTS = new Set(['production', 'staging', 'prod', 'stage']);

export interface WorkerAccountConfig {
  readonly accountIds: readonly string[];
}

export function isProductionLikeEnvironment(environment: string): boolean {
  return PRODUCTION_LIKE_ENVIRONMENTS.has(environment.trim().toLowerCase());
}

export function loadWorkerAccountConfig(
  env: NodeJS.ProcessEnv,
  environment: string
): WorkerAccountConfig {
  if (env.WORKER_ACCOUNT_ID?.trim()) {
    throw new Error('WORKER_ACCOUNT_ID is not supported; configure WORKER_ACCOUNT_IDS');
  }

  const rawAccountIds = env.WORKER_ACCOUNT_IDS?.trim() ?? '';
  if (!rawAccountIds) {
    if (isProductionLikeEnvironment(environment)) {
      throw new Error(
        'Production-like worker requires WORKER_ACCOUNT_IDS with at least one UUID'
      );
    }

    return Object.freeze({ accountIds: Object.freeze([]) });
  }

  const entries = rawAccountIds.split(',').map((entry) => entry.trim());
  if (entries.some((entry) => entry.length === 0)) {
    throw new Error('WORKER_ACCOUNT_IDS contains an empty entry');
  }

  const accountIds = entries.reduce<readonly string[]>((validated, entry) => {
    if (!UUID_PATTERN.test(entry)) {
      throw new Error('Every WORKER_ACCOUNT_IDS entry must be a valid UUID');
    }

    const normalized = entry.toLowerCase();
    if (validated.includes(normalized)) {
      throw new Error(`WORKER_ACCOUNT_IDS contains duplicate UUID ${normalized}`);
    }

    return [...validated, normalized];
  }, []);

  return Object.freeze({ accountIds: Object.freeze([...accountIds]) });
}
