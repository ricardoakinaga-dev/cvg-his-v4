export interface RefreshWorkerAccountsOptions {
  readonly currentAccountIds: readonly string[];
  readonly configuredAccountId?: string;
  readonly loadAccountIds: () => Promise<readonly string[]>;
  readonly environment: string;
  readonly tolerateLoadFailure?: boolean;
}

export interface WorkerAccountRefreshResult {
  readonly accountIds: readonly string[];
  readonly discoveredAccountIds: readonly string[];
  readonly loadError?: string;
}

/**
 * A worker process must be sharded before it owns more than this many
 * accounts.  Concurrency bounds active work, but without a catalog bound the
 * refresh, hydration and per-tick bookkeeping can still grow without limit.
 */
export const MAX_WORKER_ACCOUNT_IDS = 1_000;

function normalizeAccountIds(accountIds: readonly string[]): readonly string[] {
  return [...new Set(accountIds.map((accountId) => accountId.trim()).filter(Boolean))].sort();
}

function assertWorkerAccountCatalogBound(accountIds: readonly string[]): readonly string[] {
  if (accountIds.length > MAX_WORKER_ACCOUNT_IDS) {
    throw new Error(
      `Worker account catalog exceeds ${MAX_WORKER_ACCOUNT_IDS} accounts; shard WORKER_ACCOUNT_IDS before starting this worker`
    );
  }
  return accountIds;
}

export async function refreshWorkerAccounts(
  options: RefreshWorkerAccountsOptions
): Promise<WorkerAccountRefreshResult> {
  const currentAccountIds = normalizeAccountIds(options.currentAccountIds);
  let loadedAccountIds: readonly string[];

  if (options.configuredAccountId?.trim()) {
    loadedAccountIds = [options.configuredAccountId.trim()];
  } else {
    try {
      loadedAccountIds = normalizeAccountIds(await options.loadAccountIds());
    } catch (error) {
      if (options.tolerateLoadFailure && currentAccountIds.length > 0) {
        return {
          accountIds: currentAccountIds,
          discoveredAccountIds: [],
          loadError: error instanceof Error ? error.message : String(error)
        };
      }
      throw error;
    }
  }

  const accountIds = assertWorkerAccountCatalogBound(
    loadedAccountIds.length === 0 && ['development', 'test'].includes(options.environment)
      ? ['acc_cvg_demo']
      : loadedAccountIds
  );

  if (accountIds.length === 0) {
    if (options.tolerateLoadFailure && currentAccountIds.length > 0) {
      return {
        accountIds: currentAccountIds,
        discoveredAccountIds: [],
        loadError: 'Worker account refresh returned no persisted accounts'
      };
    }
    throw new Error('Worker cannot start without at least one persisted account');
  }

  const currentAccounts = new Set(currentAccountIds);
  return {
    accountIds,
    discoveredAccountIds: accountIds.filter((accountId) => !currentAccounts.has(accountId))
  };
}
