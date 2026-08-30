import type { Pool } from 'pg';

import { getPool } from '@cvg-his-v2/shared-database';
import { WORKER_REPORTS_USER_ID_PATTERN } from '@cvg-his-v2/shared-config';
import { withTenantQueryExplicit } from '@cvg-his-v2/tenant-context';
import type { UserId } from '@cvg-his-v2/shared-types';

export const WORKER_REPORT_SERVICE_PRINCIPAL_PURPOSE = 'report-execution' as const;

export function resolveWorkerReportsUserId(configuredUserId?: string): UserId {
  const normalized = configuredUserId?.trim();
  if (!normalized) {
    throw new Error(
      'WORKER_REPORTS_USER_ID is required for scheduled report execution; account IDs are not valid report actors'
    );
  }
  if (!WORKER_REPORTS_USER_ID_PATTERN.test(normalized)) {
    throw new Error('WORKER_REPORTS_USER_ID must be a canonical UUID');
  }
  return normalized as UserId;
}

export async function resolveWorkerReportServicePrincipal(
  accountId: string,
  configuredUserId: UserId,
  pool: Pool = getPool()
): Promise<UserId> {
  const result = await withTenantQueryExplicit(pool, accountId, (client) =>
    client.query<{ readonly user_id: string }>(
      `SELECT principal.user_id
         FROM account_service_principals AS principal
         JOIN users
           ON users.account_id = principal.account_id
          AND users.id = principal.user_id
        WHERE principal.account_id = $1
          AND principal.purpose = $2
          AND principal.user_id = $3
          AND principal.is_active = TRUE
          AND users.is_active = TRUE
          AND users.principal_kind = 'service'
          AND users.interactive_login_enabled = FALSE
        LIMIT 1`,
      [accountId, WORKER_REPORT_SERVICE_PRINCIPAL_PURPOSE, configuredUserId]
    )
  );
  const principal = result.rows[0];
  if (!principal) {
    throw new Error(
      'WORKER_REPORTS_USER_ID is not mapped as an active report service principal for this account'
    );
  }
  return principal.user_id as UserId;
}
