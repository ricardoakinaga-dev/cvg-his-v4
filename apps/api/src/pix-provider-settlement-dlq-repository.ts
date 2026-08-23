import type { Pool, QueryResultRow } from 'pg';

import { getPool } from '@cvg-his-v2/shared-database';
import { ValidationError } from '@cvg-his-v2/shared-errors';
import { withTenantQueryExplicit } from '@cvg-his-v2/tenant-context';

import type {
  PixProviderSettlementDlqDelivery,
  PixProviderSettlementDlqListInput,
  PixProviderSettlementDlqRedriveInput,
  PixProviderSettlementDlqRepository
} from './routes/pix-provider-settlement-routes.js';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface DeliveryRow extends QueryResultRow {
  id: string;
  event_id: string;
  state: 'reconciliation_required';
  attempts: number;
  max_attempts: number;
  next_attempt_at: string | Date | null;
  last_error_code: string | null;
  created_at: string | Date;
  updated_at: string | Date;
}

interface RedriveRow extends QueryResultRow {
  redriven: boolean;
}

function assertUuid(value: string, field: string): void {
  if (!UUID_PATTERN.test(value)) throw new ValidationError(`${field} must be a valid UUID`);
}

function toIso(value: string | Date): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toNullableIso(value: string | Date | null): string | null {
  return value === null ? null : toIso(value);
}

function mapDelivery(row: DeliveryRow): PixProviderSettlementDlqDelivery {
  return {
    id: row.id,
    eventId: row.event_id,
    state: 'reconciliation_required',
    attempts: row.attempts,
    maxAttempts: row.max_attempts,
    nextAttemptAt: toNullableIso(row.next_attempt_at),
    lastErrorCode: row.last_error_code,
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at)
  };
}

export class DatabasePixProviderSettlementDlqRepository
  implements PixProviderSettlementDlqRepository
{
  readonly #pool: Pool;

  constructor(pool: Pool = getPool()) {
    this.#pool = pool;
  }

  async list(input: PixProviderSettlementDlqListInput): Promise<readonly PixProviderSettlementDlqDelivery[]> {
    assertUuid(input.accountId, 'accountId');
    if (input.state !== 'reconciliation_required') {
      throw new ValidationError('Only reconciliation_required deliveries can be listed');
    }
    if (!Number.isSafeInteger(input.limit) || input.limit < 1 || input.limit > 100) {
      throw new ValidationError('limit must be an integer between 1 and 100');
    }

    const result = await withTenantQueryExplicit(this.#pool, input.accountId, async (client) =>
      client.query<DeliveryRow>(
        `SELECT id, event_id, state, attempts, max_attempts, next_attempt_at,
                last_error_code, created_at, updated_at
           FROM pix_provider_event_deliveries
          WHERE account_id = $1
            AND state = $2
          ORDER BY updated_at DESC, id DESC
          LIMIT $3`,
        [input.accountId, input.state, input.limit]
      )
    );
    return result.rows.map(mapDelivery);
  }

  async redrive(input: PixProviderSettlementDlqRedriveInput): Promise<boolean> {
    assertUuid(input.accountId, 'accountId');
    assertUuid(input.deliveryId, 'deliveryId');
    assertUuid(input.eventId, 'eventId');
    assertUuid(input.actorUserId, 'actorUserId');
    if (!input.correlationId || input.correlationId.length > 255) {
      throw new ValidationError('correlationId must contain 1 to 255 characters');
    }
    const reason = input.reason.trim();
    if (reason.length < 1 || reason.length > 500 || /[\u0000-\u001f\u007f]/.test(reason)) {
      throw new ValidationError('reason is invalid');
    }

    const result = await withTenantQueryExplicit(this.#pool, input.accountId, async (client) =>
      client.query<RedriveRow>(
        `SELECT app.redrive_pix_provider_event_delivery(
                  $1::uuid, $2::uuid, $3::uuid, $4::text, $5::text
                ) AS redriven`,
        [input.deliveryId, input.eventId, input.actorUserId, input.correlationId, reason]
      )
    );
    return result.rows[0]?.redriven === true;
  }
}
