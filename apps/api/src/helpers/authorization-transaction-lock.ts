import type { IncomingMessage } from 'node:http';
import { URL } from 'node:url';

import {
  acquireTenantAuthorizationMutationLock,
  acquireTenantAuthorizationSharedLock,
  getDatabaseTransactionScope
} from '@cvg-his-v2/shared-database';

function isAccessControlMutationRequest(request: IncomingMessage): boolean {
  const method = request.method?.toUpperCase();
  if (!method || ['GET', 'HEAD', 'OPTIONS'].includes(method)) return false;

  const pathname = new URL(request.url ?? '/', 'http://localhost').pathname;
  return pathname.startsWith('/access-control/') || pathname.startsWith('/api/access-control/');
}

export async function acquireAuthorizationTransactionLock(
  request: IncomingMessage,
  accountId: string
): Promise<void> {
  if (!getDatabaseTransactionScope()) return;

  const acquireLock = isAccessControlMutationRequest(request)
    ? acquireTenantAuthorizationMutationLock
    : acquireTenantAuthorizationSharedLock;
  await acquireLock(accountId);
}
