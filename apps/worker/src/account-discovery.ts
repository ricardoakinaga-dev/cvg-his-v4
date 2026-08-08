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

function normalizeAccountIds(accountIds: readonly string[]): readonly string[] {
  return [...new Set(accountIds.map((accountId) => accountId.trim()).filter(Boolean))].sort();
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

  const accountIds =
    loadedAccountIds.length === 0 && ['development', 'test'].includes(options.environment)
      ? ['acc_cvg_demo']
      : loadedAccountIds;

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
