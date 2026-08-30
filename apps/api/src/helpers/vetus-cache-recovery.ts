import type { AuditService } from '@cvg-his-v2/module-audit';
import type { OwnersService } from '@cvg-his-v2/module-owners';
import type { PatientsService } from '@cvg-his-v2/module-patients';
import type { AccountId } from '@cvg-his-v2/shared-types';

interface RefreshableCache {
  refreshFromDatabase(accountId: AccountId): Promise<void>;
}

export interface VetusCacheRecoveryDependencies {
  readonly owners: Pick<OwnersService, 'refreshFromDatabase'>;
  readonly patients: Pick<PatientsService, 'refreshFromDatabase'>;
  readonly audit: Pick<AuditService, 'refreshFromDatabase'>;
}

/**
 * Reconciles the caches touched by Vetus imports after a tenant command
 * boundary. Refreshes for one account are serialized so a slower snapshot
 * cannot finish after a newer refresh and regress the hot cache.
 */
export function createVetusCacheRefresher(
  dependencies: VetusCacheRecoveryDependencies
): (accountId: AccountId) => Promise<void> {
  const pendingByAccount = new Map<string, Promise<void>>();

  return async (accountId: AccountId): Promise<void> => {
    const previous = pendingByAccount.get(accountId) ?? Promise.resolve();
    const current = previous.catch(() => undefined).then(async () => {
      await refreshCaches(dependencies, accountId);
    });
    pendingByAccount.set(accountId, current);

    try {
      await current;
    } finally {
      if (pendingByAccount.get(accountId) === current) {
        pendingByAccount.delete(accountId);
      }
    }
  };
}

async function refreshCaches(
  dependencies: VetusCacheRecoveryDependencies,
  accountId: AccountId
): Promise<void> {
  const caches: readonly RefreshableCache[] = [
    dependencies.owners,
    dependencies.patients,
    dependencies.audit
  ];
  // Wait for every snapshot to settle before the per-account queue advances.
  // Promise.all would reject on the first failure while a slower sibling could
  // still be writing an older snapshot into its cache.
  const results = await Promise.allSettled(
    caches.map((cache) => cache.refreshFromDatabase(accountId))
  );
  const rejected = results.find((result) => result.status === 'rejected');
  if (rejected?.status === 'rejected') {
    throw rejected.reason;
  }
}
