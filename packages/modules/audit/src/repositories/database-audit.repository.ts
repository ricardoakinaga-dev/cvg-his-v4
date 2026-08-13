import { eq, desc } from 'drizzle-orm';
import {
  getActiveDatabaseContext,
  getPool,
  runWithDatabaseClient,
  type DatabaseClient
} from '@cvg-his-v2/shared-database';
import { auditEvents } from '@cvg-his-v2/shared-database';
import { withTenantQuery, withTenantQueryExplicit } from '@cvg-his-v2/tenant-context';
import type { AccountId, AuditEventId, AuditEventSummary } from '@cvg-his-v2/shared-types';

export interface AuditRepository {
  readonly tenantScoped?: boolean;
  create(event: AuditEventSummary): Promise<void>;
  list(accountId?: AccountId, limit?: number): Promise<readonly AuditEventSummary[]>;
  findById(id: AuditEventId): Promise<AuditEventSummary | null>;
}

export class DatabaseAuditRepository implements AuditRepository {
  public readonly tenantScoped = true;
  readonly #db: DatabaseClient;

  public constructor(db: DatabaseClient) {
    this.#db = db;
  }

  public async create(event: AuditEventSummary): Promise<void> {
    const actorUserId = normalizeUuid(event.actorId);
    const accountId = normalizeUuid(event.accountId);

    const persist = async () => {
      await this.#db.insert(auditEvents).values({
        id: event.eventId,
        accountId,
        actorUserId,
        action: event.action,
        entityType: event.entityType,
        entityId: event.entityId,
        metadata: {
          module: event.module,
          payloadSummary: event.payloadSummary,
          riskLevel: event.riskLevel,
          ...(accountId ? {} : { legacyAccountId: event.accountId }),
          ...(actorUserId ? {} : { legacyActorId: event.actorId }),
        },
        correlationId: event.correlationId,
        occurredAt: new Date(event.occurredAt),
        createdAt: new Date(event.occurredAt),
      });
    };

    if (accountId) {
      await withTenantQueryExplicit(getPool(), accountId, persist);
      return;
    }
    await withUnattributedAuditQuery(persist);
  }

  public async list(accountId?: AccountId, limit = 100): Promise<readonly AuditEventSummary[]> {
    const rows = await (accountId
      ? withTenantQueryExplicit(getPool(), accountId, () =>
          this.#db
            .select()
            .from(auditEvents)
            .orderBy(desc(auditEvents.occurredAt))
            .limit(Math.max(limit * 5, limit))
        )
      : withTenantQuery(getPool(), () =>
          this.#db
            .select()
            .from(auditEvents)
            .orderBy(desc(auditEvents.occurredAt))
            .limit(Math.max(limit * 5, limit))
        ));

    const summaries = rows.map((row) => mapAuditRow(row));
    const filtered = accountId ? summaries.filter((event) => event.accountId === accountId) : summaries;
    return filtered.slice(0, limit);
  }

  public async findById(id: AuditEventId): Promise<AuditEventSummary | null> {
    const result = await withTenantQuery(getPool(), () =>
      this.#db
        .select()
        .from(auditEvents)
        .where(eq(auditEvents.id, id))
        .limit(1)
    );

    if (result.length === 0) {
      return null;
    }

    return mapAuditRow(result[0]);
  }
}

async function withUnattributedAuditQuery<T>(operation: () => Promise<T>): Promise<T> {
  const activeContext = getActiveDatabaseContext();
  if (activeContext) {
    if (activeContext.accountId) {
      throw new Error('A tenant-scoped transaction cannot persist an unattributed audit event');
    }
    await activeContext.client.query("SELECT set_config('app.current_account_id', '', true)");
    return operation();
  }

  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    await client.query("SELECT set_config('app.current_account_id', '', true)");
    const result = await runWithDatabaseClient(client, {}, operation);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      throw new AggregateError(
        [error, rollbackError],
        'Unattributed audit persistence failed and its transaction could not be rolled back'
      );
    }
    throw error;
  } finally {
    client.release();
  }
}

function normalizeUuid(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  return isUuid(value) ? value : null;
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

function mapAuditRow(row: Record<string, unknown>): AuditEventSummary {
  const metadata = asRecord(row.metadata);
  const storedAccountId = typeof row.accountId === 'string' ? row.accountId : null;
  const storedActorId = typeof row.actorUserId === 'string' ? row.actorUserId : null;
  const legacyAccountId =
    typeof metadata?.legacyAccountId === 'string' ? metadata.legacyAccountId : null;
  const legacyActorId = typeof metadata?.legacyActorId === 'string' ? metadata.legacyActorId : null;
  const module = typeof metadata?.module === 'string' ? metadata.module : null;

  return {
    eventId: row.id as AuditEventId,
    occurredAt: new Date(row.occurredAt as string | Date).toISOString(),
    actorId: storedActorId ?? legacyActorId ?? 'system',
    accountId: (storedAccountId ?? legacyAccountId ?? 'unknown') as AccountId,
    module: module ?? (typeof row.action === 'string' ? row.action.split('_')[0] ?? 'unknown' : 'unknown'),
    action: (row.action as string | null) ?? 'unknown',
    entityType: (row.entityType as string | null) ?? 'unknown',
    entityId: (row.entityId as string | null) ?? 'unknown',
    correlationId: (row.correlationId as string | null) ?? '',
    payloadSummary: (metadata?.payloadSummary as string | undefined) ?? '',
    riskLevel: (metadata?.riskLevel as 'low' | 'medium' | 'high' | undefined) ?? 'low'
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }

  return null;
}
